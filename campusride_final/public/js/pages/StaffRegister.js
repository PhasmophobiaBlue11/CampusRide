// CampusRide — Staff Registration Page (§7.1, §8.1)
// Staff register -> Email OTP verification -> status: pending -> awaits admin approval
class StaffRegisterPage {
  static isEmailVerified = false;
  static verifiedEmail = '';

  static render() {
    StaffRegisterPage.isEmailVerified = false;
    StaffRegisterPage.verifiedEmail = '';

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
            <span class="text-3xl">🛂</span>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white mt-2">Gate Staff Onboarding</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Verify your email and complete staff details for administrator approval.
            </p>
          </div>

          <!-- 1-Click Google Verification (No OTP Needed!) -->
          <div class="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-200 dark:border-blue-900/50 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>⚡</span> Continue with Google
              </span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                No OTP Needed
              </span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Select your Google account from your device to verify instantly and skip OTP codes.
            </p>
            <div id="staff-google-slot">
              ${window.GoogleAuth ? window.GoogleAuth.renderButton('Continue with Google (No OTP)', 'staff-google-btn') : ''}
            </div>
          </div>

          <div class="relative my-4">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
            <div class="relative flex justify-center text-[10px] uppercase"><span class="bg-white dark:bg-slate-900 px-2 text-slate-400 font-semibold tracking-wider">Or register manually</span></div>
          </div>

          <form id="staff-reg-form" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name (First and Last)</label>
              <input type="text" id="staff-name" required class="cr-input" placeholder="e.g. Anand Shinde" />
            </div>

            <!-- Email with OTP verification -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                <span id="staff-email-badge" class="hidden text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                  ✓ Verified
                </span>
              </div>
              <div class="flex gap-2">
                <input type="email" id="staff-email" required class="cr-input flex-1" placeholder="e.g. yourname@gmail.com" />
                <button type="button" id="staff-send-otp-btn" class="cr-btn cr-btn-secondary px-3 py-2 text-xs font-bold whitespace-nowrap">
                  Send OTP
                </button>
              </div>
            </div>

            <!-- OTP Input Box (initially hidden) -->
            <div id="staff-otp-container" class="hidden p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-blue-900 dark:text-blue-300">Enter 6-Digit Email OTP:</span>
                <span class="text-[11px] text-blue-600 dark:text-blue-400">Check your Gmail inbox</span>
              </div>
              <div class="flex gap-2">
                <input type="text" id="staff-otp-input" maxlength="6" class="cr-input text-center tracking-widest font-mono font-bold text-base flex-1" placeholder="123456" autocomplete="off" />
                <button type="button" id="staff-verify-otp-btn" class="cr-btn cr-btn-primary px-4 py-2 text-xs font-bold whitespace-nowrap">
                  Verify Code
                </button>
              </div>
              <p id="staff-otp-msg" class="text-[11px] text-slate-600 dark:text-slate-300 font-medium"></p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number (10 Digits)</label>
              <input type="tel" id="staff-phone" required class="cr-input" placeholder="9876543210" pattern="[0-9]{10}" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password (Min 6 chars)</label>
              <div class="relative flex items-center">
                <input type="password" id="staff-pass" required minlength="6" class="cr-input pr-11" placeholder="••••••••" />
                <button type="button" id="toggle-staff-pass" class="absolute right-2.5 p-1 text-base text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none" title="Toggle password visibility">
                  👁️
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
              <div class="relative flex items-center">
                <input type="password" id="staff-pass-confirm" required minlength="6" class="cr-input pr-11" placeholder="••••••••" />
                <button type="button" id="toggle-staff-pass-confirm" class="absolute right-2.5 p-1 text-base text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none" title="Toggle password visibility">
                  👁️
                </button>
              </div>
            </div>

            <button type="submit" id="staff-reg-btn" class="cr-btn cr-btn-primary w-full py-2.5 mt-2">
              Submit Request for Approval
            </button>
          </form>

          <div class="mt-4 text-center text-xs text-slate-500">
            Already have an account? <a href="#/login" class="text-blue-600 font-semibold hover:underline">Sign In</a>
          </div>
        </div>
      </div>
    `;
  }

  static attachEvents() {
    // Password toggles (permanently visible)
    const setupToggle = (btnId, inputId) => {
      const btn = document.getElementById(btnId);
      const input = document.getElementById(inputId);
      if (btn && input) {
        btn.onclick = () => {
          const isPass = input.type === 'password';
          input.type = isPass ? 'text' : 'password';
          btn.textContent = isPass ? '🙈' : '👁️';
        };
      }
    };
    setupToggle('toggle-staff-pass', 'staff-pass');
    setupToggle('toggle-staff-pass-confirm', 'staff-pass-confirm');

    // 1-Click Google Verification (Real Redirect & Chooser)
    const googleBtn = document.getElementById('staff-google-btn');
    const applyGoogleVerified = (acc) => {
      emailVerified = true;
      const emailInput = document.getElementById('staff-email');
      const emailBadge = document.getElementById('staff-email-badge');
      const sendOtpBtn = document.getElementById('staff-send-otp-btn');
      const otpContainer = document.getElementById('staff-otp-container');
      const nameInput = document.getElementById('staff-name');

      if (emailInput) {
        emailInput.value = acc.email;
        emailInput.readOnly = true;
        emailInput.classList.add('bg-emerald-50/50', 'dark:bg-emerald-950/20', 'border-emerald-400');
      }
      if (nameInput && !nameInput.value && acc.name) {
        nameInput.value = acc.name;
      }
      if (emailBadge) {
        emailBadge.classList.remove('hidden');
        emailBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300';
        emailBadge.textContent = '✓ Google Verified (No OTP)';
      }
      if (sendOtpBtn) sendOtpBtn.classList.add('hidden');
      if (otpContainer) otpContainer.classList.add('hidden');

      window.showToast(`Google account verified (${acc.email})! No OTP needed.`, 'success');
    };

    if (googleBtn && window.GoogleAuth) {
      googleBtn.onclick = () => {
        window.GoogleAuth.startGoogleFlow('staff', applyGoogleVerified);
      };
    }

    // Check if redirected back from accounts.google.com
    if (window.GoogleAuth) {
      const urlState = window.GoogleAuth.checkUrlState();
      if (urlState) {
        if (urlState.verified) {
          applyGoogleVerified(urlState);
        } else if (urlState.error) {
          const slot = document.getElementById('staff-google-slot');
          if (slot) {
            const isAdm = urlState.error === 'admin_exists';
            const isDup = urlState.error === 'already_exists';
            const msg = isAdm
              ? `<b>⚠️ Administrator Account Detected:</b><br/>The Google account <b>${urlState.email}</b> is registered as Master Administrator. Please sign in via the Admin Console.`
              : isDup
              ? `<b>⚠️ Account Already Exists:</b><br/>An account with <b>${urlState.email}</b> already exists. Please <a href="#/login" class="underline font-bold">Sign In</a> instead.`
              : `<b>⚠️ Google Sign-In:</b> Could not verify Google account. Please try again or enter details manually.`;
            
            const errDiv = document.createElement('div');
            errDiv.className = 'mb-2 p-3 rounded-xl border text-xs leading-relaxed ' + (isAdm ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-200' : 'bg-red-50 dark:bg-red-950/40 border-red-300 text-red-900 dark:text-red-200');
            errDiv.innerHTML = msg;
            slot.prepend(errDiv);
          }
        }
      }
    }

    // OTP Send & Verify
    const sendOtpBtn = document.getElementById('staff-send-otp-btn');
    const emailInput = document.getElementById('staff-email');
    const otpContainer = document.getElementById('staff-otp-container');
    const otpInput = document.getElementById('staff-otp-input');
    const otpMsg = document.getElementById('staff-otp-msg');
    const verifyOtpBtn = document.getElementById('staff-verify-otp-btn');
    const emailBadge = document.getElementById('staff-email-badge');

    if (sendOtpBtn) {
      sendOtpBtn.onclick = async () => {
        const email = emailInput.value.trim().toLowerCase();
        const GMAIL_REGEX = /^(?!.*\.\.)[a-z0-9][a-z0-9._%+-]{2,34}@(gmail|googlemail)\.com$/i;
        if (!email || !GMAIL_REGEX.test(email)) {
          return window.showToast('Please enter a valid Gmail address ending in @gmail.com (e.g. yourname@gmail.com). Typos like @gm.com are not accepted.', 'error');
        }

        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = 'Sending...';

        try {
          const res = await window.api.request('/api/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({ email })
          });

          otpContainer.classList.remove('hidden');
          otpMsg.innerHTML = `
            <div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs leading-relaxed">
              <div class="font-bold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                <span>✓</span> Verification Code Sent!
              </div>
              <div class="mt-1">
                A 6-digit verification code has been dispatched to <b>${email}</b>.
              </div>
              <div class="mt-1 text-[11px] text-emerald-800 dark:text-emerald-300">
                Please open your Gmail (check inbox & spam folder) and enter the code below:
              </div>
            </div>
          `;
          window.showToast(`Verification code sent to ${email}! Check your Gmail inbox.`, 'success');
          otpInput.value = '';
          otpInput.focus();
        } catch (err) {
          window.showToast(err.message, 'error');
        } finally {
          sendOtpBtn.disabled = false;
          sendOtpBtn.textContent = 'Resend OTP';
        }
      };
    }

    if (verifyOtpBtn) {
      verifyOtpBtn.onclick = async () => {
        const email = emailInput.value.trim();
        const otp = otpInput.value.trim();
        if (!otp || otp.length !== 6) {
          return window.showToast('Please enter the 6-digit verification code', 'error');
        }

        verifyOtpBtn.disabled = true;
        verifyOtpBtn.textContent = 'Verifying...';

        try {
          await window.api.request('/api/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ email, otp })
          });

          StaffRegisterPage.isEmailVerified = true;
          StaffRegisterPage.verifiedEmail = email;

          emailInput.readOnly = true;
          emailInput.classList.add('bg-emerald-50', 'dark:bg-emerald-950/20', 'border-emerald-500');
          emailBadge.classList.remove('hidden');
          otpContainer.classList.add('hidden');
          sendOtpBtn.classList.add('hidden');

          window.showToast('Email verified successfully! You may now submit your registration.', 'success');
        } catch (err) {
          window.showToast(err.message, 'error');
          verifyOtpBtn.disabled = false;
          verifyOtpBtn.textContent = 'Verify Code';
        }
      };
    }

    // Form submission
    const form = document.getElementById('staff-reg-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('staff-name').value.trim();
        const email = emailInput.value.trim();
        const phone = document.getElementById('staff-phone').value.trim();
        const pass = document.getElementById('staff-pass').value;
        const confirm = document.getElementById('staff-pass-confirm').value;

        if (!StaffRegisterPage.isEmailVerified || StaffRegisterPage.verifiedEmail.toLowerCase() !== email.toLowerCase()) {
          return window.showToast('Please verify your email address with the OTP code first', 'error');
        }

        if (pass !== confirm) {
          return window.showToast('Passwords do not match', 'error');
        }

        const btn = document.getElementById('staff-reg-btn');
        btn.disabled = true;
        btn.textContent = 'Submitting...';

        try {
          const res = await window.api.request('/api/auth/register-staff', {
            method: 'POST',
            body: JSON.stringify({ fullName, email, phone, password: pass })
          });
          window.api.setToken(res.token);
          window.showToast('Request submitted! Awaiting administrator approval.', 'success');
          window.location.hash = '#/';
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Submit Request for Approval';
        }
      };
    }
  }
}

window.StaffRegisterPage = StaffRegisterPage;
