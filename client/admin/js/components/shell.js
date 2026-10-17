/**
 * Mahalaxmi Kirana Store — Reusable Responsive App Shell
 * - Desktop (>= 1024px): Collapsible grouped sidebar
 * - Tablet (768-1023px): Icon rail sidebar
 * - Mobile (< 768px): Sticky header + 4 core tabs bottom bar + "More" bottom sheet
 * - 100% reachable in <= 2 taps on mobile!
 */

'use strict';

class AppShell {
  constructor(options = {}) {
    this.activeRoute = options.activeRoute || this.detectActiveRoute();
    this.pageTitle = options.pageTitle || this.getDefaultTitle(this.activeRoute);
    this.unreadCount = 0;
    this.isStoreOpen = true;
    this.audioCtx = null;
    this.pollInterval = null;

    this.init();
  }

  detectActiveRoute() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('orders') || path.includes('packing')) return 'orders';
    if (path.includes('inventory') || path.includes('stock-in') || path.includes('low-stock')) return 'inventory';
    if (path.includes('catalog') || path.includes('products') || path.includes('categories')) return 'catalog';
    if (path.includes('udhar')) return 'udhar';
    if (path.includes('customers')) return 'customers';
    if (path.includes('reports')) return 'reports';
    if (path.includes('ai-corrections') || path.includes('ai-misses')) return 'ai-corrections';
    if (path.includes('inbox')) return 'inbox';
    if (path.includes('settings')) return 'settings';
    if (path.includes('staff')) return 'staff';
    return 'dashboard';
  }

  getDefaultTitle(route) {
    const titles = {
      dashboard: 'डॅशबोर्ड / Dashboard',
      orders: 'ऑर्डर्स / Orders',
      inventory: 'स्टॉक व माल / Inventory',
      catalog: 'उत्पादने व वर्ग / Catalog',
      udhar: 'उधारी वही / Udhar Khata',
      customers: 'ग्राहक / Customers',
      reports: 'अहवाल व नफा / Reports',
      'ai-corrections': 'AI सुधारणा / AI Misses',
      inbox: 'सूचना / Inbox',
      settings: 'सेटिंग्ज / Settings',
      staff: 'कर्मचारी / Staff',
    };
    return titles[route] || 'महालक्ष्मी किराणा / Mahalaxmi Kirana';
  }

  getNavSections() {
    const user = window.AdminAuth ? window.AdminAuth.getUser() : null;
    const isOwner = user && user.role === 'owner';

    // Grouped Information Architecture
    const sections = [
      {
        title: 'मुख्य / Core',
        items: [
          { id: 'dashboard', href: 'dashboard.html', icon: '📊', label: 'डॅशबोर्ड / Dashboard' },
          { id: 'orders', href: 'orders.html', icon: '📦', label: 'ऑर्डर्स / Orders', badgeId: 'navBadgeOrders' },
          { id: 'inventory', href: 'inventory.html', icon: '📥', label: 'स्टॉक व माल / Inventory', badgeId: 'navBadgeStock' },
        ],
      },
      {
        title: 'दुकान व्यवस्थापन / Store',
        items: [
          { id: 'catalog', href: 'catalog.html', icon: '🏷️', label: 'उत्पादने व वर्ग / Catalog' },
          { id: 'udhar', href: 'udhar.html', icon: '📝', label: 'उधारी वही / Udhar' },
          { id: 'customers', href: 'customers.html', icon: '👥', label: 'ग्राहक / Customers' },
        ],
      },
      {
        title: 'अहवाल व प्रणाली / System',
        items: [
          { id: 'reports', href: 'reports.html', icon: '📈', label: 'अहवाल व नफा / Reports', ownerOnly: true },
          { id: 'ai-corrections', href: 'ai-corrections.html', icon: '🤖', label: 'AI सुधारणा / AI Misses' },
          { id: 'inbox', href: 'inbox.html', icon: '🔔', label: 'सूचना / Inbox', badgeId: 'navBadgeInbox' },
          { id: 'settings', href: 'settings.html', icon: '⚙️', label: 'सेटिंग्ज / Settings', ownerOnly: true },
          { id: 'staff', href: 'staff.html', icon: '👤', label: 'कर्मचारी / Staff', ownerOnly: true },
        ],
      },
    ];

    // Filter by role
    if (!isOwner) {
      return sections.map((sec) => ({
        ...sec,
        items: sec.items.filter((item) => !item.ownerOnly),
      })).filter((sec) => sec.items.length > 0);
    }

    return sections;
  }

  init() {
    this.renderShell();
    this.initAudioContext();
    this.initMoreDrawer();
    this.fetchStoreSettings();
    this.startLivePolling();
  }

  renderShell() {
    const shellRoot = document.getElementById('app-shell');
    if (!shellRoot) return;

    const navSections = this.getNavSections();
    const user = window.AdminAuth ? window.AdminAuth.getUser() : null;
    const userName = user ? (user.name || 'Owner') : 'Store';
    const userRole = user ? (user.role === 'owner' ? 'मालक / Owner' : 'कर्मचारी / Staff') : '';

    shellRoot.className = 'app-shell';

    // 1. Sidebar (Desktop & Tablet Rail)
    const sidebar = document.createElement('aside');
    sidebar.className = 'app-sidebar';
    sidebar.innerHTML = `
      <div class="sidebar-header">
        <a href="dashboard.html" class="sidebar-brand">
          <span class="sidebar-brand-icon">🏪</span>
          <span>महालक्ष्मी किराणा</span>
        </a>
      </div>
      <nav class="sidebar-nav">
        ${navSections.map((sec) => `
          <div class="nav-section-title">${sec.title}</div>
          ${sec.items.map((item) => `
            <a href="${item.href}" class="nav-item ${this.activeRoute === item.id ? 'active' : ''}">
              <span class="icon">${item.icon}</span>
              <span>${item.label}</span>
              ${item.badgeId ? `<span class="badge badge-danger" id="${item.badgeId}" style="display:none;">0</span>` : ''}
            </a>
          `).join('')}
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="user-info" style="min-width:0;">
          <div style="font-weight:700;font-size:0.85rem;" class="truncate">${window.esc ? window.esc(userName) : userName}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${userRole}</div>
        </div>
        <button type="button" class="btn btn-sm btn-secondary" id="shellLogoutBtn" title="Logout / बाहेर पडा">
          🚪
        </button>
      </div>
    `;

    // 2. Main Wrapper
    const mainWrapper = document.createElement('div');
    mainWrapper.className = 'app-main-wrapper';

    // Top Header
    const header = document.createElement('header');
    header.className = 'app-header';
    header.innerHTML = `
      <div class="header-title-wrap">
        <h1 class="header-page-title">${this.pageTitle}</h1>
      </div>
      <div class="header-actions">
        <!-- Store Open/Closed Toggle Chip -->
        <button type="button" class="store-status-pill open" id="storeStatusToggle" title="Toggle Store Open/Closed">
          <span class="status-dot"></span>
          <span id="storeStatusLabel">दुकान सुरू / Open</span>
        </button>

        <!-- Audio Alert Toggle -->
        <button type="button" class="btn btn-sm btn-secondary" id="audioToggleBtn" title="Alert Sound">
          🔊
        </button>

        <!-- Notification Bell -->
        <a href="inbox.html" class="btn btn-sm btn-secondary" style="position:relative;" title="Notifications / सूचना">
          🔔
          <span class="badge badge-danger" id="headerInboxBadge" style="position:absolute;top:-4px;right:-4px;display:none;padding:1px 5px;font-size:0.65rem;">0</span>
        </a>
      </div>
    `;

    // Page Content Slot
    const contentArea = document.createElement('main');
    contentArea.className = 'app-content';
    contentArea.id = 'app-content-slot';

    // Move existing page children into content slot
    while (shellRoot.firstChild) {
      contentArea.appendChild(shellRoot.firstChild);
    }

    mainWrapper.appendChild(header);
    mainWrapper.appendChild(contentArea);

    // 3. Mobile Bottom Nav (< 768px: Home, Orders, Stock, Udhar, More)
    const bottomNav = document.createElement('nav');
    bottomNav.className = 'app-bottom-nav';
    bottomNav.innerHTML = `
      <a href="dashboard.html" class="bottom-tab ${this.activeRoute === 'dashboard' ? 'active' : ''}">
        <span class="tab-icon">📊</span>
        <span>डॅशबोर्ड</span>
      </a>
      <a href="orders.html" class="bottom-tab ${this.activeRoute === 'orders' ? 'active' : ''}">
        <span class="tab-icon">📦</span>
        <span>ऑर्डर्स</span>
        <span class="tab-badge" id="bottomOrdersBadge" style="display:none;">0</span>
      </a>
      <a href="inventory.html" class="bottom-tab ${this.activeRoute === 'inventory' ? 'active' : ''}">
        <span class="tab-icon">📥</span>
        <span>स्टॉक</span>
      </a>
      <a href="udhar.html" class="bottom-tab ${this.activeRoute === 'udhar' ? 'active' : ''}">
        <span class="tab-icon">📝</span>
        <span>उधारी</span>
      </a>
      <button type="button" class="bottom-tab" id="bottomMoreBtn">
        <span class="tab-icon">☰</span>
        <span>अधिक (More)</span>
      </button>
    `;

    shellRoot.appendChild(sidebar);
    shellRoot.appendChild(mainWrapper);
    shellRoot.appendChild(bottomNav);

    // Event Listeners
    const logoutBtn = document.getElementById('shellLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('तुम्हाला बाहेर पडायचे आहे का? / Are you sure you want to log out?')) {
          if (window.AdminAuth) {
            window.AdminAuth.redirectToLogin();
          } else {
            localStorage.removeItem('kirana_token');
            localStorage.removeItem('kirana_user');
            window.location.href = '../login.html';
          }
        }
      });
    }

    const storeToggleBtn = document.getElementById('storeStatusToggle');
    if (storeToggleBtn) {
      storeToggleBtn.addEventListener('click', () => this.toggleStoreOpenStatus());
    }

    const audioToggleBtn = document.getElementById('audioToggleBtn');
    if (audioToggleBtn) {
      audioToggleBtn.addEventListener('click', () => this.toggleAudioMute());
    }

    const moreBtn = document.getElementById('bottomMoreBtn');
    if (moreBtn) {
      moreBtn.addEventListener('click', () => this.moreSheet.open());
    }
  }

  initMoreDrawer() {
    this.moreSheet = new window.AdminBottomSheet({
      title: 'अधिक पर्याय / All Modules & Settings',
    });

    const user = window.AdminAuth ? window.AdminAuth.getUser() : null;
    const isOwner = user && user.role === 'owner';

    const moreItems = [
      { href: 'catalog.html', icon: '🏷️', label: 'उत्पादने व वर्ग (Catalog)' },
      { href: 'customers.html', icon: '👥', label: 'ग्राहक व्यवस्थापन (Customers)' },
      { href: 'reports.html', icon: '📈', label: 'अहवाल व नफा (Reports)', ownerOnly: true },
      { href: 'ai-corrections.html', icon: '🤖', label: 'AI सुधारणा (AI Misses)' },
      { href: 'inbox.html', icon: '🔔', label: 'सूचना व संदेश (Inbox)' },
      { href: 'settings.html', icon: '⚙️', label: 'दुकान सेटिंग्ज (Settings)', ownerOnly: true },
      { href: 'staff.html', icon: '👤', label: 'कर्मचारी व्यवस्थापन (Staff)', ownerOnly: true },
    ];

    const allowed = isOwner ? moreItems : moreItems.filter((i) => !i.ownerOnly);

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    grid.style.gap = '12px';
    grid.style.padding = '8px 0';

    for (const item of allowed) {
      const a = document.createElement('a');
      a.href = item.href;
      a.className = 'btn btn-secondary';
      a.style.display = 'flex';
      a.style.flexDirection = 'column';
      a.style.alignItems = 'center';
      a.style.justifyContent = 'center';
      a.style.padding = '16px 8px';
      a.style.gap = '8px';
      a.style.borderRadius = '14px';
      a.innerHTML = `<span style="font-size: 1.75rem;">${item.icon}</span><span style="font-size: 0.8rem; text-align: center; font-weight: 600;">${item.label}</span>`;
      grid.appendChild(a);
    }

    this.moreSheet.setContent(grid);
  }

  // ── Live Polling (throttled & pauses when tab hidden) ──
  startLivePolling() {
    const poll = async () => {
      // Do not poll if background tab
      if (document.visibilityState === 'hidden') return;
      await this.refreshCounts();
    };

    poll();
    this.pollInterval = setInterval(poll, 30000);

    // Refresh immediately when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        poll();
      }
    });
  }

  async refreshCounts() {
    try {
      if (!window.AdminAPI) return;
      const res = await window.AdminAPI.get('/notifications/unread-count');
      if (res && res.success) {
        this.updateInboxCount(res.unreadCount || 0);
      }
    } catch (_) {}
  }

  updateInboxCount(count) {
    this.unreadCount = count;
    const headerBadge = document.getElementById('headerInboxBadge');
    const navBadge = document.getElementById('navBadgeInbox');

    if (headerBadge) {
      headerBadge.textContent = count;
      headerBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
    if (navBadge) {
      navBadge.textContent = count;
      navBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  // ── Store Open / Closed Toggle ──
  async fetchStoreSettings() {
    try {
      if (!window.AdminAPI) return;
      const res = await window.AdminAPI.get('/settings');
      if (res && res.success && res.data) {
        this.isStoreOpen = res.data.isStoreOpen !== false;
        this.updateStoreStatusUi();
      }
    } catch (_) {}
  }

  async toggleStoreOpenStatus() {
    const nextState = !this.isStoreOpen;
    const confirmMsg = nextState
      ? 'दुकान सुरू करायचे आहे का? ग्राहक ऑर्डर करू शकतील.\nOpen store for customer orders?'
      : 'दुकान तात्पुरते बंद करायचे आहे का? ग्राहक नवीन ऑर्डर करू शकणार नाहीत.\nClose store temporarily? Customers will not be able to place new orders.';

    if (!confirm(confirmMsg)) return;

    try {
      const res = await window.AdminAPI.put('/settings', {
        isStoreOpen: nextState,
      });

      if (res && res.success) {
        this.isStoreOpen = nextState;
        this.updateStoreStatusUi();
        if (window.AdminToast) {
          window.AdminToast.show(nextState ? '✅ दुकान सुरू केले / Store Opened' : '🛑 दुकान बंद केले / Store Closed', 'success');
        }
      }
    } catch (err) {
      if (window.AdminToast) {
        window.AdminToast.show('❌ Error: ' + err.message, 'danger');
      }
    }
  }

  updateStoreStatusUi() {
    const pill = document.getElementById('storeStatusToggle');
    const label = document.getElementById('storeStatusLabel');
    if (!pill || !label) return;

    if (this.isStoreOpen) {
      pill.className = 'store-status-pill open';
      label.textContent = 'दुकान सुरू / Open';
    } else {
      pill.className = 'store-status-pill closed';
      label.textContent = 'दुकान बंद / Closed';
    }
  }

  // ── Sound Chime & Audio Context ──
  initAudioContext() {
    const isMuted = localStorage.getItem('admin_audio_muted') === 'true';
    const audioBtn = document.getElementById('audioToggleBtn');
    if (audioBtn) {
      audioBtn.innerHTML = isMuted ? '🔇' : '🔊';
      audioBtn.title = isMuted ? 'Unmute Sound' : 'Mute Sound';
    }
  }

  toggleAudioMute() {
    const current = localStorage.getItem('admin_audio_muted') === 'true';
    const next = !current;
    localStorage.setItem('admin_audio_muted', String(next));
    const audioBtn = document.getElementById('audioToggleBtn');
    if (audioBtn) {
      audioBtn.innerHTML = next ? '🔇' : '🔊';
      audioBtn.title = next ? 'Unmute Sound' : 'Mute Sound';
    }
    if (!next) {
      this.playOrderChime();
    }
  }

  playOrderChime() {
    if (localStorage.getItem('admin_audio_muted') === 'true') return;
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880, now + 0.15); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(587.33, now);
      osc2.frequency.setValueAtTime(880, now + 0.15);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (_) {}
  }
}

window.AdminShell = AppShell;
