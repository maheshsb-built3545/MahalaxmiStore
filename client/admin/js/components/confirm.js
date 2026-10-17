/**
 * Mahalaxmi Kirana Store — Async Bilingual Confirm Dialog
 */

'use strict';

/**
 * Shows an async bilingual confirm modal.
 * @param {Object} options
 * @param {string} options.title - Bilingual title
 * @param {string} options.message - Bilingual description
 * @param {string} options.confirmText - Button text
 * @param {string} options.cancelText - Cancel text
 * @param {boolean} options.isDestructive - Use danger red button
 * @returns {Promise<boolean>}
 */
function confirmDialog(options = {}) {
  const {
    title = 'खात्री करा / Confirm Action',
    message = 'तुम्हाला ही कृती करायची आहे का? / Are you sure you want to proceed?',
    confirmText = 'होय, सुरू ठेवा / Yes, Proceed',
    cancelText = 'रद्द करा / Cancel',
    isDestructive = false,
  } = options;

  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop open';
    backdrop.setAttribute('role', 'alertdialog');
    backdrop.setAttribute('aria-modal', 'true');

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.style.maxWidth = '420px';

    dialog.innerHTML = `
      <div class="modal-header">
        <h3 style="font-size:1.1rem;">${window.esc ? window.esc(title) : title}</h3>
      </div>
      <div class="modal-body">
        <p style="font-size:0.95rem;line-height:1.5;">${window.esc ? window.esc(message) : message}</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="confirmCancelBtn">${window.esc ? window.esc(cancelText) : cancelText}</button>
        <button type="button" class="btn ${isDestructive ? 'btn-danger' : 'btn-primary'}" id="confirmOkBtn">${window.esc ? window.esc(confirmText) : confirmText}</button>
      </div>
    `;

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    function cleanup(result) {
      if (backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
      resolve(result);
    }

    dialog.querySelector('#confirmCancelBtn').onclick = () => cleanup(false);
    dialog.querySelector('#confirmOkBtn').onclick = () => cleanup(true);

    backdrop.onclick = (e) => {
      if (e.target === backdrop) cleanup(false);
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        window.removeEventListener('keydown', handleKey);
        cleanup(false);
      }
    };
    window.addEventListener('keydown', handleKey);
  });
}

window.AdminConfirm = confirmDialog;
