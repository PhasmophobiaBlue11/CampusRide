// CampusRide — Staff Gate Coordinator Dashboard (§4.1, §8.4)
class StaffHomePage {
  static dashboardLogs = [];
  static activeFilter = 'all'; // 'all' | 'driver' | 'staff'
  static activeCategory = 'all'; // 'all' | 'entry_exit' | 'journey'

  // Device-First storage for gate staff
  static getDeviceStaffData(userId) {
    if (!userId) return null;
    try {
      const d = localStorage.getItem(`campusride_device_staff_data_${userId}`);
      return d ? JSON.parse(d) : null;
    } catch {
      return null;
    }
  }

  static saveDeviceStaffData(userId, data) {
    if (!userId || !data) return;
    try {
      localStorage.setItem(`campusride_device_staff_data_${userId}`, JSON.stringify(data));
    } catch {}
  }

  static async render(user) {
    let logs = [];
    let stats = { entry: 0, exit: 0, driver: { inside: 0, entry: 0, exit: 0 }, staff: { inside: 0, entry: 0, exit: 0 } };
    let driverCount = 0;
    let parentCount = 0;
    let staffCount = 0;

    // 1. Instant Device-First Load from phone storage
    const localData = StaffHomePage.getDeviceStaffData(user.id);
    if (localData) {
      logs = localData.logs || [];
      stats = localData.stats || stats;
      driverCount = localData.driverCount || 0;
      parentCount = localData.parentCount || 0;
      staffCount = localData.staffCount || 0;
      StaffHomePage.dashboardLogs = logs;
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      const [logsRes, dRes, pRes] = await Promise.all([
        window.api.request(`/api/logs?date=${today}&limit=50`),
        window.api.request('/api/drivers'),
        window.api.request('/api/directories/parents')
      ]);
      logs = logsRes.logs || [];
      stats = logsRes.stats || stats;
      StaffHomePage.dashboardLogs = logs;

      const allDrivers = dRes.drivers || [];
      driverCount = allDrivers.filter(d => d.type === 'van').length;
      staffCount = allDrivers.filter(d => d.type === 'staff').length;
      parentCount = (pRes.parents || []).length;

      // Save to this device's storage permanently
      StaffHomePage.saveDeviceStaffData(user.id, { logs, stats, driverCount, parentCount, staffCount });
    } catch {
      // Offline fallback: already loaded from phone's local storage
    }

    const driverInside = stats.driver ? (stats.driver.inside || 0) : Math.max(0, (stats.entry || 0) - (stats.exit || 0));
    const staffInside = stats.staff ? (stats.staff.inside || 0) : 0;
    const currentlyInside = driverInside + staffInside;

    return `
      <div class="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-fade-in-up">
        <!-- Gate Transit Status Summary -->
        <div class="cr-card p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
          <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 class="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Gate Activity Today</h2>
            </div>
            <div class="flex items-center gap-2 text-[11px] font-semibold">
              <span class="text-amber-600 dark:text-amber-400 font-bold">🚌 ${driverInside} Vans inside</span>
              <span class="text-slate-300 dark:text-slate-700">|</span>
              <span class="text-emerald-600 dark:text-emerald-400 font-bold">👔 ${staffInside} Staff inside</span>
            </div>
          </div>
          <div class="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 text-center">
            <div class="px-2 py-1">
              <div class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                <span>🟢</span> In Campus
              </div>
              <div class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">${currentlyInside}</div>
              <div class="text-[10px] text-slate-400 hidden sm:block">active on campus</div>
            </div>
            <div class="px-2 py-1">
              <div class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1">
                <span>🔵</span> Entries
              </div>
              <div class="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">${stats.entry || 0}</div>
              <div class="text-[10px] text-slate-400 hidden sm:block">gate arrivals</div>
            </div>
            <div class="px-2 py-1">
              <div class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center justify-center gap-1">
                <span>🟣</span> Exits
              </div>
              <div class="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">${stats.exit || 0}</div>
              <div class="text-[10px] text-slate-400 hidden sm:block">gate departures</div>
            </div>
          </div>
        </div>

        <!-- 3-WAY DIRECTORY CARD: Parents, Drivers, and Staff -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-black text-slate-900 dark:text-white">Campus Directory</h2>
            <span class="text-xs text-slate-400">Registry directory view</span>
          </div>

          <a href="#/directories" class="cr-card p-5 no-underline text-inherit border-2 border-transparent hover:border-indigo-500 transition group flex items-center justify-between shadow-sm hover:shadow-md">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-3xl group-hover:scale-110 transition shadow-sm shrink-0">
                👥
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-base text-slate-900 dark:text-white">Campus Directory</h3>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    ${driverCount + parentCount + staffCount} Total
                  </span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Browse registered Parents, transport Drivers, and personally added Staff passes.
                </p>
                <div class="flex items-center gap-3 mt-2 text-xs font-semibold">
                  <span class="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <span>👨‍👩‍👧</span> ${parentCount} Parents
                  </span>
                  <span class="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <span>🚌</span> ${driverCount} Drivers
                  </span>
                  <span class="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span>👔</span> ${staffCount} Staff
                  </span>
                </div>
              </div>
            </div>
            <div class="text-indigo-600 dark:text-indigo-400 font-black text-2xl group-hover:translate-x-1.5 transition ml-2">
              →
            </div>
          </a>
        </div>

        <!-- Quick Access Feature Grid (4 Core Cards: Pass Scanner, My Gate Pass, Working Staffs, Daily Log Register) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a href="#/entry-exit-scanner" class="cr-card p-5 no-underline text-inherit group hover:border-blue-500 transition">
            <div class="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition">
              📷
            </div>
            <h3 class="font-bold text-base text-slate-900 dark:text-white mb-1">Pass Scanner</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Scan driver and staff pass QRs with auto-alternation check.</p>
          </a>

          <button type="button" id="staff-show-my-pass-btn" class="cr-card p-5 no-underline text-left text-inherit group hover:border-emerald-500 transition cursor-pointer select-none">
            <div class="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition">
              🎟️
            </div>
            <h3 class="font-bold text-base text-slate-900 dark:text-white mb-1">My Gate Pass</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Display your personal entry/exit pass QR code.</p>
          </button>

          <a href="#/working-staff" class="cr-card p-5 no-underline text-inherit group hover:border-emerald-500 transition">
            <div class="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition">
              👔
            </div>
            <h3 class="font-bold text-base text-slate-900 dark:text-white mb-1">Working Staffs</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">View all account-based gate staff, security personnel, and active operators.</p>
          </a>

          <a href="#/van-register" class="cr-card p-5 no-underline text-inherit group hover:border-amber-500 transition">
            <div class="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition">
              📋
            </div>
            <h3 class="font-bold text-base text-slate-900 dark:text-white mb-1">Daily Log Register</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Separated audit logs for Drivers & Staff (Entry/Exit and Journeys).</p>
          </a>
        </div>

        <!-- Recent Activity Stream with Entity Filter Tabs -->
        <div class="cr-card p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div class="flex items-center gap-2">
              <span class="text-xl">⏱️</span>
              <h2 class="font-bold text-base text-slate-900 dark:text-white">Recent Activity Stream</h2>
            </div>

            <!-- Quick Filter Tabs on Dashboard -->
            <div class="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
              <button type="button" id="dash-filter-all" class="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm transition">
                All
              </button>
              <button type="button" id="dash-filter-driver" class="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 transition">
                🚌 Drivers
              </button>
              <button type="button" id="dash-filter-staff" class="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 transition">
                👔 Staff
              </button>
            </div>

            <a href="#/van-register" class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              View Complete Register →
            </a>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th class="py-2.5 px-2">Time</th>
                  <th class="py-2.5 px-2">Entity</th>
                  <th class="py-2.5 px-2">Name</th>
                  <th class="py-2.5 px-2">Event</th>
                  <th class="py-2.5 px-2">Gate / Operator</th>
                </tr>
              </thead>
              <tbody id="dash-recent-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                ${StaffHomePage.renderDashboardRows(logs, 'all')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  static renderDashboardRows(logs, filter) {
    let filtered = logs;
    if (filter === 'driver') {
      filtered = logs.filter(l => l.entity_type === 'van' || (l.driver_label && !l.driver_label.startsWith('Staff')));
    } else if (filter === 'staff') {
      filtered = logs.filter(l => l.entity_type === 'staff' || (l.driver_label && l.driver_label.startsWith('Staff')));
    }

    if (!filtered || filtered.length === 0) {
      return `<tr><td colspan="5" class="py-8 text-center text-slate-400">No activity logged yet today.</td></tr>`;
    }

    return filtered.slice(0, 10).map(l => {
      const isStaff = l.entity_type === 'staff' || (l.driver_label && l.driver_label.startsWith('Staff'));
      let badgeClass = 'cr-badge-pending';
      let badgeLabel = l.event_type.toUpperCase();

      if (l.event_type === 'entry') {
        badgeClass = 'cr-badge-approved';
        badgeLabel = '🟢 ENTRY';
      } else if (l.event_type === 'exit') {
        badgeClass = 'cr-badge-rejected';
        badgeLabel = '🟣 EXIT';
      } else if (l.event_type === 'journey_start') {
        badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300';
        badgeLabel = '🚀 JOURNEY START';
      } else if (l.event_type === 'journey_end') {
        badgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300';
        badgeLabel = '🏁 JOURNEY END';
      }

      return `
        <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
          <td class="py-3 px-2 font-mono font-medium text-slate-600 dark:text-slate-300">
            ${new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </td>
          <td class="py-3 px-2">
            <span class="px-2 py-0.5 rounded-md font-mono font-bold text-xs ${isStaff ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'}">
              ${l.driver_label || (isStaff ? 'Staff' : 'Vehicle')}
            </span>
          </td>
          <td class="py-3 px-2 font-bold text-slate-900 dark:text-white">
            ${l.driver_name || (isStaff ? 'Staff Member' : 'Driver')}
          </td>
          <td class="py-3 px-2">
            <span class="cr-badge ${badgeClass} text-[10px]">
              ${badgeLabel}
            </span>
          </td>
          <td class="py-3 px-2 text-slate-500">${l.scanned_by || 'Gate Staff'}</td>
        </tr>
      `;
    }).join('');
  }

  static attachEvents() {
    const btnAll = document.getElementById('dash-filter-all');
    const btnDriver = document.getElementById('dash-filter-driver');
    const btnStaff = document.getElementById('dash-filter-staff');
    const tbody = document.getElementById('dash-recent-tbody');

    const updateBtns = (active) => {
      [btnAll, btnDriver, btnStaff].forEach(b => {
        if (b) b.className = 'px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 transition';
      });
      if (active) active.className = 'px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm transition font-bold';
    };

    if (btnAll) {
      btnAll.onclick = () => {
        updateBtns(btnAll);
        if (tbody) tbody.innerHTML = StaffHomePage.renderDashboardRows(StaffHomePage.dashboardLogs, 'all');
      };
    }

    if (btnDriver) {
      btnDriver.onclick = () => {
        updateBtns(btnDriver);
        if (tbody) tbody.innerHTML = StaffHomePage.renderDashboardRows(StaffHomePage.dashboardLogs, 'driver');
      };
    }

    if (btnStaff) {
      btnStaff.onclick = () => {
        updateBtns(btnStaff);
        if (tbody) tbody.innerHTML = StaffHomePage.renderDashboardRows(StaffHomePage.dashboardLogs, 'staff');
      };
    }

    const myPassBtn = document.getElementById('staff-show-my-pass-btn');
    if (myPassBtn) {
      myPassBtn.onclick = () => {
        if (typeof window.showPassModal === 'function') {
          window.showPassModal({
            id: user.id,
            label: 'Staff Pass',
            name: user.display_name || user.email,
            plate: 'Gate Security',
            phone: user.phone || '',
            type: 'staff'
          });
        }
      };
    }
  }
}

window.StaffHomePage = StaffHomePage;
