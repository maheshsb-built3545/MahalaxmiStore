/**
 * Mahalaxmi Kirana Store — Store Settings Page
 * Specs: 3.10 Settings
 * 100% Bilingual Marathi + English
 */

'use strict';

(function () {
  const root = document.getElementById('settings-page-root');
  if (!root) return;

  let settings = null;
  let isDirty = false;
  let pincodesList = [];

  async function init() {
    AdminShell.init('settings');
    renderPageSkeleton();
    await loadSettings();
    setupDirtyGuard();
  }

  function renderPageSkeleton() {
    root.innerHTML = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
        <div>
          <h1 style="font-size:1.5rem;font-weight:800;color:var(--text);margin:0;">
            ${t('nav_settings')}
          </h1>
          <p style="font-size:0.85rem;color:var(--text-muted);margin:4px 0 0;">
            दुकान चालू/बंद, डिलिव्हरी फी, UPI पेमेंट व बॅकअप व्यवस्थापन / Store operations, fees & payments
          </p>
        </div>
      </div>

      <div id="settings-form-container">
        ${AdminSkeleton.cardList(3)}
      </div>
    `;
  }

  function setupDirtyGuard() {
    window.addEventListener('beforeunload', (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = t('settings_unsaved_changes');
        return e.returnValue;
      }
    });
  }

  async function loadSettings() {
    try {
      const res = await AdminAPI.get('/api/admin/settings');
      if (res.success && res.data) {
        settings = res.data;
        pincodesList = Array.isArray(settings.servicePincodes) ? [...settings.servicePincodes] : ['423602', '423601'];
        renderSettingsForm();
      }
    } catch (err) {
      AdminToast.error(err.message || t('error_generic'));
    }
  }

  function renderSettingsForm() {
    const container = document.getElementById('settings-form-container');
    if (!container || !settings) return;

    const isOpen = settings.isStoreOpen !== false;
    const slotsText = Array.isArray(settings.slots) ? settings.slots.join('\n') : '';

    container.innerHTML = `
      <form id="settings-main-form" style="display:flex;flex-direction:column;gap:16px;max-width:800px;">
        
        <!-- SECTION 1: Store Operating Status & Holiday Mode -->
        <div class="card" style="padding:16px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--surface);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
            <div>
              <h2 style="font-size:1.1rem;font-weight:700;margin:0;color:var(--text);display:flex;align-items:center;gap:6px;">
                <svg class="icon"><use href="/images/icons.svg#store"></use></svg> दुकान चालू / बंद स्थिती (Store Open Status)
              </h2>
              <p style="font-size:0.78rem;color:var(--text-muted);margin:2px 0 0;">
                दुकान बंद केल्यास ग्राहक नवीन ऑर्डर नोंदवू शकणार नाहीत.
              </p>
            </div>
            <label class="switch-label" style="display:flex;align-items:center;gap:10px;cursor:pointer;">
              <input type="checkbox" id="set-is-store-open" ${isOpen ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--primary);" />
              <span id="store-open-status-badge" class="badge ${isOpen ? 'badge-success' : 'badge-danger'}" style="font-size:0.85rem;padding:4px 10px;">
                ${isOpen ? 'दुकान सुरू / Open' : 'दुकान बंद / Closed'}
              </span>
            </label>
          </div>

          <div id="store-closure-options" style="display:${isOpen ? 'none' : 'grid'};grid-template-columns:1fr;gap:12px;background:#fef2f2;border:1px solid #fecaca;padding:12px;border-radius:var(--radius-md);margin-bottom:12px;">
            <div class="form-group">
              <label style="font-weight:700;font-size:0.82rem;color:#991b1b;display:block;margin-bottom:4px;">
                दुकान बंद ठेवण्याचे कारण (Closure Reason for Customers)
              </label>
              <input type="text" id="set-closure-reason" class="input" value="${AdminDOM.escape(settings.closureReason || '')}" placeholder="उदा. कौटुंबिक कार्यासाठी आज दुपारी २ वाजेपर्यंत बंद" style="height:42px;" />
            </div>
            <div class="form-group">
              <label style="font-weight:700;font-size:0.82rem;color:#991b1b;display:block;margin-bottom:4px;">
                पुन्हा सुरू होण्याची अंदाजे वेळ (Optional Reopen At)
              </label>
              <input type="datetime-local" id="set-reopen-at" class="input" value="${settings.reopenAt ? new Date(settings.reopenAt).toISOString().slice(0, 16) : ''}" style="height:42px;" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="form-group">
              <label style="font-weight:600;font-size:0.82rem;display:block;margin-bottom:4px;">
                दुकान कामाच्या वेळा (Store Hours)
              </label>
              <input type="text" id="set-store-hours" class="input" value="${AdminDOM.escape(settings.storeHours || 'Daily 7:00 AM – 10:00 PM')}" style="height:42px;" />
            </div>
            <div class="form-group">
              <label style="font-weight:600;font-size:0.82rem;display:block;margin-bottom:4px;">
                दुकान WhatsApp नंबर (Store WhatsApp)
              </label>
              <input type="text" id="set-store-whatsapp" class="input" value="${AdminDOM.escape(settings.storeWhatsapp || '919860924504')}" style="height:42px;" />
            </div>
          </div>
          <div style="margin-top:12px;font-size:0.82rem;">
            <a href="https://www.google.com/maps/dir/?api=1&destination=19.945865348048383,74.48684734211365" target="_blank" rel="noopener noreferrer" style="color:var(--primary);text-decoration:underline;font-weight:600;display:inline-flex;align-items:center;gap:4px;">
              <svg class="icon icon-sm"><use href="/images/icons.svg#map-pin"></use></svg> दुकानाचे लोकेशन / Store Google Maps Directions →
            </a>
          </div>
        </div>

        <!-- SECTION 2: Delivery Rules, Pincodes & Slots -->
        <div class="card" style="padding:16px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--surface);">
          <h2 style="font-size:1.1rem;font-weight:700;margin:0 0 4px;color:var(--text);display:flex;align-items:center;gap:6px;">
            <svg class="icon"><use href="/images/icons.svg#truck"></use></svg> ${t('settings_delivery_rules')}
          </h2>
          <p style="font-size:0.78rem;color:var(--text-muted);margin:0 0 14px;">
            ग्राहकांच्या कार्टमधील डिलिव्हरी फी व किमान मर्यादेचे नियम.
          </p>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3" style="margin-bottom:14px;">
            <div class="form-group">
              <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:4px;">
                किमान ऑर्डर (Min Order ₹) *
              </label>
              <input type="number" id="set-min-order" class="input" min="0" step="10" value="${settings.minOrder || 200}" required style="height:42px;" />
              <span style="font-size:0.72rem;color:var(--text-muted);">ह्यापेक्षा कमी ऑर्डर करता येत नाही</span>
            </div>

            <div class="form-group">
              <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:4px;">
                डिलिव्हरी फी (Delivery Fee ₹) *
              </label>
              <input type="number" id="set-delivery-charge" class="input" min="0" step="5" value="${settings.deliveryCharge || 30}" required style="height:42px;" />
              <span style="font-size:0.72rem;color:var(--text-muted);">सामान्य ऑर्डरसाठी लागू शुल्क</span>
            </div>

            <div class="form-group">
              <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:4px;">
                मोफत डिलिव्हरी मर्यादा (Free Above ₹) *
              </label>
              <input type="number" id="set-free-above" class="input" min="0" step="50" value="${settings.freeDeliveryAbove || 1000}" required style="height:42px;" />
              <span style="font-size:0.72rem;color:var(--text-muted);">ह्या रकमेवर मोफत डिलिव्हरी</span>
            </div>
          </div>

          <!-- Pincodes Chips Editor -->
          <div class="form-group" style="margin-bottom:14px;">
            <label style="font-weight:700;font-size:0.82rem;display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <svg class="icon icon-sm"><use href="/images/icons.svg#map-pin"></use></svg> ${t('settings_pincodes')} (६ अंकी भारतीय पिनकोड) *
            </label>
            <div id="pincodes-chips-box" style="display:flex;gap:6px;flex-wrap:wrap;padding:8px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-muted);min-height:44px;align-items:center;"></div>
            <div style="display:flex;gap:8px;margin-top:6px;">
              <input type="text" id="input-new-pincode" class="input" placeholder="नवीन ६ अंकी पिनकोड (उदा. 423602)" maxlength="6" style="height:38px;max-width:240px;font-size:0.85rem;" />
              <button type="button" class="btn btn-secondary btn-sm" id="btn-add-pincode" style="height:38px;padding:0 14px;">+ जोडा / Add</button>
            </div>
          </div>

          <!-- Delivery Slots Textarea -->
          <div class="form-group">
            <label style="font-weight:700;font-size:0.82rem;display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <svg class="icon icon-sm"><use href="/images/icons.svg#clock"></use></svg> डिलिव्हरी वेळा / स्लॉट्स (Delivery Slots - प्रति ओळ एक) *
            </label>
            <textarea id="set-slots" class="input" rows="3" required style="line-height:1.4;font-size:0.85rem;padding:8px 12px;">${AdminDOM.escape(slotsText)}</textarea>
          </div>
        </div>

        <!-- SECTION 3: Payments & UPI Configuration -->
        <div class="card" style="padding:16px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--surface);">
          <h2 style="font-size:1.1rem;font-weight:700;margin:0 0 4px;color:var(--text);display:flex;align-items:center;gap:6px;">
            <svg class="icon"><use href="/images/icons.svg#credit"></use></svg> UPI व पेमेंट पर्याय (Payments & UPI)
          </h2>
          <p style="font-size:0.78rem;color:var(--text-muted);margin:0 0 14px;">
            ग्राहकांना Google Pay / PhonePe द्वारे पैसे भरण्यासाठी VPA व QR कोड.
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3" style="margin-bottom:14px;">
            <div class="form-group">
              <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:4px;">
                UPI आयडी / VPA (उदा. 9860924504@ybl) *
              </label>
              <input type="text" id="set-upi-id" class="input" value="${AdminDOM.escape(settings.upiId || '9860924504@ybl')}" required style="height:42px;font-family:monospace;" />
              <span style="font-size:0.72rem;color:var(--text-muted);">उधारी तगाद्यामध्ये direct UPI link साठी वापरला जाईल</span>
            </div>

            <div class="form-group">
              <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:4px;">
                UPI मोबाईल नंबर (१० अंक) *
              </label>
              <input type="text" id="set-upi-mobile" class="input" value="${AdminDOM.escape(settings.upiMobile || '9860924504')}" maxlength="10" required style="height:42px;" />
            </div>
          </div>

          <!-- QR Image Preview & Upload -->
          <div class="form-group">
            <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:6px;">
              दुकान UPI QR कोड प्रतिमा (QR Code Image)
            </label>
            <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
              <img id="qr-preview" src="${settings.upiQrImage || '/images/placeholder-upi-qr.svg'}" alt="UPI QR" style="width:90px;height:90px;border-radius:var(--radius-md);border:1px solid var(--border);object-fit:cover;background:#fff;" />
              <div>
                <input type="file" id="file-qr-upload" accept="image/*" style="display:none;" />
                <button type="button" class="btn btn-secondary btn-sm" id="btn-upload-qr" style="height:38px;display:inline-flex;align-items:center;gap:6px;">
                  <svg class="icon icon-sm"><use href="/images/icons.svg#camera"></use></svg> नवीन QR अपलोड करा (Upload QR)
                </button>
                <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px;">
                  Cloudinary वर स्वयंचलित सुरक्षित अपलोड
                </div>
              </div>
            </div>
            <input type="hidden" id="set-upi-qr-image" value="${AdminDOM.escape(settings.upiQrImage || '')}" />
          </div>
        </div>

        <!-- SECTION 4: Database Backup & Danger Zone -->
        <div class="card" style="padding:16px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--surface);">
          <h2 style="font-size:1.1rem;font-weight:700;margin:0 0 4px;color:var(--text);display:flex;align-items:center;gap:6px;">
            <svg class="icon"><use href="/images/icons.svg#lock"></use></svg> डेटा बॅकअप व सुरक्षा (Backup & Danger Zone)
          </h2>
          <p style="font-size:0.78rem;color:var(--text-muted);margin:0 0 14px;">
            पूर्ण डेटाबेस बॅकअप आणि जुन्या नोंदींची स्वच्छता.
          </p>

          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg-muted);border-radius:var(--radius-md);margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div>
              <strong style="display:flex;align-items:center;gap:6px;"><svg class="icon icon-sm"><use href="/images/icons.svg#box"></use></svg> संपूर्ण डेटाबेस बॅकअप (Full DB Snapshot)</strong>
              <div style="font-size:0.75rem;color:var(--text-muted);">उत्पादने, ऑर्डर्स, ग्राहक, उधारी खातेवही यांचा JSON बॅकअप</div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-export-backup" style="min-height:38px;display:inline-flex;align-items:center;gap:6px;">
              <svg class="icon icon-sm"><use href="/images/icons.svg#box"></use></svg> बॅकअप डाउनलोड करा / Export
            </button>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:var(--radius-md);flex-wrap:wrap;gap:8px;">
            <div>
              <strong style="color:#991b1b;display:flex;align-items:center;gap:6px;"><svg class="icon icon-sm"><use href="/images/icons.svg#trash"></use></svg> जुन्या सूचनांची स्वच्छता (Cleanup Old Notifications)</strong>
              <div style="font-size:0.75rem;color:#b91c1c;">९० दिवसांपेक्षा जुन्या वाचलेल्या सूचना हटवा</div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-cleanup-notifs" style="min-height:38px;color:#b91c1c;border-color:#f87171;">
              स्वच्छ करा / Cleanup
            </button>
          </div>
        </div>

        <!-- Sticky Bottom Save Bar -->
        <div style="position:sticky;bottom:16px;background:var(--surface);padding:12px 16px;border-radius:var(--radius-lg);border:1px solid var(--border);box-shadow:0 4px 12px rgba(0,0,0,0.1);display:flex;justify-content:space-between;align-items:center;gap:12px;z-index:20;">
          <div style="font-size:0.85rem;font-weight:600;color:var(--text);">
            <span id="dirty-status-indicator" style="display:none;color:var(--accent);">● बदल जतन केलेले नाहीत / Unsaved changes</span>
          </div>
          <button type="submit" class="btn btn-primary" id="btn-save-settings" style="min-height:46px;padding:0 24px;font-weight:700;font-size:0.95rem;display:inline-flex;align-items:center;gap:6px;">
            <svg class="icon"><use href="/images/icons.svg#check"></use></svg> ${t('save')}
          </button>
        </div>

      </form>
    `;

    renderPincodeChips();
    bindFormInteractions();
  }

  function renderPincodeChips() {
    const box = document.getElementById('pincodes-chips-box');
    if (!box) return;

    box.innerHTML = '';
    pincodesList.forEach((pin, idx) => {
      const chip = document.createElement('span');
      chip.style.cssText = 'background:var(--surface);border:1px solid var(--border);padding:3px 8px;border-radius:6px;font-size:0.82rem;font-weight:700;color:var(--primary);display:inline-flex;align-items:center;gap:6px;';
      chip.innerHTML = `${pin} <button type="button" style="border:none;background:none;cursor:pointer;color:#ef4444;font-size:0.9rem;padding:0;line-height:1;">&times;</button>`;
      chip.querySelector('button')?.addEventListener('click', () => {
        pincodesList.splice(idx, 1);
        markDirty();
        renderPincodeChips();
      });
      box.appendChild(chip);
    });
  }

  function markDirty() {
    isDirty = true;
    const ind = document.getElementById('dirty-status-indicator');
    if (ind) ind.style.display = 'inline';
  }

  function bindFormInteractions() {
    const form = document.getElementById('settings-main-form');
    if (!form) return;

    form.querySelectorAll('input, textarea, select').forEach((el) => {
      el.addEventListener('input', markDirty);
      el.addEventListener('change', markDirty);
    });

    // Store open/close switch toggle
    const openSwitch = document.getElementById('set-is-store-open');
    openSwitch?.addEventListener('change', (e) => {
      const isOpen = e.target.checked;
      const badge = document.getElementById('store-open-status-badge');
      const closureBox = document.getElementById('store-closure-options');
      if (badge) {
        badge.className = `badge ${isOpen ? 'badge-success' : 'badge-danger'}`;
        badge.textContent = isOpen ? 'दुकान सुरू / Open' : 'दुकान बंद / Closed';
      }
      if (closureBox) {
        closureBox.style.display = isOpen ? 'none' : 'grid';
      }
      markDirty();
    });

    // Add pincode handler
    document.getElementById('btn-add-pincode')?.addEventListener('click', () => {
      const input = document.getElementById('input-new-pincode');
      const val = (input?.value || '').trim();
      if (!/^\d{6}$/.test(val)) {
        AdminToast.warning('कृपया वैध ६ अंकी पिनकोड टाका / Enter valid 6-digit pincode');
        return;
      }
      if (!pincodesList.includes(val)) {
        pincodesList.push(val);
        input.value = '';
        markDirty();
        renderPincodeChips();
      }
    });

    // QR Image Upload Handler
    const fileInput = document.getElementById('file-qr-upload');
    document.getElementById('btn-upload-qr')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const uploadBtn = document.getElementById('btn-upload-qr');
      if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'अपलोड होत आहे... / Uploading...';
      }

      try {
        const formData = new FormData();
        formData.append('image', file);

        const res = await AdminAPI.postForm('/api/admin/upload', formData);
        if (res.success && res.data?.url) {
          const qrUrl = res.data.url;
          document.getElementById('set-upi-qr-image').value = qrUrl;
          document.getElementById('qr-preview').src = qrUrl;
          markDirty();
          AdminToast.success('QR प्रतिमा यशस्वीरित्या अपलोड केली! / QR uploaded successfully!');
        }
      } catch (err) {
        AdminToast.error(err.message || 'QR अपलोड अयशस्वी / Failed to upload QR');
      } finally {
        if (uploadBtn) {
          uploadBtn.disabled = false;
          uploadBtn.innerHTML = '<svg class="icon icon-sm"><use href="/images/icons.svg#camera"></use></svg> नवीन QR अपलोड करा (Upload QR)';
        }
      }
    });

    // Backup Export Handler
    document.getElementById('btn-export-backup')?.addEventListener('click', () => {
      const dateStr = new Date().toISOString().slice(0, 10);
      AdminAPI.downloadAuthed('/api/admin/backup/export', `mahalaxmi-backup-${dateStr}.json`);
      AdminToast.success(t('settings_backup_downloaded'));
    });

    // Cleanup Notifications Handler
    document.getElementById('btn-cleanup-notifs')?.addEventListener('click', async () => {
      const input = prompt('९० दिवसांपेक्षा जुन्या सूचना कायमच्या हटवण्यासाठी "CLEANUP" टाइप करा:');
      if (input !== 'CLEANUP') {
        AdminToast.warning('स्वच्छता रद्द केली / Cleanup cancelled');
        return;
      }

      try {
        const res = await AdminAPI.post('/api/admin/notifications/cleanup-old', {});
        if (res.success) {
          AdminToast.success(res.message || t('settings_cleanup_success'));
        }
      } catch (err) {
        AdminToast.error(err.message || t('error_generic'));
      }
    });

    // Form Submit Handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (pincodesList.length === 0) {
        AdminToast.warning('किमान एक सेवा पिनकोड आवश्यक आहे / At least one serviceable pincode required');
        return;
      }

      const minOrder = parseFloat(document.getElementById('set-min-order')?.value);
      const deliveryCharge = parseFloat(document.getElementById('set-delivery-charge')?.value);
      const freeDeliveryAbove = parseFloat(document.getElementById('set-free-above')?.value);
      const isStoreOpen = document.getElementById('set-is-store-open')?.checked;
      const closureReason = document.getElementById('set-closure-reason')?.value.trim();
      const reopenAtVal = document.getElementById('set-reopen-at')?.value;
      const reopenAt = reopenAtVal ? new Date(reopenAtVal).toISOString() : null;
      const storeHours = document.getElementById('set-store-hours')?.value.trim();
      const storeWhatsapp = document.getElementById('set-store-whatsapp')?.value.trim();
      const upiId = document.getElementById('set-upi-id')?.value.trim();
      const upiMobile = document.getElementById('set-upi-mobile')?.value.trim();
      const upiQrImage = document.getElementById('set-upi-qr-image')?.value.trim();

      const slotsRaw = document.getElementById('set-slots')?.value || '';
      const slots = slotsRaw.split('\n').map((s) => s.trim()).filter(Boolean);

      if (slots.length === 0) {
        AdminToast.warning('किमान एक डिलिव्हरी वेळ (Slot) आवश्यक आहे / At least one delivery slot required');
        return;
      }

      // Check if critical fee changes were made, prompt confirm
      if (minOrder !== settings.minOrder || deliveryCharge !== settings.deliveryCharge || freeDeliveryAbove !== settings.freeDeliveryAbove) {
        const confirmed = await AdminConfirm.show({
          title: 'डिलिव्हरी नियमांमध्ये बदल / Update Delivery Rules?',
          message: `किमान ऑर्डर: ₹${minOrder}, फी: ₹${deliveryCharge}, मोफत मर्यादा: ₹${freeDeliveryAbove}. हे बदल ग्राहकांसाठी तत्काळ लागू होतील.`,
          confirmLabel: 'जतन करा / Save Changes',
        });
        if (!confirmed) return;
      }

      const saveBtn = document.getElementById('btn-save-settings');
      saveBtn.disabled = true;
      saveBtn.textContent = 'जतन होत आहे... / Saving...';

      try {
        const payload = {
          minOrder,
          deliveryCharge,
          freeDeliveryAbove,
          servicePincodes: pincodesList,
          slots,
          storeHours,
          storeWhatsapp,
          upiId,
          upiMobile,
          upiQrImage,
          isStoreOpen,
          closureReason,
          reopenAt,
        };

        const res = await AdminAPI.put('/api/admin/settings', payload);
        if (res.success) {
          AdminToast.success(t('settings_saved'));
          isDirty = false;
          settings = res.data;
          const ind = document.getElementById('dirty-status-indicator');
          if (ind) ind.style.display = 'none';
        }
      } catch (err) {
        AdminToast.error(err.message || t('error_generic'));
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<svg class="icon"><use href="/images/icons.svg#check"></use></svg> ${t('save')}`;
      }
    });
  }

  // Auto-init on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
