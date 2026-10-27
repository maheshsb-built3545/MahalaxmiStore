/**
 * Mahalaxmi Kirana Store — Admin Inbox & Notifications Page
 * Specs: 3.9 Inbox
 * 100% Bilingual Marathi + English
 */

'use strict';

(function () {
  const root = document.getElementById('inbox-page-root');
  if (!root) return;

  let notifications = [];
  let activeFilter = 'all';
  let isLoading = false;

  async function init() {
    AdminShell.init('inbox');
    renderPageSkeleton();
    await loadNotifications();
  }

  function renderPageSkeleton() {
    root.innerHTML = `
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
        <div>
          <h1 style="font-size:1.5rem;font-weight:800;color:var(--text);margin:0;">
            ${t('nav_inbox')}
          </h1>
          <p style="font-size:0.85rem;color:var(--text-muted);margin:4px 0 0;">
            नवीन ऑर्डर्स, कमी साठा इशारे व उधारी विनंत्या / Orders, low stock alerts & customer requests
          </p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="btn btn-secondary" id="btn-push-toggle" style="min-height:44px;font-size:0.82rem;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
            <svg class="icon"><use href="/images/icons.svg#bell"></use></svg> ${t('inbox_push_toggle')}
          </button>
          <button type="button" class="btn btn-primary" id="btn-mark-all-read" style="min-height:44px;font-size:0.82rem;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
            <svg class="icon"><use href="/images/icons.svg#check"></use></svg> ${t('inbox_mark_all_read')}
          </button>
        </div>
      </div>

      <!-- Filter Chips -->
      <div class="inbox-filters" style="background:var(--surface);padding:10px 14px;border-radius:var(--radius-lg);border:1px solid var(--border);margin-bottom:16px;display:flex;gap:6px;overflow-x:auto;" id="inbox-chips-container">
        <button type="button" class="chip active" data-filter="all">सर्व / All</button>
        <button type="button" class="chip" data-filter="unread">न वाचलेले / Unread</button>
        <button type="button" class="chip" data-filter="orders">ऑर्डर्स / Orders</button>
        <button type="button" class="chip" data-filter="stock">साठा / Stock</button>
        <button type="button" class="chip" data-filter="udhar">उधारी / Udhar</button>
      </div>

      <!-- Notifications Feed Container -->
      <div id="inbox-feed-container">
        ${AdminSkeleton.cardList(4)}
      </div>
    `;

    bindFilterEvents();
    bindActionEvents();
  }

  function bindFilterEvents() {
    const chips = root.querySelectorAll('#inbox-chips-container .chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        activeFilter = chip.dataset.filter;
        renderNotificationsList();
      });
    });
  }

  function bindActionEvents() {
    document.getElementById('btn-mark-all-read')?.addEventListener('click', async () => {
      try {
        const res = await AdminAPI.patch('/api/notifications/read-all');
        if (res.success) {
          AdminToast.success('सर्व सूचना वाचल्याची नोंद केली / All notifications marked as read');
          notifications.forEach((n) => (n.readAt = new Date().toISOString()));
          renderNotificationsList();
          if (window.shell?.fetchUnreadCount) window.shell.fetchUnreadCount();
        }
      } catch (err) {
        AdminToast.error(err.message || t('error_generic'));
      }
    });

    document.getElementById('btn-push-toggle')?.addEventListener('click', togglePushSubscription);
  }

  async function togglePushSubscription() {
    if (!('Notification' in window)) {
      AdminToast.warning('ह्या ब्राउझरमध्ये वेब पुश सूचना समर्थित नाहीत / Web Push not supported in this browser');
      return;
    }

    if (Notification.permission === 'granted') {
      AdminToast.info('पुश सूचना आधीपासूनच सुरू आहेत / Push alerts are already enabled');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        AdminToast.success('पुश सूचना सुरू झाल्या! / Push notifications enabled!');
      } else {
        AdminToast.warning('सूचना परवानगी नाकारली / Notification permission denied');
      }
    } catch (err) {
      AdminToast.error('सूचना सुरू करताना अडचण आली / Failed to request permission');
    }
  }

  async function loadNotifications() {
    isLoading = true;
    try {
      const res = await AdminAPI.get('/api/notifications?limit=100');
      if (res.success && res.data) {
        notifications = res.data.notifications || res.data || [];
      }
    } catch (err) {
      AdminToast.error(err.message || t('error_generic'));
    } finally {
      isLoading = false;
      renderNotificationsList();
    }
  }

  function getFilteredNotifications() {
    return notifications.filter((n) => {
      const isUnread = !n.readAt;
      if (activeFilter === 'unread') return isUnread;

      const type = n.type || '';
      if (activeFilter === 'orders') {
        return ['order_new', 'order_status', 'order_cancelled', 'substitute_proposed'].includes(type);
      }
      if (activeFilter === 'stock') {
        return type === 'low_stock';
      }
      if (activeFilter === 'udhar') {
        return ['udhar_request', 'udhar_status', 'udhar_update'].includes(type);
      }

      return true;
    });
  }

  function groupNotificationsByDay(list) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = {
      today: [],
      yesterday: [],
      earlier: [],
    };

    list.forEach((n) => {
      const d = new Date(n.createdAt);
      d.setHours(0, 0, 0, 0);

      if (d.getTime() === today.getTime()) {
        groups.today.push(n);
      } else if (d.getTime() === yesterday.getTime()) {
        groups.yesterday.push(n);
      } else {
        groups.earlier.push(n);
      }
    });

    return groups;
  }

  function renderNotificationsList() {
    const container = document.getElementById('inbox-feed-container');
    if (!container) return;

    const filtered = getFilteredNotifications();
    if (filtered.length === 0) {
      container.innerHTML = '';
      container.appendChild(
        AdminEmptyState.create({
          title: t('no_notifications'),
          description: activeFilter === 'unread'
            ? 'सर्व सूचना वाचल्या आहेत! / All notifications are read!'
            : 'सध्या कोणत्याही नवीन सूचना नाहीत / No notifications in this category',
        })
      );
      return;
    }

    const groups = groupNotificationsByDay(filtered);
    container.innerHTML = '';

    if (groups.today.length > 0) {
      container.appendChild(createGroupHeader(t('inbox_today'), groups.today.length));
      groups.today.forEach((n) => container.appendChild(createNotificationCard(n)));
    }

    if (groups.yesterday.length > 0) {
      container.appendChild(createGroupHeader(t('inbox_yesterday'), groups.yesterday.length));
      groups.yesterday.forEach((n) => container.appendChild(createNotificationCard(n)));
    }

    if (groups.earlier.length > 0) {
      container.appendChild(createGroupHeader(t('inbox_earlier'), groups.earlier.length));
      groups.earlier.forEach((n) => container.appendChild(createNotificationCard(n)));
    }
  }

  function createGroupHeader(title, count) {
    const div = document.createElement('div');
    div.style.cssText = 'font-size:0.85rem;font-weight:700;color:var(--text-muted);margin:16px 0 8px;padding-left:4px;display:flex;align-items:center;gap:6px;';
    div.innerHTML = `<span style="display:flex;align-items:center;gap:6px;"><svg class="icon icon-sm"><use href="/images/icons.svg#clock"></use></svg> ${AdminDOM.escape(title)}</span> <span style="font-size:0.75rem;background:var(--bg-muted);padding:2px 6px;border-radius:10px;">${count}</span>`;
    return div;
  }

  function getDeepLinkInfo(n) {
    const type = n.type || '';
    const link = n.link || '';
    const meta = n.metadata || {};

    if (link) {
      // Map old URLs if needed
      let targetUrl = link;
      if (targetUrl.includes('orders.html') && meta.orderNumber) {
        targetUrl = `orders.html?search=${encodeURIComponent(meta.orderNumber)}`;
      } else if (targetUrl.includes('low-stock.html') || targetUrl.includes('stock-in.html')) {
        targetUrl = `inventory.html?tab=alerts`;
      }
      return { url: targetUrl, label: 'तपासा / View Details' };
    }

    if (['order_new', 'order_status', 'order_cancelled', 'substitute_proposed'].includes(type)) {
      const q = meta.orderNumber || '';
      return { url: `orders.html?search=${encodeURIComponent(q)}`, label: 'ऑर्डर पहा / View Order' };
    }

    if (type === 'low_stock') {
      return { url: 'inventory.html?tab=alerts', label: 'साठा तपासा / Check Stock' };
    }

    if (['udhar_request', 'udhar_status', 'udhar_update'].includes(type)) {
      return { url: 'udhar.html', label: 'उधारी खाते / View Udhar' };
    }

    return null;
  }

  function createNotificationCard(n) {
    const card = document.createElement('div');
    const isUnread = !n.readAt;
    card.className = `card notif-card ${isUnread ? 'unread' : ''}`;
    card.style.cssText = `padding:14px 16px;border-radius:var(--radius-lg);border:1px solid ${isUnread ? 'var(--primary)' : 'var(--border)'};background:${isUnread ? 'var(--surface)' : 'var(--surface)'};margin-bottom:10px;border-left:5px solid ${isUnread ? 'var(--primary)' : 'var(--border)'};position:relative;transition:all 0.15s;`;

    // Type icon
    let iconSymbol = 'bell';
    if (n.type === 'order_new') iconSymbol = 'cart';
    else if (n.type === 'order_status') iconSymbol = 'truck';
    else if (n.type === 'order_cancelled') iconSymbol = 'close';
    else if (n.type === 'low_stock') iconSymbol = 'warning';
    else if (n.type === 'udhar_request' || n.type === 'udhar_status') iconSymbol = 'book';

    const deepLink = getDeepLinkInfo(n);

    card.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:var(--bg-muted);margin-top:2px;flex-shrink:0;">
          <svg class="icon" style="width:18px;height:18px;"><use href="/images/icons.svg#${iconSymbol}"></use></svg>
        </span>
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px;">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <h3 style="font-size:0.95rem;font-weight:${isUnread ? '800' : '700'};color:var(--text);margin:0;">
                ${AdminDOM.escape(n.title)}
              </h3>
              ${isUnread ? '<span style="width:8px;height:8px;background:var(--primary);border-radius:50%;display:inline-block;"></span>' : ''}
            </div>
            <span style="font-size:0.75rem;color:var(--text-muted);white-space:nowrap;">
              ${window.AdminFormat?.relativeTime ? window.AdminFormat.relativeTime(n.createdAt) : window.AdminFormat?.dateIST(n.createdAt, 'full')}
            </span>
          </div>

          <p style="font-size:0.85rem;color:var(--text-muted);margin:0 0 10px;line-height:1.45;">
            ${AdminDOM.escape(n.body)}
          </p>

          ${deepLink ? `
            <div style="display:flex;gap:8px;">
              <a href="${deepLink.url}" class="btn btn-secondary btn-sm btn-notif-action" style="min-height:36px;font-size:0.78rem;font-weight:600;text-decoration:none;border-color:var(--primary);color:var(--primary);">
                ${deepLink.label} →
              </a>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Click handler to mark read
    card.addEventListener('click', async (e) => {
      if (isUnread) {
        try {
          await AdminAPI.patch(`/api/notifications/${n._id}/read`);
          n.readAt = new Date().toISOString();
          card.classList.remove('unread');
          card.style.borderLeftColor = 'var(--border)';
          const dot = card.querySelector('span[style*="border-radius:50%"]');
          if (dot) dot.remove();
          if (window.shell?.fetchUnreadCount) window.shell.fetchUnreadCount();
        } catch (_) {}
      }
    });

    return card;
  }

  // Auto-init on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
