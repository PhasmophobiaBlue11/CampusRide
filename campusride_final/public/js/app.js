// CampusRide — Single Page Application (SPA) Master Controller & Router
(function() {
  // Initialize Theme from localStorage
  const savedTheme = localStorage.getItem('campusride-theme') || 'ocean';
  const savedDark = localStorage.getItem('campusride-dark') === 'true';

  document.documentElement.setAttribute('data-theme', savedTheme);
  if (savedDark) {
    document.documentElement.classList.add('dark');
  }

  // PWA install prompt handler
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
  });

  const appEl = document.getElementById('app');

  async function route() {
    const hash = window.location.hash.slice(1) || '/';
    const path = hash.split('?')[0];

    // Public Routes
    if (path === '/login') {
      appEl.innerHTML = window.LoginPage.render();
      window.LoginPage.attachEvents();
      return;
    }
    if (path === '/register-staff') {
      appEl.innerHTML = window.StaffRegisterPage.render();
      window.StaffRegisterPage.attachEvents();
      return;
    }
    if (path === '/register-driver') {
      appEl.innerHTML = window.DriverRegisterPage.render();
      window.DriverRegisterPage.attachEvents();
      return;
    }
    if (path === '/register-parent') {
      appEl.innerHTML = window.ParentRegisterPage.render();
      window.ParentRegisterPage.attachEvents();
      return;
    }
    if (path === '/forgot-password') {
      appEl.innerHTML = window.ForgotPasswordPage.render();
      window.ForgotPasswordPage.attachEvents();
      return;
    }

    // Protected Routes: Require User Auth
    const user = await window.api.fetchMe();
    if (!user) {
      window.location.hash = '#/login';
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
      if (user.role === 'admin') {
        pageHtml = await window.AdminDashboardPage.render(user);
        attachCallback = () => window.AdminDashboardPage.attachEvents(user);
      } else if (user.driverProfile) {
        pageHtml = await window.DriverHomePage.render(user);
        attachCallback = () => window.DriverHomePage.attachEvents(user);
      } else if (user.parentProfile) {
        pageHtml = await window.ParentHomePage.render(user);
        attachCallback = () => window.ParentHomePage.attachEvents(user);
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
      pageHtml = await window.LiveMapPage.render(user);
      attachCallback = () => window.LiveMapPage.attachEvents(user);
    } else if (path === '/directories') {
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

    // Render Shell with Header, Page Content, and Mobile Bottom Navigation
    appEl.innerHTML = `
      ${window.HeaderComponent.render(user)}
      <main class="pb-24 sm:pb-12">
        ${pageHtml}
      </main>

      <!-- Mobile Bottom Navigation Bar (Thumb Friendly) -->
      <nav class="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-around text-[10px] font-semibold text-slate-500">
        <a href="#/" class="flex flex-col items-center gap-1 ${path === '/' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}">
          <span class="text-lg">🏠</span>
          <span>Home</span>
        </a>
        <a href="#/entry-exit-scanner" class="flex flex-col items-center gap-1 ${path === '/entry-exit-scanner' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}">
          <span class="text-lg">📷</span>
          <span>Scan</span>
        </a>
        <a href="#/live-map" class="flex flex-col items-center gap-1 ${path === '/live-map' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}">
          <span class="text-lg">🗺️</span>
          <span>Map</span>
        </a>
        <a href="#/directories" class="flex flex-col items-center gap-1 ${path === '/directories' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}">
          <span class="text-lg">👥</span>
          <span>Contacts</span>
        </a>
        <a href="#/settings" class="flex flex-col items-center gap-1 ${path === '/settings' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}">
          <span class="text-lg">⚙️</span>
          <span>Settings</span>
        </a>
      </nav>
    `;

    window.HeaderComponent.attachEvents(user);
    if (attachCallback) attachCallback();
    if (window.i18n) window.i18n.translateDOM();
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('load', () => {
    window.LanguageGate.check();
    route();
  });
  window.addEventListener('campusride_lang_change', () => {
    if (window.i18n) window.i18n.translateDOM();
  });
})();
