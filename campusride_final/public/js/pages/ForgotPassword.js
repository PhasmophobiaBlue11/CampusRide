// CampusRide — Password Recovery Page
// Username + Registered Phone Number Verification (Zero Email / OTP needed)
class ForgotPasswordPage {
  static render() {
    return `
      <div class="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div class="cr-card w-full max-w-md p-6 sm:p-8 animate-fade-in-up">
          <!-- Back Button -->
          <div class="mb-4">
            <button type="button" onclick="window.goBack()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
              <span class="text-base font-black">←</span> <span>Back</span>
            </button>
          </div>

          <div class="text-center mb-6">
            <span class="text-3xl">🔑</span>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white mt-2">Reset Password</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Verify your username and registered phone number to set a new password instantly.
            </p>
          </div>

          <form id="forgot-form" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Your Account Username</label>
              <input type="text" id="forgot-username" required class="cr-input" placeholder="e.g. your username" autocomplete="username" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Registered Mobile Phone Number</label>
              <input type="tel" id="forgot-phone" required class="cr-input" placeholder="10-digit mobile number" pattern="[0-9]{10}" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Set New Password</label>
              <div class="relative flex items-center">
                <input type="password" id="forgot-password" required minlength="6" class="cr-input pr-11" placeholder="At least 6 characters" autocomplete="new-password" />
                <button type="button" id="toggle-forgot-password" class="absolute right-2.5 p-1 text-base text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none">
                  👁️
                </button>
              </div>
            </div>

            <button type="submit" id="forgot-submit-btn" class="cr-btn cr-btn-primary w-full py-2.5 font-bold shadow-md cursor-pointer">
              Set New Password & Sign In
            </button>
          </form>

          <div class="mt-4 text-center text-xs text-slate-500">
            Remember your password? <a href="#/" class="text-blue-600 font-semibold hover:underline">Return to Login</a>
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
        const username = document.getElementById('forgot-username').value.trim();
        const phone = document.getElementById('forgot-phone').value.trim();
        const newPassword = document.getElementById('forgot-password').value;
        const btn = document.getElementById('forgot-submit-btn');

        btn.disabled = true;
        btn.textContent = 'Updating Password...';

        try {
          await window.api.request('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ username, phone, newPassword })
          });

          window.showToast('Password updated successfully! Please sign in with your new password.', 'success');
          setTimeout(() => {
            window.location.hash = '#/';
            window.location.reload();
          }, 1200);
        } catch (err) {
          window.showToast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Set New Password & Sign In';
        }
      };
    }
  }
}

window.ForgotPasswordPage = ForgotPasswordPage;
