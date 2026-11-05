// CampusRide — Staff View: Dedicated Drivers & Parents Directories (§7.7)
// Provides two distinct options: (1) Drivers Directory, (2) Parents Directory
class DirectoriesPage {
  static async render(user) {
    let drivers = [];
    let parents = [];
    let staff = [];

    try {
      const [dRes, pRes, sRes] = await Promise.all([
        window.api.request('/api/drivers'),
        window.api.request('/api/directories/parents'),
        window.api.request('/api/directories/staff')
      ]);
      drivers = dRes.drivers || [];
      parents = pRes.parents || [];
      staff = sRes.staff || [];
    } catch {}

    const hash = window.location.hash || '';
    // Show Parents by default when entering from Staff Dashboard or #/parents
    const showParentsFirst = !hash.includes('driver');

    return `
      <div class="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <!-- Back Button -->
        <div>
          <button type="button" onclick="window.goBack()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <span class="text-base font-black">←</span> <span>Back</span>
          </button>
        </div>

        <div>
          <h1 class="text-2xl font-black text-slate-900 dark:text-white">Registered Accounts Directory</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gate Staff registry view. Select an option below to browse all registered Driver and Parent accounts.
          </p>
        </div>

        <!-- Two Dedicated Options (Drivers vs Parents) -->
        <div class="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl max-w-lg">
          <button type="button" id="dir-tab-drivers" class="py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer select-none flex items-center justify-center gap-2 ${showParentsFirst ? 'text-slate-600 dark:text-slate-400 hover:text-slate-900' : 'bg-amber-500 text-white shadow-md'}">
            <span>🚌 Drivers</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full ${showParentsFirst ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'bg-white/25 text-white'}">${drivers.length}</span>
          </button>
          <button type="button" id="dir-tab-parents" class="py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer select-none flex items-center justify-center gap-2 ${showParentsFirst ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}">
            <span>👨‍👩‍👧 Parents</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full ${showParentsFirst ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}">${parents.length}</span>
          </button>
        </div>

        <!-- 1. DRIVERS DIRECTORY GRID -->
        <div id="grid-drivers" class="${showParentsFirst ? 'hidden ' : ''}space-y-3 animate-fade-in-up">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span>🚌 Registered Transport Drivers (${drivers.length})</span>
            </h2>
            <a href="#/drivers" class="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold">
              Manage / Add Driver Pass →
            </a>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${drivers.length === 0 ? `
              <div class="col-span-full cr-card p-10 text-center text-slate-400 text-xs">
                No transport drivers registered yet. Tap "+ Register Driver" in Gate Operations.
              </div>
            ` : drivers.map(d => `
              <div class="cr-card p-5 space-y-3 border-l-4 border-l-amber-500">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-black px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                    ${d.label}
                  </span>
                  <span class="text-[10px] font-semibold text-slate-400 uppercase">
                    ${d.vehicle_type === '2_wheeler' ? '🛵 2-Wheeler' : '🚌 4-Wheeler Van'}
                  </span>
                </div>

                <div>
                  <h3 class="font-bold text-base text-slate-900 dark:text-white">${d.driver_name}</h3>
                  <div class="font-mono text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                    Plate: ${d.van_no}
                  </div>
                  <div class="text-xs text-slate-500 mt-1">
                    📞 ${d.phone || 'No phone recorded'}
                  </div>
                </div>

                <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  ${d.phone ? `
                    <a href="tel:${d.phone}" class="cr-btn bg-amber-500 hover:bg-amber-400 text-white flex-1 py-1.5 text-xs text-center font-bold">
                      📞 Call Driver
                    </a>
                  ` : ''}
                  <a href="#/drivers" class="cr-btn cr-btn-secondary flex-1 py-1.5 text-xs text-center">
                    🎟️ View Pass
                  </a>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 2. PARENTS DIRECTORY GRID -->
        <div id="grid-parents" class="${showParentsFirst ? '' : 'hidden '}space-y-3 animate-fade-in-up">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span>👨‍👩‍👧 Registered Parent Accounts (${parents.length})</span>
            </h2>
            <span class="text-xs text-slate-400">Derived from student pickups</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${parents.length === 0 ? `
              <div class="col-span-full cr-card p-10 text-center text-slate-400 text-xs">
                No parent accounts registered yet.
              </div>
            ` : parents.map(p => `
              <div class="cr-card p-5 space-y-3 border-l-4 border-l-indigo-500">
                <div class="flex items-center justify-between">
                  <h3 class="font-bold text-base text-slate-900 dark:text-white">${p.name}</h3>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    Parent
                  </span>
                </div>

                <div class="space-y-1 text-xs">
                  <div class="text-blue-600 dark:text-blue-400 font-semibold">
                    🚌 Assigned Vans: <b>${p.vans || 'Unassigned'}</b>
                  </div>
                  <div class="text-slate-600 dark:text-slate-300">
                    🧒 Children: <b>${p.children_names || '—'}</b>
                  </div>
                  <div class="text-slate-500 truncate" title="${p.address || ''}">
                    📍 ${p.address || 'Live GPS Coordinates'}
                  </div>
                </div>

                <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  ${p.phone ? `
                    <a href="tel:${p.phone}" class="cr-btn bg-indigo-600 hover:bg-indigo-500 text-white flex-1 py-1.5 text-xs text-center font-bold">
                      📞 Call Parent
                    </a>
                  ` : ''}
                  ${p.address_lat && p.address_lng ? `
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${p.address_lat},${p.address_lng}" target="_blank"
                       class="cr-btn cr-btn-secondary flex-1 py-1.5 text-xs text-center">
                      🗺️ Google Maps
                    </a>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  }

  static attachEvents() {
    const tabDrivers = document.getElementById('dir-tab-drivers');
    const tabParents = document.getElementById('dir-tab-parents');
    const gridDrivers = document.getElementById('grid-drivers');
    const gridParents = document.getElementById('grid-parents');

    if (tabDrivers && tabParents && gridDrivers && gridParents) {
      tabDrivers.onclick = () => {
        tabDrivers.className = 'py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer select-none flex items-center justify-center gap-2 bg-amber-500 text-white shadow-md';
        tabParents.className = 'py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer select-none flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900';
        gridDrivers.classList.remove('hidden');
        gridParents.classList.add('hidden');
      };

      tabParents.onclick = () => {
        tabParents.className = 'py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer select-none flex items-center justify-center gap-2 bg-indigo-600 text-white shadow-md';
        tabDrivers.className = 'py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer select-none flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900';
        gridParents.classList.remove('hidden');
        gridDrivers.classList.add('hidden');
      };
    }
  }
}

window.DirectoriesPage = DirectoriesPage;
