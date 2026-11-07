// CampusRide — Staff Gate Coordinator Dashboard (§4.1, §8.4)
class StaffHomePage {
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
    let stats = { entry: 0, exit: 0 };
    let driverCount = 0;
    let parentCount = 0;

    // 1. Instant Device-First Load from phone storage
    const localData = StaffHomePage.getDeviceStaffData(user.id);
    if (localData) {
      logs = localData.logs || [];
      stats = localData.stats || { entry: 0, exit: 0 };
      driverCount = localData.driverCount || 0;
      parentCount = localData.parentCount || 0;
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      const [logsRes, dRes, pRes] = await Promise.all([
        window.api.request(`/api/logs?date=${today}&limit=8`),
        window.api.request('/api/drivers'),
        window.api.request('/api/directories/parents')
      ]);
      logs = logsRes.logs || [];
      stats = logsRes.stats || { entry: 0, exit: 0 };
      driverCount = (dRes.drivers || []).length;
      parentCount = (pRes.parents || []).length;

      // Save to this device's storage permanently
      StaffHomePage.saveDeviceStaffData(user.id, { logs, stats, driverCount, parentCount });
    } catch {
      // Offline fallback: already loaded from phone's local storage
    }

    const currentlyInside = Math.max(0, (stats.entry || 0) - (stats.exit || 0));

    return `
      <div class="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <!-- Compact Gate Transit Status Table (No scrolling needed) -->
        <div class="cr-card p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
          <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 class="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Gate Activity Today</h2>
            </div>
            <span class="text-[11px] font-semibold text-slate-400">Live Scans</span>
          </div>
          <div class="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 text-center">
            <div class="px-2 py-1">
              <div class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                <span>🟢</span> In Campus
              </div>
              <div class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">${currentlyInside}</div>
              <div class="text-[10px] text-slate-400 hidden sm:block">vehicles active</div>
            </div>
            <div class="px-2 py-1">
              <div class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1">
                <span>🔵</span> Entries
              </div>
              <div class="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">${stats.entry || 0}</div>
              <div class="text-[10px] text-slate-400 hidden sm:block">logged today</div>
            </div>
            <div class="px-2 py-1">
              <div class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center justify-center gap-1">
                <span>🟣</span> Exits
              </div>
              <div class="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">${stats.exit || 0}</div>
              <div class="text-[10px] text-slate-400 hidden sm:block">logged today</div>
            </div>
          </div>
        </div>

        <!-- COMBINED SINGLE OPTION: Parents & Drivers Accounts Directory -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-black text-slate-900 dark:text-white">Registered Accounts Directory</h2>
            <span class="text-xs text-slate-400">Gate registry view</span>
          </div>

          <a href="#/directories" class="cr-card p-5 no-underline text-inherit border-2 border-transparent hover:border-indigo-500 transition group flex items-center justify-between shadow-sm hover:shadow-md">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-3xl group-hover:scale-110 transition shadow-sm shrink-0">
                👥
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-base text-slate-900 dark:text-white">Parent / Driver Accounts Directory</h3>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    ${driverCount + parentCount} Total
                  </span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tap to view all registered Parent accounts and Driver vehicle passes. Toggle between them inside.
                </p>
                <div class="flex items-center gap-3 mt-2 text-xs font-semibold">
                  <span class="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <span>🚌</span> ${driverCount} Drivers
                  </span>
                  <span class="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <span>👨‍👩‍👧</span> ${parentCount} Parents
                  </span>
                </div>
              </div>
            </div>
            <div class="text-indigo-600 dark:text-indigo-400 font-black text-2xl group-hover:translate-x-1.5 transition ml-2">
              →
            </div>
          </a>
        </div>

        <!-- Quick Access Feature Grid (4 Single Cards, No Duplicates) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a href="#/entry-exit-scanner" class="cr-card p-5 no-underline text-inherit group hover:border-blue-500 transition">
            <div class="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition">
              📷
            </div>
            <h3 class="font-bold text-base text-slate-900 dark:text-white mb-1">Pass Scanner</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Scan CAMPUSRIDE driver pass QRs with alternation check.</p>
          </a>

          <a href="#/registration-scanner" class="cr-card p-5 no-underline text-inherit group hover:border-emerald-500 transition">
            <div class="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition">
              📝
            </div>
            <h3 class="font-bold text-base text-slate-900 dark:text-white mb-1">Register Driver / Staff</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Fill details or scan QR code to issue immediate passes.</p>
          </a>

          <a href="#/live-map" class="cr-card p-5 no-underline text-inherit group hover:border-indigo-500 transition">
            <div class="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition">
              🗺️
            </div>
            <h3 class="font-bold text-base text-slate-900 dark:text-white mb-1">Fleet on Google Maps</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">View real-time fleet GPS coordinates and track on Google Maps.</p>
          </a>

          <a href="#/van-register" class="cr-card p-5 no-underline text-inherit group hover:border-amber-500 transition">
            <div class="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition">
              📋
            </div>
            <h3 class="font-bold text-base text-slate-900 dark:text-white mb-1">Daily Log Register</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Filter daily entry/exit audit logs by van and date.</p>
          </a>
        </div>

        <!-- Recent Gate Scans Stream -->
        <div class="cr-card p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="text-xl">⏱️</span>
              <h2 class="font-bold text-base text-slate-900 dark:text-white">Recent Gate Activity Log</h2>
            </div>
            <a href="#/van-register" class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              View Complete Register →
            </a>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th class="py-2.5">Time</th>
                  <th class="py-2.5">Vehicle / Staff</th>
                  <th class="py-2.5">Driver Name</th>
                  <th class="py-2.5">Event</th>
                  <th class="py-2.5">Gate Operator</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                ${logs.length === 0 ? `
                  <tr><td colspan="5" class="py-8 text-center text-slate-400">No gate activity logged yet today.</td></tr>
                ` : logs.map(l => `
                  <tr>
                    <td class="py-3 font-mono font-medium text-slate-600 dark:text-slate-300">
                      ${new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td class="py-3 font-bold text-slate-900 dark:text-white">${l.driver_label || 'Vehicle'}</td>
                    <td class="py-3 text-slate-600 dark:text-slate-300">${l.driver_name || 'Driver'}</td>
                    <td class="py-3">
                      <span class="cr-badge ${l.event_type === 'entry' ? 'cr-badge-approved' : l.event_type === 'exit' ? 'cr-badge-rejected' : 'cr-badge-pending'} text-[10px]">
                        ${l.event_type.toUpperCase()}
                      </span>
                    </td>
                    <td class="py-3 text-slate-500">${l.scanned_by || 'Gate Staff'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  static attachEvents() {}
}

window.StaffHomePage = StaffHomePage;
