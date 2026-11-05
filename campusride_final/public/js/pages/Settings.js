// CampusRide — Settings & Preferences (§7.13, §8.6)
class SettingsPage {
  static currentLat = null;
  static currentLng = null;

  static async render(user) {
    const isParent = Boolean(user.parentProfile);
    const parentAddress = user.parentProfile?.address || '';
    SettingsPage.currentLat = user.parentProfile?.address_lat || 21.1219;
    SettingsPage.currentLng = user.parentProfile?.address_lng || 79.0601;

    return `
      <div class="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <!-- Back Button -->
        <div>
          <button type="button" onclick="window.goBack()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <span class="text-base font-black">←</span> <span>Back</span>
          </button>
        </div>

        <div>
          <h1 class="text-2xl font-black text-slate-900 dark:text-white">Settings & Preferences</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure language, visual theme, pickup location, and account profile.</p>
        </div>

        <!-- Language Settings (§18) -->
        <div class="cr-card p-6 space-y-3">
          <h2 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <span>🌐</span> Language / भाषा
          </h2>
          <div class="grid grid-cols-3 gap-2">
            <button class="settings-lang-btn cr-btn ${window.i18n.lang === 'en' ? 'cr-btn-primary' : 'cr-btn-secondary'} text-xs py-2" data-lang="en">
              🇬🇧 English
            </button>
            <button class="settings-lang-btn cr-btn ${window.i18n.lang === 'mr' ? 'cr-btn-primary' : 'cr-btn-secondary'} text-xs py-2" data-lang="mr">
              🇮🇳 मराठी
            </button>
            <button class="settings-lang-btn cr-btn ${window.i18n.lang === 'hi' ? 'cr-btn-primary' : 'cr-btn-secondary'} text-xs py-2" data-lang="hi">
              🇮🇳 हिन्दी
            </button>
          </div>
        </div>

        <!-- Parent Address & Live GPS Location Update (§7.13) -->
        ${isParent ? `
          <div class="cr-card p-6 space-y-4">
            <h2 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>🏠</span> Home Pickup Address & Location
            </h2>
            <form id="update-address-form" class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Pickup Address</label>
                <input type="text" id="settings-address-input" value="${parentAddress}" required class="cr-input" placeholder="Enter home address" />
              </div>

              <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1.5">
                <div class="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Current Pickup Coordinates:</span>
                  <span id="settings-coords-display" class="font-mono text-blue-600 dark:text-blue-400 font-bold">
                    ${SettingsPage.currentLat}, ${SettingsPage.currentLng}
                  </span>
                </div>
                <p class="text-[11px] text-slate-400">
                  This location was automatically locked when you created your account. You can re-detect it using your live GPS below.
                </p>
                <button type="button" id="settings-detect-gps-btn" class="cr-btn cr-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 mt-1">
                  <span>📍</span> Re-Detect Live GPS Location
                </button>
              </div>

              <button type="submit" id="settings-save-address-btn" class="cr-btn cr-btn-primary text-xs py-2 px-5">
                Save Location Changes
              </button>
            </form>
          </div>
        ` : ''}



        <!-- Account Self-Deletion (§8.6) -->
        <div class="cr-card p-6 border-rose-300 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/20 space-y-3">
          <h2 class="font-bold text-sm text-rose-600 flex items-center gap-2">
            <span>⚠️</span> Danger Zone — Delete Account
          </h2>
          <p class="text-xs text-slate-500">
            Permanently clear your student profiles, request records, and deactivate your account from CampusRide.
          </p>
          <button id="delete-my-account-btn" class="cr-btn cr-btn-destructive text-xs py-2 px-4">
            Permanently Delete My Account
          </button>
        </div>
      </div>
    `;
  }

  static attachEvents() {
    // Language buttons
    document.querySelectorAll('.settings-lang-btn').forEach(btn => {
      btn.onclick = () => {
        const lang = btn.getAttribute('data-lang');
        window.i18n.setLanguage(lang);
        window.location.reload();
      };
    });

    // Re-detect Live GPS in Settings
    const detectGpsBtn = document.getElementById('settings-detect-gps-btn');
    const coordsDisplay = document.getElementById('settings-coords-display');
    if (detectGpsBtn) {
      detectGpsBtn.onclick = () => {
        if (!navigator.geolocation) {
          return window.showToast('Geolocation is not supported by your browser', 'error');
        }
        detectGpsBtn.disabled = true;
        detectGpsBtn.textContent = 'Detecting GPS...';

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            SettingsPage.currentLat = Number(pos.coords.latitude.toFixed(6));
            SettingsPage.currentLng = Number(pos.coords.longitude.toFixed(6));
            if (coordsDisplay) {
              coordsDisplay.textContent = `${SettingsPage.currentLat}, ${SettingsPage.currentLng} (Updated)`;
            }
            window.showToast('Live GPS coordinates acquired! Click Save to apply.', 'success');
            detectGpsBtn.disabled = false;
            detectGpsBtn.textContent = '✓ GPS Acquired';
          },
          (err) => {
            window.showToast('Could not acquire GPS: ' + err.message, 'error');
            detectGpsBtn.disabled = false;
            detectGpsBtn.textContent = '📍 Re-Detect Live GPS Location';
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      };
    }

    // Address update
    const form = document.getElementById('update-address-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const address = document.getElementById('settings-address-input').value.trim();
        const saveBtn = document.getElementById('settings-save-address-btn');
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving...';
        }

        try {
          await window.api.request('/api/parents/address', {
            method: 'POST',
            body: JSON.stringify({
              address,
              lat: SettingsPage.currentLat,
              lng: SettingsPage.currentLng
            })
          });
          window.showToast('Pickup address and live coordinates updated successfully!', 'success');
        } catch (err) {
          window.showToast(err.message, 'error');
        } finally {
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Location Changes';
          }
        }
      };
    }



    // Self-delete
    const deleteBtn = document.getElementById('delete-my-account-btn');
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        if (!confirm('Are you ABSOLUTELY sure? This will delete your profile and log you out immediately.')) return;
        try {
          await window.api.request('/api/auth/delete-account', { method: 'POST' });
          localStorage.removeItem('campusride_device_parent_username');
          localStorage.removeItem('campusride_device_driver_username');
          localStorage.removeItem('campusride_device_staff_username');
          localStorage.removeItem('campusride_parent_token');
          localStorage.removeItem('campusride_driver_token');
          localStorage.removeItem('campusride_staff_token');
          window.api.logout();
          window.showToast('Account deleted successfully.', 'info');
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      };
    }
  }
}

window.SettingsPage = SettingsPage;
