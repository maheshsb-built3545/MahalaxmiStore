/**
 * Mahalaxmi Kirana Store — Formatting Utilities
 * All dates/times rendered strictly in IST (Asia/Kolkata).
 */

'use strict';

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Format currency in Indian numbering system (e.g., ₹1,23,456).
 */
function formatCurrency(amount, showDecimals = false) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(num);
}

/**
 * Format date in IST with Marathi + English localization.
 */
function formatDateIST(dateInput, formatStyle = 'medium') {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';

  const options = { timeZone: IST_TIMEZONE };
  if (formatStyle === 'short') {
    options.day = '2-digit';
    options.month = '2-digit';
    options.year = 'numeric';
  } else if (formatStyle === 'time') {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = true;
  } else if (formatStyle === 'full') {
    options.day = '2-digit';
    options.month = 'short';
    options.year = 'numeric';
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = true;
  } else {
    options.day = '2-digit';
    options.month = 'short';
    options.year = 'numeric';
  }

  return new Intl.DateTimeFormat('en-IN', options).format(d);
}

/**
 * Bilingual relative time string (e.g. "५ मिनिटांपूर्वी / 5m ago").
 */
function formatRelativeTime(dateInput) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return 'आत्ताच / Just now';
  if (diffMin < 60) return `${diffMin} मिनिटांपूर्वी / ${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour} तासांपूर्वी / ${diffHour}h ago`;
  if (diffDay === 1) return 'काल / Yesterday';
  if (diffDay < 7) return `${diffDay} दिवसांपूर्वी / ${diffDay}d ago`;

  return formatDateIST(d, 'short');
}

/**
 * Normalizes an Indian phone number to standard 10 digits or E.164.
 */
function formatPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '').slice(-10);
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

window.AdminFormat = {
  currency: formatCurrency,
  dateIST: formatDateIST,
  relativeTime: formatRelativeTime,
  phone: formatPhone,
  IST_TIMEZONE,
};
