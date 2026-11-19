// CampusRide — Password Recovery Page (§7.15)
// Phone Number + Username + New Password Verification (Works for Every Role)
class ForgotPasswordPage {
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
    const returnUrl = ForgotPasswordPage.getReturnRoute();

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
            <span class="text-3xl">🔑</span>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white mt-2">Reset Password</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Enter your registered phone number, account username, and choose your new password.
            </p>
          </div>

          <form id="forgot-form" class="space-y-4" autocomplete="off">
            <!-- 1. Phone Number (no.) -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Registered Phone Number</label>
              <input type="tel" id="forgot-phone" required class="cr-input" placeholder="10-digit mobile number (e.g. 7030951190)" pattern="[0-9]{10}" autocomplete="off" autocorrect="off" spellcheck="false" data-lpignore="true" />
            </div>

            <!-- 2. Username -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Username</label>
              <input type="text" id="forgot-username" required class="cr-input" placeholder="Enter your username" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" />
            </div>

            <!-- 3. New Password -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Set New Password</label>
              <div class="relative flex items-center">
                <input type="password" id="forgot-password" required minlength="4" class="cr-input pr-11" placeholder="Enter at least 4 characters" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" />
                <button type="button" id="toggle-forgot-password" class="absolute right-2.5 p-1 text-base text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none" title="Toggle password visibility">
                  👁️
                </button>
              </div>
            </div>

            <button type="submit" id="forgot-submit-btn" class="cr-btn cr-btn-primary w-full py-2.5 font-bold shadow-md cursor-pointer">
              Update Password & Sign In
            </button>
          </form>

          <div class="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-2 text-xs text-slate-500">
            <div>
              Forgot your username instead? 
              <a href="#/forgot-username${roleParam ? '?role=' + roleParam : ''}" class="text-blue-600 dark:text-blue-400 font-bold hover:underline">Recover Username →</a>
            </div>
            <div>
              Remember your password? 
              <a href="${returnUrl}" class="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Return to Login</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static attachEvents() {
    const toggleBtn = document.getElementById('toggle-forgot-password');
    const passInput = document.getElementById('forgot-password');
    if (toggleBtn && passInput) {
      toggleBtn.onclick = () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        toggleBtn.textContent = isPass ? '🙈' : '👁️';
      };
    }

    const form = document.getElementById('forgot-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const phone = document.getElementById('forgot-phone').value.trim();
        const username = document.getElementById('forgot-username').value.trim();
        const newPassword = document.getElementById('forgot-password').value;
        const btn = document.getElementById('forgot-submit-btn');

        btn.disabled = true;
        btn.textContent = 'Updating Password...';

        try {
          const res = await window.api.request('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ phone, username, newPassword })
          });

          window.showToast(res.message || 'Password updated successfully! Please sign in with your new password.', 'success');
          const returnUrl = ForgotPasswordPage.getReturnRoute();
          setTimeout(() => {
            window.location.hash = returnUrl;
            window.location.reload();
          }, 1300);
        } catch (err) {
          window.showToast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Update Password & Sign In';
        }
      };
    }
  }
}

window.ForgotPasswordPage = ForgotPasswordPage;
