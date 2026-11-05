// CampusRide — Multi-App Portal Authentication (§7.1)
// Dedicated portals for: (1) Driver App, (2) Parent App, (3) Gate Staff & Admin App
class LoginPage {
  static activePortal = 'staff'; // 'driver' | 'parent' | 'staff'

  static render() {
    const hash = window.location.hash || '';
    if (hash.includes('driver')) {
      LoginPage.activePortal = 'driver';
    } else if (hash.includes('parent')) {
      LoginPage.activePortal = 'parent';
    } else if (hash.includes('staff') || hash.includes('admin')) {
      LoginPage.activePortal = 'staff';
    }

    const portal = LoginPage.activePortal;
    const isDriver = portal === 'driver';
    const isParent = portal === 'parent';
    const isStaff = portal === 'staff';

    const portalTitle = isDriver ? 'CampusRide Driver' :
                        isParent ? 'CampusRide Parent' : 'CampusRide Gate & Admin';

    const portalDesc = isDriver ? 'Van Driver Console & Live GPS Sharing' :
                       isParent ? 'Real-Time Van & Student Pickup Radar' : 'Campus Security & Fleet Operations';

    const portalIcon = isDriver ? '🚌' :
                       isParent ? '👨‍👩‍👧' : '🛂';

    return `
      <div class="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div class="cr-card w-full max-w-md p-6 sm:p-8 animate-fade-in-up">
          <!-- App Portal Selector Tabs -->
          <div class="mb-5">
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-1.5">
              Select Your Application Portal
            </div>
            <div class="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold text-center">
              <button type="button" id="portal-tab-driver" class="py-2 px-1 rounded-xl transition cursor-pointer select-none ${isDriver ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}">
                🚌 Driver App
              </button>
              <button type="button" id="portal-tab-parent" class="py-2 px-1 rounded-xl transition cursor-pointer select-none ${isParent ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}">
                👨‍👩‍👧 Parent App
              </button>
              <button type="button" id="portal-tab-staff" class="py-2 px-1 rounded-xl transition cursor-pointer select-none ${isStaff ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}">
                🛂 Gate & Admin
              </button>
            </div>
          </div>

          <!-- App Brand & Title -->
          <div class="text-center mb-6">
            <div class="w-14 h-14 mx-auto mb-3 rounded-2xl ${isDriver ? 'bg-gradient-to-tr from-amber-500 to-orange-600' : isParent ? 'bg-gradient-to-tr from-indigo-600 to-purple-600' : 'bg-gradient-to-tr from-blue-700 to-indigo-600'} flex items-center justify-center text-white shadow-xl text-3xl">
              ${portalIcon}
            </div>
            <h1 id="login-app-title" class="text-2xl font-black text-slate-900 dark:text-white">${portalTitle}</h1>
            <p id="login-app-desc" class="text-xs text-slate-500 dark:text-slate-400 mt-1">${portalDesc}</p>
          </div>

          <!-- Login Form -->
          <form id="login-form" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input type="email" id="login-email" required class="cr-input" placeholder="${isDriver ? 'driver@campusride.edu' : isParent ? 'parent@campusride.edu' : 'staff@campusride.edu'}" />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
                <a href="#/forgot-password" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">Forgot?</a>
              </div>
              <div class="relative flex items-center">
                <input type="password" id="login-password" required class="cr-input pr-11" placeholder="••••••••" />
                <button type="button" id="toggle-login-password" class="absolute right-2.5 p-1 text-base text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none" title="Toggle password visibility">
                  👁️
                </button>
              </div>
            </div>

            <button type="submit" id="login-submit-btn" class="cr-btn ${isDriver ? 'bg-amber-500 hover:bg-amber-400 text-white' : isParent ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'cr-btn-primary'} w-full py-2.5 mt-2 font-bold cursor-pointer shadow-md">
              Sign In to ${portalTitle}
            </button>
          </form>

          <!-- Dedicated Registration Link for Selected Portal -->
          <div class="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-center text-xs space-y-2">
            <div id="login-portal-cta">
              ${isDriver ? `
                <span class="text-slate-500">New driver?</span>
                <a href="#/register-driver" class="font-bold text-amber-600 dark:text-amber-400 hover:underline ml-1">Register Vehicle & Driver Pass →</a>
              ` : isParent ? `
                <span class="text-slate-500">New parent?</span>
                <a href="#/register-parent" class="font-bold text-indigo-600 dark:text-indigo-400 hover:underline ml-1">Create Parent Tracking Account →</a>
              ` : `
                <span class="text-slate-500">New gate staff?</span>
                <a href="#/register-staff" class="font-bold text-blue-600 dark:text-blue-400 hover:underline ml-1">Submit Staff Approval Request →</a>
              `}
            </div>

            <div class="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-center gap-3">
              <span>Switch Portal:</span>
              <button type="button" class="portal-switch-link text-blue-600 dark:text-blue-400 hover:underline cursor-pointer" data-portal="driver">Driver</button> •
              <button type="button" class="portal-switch-link text-blue-600 dark:text-blue-400 hover:underline cursor-pointer" data-portal="parent">Parent</button> •
              <button type="button" class="portal-switch-link text-blue-600 dark:text-blue-400 hover:underline cursor-pointer" data-portal="staff">Gate Staff / Admin</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static attachEvents() {
    // Portal tabs
    const switchPortal = (p) => {
      LoginPage.activePortal = p;
      if (p === 'driver') window.location.hash = '#/driver-login';
      else if (p === 'parent') window.location.hash = '#/parent-login';
      else window.location.hash = '#/staff-login';
    };

    const tabDriver = document.getElementById('portal-tab-driver');
    const tabParent = document.getElementById('portal-tab-parent');
    const tabStaff = document.getElementById('portal-tab-staff');

    if (tabDriver) tabDriver.onclick = () => switchPortal('driver');
    if (tabParent) tabParent.onclick = () => switchPortal('parent');
    if (tabStaff) tabStaff.onclick = () => switchPortal('staff');

    document.querySelectorAll('.portal-switch-link').forEach(btn => {
      btn.onclick = () => switchPortal(btn.getAttribute('data-portal'));
    });

    // Password visibility toggle
    const toggleBtn = document.getElementById('toggle-login-password');
    const passInput = document.getElementById('login-password');
    if (toggleBtn && passInput) {
      toggleBtn.onclick = () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        toggleBtn.textContent = isPass ? '🙈' : '👁️';
      };
    }

    // Submit handler
    const form = document.getElementById('login-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('login-submit-btn');

        btn.disabled = true;
        btn.textContent = 'Verifying...';

        try {
          const user = await window.api.login(email, password);
          window.showToast('Signed in successfully!', 'success');
          
          // Role matching validation for portal
          if (LoginPage.activePortal === 'driver' && !user.driverProfile && user.role !== 'admin') {
            window.showToast('Notice: Account logged in, routing to your registered profile.', 'info');
          } else if (LoginPage.activePortal === 'parent' && !user.parentProfile && user.role !== 'admin') {
            window.showToast('Notice: Account logged in, routing to your registered profile.', 'info');
          }

          window.location.hash = '#/';
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Sign In';
        }
      };
    }
  }
}

window.LoginPage = LoginPage;
