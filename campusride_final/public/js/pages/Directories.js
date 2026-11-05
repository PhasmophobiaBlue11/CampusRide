// CampusRide — Staff & Parent Directories (§7.7)
class DirectoriesPage {
  static async render(user) {
    let staff = [];
    let parents = [];

    try {
      const [sRes, pRes] = await Promise.all([
        window.api.request('/api/directories/staff'),
        window.api.request('/api/directories/parents')
      ]);
      staff = sRes.staff || [];
      parents = pRes.parents || [];
    } catch {}

    return `
      <div class="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <!-- Back Button -->
        <div>
          <button type="button" onclick="window.goBack()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <span class="text-base font-black">←</span> <span>Back</span>
          </button>
        </div>

        <div>
          <h1 class="text-2xl font-black text-slate-900 dark:text-white">Campus Directories</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Authorized contacts for gate staff, administration, and parent routes.</p>
        </div>

        <!-- Tabs -->
        <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button type="button" id="dir-tab-staff" class="px-4 py-2 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-md cursor-pointer">
            🛂 Gate & Security Staff (${staff.length})
          </button>
          <button type="button" id="dir-tab-parents" class="px-4 py-2 rounded-xl text-xs font-bold transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer">
            👨‍👩‍👧 Parent Accounts & Addresses (${parents.length})
          </button>
        </div>

        <!-- Staff Directory Grid -->
        <div id="grid-staff" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
          ${staff.length === 0 ? `
            <div class="col-span-full text-center py-10 text-slate-400 text-xs">No staff accounts registered yet.</div>
          ` : staff.map(s => `
            <div class="cr-card p-5 space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center">
                  👤
                </div>
                <div>
                  <h3 class="font-bold text-sm text-slate-900 dark:text-white">${s.full_name}</h3>
                  <div class="text-[11px] text-slate-500">${s.notes || 'Campus Gate Officer'}</div>
                </div>
              </div>
              <div class="text-xs text-slate-500 space-y-1">
                <div>📧 ${s.email}</div>
              </div>
              <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
                <a href="tel:${s.phone}" class="cr-btn cr-btn-primary w-full py-1.5 text-xs">
                  📞 Call ${s.phone}
                </a>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Parent Directory Grid (initially hidden) -->
        <div id="grid-parents" class="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
          ${parents.length === 0 ? `
            <div class="col-span-full text-center py-10 text-slate-400 text-xs">No parent accounts registered yet.</div>
          ` : parents.map(p => `
            <div class="cr-card p-5 space-y-3">
              <div>
                <h3 class="font-bold text-sm text-slate-900 dark:text-white">${p.name}</h3>
                <div class="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                  Vans: <b>${p.vans || 'None assigned'}</b>
                </div>
                <div class="text-[11px] text-slate-400 mt-0.5">
                  Children: ${p.children_names || '—'}
                </div>
              </div>

              <div class="text-xs text-slate-600 dark:text-slate-300">
                🏠 ${p.address || 'Live GPS Location'}
              </div>

              <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <a href="tel:${p.phone}" class="cr-btn cr-btn-secondary flex-1 py-1.5 text-xs">
                  📞 Call
                </a>
                ${p.address_lat && p.address_lng ? `
                  <a href="https://www.google.com/maps/dir/?api=1&destination=${p.address_lat},${p.address_lng}" target="_blank"
                     class="cr-btn cr-btn-primary flex-1 py-1.5 text-xs">
                    🗺️ Google Maps
                  </a>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  static attachEvents() {
    const tabStaff = document.getElementById('dir-tab-staff');
    const tabParents = document.getElementById('dir-tab-parents');
    const gridStaff = document.getElementById('grid-staff');
    const gridParents = document.getElementById('grid-parents');

    if (tabStaff && tabParents && gridStaff && gridParents) {
      tabStaff.onclick = () => {
        tabStaff.className = 'px-4 py-2 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-md cursor-pointer';
        tabParents.className = 'px-4 py-2 rounded-xl text-xs font-bold transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer';
        gridStaff.classList.remove('hidden');
        gridParents.classList.add('hidden');
      };

      tabParents.onclick = () => {
        tabParents.className = 'px-4 py-2 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-md cursor-pointer';
        tabStaff.className = 'px-4 py-2 rounded-xl text-xs font-bold transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer';
        gridParents.classList.remove('hidden');
        gridStaff.classList.add('hidden');
      };
    }
  }
}

window.DirectoriesPage = DirectoriesPage;
