'use strict';

/**
 * R4 — Udhar (Credit Ledger) Controller
 * Specifications: UDH-01 through UDH-06, WA-05
 */

const mongoose = require('mongoose');
const UdharAccount = require('../models/UdharAccount');
const UdharEntry = require('../models/UdharEntry');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Settings = require('../models/Settings');
const Order = require('../models/Order');
const { createNotification } = require('./notificationController');

/**
 * Customer: GET /api/udhar/my-account
 * Returns current customer's credit account status and recent ledger entries (UDH-04).
 */
const getMyAccount = async (req, res, next) => {
  try {
    const account = await UdharAccount.findOne({ customer: req.user._id });
    if (!account) {
      return res.status(200).json({
        success: true,
        data: {
          hasAccount: false,
          approved: false,
          status: 'none',
          balance: 0,
          creditLimit: 0,
          entries: [],
        },
      });
    }

    const entries = await UdharEntry.find({ account: account._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        hasAccount: true,
        _id: account._id,
        approved: account.approved,
        status: account.status,
        balance: account.balance,
        creditLimit: account.creditLimit,
        availableCredit: Math.max(0, account.creditLimit - account.balance),
        entries,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Customer: POST /api/udhar/request
 * Request to open an Udhar account (UDH-01).
 */
const requestCreditAccount = async (req, res, next) => {
  try {
    let account = await UdharAccount.findOne({ customer: req.user._id });

    if (account) {
      if (account.status === 'active') {
        return res.status(400).json({
          success: false,
          message: 'आपले उधारी खाते आधीच सुरू आहे / Your credit account is already active.',
        });
      }
      if (account.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'आपला उधारी अर्ज आधीच मालकाकडे मंजुरीसाठी प्रलंबित आहे / Your request is already pending approval.',
        });
      }
      // If paused or revoked, customer can request re-activation
      account.status = 'pending';
      account.requestedAt = new Date();
      await account.save();
    } else {
      account = await UdharAccount.create({
        customer: req.user._id,
        status: 'pending',
        approved: false,
        creditLimit: 2000,
        balance: 0,
        notes: req.body.notes || 'Customer requested from website.',
      });
    }

    // Notify owner/staff
    (async () => {
      try {
        await createNotification({
          recipientRole: 'all_admin',
          type: 'udhar_request',
          title: `📝 नवीन उधारी खाते अर्ज: ${req.user.name}`,
          body: `ग्राहक ${req.user.name} (${req.user.phone}) यांनी उधारी खात्यासाठी अर्ज केला आहे. कृपया तपासा.`,
          link: `/admin/udhar.html?search=${encodeURIComponent(req.user.phone)}`,
          metadata: { customerId: req.user._id, customerPhone: req.user.phone },
        });
      } catch (err) {
        console.warn('Udhar request notify warning:', err.message);
      }
    })();

    res.status(200).json({
      success: true,
      message: 'उधारी खात्याचा अर्ज मालकाकडे पाठवला आहे. मंजुरीनंतर आपल्याला कळवले जाईल. / Credit request submitted for approval.',
      data: account,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: GET /api/udhar/admin/accounts
 * List all customer udhar accounts sorted by balance descending (UDH-05).
 */
const getAdminAccounts = async (req, res, next) => {
  try {
    const { status, search } = req.query;

    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    let accounts = await UdharAccount.find(filter)
      .populate('customer', 'name phone preferredLanguage')
      .sort({ balance: -1, updatedAt: -1 })
      .lean();

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      accounts = accounts.filter((acc) => {
        const c = acc.customer;
        if (!c) return false;
        return (
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q))
        );
      });
    }

    // Compute aggregated metrics
    const totalOutstanding = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const activeCount = accounts.filter((a) => a.status === 'active').length;
    const pendingCount = accounts.filter((a) => a.status === 'pending').length;

    // Weekly collected payments (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyPayments = await UdharEntry.aggregate([
      { $match: { type: 'payment', createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const collectedThisWeek = weeklyPayments.length > 0 ? weeklyPayments[0].total : 0;

    // Enrich accounts with last payment, village and overdue status
    const now = Date.now();
    for (const acc of accounts) {
      const creditDays = acc.creditDays || 30;
      const creditPeriodMs = creditDays * 24 * 60 * 60 * 1000;
      
      const lastPayment = await UdharEntry.findOne({ account: acc._id, type: 'payment' })
        .sort({ createdAt: -1 })
        .select('createdAt amount paymentMethod')
        .lean();
      acc.lastPayment = lastPayment || null;

      const refTime = lastPayment ? new Date(lastPayment.createdAt).getTime() : new Date(acc.updatedAt || acc.createdAt).getTime();
      acc.isOverdue = (acc.balance > 0) && ((now - refTime) > creditPeriodMs);
      acc.limitUsagePercent = acc.creditLimit > 0 ? Math.min(100, Math.round((acc.balance / acc.creditLimit) * 100)) : 0;

      if (acc.customer && acc.customer._id) {
        const latestOrder = await Order.findOne({ userId: acc.customer._id })
          .sort({ createdAt: -1 })
          .select('address')
          .lean();
        acc.customerVillage = latestOrder?.address?.line || 'Yesgaon';
      } else {
        acc.customerVillage = 'Yesgaon';
      }
    }

    const overdueCount = accounts.filter((a) => a.isOverdue).length;

    res.status(200).json({
      success: true,
      data: {
        accounts,
        totalOutstanding,
        activeCount,
        pendingCount,
        overdueCount,
        collectedThisWeek,
        totalCount: accounts.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: POST /api/udhar/admin/accounts/:id/status
 * Approve, pause, or revoke credit facility (UDH-02, UDH-06).
 */
const updateAccountStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, creditLimit, creditDays, notes } = req.body;

    if (!['pending', 'active', 'paused', 'revoked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const account = await UdharAccount.findById(id).populate('customer', 'name phone preferredLanguage');
    if (!account) {
      return res.status(404).json({ success: false, message: 'Udhar account not found.' });
    }

    const beforeState = { status: account.status, creditLimit: account.creditLimit };

    account.status = status;
    if (status === 'active') {
      account.approved = true;
      account.approvedAt = new Date();
      account.approvedBy = req.user._id;
    } else if (status === 'revoked') {
      account.approved = false;
    }

    if (typeof creditLimit === 'number' && creditLimit >= 0) {
      account.creditLimit = creditLimit;
    }
    if (typeof creditDays === 'number' && creditDays > 0) {
      account.creditDays = creditDays;
    }
    if (notes) {
      account.notes = notes.trim();
    }

    await account.save();

    // Log to AuditLog (ADM-02)
    await AuditLog.create({
      actor: { id: req.user._id, name: req.user.name, role: req.user.role },
      action: `udhar_status_${status}`,
      target: { collection: 'UdharAccount', id: account._id, name: account.customer ? account.customer.name : 'Unknown' },
      before: beforeState,
      after: { status: account.status, creditLimit: account.creditLimit },
      note: notes || `Changed status to ${status}`,
    });

    // Notify customer
    const STATUS_TEXTS = {
      active: 'आपले उधारी खाते सुरू झाले आहे! (Udhar credit facility activated).',
      paused: 'आपले उधारी खाते तात्पुरते थांबवले आहे. (Udhar temporarily paused).',
      revoked: 'आपले उधारी खाते बंद करण्यात आले आहे. (Udhar facility revoked).',
    };

    if (STATUS_TEXTS[status] && account.customer) {
      createNotification({
        recipient: account.customer._id,
        recipientRole: 'customer',
        type: 'udhar_update',
        title: `उधारी खाते स्थिती: ${status.toUpperCase()}`,
        body: `${STATUS_TEXTS[status]} चालू मर्यादा: ₹${account.creditLimit}.`,
        link: '/profile.html',
      }).catch((e) => console.warn('Customer udhar notify error:', e.message));
    }

    res.status(200).json({
      success: true,
      message: `Account status updated to ${status}.`,
      data: account,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: POST /api/udhar/admin/accounts/:id/payment
 * Record a payment (cash / UPI) from customer to reduce their balance (UDH-03).
 */
const recordPayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const amount = parseFloat(req.body.amount);
    const paymentMethod = ['cash', 'upi'].includes(req.body.paymentMethod) ? req.body.paymentMethod : 'cash';
    const paymentRef = (req.body.paymentRef || '').trim();
    const note = (req.body.note || '').trim();

    if (isNaN(amount) || amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Valid positive payment amount is required.' });
    }

    const account = await UdharAccount.findById(id).populate('customer', 'name phone preferredLanguage').session(session);
    if (!account) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Udhar account not found.' });
    }

    const previousBalance = account.balance;
    const newBalance = Math.max(0, previousBalance - amount);
    account.balance = newBalance;
    await account.save({ session });

    const entry = await UdharEntry.create(
      [
        {
          account: account._id,
          customer: account.customer._id,
          type: 'payment',
          amount,
          balanceAfter: newBalance,
          paymentMethod,
          paymentRef,
          note: note || `Payment received by ${req.user.name} via ${paymentMethod.toUpperCase()}`,
          actor: { id: req.user._id, name: req.user.name, role: req.user.role },
        },
      ],
      { session }
    );

    // Audit log entry
    await AuditLog.create(
      [
        {
          actor: { id: req.user._id, name: req.user.name, role: req.user.role },
          action: 'udhar_payment_recorded',
          target: { collection: 'UdharAccount', id: account._id, name: account.customer.name },
          before: { balance: previousBalance },
          after: { balance: newBalance, amountPaid: amount, method: paymentMethod },
          note: `Received ₹${amount} via ${paymentMethod}`,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Customer confirmation notification
    createNotification({
      recipient: account.customer._id,
      recipientRole: 'customer',
      type: 'udhar_update',
      title: `उधारी जमा पावती: ₹${amount} प्राप्त!`,
      body: `महालक्ष्मी किराणा: आपले ₹${amount} (${paymentMethod.toUpperCase()}) जमा झाले. चालू शिल्लक बाकी: ₹${newBalance}.`,
      link: '/profile.html',
    }).catch((e) => console.warn('Payment notify error:', e.message));

    res.status(200).json({
      success: true,
      message: `₹${amount} जमा करण्यात आले. चालू बाकी: ₹${newBalance}.`,
      data: {
        account,
        entry: entry[0],
      },
    });
  } catch (err) {
    try {
      await session.abortTransaction();
      session.endSession();
    } catch (_) {}
    next(err);
  }
};

/**
 * Admin: GET /api/udhar/admin/accounts/:id/ledger
 * Return full audit ledger for a customer.
 */
const getCustomerLedger = async (req, res, next) => {
  try {
    const { id } = req.params;
    const account = await UdharAccount.findById(id).populate('customer', 'name phone');
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const entries = await UdharEntry.find({ account: account._id })
      .populate('order', 'orderNumber total status')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        account,
        entries,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: GET /api/udhar/admin/reminder/:id
 * Generate pre-filled WhatsApp payment reminder in customer's preferred language (WA-05).
 */
const getWhatsAppReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const account = await UdharAccount.findById(id).populate('customer', 'name phone preferredLanguage');
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const customer = account.customer;
    const phone = customer.phone ? customer.phone.replace(/[^0-9]/g, '').slice(-10) : '';
    const name = customer.name || 'ग्राहक';
    const lang = customer.preferredLanguage || 'mr';
    const balance = account.balance || 0;
    const settings = await Settings.findOne().lean();
    const upiId = (settings && settings.upiId) ? settings.upiId : '9860924504@ybl';
    const upiPayLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('Mahalaxmi Kirana')}&am=${balance}&cu=INR`;

    let reminderText = '';
    if (lang === 'en') {
      reminderText = `Hello ${name}, Greetings from Mahalaxmi Kirana Store (Yesgaon). Your current outstanding Udhar balance is ₹${balance}. Kindly settle the bill via UPI: ${upiPayLink} or at our shop. Thank you! — Kiran Gaikwad (9860924504)`;
    } else if (lang === 'hi') {
      reminderText = `नमस्ते ${name} जी, महालक्ष्मी किराना स्टोर (येसगांव) की ओर से सादर प्रणाम। आपके खाते की वर्तमान बकाया राशि ₹${balance} है। कृपया यह राशि UPI द्वारा भरें: ${upiPayLink} अथवा दुकान पर जमा करें। धन्यवाद! — किरण गायकवाड़ (9860924504)`;
    } else {
      reminderText = `सस्नेह नमस्कार ${name}, महालक्ष्मी किराणा स्टोअर्स येसगाव. आपल्या उधारी खात्यातील चालू बाकी रक्कम ₹${balance} आहे. कृपया ही रक्कम UPI द्वारे भरा: ${upiPayLink} किंवा दुकानात येऊन जमा करावी ही नम्र विनंती. धन्यवाद! — किरण गायकवाड (9860924504)`;
    }

    const waUrl = phone
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(reminderText)}`
      : '';

    res.status(200).json({
      success: true,
      data: {
        customerName: name,
        customerPhone: phone,
        balance,
        upiId,
        upiPayLink,
        reminderText,
        waUrl,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyAccount,
  requestCreditAccount,
  getAdminAccounts,
  updateAccountStatus,
  recordPayment,
  getCustomerLedger,
  getWhatsAppReminder,
};
