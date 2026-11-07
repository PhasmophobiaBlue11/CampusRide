// CampusRide — Single Page Application (SPA) Master Controller & Router
(function() {
  // Initialize Theme from localStorage
  const savedTheme = localStorage.getItem('campusride-theme') || 'ocean';
  const savedDark = localStorage.getItem('campusride-dark') === 'true';

  document.documentElement.setAttribute('data-theme', savedTheme);
  if (savedDark) {
    document.documentElement.classList.add('dark');
  }

  // Purge legacy device keys set erroneously during login in previous versions
  try {
    localStorage.removeItem('campusride_device_parent_username');
    localStorage.removeItem('campusride_device_driver_username');
    localStorage.removeItem('campusride_device_staff_username');
  } catch {}

  const appEl = document.getElementById('app');

  function detectAppRole() {
    // 0. Hard lock from dedicated HTML wrapper (driver.html, parent.html, staff.html, admin.html)
    if (window.CAMPUSRIDE_LOCKED_ROLE) return window.CAMPUSRIDE_LOCKED_ROLE;

    const host = window.location.hostname.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    // 1. Subdomain / Hostname: supports driver.*, campusride-driver.*, *.driver, xyz.parent, etc.
    if (host.startsWith('driver.') || host.includes('-driver') || host.endsWith('.driver') || host.includes('.driver.')) return 'driver';
    if (host.startsWith('parent.') || host.includes('-parent') || host.endsWith('.parent') || host.includes('.parent.')) return 'parent';
    if (host.startsWith('staff.') || host.includes('-staff') || host.endsWith('.staff') || host.includes('.staff.')) return 'staff';
    if (host.startsWith('admin.') || host.includes('-admin') || host.endsWith('.admin') || host.includes('.admin.')) return 'admin';

    // 2. Pathname: /driver, /parent, /staff, /admin
    if (pathname === '/driver' || pathname.startsWith('/driver/') || pathname === '/driver.html') return 'driver';
    if (pathname === '/parent' || pathname.startsWith('/parent/') || pathname === '/parent.html') return 'parent';
    if (pathname === '/staff' || pathname.startsWith('/staff/') || pathname === '/staff.html') return 'staff';
    if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/admin.html') return 'admin';

    // 3. Hash: #/driver, #/parent, #/staff, #/admin
    if (hash === '#/driver' || hash.startsWith('#/driver')) return 'driver';
    if (hash === '#/parent' || hash.startsWith('#/parent')) return 'parent';
    if (hash === '#/staff' || hash.startsWith('#/staff')) return 'staff';
    if (hash === '#/admin' || hash.startsWith('#/admin')) return 'admin';

    // 4. Stored role in localStorage from previous session
    const saved = localStorage.getItem('campusride_app_role');
    if (saved && ['driver', 'parent', 'staff', 'admin'].includes(saved)) {
      return saved;
    }

    return null;
  }

  async function route() {
    try {
      const hash = window.location.hash.slice(1) || '/';
    const path = hash.split('?')[0];
    const activeApp = detectAppRole();

    // Dedicated Registration Routes
    if (path === '/register-driver') {
      localStorage.setItem('campusride_app_role', 'driver');
      appEl.innerHTML = window.DriverRegisterPage.render();
      window.DriverRegisterPage.attachEvents();
      if (window.i18n) window.i18n.translateDOM();
      return;
    }
    if (path === '/register-parent') {
      localStorage.setItem('campusride_app_role', 'parent');
      appEl.innerHTML = window.ParentRegisterPage.render();
      window.ParentRegisterPage.attachEvents();
      if (window.i18n) window.i18n.translateDOM();
      return;
    }
    if (path === '/register-staff') {
      localStorage.setItem('campusride_app_role', 'staff');
      appEl.innerHTML = window.StaffRegisterPage.render();
      window.StaffRegisterPage.attachEvents();
      if (window.i18n) window.i18n.translateDOM();
      return;
    }
    if (path === '/forgot-password') {
      appEl.innerHTML = window.ForgotPasswordPage.render();
      window.ForgotPasswordPage.attachEvents();
      if (window.i18n) window.i18n.translateDOM();
      return;
    }

    // Launchpad Directory Route
    if (path === '/launchpad') {
      localStorage.removeItem('campusride_app_role');
      appEl.innerHTML = window.AppLaunchpadPage.render();
      window.AppLaunchpadPage.attachEvents();
      if (window.i18n) window.i18n.translateDOM();
      return;
    }

    // Check Authentication with Warmup Resilience
    let user = null;
    const token = window.api.getToken();
    if (token) {
      user = await window.api.fetchMe();
      // If token still exists but user is null, server is cold booting (Render free tier wake-up)
      if (!user && window.api.getToken()) {
        const warmupGradient = activeApp === 'driver' ? 'from-amber-500 to-orange-600 shadow-amber-500/25' :
                               activeApp === 'parent' ? 'from-indigo-600 to-purple-600 shadow-indigo-500/25' :
                               activeApp === 'admin' ? 'from-purple-700 to-indigo-700 shadow-purple-500/25' :
                               'from-blue-700 to-indigo-600 shadow-blue-500/25';
        const warmupTitle = activeApp === 'driver' ? 'Connecting to Driver Console...' :
                            activeApp === 'parent' ? 'Connecting to Parent Portal...' :
                            activeApp === 'admin' ? 'Connecting to Admin Suite...' :
                            'Connecting to Campus Gate Operations...';
        const warmupLogo = activeApp === 'driver' ? `
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="15" rx="3"></rect><line x1="3" y1="10" x2="21" y2="10"></line>
            <circle cx="7.5" cy="19" r="2"></circle><circle cx="16.5" cy="19" r="2"></circle>
          </svg>
        ` : activeApp === 'parent' ? `
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        ` : activeApp === 'admin' ? `
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path>
          </svg>
        ` : `
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path>
          </svg>
        `;

        appEl.innerHTML = `
          <div class="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr ${warmupGradient} flex items-center justify-center text-white shadow-xl animate-pulse">
              ${warmupLogo}
            </div>
            <div class="space-y-1">
              <h3 class="font-bold text-slate-900 dark:text-white text-base">${warmupTitle}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Restoring your transit session. Please hold on...</p>
            </div>
            <div class="w-36 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-blue-600 rounded-full animate-pulse"></div>
            </div>
          </div>
        `;
        setTimeout(route, 2000);
        return;
      }
    }

    // If Unauthenticated: Render ONLY that app's dedicated login (NO tabs)
    if (!user) {
      if (activeApp) {
        localStorage.setItem('campusride_app_role', activeApp);
        appEl.innerHTML = window.LoginPage.render(activeApp);
        window.LoginPage.attachEvents();
        if (window.i18n) window.i18n.translateDOM();
        return;
      }

      // Root without specific role displays the App Directory Launchpad
      appEl.innerHTML = window.AppLaunchpadPage.render();
      window.AppLaunchpadPage.attachEvents();
      if (window.i18n) window.i18n.translateDOM();
      return;
    }

    // Determine actual role of authenticated user
    const userRole = user.role === 'admin' ? 'admin' :
                     user.driverProfile ? 'driver' :
                     user.parentProfile ? 'parent' : 'staff';

    // STRICT APP ROLE MISMATCH GUARD:
    // If user is currently in a dedicated app (e.g. Driver App) but logged into a different role (e.g. Admin, Parent, Staff):
    // Disconnect that cross-role session and show the dedicated login for this app!
    if (activeApp && activeApp !== userRole) {
      window.api.setToken(null);
      localStorage.setItem('campusride_app_role', activeApp);
      appEl.innerHTML = window.LoginPage.render(activeApp);
      window.LoginPage.attachEvents();
      if (window.i18n) window.i18n.translateDOM();
      return;
    }

    // Set active app role in storage to match the user's logged-in identity
    localStorage.setItem('campusride_app_role', userRole);

    const isDriver = userRole === 'driver';
    const isParent = userRole === 'parent';
    const isAdmin = userRole === 'admin';
    const isStaff = userRole === 'staff';

    // Strict Role-Based Routing & App Isolation Guards
    // 1. Driver App Isolation: Only console & settings allowed
    if (isDriver) {
      if (path !== '/' && path !== '' && path !== '/settings') {
        window.location.hash = '#/';
        return;
      }
    }

    // 2. Parent App Isolation: Only child tracking & settings allowed
    if (isParent) {
      if (path !== '/' && path !== '' && path !== '/settings') {
        window.location.hash = '#/';
        return;
      }
    }

    // 3. Gate Staff Isolation: Cannot access master admin suite
    if (isStaff && path === '/admin') {
      window.location.hash = '#/';
      return;
    }

    // Pending Staff Gate Screen (§2, §4.1)
    if (user.role !== 'admin' && !user.driverProfile && !user.parentProfile && user.staffStatus !== 'approved') {
      appEl.innerHTML = `
        ${window.HeaderComponent.render(user)}
        <div class="min-h-[80vh] flex items-center justify-center p-4">
          <div class="cr-card max-w-md p-8 text-center animate-fade-in-up space-y-4">
            <div class="w-16 h-16 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center text-3xl">
              ⏳
            </div>
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">Awaiting Administrator Approval</h2>
            <p class="text-xs text-slate-500 leading-relaxed">
              Your staff registration request for <b>${user.display_name || user.email}</b> is currently under review by the Campus Transit Admin.
            </p>
            <div class="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300">
              Status: <span class="cr-badge cr-badge-pending text-[10px]">${user.staffStatus.toUpperCase()}</span>
            </div>
          </div>
        </div>
      `;
      window.HeaderComponent.attachEvents();
      return;
    }

    // Determine Main Dashboard based on Role (§4.1)
    let pageHtml = '';
    let attachCallback = null;

    if (path === '/' || path === '') {
      if (activeApp === 'driver' || user.driverProfile) {
        pageHtml = await window.DriverHomePage.render(user);
        attachCallback = () => window.DriverHomePage.attachEvents(user);
      } else if (activeApp === 'parent' || user.parentProfile) {
        pageHtml = await window.ParentHomePage.render(user);
        attachCallback = () => window.ParentHomePage.attachEvents(user);
      } else if (user.role === 'admin' && (activeApp === 'admin' || !activeApp)) {
        pageHtml = await window.AdminDashboardPage.render(user);
        attachCallback = () => window.AdminDashboardPage.attachEvents(user);
      } else {
        pageHtml = await window.StaffHomePage.render(user);
        attachCallback = () => window.StaffHomePage.attachEvents(user);
      }
    } else if (path === '/admin') {
      if (user.role !== 'admin') {
        window.location.hash = '#/';
        return;
      }
      pageHtml = await window.AdminDashboardPage.render(user);
      attachCallback = () => window.AdminDashboardPage.attachEvents(user);
    } else if (path === '/entry-exit-scanner') {
      pageHtml = window.EntryExitScannerPage.render(user);
      attachCallback = () => window.EntryExitScannerPage.attachEvents(user);
    } else if (path === '/registration-scanner') {
      pageHtml = window.RegistrationScannerPage.render(user);
      attachCallback = () => window.RegistrationScannerPage.attachEvents(user);
    } else if (path === '/van-register') {
      pageHtml = await window.VanRegisterPage.render(user);
      attachCallback = () => window.VanRegisterPage.attachEvents(user);
    } else if (path === '/drivers') {
      pageHtml = await window.DriversRegistryPage.render(user);
      attachCallback = () => window.DriversRegistryPage.attachEvents(user);
    } else if (path === '/live-map') {
      window.location.hash = '#/';
      return;
    } else if (path === '/working-staff') {
      pageHtml = await window.WorkingStaffPage.render(user);
      attachCallback = () => window.WorkingStaffPage.attachEvents(user);
    } else if (path === '/directories' || path === '/parents') {
      pageHtml = await window.DirectoriesPage.render(user);
      attachCallback = () => window.DirectoriesPage.attachEvents(user);
    } else if (path === '/settings') {
      pageHtml = await window.SettingsPage.render(user);
      attachCallback = () => window.SettingsPage.attachEvents(user);
    } else {
      pageHtml = `
        <div class="min-h-[70vh] flex items-center justify-center p-4">
          <div class="cr-card p-8 text-center max-w-sm">
            <span class="text-4xl">🔍</span>
            <h2 class="text-xl font-bold mt-2">Page Not Found</h2>
            <p class="text-xs text-slate-400 mt-1">The requested screen does not exist.</p>
            <a href="#/" class="cr-btn cr-btn-primary text-xs py-2 px-4 mt-4 inline-block">Return Home</a>
          </div>
        </div>
      `;
    }

    // Build Role-Specific Mobile Bottom Navigation Bar (§7.1)
    let bottomNavHtml = '';

    if (isDriver) {
      // 🚌 Driver App Navigation: Console, Settings
      bottomNavHtml = `
        <nav class="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-8 py-2.5 flex items-center justify-around text-[11px] font-bold text-slate-500 shadow-lg">
          <a href="#/" class="flex flex-col items-center gap-1 ${path === '/' || path === '' ? 'text-amber-600 dark:text-amber-400' : 'hover:text-slate-900 dark:hover:text-white'}">
            <span class="text-xl">🚌</span>
            <span>Driver Console</span>
          </a>
          <a href="#/settings" class="flex flex-col items-center gap-1 ${path === '/settings' ? 'text-amber-600 dark:text-amber-400' : 'hover:text-slate-900 dark:hover:text-white'}">
            <span class="text-xl">⚙️</span>
            <span>Settings</span>
          </a>
        </nav>
      `;
    } else if (isParent) {
      // 👨‍👩‍👧 Parent App Navigation: Live Van Radar, Settings (Helpline removed as per requirement)
      bottomNavHtml = `
        <nav class="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-10 py-2.5 flex items-center justify-around text-[11px] font-bold text-slate-500 shadow-lg">
          <a href="#/" class="flex flex-col items-center gap-1 ${path === '/' || path === '' ? 'text-indigo-600 dark:text-indigo-400' : 'hover:text-slate-900 dark:hover:text-white'}">
            <span class="text-xl">👨‍👩‍👧</span>
            <span>Van Radar</span>
          </a>
          <a href="#/settings" class="flex flex-col items-center gap-1 ${path === '/settings' ? 'text-indigo-600 dark:text-indigo-400' : 'hover:text-slate-900 dark:hover:text-white'}">
            <span class="text-xl">⚙️</span>
            <span>Settings</span>
          </a>
        </nav>
      `;
    } else if (isAdmin) {
      // 🛡️ Admin Suite Navigation
      bottomNavHtml = `
        <nav class="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex items-center justify-around text-[10px] font-bold text-slate-500 shadow-lg">
          <a href="#/" class="flex flex-col items-center gap-1 ${path === '/' || path === '' || path === '/admin' ? 'text-purple-600 dark:text-purple-400' : 'hover:text-slate-900 dark:hover:text-white'}">
            <span class="text-lg">🛡️</span>
            <span>Admin</span>
          </a>
          <a href="#/entry-exit-scanner" class="flex flex-col items-center gap-1 ${path === '/entry-exit-scanner' ? 'text-purple-600 dark:text-purple-400' : 'hover:text-slate-900 dark:hover:text-white'}">
            <span class="text-lg">📷</span>
            <span>Gate Scan</span>
          </a>
          <a href="#/drivers" class="flex flex-col items-center gap-1 ${path === '/drivers' ? 'text-purple-600 dark:text-purple-400' : 'hover:text-slate-900 dark:hover:text-white'}">
            <span class="text-lg">🚌</span>
            <span>Drivers</span>
          </a>
          <a href="#/parents" class="flex flex-col items-center gap-1 ${path === '/directories' || path === '/parents' ? 'text-purple-600 dark:text-purple-400' : 'hover:text-slate-900 dark:hover:text-white'}">
            <span class="text-lg">👨‍👩‍👧</span>
            <span>Parents</span>
          </a>
          <a href="#/settings" class="flex flex-col items-center gap-1 ${path === '/settings' ? 'text-purple-600 dark:text-purple-400' : 'hover:text-slate-900 dark:hover:text-white'}">
            <span class="text-lg">⚙️</span>
            <span>Settings</span>
          </a>
        </nav>
      `;
    } else {
      // 🏢 Gate Staff Navigation (Dedicated Options for Drivers & Parents)
      bottomNavHtml = `
        <nav class="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex items-center justify-around text-[10px] font-bold text-slate-500 shadow-lg">
          <a href="#/" class="flex flex-col items-center gap-1 ${path === '/' || path === '' ? 'text-blue-600 dark:text-blue-400' : 'hover:text-slate-900 dark:hover:text-white'}">
            <span class="text-lg">🏢</span>
            <span>Gate Desk</span>
          </a>
          <a href="#/entry-exit-scanner" class="flex flex-col items-center gap-1 ${path === '/entry-exit-scanner' ? 'text-blue-600 dark:text-blue-400' : 'hover:text-slate-900 dark:hover:text-white'}">
            <span class="text-lg">📷</span>
            <span>Scan Pass</span>
          </a>
          <a href="#/directories" class="flex flex-col items-center gap-1 ${path === '/directories' || path === '/parents' || path === '/drivers' ? 'text-blue-600 dark:text-blue-400' : 'hover:text-slate-900 dark:hover:text-white'}">
            <span class="text-lg">👥</span>
            <span>Accounts</span>
          </a>
          <a href="#/settings" class="flex flex-col items-center gap-1 ${path === '/settings' ? 'text-blue-600 dark:text-blue-400' : 'hover:text-slate-900 dark:hover:text-white'}">
            <span class="text-lg">⚙️</span>
            <span>Settings</span>
          </a>
        </nav>
      `;
    }

    // Render Shell with Header, Page Content, and Role Mobile Bottom Navigation
    appEl.innerHTML = `
      ${window.HeaderComponent.render(user)}
      <main class="pb-24 sm:pb-12">
        ${pageHtml}
      </main>
      ${bottomNavHtml}
    `;

    window.HeaderComponent.attachEvents(user);
    if (attachCallback) attachCallback();
    if (window.i18n) window.i18n.translateDOM();
  } catch (err) {
    console.error('[CampusRide Routing Error]:', err);
    const activeApp = detectAppRole();
    if (window.LoginPage) {
      appEl.innerHTML = window.LoginPage.render(activeApp || 'staff');
      window.LoginPage.attachEvents();
    }
  }
}

  function initApp() {
    if (window.LanguageGate) window.LanguageGate.check();
    route();
  }

  window.addEventListener('hashchange', route);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  window.addEventListener('campusride_lang_change', () => {
    if (window.i18n) window.i18n.translateDOM();
  });
})();
