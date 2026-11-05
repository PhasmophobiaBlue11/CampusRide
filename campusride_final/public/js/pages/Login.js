// CampusRide — Login Page (§7.1)
class LoginPage {
  static render() {
    return `
      <div class="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div class="cr-card w-full max-w-md p-6 sm:p-8 animate-fade-in-up">
          <!-- Logo & Title -->
          <div class="text-center mb-6">
            <div class="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 6v6"></path><path d="M15 6v6"></path><path d="M2 12h19.6"></path>
                <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 7.3 19.6 7 19 7H5c-.6 0-1.1.3-1.4.8L2.2 12.8c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"></path>
                <circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle>
              </svg>
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white">CampusRide</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Secure Campus Transportation Management</p>
          </div>

          <!-- Login Form -->
          <form id="login-form" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input type="email" id="login-email" required class="cr-input" placeholder="e.g. staff@campusride.edu" />
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

            <button type="submit" id="login-submit-btn" class="cr-btn cr-btn-primary w-full py-2.5 mt-2">
              Sign In
            </button>
          </form>

          <!-- Registration Links -->
          <div class="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
            <div>New to CampusRide? Choose registration:</div>
            <div class="flex items-center justify-center gap-3 font-semibold text-blue-600 dark:text-blue-400">
              <a href="#/register-staff" class="hover:underline">Gate Staff</a> •
              <a href="#/register-driver" class="hover:underline">Driver</a> •
              <a href="#/register-parent" class="hover:underline">Parent</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static attachEvents() {
    // Password visibility toggle (always visible)
    const toggleBtn = document.getElementById('toggle-login-password');
    const passInput = document.getElementById('login-password');
    if (toggleBtn && passInput) {
      toggleBtn.onclick = () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        toggleBtn.textContent = isPass ? '🙈' : '👁️';
      };
    }

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
          await window.api.login(email, password);
          window.showToast('Signed in successfully!', 'success');
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
