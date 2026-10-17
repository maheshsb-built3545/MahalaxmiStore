'use strict';

/**
 * Normalise Indian phone number:
 * - Ensures input is a string
 * - Strips all non-digit characters (+91, spaces, hyphens)
 * - Strips leading '91' if 12 digits
 * - Strips leading '0' if 11 digits
 * - Returns 10-digit string if valid, or null if invalid
 */
function normalizePhone(input) {
  if (typeof input !== 'string') return null;
  let digits = input.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (/^[6-9]\d{9}$/.test(digits)) {
    return digits;
  }
  return null;
}

/**
 * Validate that a parameter is strictly a primitive string (prevents NoSQL injection like {$gt: ""})
 */
function ensureString(val) {
  return typeof val === 'string' ? val.trim() : null;
}

module.exports = { normalizePhone, ensureString };
