'use strict';

const multer = require('multer');

// Configure multer memory storage – files are never written to server disk
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
  fileFilter: (req, file, cb) => {
    // Basic MIME check (full content check is done on buffer next)
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_MIME'));
    }
  },
});

/**
 * Validate image buffer magic bytes to ensure file content is truly JPEG, PNG, or WebP.
 * Detects renamed executables, scripts, or corrupted files.
 */
function isValidImageBuffer(buffer) {
  if (!buffer || buffer.length < 12) return false;

  // JPEG magic bytes: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (isJpeg) return true;

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  if (isPng) return true;

  // WebP magic bytes: 'RIFF' at 0..3 and 'WEBP' at 8..11
  const isWebp =
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP';
  if (isWebp) return true;

  return false;
}

/**
 * Middleware wrapper: executes multer, catches limit errors, and inspects magic bytes.
 */
const handleImageUpload = (fieldName = 'image') => {
  const single = upload.single(fieldName);

  return (req, res, next) => {
    single(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum file size is 5 MB.',
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Invalid file format. Only JPEG, PNG, and WebP images are allowed.',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file uploaded.',
        });
      }

      // Verify content magic bytes
      if (!isValidImageBuffer(req.file.buffer)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file content. File is not a valid JPEG, PNG, or WebP image.',
        });
      }

      next();
    });
  };
};

module.exports = { handleImageUpload, isValidImageBuffer };
