/**
 * Mahalaxmi Kirana Store — Quantity Stepper Component
 * 44px minimum touch targets for comfortable mobile one-handed operation.
 */

'use strict';

function renderQtyStepper({ value = 1, min = 0, max = 9999, step = 1, onChange = null }) {
  const container = document.createElement('div');
  container.className = 'qty-stepper';

  const minusBtn = document.createElement('button');
  minusBtn.type = 'button';
  minusBtn.className = 'stepper-btn';
  minusBtn.innerHTML = '−';
  minusBtn.setAttribute('aria-label', 'Decrease quantity');

  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'stepper-input';
  input.value = value;
  input.min = min;
  input.max = max;
  input.step = step;
  input.setAttribute('aria-label', 'Quantity');

  const plusBtn = document.createElement('button');
  plusBtn.type = 'button';
  plusBtn.className = 'stepper-btn';
  plusBtn.innerHTML = '+';
  plusBtn.setAttribute('aria-label', 'Increase quantity');

  function updateVal(newVal) {
    let clamped = Math.max(min, Math.min(max, newVal));
    // Round to 2 decimals for fractional units (e.g. 2.5 kg)
    clamped = Math.round(clamped * 100) / 100;
    input.value = clamped;
    if (typeof onChange === 'function') {
      onChange(clamped);
    }
  }

  minusBtn.onclick = () => updateVal(parseFloat(input.value || 0) - step);
  plusBtn.onclick = () => updateVal(parseFloat(input.value || 0) + step);
  input.onchange = () => updateVal(parseFloat(input.value || 0));

  container.appendChild(minusBtn);
  container.appendChild(input);
  container.appendChild(plusBtn);

  return container;
}

window.AdminStepper = { render: renderQtyStepper };
