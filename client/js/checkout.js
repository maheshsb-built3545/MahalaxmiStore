/**
 * frontend/js/checkout.js
 *
 * Checkout page logic:
 * 1. Checks login status (redirects to login.html?redirect=checkout.html if not authenticated)
 * 2. Fetches public settings and user's saved addresses
 * 3. Handles address selection or inline address creation (validating service pincodes)
 * 4. Handles delivery slot selection
 * 5. Handles price calculation (subtotal, min order check, free delivery threshold)
 * 6. Handles payment method selection (COD vs UPI QR with amount & manual verification notice)
 * 7. Submits order to POST /api/orders
 * 8. Rule 13: Handles unavailable items gracefully with one-click removal
 * 9. Clears cart only after successful order creation and redirects to order-confirmation.html
 */

const checkoutApp = (() => {
  let _settings = null;
  let _addresses = [];
  let _selectedAddressId = null;
  let _selectedSlot = null;
  let _selectedSlotId = null;
  let _selectedDeliveryDate = 'today';
  let _selectedPayment = 'upi_qr';
  let _udharAccount = null;

  function fmt(n) { return '₹' + n; }

  // ── Init & Auth Gate ───────────────────────────────────────────────────────
  async function init() {
    if (!auth.isLoggedIn()) {
      window.location.href = 'login.html?redirect=checkout.html';
      return;
    }

    auth.renderAuthHeader();

    // Check cart has items
    if (cart.itemCount() === 0) {
      alert('Your cart is empty. Please add items before checking out.');
      window.location.href = 'index.html';
      return;
    }

    try {
      await Promise.all([loadSettings(), loadAddresses(), loadUdharAccount()]);
      renderSlots();
      renderOrderReview();
      setupEventListeners();
    } catch (err) {
      console.error('Checkout initialization failed:', err);
      showGlobalError('Could not initialize checkout. Please ensure the server is running.');
    }
  }

  // ── Load Udhar Account (R4 - UDH-01, UDH-02) ──────────────────────────────
  async function loadUdharAccount() {
    try {
      const res = await authFetch(`${CONFIG.API_BASE}/udhar/my-account`);
      const data = await res.json();
      if (data.success && data.data && data.data.approved && data.data.status === 'active') {
        _udharAccount = data.data;
        const opt = document.getElementById('udharPaymentOption');
        if (opt) {
          opt.style.display = 'flex';
          const availEl = document.getElementById('udharAvailableLimit');
          if (availEl) availEl.textContent = _udharAccount.availableCredit;
          const currBalEl = document.getElementById('udharCurrentBalText');
          if (currBalEl) currBalEl.textContent = fmt(_udharAccount.balance);
          const availTextEl = document.getElementById('udharAvailLimitText');
          if (availTextEl) availTextEl.textContent = fmt(_udharAccount.availableCredit);
        }
      }
    } catch (_) {
      // Not logged in or no credit account
    }
  }

  // ── Load Settings ─────────────────────────────────────────────────────────
  async function loadSettings() {
    const res = await fetch(`${CONFIG.API_BASE}/settings/public`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    _settings = data.data;

    // Update UPI QR image and mobile number from settings
    const upiImg = document.getElementById('upiQrImg');
    if (upiImg && _settings.upiQrImage) {
      upiImg.src = _settings.upiQrImage;
    }

    const upiMobileEl = document.getElementById('upiMobileText');
    if (upiMobileEl) {
      upiMobileEl.textContent = _settings.upiMobile;
    }
  }

  // ── Load Addresses ────────────────────────────────────────────────────────
  async function loadAddresses() {
    const res = await authFetch(`${CONFIG.API_BASE}/addresses`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    _addresses = data.data;
    renderAddressList();
  }

  // ── Render Address List ───────────────────────────────────────────────────
  function renderAddressList() {
    const container = document.getElementById('addressListContainer');
    if (!container) return;

    container.textContent = '';

    if (!_addresses.length) {
      const emptyNote = document.createElement('p');
      emptyNote.className = 'empty-address-note';
      emptyNote.textContent = 'No saved addresses found. Please add your delivery address below.';
      container.appendChild(emptyNote);
      document.getElementById('newAddressForm').style.display = 'block';
      _selectedAddressId = null;
      return;
    }

    _addresses.forEach((addr, idx) => {
      const card = document.createElement('label');
      card.className = 'address-card' + (addr.isDefault || idx === 0 ? ' selected' : '');

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'selectedAddress';
      radio.value = addr._id;
      if (addr.isDefault || idx === 0) {
        radio.checked = true;
        _selectedAddressId = addr._id;
      }

      radio.addEventListener('change', () => {
        _selectedAddressId = addr._id;
        document.querySelectorAll('.address-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        validatePincodeServiceability(addr.pincode);
      });

      const body = document.createElement('div');
      body.className = 'addr-body';

      const line = document.createElement('div');
      line.className = 'addr-line';
      line.textContent = addr.line;
      body.appendChild(line);

      if (addr.landmark) {
        const landmark = document.createElement('div');
        landmark.className = 'addr-landmark';
        landmark.textContent = 'Landmark: ' + addr.landmark;
        body.appendChild(landmark);
      }

      const pin = document.createElement('div');
      pin.className = 'addr-pincode';
      pin.textContent = 'Pincode: ' + addr.pincode;
      body.appendChild(pin);

      card.appendChild(radio);
      card.appendChild(body);
      container.appendChild(card);
    });

    // Validate the currently selected address pincode
    const current = _addresses.find((a) => a._id === _selectedAddressId);
    if (current) validatePincodeServiceability(current.pincode);
  }

  function validatePincodeServiceability(pincode) {
    const warning = document.getElementById('pincodeWarning');
    if (!_settings || !warning) return;

    if (!_settings.servicePincodes.includes(pincode)) {
      warning.textContent = `⚠️ We currently only deliver to: ${_settings.servicePincodes.join(', ')}. Pincode ${pincode} is outside our delivery zone.`;
      warning.style.display = 'block';
    } else {
      warning.textContent = '';
      warning.style.display = 'none';
    }
  }

  // ── Render Slots (Pass 4.1: Respect store hours & cutoff times) ───────────
  function renderSlots() {
    const container = document.getElementById('slotsContainer');
    if (!container || !_settings || !_settings.slots) return;

    container.textContent = '';

    // Calculate current time in IST (Asia/Kolkata)
    const now = new Date();
    const istTimeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' });
    const [hh, mm] = istTimeStr.split(':').map(Number);
    const currentMins = hh * 60 + mm;

    _settings.slots.forEach((slot, idx) => {
      const lower = slot.toLowerCase();
      let slotId = 'evening';
      let cutoffMins = 21 * 60; // 9:00 PM cutoff for evening
      if (lower.includes('morning') || lower.includes('सकाळ')) {
        slotId = 'morning';
        cutoffMins = 11 * 60; // 11:00 AM cutoff for morning
      } else if (lower.includes('afternoon') || lower.includes('दुपार')) {
        slotId = 'afternoon';
        cutoffMins = 16 * 60; // 4:00 PM cutoff for afternoon
      }

      const isPastCutoff = currentMins >= cutoffMins;
      const deliveryDate = isPastCutoff ? 'tomorrow' : 'today';
      const timingLabel = isPastCutoff ? ' (उद्या / Tomorrow)' : ' (आज / Today)';
      const slotValue = `${slot}${timingLabel}`;

      const label = document.createElement('label');
      label.className = 'slot-chip' + (idx === 0 ? ' selected' : '');

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'deliverySlot';
      radio.value = slotValue;
      radio.dataset.slotId = slotId;
      radio.dataset.deliveryDate = deliveryDate;
      if (idx === 0) {
        radio.checked = true;
        _selectedSlot = slotValue;
        _selectedSlotId = slotId;
        _selectedDeliveryDate = deliveryDate;
      }

      radio.addEventListener('change', () => {
        _selectedSlot = slotValue;
        _selectedSlotId = slotId;
        _selectedDeliveryDate = deliveryDate;
        document.querySelectorAll('.slot-chip').forEach((c) => c.classList.remove('selected'));
        label.classList.add('selected');
      });

      const span = document.createElement('span');
      span.textContent = `${slot}${timingLabel}`;

      label.appendChild(radio);
      label.appendChild(span);
      container.appendChild(label);
    });
  }

  // ── Render Order Review & Calculations ────────────────────────────────────
  function renderOrderReview() {
    const itemsList = document.getElementById('reviewItemsList');
    if (!itemsList) return;

    itemsList.textContent = '';
    const items = cart.getAll();

    items.forEach(({ product: p, qty }) => {
      if (!p) return;
      const row = document.createElement('div');
      row.className = 'review-item-row';

      const info = document.createElement('div');
      info.className = 'item-info';

      const title = document.createElement('div');
      title.className = 'item-title';
      title.textContent = `${p.nameEn} (${p.packSize})`;

      const sub = document.createElement('div');
      sub.className = 'item-sub';
      sub.textContent = `${fmt(p.price)} × ${qty}`;

      info.appendChild(title);
      info.appendChild(sub);

      const itemTotal = document.createElement('div');
      itemTotal.className = 'item-total';
      itemTotal.textContent = fmt(p.price * qty);

      row.appendChild(info);
      row.appendChild(itemTotal);
      itemsList.appendChild(row);
    });

    const subtotal = cart.total();
    const isFreeDelivery = subtotal >= _settings.freeDeliveryAbove;
    const deliveryCharge = isFreeDelivery ? 0 : _settings.deliveryCharge;
    const grandTotal = subtotal + deliveryCharge;

    document.getElementById('reviewSubtotal').textContent = fmt(subtotal);

    const deliveryEl = document.getElementById('reviewDelivery');
    if (deliveryEl) {
      if (isFreeDelivery) {
        deliveryEl.textContent = 'FREE / मोफत';
        deliveryEl.style.color = '#10b981';
      } else {
        deliveryEl.textContent = fmt(deliveryCharge);
        deliveryEl.style.color = 'inherit';
      }
    }

    document.getElementById('reviewGrandTotal').textContent = fmt(grandTotal);

    // Update UPI exact amount badge & deep link (Pass 4.1)
    const upiPayableEl = document.getElementById('upiPayableAmount');
    if (upiPayableEl) {
      upiPayableEl.textContent = fmt(grandTotal);
    }

    const upiId = _settings.upiMobile
      ? (_settings.upiMobile.includes('@') ? _settings.upiMobile : `${_settings.upiMobile.replace(/[^0-9]/g, '')}@upi`)
      : '9860924504@upi';
    const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('Mahalaxmi Kirana')}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Grocery Order')}`;

    const deepLinkBtn = document.getElementById('upiDeepLinkBtn');
    if (deepLinkBtn) {
      deepLinkBtn.href = upiDeepLink;
      deepLinkBtn.style.display = 'block';
    }

    const upiImg = document.getElementById('upiQrImg');
    if (upiImg && grandTotal > 0) {
      upiImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiDeepLink)}`;
      upiImg.onerror = () => {
        if (_settings.upiQrImage) upiImg.src = _settings.upiQrImage;
      };
    }

    // Minimum order check
    const minOrderAlert = document.getElementById('minOrderAlert');
    const placeOrderBtn = document.getElementById('placeOrderBtn');

    if (subtotal < _settings.minOrder) {
      const diff = _settings.minOrder - subtotal;
      minOrderAlert.textContent = `⚠️ Minimum order is ₹${_settings.minOrder}. Add ₹${diff} more of items to place your order. / किमान ऑर्डर ₹${_settings.minOrder} आवश्यक आहे.`;
      minOrderAlert.style.display = 'block';
      placeOrderBtn.disabled = true;
    } else {
      minOrderAlert.textContent = '';
      minOrderAlert.style.display = 'none';
      placeOrderBtn.disabled = false;
    }

    // Free delivery progress note
    const freeDeliveryHint = document.getElementById('freeDeliveryHint');
    if (freeDeliveryHint) {
      if (!isFreeDelivery) {
        const needed = _settings.freeDeliveryAbove - subtotal;
        freeDeliveryHint.textContent = `💡 Add ₹${needed} more to get FREE delivery!`;
        freeDeliveryHint.style.display = 'block';
      } else {
        freeDeliveryHint.textContent = '🎉 You unlocked FREE delivery on this order!';
        freeDeliveryHint.style.display = 'block';
      }
    }

    // Verify Udhar available credit (UDH-02)
    const udharRadio = document.querySelector('input[name="paymentMethod"][value="udhar"]');
    if (_udharAccount && udharRadio) {
      if (grandTotal > _udharAccount.availableCredit) {
        udharRadio.disabled = true;
        const subTitle = document.getElementById('udharCreditSubtitle');
        if (subTitle) {
          // Safe: no innerHTML, only textContent for user-data
          subTitle.textContent = `⚠️ मर्यादा संपली (Limit Exceeded) • शिल्लक: ₹${_udharAccount.availableCredit}`;
          subTitle.style.color = '#ef4444';
          subTitle.style.fontWeight = '700';
        }
        if (_selectedPayment === 'udhar') {
          const codRadio = document.querySelector('input[name="paymentMethod"][value="cod"]');
          if (codRadio) {
            codRadio.checked = true;
            _selectedPayment = 'cod';
            document.getElementById('codPaymentDetails').style.display = 'block';
            document.getElementById('udharPaymentDetails').style.display = 'none';
          }
        }
      } else {
        udharRadio.disabled = false;
        const subTitle = document.getElementById('udharCreditSubtitle');
        if (subTitle) subTitle.textContent = `दुकानदार मंजूर खाते • चालू शिल्लक मर्यादा: ₹${_udharAccount.availableCredit}`;
      }
    }
  }

  // ── Event Listeners ───────────────────────────────────────────────────────
  function setupEventListeners() {
    // Payment method toggle (supports upi_qr, cod, udhar)
    document.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        _selectedPayment = e.target.value;
        const upiSection = document.getElementById('upiPaymentDetails');
        const codSection = document.getElementById('codPaymentDetails');
        const udharSection = document.getElementById('udharPaymentDetails');

        if (_selectedPayment === 'upi_qr') {
          upiSection.style.display = 'block';
          codSection.style.display = 'none';
          if (udharSection) udharSection.style.display = 'none';
        } else if (_selectedPayment === 'cod') {
          upiSection.style.display = 'none';
          codSection.style.display = 'block';
          if (udharSection) udharSection.style.display = 'none';
        } else if (_selectedPayment === 'udhar') {
          upiSection.style.display = 'none';
          codSection.style.display = 'none';
          if (udharSection) udharSection.style.display = 'block';
        }
      });
    });

    // Toggle inline address form
    const toggleBtn = document.getElementById('toggleNewAddressBtn');
    const formContainer = document.getElementById('newAddressForm');
    if (toggleBtn && formContainer) {
      toggleBtn.addEventListener('click', () => {
        const isHidden = formContainer.style.display === 'none';
        formContainer.style.display = isHidden ? 'block' : 'none';
        toggleBtn.textContent = isHidden ? '− Cancel Adding Address' : '+ Add New Address / नवीन पत्ता';
      });
    }

    // Save inline address button
    const saveAddrBtn = document.getElementById('saveAddressBtn');
    if (saveAddrBtn) {
      saveAddrBtn.addEventListener('click', handleSaveNewAddress);
    }

    // Place Order button
    const placeBtn = document.getElementById('placeOrderBtn');
    if (placeBtn) {
      placeBtn.addEventListener('click', handlePlaceOrder);
    }
  }

  // ── Add New Address Handler ───────────────────────────────────────────────
  async function handleSaveNewAddress(e) {
    e.preventDefault();
    const line = document.getElementById('newAddrLine').value.trim();
    const landmark = document.getElementById('newAddrLandmark').value.trim();
    const pincode = document.getElementById('newAddrPincode').value.trim();
    const errorEl = document.getElementById('newAddrError');

    errorEl.textContent = '';
    errorEl.style.display = 'none';

    if (line.length < 3 || line.length > 200) {
      errorEl.textContent = 'Please enter an address line (3-200 characters).';
      errorEl.style.display = 'block';
      return;
    }

    if (!/^\d{6}$/.test(pincode)) {
      errorEl.textContent = 'Pincode must be exactly 6 digits.';
      errorEl.style.display = 'block';
      return;
    }

    if (!_settings.servicePincodes.includes(pincode)) {
      errorEl.textContent = `Sorry, we only deliver to pincodes: ${_settings.servicePincodes.join(', ')}.`;
      errorEl.style.display = 'block';
      return;
    }

    const btn = document.getElementById('saveAddressBtn');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
      const res = await authFetch(`${CONFIG.API_BASE}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line, landmark, pincode, isDefault: true }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        errorEl.textContent = data.message || 'Failed to save address.';
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Save Address';
        return;
      }

      // Reset form and reload address list
      document.getElementById('newAddrLine').value = '';
      document.getElementById('newAddrLandmark').value = '';
      document.getElementById('newAddrPincode').value = '';
      document.getElementById('newAddressForm').style.display = 'none';
      document.getElementById('toggleNewAddressBtn').textContent = '+ Add New Address / नवीन पत्ता';

      btn.disabled = false;
      btn.textContent = 'Save Address';

      await loadAddresses();
    } catch (err) {
      errorEl.textContent = 'Network error. Could not save address.';
      errorEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Save Address';
    }
  }

  // ── Place Order Handler ───────────────────────────────────────────────────
  async function handlePlaceOrder() {
    clearGlobalError();

    if (!_selectedAddressId) {
      showGlobalError('Please select or add a delivery address / कृपया डिलिव्हरी पत्ता निवडा.');
      return;
    }

    if (!_selectedSlot) {
      showGlobalError('Please select a delivery slot / कृपया डिलिव्हरी वेळ निवडा.');
      return;
    }

    const items = cart.getAll().map((i) => ({
      productId: i.productId,
      qty: i.qty,
    }));

    if (!items.length) {
      showGlobalError('Your cart is empty.');
      return;
    }

    const paymentRef = (document.getElementById('upiPaymentRef')?.value || '').trim();
    const customerMarkedPaid = Boolean(document.getElementById('upiCustomerMarkedPaid')?.checked);
    const note = (document.getElementById('orderNoteInput')?.value || '').trim();
    const locationPin = (document.getElementById('orderLocationPinInput')?.value || '').trim();

    const placeBtn = document.getElementById('placeOrderBtn');
    placeBtn.disabled = true;
    placeBtn.textContent = 'Placing Order… / ऑर्डर देत आहे…';

    const orderChannel = localStorage.getItem('kirana_order_channel') || 'website';

    try {
      const res = await authFetch(`${CONFIG.API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressId: _selectedAddressId,
          slot: _selectedSlotId || 'morning',
          deliveryDate: _selectedDeliveryDate || 'today',
          paymentMethod: _selectedPayment,
          paymentRef,
          customerMarkedPaid,
          note,
          locationPin,
          channel: orderChannel,
          items,
        }),
      });

      const data = await res.json();

      // Rule 13: Handle unavailable items gracefully
      if (res.status === 400 && data.invalidItems && data.invalidItems.length > 0) {
        showInvalidItemsModal(data.invalidItems);
        placeBtn.disabled = false;
        placeBtn.textContent = 'Place Order / ऑर्डर द्या';
        return;
      }

      if (!res.ok || !data.success) {
        showGlobalError(data.message || 'Order creation failed. Please try again.');
        placeBtn.disabled = false;
        placeBtn.textContent = 'Place Order / ऑर्डर द्या';
        return;
      }

      // Order created successfully: CLEAR CART and channel tag
      cart.clear();
      localStorage.removeItem('kirana_order_channel');

      // Redirect to confirmation page
      const order = data.data;
      window.location.href = `order-confirmation.html?orderId=${encodeURIComponent(order._id)}&orderNumber=${encodeURIComponent(order.orderNumber)}`;
    } catch (err) {
      showGlobalError('Network error while placing order. Please check your internet connection.');
      placeBtn.disabled = false;
      placeBtn.textContent = 'Place Order / ऑर्डर द्या';
    }
  }

  // ── Rule 13: Modal for Unavailable Items ──────────────────────────────────
  function showInvalidItemsModal(invalidItems) {
    const modal = document.getElementById('invalidItemsModal');
    const list = document.getElementById('invalidItemsList');
    if (!modal || !list) return;

    list.textContent = '';
    invalidItems.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = `${item.nameEn} (${item.reason === 'out_of_stock' ? 'Out of stock / शिल्लक नाही' : 'Currently unavailable'})`;
      list.appendChild(li);
    });

    modal.style.display = 'flex';

    // Hook remove button
    const removeBtn = document.getElementById('removeInvalidItemsBtn');
    removeBtn.onclick = () => {
      invalidItems.forEach((item) => {
        const cartItem = cart.get(item.productId);
        if (cartItem) {
          cart.change(cartItem.product || { _id: item.productId }, -cartItem.qty);
        }
      });
      modal.style.display = 'none';
      renderOrderReview();
    };
  }

  function showGlobalError(msg) {
    const alertBox = document.getElementById('checkoutGlobalError');
    if (alertBox) {
      alertBox.textContent = msg;
      alertBox.style.display = 'block';
      alertBox.scrollIntoView({ behavior: 'smooth' });
    } else {
      alert(msg);
    }
  }

  function clearGlobalError() {
    const alertBox = document.getElementById('checkoutGlobalError');
    if (alertBox) {
      alertBox.textContent = '';
      alertBox.style.display = 'none';
    }
  }

  return { init };
})();

// Boot checkout after cart initializes
cart.init(() => {
  checkoutApp.init();
});
