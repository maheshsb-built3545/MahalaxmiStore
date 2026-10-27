/**
 * Mahalaxmi Kirana Store — Staff & Permissions Management Page
 * Specs: 3.11 Staff & Permissions (Owner Only)
 * 100% Bilingual Marathi + English
 */

'use strict';

(function () {
  const root = document.getElementById('staff-page-root');
  if (!root) return;

  let staffList = [];
  let auditLogs = [];
  let activeTab = 'staff';
  let isLoading = false;

  const ALL_PERMISSIONS = [
    { id: 'orders_view', label: 'ऑर्डर्स व पॅकिंग पाहणे / View Orders & Packing' },
    { id: 'orders_status', label: 'ऑर्डर स्थिती पुढे नेणे / Advance Order Status' },
    { id: 'udhar_payments', label: 'उधारी जमा घेणे / Take Udhar Payments' },
    { id: 'stock_manage', label: 'साठा भरणे व फेरफार / Inward Stock & Adjust' },
    { id: 'catalog_edit', label: 'उत्पादने व किंमत बदल / Edit Catalog & Prices' },
    { id: 'reports_view', label: 'नफा व विक्री अहवाल / View Profit Reports' },
    { id: 'customers_manage', label: 'ग्राहक व्यवस्थापन / Manage Customers' },
  ];

  async function init() {
    AdminShell.init('staff');

    // Role check guard: only owner can access staff management
    const currentUser = AdminAuth.getUser();
    if (!currentUser || currentUser.role !== 'owner') {
      renderOwnerOnlyGuard();
      return;
    }

    renderPageSkeleton();
    await loadStaff();
  }

  function renderOwnerOnlyGuard() {
    root.innerHTML = `
      <div style="max-width:500px;margin:40px auto;text-align:center;padding:24px;background:var(--surface);border-radius:var(--radius-lg);border:1px solid var(--border);">
        <span style="font-size:3rem;line-height:1;"><svg class="icon" style="width:48px;height:48px;"><use href="/images/icons.svg#lock"></use></svg></span>
        <h2 style="font-size:1.3rem;font-weight:800;color:var(--text);margin:12px 0 6px;">
          केवळ दुकान मालकासाठी / Owner Access Only
        </h2>
        <p style="font-size:0.85rem;color:var(--text-muted);margin:0 0 16px;line-height:1.5;">
          कर्मचारी व्यवस्थापन आणि अधिकार केवळ मुख्य मालक खात्यावरून बदलता येतात.
        </p>
        <a href="dashboard.html" class="btn btn-primary" style="display:inline-flex;align-items:center;min-height:44px;text-decoration:none;">
          ← डॅशबोर्डवर परत जा / Return to Dashboard
        </a>
      </div>
    `;
  }

  function renderPageSkeleton() {
    root.innerHTML = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
        <div>
          <h1 style="font-size:1.5rem;font-weight:800;color:var(--text);margin:0;">
            ${t('nav_staff')}
          </h1>
          <p style="font-size:0.85rem;color:var(--text-muted);margin:4px 0 0;">
            कर्मचारी खाती, अधिकार (Permissions) व मालक ऑडिट लॉग / Staff accounts, granular permissions & audit
          </p>
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn btn-primary" id="btn-add-staff" style="min-height:44px;font-weight:700;">
            + ${t('staff_add_title')}
          </button>
        </div>
      </div>

      <!-- Explanatory Box -->
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:var(--radius-lg);padding:12px 16px;margin-bottom:16px;display:flex;align-items:flex-start;gap:10px;font-size:0.85rem;color:#166534;line-height:1.5;">
        <span><svg class="icon icon-sm"><use href="/images/icons.svg#info"></use></svg></span>
        <div>
          <strong>कर्मचारी अधिकार (Staff Access):</strong><br>
          प्रत्येक कर्मचाऱ्याला गरजेनुसार अधिकार द्या (उदा. पॅकिंग कर्मचाऱ्याला फक्त ऑर्डर्स, कॅशियरला उधारी जमा). कर्मचाऱ्याने केलेल्या सर्व कृती <b>Audit Log</b> मध्ये नावासह नोंदवल्या जातात.
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="tabs-container" style="display:flex;border-bottom:1px solid var(--border);margin-bottom:16px;gap:8px;">
        <button type="button" class="tab-btn active" data-tab="staff" style="padding:10px 16px;font-weight:700;font-size:0.85rem;background:none;border:none;border-bottom:2px solid var(--primary);color:var(--primary);cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
          <svg class="icon"><use href="/images/icons.svg#users"></use></svg> ${t('nav_staff')}
        </button>
        <button type="button" class="tab-btn" data-tab="audit" style="padding:10px 16px;font-weight:600;font-size:0.85rem;background:none;border:none;color:var(--text-muted);cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
          <svg class="icon"><use href="/images/icons.svg#list"></use></svg> ${t('staff_audit_feed')}
        </button>
      </div>

      <!-- Content Container -->
      <div id="staff-content-container">
        ${AdminSkeleton.cardList(3)}
      </div>
    `;

    bindTabEvents();
    document.getElementById('btn-add-staff')?.addEventListener('click', openAddStaffModal);
  }

  function bindTabEvents() {
    const tabButtons = root.querySelectorAll('.tab-btn');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabButtons.forEach((b) => {
          b.classList.remove('active');
          b.style.borderBottom = 'none';
          b.style.color = 'var(--text-muted)';
          b.style.fontWeight = '600';
        });
        btn.classList.add('active');
        btn.style.borderBottom = '2px solid var(--primary)';
        btn.style.color = 'var(--primary)';
        btn.style.fontWeight = '700';

        activeTab = btn.dataset.tab;
        if (activeTab === 'staff') {
          renderStaffList();
        } else if (activeTab === 'audit') {
          loadAuditLogs();
        }
      });
    });
  }

  async function loadStaff() {
    isLoading = true;
    try {
      const res = await AdminAPI.get('/api/admin/staff');
      if (res.success && res.data) {
        staffList = res.data || [];
      }
    } catch (err) {
      AdminToast.error(err.message || t('error_generic'));
    } finally {
      isLoading = false;
      renderStaffList();
    }
  }

  function renderStaffList() {
    const container = document.getElementById('staff-content-container');
    if (!container) return;

    if (staffList.length === 0) {
      container.innerHTML = '';
      container.appendChild(
        AdminEmptyState.create({
          title: t('no_staff_members'),
          description: 'सध्या कोणतेही अतिरिक्त कर्मचारी खाते नाही. नवीन कर्मचारी जोडण्यासाठी वर दिलेल्या बटनावर क्लिक करा.',
        })
      );
      return;
    }

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr;gap:12px;" class="staff-grid"></div>
    `;
    const grid = container.querySelector('.staff-grid');

    staffList.forEach((s) => {
      grid.appendChild(createStaffCard(s));
    });
  }

  function createStaffCard(s) {
    const card = document.createElement('div');
    card.className = 'card staff-card';
    card.style.cssText = 'padding:16px;border-radius:var(--radius-lg);border:1px solid var(--border);background:var(--surface);position:relative;';

    const isBlocked = Boolean(s.blocked);
    const perms = Array.isArray(s.permissions) ? s.permissions : ['orders_view', 'orders_status', 'stock_manage'];

    // Map permissions labels
    const permChips = perms.map((pId) => {
      const pObj = ALL_PERMISSIONS.find((p) => p.id === pId);
      const label = pObj ? pObj.label.split('/')[0].trim() : pId;
      return `<span style="background:var(--bg-muted);border:1px solid var(--border);padding:3px 8px;border-radius:6px;font-size:0.75rem;font-weight:600;color:var(--text);">${label}</span>`;
    }).join(' ');

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <h3 style="font-size:1.05rem;font-weight:700;margin:0;color:var(--text);">${AdminDOM.escape(s.name)}</h3>
            <span class="badge badge-primary">कर्मचारी / Staff</span>
            ${isBlocked ? '<span class="badge badge-danger">ब्लॉक / Blocked</span>' : '<span class="badge badge-success">सक्रिय / Active</span>'}
          </div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:3px;display:flex;align-items:center;gap:6px;">
            <svg class="icon icon-sm"><use href="/images/icons.svg#phone"></use></svg> <a href="tel:${s.phone}" style="color:var(--primary);font-weight:600;text-decoration:none;">${s.phone}</a>
            • नोंदणी: ${AdminFormat.date(s.createdAt)}
          </div>
        </div>
      </div>

      <!-- Active Permissions Box -->
      <div style="margin-bottom:14px;background:var(--bg-muted);padding:10px 12px;border-radius:var(--radius-md);">
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-bottom:6px;">
          सक्रिय अधिकार (Active Permissions - ${perms.length} पैकी):
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${permChips || '<span style="font-size:0.75rem;color:var(--danger);">कोणतेही अधिकार नाहीत / No permissions</span>'}
        </div>
      </div>

      <!-- Action Buttons (Thumb friendly >= 44px) -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" class="btn btn-secondary btn-edit-perms" style="flex:2;min-height:44px;font-size:0.82rem;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
          <svg class="icon"><use href="/images/icons.svg#settings"></use></svg> अधिकार बदला / Permissions
        </button>
        <button type="button" class="btn btn-secondary btn-toggle-block" style="flex:1;min-height:44px;font-size:0.82rem;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
          ${isBlocked ? '<svg class="icon"><use href="/images/icons.svg#check"></use></svg> अनब्लॉक' : '<svg class="icon"><use href="/images/icons.svg#close"></use></svg> ब्लॉक'}
        </button>
        <button type="button" class="btn btn-secondary btn-delete-staff" style="min-height:44px;font-size:0.82rem;font-weight:600;color:#ef4444;border-color:#fca5a5;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
          <svg class="icon"><use href="/images/icons.svg#trash"></use></svg> काढा
        </button>
      </div>
    `;

    card.querySelector('.btn-edit-perms')?.addEventListener('click', () => openEditPermissionsModal(s));
    card.querySelector('.btn-toggle-block')?.addEventListener('click', () => toggleBlockStaff(s));
    card.querySelector('.btn-delete-staff')?.addEventListener('click', () => deleteStaff(s));

    return card;
  }

  // ── Toggle Block Staff ──
  async function toggleBlockStaff(s) {
    const willBlock = !s.blocked;
    const confirmed = await AdminConfirm.show({
      title: willBlock ? 'कर्मचारी ब्लॉक करायचा का? / Block Staff?' : 'कर्मचारी अनब्लॉक करायचा का? / Unblock Staff?',
      message: willBlock
        ? `${s.name} या कर्मचाऱ्याचे खाते तात्पुरते ब्लॉक केले जाईल आणि ते लॉगिन करू शकणार नाहीत.`
        : `${s.name} या कर्मचाऱ्याचे खाते पुन्हा सक्रिय केले जाईल.`,
      confirmLabel: willBlock ? 'ब्लॉक करा / Block' : 'अनब्लॉक करा / Unblock',
      isDanger: willBlock,
    });

    if (!confirmed) return;

    try {
      const res = await AdminAPI.patch(`/api/admin/staff/${s._id}/toggle-block`);
      if (res.success) {
        AdminToast.success(willBlock ? 'कर्मचारी ब्लॉक केला / Staff blocked' : 'कर्मचारी अनब्लॉक केला / Staff unblocked');
        s.blocked = willBlock;
        renderStaffList();
      }
    } catch (err) {
      AdminToast.error(err.message || t('error_generic'));
    }
  }

  // ── Delete Staff ──
  async function deleteStaff(s) {
    const confirmed = await AdminConfirm.show({
      title: 'कर्मचारी खाते हटवायचे का? / Delete Staff Account?',
      message: `${s.name} (${s.phone}) हे कर्मचारी खाते कायमचे हटवले जाईल. ही क्रिया पूर्ववत करता येणार नाही.`,
      confirmLabel: 'खाते हटवा / Delete Account',
      isDanger: true,
    });

    if (!confirmed) return;

    try {
      const res = await AdminAPI.delete(`/api/admin/staff/${s._id}`);
      if (res.success) {
        AdminToast.success(`कर्मचारी ${s.name} काढण्यात आले / Staff removed`);
        staffList = staffList.filter((item) => item._id !== s._id);
        renderStaffList();
      }
    } catch (err) {
      AdminToast.error(err.message || t('error_generic'));
    }
  }

  // ── Edit Permissions Modal ──
  function openEditPermissionsModal(s) {
    const currentPerms = Array.isArray(s.permissions) ? [...s.permissions] : [];

    const sheetContent = document.createElement('div');
    sheetContent.innerHTML = `
      <div style="padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:14px;">
        <h3 style="font-size:1.15rem;font-weight:800;margin:0;color:var(--text);display:flex;align-items:center;gap:6px;">
          <svg class="icon"><use href="/images/icons.svg#settings"></use></svg> कर्मचारी अधिकार बदला (Edit Permissions)
        </h3>
        <p style="font-size:0.82rem;color:var(--text-muted);margin:3px 0 0;">
          कर्मचारी: <strong>${AdminDOM.escape(s.name)}</strong> (${s.phone})
        </p>
      </div>

      <form id="edit-perms-form" style="display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${ALL_PERMISSIONS.map((p) => `
            <label class="checkbox-label" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-muted);cursor:pointer;">
              <input type="checkbox" name="staff-perm" value="${p.id}" ${currentPerms.includes(p.id) ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--primary);" />
              <span style="font-size:0.85rem;font-weight:600;color:var(--text);">${p.label}</span>
            </label>
          `).join('')}
        </div>

        <div style="margin-top:10px;display:flex;gap:8px;">
          <button type="button" class="btn btn-secondary" id="btn-cancel-perms" style="flex:1;min-height:44px;">
            ${t('cancel')}
          </button>
          <button type="submit" class="btn btn-primary" id="btn-save-perms" style="flex:2;min-height:44px;font-weight:700;">
            ${t('save')}
          </button>
        </div>
      </form>
    `;

    const sheet = AdminBottomSheet.open({ content: sheetContent });
    sheetContent.querySelector('#btn-cancel-perms')?.addEventListener('click', () => sheet.close());

    const form = sheetContent.querySelector('#edit-perms-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const selected = Array.from(form.querySelectorAll('input[name="staff-perm"]:checked')).map((cb) => cb.value);

      const saveBtn = sheetContent.querySelector('#btn-save-perms');
      saveBtn.disabled = true;
      saveBtn.textContent = 'जतन होत आहे...';

      try {
        const res = await AdminAPI.patch(`/api/admin/staff/${s._id}/permissions`, { permissions: selected });
        if (res.success) {
          AdminToast.success(t('staff_permissions_updated'));
          s.permissions = selected;
          sheet.close();
          renderStaffList();
        }
      } catch (err) {
        AdminToast.error(err.message || t('error_generic'));
        saveBtn.disabled = false;
        saveBtn.textContent = t('save');
      }
    });
  }

  // ── Add New Staff Modal ──
  function openAddStaffModal() {
    const sheetContent = document.createElement('div');
    sheetContent.innerHTML = `
      <div style="padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:14px;">
        <h3 style="font-size:1.15rem;font-weight:800;margin:0;color:var(--text);display:flex;align-items:center;gap:6px;">
          <svg class="icon"><use href="/images/icons.svg#plus"></use></svg> ${t('staff_add_title')}
        </h3>
        <p style="font-size:0.82rem;color:var(--text-muted);margin:3px 0 0;">
          कर्मचाऱ्यासाठी लॉगिन क्रेडेंशियल्स व कार्य अधिकार निश्चित करा
        </p>
      </div>

      <form id="add-staff-form" style="display:flex;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:4px;">
            कर्मचाऱ्याचे पूर्ण नाव (Full Name) *
          </label>
          <input type="text" id="add-staff-name" class="input" placeholder="उदा. सचिन गायकवाड" required style="height:42px;" />
        </div>

        <div class="form-group">
          <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:4px;">
            मोबाईल नंबर (10-Digit Mobile) *
          </label>
          <input type="tel" id="add-staff-phone" class="input" placeholder="उदा. 9876543210" maxlength="10" required style="height:42px;" />
        </div>

        <div class="form-group">
          <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:4px;">
            पासवर्ड (Password, min 6 chars) *
          </label>
          <input type="password" id="add-staff-pass" class="input" placeholder="किमान ६ अक्षरे" minlength="6" required style="height:42px;" />
        </div>

        <!-- Permissions selector -->
        <div class="form-group">
          <label style="font-weight:700;font-size:0.82rem;display:block;margin-bottom:6px;">
            कर्मचारी अधिकार (Permissions)
          </label>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${ALL_PERMISSIONS.map((p) => `
              <label class="checkbox-label" style="display:flex;align-items:center;gap:10px;padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-muted);cursor:pointer;">
                <input type="checkbox" name="new-staff-perm" value="${p.id}" ${['orders_view', 'orders_status', 'stock_manage'].includes(p.id) ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary);" />
                <span style="font-size:0.82rem;font-weight:600;color:var(--text);">${p.label}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div style="margin-top:10px;display:flex;gap:8px;">
          <button type="button" class="btn btn-secondary" id="btn-cancel-add-staff" style="flex:1;min-height:44px;">
            ${t('cancel')}
          </button>
          <button type="submit" class="btn btn-primary" id="btn-submit-add-staff" style="flex:2;min-height:44px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
            <svg class="icon"><use href="/images/icons.svg#check"></use></svg> खाते तयार करा / Create Staff
          </button>
        </div>
      </form>
    `;

    const sheet = AdminBottomSheet.open({ content: sheetContent });
    sheetContent.querySelector('#btn-cancel-add-staff')?.addEventListener('click', () => sheet.close());

    const form = sheetContent.querySelector('#add-staff-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = sheetContent.querySelector('#add-staff-name')?.value.trim();
      const phone = sheetContent.querySelector('#add-staff-phone')?.value.trim();
      const password = sheetContent.querySelector('#add-staff-pass')?.value;
      const permissions = Array.from(sheetContent.querySelectorAll('input[name="new-staff-perm"]:checked')).map((cb) => cb.value);

      const submitBtn = sheetContent.querySelector('#btn-submit-add-staff');
      submitBtn.disabled = true;
      submitBtn.textContent = 'तयार करत आहे...';

      try {
        const res = await AdminAPI.post('/api/admin/staff', {
          name,
          phone,
          password,
          permissions,
        });

        if (res.success) {
          AdminToast.success(t('staff_created_success'));
          sheet.close();
          await loadStaff();
        }
      } catch (err) {
        AdminToast.error(err.message || t('error_generic'));
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<svg class="icon"><use href="/images/icons.svg#check"></use></svg> खाते तयार करा / Create Staff';
      }
    });
  }

  // ── Load & Render Audit Logs ──
  async function loadAuditLogs() {
    const container = document.getElementById('staff-content-container');
    if (!container) return;

    container.innerHTML = AdminSkeleton.cardList(4);

    try {
      const res = await AdminAPI.get('/api/admin/audit-logs?limit=40');
      if (res.success && res.data) {
        auditLogs = res.data.logs || res.data || [];
        renderAuditLogsList(container);
      }
    } catch (err) {
      container.innerHTML = `<div style="padding:16px;color:var(--danger);">${err.message || t('error_generic')}</div>`;
    }
  }

  function renderAuditLogsList(container) {
    if (auditLogs.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.9rem;">
          कोणत्याही ऑडिट नोंदी उपलब्ध नाहीत / No audit logs recorded
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${auditLogs.map((log) => `
          <div style="padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--surface);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;flex-wrap:wrap;gap:6px;">
              <div style="font-weight:700;font-size:0.85rem;color:var(--text);display:flex;align-items:center;gap:6px;">
                <svg class="icon icon-sm"><use href="/images/icons.svg#user"></use></svg> ${AdminDOM.escape(log.actor?.name || 'Unknown')} <span style="font-size:0.75rem;color:var(--text-muted);">(${log.actor?.role || 'user'})</span>
                • <span style="color:var(--primary);">${AdminDOM.escape(log.action)}</span>
              </div>
              <span style="font-size:0.75rem;color:var(--text-muted);">
                ${AdminFormat.date(log.createdAt)}
              </span>
            </div>
            <div style="font-size:0.8rem;color:var(--text-muted);">
              ${log.note ? AdminDOM.escape(log.note) : ''}
              ${log.target?.name ? `(लक्ष्य: ${AdminDOM.escape(log.target.name)})` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Auto-init on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
