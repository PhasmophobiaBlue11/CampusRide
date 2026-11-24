// CampusRide — Master Administrator Portal
// Strictly 3 Dedicated Works as per Administrator Specification:
// 1. Create and Delete the single common Staff account (with username, password, and 4-digit PIN)
// 2. See how many devices are connected to the Staff account
// 3. See the Daily Log register like staff
class AdminDashboardPage {
  static currentLogs = [];
  static activeFilter = 'all'; // 'all' | 'driver' | 'staff'
  static activeCategory = 'all'; // 'all' | 'entry_exit' | 'journey'
  static selectedDate = new Date().toISOString().slice(0, 10);

  static async render(user) {
    let staffData = { exists: false, staff: null, connectedDevices: 0 };
    let logs = [];
    let stats = { entry: 0, exit: 0, inside: 0, driver: { inside: 0, entry: 0, exit: 0 }, staff: { inside: 0, entry: 0, exit: 0 } };

    try {
      const [staffRes, logsRes] = await Promise.all([
        window.api.request('/api/admin/staff-account').catch(() => ({ exists: false, staff: null, connectedDevices: 0 })),
        window.api.request(`/api/logs?date=${AdminDashboardPage.selectedDate}&limit=200`).catch(() => ({ logs: [], stats }))
      ]);

      staffData = staffRes;
      logs = logsRes.logs || [];
      stats = logsRes.stats || stats;
      AdminDashboardPage.currentLogs = logs;
    } catch (err) {
      console.warn('Admin dashboard load error:', err.message);
    }

    const driverInside = stats.driver ? (stats.driver.inside || 0) : Math.max(0, (stats.entry || 0) - (stats.exit || 0));
    const staffInside = stats.staff ? (stats.staff.inside || 0) : 0;
    const currentlyInside = driverInside + staffInside;

    return `
      <div class="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-fade-in-up">
        
        <!-- Header Banner -->
        <div class="bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-bold uppercase tracking-wider bg-purple-500/30 px-3 py-0.5 rounded-full border border-purple-400/30">
                Master Administrator
              </span>
              <span class="text-xs text-purple-200">Parth • Admin2026</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight">System Administrator Console</h1>
            <p class="text-xs sm:text-sm text-purple-200 max-w-xl leading-relaxed">
              Unified administration: Manage common staff access, monitor connected devices, and audit daily gate logs.
            </p>
          </div>
          <div class="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button type="button" id="admin-refresh-all-btn" class="cr-btn bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs py-2 px-3.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer">
              <span>🔄</span> <span>Refresh State</span>
            </button>
          </div>
        </div>

        <!-- 3 DEDICATED WORKS GRID -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

          <!-- ==================================================== -->
          <!-- WORK 1: Common Staff Account Management (Cols 1-7)    -->
          <!-- ==================================================== -->
          <div class="lg:col-span-7 cr-card p-5 sm:p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2.5">
                <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl font-bold">
                  👔
                </div>
                <div>
                  <h2 class="text-base font-black text-slate-900 dark:text-white">1. Common Staff Account</h2>
                  <p class="text-xs text-slate-500 dark:text-slate-400">Single shared account used by all gate staff & teachers.</p>
                </div>
              </div>
              <span class="text-xs font-bold px-2.5 py-1 rounded-full ${staffData.exists ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'}">
                ${staffData.exists ? '● Active Account' : '○ Not Created'}
              </span>
            </div>

            ${staffData.exists && staffData.staff ? `
              <!-- Active Staff Account Details -->
              <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span class="text-slate-400 text-[11px] block">Username</span>
                    <span class="font-mono font-bold text-base text-blue-600 dark:text-blue-400">@${staffData.staff.username}</span>
                  </div>
                  <div>
                    <span class="text-slate-400 text-[11px] block">4-Digit Security PIN (Quick Unlock)</span>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span id="admin-staff-pin-display" class="font-mono font-black text-base text-slate-900 dark:text-white tracking-widest">••••</span>
                      <button type="button" id="admin-toggle-pin-btn" class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer" data-pin="${staffData.staff.pin}">
                        Show PIN
                      </button>
                    </div>
                  </div>
                  <div>
                    <span class="text-slate-400 text-[11px] block">Account Designation</span>
                    <span class="font-bold text-slate-800 dark:text-slate-200">${staffData.staff.displayName || 'Campus Staff Desk'}</span>
                  </div>
                  <div>
                    <span class="text-slate-400 text-[11px] block">Created Date</span>
                    <span class="font-medium text-slate-600 dark:text-slate-300">${new Date(staffData.staff.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div class="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
                  <p class="text-[11px] text-slate-500">
                    All gate staff log in using these credentials and unlock on their phones using the 4-digit PIN.
                  </p>
                  <button type="button" id="admin-delete-staff-btn" class="cr-btn cr-btn-destructive text-xs py-2 px-3 font-bold whitespace-nowrap cursor-pointer shadow-sm">
                    🗑️ Delete Account
                  </button>
                </div>
              </div>

              <!-- Update Existing Account Form (Collapsible) -->
              <details class="text-xs group">
                <summary class="font-bold text-blue-600 dark:text-blue-400 cursor-pointer select-none hover:underline py-1">
                  ✏️ Edit Staff Account Credentials / Reset PIN
                </summary>
                <form id="admin-update-staff-form" class="mt-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div>
                    <label class="block font-semibold mb-1">Username</label>
                    <input type="text" id="admin-edit-staff-username" required class="cr-input" value="${staffData.staff.username}" />
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block font-semibold mb-1">New Password</label>
                      <div class="relative flex items-center">
                        <input type="password" id="admin-edit-staff-password" required minlength="4" class="cr-input pr-10" placeholder="Enter new password" />
                        <button type="button" id="toggle-admin-edit-password" class="absolute right-2.5 p-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none" title="Toggle password visibility">
                          👁️
                        </button>
                      </div>
                    </div>
                    <div>
                      <label class="block font-semibold mb-1">4-Digit Security PIN</label>
                      <div class="relative flex items-center">
                        <input type="password" id="admin-edit-staff-pin" required pattern="[0-9]{4}" maxlength="4" inputmode="numeric" class="cr-input font-mono font-bold tracking-widest text-center pr-10" value="${staffData.staff.pin || ''}" />
                        <button type="button" id="toggle-admin-edit-pin" class="absolute right-2.5 p-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none" title="Toggle PIN visibility">
                          👁️
                        </button>
                      </div>
                    </div>
                  </div>
                  <button type="submit" id="admin-save-staff-btn" class="cr-btn cr-btn-primary w-full py-2 font-bold cursor-pointer shadow-sm">
                    Save Updated Credentials
                  </button>
                </form>
              </details>
            ` : `
              <!-- Create Single Staff Account Form -->
              <form id="admin-create-staff-form" class="space-y-3.5 text-xs">
                <div class="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 text-slate-700 dark:text-slate-300">
                  ⚠️ No common staff account exists. Create one below. All teachers and security staff will share this single account.
                </div>

                <div>
                  <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Staff Username</label>
                  <input type="text" id="admin-new-staff-username" required minlength="3" class="cr-input" placeholder="e.g. Staff2026 or campus_staff" />
                  <p class="text-[10px] text-slate-400 mt-0.5">Used by all staff members to log in.</p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Password</label>
                    <div class="relative flex items-center">
                      <input type="password" id="admin-new-staff-password" required minlength="4" class="cr-input pr-10" placeholder="••••••••" />
                      <button type="button" id="toggle-admin-new-password" class="absolute right-2.5 p-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none" title="Toggle password visibility">
                        👁️
                      </button>
                    </div>
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">4-Digit Security PIN</label>
                    <div class="relative flex items-center">
                      <input type="password" id="admin-new-staff-pin" required pattern="[0-9]{4}" maxlength="4" inputmode="numeric" class="cr-input font-mono font-bold tracking-widest text-center pr-10" placeholder="••••" />
                      <button type="button" id="toggle-admin-new-pin" class="absolute right-2.5 p-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none" title="Toggle PIN visibility">
                        👁️
                      </button>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-0.5">Used for quick phone unlocking.</p>
                  </div>
                </div>

                <button type="submit" id="admin-create-staff-submit-btn" class="cr-btn cr-btn-primary w-full py-2.5 font-bold cursor-pointer shadow-md mt-2">
                  ➕ Create Common Staff Account
                </button>
              </form>
            `}
          </div>

          <!-- ==================================================== -->
          <!-- WORK 2: Connected Devices Counter (Cols 8-12)         -->
          <!-- ==================================================== -->
          <div class="lg:col-span-5 cr-card p-5 sm:p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div class="flex items-center gap-2.5">
                  <div class="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl font-bold">
                    📱
                  </div>
                  <div>
                    <h2 class="text-base font-black text-slate-900 dark:text-white">2. Connected Devices</h2>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Active staff phone sessions.</p>
                  </div>
                </div>
                <button type="button" id="admin-refresh-devices-btn" class="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-1">
                  <span>🔄</span> <span>Live Ping</span>
                </button>
              </div>

              <!-- Prominent Counter Display -->
              <div class="mt-6 text-center py-6 px-4 rounded-3xl bg-gradient-to-tr from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-200/60 dark:border-purple-800/40">
                <div class="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center justify-center gap-1.5 mb-1">
                  <span class="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>
                  <span>Active Device Sessions</span>
                </div>
                <div id="admin-connected-devices-count" class="text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                  ${staffData.connectedDevices || 0}
                </div>
                <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2">
                  ${staffData.connectedDevices === 1 ? '1 device currently connected' : `${staffData.connectedDevices || 0} devices currently connected`}
                </div>
              </div>
            </div>

            <div class="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50">
              💡 Deleting the staff account from Work 1 will immediately terminate all ${staffData.connectedDevices || 0} active sessions across all devices.
            </div>
          </div>

        </div>

        <!-- ==================================================== -->
        <!-- WORK 3: Daily Logs Viewer (Identical to Staff Logs)   -->
        <!-- ==================================================== -->
        <div class="cr-card p-4 sm:p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          
          <!-- Section Title & Filter Bar -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-bold">
                📋
              </div>
              <div>
                <h2 class="text-base font-black text-slate-900 dark:text-white">3. Daily Log Register</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Complete transit audit trail for Vans, Drivers & Staff.</p>
              </div>
            </div>

            <!-- Date Picker & Filter Controls -->
            <div class="flex flex-wrap items-center gap-2">
              <input type="date" id="admin-log-date-picker" class="cr-input text-xs py-1.5 px-3 max-w-[150px] font-bold" value="${AdminDashboardPage.selectedDate}" />
              
              <!-- Entity Filter Tabs -->
              <div class="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
                <button type="button" id="admin-log-filter-all" class="px-2.5 py-1 rounded-lg ${AdminDashboardPage.activeFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}">
                  All (${logs.length})
                </button>
                <button type="button" id="admin-log-filter-driver" class="px-2.5 py-1 rounded-lg ${AdminDashboardPage.activeFilter === 'driver' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}">
                  🚌 Drivers
                </button>
                <button type="button" id="admin-log-filter-staff" class="px-2.5 py-1 rounded-lg ${AdminDashboardPage.activeFilter === 'staff' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}">
                  👔 Staff
                </button>
              </div>
            </div>
          </div>

          <!-- Transit Stats Summary -->
          <div class="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 text-center py-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div class="px-2">
              <div class="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">🟢 In Campus</div>
              <div class="text-2xl font-black text-slate-900 dark:text-white mt-0.5">${currentlyInside}</div>
            </div>
            <div class="px-2">
              <div class="text-[11px] font-bold uppercase text-blue-600 dark:text-blue-400">🔵 Gate Entries</div>
              <div class="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">${stats.entry || 0}</div>
            </div>
            <div class="px-2">
              <div class="text-[11px] font-bold uppercase text-purple-600 dark:text-purple-400">🟣 Gate Exits</div>
              <div class="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">${stats.exit || 0}</div>
            </div>
          </div>

          <!-- Logs Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th class="py-2.5 px-3">Time</th>
                  <th class="py-2.5 px-3">Entity</th>
                  <th class="py-2.5 px-3">Name / Label</th>
                  <th class="py-2.5 px-3">Vehicle Plate</th>
                  <th class="py-2.5 px-3">Event</th>
                  <th class="py-2.5 px-3">Gate Operator</th>
                </tr>
              </thead>
              <tbody id="admin-logs-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                ${AdminDashboardPage.renderLogRows(logs, AdminDashboardPage.activeFilter)}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    `;
  }

  static renderLogRows(logs, filter) {
    let filtered = logs;
    if (filter === 'driver') {
      filtered = logs.filter(l => l.entity_type === 'van' || (l.driver_label && !l.driver_label.startsWith('Staff')));
    } else if (filter === 'staff') {
      filtered = logs.filter(l => l.entity_type === 'staff' || (l.driver_label && l.driver_label.startsWith('Staff')));
    }

    if (!filtered || filtered.length === 0) {
      return `<tr><td colspan="6" class="py-8 text-center text-slate-400">No logs found for this date.</td></tr>`;
    }

    return filtered.map(l => {
      const isStaff = l.entity_type === 'staff' || (l.driver_label && l.driver_label.startsWith('Staff'));
      let badgeClass = 'cr-badge-pending';
      let badgeLabel = l.event_type.toUpperCase();

      if (l.event_type === 'entry') {
        badgeClass = 'cr-badge-approved';
        badgeLabel = '🟢 ENTRY';
      } else if (l.event_type === 'exit') {
        badgeClass = 'cr-badge-rejected';
        badgeLabel = '🔴 EXIT';
      }

      const timeStr = l.timestamp ? new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--';

      return `
        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
          <td class="py-2.5 px-3 font-mono text-[11px] text-slate-500">${timeStr}</td>
          <td class="py-2.5 px-3">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${isStaff ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'}">
              <span>${isStaff ? '👔' : '🚌'}</span>
              <span>${isStaff ? 'Staff' : 'Driver'}</span>
            </span>
          </td>
          <td class="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
            ${l.driver_name || l.driver_label}
            <div class="text-[10px] text-slate-400 font-normal font-mono">${l.driver_label}</div>
          </td>
          <td class="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 font-bold">
            ${l.van_no || 'Staff Pass'}
          </td>
          <td class="py-2.5 px-3">
            <span class="cr-badge ${badgeClass} text-[10px] font-black">${badgeLabel}</span>
          </td>
          <td class="py-2.5 px-3 text-slate-500 text-[11px]">${l.scanned_by || 'Gate Staff'}</td>
        </tr>
      `;
    }).join('');
  }

  static attachEvents() {
    // Eye toggles for PIN and Password visibility
    const setupEyeToggle = (btnId, inputId) => {
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
    setupEyeToggle('toggle-admin-new-password', 'admin-new-staff-password');
    setupEyeToggle('toggle-admin-new-pin', 'admin-new-staff-pin');
    setupEyeToggle('toggle-admin-edit-password', 'admin-edit-staff-password');
    setupEyeToggle('toggle-admin-edit-pin', 'admin-edit-staff-pin');

    // 1. Reveal PIN Toggle
    const pinBtn = document.getElementById('admin-toggle-pin-btn');
    const pinDisplay = document.getElementById('admin-staff-pin-display');
    if (pinBtn && pinDisplay) {
      pinBtn.onclick = () => {
        const pin = pinBtn.getAttribute('data-pin');
        const isHidden = pinDisplay.textContent.includes('•');
        pinDisplay.textContent = isHidden ? pin : '••••';
        pinBtn.textContent = isHidden ? 'Hide PIN' : 'Show PIN';
      };
    }

    // 2. Create Staff Account Form
    const createForm = document.getElementById('admin-create-staff-form');
    if (createForm) {
      createForm.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('admin-new-staff-username').value.trim();
        const password = document.getElementById('admin-new-staff-password').value;
        const pin = document.getElementById('admin-new-staff-pin').value.trim();
        const btn = document.getElementById('admin-create-staff-submit-btn');

        if (!/^\d{4}$/.test(pin)) {
          return window.showToast('Security PIN must be exactly 4 numeric digits (e.g. 1234)', 'error');
        }

        btn.disabled = true;
        btn.textContent = 'Creating Account...';

        try {
          await window.api.request('/api/admin/staff-account', {
            method: 'POST',
            body: JSON.stringify({ username, password, pin, displayName: 'Campus Staff Desk' })
          });
          window.showToast(`Common Staff account @${username} created with PIN ${pin}!`, 'success');
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = '➕ Create Common Staff Account';
        }
      };
    }

    // 3. Update Staff Account Form
    const updateForm = document.getElementById('admin-update-staff-form');
    if (updateForm) {
      updateForm.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('admin-edit-staff-username').value.trim();
        const password = document.getElementById('admin-edit-staff-password').value;
        const pin = document.getElementById('admin-edit-staff-pin').value.trim();
        const btn = document.getElementById('admin-save-staff-btn');

        if (!/^\d{4}$/.test(pin)) {
          return window.showToast('Security PIN must be exactly 4 numeric digits (e.g. 1234)', 'error');
        }

        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
          await window.api.request('/api/admin/staff-account', {
            method: 'POST',
            body: JSON.stringify({ username, password, pin, displayName: 'Campus Staff Desk' })
          });
          window.showToast('Staff credentials updated successfully!', 'success');
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Save Updated Credentials';
        }
      };
    }

    // 4. Delete Staff Account
    const deleteBtn = document.getElementById('admin-delete-staff-btn');
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        if (!confirm('Are you sure you want to delete the common staff account? This will immediately disconnect and log out all connected staff devices.')) {
          return;
        }

        deleteBtn.disabled = true;
        try {
          await window.api.request('/api/admin/staff-account', { method: 'DELETE' });
          window.showToast('Common Staff account deleted and all sessions disconnected.', 'info');
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          deleteBtn.disabled = false;
        }
      };
    }

    // 5. Refresh Devices Counter
    const refreshDevBtn = document.getElementById('admin-refresh-devices-btn');
    const devCountEl = document.getElementById('admin-connected-devices-count');
    if (refreshDevBtn && devCountEl) {
      refreshDevBtn.onclick = async () => {
        refreshDevBtn.classList.add('animate-spin');
        try {
          const res = await window.api.request('/api/admin/staff-account');
          devCountEl.textContent = res.connectedDevices || 0;
          window.showToast(`Refreshed: ${res.connectedDevices || 0} active staff sessions connected.`, 'info');
        } catch (e) {
          window.showToast(e.message, 'error');
        } finally {
          setTimeout(() => refreshDevBtn.classList.remove('animate-spin'), 600);
        }
      };
    }

    // 6. Refresh All Button
    const refreshAllBtn = document.getElementById('admin-refresh-all-btn');
    if (refreshAllBtn) {
      refreshAllBtn.onclick = () => window.location.reload();
    }

    // 7. Date picker for logs
    const datePicker = document.getElementById('admin-log-date-picker');
    if (datePicker) {
      datePicker.onchange = async () => {
        AdminDashboardPage.selectedDate = datePicker.value;
        try {
          const logsRes = await window.api.request(`/api/logs?date=${AdminDashboardPage.selectedDate}&limit=200`);
          AdminDashboardPage.currentLogs = logsRes.logs || [];
          const tbody = document.getElementById('admin-logs-tbody');
          if (tbody) {
            tbody.innerHTML = AdminDashboardPage.renderLogRows(AdminDashboardPage.currentLogs, AdminDashboardPage.activeFilter);
          }
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      };
    }

    // 8. Log filter buttons
    const filterAllBtn = document.getElementById('admin-log-filter-all');
    const filterDriverBtn = document.getElementById('admin-log-filter-driver');
    const filterStaffBtn = document.getElementById('admin-log-filter-staff');
    const tbody = document.getElementById('admin-logs-tbody');

    const updateFilterUi = (active) => {
      AdminDashboardPage.activeFilter = active;
      const buttons = [
        { el: filterAllBtn, key: 'all' },
        { el: filterDriverBtn, key: 'driver' },
        { el: filterStaffBtn, key: 'staff' }
      ];
      buttons.forEach(b => {
        if (!b.el) return;
        if (b.key === active) {
          b.el.className = 'px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm';
        } else {
          b.el.className = 'px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-900';
        }
      });
      if (tbody) {
        tbody.innerHTML = AdminDashboardPage.renderLogRows(AdminDashboardPage.currentLogs, active);
      }
    };

    if (filterAllBtn) filterAllBtn.onclick = () => updateFilterUi('all');
    if (filterDriverBtn) filterDriverBtn.onclick = () => updateFilterUi('driver');
    if (filterStaffBtn) filterStaffBtn.onclick = () => updateFilterUi('staff');
  }
}

window.AdminDashboardPage = AdminDashboardPage;
