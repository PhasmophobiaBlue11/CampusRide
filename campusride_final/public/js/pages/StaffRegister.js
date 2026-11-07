// CampusRide — Gate Staff Self-Registration Page
// Pure Username + Password Authentication with 1-Account-Per-Device Enforcement
class StaffRegisterPage {
  static render() {
    const existingDeviceUser = localStorage.getItem('campusride_account_created_staff');

    // DEVICE LOCK SCREEN: Only if a Staff account was actually CREATED from this device
    if (existingDeviceUser) {
      return `
        <div class="min-h-screen flex items-center justify-center p-4 relative z-10">
          <div class="cr-card w-full max-w-md p-6 sm:p-8 animate-fade-in-up text-center space-y-5">
            <div class="w-16 h-16 mx-auto rounded-3xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center text-3xl shadow-lg">
              🛂
            </div>

            <div>
              <h1 class="text-xl font-bold text-slate-900 dark:text-white">Staff Account Already Active</h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                CampusRide policy allows <b>maximum 1 Staff account</b> per device. An active staff account is currently linked to this device:
              </p>
              <div class="mt-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span class="text-xs font-semibold text-slate-500">Registered Username:</span>
                <div class="font-mono font-bold text-base text-blue-600 dark:text-blue-400">@${existingDeviceUser}</div>
              </div>
            </div>

            <div class="space-y-3 pt-2">
              <button type="button" id="staff-device-signin-btn" class="cr-btn cr-btn-primary w-full py-2.5 font-bold shadow-md cursor-pointer">
                Sign In as @${existingDeviceUser}
              </button>

              <button type="button" id="staff-device-delete-btn" class="cr-btn bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/50 w-full py-2.5 font-bold cursor-pointer text-xs">
                🗑️ Delete @${existingDeviceUser} & Register New Account
              </button>
            </div>

            <p class="text-[11px] text-slate-400">
              Deleting this account removes your staff request and allows you to register a new account.
            </p>
          </div>
        </div>
      `;
    }

    // REGISTRATION FORM: Fresh registration with Username & Password
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
              Choose your staff username and submit your profile for administrator approval.
            </p>
          </div>

          <form id="staff-reg-form" class="space-y-4" autocomplete="off">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name (First & Last Name)</label>
              <input type="text" id="staff-name" required class="cr-input" placeholder="e.g. Anand Shinde" autocomplete="off" autocorrect="off" spellcheck="false" data-lpignore="true" />
              <p class="text-[10px] text-slate-400 mt-0.5">Please enter both your first name and last name.</p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Choose Username</label>
              <input type="text" id="staff-username" required minlength="3" class="cr-input" placeholder="e.g. Anand2026 or staffXYZ" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" />
              <p class="text-[10px] text-slate-400 mt-0.5">Used to log in to the Gate Staff App on this device.</p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mobile Phone (10 Digits)</label>
              <input type="tel" id="staff-phone" required class="cr-input" placeholder="9876543210" pattern="[0-9]{10}" autocomplete="off" autocorrect="off" spellcheck="false" data-lpignore="true" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <div class="relative flex items-center">
                <input type="password" id="staff-password" required minlength="6" class="cr-input pr-11" placeholder="••••••••" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" />
                <button type="button" id="toggle-staff-password" class="absolute right-2.5 p-1 text-base text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none">
                  👁️
                </button>
              </div>
            </div>

            <button type="submit" id="staff-submit-btn" class="cr-btn cr-btn-primary w-full py-2.5 mt-2 font-bold shadow-md cursor-pointer">
              Submit Staff Registration Request
            </button>
          </form>
        </div>
      </div>
    `;
  }

  static attachEvents() {
    const existingDeviceUser = localStorage.getItem('campusride_account_created_staff');

    // DEVICE LOCK SCREEN HANDLERS
    if (existingDeviceUser) {
      const signinBtn = document.getElementById('staff-device-signin-btn');
      if (signinBtn) {
        signinBtn.onclick = () => {
          localStorage.setItem('campusride_app_role', 'staff');
          window.location.hash = '#/';
          window.location.reload();
        };
      }

      const deleteBtn = document.getElementById('staff-device-delete-btn');
      if (deleteBtn) {
        deleteBtn.onclick = async () => {
          if (!confirm(`Are you sure you want to permanently delete staff account "@${existingDeviceUser}" from this device?`)) return;
          deleteBtn.disabled = true;
          deleteBtn.textContent = 'Deleting account...';

          try {
            await window.api.request('/api/auth/delete-device-account', {
              method: 'POST',
              body: JSON.stringify({ username: existingDeviceUser, role: 'staff' })
            });

            localStorage.removeItem('campusride_account_created_staff');
            localStorage.removeItem('campusride_device_staff_username');
            localStorage.removeItem('campusride_staff_token');
            window.showToast(`Staff account "@${existingDeviceUser}" deleted. You can now register a new staff account.`, 'success');

            const appEl = document.getElementById('app');
            appEl.innerHTML = StaffRegisterPage.render();
            StaffRegisterPage.attachEvents();
          } catch (err) {
            window.showToast(err.message, 'error');
            deleteBtn.disabled = false;
            deleteBtn.textContent = `🗑️ Delete @${existingDeviceUser} & Register New Account`;
          }
        };
      }
      return;
    }

    // REGISTRATION FORM HANDLERS
    const togglePassBtn = document.getElementById('toggle-staff-password');
    const passInput = document.getElementById('staff-password');
    if (togglePassBtn && passInput) {
      togglePassBtn.onclick = () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        togglePassBtn.textContent = isPass ? '🙈' : '👁️';
      };
    }

    const form = document.getElementById('staff-reg-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('staff-name').value.trim();
        const username = document.getElementById('staff-username').value.trim();
        const phone = document.getElementById('staff-phone').value.trim();
        const password = document.getElementById('staff-password').value;
        const submitBtn = document.getElementById('staff-submit-btn');

        // Full Name Validation (Must contain at least first name and last name)
        const nameParts = fullName.split(/\s+/).filter(Boolean);
        if (nameParts.length < 2 || nameParts[0].length < 2 || nameParts[1].length < 2) {
          return window.showToast('Please enter your full name (both first and last name, e.g. Anand Shinde)', 'error');
        }

        if (!username || username.length < 3) {
          return window.showToast('Username must be at least 3 characters', 'error');
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting request...';

        try {
          const res = await window.api.request('/api/auth/register-staff', {
            method: 'POST',
            body: JSON.stringify({ fullName, username, phone, password })
          });

          // Save device creation lock and token
          localStorage.setItem('campusride_account_created_staff', username);
          localStorage.setItem('campusride_staff_token', res.token);
          localStorage.setItem('campusride_app_role', 'staff');
          window.api.setToken(res.token);

          window.showToast('Staff registration submitted! Awaiting administrator approval.', 'success');
          window.location.hash = '#/';
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Staff Registration Request';
        }
      };
    }
  }
}

window.StaffRegisterPage = StaffRegisterPage;
