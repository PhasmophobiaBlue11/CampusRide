// CampusRide — Username Recovery Page (§7.16)
// Phone Number + Password Verification -> Set New Username (Works for Every Role)
class ForgotUsernamePage {
  static getReturnRoute() {
    const roleParam = new URLSearchParams(window.location.hash.split('?')[1] || '').get('role') || localStorage.getItem('campusride_app_role') || '';
    if (roleParam === 'driver') return '#/driver';
    if (roleParam === 'parent') return '#/parent';
    if (roleParam === 'staff') return '#/staff';
    if (roleParam === 'admin') return '#/admin';
    return '#/';
  }

  static render() {
    const roleParam = new URLSearchParams(window.location.hash.split('?')[1] || '').get('role') || localStorage.getItem('campusride_app_role') || '';
    const returnUrl = ForgotUsernamePage.getReturnRoute();

    return `
      <div class="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div class="cr-card w-full max-w-md p-6 sm:p-8 animate-fade-in-up">
          <!-- Back Button -->
          <div class="mb-4">
            <button type="button" onclick="window.location.hash='${returnUrl}'" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
              <span class="text-base font-black">←</span> <span>Back</span>
            </button>
          </div>

          <div class="text-center mb-6">
            <span class="text-3xl">👤</span>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white mt-2">Recover Username</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Enter your registered phone number, account password, and choose your new username.
            </p>
          </div>

          <form id="forgot-username-form" class="space-y-4" autocomplete="off">
            <!-- 1. Phone Number (no.) -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Registered Phone Number</label>
              <input type="tel" id="forgot-user-phone" required class="cr-input" placeholder="10-digit mobile number (e.g. 7030951190)" pattern="[0-9]{10}" autocomplete="off" autocorrect="off" spellcheck="false" data-lpignore="true" />
            </div>

            <!-- 2. Password (passoword) -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Your Account Password</label>
              <div class="relative flex items-center">
                <input type="password" id="forgot-user-password" required class="cr-input pr-11" placeholder="Enter your account password" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" />
                <button type="button" id="toggle-forgot-user-password" class="absolute right-2.5 p-1 text-base text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none" title="Toggle password visibility">
                  👁️
                </button>
              </div>
            </div>

            <!-- 3. New Username (new username) -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Set New Username</label>
              <input type="text" id="forgot-user-newusername" required minlength="3" class="cr-input" placeholder="Enter new username (e.g. MyUser2026)" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" />
            </div>

            <button type="submit" id="forgot-user-submit-btn" class="cr-btn cr-btn-primary w-full py-2.5 font-bold shadow-md cursor-pointer">
              Update Username & Sign In
            </button>
          </form>

          <div class="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-2 text-xs text-slate-500">
            <div>
              Forgot your password instead? 
              <a href="#/forgot-password${roleParam ? '?role=' + roleParam : ''}" class="text-blue-600 dark:text-blue-400 font-bold hover:underline">Reset Password →</a>
            </div>
            <div>
              Remember your username? 
              <a href="${returnUrl}" class="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Return to Login</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static attachEvents() {
    const toggleBtn = document.getElementById('toggle-forgot-user-password');
    const passInput = document.getElementById('forgot-user-password');
    if (toggleBtn && passInput) {
      toggleBtn.onclick = () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        toggleBtn.textContent = isPass ? '🙈' : '👁️';
      };
    }

    const form = document.getElementById('forgot-username-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const phone = document.getElementById('forgot-user-phone').value.trim();
        const password = document.getElementById('forgot-user-password').value;
        const newUsername = document.getElementById('forgot-user-newusername').value.trim();
        const btn = document.getElementById('forgot-user-submit-btn');

        btn.disabled = true;
        btn.textContent = 'Updating Username...';

        try {
          const res = await window.api.request('/api/auth/forgot-username', {
            method: 'POST',
            body: JSON.stringify({ phone, password, newUsername })
          });

          window.showToast(res.message || 'Username updated successfully!', 'success');
          const returnUrl = ForgotUsernamePage.getReturnRoute();
          setTimeout(() => {
            window.location.hash = returnUrl;
            window.location.reload();
          }, 1400);
        } catch (err) {
          window.showToast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Update Username & Sign In';
        }
      };
    }
  }
}

window.ForgotUsernamePage = ForgotUsernamePage;
