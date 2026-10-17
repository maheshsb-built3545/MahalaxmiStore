/**
 * Mahalaxmi Kirana Store — Bilingual (मराठी / English) Dictionary & Translator
 * Rule 4: Every owner-facing label, button, toast, error, empty state and dialog is bilingual.
 */

'use strict';

const DICTIONARY = {
  // ── Navigation & Common Headers ──
  app_name: 'महालक्ष्मी किराणा स्टोअर / Mahalaxmi Kirana Store',
  admin_panel: 'दुकान मालक नियंत्रण / Owner Admin',
  nav_dashboard: 'डॅशबोर्ड / Dashboard',
  nav_orders: 'ऑर्डर्स / Orders',
  nav_packing: 'पॅकिंग यादी / Packing List',
  nav_inventory: 'स्टॉक व माल / Inventory',
  nav_catalog: 'उत्पादने व वर्ग / Catalog',
  nav_udhar: 'उधारी वही / Udhar Khata',
  nav_customers: 'ग्राहक / Customers',
  nav_reports: 'अहवाल व नफा / Reports',
  nav_ai_corrections: 'AI सुधारणा / AI Misses',
  nav_inbox: 'सूचना व संदेश / Inbox',
  nav_settings: 'सेटिंग्ज / Settings',
  nav_staff: 'कर्मचारी / Staff',
  nav_more: 'अधिक पर्याय / More',

  // ── Actions & Buttons ──
  save: 'जतन करा / Save',
  cancel: 'रद्द करा / Cancel',
  confirm: 'खात्री करा / Confirm',
  delete: 'हटवा / Delete',
  archive: 'आर्काइव्ह करा / Archive',
  restore: 'पुनर्संचयित करा / Restore',
  edit: 'बदल करा / Edit',
  add_new: 'नवीन जोडा / Add New',
  search: 'शोधा / Search',
  filter: 'फिल्टर / Filter',
  refresh: 'रिफ्रेश / Refresh',
  export_csv: 'CSV डाऊनलोड / Export CSV',
  close: 'बंद करा / Close',
  back: 'मागे / Back',
  view_all: 'सर्व पहा / View All',
  clear: 'साफ करा / Clear',
  retry: 'पुन्हा प्रयत्न करा / Retry',
  print: 'प्रिंट / Print',
  print_thermal_58: '५८ मिमी पावती / 58mm Thermal Bill',
  print_thermal_80: '८० मिमी पावती / 80mm Thermal Bill',
  whatsapp_share: 'WhatsApp शेअर / Share on WhatsApp',
  call_customer: 'कॉल करा / Call Customer',

  // ── Store Status ──
  store_open: 'दुकान सुरू / Store Open',
  store_closed: 'दुकान बंद / Store Closed',
  open_store: 'दुकान सुरू करा / Open Store',
  close_store: 'दुकान बंद करा / Close Store',
  store_status_changed: 'दुकानाची स्थिती बदलली / Store status updated',

  // ── Audio & Sound ──
  enable_sound: '🔊 आवाज सुरू करा / Enable Sound Alerts',
  mute_sound: '🔇 आवाज बंद करा / Mute Sound',
  unmute_sound: '🔊 आवाज चालू करा / Unmute Sound',

  // ── Order Statuses ──
  order_new: 'नवीन / New',
  order_confirmed: 'स्वीकृत / Confirmed',
  order_packed: 'पॅक केले / Packed',
  order_dispatched: 'डिलिव्हरीसाठी रवाना / Out for Delivery',
  order_delivered: 'डिलिव्हर केले / Delivered',
  order_cancelled: 'रद्द केले / Cancelled',

  // ── Order Flow Actions ──
  action_confirm_order: 'ऑर्डर स्वीकारा / Confirm Order',
  action_pack_order: 'पॅकिंग पूर्ण / Mark Packed',
  action_dispatch_order: 'डिलिव्हरीस पाठवा / Dispatch Order',
  action_deliver_order: 'डिलिव्हरी पूर्ण / Mark Delivered',
  action_propose_substitution: 'पर्यायी वस्तू सुचवा / Propose Substitution',
  action_mark_paid: 'पैसे जमा झाले / Mark as Paid',

  // ── Payment Methods ──
  payment_cod: 'रोख / Cash on Delivery (COD)',
  payment_upi: 'UPI ऑनलाईन / Online UPI',
  payment_udhar: 'उधारी खाते / Store Credit (Udhar)',
  payment_status_paid: 'जमा / Paid',
  payment_status_unpaid: 'बाकी / Unpaid',
  payment_status_pending_verification: 'UPI पडताळणी बाकी / UPI Verification Pending',

  // ── Stock & Inventory ──
  stock_in: 'स्टॉक भरा / Stock In',
  stock_alerts: 'कमी साठा इशारे / Stock Alerts',
  stock_log: 'स्टॉक नोंद वही / Stock Log',
  stock_quantity: 'शिल्लक साठा / Current Stock',
  reorder_level: 'पुनर्खरेदी मर्यादा / Reorder Level',
  cost_price: 'खरेदी किंमत / Cost Price',
  selling_price: 'विक्री किंमत / Selling Price',
  mrp: 'छापील किंमत / MRP',
  expiry_date: 'मुदत समाप्ती / Expiry Date',
  supplier: 'पुरवठादार / Supplier',
  invoice_no: 'बिल / चलन क्र. / Invoice No.',
  margin: 'नफा (मार्जिन) / Profit Margin',
  out_of_stock: 'साठा संपला / Out of Stock',
  low_stock: 'कमी साठा / Low Stock',
  near_expiry: 'मुदत संपत आलेला / Near Expiry',
  expired: 'मुदत संपली / Expired',
  barcode_scan: 'बारकोड स्कॅन करा / Scan Barcode',

  // ── Udhar (Credit) ──
  udhar_total_outstanding: 'एकूण उधारी बाकी / Total Outstanding',
  udhar_active_accounts: 'सक्रिय उधारी खाती / Active Accounts',
  udhar_overdue: 'मुदत संपलेली उधारी / Overdue Udhar',
  udhar_collected_week: 'या आठवड्यात जमा / Collected This Week',
  udhar_record_payment: 'जमा पावती नोंदवा / Record Payment',
  udhar_send_reminder: 'तगादा पाठवा / Send WhatsApp Reminder',
  udhar_credit_limit: 'उधारी मर्यादा / Credit Limit',
  udhar_limit_used: 'मर्यादा वापर / Limit Used',
  udhar_ledger: 'खातेवही / Ledger',
  udhar_payment_success: 'रक्कम यशस्वीरित्या जमा झाली / Payment recorded successfully',
  udhar_status_updated: 'खाते स्थिती व मर्यादा बदलली / Account status updated',
  udhar_share_statement: 'हिशोब वही पाठवा / Share Statement',
  udhar_print_statement: 'वही प्रिंट करा / Print Statement',

  // ── Customers ──
  customer_name: 'ग्राहकाचे नाव / Customer Name',
  customer_phone: 'फोन नंबर / Phone Number',
  customer_village: 'गाव / पत्ता / Village / Address',
  customer_orders_count: 'एकूण ऑर्डर्स / Total Orders',
  customer_total_spent: 'एकूण खरेदी / Total Spent',
  customer_block: 'ग्राहक ब्लॉक करा / Block Customer',
  customer_unblock: 'अनब्लॉक करा / Unblock Customer',
  customer_profile: 'ग्राहक प्रोफाइल / Customer Profile',
  customer_favorite_items: 'नेहमीच्या वस्तू / Favorite Items',
  customer_addresses: 'डिलिव्हरी पत्ते / Delivery Addresses',
  customer_recent_orders: 'अलीकडील ऑर्डर्स / Recent Orders',
  no_customers_found: 'कोणतेही ग्राहक सापडले नाहीत / No customers found',

  // ── Reports ──
  reports_sales: 'विक्री अहवाल / Sales Report',
  reports_profit: 'नफा अहवाल / Profit Report',
  reports_settlement: 'दैनिक हिशोब / Daily Settlement',
  reports_stock_valuation: 'साठा मूल्य / Stock Valuation',
  gross_profit: 'एकूण नफा / Gross Profit',
  revenue: 'एकूण विक्री / Net Revenue',
  reports_cogs: 'विक्री खर्चाचे मूल्य (COGS) / Cost of Goods Sold',
  reports_margin_pct: 'नफा टक्केवारी / Gross Margin %',
  reports_avg_order_value: 'सरासरी ऑर्डर मूल्य (AOV) / Average Order Value',
  reports_udhar_aging: 'उधारी वयोमान / Udhar Aging',
  reports_daily_trend: 'दैनिक विक्री कल / Daily Sales Trend',
  reports_slot_load: 'वेळनिहाय भार / Slot Breakdown',
  reports_category_profit: 'वर्गनिहाय नफा / Category Profit Breakdown',
  reports_export_orders: 'ऑर्डर्स CSV / Orders CSV',
  reports_export_stock: 'स्टॉक नोंद CSV / Stock Log CSV',
  reports_export_udhar: 'उधारी CSV / Udhar CSV',

  // ── Empty States & Alerts ──
  no_orders_found: 'कोणतीही नवीन ऑर्डर नाही / No orders found',
  no_products_found: 'कोणतेही उत्पादन सापडले नाही / No products found',
  no_udhar_accounts: 'कोणतेही उधारी खाते नाही / No udhar accounts',
  offline_notice: '⚠️ इंटरनेट कनेक्शन बंद आहे — केवळ माहिती पाहू शकता / Offline — Read only mode',
  error_generic: 'काहीतरी चूक झाली, कृपया पुन्हा प्रयत्न करा / Something went wrong, please retry',
  success_generic: 'बदल यशस्वीरीत्या जतन केले / Changes saved successfully',
  session_expired: 'सत्र संपले आहे, कृपया पुन्हा लॉगिन करा / Session expired, please login again',
};

/**
 * Returns translated bilingual string by key with optional variable replacements.
 */
function t(key, vars = {}) {
  let str = DICTIONARY[key] || key;
  for (const [vKey, vVal] of Object.entries(vars)) {
    str = str.replace(new RegExp(`{${vKey}}`, 'g'), vVal);
  }
  return str;
}

window.AdminI18n = { t, DICTIONARY };
window.t = t;
