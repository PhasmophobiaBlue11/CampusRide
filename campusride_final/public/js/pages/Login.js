// CampusRide — Dedicated Isolated App Logins (§7.1)
// Completely separate portals with ZERO role-switch tabs or cross-role confusion.
// - Driver App: #/driver or /driver
// - Parent App: #/parent or /parent
// - Gate Staff App: #/staff or /staff
// - Admin Portal: #/admin or /admin

class LoginPage {
  static render(role = 'staff') {
    const isDriver = role === 'driver';
    const isParent = role === 'parent';
    const isAdmin = role === 'admin';
    const isStaff = !isDriver && !isParent && !isAdmin;

    const portalTitle = isDriver ? 'CampusRide Driver App' :
                        isParent ? 'CampusRide Parent App' :
                        isAdmin ? 'CampusRide Admin Suite' :
                        'CampusRide Gate & Staff Desk';

    const portalDesc = isDriver ? 'Van Driver Console & Live GPS Journey Broadcasting' :
                       isParent ? 'Real-Time Van Radar, Student Tracking & Safety SOS' :
                       isAdmin ? 'Master Administrator Transit Console' :
                       'Campus Security, Pass Scanning & Daily Log Desk';

    const portalIcon = isDriver ? '🚌' :
                       isParent ? '👨‍👩‍👧' :
                       isAdmin ? '🛡️' : '🛂';

    const portalAccent = isDriver ? 'from-amber-500 to-orange-600' :
                         isParent ? 'from-indigo-600 to-purple-600' :
                         isAdmin ? 'from-purple-700 to-indigo-700' :
                         'from-blue-700 to-indigo-600';

    const btnClass = isDriver ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/25' :
                     isParent ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25' :
                     isAdmin ? 'bg-purple-700 hover:bg-purple-600 text-white shadow-purple-500/25' :
                     'cr-btn-primary shadow-blue-500/25';

    const usernamePlaceholder = isDriver ? 'e.g. Driver Ramesh' :
                                isParent ? 'e.g. ParentXYZ' :
                                isAdmin ? 'Admin2026' :
                                'e.g. StaffSharma';

    const savedUsername = isAdmin ? 'Admin2026' : (localStorage.getItem(`campusride_device_${role}_username`) || '');

    const registrationCta = isDriver ? `
      <div class="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs">
        <span class="text-slate-600 dark:text-slate-400">New campus van driver?</span>
        <a href="#/register-driver" class="font-bold text-amber-700 dark:text-amber-400 hover:underline block mt-1">
          Register Vehicle & Driver Pass →
        </a>
      </div>
    ` : isParent ? `
      <div class="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900/50 text-xs">
        <span class="text-slate-600 dark:text-slate-400">New student parent?</span>
        <a href="#/register-parent" class="font-bold text-indigo-700 dark:text-indigo-400 hover:underline block mt-1">
          Create Parent Tracking Account →
        </a>
      </div>
    ` : isStaff ? `
      <div class="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50 text-xs">
        <span class="text-slate-600 dark:text-slate-400">New gate security staff?</span>
        <a href="#/register-staff" class="font-bold text-blue-700 dark:text-blue-400 hover:underline block mt-1">
          Submit Staff Registration Request →
        </a>
      </div>
    ` : '';

    return `
      <div class="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div class="cr-card w-full max-w-md p-6 sm:p-8 animate-fade-in-up">
          
          <!-- App Brand Header (NO Role Tabs) -->
          <div class="text-center mb-6">
            <div class="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr ${portalAccent} flex items-center justify-center text-white shadow-xl text-3xl">
              ${portalIcon}
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">${portalTitle}</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">${portalDesc}</p>
          </div>

          <!-- Dedicated Login Form -->
          <form id="login-form" class="space-y-4">
            <input type="hidden" id="login-target-role" value="${role}" />
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Username</label>
              <input type="text" id="login-username" required class="cr-input" placeholder="${usernamePlaceholder}" value="${savedUsername}" autocomplete="username" />
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

            <button type="submit" id="login-submit-btn" class="cr-btn ${btnClass} w-full py-2.5 mt-2 font-bold cursor-pointer shadow-md transition">
              Sign In to ${isDriver ? 'Driver App' : isParent ? 'Parent App' : isAdmin ? 'Admin Console' : 'Gate Desk'}
            </button>
          </form>

          <!-- Dedicated Single Registration Option -->
          <div class="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-center space-y-3">
            ${registrationCta}
          </div>

        </div>
      </div>
    `;
  }

  static attachEvents() {
    // Password toggle
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
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const targetRole = document.getElementById('login-target-role').value;
        const btn = document.getElementById('login-submit-btn');

        btn.disabled = true;
        btn.textContent = 'Verifying...';

        try {
          const user = await window.api.login(username, password, targetRole);
          window.showToast('Signed in successfully!', 'success');
          
          // Remember role in session
          localStorage.setItem('campusride_app_role', targetRole);
          if (targetRole && targetRole !== 'admin') {
            localStorage.setItem(`campusride_device_${targetRole}_username`, username);
          }

          // Redirect to root of this app
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

// Global App Directory / Launchpad Page (§7.1)
// Shown at the main root URL if unauthenticated, displaying direct separate links to each role's distinct app
class AppLaunchpadPage {
  static render() {
    return `
      <div class="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div class="cr-card w-full max-w-xl p-6 sm:p-8 animate-fade-in-up">
          
          <!-- Launchpad Brand -->
          <div class="text-center mb-8">
            <div class="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-xl text-3xl">
              🚌
            </div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">CampusRide Network</h1>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto">
              Select your role below to launch your dedicated, isolated transportation application.
            </p>
          </div>

          <!-- Separate Dedicated App Cards -->
          <div class="space-y-3.5">
            
            <!-- 1. Driver App Card -->
            <a href="#/driver" onclick="localStorage.setItem('campusride_app_role', 'driver')" class="block p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent hover:from-amber-500/20 border border-amber-300/40 dark:border-amber-700/40 transition group cursor-pointer shadow-sm hover:shadow-md">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition">
                  🚌
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <h3 class="font-bold text-slate-900 dark:text-white text-base">Driver App</h3>
                    <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                      /driver
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Van console, journey start/end, live GPS sharing & student pickup navigation.
                  </p>
                </div>
                <div class="text-amber-600 dark:text-amber-400 font-bold text-lg group-hover:translate-x-1 transition">
                  →
                </div>
              </div>
            </a>

            <!-- 2. Parent App Card -->
            <a href="#/parent" onclick="localStorage.setItem('campusride_app_role', 'parent')" class="block p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent hover:from-indigo-500/20 border border-indigo-300/40 dark:border-indigo-700/40 transition group cursor-pointer shadow-sm hover:shadow-md">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition">
                  👨‍👩‍👧
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <h3 class="font-bold text-slate-900 dark:text-white text-base">Parent App</h3>
                    <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                      /parent
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Student radar, real-time Google Maps van tracking, pickup alerts & emergency SOS.
                  </p>
                </div>
                <div class="text-indigo-600 dark:text-indigo-400 font-bold text-lg group-hover:translate-x-1 transition">
                  →
                </div>
              </div>
            </a>

            <!-- 3. Gate Staff App Card -->
            <a href="#/staff" onclick="localStorage.setItem('campusride_app_role', 'staff')" class="block p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent hover:from-blue-500/20 border border-blue-300/40 dark:border-blue-700/40 transition group cursor-pointer shadow-sm hover:shadow-md">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition">
                  🛂
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <h3 class="font-bold text-slate-900 dark:text-white text-base">Gate Staff & Security Desk</h3>
                    <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      /staff
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Campus entry/exit gate pass scanner, vehicle pass registry & daily logs.
                  </p>
                </div>
                <div class="text-blue-600 dark:text-blue-400 font-bold text-lg group-hover:translate-x-1 transition">
                  →
                </div>
              </div>
            </a>

          </div>

          <!-- Footer Admin Access Link -->
          <div class="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Direct access for administrators:</span>
            <a href="#/admin" onclick="localStorage.setItem('campusride_app_role', 'admin')" class="font-bold text-purple-600 dark:text-purple-400 hover:underline">
              Master Admin Portal (/admin) →
            </a>
          </div>

        </div>
      </div>
    `;
  }

  static attachEvents() {}
}

window.LoginPage = LoginPage;
window.AppLaunchpadPage = AppLaunchpadPage;
