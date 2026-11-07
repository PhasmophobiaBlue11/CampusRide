// CampusRide — Dedicated Parent Registration
// Username & Password credentials, zero location/GPS inputs (§No Maps Requirement)
class ParentRegisterPage {
  static render() {
    const existingDeviceUser = localStorage.getItem('campusride_account_created_parent');

    if (existingDeviceUser) {
      return `
        <div class="min-h-screen flex items-center justify-center p-4 relative z-10">
          <div class="cr-card w-full max-w-md p-6 sm:p-8 text-center space-y-5 animate-fade-in-up border-2 border-indigo-500/40">
            <div class="w-16 h-16 mx-auto rounded-3xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center text-3xl shadow-inner">
              🔒
            </div>

            <div>
              <h1 class="text-xl font-black text-slate-900 dark:text-white">Device Account Limit Reached</h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                This device already has a registered Parent account:
              </p>
              <div class="mt-3 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 font-mono font-bold text-sm text-indigo-700 dark:text-indigo-300">
                @${existingDeviceUser}
              </div>
            </div>

            <div class="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 text-left">
              <b>Device Policy:</b> Only 1 parent account may be created per device. To create a new account, delete the existing account from this device below.
            </div>

            <div class="space-y-2.5 pt-2">
              <button type="button" id="device-signin-btn" class="cr-btn bg-indigo-600 hover:bg-indigo-500 text-white w-full py-2.5 font-bold shadow-md cursor-pointer">
                Sign In with @${existingDeviceUser}
              </button>
              <button type="button" id="device-delete-account-btn" class="cr-btn cr-btn-secondary text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 w-full py-2 text-xs font-bold cursor-pointer">
                🗑️ Delete @${existingDeviceUser} & Register New Account
              </button>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div class="cr-card w-full max-w-md p-6 sm:p-8 animate-fade-in-up">
          <!-- Back to Parent Portal Button -->
          <div class="mb-4">
            <button type="button" onclick="window.goBack()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
              <span class="text-base font-black">←</span> <span>Back</span>
            </button>
          </div>

          <div class="text-center mb-6">
            <span class="text-3xl">👨‍👩‍👧</span>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white mt-2">Create Parent Account</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Set your parent credentials to monitor live van journeys and campus gate logs.
            </p>
          </div>

          <form id="parent-reg-form" class="space-y-4" autocomplete="off">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Parent / Guardian Name</label>
              <input type="text" id="parent-name" required class="cr-input" placeholder="e.g. Priya Sharma" autocomplete="off" autocorrect="off" spellcheck="false" data-lpignore="true" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Choose Username</label>
              <input type="text" id="parent-username" required minlength="3" class="cr-input" placeholder="e.g. Priya2026 or XYZ" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" />
              <p class="text-[10px] text-slate-400 mt-0.5">Used to log in to the Parent App on this device.</p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mobile Phone (10 Digits)</label>
              <input type="tel" id="parent-phone" required class="cr-input" placeholder="9876555555" pattern="[0-9]{10}" autocomplete="off" autocorrect="off" spellcheck="false" data-lpignore="true" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <div class="relative flex items-center">
                <input type="password" id="parent-password" required minlength="6" class="cr-input pr-11" placeholder="••••••••" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" />
                <button type="button" id="toggle-parent-password" class="absolute right-2.5 p-1 text-base text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none">
                  👁️
                </button>
              </div>
            </div>

            <button type="submit" id="parent-submit-btn" class="cr-btn bg-indigo-600 hover:bg-indigo-500 text-white w-full py-2.5 mt-2 font-bold shadow-md cursor-pointer">
              Create Parent Account
            </button>
          </form>
        </div>
      </div>
    `;
  }

  static attachEvents() {
    const existingDeviceUser = localStorage.getItem('campusride_account_created_parent');

    // DEVICE LOCK SCREEN HANDLERS
    if (existingDeviceUser) {
      const signinBtn = document.getElementById('device-signin-btn');
      if (signinBtn) {
        signinBtn.onclick = () => {
          localStorage.setItem('campusride_app_role', 'parent');
          window.location.hash = '#/';
          window.location.reload();
        };
      }

      const deleteBtn = document.getElementById('device-delete-account-btn');
      if (deleteBtn) {
        deleteBtn.onclick = async () => {
          if (!confirm(`Are you sure you want to permanently delete account "@${existingDeviceUser}" from this device?`)) return;
          deleteBtn.disabled = true;
          deleteBtn.textContent = 'Deleting account...';

          try {
            await window.api.request('/api/auth/delete-device-account', {
              method: 'POST',
              body: JSON.stringify({ username: existingDeviceUser, role: 'parent' })
            });

            localStorage.removeItem('campusride_account_created_parent');
            localStorage.removeItem('campusride_device_parent_username');
            localStorage.removeItem('campusride_parent_token');
            window.showToast(`Account "@${existingDeviceUser}" deleted. You can now register a new account.`, 'success');

            const appEl = document.getElementById('app');
            appEl.innerHTML = ParentRegisterPage.render();
            ParentRegisterPage.attachEvents();
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
    const togglePassBtn = document.getElementById('toggle-parent-password');
    const passInput = document.getElementById('parent-password');
    if (togglePassBtn && passInput) {
      togglePassBtn.onclick = () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        togglePassBtn.textContent = isPass ? '🙈' : '👁️';
      };
    }

    // Form submit
    const form = document.getElementById('parent-reg-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('parent-name').value.trim();
        const username = document.getElementById('parent-username').value.trim();
        const phone = document.getElementById('parent-phone').value.trim();
        const password = document.getElementById('parent-password').value;
        const submitBtn = document.getElementById('parent-submit-btn');

        if (!username || username.length < 3) {
          return window.showToast('Username must be at least 3 characters', 'error');
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering account...';

        try {
          const res = await window.api.request('/api/auth/register-parent', {
            method: 'POST',
            body: JSON.stringify({
              fullName,
              username,
              phone,
              password,
              address: '',
              lat: 0,
              lng: 0
            })
          });

          // Save device creation lock and token
          localStorage.setItem('campusride_account_created_parent', username);
          localStorage.setItem('campusride_parent_token', res.token);
          localStorage.setItem('campusride_app_role', 'parent');
          window.api.setToken(res.token);

          window.showToast('Account created successfully!', 'success');
          window.location.hash = '#/';
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Parent Account';
        }
      };
    }
  }
}

window.ParentRegisterPage = ParentRegisterPage;
