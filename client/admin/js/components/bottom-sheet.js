/**
 * Mahalaxmi Kirana Store — Modal & Mobile Bottom Sheet Component
 * - Mobile (< 768px): slide-up bottom sheet with swipe-down gesture to dismiss.
 * - Desktop (>= 768px): centered modal dialog.
 * - Focus trap and Escape key dismissal.
 */

'use strict';

class BottomSheet {
  static open(options = {}) {
    const sheet = new BottomSheet(options);
    if (options.content) {
      sheet.setContent(options.content);
    }
    sheet.open();
    return sheet;
  }

  constructor(options = {}) {
    this.options = {
      title: '',
      isSheetOnMobile: true,
      onClose: null,
      ...options,
    };

    this.isOpen = false;
    this.startY = 0;
    this.currentY = 0;
    this.boundKeydown = this.handleKeyDown.bind(this);

    this.createDom();
  }

  createDom() {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'modal-backdrop';
    this.backdrop.setAttribute('role', 'dialog');
    this.backdrop.setAttribute('aria-modal', 'true');

    this.dialog = document.createElement('div');
    this.dialog.className = `modal-dialog ${this.options.isSheetOnMobile ? 'bottom-sheet' : ''}`;

    if (this.options.isSheetOnMobile) {
      this.handle = document.createElement('div');
      this.handle.className = 'sheet-handle';
      this.dialog.appendChild(this.handle);
      this.attachSwipeGestures();
    }

    // Header
    this.header = document.createElement('div');
    this.header.className = 'modal-header';

    this.titleEl = document.createElement('h3');
    this.titleEl.textContent = this.options.title || '';

    this.closeBtn = document.createElement('button');
    this.closeBtn.type = 'button';
    this.closeBtn.className = 'btn btn-sm btn-secondary';
    this.closeBtn.innerHTML = '✕';
    this.closeBtn.setAttribute('aria-label', 'Close modal');
    this.closeBtn.onclick = () => this.close();

    this.header.appendChild(this.titleEl);
    this.header.appendChild(this.closeBtn);
    this.dialog.appendChild(this.header);

    // Body
    this.body = document.createElement('div');
    this.body.className = 'modal-body';
    this.dialog.appendChild(this.body);

    this.backdrop.appendChild(this.dialog);

    // Backdrop click to close
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    document.body.appendChild(this.backdrop);
  }

  setContent(nodeOrHtml) {
    if (typeof nodeOrHtml === 'string') {
      this.body.innerHTML = nodeOrHtml;
    } else if (nodeOrHtml instanceof Node) {
      this.body.replaceChildren(nodeOrHtml);
    }
  }

  setTitle(title) {
    this.titleEl.textContent = title;
  }

  open(nodeOrHtml = null) {
    if (nodeOrHtml) this.setContent(nodeOrHtml);
    this.isOpen = true;
    this.backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', this.boundKeydown);

    // Focus on first input or close button
    setTimeout(() => {
      const focusable = this.dialog.querySelector('input, button, select, textarea');
      if (focusable) focusable.focus();
    }, 100);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.backdrop.classList.remove('open');
    document.body.style.overflow = '';
    window.removeEventListener('keydown', this.boundKeydown);

    if (typeof this.options.onClose === 'function') {
      this.options.onClose();
    }
  }

  handleKeyDown(e) {
    if (e.key === 'Escape' && this.isOpen) {
      this.close();
    }
  }

  attachSwipeGestures() {
    this.dialog.addEventListener('touchstart', (e) => {
      this.startY = e.touches[0].clientY;
      this.currentY = this.startY;
    }, { passive: true });

    this.dialog.addEventListener('touchmove', (e) => {
      this.currentY = e.touches[0].clientY;
      const deltaY = this.currentY - this.startY;
      if (deltaY > 0 && this.body.scrollTop <= 0) {
        this.dialog.style.transform = `translateY(${deltaY}px)`;
      }
    }, { passive: true });

    this.dialog.addEventListener('touchend', () => {
      const deltaY = this.currentY - this.startY;
      if (deltaY > 120 && this.body.scrollTop <= 0) {
        this.close();
      }
      this.dialog.style.transform = '';
    });
  }

  destroy() {
    this.close();
    if (this.backdrop && this.backdrop.parentNode) {
      this.backdrop.parentNode.removeChild(this.backdrop);
    }
  }
}

window.AdminBottomSheet = BottomSheet;
