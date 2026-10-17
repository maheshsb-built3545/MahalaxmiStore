/**
 * Mahalaxmi Kirana Store — Lightweight SVG Chart Component
 * High performance, zero external libraries.
 */

'use strict';

/**
 * Generates an SVG Sparkline string.
 * @param {number[]} data - Array of numeric values
 * @param {Object} options - { width, height, strokeColor, fillColor }
 */
function renderSparkline(data = [], options = {}) {
  const width = options.width || 120;
  const height = options.height || 36;
  const strokeColor = options.strokeColor || '#16a34a';
  const fillColor = options.fillColor || 'rgba(34, 197, 94, 0.15)';

  if (!data.length) return '';

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block; overflow:visible;">
      <path d="${areaPath}" fill="${fillColor}" />
      <path d="${linePath}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

/**
 * Generates a full responsive SVG Bar Chart.
 * @param {Array<{ label: string, value: number }>} items
 * @param {Object} options - { height, barColor }
 */
function renderBarChart(items = [], options = {}) {
  const height = options.height || 180;
  const barColor = options.barColor || '#15803d';

  if (!items.length) {
    return `<div class="text-sm text-muted" style="text-align:center;padding:24px;">माहिती उपलब्ध नाही / No data</div>`;
  }

  const max = Math.max(...items.map((i) => i.value), 1);
  const barWidth = 100 / items.length;

  return `
    <div style="width: 100%; height: ${height}px; display: flex; align-items: flex-end; gap: 8px; padding-top: 24px;">
      ${items.map((item) => {
        const pct = Math.round((item.value / max) * 100);
        return `
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end;">
            <span style="font-size: 0.65rem; color: #64748b; margin-bottom: 4px; font-weight: 700;">₹${item.value}</span>
            <div style="width: 100%; max-width: 36px; height: ${Math.max(pct, 4)}%; background: ${barColor}; border-radius: 6px 6px 0 0; transition: height 0.3s ease;"></div>
            <span style="font-size: 0.7rem; color: #475569; margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 50px;">${window.esc ? window.esc(item.label) : item.label}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

window.AdminChart = {
  renderSparkline,
  renderBarChart,
};
