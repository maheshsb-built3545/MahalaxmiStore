'use strict';

const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    minOrder: {
      type: Number,
      required: true,
      default: 200,
    },
    deliveryCharge: {
      type: Number,
      required: true,
      default: 30,
    },
    freeDeliveryAbove: {
      type: Number,
      required: true,
      default: 1000,
    },
    servicePincodes: {
      type: [String],
      default: ['423602', '423601'], // Yesgaon, Kopargaon
    },
    slots: {
      type: [String],
      default: [
        'Morning (7:00 AM – 11:00 AM)',
        'Afternoon (12:00 PM – 4:00 PM)',
        'Evening (5:00 PM – 9:00 PM)',
      ],
    },
    storeHours: {
      type: String,
      default: 'Daily 7:00 AM – 10:00 PM',
    },
    upiMobile: {
      type: String,
      default: '9860924504',
    },
    upiId: {
      type: String,
      default: '9860924504@ybl',
    },
    upiQrImage: {
      type: String,
      default: '/images/placeholder-upi-qr.svg',
    },
    storeWhatsapp: {
      type: String,
      default: '919860924504',
    },
    isStoreOpen: {
      type: Boolean,
      default: true,
    },
    closureReason: {
      type: String,
      default: '',
    },
    reopenAt: {
      type: Date,
      default: null,
    },
    slotCapacity: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Settings', settingsSchema);
