'use strict';

const mongoose = require('mongoose');
const Testimonial = require('../models/Testimonial');

/**
 * Default sample testimonials for Mahalaxmi Kirana Store, Yesgaon
 * All clearly marked with sampleFlag: true (D11, ADM-06)
 */
const DEFAULT_TESTIMONIALS = [
  {
    name: 'संजय गायकवाड (Sanjay Gaikwad)',
    area: 'येसगाव (Yesgaon)',
    textMr: 'गावात घरपोच किराणा मिळतो हे खूप सोयीचे झाले. माल नेहमी ताजा आणि चांगल्या दर्जाचा असतो.',
    textEn: 'Getting groceries delivered home in the village is so convenient. Items are always fresh and top quality.',
    rating: 5,
    visible: true,
    sampleFlag: true,
    sortOrder: 1,
  },
  {
    name: 'सुनीता पवार (Sunita Pawar)',
    area: 'कोपरगाव (Kopargaon)',
    textMr: 'व्हॉट्सॲपवर ऑर्डर पाठवता येते आणि ३० मिनिटांत डिलिव्हरी मिळते. किरणा दुकानात गर्दीत उभे राहण्याची गरज नाही.',
    textEn: 'Can send order copy on WhatsApp and delivery arrives in 30 minutes. No need to wait in shop queues.',
    rating: 5,
    visible: true,
    sampleFlag: true,
    sortOrder: 2,
  },
  {
    name: 'रमेश शिंदे (Ramesh Shinde)',
    area: 'येसगाव फाटा (Yesgaon Phata)',
    textMr: 'दुकानदार किरणभाऊंचे काम खूप प्रामाणिक आहे. भाव रास्त आणि अचूक तोलमाप.',
    textEn: 'Owner Kiranbhau is very honest and helpful. Reasonable rates and accurate weight every time.',
    rating: 5,
    visible: true,
    sampleFlag: true,
    sortOrder: 3,
  },
];

/**
 * Seed defaults if none exist
 */
async function ensureSeededTestimonials() {
  try {
    const count = await Testimonial.countDocuments();
    if (count === 0) {
      await Testimonial.insertMany(DEFAULT_TESTIMONIALS);
    }
  } catch (err) {
    console.warn('Could not seed testimonials:', err.message);
  }
}

/**
 * GET /api/testimonials (Public)
 */
const getTestimonials = async (req, res, next) => {
  try {
    await ensureSeededTestimonials();
    const list = await Testimonial.find({ visible: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, count: list.length, data: list });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/testimonials/admin (Owner / Staff)
 */
const getAdminTestimonials = async (req, res, next) => {
  try {
    await ensureSeededTestimonials();
    const list = await Testimonial.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, count: list.length, data: list });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/testimonials (Owner / Staff)
 */
const createTestimonial = async (req, res, next) => {
  try {
    const { name, area, textMr, textEn, rating, visible, sampleFlag, sortOrder } = req.body;
    if (!name || !textMr) {
      return res.status(400).json({ success: false, message: 'Name and Marathi text are required.' });
    }

    const doc = await Testimonial.create({
      name: name.trim(),
      area: area ? area.trim() : 'Yesgaon',
      textMr: textMr.trim(),
      textEn: textEn ? textEn.trim() : '',
      rating: Number(rating) || 5,
      visible: visible !== false,
      sampleFlag: sampleFlag !== false,
      sortOrder: Number(sortOrder) || 0,
      createdAt: new Date(),
    });

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/testimonials/:id (Owner / Staff)
 */
const updateTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid testimonial ID.' });
    }

    const updates = { ...req.body };
    delete updates._id;

    const doc = await Testimonial.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Testimonial not found.' });
    }

    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/testimonials/:id (Owner / Staff)
 */
const deleteTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid testimonial ID.' });
    }

    const doc = await Testimonial.findByIdAndDelete(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Testimonial not found.' });
    }

    res.status(200).json({ success: true, message: 'Testimonial deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTestimonials,
  getAdminTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  ensureSeededTestimonials,
};
