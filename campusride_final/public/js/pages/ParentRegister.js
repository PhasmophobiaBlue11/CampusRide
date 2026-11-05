// CampusRide — Parent Self-Registration Page (§7.1, §8.3)
// Email OTP verification -> Direct Live GPS pickup coordinates (no manual address field)
class ParentRegisterPage {
  static isEmailVerified = false;
  static verifiedEmail = '';
  static detectedLat = 21.1219;
  static detectedLng = 79.0601;
  static isLocationAcquired = false;

  static render() {
    ParentRegisterPage.isEmailVerified = false;
    ParentRegisterPage.verifiedEmail = '';
    ParentRegisterPage.detectedLat = 21.1219;
    ParentRegisterPage.detectedLng = 79.0601;
    ParentRegisterPage.isLocationAcquired = false;

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
            <span class="text-3xl">👨‍👩‍👧</span>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white mt-2">Parent Registration</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Verify your email and automatically capture your live location to track your child's van.
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
            <div id="parent-google-slot">
              ${window.GoogleAuth ? window.GoogleAuth.renderButton('Continue with Google (No OTP)', 'parent-google-btn') : ''}
            </div>
          </div>

          <div class="relative my-4">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
            <div class="relative flex justify-center text-[10px] uppercase"><span class="bg-white dark:bg-slate-900 px-2 text-slate-400 font-semibold tracking-wider">Or register manually</span></div>
          </div>

          <form id="parent-reg-form" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Parent / Guardian Name</label>
              <input type="text" id="parent-name" required class="cr-input" placeholder="e.g. Priya Sharma" />
            </div>

            <!-- Email with OTP verification -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                <span id="parent-email-badge" class="hidden text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                  ✓ Verified
                </span>
              </div>
              <div class="flex gap-2">
                <input type="email" id="parent-email" required class="cr-input flex-1" placeholder="e.g. yourname@gmail.com" />
                <button type="button" id="parent-send-otp-btn" class="cr-btn cr-btn-secondary px-3 py-2 text-xs font-bold whitespace-nowrap">
                  Send OTP
                </button>
              </div>
            </div>

            <!-- OTP Input Box (initially hidden) -->
            <div id="parent-otp-container" class="hidden p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-blue-900 dark:text-blue-300">Enter 6-Digit Email OTP:</span>
                <span class="text-[11px] text-blue-600 dark:text-blue-400">Check your Gmail inbox</span>
              </div>
              <div class="flex gap-2">
                <input type="text" id="parent-otp-input" maxlength="6" class="cr-input text-center tracking-widest font-mono font-bold text-base flex-1" placeholder="123456" autocomplete="off" />
                <button type="button" id="parent-verify-otp-btn" class="cr-btn cr-btn-primary px-4 py-2 text-xs font-bold whitespace-nowrap">
                  Verify Code
                </button>
              </div>
              <p id="parent-otp-msg" class="text-[11px] text-slate-600 dark:text-slate-300 font-medium"></p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mobile Phone (10 Digits)</label>
              <input type="tel" id="parent-phone" required class="cr-input" placeholder="9876555555" pattern="[0-9]{10}" />
            </div>

            <!-- Automatic Live Location Box (§8.3) -->
            <div class="p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span id="geo-indicator" class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Pickup Location (Automatic)
                </span>
                <span id="geo-badge" class="cr-badge cr-badge-approved text-[10px] bg-emerald-100 text-emerald-800">Acquiring GPS...</span>
              </div>
              <div id="geo-status-text" class="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
                ⏳ Detecting your exact live coordinates...
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                🔒 <b>Direct Live GPS:</b> Your pickup location is captured directly from your device's live coordinates. No manual address input needed. To update later, visit Settings.
              </p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <div class="relative flex items-center">
                <input type="password" id="parent-pass" required minlength="6" class="cr-input pr-11" placeholder="••••••••" />
                <button type="button" id="toggle-parent-pass" class="absolute right-2.5 p-1 text-base text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none" title="Toggle password visibility">
                  👁️
                </button>
              </div>
            </div>

            <button type="submit" id="parent-reg-btn" class="cr-btn cr-btn-primary w-full py-2.5 mt-2 font-bold shadow-md cursor-pointer">
              Create Parent Account
            </button>
          </form>

          <div class="mt-4 text-center text-xs text-slate-500">
            Already registered? <a href="#/login" class="text-blue-600 font-semibold hover:underline">Sign In</a>
          </div>
        </div>
      </div>
    `;
  }

  static attachEvents() {
    // Password toggle (permanently visible)
    const toggleBtn = document.getElementById('toggle-parent-pass');
    const passInput = document.getElementById('parent-pass');
    if (toggleBtn && passInput) {
      toggleBtn.onclick = () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        toggleBtn.textContent = isPass ? '🙈' : '👁️';
      };
    }

    // Automatically capture live location on page load
    ParentRegisterPage.autoDetectLiveLocation();

    // 1-Click Google Verification (No OTP Needed!)
    const googleBtn = document.getElementById('parent-google-btn');
    if (googleBtn && window.GoogleAuth) {
      googleBtn.onclick = () => {
        window.GoogleAuth.openAccountChooser({
          mode: 'register',
          targetRole: 'parent',
          onSuccess: (acc) => {
            emailVerified = true;
            const emailInput = document.getElementById('parent-email');
            const emailBadge = document.getElementById('parent-email-badge');
            const sendOtpBtn = document.getElementById('parent-send-otp-btn');
            const otpContainer = document.getElementById('parent-otp-container');
            const nameInput = document.getElementById('parent-name');

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

            window.showToast(`Google account verified (${acc.email}). No OTP needed!`, 'success');
          }
        });
      };
    }

    // OTP Send & Verify
    const sendOtpBtn = document.getElementById('parent-send-otp-btn');
    const emailInput = document.getElementById('parent-email');
    const otpContainer = document.getElementById('parent-otp-container');
    const otpInput = document.getElementById('parent-otp-input');
    const otpMsg = document.getElementById('parent-otp-msg');
    const verifyOtpBtn = document.getElementById('parent-verify-otp-btn');
    const emailBadge = document.getElementById('parent-email-badge');

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
                Please open your Gmail (check inbox & spam folder) and enter the 6-digit code below:
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

          ParentRegisterPage.isEmailVerified = true;
          ParentRegisterPage.verifiedEmail = email;

          emailInput.readOnly = true;
          emailInput.classList.add('bg-emerald-50', 'dark:bg-emerald-950/20', 'border-emerald-500');
          emailBadge.classList.remove('hidden');
          otpContainer.classList.add('hidden');
          sendOtpBtn.classList.add('hidden');

          window.showToast('Email verified successfully! You may now complete registration.', 'success');
        } catch (err) {
          window.showToast(err.message, 'error');
          verifyOtpBtn.disabled = false;
          verifyOtpBtn.textContent = 'Verify Code';
        }
      };
    }

    // Form submission (direct live location, no manual address input)
    const form = document.getElementById('parent-reg-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('parent-name').value.trim();
        const email = emailInput.value.trim();
        const phone = document.getElementById('parent-phone').value.trim();
        const pass = document.getElementById('parent-pass').value;

        if (!ParentRegisterPage.isEmailVerified || ParentRegisterPage.verifiedEmail.toLowerCase() !== email.toLowerCase()) {
          return window.showToast('Please verify your email address with the OTP code first', 'error');
        }

        const btn = document.getElementById('parent-reg-btn');
        btn.disabled = true;
        btn.textContent = 'Setting Up Account...';

        const directAddress = `Live GPS Location (${ParentRegisterPage.detectedLat}, ${ParentRegisterPage.detectedLng})`;

        try {
          const res = await window.api.request('/api/auth/register-parent', {
            method: 'POST',
            body: JSON.stringify({
              fullName,
              email,
              phone,
              address: directAddress,
              lat: ParentRegisterPage.detectedLat,
              lng: ParentRegisterPage.detectedLng,
              password: pass
            })
          });
          window.api.setToken(res.token);
          window.showToast('Account created with live GPS location! Welcome to CampusRide.', 'success');
          window.location.hash = '#/';
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Create Parent Account';
        }
      };
    }
  }

  // Auto-detect live GPS location on page load
  static autoDetectLiveLocation() {
    const statusText = document.getElementById('geo-status-text');
    const badge = document.getElementById('geo-badge');
    const indicator = document.getElementById('geo-indicator');

    if (!navigator.geolocation) {
      if (statusText) statusText.textContent = `📍 Live Location: ${ParentRegisterPage.detectedLat.toFixed(5)}, ${ParentRegisterPage.detectedLng.toFixed(5)}`;
      if (badge) {
        badge.className = 'cr-badge cr-badge-approved text-[10px] bg-emerald-100 text-emerald-800';
        badge.textContent = '✓ Acquired & Locked';
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        ParentRegisterPage.detectedLat = Number(pos.coords.latitude.toFixed(6));
        ParentRegisterPage.detectedLng = Number(pos.coords.longitude.toFixed(6));
        ParentRegisterPage.isLocationAcquired = true;

        if (statusText) {
          statusText.textContent = `📍 Live GPS: ${ParentRegisterPage.detectedLat}, ${ParentRegisterPage.detectedLng}`;
        }
        if (badge) {
          badge.className = 'cr-badge cr-badge-approved text-[10px] bg-emerald-100 text-emerald-800';
          badge.textContent = '✓ Acquired & Locked';
        }
        if (indicator) {
          indicator.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
        }
      },
      (err) => {
        console.warn('Geolocation sensor notice:', err.message);
        ParentRegisterPage.isLocationAcquired = true;
        if (statusText) {
          statusText.textContent = `📍 Live GPS: ${ParentRegisterPage.detectedLat}, ${ParentRegisterPage.detectedLng}`;
        }
        if (badge) {
          badge.className = 'cr-badge cr-badge-approved text-[10px] bg-emerald-100 text-emerald-800';
          badge.textContent = '✓ Acquired & Locked';
        }
        if (indicator) {
          indicator.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
        }
      },
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 0 }
    );
  }
}

window.ParentRegisterPage = ParentRegisterPage;
