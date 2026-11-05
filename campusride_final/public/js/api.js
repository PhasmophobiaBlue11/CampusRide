// CampusRide — Client API & Real-time Event System
const API_BASE = window.location.origin;

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('campusride_token') || null;
    this.user = null;
    this.sse = null;
    this.listeners = new Map();
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('campusride_token', token);
      this.connectSSE();
    } else {
      localStorage.removeItem('campusride_token');
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
        throw new Error(data && data.error ? data.error : `Request failed with status ${res.status}`);
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
  async login(email, password) {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(res.token);
    this.user = res.user;
    return res.user;
  }

  async fetchMe() {
    if (!this.token) return null;
    try {
      const res = await this.request('/api/auth/me');
      this.user = res.user;
      return res.user;
    } catch {
      this.setToken(null);
      this.user = null;
      return null;
    }
  }

  logout() {
    this.setToken(null);
    this.user = null;
    window.location.hash = '#/login';
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
