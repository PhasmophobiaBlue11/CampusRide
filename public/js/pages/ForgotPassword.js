// CampusRide — Password Recovery Page (§7.1, §17.3)
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
              Enter your registered email address to receive password reset instructions.
            </p>
          </div>

          <form id="forgot-form" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input type="email" id="forgot-email" required class="cr-input" placeholder="e.g. staff@campusride.edu" />
            </div>

            <button type="submit" id="forgot-submit-btn" class="cr-btn cr-btn-primary w-full py-2.5">
              Send Reset Instructions
            </button>
          </form>

          <div class="mt-4 text-center text-xs text-slate-500">
            Remember your credentials? <a href="#/login" class="text-blue-600 font-semibold hover:underline">Return to Login</a>
          </div>
        </div>
      </div>
    `;
  }

  static attachEvents() {
    const form = document.getElementById('forgot-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value.trim();
        const btn = document.getElementById('forgot-submit-btn');
        btn.disabled = true;
        btn.textContent = 'Processing...';

        try {
          await window.api.request('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
          });
          window.showToast('Reset email dispatched. Please check your inbox.', 'success');
          setTimeout(() => {
            window.location.hash = '#/login';
          }, 1500);
        } catch (err) {
          window.showToast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Send Reset Instructions';
        }
      };
    }
  }
}

window.ForgotPasswordPage = ForgotPasswordPage;
