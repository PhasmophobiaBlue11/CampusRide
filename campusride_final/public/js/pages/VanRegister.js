// CampusRide — Daily Log & Transit Register (Separated Driver & Staff, Entry/Exit & Journey)
class VanRegisterPage {
  static activeEntity = 'driver'; // 'driver' | 'staff'
  static activeCategory = 'entry_exit'; // 'entry_exit' | 'journey' | 'all'
  static allDrivers = [];
  static currentLogs = [];

  static async render(user) {
    let drivers = [];
    try {
      const res = await window.api.request('/api/drivers');
      drivers = res.drivers || [];
      VanRegisterPage.allDrivers = drivers;
    } catch {}

    const today = new Date().toISOString().slice(0, 10);
    const entity = VanRegisterPage.activeEntity || 'driver';
    const category = VanRegisterPage.activeCategory || 'entry_exit';

    const driverList = drivers.filter(d => d.type === 'van');
    const staffList = drivers.filter(d => d.type === 'staff');

    return `
      <div class="max-w-6xl mx-auto px-4 py-6 space-y-5 animate-fade-in-up">
        <!-- Back Navigation & Page Actions -->
        <div class="flex items-center justify-between">
          <button type="button" onclick="window.goBack()" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <span class="text-base font-black">←</span> <span>Back</span>
          </button>

          <div class="flex items-center gap-2">
            <button id="print-register-btn" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-slate-700 cursor-pointer">
              <span>🖨️</span> <span>Print Register</span>
            </button>
            <button id="clear-day-logs-btn" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition border border-rose-200 dark:border-rose-900/50 cursor-pointer">
              <span>🗑️</span> <span>Clear View Logs</span>
            </button>
          </div>
        </div>

        <!-- Page Header -->
        <div class="space-y-1">
          <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span>📋</span> <span>Daily Log Register</span>
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Dedicated audit registers for Drivers & Staff. Choose an entity and view Entry/Exit and Journey records separately.
          </p>
        </div>

        <!-- PRIMARY ENTITY SELECTOR: DRIVER vs STAFF -->
        <div class="grid grid-cols-2 gap-3 sm:gap-4">
          <!-- Driver Tab Button -->
          <button type="button" id="entity-tab-driver" class="p-3.5 sm:p-4 rounded-2xl border-2 transition text-left cursor-pointer flex items-center justify-between shadow-sm ${entity === 'driver' ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'}">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-xl ${entity === 'driver' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'} flex items-center justify-center text-xl shrink-0">
                🚌
              </div>
              <div>
                <div class="text-sm sm:text-base font-black ${entity === 'driver' ? 'text-amber-900 dark:text-amber-300' : 'text-slate-900 dark:text-white'}">
                  Driver Logs
                </div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400">
                  Van fleet & transport routes
                </div>
              </div>
            </div>
            <div class="text-right">
              <span id="tab-driver-total-badge" class="px-2.5 py-1 rounded-full text-xs font-bold ${entity === 'driver' ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}">
                ${driverList.length} Vans
              </span>
            </div>
          </button>

          <!-- Staff Tab Button -->
          <button type="button" id="entity-tab-staff" class="p-3.5 sm:p-4 rounded-2xl border-2 transition text-left cursor-pointer flex items-center justify-between shadow-sm ${entity === 'staff' ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'}">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-xl ${entity === 'staff' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'} flex items-center justify-center text-xl shrink-0">
                👔
              </div>
              <div>
                <div class="text-sm sm:text-base font-black ${entity === 'staff' ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}">
                  Staff Logs
                </div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400">
                  Gate security & employee passes
                </div>
              </div>
            </div>
            <div class="text-right">
              <span id="tab-staff-total-badge" class="px-2.5 py-1 rounded-full text-xs font-bold ${entity === 'staff' ? 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}">
                ${staffList.length} Staff
              </span>
            </div>
          </button>
        </div>

        <!-- SECONDARY CATEGORY TOGGLE: ENTRY/EXIT vs JOURNEY vs ALL -->
        <div class="cr-card p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold overflow-x-auto">
              <button type="button" id="cat-tab-entry-exit" class="px-3.5 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${category === 'entry_exit' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}">
                <span>🚪</span> <span>Gate Entry & Exit Logs</span>
                <span id="badge-count-gate" class="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-600 font-mono">0</span>
              </button>

              <button type="button" id="cat-tab-journey" class="px-3.5 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${category === 'journey' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}">
                <span>🚀</span> <span>Journey & Transit Logs</span>
                <span id="badge-count-journey" class="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-600 font-mono">0</span>
              </button>

              <button type="button" id="cat-tab-all" class="px-3.5 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${category === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white font-black' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}">
                <span>📋</span> <span>All Activity</span>
                <span id="badge-count-all" class="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-600 font-mono">0</span>
              </button>
            </div>

            <!-- Dynamic Entity Status Text -->
            <div id="active-mode-indicator" class="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>Showing:</span>
              <span id="mode-text-bold" class="font-bold text-slate-900 dark:text-white">
                ${entity === 'driver' ? '🚌 Drivers' : '👔 Staff'} — ${category === 'entry_exit' ? 'Gate Entry/Exit' : category === 'journey' ? 'Journeys' : 'All Logs'}
              </span>
            </div>
          </div>
        </div>

        <!-- STATS METRIC PILLS (Dynamic for Active Category & Entity) -->
        <div id="stats-banner" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <!-- Stat 1 -->
          <div class="cr-card p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div class="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <span>🟢</span> <span id="stat-label-1">Inside Campus</span>
            </div>
            <div id="stat-val-1" class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">0</div>
            <div id="stat-sub-1" class="text-[10px] text-slate-400">current active</div>
          </div>

          <!-- Stat 2 -->
          <div class="cr-card p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div class="text-[10px] sm:text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
              <span>🔵</span> <span id="stat-label-2">Total Entries</span>
            </div>
            <div id="stat-val-2" class="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">0</div>
            <div id="stat-sub-2" class="text-[10px] text-slate-400">logged today</div>
          </div>

          <!-- Stat 3 -->
          <div class="cr-card p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div class="text-[10px] sm:text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
              <span>🟣</span> <span id="stat-label-3">Total Exits</span>
            </div>
            <div id="stat-val-3" class="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">0</div>
            <div id="stat-sub-3" class="text-[10px] text-slate-400">logged today</div>
          </div>

          <!-- Stat 4 -->
          <div class="cr-card p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div class="text-[10px] sm:text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <span>🚀</span> <span id="stat-label-4">Journeys Started</span>
            </div>
            <div id="stat-val-4" class="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">0</div>
            <div id="stat-sub-4" class="text-[10px] text-slate-400">transit runs</div>
          </div>
        </div>

        <!-- SEARCH & FILTER CONTROLS BAR -->
        <div class="cr-card p-4 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
            <!-- Individual Driver/Staff Dropdown -->
            <div class="w-full sm:w-64">
              <label id="dropdown-filter-label" class="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Filter ${entity === 'driver' ? 'Driver / Van' : 'Staff Member'}
              </label>
              <select id="filter-person-select" class="cr-input py-2 px-3 text-xs w-full">
                <option value="">All ${entity === 'driver' ? 'Drivers & Vans' : 'Staff Members'}</option>
                ${(entity === 'driver' ? driverList : staffList).map(d => `
                  <option value="${d.id}">${d.label} — ${d.driver_name} ${d.van_no ? `(${d.van_no})` : ''}</option>
                `).join('')}
              </select>
            </div>

            <!-- Date Selector -->
            <div>
              <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Select Date</label>
              <div class="flex items-center gap-1.5">
                <input type="date" id="filter-date-input" value="${today}" class="cr-input py-2 px-3 text-xs" />
                <button type="button" id="set-today-btn" class="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer">
                  Today
                </button>
              </div>
            </div>

            <!-- Search by Name / Plate -->
            <div class="w-full sm:w-48">
              <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Live Search</label>
              <input type="text" id="filter-search-input" placeholder="Search name, plate..." class="cr-input py-2 px-3 text-xs w-full" />
            </div>
          </div>

          <div class="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>Showing:</span>
            <span id="filtered-records-count" class="font-mono text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">0</span>
            <span>records</span>
          </div>
        </div>

        <!-- MAIN LOGS AUDIT TABLE -->
        <div class="cr-card p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th class="py-3 px-2">Time</th>
                  <th class="py-3 px-2">Pass / Entity</th>
                  <th class="py-3 px-2">Name</th>
                  <th class="py-3 px-2">Role / Vehicle</th>
                  <th class="py-3 px-2">Event Type</th>
                  <th class="py-3 px-2">Gate / Operator</th>
                  <th class="py-3 px-2 text-right">Verification</th>
                </tr>
              </thead>
              <tbody id="logs-table-body" class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr><td colspan="7" class="py-12 text-center text-slate-400">Loading audit records...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  static attachEvents(user) {
    const driverTab = document.getElementById('entity-tab-driver');
    const staffTab = document.getElementById('entity-tab-staff');

    const catEntryExit = document.getElementById('cat-tab-entry-exit');
    const catJourney = document.getElementById('cat-tab-journey');
    const catAll = document.getElementById('cat-tab-all');

    const personSelect = document.getElementById('filter-person-select');
    const dateInput = document.getElementById('filter-date-input');
    const todayBtn = document.getElementById('set-today-btn');
    const searchInput = document.getElementById('filter-search-input');
    const clearBtn = document.getElementById('clear-day-logs-btn');
    const printBtn = document.getElementById('print-register-btn');

    // Switch Entity: Driver
    if (driverTab) {
      driverTab.onclick = () => {
        VanRegisterPage.activeEntity = 'driver';
        VanRegisterPage.updateEntityUi();
        VanRegisterPage.loadLogs();
      };
    }

    // Switch Entity: Staff
    if (staffTab) {
      staffTab.onclick = () => {
        VanRegisterPage.activeEntity = 'staff';
        VanRegisterPage.updateEntityUi();
        VanRegisterPage.loadLogs();
      };
    }

    // Switch Category: Gate Entry / Exit
    if (catEntryExit) {
      catEntryExit.onclick = () => {
        VanRegisterPage.activeCategory = 'entry_exit';
        VanRegisterPage.updateCategoryUi();
        VanRegisterPage.loadLogs();
      };
    }

    // Switch Category: Journey Route Logs
    if (catJourney) {
      catJourney.onclick = () => {
        VanRegisterPage.activeCategory = 'journey';
        VanRegisterPage.updateCategoryUi();
        VanRegisterPage.loadLogs();
      };
    }

    // Switch Category: All Logs
    if (catAll) {
      catAll.onclick = () => {
        VanRegisterPage.activeCategory = 'all';
        VanRegisterPage.updateCategoryUi();
        VanRegisterPage.loadLogs();
      };
    }

    // Person & Date filters
    if (personSelect) personSelect.onchange = () => VanRegisterPage.loadLogs();
    if (dateInput) dateInput.onchange = () => VanRegisterPage.loadLogs();

    // Today quick button
    if (todayBtn && dateInput) {
      todayBtn.onclick = () => {
        dateInput.value = new Date().toISOString().slice(0, 10);
        VanRegisterPage.loadLogs();
      };
    }

    // Live search input
    if (searchInput) {
      searchInput.oninput = () => {
        VanRegisterPage.renderTableRows(VanRegisterPage.currentLogs);
      };
    }

    // Print register
    if (printBtn) {
      printBtn.onclick = () => {
        window.print();
      };
    }

    // Clear logs button
    if (clearBtn) {
      clearBtn.onclick = async () => {
        const date = dateInput?.value || new Date().toISOString().slice(0, 10);
        const entity = VanRegisterPage.activeEntity;
        const cat = VanRegisterPage.activeCategory;
        const personId = personSelect?.value;

        const entityLabel = entity === 'driver' ? 'Driver' : 'Staff';
        const catLabel = cat === 'entry_exit' ? 'Gate Entry/Exit' : cat === 'journey' ? 'Journey' : 'All';

        if (!confirm(`Are you sure you want to clear ${entityLabel} ${catLabel} logs for ${date}? This action cannot be undone.`)) {
          return;
        }

        try {
          let url = `/api/logs?date=${date}&entityType=${entity}&category=${cat}`;
          if (personId) url += `&driverId=${personId}`;
          await window.api.request(url, { method: 'DELETE' });
          window.showToast(`${entityLabel} logs cleared successfully`, 'info');
          VanRegisterPage.loadLogs();
        } catch (err) {
          window.showToast(err.message || 'Failed to clear logs', 'error');
        }
      };
    }

    // Initial load
    VanRegisterPage.loadLogs();
  }

  static updateEntityUi() {
    const entity = VanRegisterPage.activeEntity;
    const driverTab = document.getElementById('entity-tab-driver');
    const staffTab = document.getElementById('entity-tab-staff');
    const personSelect = document.getElementById('filter-person-select');
    const filterLabel = document.getElementById('dropdown-filter-label');
    const modeText = document.getElementById('mode-text-bold');

    if (driverTab && staffTab) {
      if (entity === 'driver') {
        driverTab.className = 'p-3.5 sm:p-4 rounded-2xl border-2 transition text-left cursor-pointer flex items-center justify-between shadow-sm border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500/20';
        staffTab.className = 'p-3.5 sm:p-4 rounded-2xl border-2 transition text-left cursor-pointer flex items-center justify-between shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300';
      } else {
        staffTab.className = 'p-3.5 sm:p-4 rounded-2xl border-2 transition text-left cursor-pointer flex items-center justify-between shadow-sm border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20';
        driverTab.className = 'p-3.5 sm:p-4 rounded-2xl border-2 transition text-left cursor-pointer flex items-center justify-between shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300';
      }
    }

    if (filterLabel) {
      filterLabel.textContent = `Filter ${entity === 'driver' ? 'Driver / Van' : 'Staff Member'}`;
    }

    // Re-populate person dropdown based on active entity
    if (personSelect) {
      const list = (VanRegisterPage.allDrivers || []).filter(d => entity === 'driver' ? d.type === 'van' : d.type === 'staff');
      personSelect.innerHTML = `
        <option value="">All ${entity === 'driver' ? 'Drivers & Vans' : 'Staff Members'}</option>
        ${list.map(d => `<option value="${d.id}">${d.label} — ${d.driver_name} ${d.van_no ? `(${d.van_no})` : ''}</option>`).join('')}
      `;
    }

    if (modeText) {
      const cat = VanRegisterPage.activeCategory;
      const catStr = cat === 'entry_exit' ? 'Gate Entry/Exit' : cat === 'journey' ? 'Journeys' : 'All Logs';
      modeText.textContent = `${entity === 'driver' ? '🚌 Drivers' : '👔 Staff'} — ${catStr}`;
    }
  }

  static updateCategoryUi() {
    const cat = VanRegisterPage.activeCategory;
    const catEntryExit = document.getElementById('cat-tab-entry-exit');
    const catJourney = document.getElementById('cat-tab-journey');
    const catAll = document.getElementById('cat-tab-all');
    const modeText = document.getElementById('mode-text-bold');

    const activeClasses = 'px-3.5 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white font-black';
    const inactiveClasses = 'px-3.5 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap text-slate-600 dark:text-slate-400 hover:text-slate-900';

    if (catEntryExit) catEntryExit.className = cat === 'entry_exit' ? activeClasses : inactiveClasses;
    if (catJourney) catJourney.className = cat === 'journey' ? activeClasses : inactiveClasses;
    if (catAll) catAll.className = cat === 'all' ? activeClasses : inactiveClasses;

    if (modeText) {
      const entity = VanRegisterPage.activeEntity;
      const catStr = cat === 'entry_exit' ? 'Gate Entry/Exit' : cat === 'journey' ? 'Journeys' : 'All Logs';
      modeText.textContent = `${entity === 'driver' ? '🚌 Drivers' : '👔 Staff'} — ${catStr}`;
    }
  }

  static async loadLogs() {
    const entity = VanRegisterPage.activeEntity;
    const category = VanRegisterPage.activeCategory;
    const personId = document.getElementById('filter-person-select')?.value;
    const date = document.getElementById('filter-date-input')?.value || new Date().toISOString().slice(0, 10);
    const tbody = document.getElementById('logs-table-body');

    try {
      let url = `/api/logs?entityType=${entity}&category=${category}&date=${date}&limit=500`;
      if (personId) url += `&driverId=${personId}`;

      const res = await window.api.request(url);
      const logs = res.logs || [];
      const stats = res.stats || {};
      VanRegisterPage.currentLogs = logs;

      // Update Badges on category tabs
      const eStats = entity === 'driver' ? (stats.driver || {}) : (stats.staff || {});
      const gateCount = (eStats.entry || 0) + (eStats.exit || 0);
      const journeyCount = (eStats.journey_start || 0) + (eStats.journey_end || 0);
      const allCount = eStats.total || (gateCount + journeyCount);

      const bGate = document.getElementById('badge-count-gate');
      const bJourney = document.getElementById('badge-count-journey');
      const bAll = document.getElementById('badge-count-all');

      if (bGate) bGate.textContent = gateCount;
      if (bJourney) bJourney.textContent = journeyCount;
      if (bAll) bAll.textContent = allCount;

      // Update Summary Stat Pills
      VanRegisterPage.updateStatsPills(stats, entity, category);

      // Render Table Rows
      VanRegisterPage.renderTableRows(logs);
    } catch (err) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-rose-500 font-semibold">Failed to load logs: ${err.message || 'Network error'}</td></tr>`;
      }
    }
  }

  static updateStatsPills(stats, entity, category) {
    const eStats = entity === 'driver' ? (stats.driver || {}) : (stats.staff || {});

    const lbl1 = document.getElementById('stat-label-1');
    const val1 = document.getElementById('stat-val-1');
    const sub1 = document.getElementById('stat-sub-1');

    const lbl2 = document.getElementById('stat-label-2');
    const val2 = document.getElementById('stat-val-2');
    const sub2 = document.getElementById('stat-sub-2');

    const lbl3 = document.getElementById('stat-label-3');
    const val3 = document.getElementById('stat-val-3');
    const sub3 = document.getElementById('stat-sub-3');

    const lbl4 = document.getElementById('stat-label-4');
    const val4 = document.getElementById('stat-val-4');
    const sub4 = document.getElementById('stat-sub-4');

    if (category === 'journey') {
      if (lbl1) lbl1.textContent = 'Active In-Transit';
      if (val1) val1.textContent = Math.max(0, (eStats.journey_start || 0) - (eStats.journey_end || 0));
      if (sub1) sub1.textContent = 'trips on route';

      if (lbl2) lbl2.textContent = 'Trips Started';
      if (val2) val2.textContent = eStats.journey_start || 0;
      if (sub2) sub2.textContent = 'departed today';

      if (lbl3) lbl3.textContent = 'Trips Concluded';
      if (val3) val3.textContent = eStats.journey_end || 0;
      if (sub3) sub3.textContent = 'returned safely';

      if (lbl4) lbl4.textContent = 'Total Journey Logs';
      if (val4) val4.textContent = (eStats.journey_start || 0) + (eStats.journey_end || 0);
      if (sub4) sub4.textContent = 'trip checkpoints';
    } else {
      // Entry / Exit or All
      if (lbl1) lbl1.textContent = entity === 'driver' ? 'Vans In Campus' : 'Staff In Campus';
      if (val1) val1.textContent = eStats.inside || 0;
      if (sub1) sub1.textContent = 'current on-site';

      if (lbl2) lbl2.textContent = 'Total Entries';
      if (val2) val2.textContent = eStats.entry || 0;
      if (sub2) sub2.textContent = 'gate check-ins';

      if (lbl3) lbl3.textContent = 'Total Exits';
      if (val3) val3.textContent = eStats.exit || 0;
      if (sub3) sub3.textContent = 'gate check-outs';

      if (lbl4) lbl4.textContent = 'Journey Runs';
      if (val4) val4.textContent = (eStats.journey_start || 0);
      if (sub4) sub4.textContent = 'transit operations';
    }
  }

  static renderTableRows(logs) {
    const tbody = document.getElementById('logs-table-body');
    const countBadge = document.getElementById('filtered-records-count');
    const searchTerm = (document.getElementById('filter-search-input')?.value || '').trim().toLowerCase();

    if (!tbody) return;

    let filtered = logs;
    if (searchTerm) {
      filtered = logs.filter(l => 
        (l.driver_label && l.driver_label.toLowerCase().includes(searchTerm)) ||
        (l.driver_name && l.driver_name.toLowerCase().includes(searchTerm)) ||
        (l.van_no && l.van_no.toLowerCase().includes(searchTerm)) ||
        (l.event_type && l.event_type.toLowerCase().includes(searchTerm)) ||
        (l.scanned_by && l.scanned_by.toLowerCase().includes(searchTerm))
      );
    }

    if (countBadge) countBadge.textContent = filtered.length;

    if (filtered.length === 0) {
      const entity = VanRegisterPage.activeEntity;
      const cat = VanRegisterPage.activeCategory;
      const catName = cat === 'entry_exit' ? 'gate entry/exit' : cat === 'journey' ? 'journey' : 'activity';
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-12 text-center text-slate-400">
            <div class="text-3xl mb-2">📋</div>
            <div class="font-bold text-slate-700 dark:text-slate-300">No ${entity === 'driver' ? 'Driver' : 'Staff'} ${catName} logs found.</div>
            <div class="text-xs text-slate-400 mt-1">Try selecting a different date or clearing the search filter.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(l => {
      const isStaff = l.entity_type === 'staff';
      const isEntry = l.event_type === 'entry';
      const isExit = l.event_type === 'exit';
      const isJourneyStart = l.event_type === 'journey_start';
      const isJourneyEnd = l.event_type === 'journey_end';

      let eventBadgeHtml = '';
      if (isEntry) {
        eventBadgeHtml = `
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/40">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>GATE ENTRY</span>
          </span>
        `;
      } else if (isExit) {
        eventBadgeHtml = `
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300/40">
            <span>🟣</span>
            <span>GATE EXIT</span>
          </span>
        `;
      } else if (isJourneyStart) {
        eventBadgeHtml = `
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/40">
            <span>🚀</span>
            <span>JOURNEY START</span>
          </span>
        `;
      } else if (isJourneyEnd) {
        eventBadgeHtml = `
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300/40">
            <span>🏁</span>
            <span>JOURNEY CONCLUDED</span>
          </span>
        `;
      } else {
        eventBadgeHtml = `
          <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            ${l.event_type.toUpperCase()}
          </span>
        `;
      }

      const timeFormatted = new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      return `
        <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
          <!-- Time -->
          <td class="py-3 px-2 font-mono font-bold text-slate-700 dark:text-slate-200">
            ${timeFormatted}
          </td>

          <!-- Pass / Entity Label -->
          <td class="py-3 px-2">
            <span class="px-2 py-0.5 rounded-md font-mono font-black text-xs ${isStaff ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/30' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/30'}">
              ${l.driver_label || (isStaff ? 'Staff' : 'Van')}
            </span>
          </td>

          <!-- Name -->
          <td class="py-3 px-2 font-bold text-slate-900 dark:text-white">
            ${l.driver_name || (isStaff ? 'Staff Member' : 'Driver')}
          </td>

          <!-- Role / Vehicle / Plate -->
          <td class="py-3 px-2 text-slate-600 dark:text-slate-300 text-[11px]">
            ${isStaff ? '<span class="font-semibold text-emerald-700 dark:text-emerald-400">Staff Pass</span>' : `<span class="font-mono font-bold">${l.van_no || 'Transport Van'}</span>`}
          </td>

          <!-- Event Type -->
          <td class="py-3 px-2">
            ${eventBadgeHtml}
          </td>

          <!-- Gate / Operator -->
          <td class="py-3 px-2 text-slate-500 dark:text-slate-400 text-[11px]">
            ${l.scanned_by || (isJourneyStart || isJourneyEnd ? 'Driver App Console' : 'Gate Staff')}
          </td>

          <!-- Verification -->
          <td class="py-3 px-2 text-right">
            <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span>✓</span> <span>Verified</span>
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }
}

window.VanRegisterPage = VanRegisterPage;
