/**
 * frontend/admin/js/admin-settings.js
 * Store settings management: delivery rules, service pincodes, delivery slots,
 * UPI phone & QR code upload.
 */

'use strict';

async function loadSettings() {
  try {
    const res = await adminFetch('/admin/settings');
    if (!res.success || !res.data) return;

    const s = res.data;

    document.getElementById('setMinOrder').value = s.minOrder || 0;
    document.getElementById('setDeliveryCharge').value = s.deliveryCharge || 0;
    document.getElementById('setFreeDeliveryAbove').value = s.freeDeliveryAbove || 0;
    document.getElementById('setPincodes').value = (s.servicePincodes || []).join(', ');
    document.getElementById('setSlots').value = (s.slots || []).join('\n');
    document.getElementById('setStoreHours').value = s.storeHours || '';
    document.getElementById('setUpiMobile').value = s.upiMobile || '';
    document.getElementById('setStoreWhatsapp').value = s.storeWhatsapp || '';
    document.getElementById('setUpiQrImageUrl').value = s.upiQrImage || '';

    const preview = document.getElementById('qrPreview');
    const previewWrap = document.getElementById('qrPreviewWrap');
    if (s.upiQrImage) {
      preview.src = s.upiQrImage.startsWith('/') ? `..${s.upiQrImage}` : s.upiQrImage;
      previewWrap.style.display = 'block';
    } else {
      previewWrap.style.display = 'none';
    }
  } catch (err) {
    alert(`Could not load store settings: ${err.message}`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderAdminNavigation('settings');
  loadSettings();
  setupBackupAndMaintenance();

  // QR image upload handler
  const qrFile = document.getElementById('qrImageFile');
  if (qrFile) {
    qrFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const uploadStatus = document.getElementById('qrUploadStatus');
      uploadStatus.textContent = 'Uploading QR image to Cloudinary…';

      try {
        const compressed = await compressImageFile(file, 800);
        const formData = new FormData();
        formData.append('image', compressed);

        const res = await adminFetch('/admin/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.success && res.url) {
          document.getElementById('setUpiQrImageUrl').value = res.url;
          document.getElementById('qrPreview').src = res.url;
          document.getElementById('qrPreviewWrap').style.display = 'block';
          uploadStatus.style.color = '#16a34a';
          uploadStatus.textContent = '✅ UPI QR image uploaded!';
        } else {
          uploadStatus.style.color = '#dc2626';
          uploadStatus.textContent = `❌ Upload failed: ${res.message || 'Unknown server error.'}`;
        }
      } catch (err) {
        uploadStatus.style.color = '#dc2626';
        uploadStatus.textContent = `❌ Upload failed: ${err.message}`;
      }
    });
  }

  // Form submit handler
  const form = document.getElementById('settingsForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('saveSettingsBtn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving Settings…';

      const rawPincodes = document.getElementById('setPincodes').value
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const rawSlots = document.getElementById('setSlots').value
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        minOrder: Number(document.getElementById('setMinOrder').value),
        deliveryCharge: Number(document.getElementById('setDeliveryCharge').value),
        freeDeliveryAbove: Number(document.getElementById('setFreeDeliveryAbove').value),
        servicePincodes: rawPincodes,
        slots: rawSlots,
        storeHours: document.getElementById('setStoreHours').value.trim(),
        upiMobile: document.getElementById('setUpiMobile').value.trim(),
        storeWhatsapp: document.getElementById('setStoreWhatsapp').value.trim(),
        upiQrImage: document.getElementById('setUpiQrImageUrl').value.trim(),
      };

      try {
        const res = await adminFetch('/admin/settings', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        if (res.success) {
          const alertBox = document.getElementById('settingsSuccessAlert');
          alertBox.style.display = 'block';
          setTimeout(() => {
            alertBox.style.display = 'none';
          }, 4000);
        }
      } catch (err) {
        alert(`Error updating settings: ${err.message}`);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save All Settings';
      }
    });
  }

  // Load and setup testimonials
  loadAdminTestimonials();
  setupTestimonialForm();
});

// ── Testimonials Management (ADM-06) ──────────────────────────────────────────

async function loadAdminTestimonials() {
  const container = document.getElementById('testimonialsAdminList');
  if (!container) return;

  try {
    const res = await adminFetch('/testimonials/admin');
    if (!res.success || !res.data) {
      container.innerHTML = '<div style="color: #dc2626; padding: 0.5rem;">Failed to load reviews.</div>';
      return;
    }

    const list = res.data;
    if (list.length === 0) {
      container.innerHTML = '<div style="color: #64748b; padding: 0.5rem; text-align: center;">No reviews yet.</div>';
      return;
    }

    container.innerHTML = list.map((item) => {
      const isVisible = item.visible !== false;
      return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.85rem; margin-bottom: 0.65rem; display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem;">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <strong style="font-size: 0.9rem; color: #0f172a;">${escapeHtml(item.name)}</strong>
              <span style="font-size: 0.75rem; color: #64748b;">(${escapeHtml(item.area || 'Yesgaon')})</span>
              ${item.sampleFlag ? '<span style="font-size: 0.7rem; background: #fef3c7; color: #92400e; padding: 1px 5px; border-radius: 4px; font-weight: 700;">SAMPLE</span>' : ''}
              <span style="font-size: 0.75rem; color: #f59e0b;">${'★'.repeat(item.rating || 5)}</span>
            </div>
            <div style="font-size: 0.85rem; color: #334155; margin-bottom: 0.2rem;">"${escapeHtml(item.textMr)}"</div>
            ${item.textEn ? `<div style="font-size: 0.78rem; color: #64748b; font-style: italic;">"${escapeHtml(item.textEn)}"</div>` : ''}
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.35rem; align-items: flex-end;">
            <button onclick="toggleTestimonialVisible('${item._id}', ${isVisible})" class="btn-action ${isVisible ? 'btn-outline' : 'btn-primary'}" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">
              ${isVisible ? '👁️ Visible (Hide)' : '🙈 Hidden (Show)'}
            </button>
            <button onclick="deleteTestimonialItem('${item._id}')" style="background: none; border: none; color: #ef4444; font-size: 0.75rem; cursor: pointer; text-decoration: underline;">
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div style="color: #dc2626; padding: 0.5rem;">Error: ${escapeHtml(err.message)}</div>`;
  }
}

async function toggleTestimonialVisible(id, currentVisible) {
  try {
    await adminFetch(`/testimonials/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ visible: !currentVisible }),
    });
    loadAdminTestimonials();
  } catch (err) {
    alert('Failed to update review visibility: ' + err.message);
  }
}

async function deleteTestimonialItem(id) {
  if (!confirm('Are you sure you want to delete this review? / हा अभिप्राय हटवायचा आहे का?')) return;
  try {
    await adminFetch(`/testimonials/${id}`, { method: 'DELETE' });
    loadAdminTestimonials();
  } catch (err) {
    alert('Failed to delete review: ' + err.message);
  }
}

function setupTestimonialForm() {
  const form = document.getElementById('addTestimonialForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('testiName').value.trim(),
      area: document.getElementById('testiArea').value.trim() || 'Yesgaon',
      textMr: document.getElementById('testiTextMr').value.trim(),
      textEn: document.getElementById('testiTextEn').value.trim(),
      sampleFlag: document.getElementById('testiSampleFlag').checked,
      rating: 5,
    };

    try {
      const res = await adminFetch('/testimonials', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.success) {
        form.reset();
        document.getElementById('testiSampleFlag').checked = true;
        loadAdminTestimonials();
      }
    } catch (err) {
      alert('Failed to save review: ' + err.message);
    }
  });
}

function setupBackupAndMaintenance() {
  const backupBtn = document.getElementById('btnDownloadBackup');
  const cleanupBtn = document.getElementById('btnCleanupNotifications');
  const statusMsg = document.getElementById('backupStatusMsg');

  if (backupBtn) {
    backupBtn.addEventListener('click', async () => {
      backupBtn.disabled = true;
      backupBtn.textContent = '⏳ Preparing backup snapshot...';
      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.style.color = '#475569';
        statusMsg.textContent = 'Collecting all collections from MongoDB...';
      }

      try {
        const token = auth.getToken();
        const res = await fetch(`${CONFIG.API_BASE}/admin/backup/export`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Backup failed');
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = `mahalaxmi-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        if (statusMsg) {
          statusMsg.style.color = '#15803d';
          statusMsg.textContent = '✅ Backup successfully downloaded to your computer!';
        }
      } catch (err) {
        if (statusMsg) {
          statusMsg.style.color = '#b91c1c';
          statusMsg.textContent = `❌ Backup error: ${err.message}`;
        }
      } finally {
        backupBtn.disabled = false;
        backupBtn.textContent = '📥 Download Full Database Backup (.json)';
      }
    });
  }

  if (cleanupBtn) {
    cleanupBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to cleanup notifications older than 90 days?\n९० दिवसांपेक्षा जुने संदेश कायमचे हटवायचे आहेत का?')) {
        return;
      }
      cleanupBtn.disabled = true;
      try {
        const res = await adminFetch('/admin/notifications/cleanup-old', { method: 'POST' });
        if (res.success) {
          alert(res.message);
        }
      } catch (err) {
        alert('Cleanup failed: ' + err.message);
      } finally {
        cleanupBtn.disabled = false;
      }
    });
  }
}


