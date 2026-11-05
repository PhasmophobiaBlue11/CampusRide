// CampusRide — Parent Registration Page
// Pure Username + Password Authentication with 1-Account-Per-Device Enforcement & GPS Capture
class ParentRegisterPage {
  static detectedLat = 21.1219;
  static detectedLng = 79.0601;
  static isLocationAcquired = false;

  static render() {
    ParentRegisterPage.detectedLat = 21.1219;
    ParentRegisterPage.detectedLng = 79.0601;
    ParentRegisterPage.isLocationAcquired = false;

    const existingDeviceUser = localStorage.getItem('campusride_device_parent_username');

    // DEVICE LOCK SCREEN: If an account already exists on this device
    if (existingDeviceUser) {
      return `
        <div class="min-h-screen flex items-center justify-center p-4 relative z-10">
          <div class="cr-card w-full max-w-md p-6 sm:p-8 animate-fade-in-up text-center space-y-5">
            <div class="w-16 h-16 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center text-3xl shadow-lg">
              📱
            </div>

            <div>
              <h1 class="text-xl font-bold text-slate-900 dark:text-white">Account Already Active on This Device</h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                CampusRide policy allows <b>maximum 1 Parent account</b> per device. An active account is currently linked to this device:
              </p>
              <div class="mt-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span class="text-xs font-semibold text-slate-500">Registered Username:</span>
                <div class="font-mono font-bold text-base text-indigo-600 dark:text-indigo-400">@${existingDeviceUser}</div>
              </div>
            </div>

            <div class="space-y-3 pt-2">
              <button type="button" id="device-signin-btn" class="cr-btn bg-indigo-600 hover:bg-indigo-500 text-white w-full py-2.5 font-bold shadow-md cursor-pointer">
                Sign In as @${existingDeviceUser}
              </button>

              <button type="button" id="device-delete-account-btn" class="cr-btn bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/50 w-full py-2.5 font-bold cursor-pointer text-xs">
                🗑️ Delete @${existingDeviceUser} & Register New Account
              </button>
            </div>

            <p class="text-[11px] text-slate-400">
              Deleting this account removes its vehicle bindings and allows you to register a fresh account.
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
            <span class="text-3xl">👨‍👩‍👧</span>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white mt-2">Create Parent Account</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Set your unique username and capture your live student pickup GPS coordinates.
            </p>
          </div>

          <form id="parent-reg-form" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Parent / Guardian Name</label>
              <input type="text" id="parent-name" required class="cr-input" placeholder="e.g. Priya Sharma" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Choose Username</label>
              <input type="text" id="parent-username" required minlength="3" class="cr-input" placeholder="e.g. Priya2026 or XYZ" autocomplete="username" />
              <p class="text-[10px] text-slate-400 mt-0.5">Used to log in to the Parent App on this device.</p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mobile Phone (10 Digits)</label>
              <input type="tel" id="parent-phone" required class="cr-input" placeholder="9876555555" pattern="[0-9]{10}" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <div class="relative flex items-center">
                <input type="password" id="parent-password" required minlength="6" class="cr-input pr-11" placeholder="••••••••" autocomplete="new-password" />
                <button type="button" id="toggle-parent-password" class="absolute right-2.5 p-1 text-base text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none">
                  👁️
                </button>
              </div>
            </div>

            <!-- Automatic Live Location Box -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Student Pickup Location</label>
                <button type="button" id="parent-refresh-loc-btn" class="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer">
                  <span>🔄</span> Refresh GPS
                </button>
              </div>

              <div class="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                <div class="flex items-center gap-2">
                  <span id="geo-status-icon" class="text-emerald-600 text-lg">📍</span>
                  <div class="flex-1">
                    <div id="geo-status-text" class="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
                      Detecting your exact live coordinates...
                    </div>
                    <div id="geo-coords-sub" class="text-[10px] text-slate-500">Auto-detected via browser GPS</div>
                  </div>
                </div>

                <div class="pt-1 flex items-center justify-between border-t border-emerald-200/60 dark:border-emerald-800/40 text-xs">
                  <span class="text-slate-500">Live Pin:</span>
                  <button type="button" id="parent-test-map-btn" class="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                    <span>🗺️</span> View in Google Maps
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pickup Address / Landmark</label>
              <input type="text" id="parent-address" required class="cr-input" placeholder="e.g. Flat 402, Green Valley Apartments" />
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
    const existingDeviceUser = localStorage.getItem('campusride_device_parent_username');

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

    // Auto-detect geolocation
    ParentRegisterPage.detectLocation();

    const refreshLocBtn = document.getElementById('parent-refresh-loc-btn');
    if (refreshLocBtn) {
      refreshLocBtn.onclick = () => ParentRegisterPage.detectLocation();
    }

    const testMapBtn = document.getElementById('parent-test-map-btn');
    if (testMapBtn) {
      testMapBtn.onclick = () => {
        window.openGoogleMaps(ParentRegisterPage.detectedLat, ParentRegisterPage.detectedLng, 'Student Pickup Location');
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
        const address = document.getElementById('parent-address').value.trim();
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
              address,
              lat: ParentRegisterPage.detectedLat,
              lng: ParentRegisterPage.detectedLng
            })
          });

          // Save device lock and token
          localStorage.setItem('campusride_device_parent_username', username);
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

  static detectLocation() {
    const statusText = document.getElementById('geo-status-text');
    const coordsSub = document.getElementById('geo-coords-sub');
    const statusIcon = document.getElementById('geo-status-icon');

    if (!navigator.geolocation) {
      if (statusText) statusText.textContent = 'GPS not supported by browser. Using default city pin.';
      return;
    }

    if (statusText) statusText.textContent = 'Detecting exact GPS coordinates...';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        ParentRegisterPage.detectedLat = Number(pos.coords.latitude.toFixed(6));
        ParentRegisterPage.detectedLng = Number(pos.coords.longitude.toFixed(6));
        ParentRegisterPage.isLocationAcquired = true;

        if (statusText) {
          statusText.textContent = `📍 GPS Locked: ${ParentRegisterPage.detectedLat}, ${ParentRegisterPage.detectedLng}`;
        }
        if (coordsSub) coordsSub.textContent = `Accuracy: ±${Math.round(pos.coords.accuracy)}m`;
        if (statusIcon) statusIcon.textContent = '✓';
      },
      (err) => {
        console.warn('Geolocation notice:', err.message);
        if (statusText) {
          statusText.textContent = `Using default location (${ParentRegisterPage.detectedLat}, ${ParentRegisterPage.detectedLng})`;
        }
        if (coordsSub) coordsSub.textContent = 'Tap "Refresh GPS" to allow location permissions';
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }
}

window.ParentRegisterPage = ParentRegisterPage;
