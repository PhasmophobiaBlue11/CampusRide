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
      <header class="cr-header sticky top-0 z-40 px-2 sm:px-4 py-2 sm:py-3 w-full max-w-full overflow-hidden select-none">
        <div class="max-w-6xl mx-auto flex items-center justify-between gap-1 sm:gap-3 w-full">
          <!-- Logo & Brand + Global Back Button -->
          <div class="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
            ${isNotHome ? `
              <button type="button" onclick="window.goBack()" class="h-7 sm:h-8 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1 transition cursor-pointer text-xs shadow-sm border border-slate-200 dark:border-slate-700 shrink-0" title="Go Back">
                <span class="text-xs font-black">←</span>
                <span class="font-semibold text-[10px] hidden md:inline">Back</span>
              </button>
            ` : ''}

            <a href="#/" class="flex items-center gap-1.5 sm:gap-2.5 text-inherit no-underline min-w-0 group">
              <div class="w-7 h-7 sm:w-9 sm:h-9 rounded-lg ${logoGradient} flex items-center justify-center text-white shadow-sm shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 6v6"></path><path d="M15 6v6"></path><path d="M2 12h19.6"></path>
                  <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 7.3 19.6 7 19 7H5c-.6 0-1.1.3-1.4.8L2.2 12.8c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"></path>
                  <circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle>
                </svg>
              </div>
              <div class="min-w-0">
                <div class="font-bold text-xs sm:text-base leading-tight flex items-center gap-1">
                  <span class="truncate max-w-[85px] xs:max-w-[120px] sm:max-w-none">${appName}</span>
                  <span class="text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${roleBadgeClass} shrink-0 hidden sm:inline-block">
                    ${roleBadgeText}
                  </span>
                </div>
                <p class="text-[10px] text-slate-500 dark:text-slate-400 hidden lg:block truncate">${user.display_name || user.email}</p>
              </div>
            </a>
          </div>

          <!-- Controls & Actions (Mobile APK Optimized) -->
          <div class="flex items-center gap-1 sm:gap-2 shrink-0">
            <!-- Language Picker -->
            <select id="lang-selector" class="text-[11px] sm:text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-1 sm:px-2 py-1 font-semibold outline-none cursor-pointer">
              <option value="en" ${window.i18n.lang === 'en' ? 'selected' : ''}>EN</option>
              <option value="mr" ${window.i18n.lang === 'mr' ? 'selected' : ''}>मराठी</option>
              <option value="hi" ${window.i18n.lang === 'hi' ? 'selected' : ''}>हिन्दी</option>
            </select>

            <!-- Theme Color Swatches (Desktop only) -->
            <div class="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button class="theme-swatch w-3.5 h-3.5 rounded-full bg-blue-600 ${currentTheme === 'ocean' ? 'ring-2 ring-offset-1 ring-blue-500' : ''}" data-theme="ocean" title="Ocean"></button>
              <button class="theme-swatch w-3.5 h-3.5 rounded-full bg-orange-500 ${currentTheme === 'sunset' ? 'ring-2 ring-offset-1 ring-orange-400' : ''}" data-theme="sunset" title="Sunset"></button>
              <button class="theme-swatch w-3.5 h-3.5 rounded-full bg-emerald-600 ${currentTheme === 'forest' ? 'ring-2 ring-offset-1 ring-emerald-400' : ''}" data-theme="forest" title="Forest"></button>
              <button class="theme-swatch w-3.5 h-3.5 rounded-full bg-purple-600 ${currentTheme === 'grape' ? 'ring-2 ring-offset-1 ring-purple-400' : ''}" data-theme="grape" title="Grape"></button>
            </div>

            <!-- Dark Mode Toggle -->
            <button id="dark-toggle-btn" class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-xs transition cursor-pointer shrink-0" title="Toggle Theme">
              ${isDark ? '☀️' : '🌙'}
            </button>

            <!-- Safety Ride Alerts Bell -->
            <button id="alerts-bell-btn" class="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-xs transition cursor-pointer shrink-0" title="Safety Alerts">
              🔔
              <span id="alerts-unread-badge" class="hidden absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                0
              </span>
            </button>

            <!-- Emergency Phone Directory CTA (Drivers & Parents Only) -->
            ${(isDriver || isParent) ? `
              <button id="header-emergency-btn" class="cr-btn cr-btn-destructive h-7 sm:h-8 px-2 sm:px-2.5 text-[11px] flex items-center justify-center gap-1 cursor-pointer shrink-0 shadow-sm" title="Emergency SOS Contacts">
                <span>🚨</span><span class="font-bold">SOS</span>
              </button>
            ` : ''}

            <!-- Logout -->
            <button id="logout-btn" class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-slate-600 dark:text-slate-400 hover:text-rose-600 flex items-center justify-center text-xs transition cursor-pointer shrink-0" title="Log Out">
              🚪
            </button>
          </div>
        </div>
      </header>
    `;
  }

  static attachEvents(user) {
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

    // Emergency Call SOS Drawer (Drivers and Parents only)
    const emergencyBtn = document.getElementById('header-emergency-btn');
    if (emergencyBtn) {
      emergencyBtn.onclick = () => HeaderComponent.openEmergencyModal(user);
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        const currentRole = localStorage.getItem('campusride_app_role');
        window.api.logout();
        if (currentRole) {
          window.location.hash = `#/${currentRole}`;
        } else {
          window.location.hash = '#/launchpad';
        }
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

  static async openEmergencyModal(user) {
    let modal = document.getElementById('emergency-modal');
    if (modal) modal.remove();

    let contacts = { gateStaff: [], assignedParents: [], assignedDriver: null, userRole: '' };
    try {
      contacts = await window.api.request('/api/emergency-contacts');
    } catch (err) {
      console.warn('[SOS Modal] Error loading emergency contacts:', err.message);
    }

    const isDriver = contacts.userRole === 'driver' || Boolean(user && user.driverProfile);
    const gateStaff = contacts.gateStaff || [];
    const assignedParents = contacts.assignedParents || [];
    const assignedDriver = contacts.assignedDriver;

    modal = document.createElement('div');
    modal.id = 'emergency-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';
    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in-up">
        <!-- Emergency Header -->
        <div class="p-4 bg-rose-600 text-white flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="text-2xl animate-pulse">🚨</span>
            <div>
              <h3 class="font-bold text-base leading-tight">Emergency Assistance SOS</h3>
              <p class="text-xs text-rose-100 mt-0.5">
                ${isDriver ? 'Call Gate Staff or Student Parents' : 'Call Van Driver or Gate Staff'}
              </p>
            </div>
          </div>
          <button id="close-emergency-modal-btn" class="p-1 rounded-lg hover:bg-rose-700 text-white text-lg font-bold cursor-pointer select-none">✕</button>
        </div>

        <div class="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          ${isDriver ? `
            <!-- DRIVER SOS: 1. All Gate Staff (choose any), 2. Parents of dropped children -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>🏢</span> <span>Gate Security & Staff (${gateStaff.length})</span>
                </h4>
                <span class="text-[10px] text-slate-400">Choose staff to call</span>
              </div>
              <div class="space-y-2">
                ${gateStaff.length === 0 ? `
                  <div class="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-center">
                    No gate staff numbers recorded.
                  </div>
                ` : gateStaff.map(s => `
                  <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <div class="font-bold text-slate-900 dark:text-white text-sm">${s.full_name}</div>
                      <div class="text-[11px] text-slate-500">${s.role || 'Gate Security'}</div>
                    </div>
                    <a href="tel:${s.phone}" class="cr-btn bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 px-3 text-xs font-bold flex items-center gap-1">
                      <span>📞</span> <span>Call (${s.phone})</span>
                    </a>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>👨‍👩‍👧</span> <span>Parents of Children You Drop (${assignedParents.length})</span>
                </h4>
                <span class="text-[10px] text-slate-400">Choose parent to call</span>
              </div>
              <div class="space-y-2">
                ${assignedParents.length === 0 ? `
                  <div class="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-center">
                    No student parents currently linked to your van route.
                  </div>
                ` : assignedParents.map(p => `
                  <div class="p-3 rounded-xl border border-indigo-200 dark:border-indigo-950/60 flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/20">
                    <div>
                      <div class="font-bold text-slate-900 dark:text-white text-sm">${p.parent_name}</div>
                      <div class="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Child: <b>${p.child_name}</b></div>
                    </div>
                    <a href="tel:${p.parent_phone}" class="cr-btn bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 px-3 text-xs font-bold flex items-center gap-1">
                      <span>📞</span> <span>Call (${p.parent_phone})</span>
                    </a>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : `
            <!-- PARENT SOS: 1. Assigned Van Driver, 2. All Gate Staff (choose any) -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>🚌</span> <span>Your Assigned Van Driver</span>
                </h4>
                <span class="text-[10px] text-slate-400">Direct vehicle line</span>
              </div>
              ${assignedDriver ? `
                <div class="p-3.5 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
                  <div>
                    <div class="font-bold text-slate-900 dark:text-white text-sm">${assignedDriver.driver_name}</div>
                    <div class="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                      ${assignedDriver.label} • Plate: ${assignedDriver.van_no}
                    </div>
                  </div>
                  <a href="tel:${assignedDriver.phone}" class="cr-btn bg-amber-500 hover:bg-amber-400 text-white py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                    <span>📞</span> <span>Call Driver (${assignedDriver.phone})</span>
                  </a>
                </div>
              ` : `
                <div class="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-center">
                  No van driver currently assigned to your child.
                </div>
              `}
            </div>

            <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>🏢</span> <span>Gate Security & Staff (${gateStaff.length})</span>
                </h4>
                <span class="text-[10px] text-slate-400">Choose staff to call</span>
              </div>
              <div class="space-y-2">
                ${gateStaff.length === 0 ? `
                  <div class="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-center">
                    No gate staff numbers recorded.
                  </div>
                ` : gateStaff.map(s => `
                  <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <div class="font-bold text-slate-900 dark:text-white text-sm">${s.full_name}</div>
                      <div class="text-[11px] text-slate-500">${s.role || 'Gate Staff'}</div>
                    </div>
                    <a href="tel:${s.phone}" class="cr-btn bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 px-3 text-xs font-bold flex items-center gap-1">
                      <span>📞</span> <span>Call (${s.phone})</span>
                    </a>
                  </div>
                `).join('')}
              </div>
            </div>
          `}
        </div>

        <div class="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <button id="dismiss-emergency-modal-btn" class="cr-btn cr-btn-secondary text-xs py-1.5 px-4 cursor-pointer">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    const close = () => modal.remove();
    const closeBtn = modal.querySelector('#close-emergency-modal-btn');
    const dismissBtn = modal.querySelector('#dismiss-emergency-modal-btn');
    if (closeBtn) closeBtn.onclick = close;
    if (dismissBtn) dismissBtn.onclick = close;
  }
}

window.HeaderComponent = HeaderComponent;
