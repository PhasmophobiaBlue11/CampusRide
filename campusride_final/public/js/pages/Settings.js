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

        <!-- Account Profile & Security Settings (§Editable Profile: Name, Phone, Password — Username Locked) -->
        <div class="cr-card p-6 space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>👤</span> Profile & Security Settings
            </h2>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
              ${user.role === 'admin' ? 'Master Administrator' : user.driverProfile ? 'Transport Driver' : user.parentProfile ? 'Student Parent' : 'Campus Staff'}
            </span>
          </div>

          <form id="settings-profile-form" class="space-y-4">
            <!-- 1. Username: STRICTLY READ-ONLY (Cannot be edited by anyone) -->
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Account Username</span>
                <span class="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <span>🔒</span> Cannot be changed
                </span>
              </label>
              <div class="relative">
                <input type="text" value="${user.username || user.email || ''}" disabled readonly class="cr-input bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-mono text-sm cursor-not-allowed select-none pl-9 font-bold" />
                <span class="absolute left-3 top-2.5 text-slate-400">🔒</span>
              </div>
              <p class="text-[10px] text-slate-400 mt-1">Your username is permanently linked to your system records and login identity.</p>
            </div>

            <!-- 2. Full Name: EDITABLE -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name <span class="text-rose-500">*</span>
              </label>
              <input type="text" id="settings-name-input" value="${user.display_name || ''}" required class="cr-input font-semibold text-sm" placeholder="e.g. Ramesh Sharma" autocomplete="off" autocorrect="off" spellcheck="false" data-lpignore="true" />
              <p class="text-[10px] text-slate-400 mt-1">Both first name and last name are required (e.g. Ramesh Sharma).</p>
            </div>

            <!-- 3. Phone Number: EDITABLE -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Registered Phone Number
              </label>
              <input type="tel" id="settings-phone-input" value="${user.phone || ''}" class="cr-input font-mono text-sm" placeholder="e.g. 9876543210" autocomplete="off" />
              <p class="text-[10px] text-slate-400 mt-1">Used for emergency contacts, SOS line, and password resets.</p>
            </div>

            <!-- 4. Password: EDITABLE -->
            <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Change Password (Optional)
              </label>
              <input type="password" id="settings-new-password-input" class="cr-input text-sm" placeholder="Enter new password (leave blank to keep current)" autocomplete="new-password" />
              <p class="text-[10px] text-slate-400 mt-1">Leave blank to keep your current password intact. Minimum 6 characters if changing.</p>
            </div>

            <div class="pt-2">
              <button type="submit" id="settings-save-profile-btn" class="cr-btn cr-btn-primary text-xs py-2.5 px-6 font-bold shadow-md cursor-pointer flex items-center gap-1.5">
                <span>💾</span> <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
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

  static attachEvents(user) {
    // Language buttons
    document.querySelectorAll('.settings-lang-btn').forEach(btn => {
      btn.onclick = () => {
        const lang = btn.getAttribute('data-lang');
        window.i18n.setLanguage(lang);
        window.location.reload();
      };
    });

    // Editable Profile Form (Name, Phone, Password — Username Locked)
    const profileForm = document.getElementById('settings-profile-form');
    if (profileForm) {
      profileForm.onsubmit = async (e) => {
        e.preventDefault();
        const fullName = (document.getElementById('settings-name-input').value || '').trim();
        const phone = (document.getElementById('settings-phone-input').value || '').trim();
        const newPassword = (document.getElementById('settings-new-password-input').value || '').trim();
        const saveBtn = document.getElementById('settings-save-profile-btn');

        // Full Name Validation (Both first and last name required, e.g. Ramesh Sharma)
        const parts = fullName.split(/\s+/).filter(Boolean);
        if (parts.length < 2 || parts[0].length < 2 || parts[1].length < 2) {
          window.showToast('Please enter full name (both first and last name, e.g. Ramesh Sharma)', 'error');
          return;
        }

        if (newPassword && newPassword.length < 6) {
          window.showToast('New password must be at least 6 characters long', 'error');
          return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving Profile Changes...';

        try {
          const res = await window.api.request('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({
              fullName,
              phone,
              newPassword: newPassword || undefined
            })
          });

          if (window.api && window.api.fetchMe) {
            await window.api.fetchMe();
          }

          window.showToast('✅ Profile information updated successfully!', 'success');

          const pwdInput = document.getElementById('settings-new-password-input');
          if (pwdInput) pwdInput.value = '';

          // Re-render settings screen with updated user object
          const updatedUser = res.user || user;
          const appEl = document.getElementById('app');
          if (appEl && window.HeaderComponent) {
            appEl.innerHTML = `
              ${window.HeaderComponent.render(updatedUser)}
              <main class="pb-24 sm:pb-12">
                ${await SettingsPage.render(updatedUser)}
              </main>
            `;
            window.HeaderComponent.attachEvents(updatedUser);
            SettingsPage.attachEvents(updatedUser);
          }
        } catch (err) {
          window.showToast(err.message || 'Failed to update profile', 'error');
        } finally {
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<span>💾</span> <span>Save Profile Changes</span>';
          }
        }
      };
    }

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
          localStorage.removeItem('campusride_account_created_parent');
          localStorage.removeItem('campusride_account_created_driver');
          localStorage.removeItem('campusride_account_created_staff');
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
