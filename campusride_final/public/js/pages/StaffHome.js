// CampusRide — Staff Gate Coordinator Dashboard (§4.1, §8.4)
class StaffHomePage {
  static async render(user) {
    let logs = [];
    let stats = { entry: 0, exit: 0 };
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await window.api.request(`/api/logs?date=${today}&limit=8`);
      logs = res.logs || [];
      stats = res.stats || { entry: 0, exit: 0 };
    } catch {}

    const currentlyInside = Math.max(0, (stats.entry || 0) - (stats.exit || 0));

    return `
      <div class="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <!-- Hero Gate Banner -->
        <div class="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Gate 1 Dispatch & Entry/Exit Control
            </div>
            <h1 class="text-2xl sm:text-3xl font-black">Gate Operations Center</h1>
            <p class="text-xs sm:text-sm text-blue-100 mt-1 max-w-xl">
              Scan pass QR codes to timestamp vehicle entries/exits with automatic parent notifications and register incoming vehicles or staff.
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <a href="#/entry-exit-scanner" class="cr-btn bg-white text-blue-900 hover:bg-blue-50 font-bold px-5 py-3 shadow-lg">
              📷 Open Gate Scanner
            </a>
            <a href="#/registration-scanner" class="cr-btn bg-blue-900/60 hover:bg-blue-900/80 text-white border border-white/20 px-4 py-3">
              📝 Register Driver / Staff
            </a>
          </div>
        </div>

        <!-- Metric Counter Tiles -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="cr-card p-5 border-l-4 border-l-emerald-500">
            <div class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Inside Campus Now</div>
            <div class="text-3xl font-black text-slate-900 dark:text-white mt-1 flex items-baseline gap-2">
              <span>${currentlyInside}</span>
              <span class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">vehicles active</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Calculated via alternating entry/exit scans</p>
          </div>

          <div class="cr-card p-5 border-l-4 border-l-blue-500">
            <div class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Today's Entries</div>
            <div class="text-3xl font-black text-slate-900 dark:text-white mt-1 flex items-baseline gap-2">
              <span>${stats.entry || 0}</span>
              <span class="text-xs font-semibold text-blue-600 dark:text-blue-400">logged</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Parents alerted upon campus check-in</p>
          </div>

          <div class="cr-card p-5 border-l-4 border-l-purple-500">
            <div class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Today's Exits</div>
            <div class="text-3xl font-black text-slate-900 dark:text-white mt-1 flex items-baseline gap-2">
              <span>${stats.exit || 0}</span>
              <span class="text-xs font-semibold text-purple-600 dark:text-purple-400">logged</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Safety alerts auto-cleared upon exit</p>
          </div>
        </div>

        <!-- Quick Access Feature Grid -->
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
