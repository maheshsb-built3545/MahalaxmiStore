/**
 * Mahalaxmi Kirana Store — Core API Client
 * - Bearer authorization
 * - Request de-duplication on in-flight GETs
 * - Retry once for idempotent GETs
 * - Preserves customer cart on 401
 * - Authenticated Blob downloads without tokens in URL
 */

'use strict';

const inFlightGetRequests = new Map();

function getApiBase() {
  if (typeof CONFIG !== 'undefined' && CONFIG.API_BASE) {
    return CONFIG.API_BASE;
  }
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:5000/api' : '/api';
}

/**
 * Standard API request wrapper.
 */
async function request(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const token = window.AdminAuth ? window.AdminAuth.getToken() : localStorage.getItem('kirana_token');
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let url = endpoint;
  if (!url.startsWith('http')) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    url = `${getApiBase()}${cleanEndpoint}`;
  }

  // De-duplicate in-flight GET requests
  if (method === 'GET') {
    if (inFlightGetRequests.has(url)) {
      return inFlightGetRequests.get(url);
    }
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 15000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const fetchPromise = (async () => {
    let attempt = 0;
    const maxAttempts = method === 'GET' ? 2 : 1;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const res = await fetch(url, {
          ...options,
          method,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 401 Unauthorized: Clear auth keys only, redirect to login
        if (res.status === 401) {
          if (window.AdminAuth) {
            window.AdminAuth.redirectToLogin(window.location.pathname);
          } else {
            localStorage.removeItem('kirana_token');
            localStorage.removeItem('kirana_user');
            window.location.href = '../login.html';
          }
          throw new Error('सत्र संपले आहे, कृपया पुन्हा लॉगिन करा / Session expired, please login again.');
        }

        let data;
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await res.json();
        } else {
          data = { success: res.ok, rawText: await res.text() };
        }

        if (!res.ok) {
          const errMsg = data.message || `Request failed with HTTP ${res.status}`;
          throw new Error(errMsg);
        }

        return data;
      } catch (err) {
        if (attempt >= maxAttempts || method !== 'GET' || err.name === 'AbortError') {
          clearTimeout(timeoutId);
          throw err;
        }
        // Small backoff before retry
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  })();

  if (method === 'GET') {
    inFlightGetRequests.set(url, fetchPromise);
    fetchPromise.finally(() => inFlightGetRequests.delete(url));
  }

  return fetchPromise;
}

/**
 * Downloads a file (e.g. CSV or report) using an authenticated Bearer fetch and Blob object URL.
 * Never leaks token in URL parameters.
 */
async function downloadAuthed(endpoint, filename = 'download.csv') {
  try {
    const token = window.AdminAuth ? window.AdminAuth.getToken() : localStorage.getItem('kirana_token');
    let url = endpoint;
    if (!url.startsWith('http')) {
      const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      url = `${getApiBase()}${clean}`;
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      let msg = 'File download failed';
      try {
        const errJson = await res.json();
        msg = errJson.message || msg;
      } catch (_) {}
      throw new Error(`${msg} (HTTP ${res.status})`);
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(link);

    if (window.AdminToast) {
      window.AdminToast.show('✅ ' + (window.t ? window.t('export_csv') : 'Download complete'), 'success');
    }
  } catch (err) {
    if (window.AdminToast) {
      window.AdminToast.show('❌ ' + err.message, 'danger');
    } else {
      alert(`Download Error / डाऊनलोड त्रुटी: ${err.message}`);
    }
  }
}

window.AdminAPI = {
  request,
  get: (url, opts) => request(url, { ...opts, method: 'GET' }),
  post: (url, body, opts) => request(url, { ...opts, method: 'POST', body: typeof body === 'string' || body instanceof FormData ? body : JSON.stringify(body) }),
  put: (url, body, opts) => request(url, { ...opts, method: 'PUT', body: typeof body === 'string' || body instanceof FormData ? body : JSON.stringify(body) }),
  patch: (url, body, opts) => request(url, { ...opts, method: 'PATCH', body: typeof body === 'string' || body instanceof FormData ? body : JSON.stringify(body) }),
  delete: (url, opts) => request(url, { ...opts, method: 'DELETE' }),
  downloadAuthed,
};

// Aliases for compatibility
window.adminFetch = (path, options) => request(path, options);
window.downloadAuthed = downloadAuthed;
