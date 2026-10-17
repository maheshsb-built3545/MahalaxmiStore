/**
 * Mahalaxmi Kirana Store — DOM Utilities & XSS Protection
 */

'use strict';

/**
 * Escapes unsafe characters for HTML text insertion.
 * Safe for null, undefined, numbers, strings.
 */
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Creates a DOM element with properties, attributes, and children.
 * No innerHTML with raw user input.
 */
function el(tag, props = {}, ...children) {
  const element = document.createElement(tag);

  for (const [key, val] of Object.entries(props)) {
    if (key.startsWith('on') && typeof val === 'function') {
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, val);
    } else if (key === 'className' || key === 'class') {
      element.className = val;
    } else if (key === 'style' && typeof val === 'object') {
      Object.assign(element.style, val);
    } else if (key === 'dataset' && typeof val === 'object') {
      Object.assign(element.dataset, val);
    } else if (val !== false && val !== null && val !== undefined) {
      element.setAttribute(key, val === true ? '' : val);
    }
  }

  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      element.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }

  return element;
}

/**
 * Safely replaces container content with children.
 */
function setContent(container, ...children) {
  if (typeof container === 'string') {
    container = document.querySelector(container);
  }
  if (!container) return;
  container.replaceChildren(...children.flat(Infinity));
}

// Global export for non-module scripts
window.AdminDOM = { esc, escape: esc, el, setContent };
window.esc = esc;
window.escapeHtml = esc; // backward compat with legacy scripts
