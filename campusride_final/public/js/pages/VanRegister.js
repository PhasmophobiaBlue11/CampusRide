// CampusRide — Daily Van & Staff Entry/Exit Register (§7.6)
class VanRegisterPage {
  static async render() {
    let drivers = [];
    try {
      const res = await window.api.request('/api/drivers');
      drivers = res.drivers || [];
    } catch {}

    const today = new Date().toISOString().slice(0, 10);

    return `
      <div class="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <!-- Back Button -->
        <div>
          <button type="button" onclick="window.goBack()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <span class="text-base font-black">←</span> <span>Back</span>
          </button>
        </div>

        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white">Daily Entry & Exit Register</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Audit log of all timestamped vehicle campus movements.</p>
          </div>
          <div class="flex items-center gap-2">
            <button id="clear-day-logs-btn" class="cr-btn cr-btn-secondary text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs py-2 px-3">
              🗑️ Clear Day's Logs
            </button>
          </div>
        </div>

        <!-- Filters Bar (§7.6) -->
        <div class="cr-card p-4 flex flex-wrap items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Filter Vehicle / Staff</label>
              <select id="filter-driver-select" class="cr-input py-1.5 px-3 text-xs">
                <option value="">All Vehicles & Staff</option>
                ${drivers.map(d => `<option value="${d.id}">${d.label} — ${d.driver_name} (${d.van_no})</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Select Date</label>
              <input type="date" id="filter-date-input" value="${today}" class="cr-input py-1.5 px-3 text-xs" />
            </div>
          </div>

          <!-- Counter pills -->
          <div class="flex items-center gap-2 text-xs">
            <span class="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 font-bold">
              Entries: <span id="reg-count-entry">0</span>
            </span>
            <span class="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 font-bold">
              Exits: <span id="reg-count-exit">0</span>
            </span>
          </div>
        </div>

        <!-- Table Container -->
        <div class="cr-card p-6">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th class="py-2.5">Timestamp</th>
                  <th class="py-2.5">Pass Label</th>
                  <th class="py-2.5">Driver / Staff Member</th>
                  <th class="py-2.5">Event Type</th>
                  <th class="py-2.5">Gate Operator</th>
                  <th class="py-2.5">Pass Status</th>
                </tr>
              </thead>
              <tbody id="logs-table-body" class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr><td colspan="6" class="py-8 text-center text-slate-400">Loading audit logs...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  static attachEvents() {
    const driverSelect = document.getElementById('filter-driver-select');
    const dateInput = document.getElementById('filter-date-input');
    const clearBtn = document.getElementById('clear-day-logs-btn');

    const reload = () => VanRegisterPage.loadLogs(driverSelect?.value, dateInput?.value);

    if (driverSelect) driverSelect.onchange = reload;
    if (dateInput) dateInput.onchange = reload;

    if (clearBtn) {
      clearBtn.onclick = async () => {
        const date = dateInput?.value;
        const driverId = driverSelect?.value;
        if (!confirm(`Are you sure you want to clear logs for ${date}${driverId ? ' and selected driver' : ' (all drivers)'}?`)) return;

        try {
          let url = `/api/logs?date=${date}`;
          if (driverId) url += `&driverId=${driverId}`;
          await window.api.request(url, { method: 'DELETE' });
          window.showToast('Daily audit logs cleared', 'info');
          reload();
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      };
    }

    reload();
  }

  static async loadLogs(driverId, date) {
    const tbody = document.getElementById('logs-table-body');
    const entrySpan = document.getElementById('reg-count-entry');
    const exitSpan = document.getElementById('reg-count-exit');

    try {
      let url = `/api/logs?limit=500`;
      if (driverId) url += `&driverId=${driverId}`;
      if (date) url += `&date=${date}`;

      const res = await window.api.request(url);
      const logs = res.logs || [];
      const stats = res.stats || { entry: 0, exit: 0 };

      if (entrySpan) entrySpan.textContent = stats.entry || 0;
      if (exitSpan) exitSpan.textContent = stats.exit || 0;

      if (!tbody) return;

      if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-slate-400">No logs found for this date/vehicle.</td></tr>`;
        return;
      }

      tbody.innerHTML = logs.map(l => `
        <tr>
          <td class="py-3 font-mono font-medium text-slate-600 dark:text-slate-300">
            ${new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </td>
          <td class="py-3 font-bold text-slate-900 dark:text-white">${l.driver_label || 'Vehicle'}</td>
          <td class="py-3 text-slate-700 dark:text-slate-200">${l.driver_name || 'Driver'}</td>
          <td class="py-3">
            <span class="cr-badge ${l.event_type === 'entry' ? 'cr-badge-approved' : l.event_type === 'exit' ? 'cr-badge-rejected' : 'cr-badge-pending'} text-[10px]">
              ${l.event_type.toUpperCase()}
            </span>
          </td>
          <td class="py-3 text-slate-500">${l.scanned_by || 'Gate Officer'}</td>
          <td class="py-3"><span class="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">✓ Verified Pass</span></td>
        </tr>
      `).join('');
    } catch (e) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-rose-500">Failed to load logs.</td></tr>`;
    }
  }
}

window.VanRegisterPage = VanRegisterPage;
