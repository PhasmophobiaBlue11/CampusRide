// CampusRide — Driver Self-Registration Page
// Pure Username + Password Authentication with 1-Account-Per-Device Enforcement
class DriverRegisterPage {
  static render() {
    const existingDeviceUser = localStorage.getItem('campusride_device_driver_username');

    // DEVICE LOCK SCREEN: If a Driver account already exists on this device
    if (existingDeviceUser) {
      return `
        <div class="min-h-screen flex items-center justify-center p-4 relative z-10">
          <div class="cr-card w-full max-w-md p-6 sm:p-8 animate-fade-in-up text-center space-y-5">
            <div class="w-16 h-16 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center text-3xl shadow-lg">
              🚌
            </div>

            <div>
              <h1 class="text-xl font-bold text-slate-900 dark:text-white">Driver Account Already Active</h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                CampusRide policy allows <b>maximum 1 Driver account</b> per device. An active driver account is currently linked to this device:
              </p>
              <div class="mt-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span class="text-xs font-semibold text-slate-500">Registered Username:</span>
                <div class="font-mono font-bold text-base text-amber-600 dark:text-amber-400">@${existingDeviceUser}</div>
              </div>
            </div>

            <div class="space-y-3 pt-2">
              <button type="button" id="driver-device-signin-btn" class="cr-btn bg-amber-500 hover:bg-amber-400 text-white w-full py-2.5 font-bold shadow-md cursor-pointer">
                Sign In as @${existingDeviceUser}
              </button>

              <button type="button" id="driver-device-delete-btn" class="cr-btn bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/50 w-full py-2.5 font-bold cursor-pointer text-xs">
                🗑️ Delete @${existingDeviceUser} & Register New Account
              </button>
            </div>

            <p class="text-[11px] text-slate-400">
              Deleting this account removes vehicle bindings and allows registering a new driver.
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
            <span class="text-3xl">🚌</span>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white mt-2">Create Driver Account</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Register your driver credentials and vehicle to broadcast live GPS to parents.
            </p>
          </div>

          <form id="driver-reg-form" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Driver Name</label>
              <input type="text" id="driver-name" required class="cr-input" placeholder="e.g. Ramesh Sharma" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Choose Username</label>
              <input type="text" id="driver-username" required minlength="3" class="cr-input" placeholder="e.g. Ramesh2026 or driverXYZ" autocomplete="username" />
              <p class="text-[10px] text-slate-400 mt-0.5">Used to log in to the Driver App on this device.</p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mobile Phone (10 Digits)</label>
              <input type="tel" id="driver-phone" required class="cr-input" placeholder="9876543210" pattern="[0-9]{10}" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <div class="relative flex items-center">
                <input type="password" id="driver-password" required minlength="6" class="cr-input pr-11" placeholder="••••••••" autocomplete="new-password" />
                <button type="button" id="toggle-driver-password" class="absolute right-2.5 p-1 text-base text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none">
                  👁️
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vehicle License Plate Number</label>
              <input type="text" id="driver-van-no" required minlength="6" class="cr-input uppercase tracking-wider font-mono font-bold" placeholder="__ __ __ ____" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vehicle Type</label>
              <select id="driver-vehicle-type" class="cr-input">
                <option value="4_wheeler">🚌 4-Wheeler Transit Van (Standard)</option>
                <option value="2_wheeler">🛵 2-Wheeler Shuttle</option>
              </select>
            </div>

            <button type="submit" id="driver-submit-btn" class="cr-btn bg-amber-500 hover:bg-amber-400 text-white w-full py-2.5 mt-2 font-bold shadow-md cursor-pointer">
              Register Vehicle & Open Driver Console
            </button>
          </form>
        </div>
      </div>
    `;
  }

  static attachEvents() {
    const existingDeviceUser = localStorage.getItem('campusride_device_driver_username');

    // DEVICE LOCK SCREEN HANDLERS
    if (existingDeviceUser) {
      const signinBtn = document.getElementById('driver-device-signin-btn');
      if (signinBtn) {
        signinBtn.onclick = () => {
          localStorage.setItem('campusride_app_role', 'driver');
          window.location.hash = '#/';
          window.location.reload();
        };
      }

      const deleteBtn = document.getElementById('driver-device-delete-btn');
      if (deleteBtn) {
        deleteBtn.onclick = async () => {
          if (!confirm(`Are you sure you want to permanently delete driver account "@${existingDeviceUser}" from this device?`)) return;
          deleteBtn.disabled = true;
          deleteBtn.textContent = 'Deleting account...';

          try {
            await window.api.request('/api/auth/delete-device-account', {
              method: 'POST',
              body: JSON.stringify({ username: existingDeviceUser, role: 'driver' })
            });

            localStorage.removeItem('campusride_device_driver_username');
            localStorage.removeItem('campusride_driver_token');
            window.showToast(`Driver account "@${existingDeviceUser}" deleted. You can now register a new driver.`, 'success');

            const appEl = document.getElementById('app');
            appEl.innerHTML = DriverRegisterPage.render();
            DriverRegisterPage.attachEvents();
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
    const togglePassBtn = document.getElementById('toggle-driver-password');
    const passInput = document.getElementById('driver-password');
    if (togglePassBtn && passInput) {
      togglePassBtn.onclick = () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        togglePassBtn.textContent = isPass ? '🙈' : '👁️';
      };
    }

    // Attach auto-spacing plate formatter
    const vanNoInput = document.getElementById('driver-van-no');
    if (vanNoInput && window.attachPlateFormatter) {
      window.attachPlateFormatter(vanNoInput);
    }

    const form = document.getElementById('driver-reg-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('driver-name').value.trim();
        const username = document.getElementById('driver-username').value.trim();
        const phone = document.getElementById('driver-phone').value.trim();
        const password = document.getElementById('driver-password').value;
        const vehicleNo = document.getElementById('driver-van-no').value.trim();
        const vehicleType = document.getElementById('driver-vehicle-type').value;
        const submitBtn = document.getElementById('driver-submit-btn');

        if (!username || username.length < 3) {
          return window.showToast('Username must be at least 3 characters', 'error');
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering vehicle...';

        try {
          const res = await window.api.request('/api/auth/register-driver', {
            method: 'POST',
            body: JSON.stringify({ fullName, username, phone, password, vehicleNo, vehicleType })
          });

          // Save device lock and token
          localStorage.setItem('campusride_device_driver_username', username);
          localStorage.setItem('campusride_driver_token', res.token);
          localStorage.setItem('campusride_app_role', 'driver');
          window.api.setToken(res.token);

          window.showToast('Driver account created successfully!', 'success');
          window.location.hash = '#/';
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Register Vehicle & Open Driver Console';
        }
      };
    }
  }
}

window.DriverRegisterPage = DriverRegisterPage;
