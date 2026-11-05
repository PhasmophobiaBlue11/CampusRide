// CampusRide — Responsive Sticky Header & Global Controls
class HeaderComponent {
  static render(user) {
    const isDriver = Boolean(user.driverProfile && user.role !== 'admin');
    const isParent = Boolean(user.parentProfile && user.role !== 'admin');
    const isAdmin = user.role === 'admin';
    const isStaff = !isDriver && !isParent && !isAdmin;

    const appName = isDriver ? 'CampusRide Driver' :
                    isParent ? 'CampusRide Parent' :
                    isAdmin ? 'CampusRide Admin' : 'CampusRide Gate';

    const roleBadgeText = isAdmin ? '🛡️ Master Admin' :
                          isDriver ? '🚌 Van Driver' :
                          isParent ? '👨‍👩‍👧 Parent' :
                          user.staffStatus === 'approved' ? '🛂 Gate Security' : '⏳ Pending Staff';

    const roleBadgeClass = isAdmin ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800' :
                           isDriver ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800' :
                           isParent ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800' :
                           'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800';

    const logoGradient = isDriver ? 'bg-gradient-to-tr from-amber-500 to-orange-600 shadow-amber-500/20' :
                         isParent ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-indigo-500/20' :
                         isAdmin ? 'bg-gradient-to-tr from-purple-700 to-indigo-700 shadow-purple-500/20' :
                         'bg-gradient-to-tr from-blue-700 to-indigo-600 shadow-blue-500/20';

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'ocean';
    const isDark = document.documentElement.classList.contains('dark');
    const hash = window.location.hash || '';
    const isNotHome = Boolean(hash && hash !== '#/' && hash !== '#' && hash !== '#/login');

    return `
      <header class="cr-header sticky top-0 z-40 px-4 py-3">
        <div class="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <!-- Logo & Brand + Global Back Button -->
          <div class="flex items-center gap-2.5">
            ${isNotHome ? `
              <button type="button" onclick="window.goBack()" class="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1.5 transition cursor-pointer text-xs shadow-sm border border-slate-200 dark:border-slate-700 select-none" title="Go Back">
                <span class="text-sm font-black">←</span>
                <span class="font-semibold text-[11px]">Back</span>
              </button>
            ` : ''}

            <a href="#/" class="flex items-center gap-2.5 text-inherit no-underline group">
              <div class="w-10 h-10 rounded-xl ${logoGradient} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 6v6"></path><path d="M15 6v6"></path><path d="M2 12h19.6"></path>
                  <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 7.3 19.6 7 19 7H5c-.6 0-1.1.3-1.4.8L2.2 12.8c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"></path>
                  <circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle>
                </svg>
              </div>
              <div>
                <div class="font-bold text-lg leading-tight flex items-center gap-1.5">
                  <span>${appName}</span>
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleBadgeClass}">
                    ${roleBadgeText}
                  </span>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">${user.display_name || user.email}</p>
              </div>
            </a>
          </div>

          <!-- Controls & Actions -->
          <div class="flex items-center gap-2">
            <!-- Language Picker -->
            <select id="lang-selector" class="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 font-medium outline-none cursor-pointer">
              <option value="en" ${window.i18n.lang === 'en' ? 'selected' : ''}>🇬🇧 EN</option>
              <option value="mr" ${window.i18n.lang === 'mr' ? 'selected' : ''}>🇮🇳 मराठी</option>
              <option value="hi" ${window.i18n.lang === 'hi' ? 'selected' : ''}>🇮🇳 हिन्दी</option>
            </select>

            <!-- Theme Color Swatches -->
            <div class="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button class="theme-swatch w-4 h-4 rounded-full bg-blue-600 ${currentTheme === 'ocean' ? 'ring-2 ring-offset-1 ring-blue-500' : ''}" data-theme="ocean" title="Ocean"></button>
              <button class="theme-swatch w-4 h-4 rounded-full bg-orange-500 ${currentTheme === 'sunset' ? 'ring-2 ring-offset-1 ring-orange-400' : ''}" data-theme="sunset" title="Sunset"></button>
              <button class="theme-swatch w-4 h-4 rounded-full bg-emerald-600 ${currentTheme === 'forest' ? 'ring-2 ring-offset-1 ring-emerald-400' : ''}" data-theme="forest" title="Forest"></button>
              <button class="theme-swatch w-4 h-4 rounded-full bg-purple-600 ${currentTheme === 'grape' ? 'ring-2 ring-offset-1 ring-purple-400' : ''}" data-theme="grape" title="Grape"></button>
            </div>

            <!-- Dark Mode Toggle -->
            <button id="dark-toggle-btn" class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="Toggle Theme">
              ${isDark ? '☀️' : '🌙'}
            </button>

            <!-- Safety Ride Alerts Bell (§7.11) -->
            <button id="alerts-bell-btn" class="relative p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="Safety Alerts">
              🔔
              <span id="alerts-unread-badge" class="hidden absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                0
              </span>
            </button>

            <!-- Emergency Phone Directory CTA (§7.12) -->
            <button id="header-emergency-btn" class="cr-btn cr-btn-destructive py-1.5 px-3 text-xs" title="Emergency Contacts">
              🚨 <span class="hidden sm:inline">SOS</span>
            </button>

            <!-- Logout -->
            <button id="logout-btn" class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-slate-600 dark:text-slate-400 hover:text-rose-600 transition" title="Log Out">
              🚪
            </button>
          </div>
        </div>
      </header>
    `;
  }

  static attachEvents() {
    // Language Selector
    const langSelect = document.getElementById('lang-selector');
    if (langSelect) {
      langSelect.onchange = (e) => {
        window.i18n.setLanguage(e.target.value);
        window.location.reload();
      };
    }

    // Theme Swatches
    document.querySelectorAll('.theme-swatch').forEach(btn => {
      btn.onclick = () => {
        const t = btn.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('campusride-theme', t);
        document.querySelectorAll('.theme-swatch').forEach(b => b.classList.remove('ring-2'));
        btn.classList.add('ring-2');
      };
    });

    // Dark Mode Toggle
    const darkBtn = document.getElementById('dark-toggle-btn');
    if (darkBtn) {
      darkBtn.onclick = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('campusride-dark', isDark ? 'true' : 'false');
        darkBtn.textContent = isDark ? '☀️' : '🌙';
      };
    }

    // Alerts Bell Modal
    const alertsBtn = document.getElementById('alerts-bell-btn');
    if (alertsBtn) {
      alertsBtn.onclick = () => HeaderComponent.openAlertsModal();
    }

    // Emergency Call SOS Drawer
    const emergencyBtn = document.getElementById('header-emergency-btn');
    if (emergencyBtn) {
      emergencyBtn.onclick = () => HeaderComponent.openEmergencyModal();
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        window.api.logout();
        window.location.reload();
      };
    }

    // Check alerts badge
    HeaderComponent.refreshAlertsBadge();
  }

  static async refreshAlertsBadge() {
    try {
      const data = await window.api.request('/api/alerts');
      const unread = (data.alerts || []).filter(a => !a.read).length;
      const badge = document.getElementById('alerts-unread-badge');
      if (badge) {
        if (unread > 0) {
          badge.textContent = unread;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
    } catch {}
  }

  static async openAlertsModal() {
    let modal = document.getElementById('alerts-modal');
    if (modal) modal.remove();

    let alerts = [];
    try {
      const res = await window.api.request('/api/alerts');
      alerts = res.alerts || [];
    } catch {}

    modal = document.createElement('div');
    modal.id = 'alerts-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';
    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xl">⚠️</span>
            <h3 class="font-bold text-base text-slate-900 dark:text-white">Transit Safety Alerts</h3>
          </div>
          <button id="close-alerts-modal-btn" class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">✕</button>
        </div>

        <div class="p-4 overflow-y-auto space-y-3 flex-1">
          ${alerts.length === 0 ? `
            <div class="text-center py-8 text-slate-500">
              <div class="text-4xl mb-2">🛡️</div>
              <p class="font-medium text-sm">All Clear!</p>
              <p class="text-xs text-slate-400">No active vehicle safety or entry delay alerts.</p>
            </div>
          ` : alerts.map(a => `
            <div class="p-3 rounded-xl border border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
              <div class="flex items-center justify-between text-xs font-bold mb-1">
                <span>${a.van_label} • ${a.driver_name || 'Driver'}</span>
                <span class="text-[10px] text-amber-700 dark:text-amber-400">${new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p class="text-xs leading-relaxed">${a.message}</p>
            </div>
          `).join('')}
        </div>

        <div class="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
          <button id="mark-all-alerts-read-btn" class="cr-btn cr-btn-secondary text-xs py-1.5 px-3">Mark All Read</button>
          <button id="run-safety-check-btn" class="cr-btn cr-btn-primary text-xs py-1.5 px-3">Check Journeys</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-alerts-modal-btn').onclick = () => modal.remove();

    modal.querySelector('#mark-all-alerts-read-btn').onclick = async () => {
      await window.api.request('/api/alerts/mark-read', { method: 'POST' });
      HeaderComponent.refreshAlertsBadge();
      modal.remove();
      window.showToast('All alerts marked as read', 'info');
    };

    modal.querySelector('#run-safety-check-btn').onclick = async () => {
      await window.api.request('/api/alerts');
      window.showToast('Safety net audit evaluated.', 'success');
      HeaderComponent.openAlertsModal();
    };
  }

  static async openEmergencyModal() {
    let staff = [];
    let drivers = [];
    try {
      const [sRes, dRes] = await Promise.all([
        window.api.request('/api/directories/staff'),
        window.api.request('/api/drivers')
      ]);
      staff = sRes.staff || [];
      drivers = dRes.drivers || [];
    } catch {}

    const modal = document.createElement('div');
    modal.id = 'emergency-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';
    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div class="p-4 bg-rose-600 text-white flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🚨</span>
            <div>
              <h3 class="font-bold text-base">Campus Emergency Contacts</h3>
              <p class="text-xs text-rose-100">Tap to call drivers and gate security instantly</p>
            </div>
          </div>
          <button id="close-emergency-modal-btn" class="text-white hover:text-rose-200 text-lg">✕</button>
        </div>

        <div class="p-4 overflow-y-auto space-y-4 flex-1">
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Campus Security & Gate Staff</h4>
            <div class="space-y-2">
              ${staff.map(s => `
                <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                  <div>
                    <div class="font-bold text-sm text-slate-800 dark:text-slate-100">${s.full_name}</div>
                    <div class="text-xs text-slate-500">${s.notes || 'Campus Gate Officer'}</div>
                  </div>
                  <a href="tel:${s.phone}" class="cr-btn cr-btn-primary py-1 px-3 text-xs bg-emerald-600 hover:bg-emerald-500">
                    📞 ${s.phone}
                  </a>
                </div>
              `).join('')}
            </div>
          </div>

          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Transit Drivers</h4>
            <div class="space-y-2">
              ${drivers.map(d => `
                <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                  <div>
                    <div class="font-bold text-sm text-slate-800 dark:text-slate-100">${d.label} • ${d.driver_name}</div>
                    <div class="text-xs text-slate-500">${d.van_no}</div>
                  </div>
                  <a href="tel:${d.phone}" class="cr-btn cr-btn-secondary py-1 px-3 text-xs">
                    📞 ${d.phone || 'Call'}
                  </a>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-emergency-modal-btn').onclick = () => modal.remove();
  }
}

window.HeaderComponent = HeaderComponent;
