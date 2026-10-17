/**
 * Mahalaxmi Kirana Store — Status Badge Component
 */

'use strict';

const STATUS_MAP = {
  // Orders
  new: { label: 'नवीन / New', variant: 'danger' },
  confirmed: { label: 'स्वीकृत / Confirmed', variant: 'warning' },
  packed: { label: 'पॅक केले / Packed', variant: 'info' },
  out_for_delivery: { label: 'रवाना / Out for Delivery', variant: 'info' },
  delivered: { label: 'डिलिव्हर / Delivered', variant: 'success' },
  cancelled: { label: 'रद्द / Cancelled', variant: 'neutral' },

  // Payments
  paid: { label: 'जमा / Paid', variant: 'success' },
  unpaid: { label: 'बाकी / Unpaid', variant: 'danger' },
  paid_pending_verification: { label: 'UPI पडताळणी / UPI Pending', variant: 'warning' },

  // Stock
  in_stock: { label: 'उपलब्ध / In Stock', variant: 'success' },
  low_stock: { label: 'कमी साठा / Low Stock', variant: 'warning' },
  out_of_stock: { label: 'साठा संपला / Out of Stock', variant: 'danger' },
  unavailable: { label: 'तात्पुरते बंद / Unavailable', variant: 'neutral' },
  expired: { label: 'मुदत संपली / Expired', variant: 'danger' },
};

function renderBadge(statusKey, customText = '') {
  const cfg = STATUS_MAP[statusKey] || { label: statusKey, variant: 'neutral' };
  const text = customText || cfg.label;
  const badge = document.createElement('span');
  badge.className = `badge badge-${cfg.variant}`;
  badge.textContent = text;
  return badge;
}

window.AdminBadge = { render: renderBadge, STATUS_MAP };
