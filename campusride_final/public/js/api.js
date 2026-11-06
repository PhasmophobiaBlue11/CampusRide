// CampusRide — Client API & Real-time Event System
const API_BASE = window.location.origin;

class ApiClient {
  constructor() {
    this.token = this.getToken();
    this.user = null;
    this.sse = null;
    this.listeners = new Map();
  }

  getTokenKey() {
    // 1. Role-locked HTML wrapper (driver.html, parent.html, staff.html, admin.html)
    if (window.CAMPUSRIDE_LOCKED_ROLE) {
      return `campusride_${window.CAMPUSRIDE_LOCKED_ROLE}_token`;
    }
    // 2. URL Path / Hash check
    const p = (window.location.pathname + window.location.hash).toLowerCase();
    if (p.includes('/driver')) return 'campusride_driver_token';
    if (p.includes('/parent')) return 'campusride_parent_token';
    if (p.includes('/staff')) return 'campusride_staff_token';
    if (p.includes('/admin')) return 'campusride_admin_token';

    // 3. Stored app role
    const r = localStorage.getItem('campusride_app_role');
    if (r && ['driver', 'parent', 'staff', 'admin'].includes(r)) {
      return `campusride_${r}_token`;
    }

    return 'campusride_token';
  }

  getToken() {
    const key = this.getTokenKey();
    return localStorage.getItem(key) || null;
  }

  setToken(token) {
    const key = this.getTokenKey();
    this.token = token;
    if (token) {
      localStorage.setItem(key, token);
      this.connectSSE();
    } else {
      localStorage.removeItem(key);
      if (this.sse) {
        this.sse.close();
        this.sse = null;
      }
    }
  }

  async request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
      });

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const err = new Error(data && data.error ? data.error : `Request failed with status ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return data;
    } catch (err) {
      console.warn(`[API] Error on ${path}:`, err.message);
      throw err;
    }
  }

  // Connect to Server-Sent Events for real-time live map & alerts
  connectSSE() {
    if (this.sse) return;
    try {
      const url = `${API_BASE}/api/events?token=${this.token || ''}`;
      this.sse = new EventSource(url);

      this.sse.addEventListener('message', (e) => {
        try {
          const event = JSON.parse(e.data);
          this.emit(event.type, event.payload);
          window.dispatchEvent(new CustomEvent('campusride_event', { detail: event }));
        } catch (err) {
          console.error('[SSE] Parse error:', err);
        }
      });

      this.sse.onerror = () => {
        // Automatically reconnects
      };
    } catch (e) {
      console.warn('[SSE] EventSource unavailable:', e);
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event).delete(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const cb of this.listeners.get(event)) {
        try { cb(data); } catch (e) { console.error(e); }
      }
    }
  }

  // Auth methods
  async login(username, password, required_role) {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, email: username, password, required_role })
    });
    if (required_role) {
      localStorage.setItem(`campusride_${required_role}_token`, res.token);
      localStorage.setItem('campusride_app_role', required_role);
    }
    this.setToken(res.token);
    this.user = res.user;
    return res.user;
  }

  async fetchMe() {
    this.token = this.getToken();
    if (!this.token) return null;
    try {
      const res = await this.request('/api/auth/me');
      this.user = res.user;
      return res.user;
    } catch (err) {
      // Only clear token if server explicitly rejected it with 401 Unauthorized
      // NEVER clear on network failure, 502/503/504 Render cold starts, or timeout
      if (err && err.status === 401) {
        console.warn('[Auth] Session invalidated by server.');
        this.setToken(null);
        this.user = null;
        return null;
      }
      console.warn('[Auth] Server is warming up or connection pending. Retaining session token.');
      return null;
    }
  }

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch {}
    const key = this.getTokenKey();
    localStorage.removeItem(key);
    this.setToken(null);
    this.user = null;
    window.location.hash = '#/';
    window.location.reload();
  }
}

window.api = new ApiClient();

// Toast helper
window.showToast = function(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
  toast.innerHTML = `
    <span style="font-weight: bold; font-size: 1.1rem;">${icon}</span>
    <div style="flex: 1; font-size: 0.9rem; line-height: 1.4;">${message}</div>
  `;

  container.appendChild(toast);

  // Audio cue
  if (window.sounds) {
    if (type === 'success') window.sounds.playSuccess();
    else if (type === 'error') window.sounds.playError();
  }

  // Vibration for alert / error
  if (type === 'error' || type === 'warning') {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  }

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};
