'use strict';

const Settings = require('../models/Settings');

/**
 * GET /api/settings/public - Public store configuration for storefront
 */
const getPublicSettings = async (req, res, next) => {
  try {
    let settings = null;
    try {
      settings = await Settings.findOne();
    } catch (_) {
      // Fallback to in-memory default settings when DB is unavailable
    }
    if (!settings) {
      settings = new Settings();
    }

    res.status(200).json({
      success: true,
      data: {
        minOrder: settings.minOrder,
        deliveryCharge: settings.deliveryCharge,
        freeDeliveryAbove: settings.freeDeliveryAbove,
        servicePincodes: settings.servicePincodes,
        slots: settings.slots,
        storeHours: settings.storeHours,
        upiMobile: settings.upiMobile,
        upiQrImage: settings.upiQrImage,
        storeWhatsapp: settings.storeWhatsapp,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPublicSettings };
