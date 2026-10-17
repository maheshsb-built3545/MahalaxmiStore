'use strict';

const mongoose = require('mongoose');
const Address = require('../models/Address');
const { ensureString } = require('../utils/helpers');

/**
 * GET /api/addresses - List addresses for logged in user
 */
const getAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    res.status(200).json({
      success: true,
      data: addresses,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/addresses - Create a new address
 */
const createAddress = async (req, res, next) => {
  try {
    const line = ensureString(req.body.line);
    const landmark = ensureString(req.body.landmark) || '';
    const pincode = ensureString(req.body.pincode);
    const isDefault = Boolean(req.body.isDefault);

    if (!line || line.length < 3 || line.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Address line must be between 3 and 200 characters.',
      });
    }

    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: 'Pincode must be exactly 6 digits.',
      });
    }

    if (isDefault) {
      await Address.updateMany({ userId: req.user._id }, { isDefault: false });
    } else {
      // If user has no existing addresses, make this one default
      const count = await Address.countDocuments({ userId: req.user._id });
      if (count === 0) {
        // First address is default automatically
      }
    }

    const address = await Address.create({
      userId: req.user._id,
      line,
      landmark,
      pincode,
      isDefault,
    });

    res.status(201).json({
      success: true,
      data: address,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/addresses/:id - Update an address
 */
const updateAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address ID.',
      });
    }

    const address = await Address.findOne({ _id: id, userId: req.user._id });
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found.',
      });
    }

    if (req.body.line !== undefined) {
      const line = ensureString(req.body.line);
      if (!line || line.length < 3 || line.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Address line must be between 3 and 200 characters.',
        });
      }
      address.line = line;
    }

    if (req.body.landmark !== undefined) {
      address.landmark = ensureString(req.body.landmark) || '';
    }

    if (req.body.pincode !== undefined) {
      const pincode = ensureString(req.body.pincode);
      if (!pincode || !/^\d{6}$/.test(pincode)) {
        return res.status(400).json({
          success: false,
          message: 'Pincode must be exactly 6 digits.',
        });
      }
      address.pincode = pincode;
    }

    if (req.body.isDefault !== undefined) {
      const isDefault = Boolean(req.body.isDefault);
      if (isDefault) {
        await Address.updateMany({ userId: req.user._id }, { isDefault: false });
      }
      address.isDefault = isDefault;
    }

    await address.save();

    res.status(200).json({
      success: true,
      data: address,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/addresses/:id - Delete an address
 */
const deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address ID.',
      });
    }

    const address = await Address.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAddresses, createAddress, updateAddress, deleteAddress };
