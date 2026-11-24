// CampusRide — Dedicated Campus Directory (§7.7)
// Three Distinct Options:
// 1. Parents (View-only, NO add option) — Search by Name or Phone
// 2. Drivers (View-only, NO add option) — Search by Name, Phone, or Van No
// 3. Staff (Personally added or scanned passes) — Search STRICTLY by Name Only
class DirectoriesPage {
  static currentTab = 'parents'; // 'parents' | 'drivers' | 'staff'

  static async render(user) {
    let drivers = [];
    let parents = [];
    let staff = [];

    // Load persistent staff backup from local device storage (offline fallback only)
    let localStaff = [];
    try {
      const stored = localStorage.getItem('campusride_persistent_staff_registry');
      if (stored) localStaff = JSON.parse(stored);
    } catch (e) {
      localStaff = [];
    }
    localStaff = Array.isArray(localStaff) ? localStaff : [];

    try {
      const [allDriversRes, pRes] = await Promise.all([
        window.api.request('/api/drivers'),
        window.api.request('/api/directories/parents')
      ]);
      const allDrivers = allDriversRes.drivers || [];

      // Natural numeric sort for drivers: Van 1, Van 2, ...
      drivers = allDrivers.filter(d => d.type === 'van').sort((a, b) => {
        const numA = parseInt((a.label || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt((b.label || '').replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

      // Authoritative source of truth with Smart Vault Merge (§Indestructible Staff & Vehicle Vault):
      const serverStaff = allDrivers.filter(d => d.type === 'staff');
      let vehicleVault = {};
      try {
        vehicleVault = JSON.parse(localStorage.getItem('campusride_staff_vehicle_vault') || '{}');
      } catch (e) {}

      if (serverStaff.length > 0) {
        let needsServerSync = false;
        staff = serverStaff.map(s => {
          const sId = String(s.id || '').trim();
          const sName = String(s.driver_name || '').trim().toLowerCase();
          const sLabel = String(s.label || '').trim().toLowerCase();

          // Check vault first, then check localStaff
          const vaultItem = vehicleVault[sId] || vehicleVault[sName] || vehicleVault[sLabel];
          const localItem = Array.isArray(localStaff) ? localStaff.find(ls => (ls.id && ls.id === sId) || (ls.driver_name && ls.driver_name.toLowerCase() === sName)) : null;

          const savedVan = vaultItem?.van_no || localItem?.van_no;
          const savedType = vaultItem?.vehicle_type || localItem?.vehicle_type;
          const savedPhone = vaultItem?.phone || localItem?.phone;

          let changed = false;
          if (savedVan && savedVan !== 'STAFF PASS' && savedVan !== 'Staff Pass' && (!s.van_no || s.van_no === 'STAFF PASS' || s.van_no === 'Staff Pass')) {
            s.van_no = savedVan;
            changed = true;
          }
          if (savedType && savedType !== 'walk_in' && (!s.vehicle_type || s.vehicle_type === 'walk_in')) {
            s.vehicle_type = savedType;
            changed = true;
          }
          if (savedPhone && !s.phone) {
            s.phone = savedPhone;
            changed = true;
          }

          if (changed) {
            needsServerSync = true;
            vehicleVault[sId] = { van_no: s.van_no, vehicle_type: s.vehicle_type, phone: s.phone, label: s.label, name: s.driver_name, updated_at: Date.now() };
            if (sName) vehicleVault[sName] = vehicleVault[sId];
          }
          return s;
        });

        try {
          localStorage.setItem('campusride_persistent_staff_registry', JSON.stringify(staff));
          localStorage.setItem('campusride_staff_vehicle_vault', JSON.stringify(vehicleVault));
          localStorage.removeItem('campusride_deleted_staff_ids');
        } catch (e) {}

        if (needsServerSync) {
          window.api.request('/api/drivers/sync', {
            method: 'POST',
            body: JSON.stringify({ staffList: staff })
          }).catch(() => {});
        }
      } else {
        // Fallback to local device storage only if server returns empty list (offline/restart)
        staff = localStaff;
        if (staff.length === 0 && window.FirebaseEngine) {
          try {
            const fbStaff = await window.FirebaseEngine.getCloudDrivers();
            const validFbStaff = fbStaff.filter(d => d && d.type === 'staff');
            if (validFbStaff.length > 0) {
              staff = validFbStaff;
            }
          } catch (e) {}
        }
      }

      // Deduplicate staff list strictly by ID and normalized Name (guaranteeing zero duplicates)
      const seenStaffIds = new Set();
      const seenStaffNames = new Set();
      staff = staff.filter(s => {
        if (!s) return false;
        const sId = String(s.id || '').trim();
        const sName = String(s.driver_name || '').trim().toLowerCase();
        if (sId && seenStaffIds.has(sId)) return false;
        if (sName && seenStaffNames.has(sName)) return false;
        if (sId) seenStaffIds.add(sId);
        if (sName) seenStaffNames.add(sName);
        return true;
      });

      // Personally added staff sorted numerically: Staff 1, Staff 2, ...
      staff.sort((a, b) => {
        const numA = parseInt((a.label || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt((b.label || '').replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

      parents = pRes.parents || [];
    } catch (err) {
      console.warn('[Directories] Fetch error:', err.message);
      staff = localStaff;
    }

    DirectoriesPage.currentParents = parents;
    DirectoriesPage.currentDrivers = drivers;
    DirectoriesPage.currentStaff = staff;

    const hash = (window.location.hash || '').toLowerCase();
    let initialTab = DirectoriesPage.currentTab;
    if (hash.includes('driver')) {
      initialTab = 'drivers';
    } else if (hash.includes('staff')) {
      initialTab = 'staff';
    } else if (hash.includes('parent')) {
      initialTab = 'parents';
    }
    DirectoriesPage.currentTab = initialTab;

    return `
      <div class="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <!-- Back Button -->
        <div>
          <button type="button" onclick="window.goBack()" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <span class="text-base font-black">←</span> <span>Back</span>
          </button>
        </div>

        <!-- Page Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Campus Directory</h1>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Browse registered Parents, transport Drivers, and personally added Staff passes.
            </p>
          </div>
        </div>

        <!-- 3 Dedicated Options Tabs (Parents, Drivers, Staff) — No Number Badges -->
        <div class="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl max-w-xl shadow-inner">
          <button type="button" id="dir-tab-parents" class="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer select-none flex items-center justify-center gap-1.5 ${initialTab === 'parents' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
            <span>👨‍👩‍👧 Parents</span>
          </button>

          <button type="button" id="dir-tab-drivers" class="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer select-none flex items-center justify-center gap-1.5 ${initialTab === 'drivers' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
            <span>🚌 Drivers</span>
          </button>

          <button type="button" id="dir-tab-staff" class="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer select-none flex items-center justify-center gap-1.5 ${initialTab === 'staff' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
            <span>👔 Staff</span>
          </button>
        </div>

        <!-- ========================================== -->
        <!-- 1. PARENTS DIRECTORY (SEARCH BY NAME/PHONE) -->
        <!-- ========================================== -->
        <div id="grid-parents" class="${initialTab === 'parents' ? '' : 'hidden '}space-y-4 animate-fade-in-up">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>👨‍👩‍👧 Registered Parent Accounts</span>
              </h2>
              <p class="text-[11px] text-slate-400 mt-0.5">Parents self-registered via account registration with student pickup details.</p>
            </div>
          </div>

          <!-- Dedicated Search Bar for Parents (Name or Phone) -->
          <div class="cr-card p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center gap-3">
            <div class="relative flex-1">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                🔍
              </div>
              <input type="text" id="dir-search-parents" placeholder="Search parent by name or phone number..."
                     class="w-full text-xs sm:text-sm py-2.5 pl-10 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
              <button type="button" id="dir-clear-parents-search" class="hidden absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold cursor-pointer p-1">✕</button>
            </div>
          </div>

          <div id="dir-parents-no-results" class="hidden cr-card p-12 text-center text-slate-400 text-xs">
            No parent accounts found matching "<span class="search-term font-semibold text-slate-700 dark:text-slate-200"></span>".
          </div>

          <div id="dir-parents-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${parents.length === 0 ? `
              <div class="col-span-full cr-card p-12 text-center text-slate-400 text-xs">
                No parent accounts registered yet.
              </div>
            ` : parents.map(p => `
              <div class="dir-parent-card cr-card p-5 space-y-3 border-l-4 border-l-indigo-500 flex flex-col justify-between"
                   data-name="${(p.name || '').toLowerCase()}" data-phone="${(p.phone || '').replace(/\D/g, '')}">
                <div>
                  <div class="flex items-center justify-between">
                    <h3 class="font-bold text-base text-slate-900 dark:text-white">${p.name}</h3>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                      Parent
                    </span>
                  </div>

                  <div class="space-y-1.5 text-xs mt-3">
                    <div class="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5">
                      <span class="text-slate-400">Assigned Van:</span>
                      <b>${p.vans || 'Unassigned'}</b>
                    </div>
                    <div class="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <span class="text-slate-400">Child:</span>
                      <b>${p.children_names || '—'}</b>
                    </div>
                  </div>
                </div>

                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  ${p.phone ? `
                    <a href="tel:${p.phone}" class="cr-btn bg-indigo-600 hover:bg-indigo-500 text-white w-full py-2 text-xs text-center font-bold flex items-center justify-center gap-1.5">
                      <span>📞</span> <span>Call Parent (${p.phone})</span>
                    </a>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- ========================================== -->
        <!-- 2. DRIVERS DIRECTORY (SEARCH BY NAME/PHONE/VAN) -->
        <!-- ========================================== -->
        <div id="grid-drivers" class="${initialTab === 'drivers' ? '' : 'hidden '}space-y-4 animate-fade-in-up">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>🚌 Registered Transport Drivers</span>
              </h2>
              <p class="text-[11px] text-slate-400 mt-0.5">Drivers are automatically added with sequential Van names upon account creation.</p>
            </div>
            <div class="flex items-center gap-2">
              ${drivers.length > 0 ? `
                <button type="button" id="dir-print-all-drivers-btn" class="cr-btn cr-btn-secondary text-xs py-2 px-3.5 shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                  <span>🖨️</span> <span>Print All Driver QRs</span>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Dedicated Search Bar for Drivers (Name or Phone or Van No) -->
          <div class="cr-card p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center gap-3">
            <div class="relative flex-1">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                🔍
              </div>
              <input type="text" id="dir-search-drivers" placeholder="Search driver by name, phone number, or van plate..."
                     class="w-full text-xs sm:text-sm py-2.5 pl-10 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner" />
              <button type="button" id="dir-clear-drivers-search" class="hidden absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold cursor-pointer p-1">✕</button>
            </div>
          </div>

          <div id="dir-drivers-no-results" class="hidden cr-card p-12 text-center text-slate-400 text-xs">
            No transport drivers found matching "<span class="search-term font-semibold text-slate-700 dark:text-slate-200"></span>".
          </div>

          <div id="dir-drivers-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${drivers.length === 0 ? `
              <div class="col-span-full cr-card p-12 text-center text-slate-400 text-xs">
                No transport drivers registered yet. Drivers appear here automatically as soon as they create an account.
              </div>
            ` : drivers.map(d => `
              <div class="dir-driver-card cr-card p-5 space-y-3 border-l-4 border-l-amber-500 flex flex-col justify-between"
                   data-name="${(d.driver_name || '').toLowerCase()}" data-phone="${(d.phone || '').replace(/\D/g, '')}" data-van="${(d.van_no || '').toLowerCase()} ${(d.label || '').toLowerCase()}">
                <div>
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-black px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                      ${d.label}
                    </span>
                    <span class="text-[10px] font-semibold text-slate-400 uppercase">
                      ${d.vehicle_type === '2_wheeler' ? '🛵 2-Wheeler' : '🚌 4-Wheeler Van'}
                    </span>
                  </div>

                  <div class="mt-3">
                    <h3 class="font-bold text-base text-slate-900 dark:text-white">${d.driver_name}</h3>
                    <div class="font-mono text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                      Plate: ${d.van_no}
                    </div>
                    <div class="text-xs text-slate-500 mt-1">
                      📞 ${d.phone || 'No phone recorded'}
                    </div>
                  </div>
                </div>

                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  ${d.phone ? `
                    <a href="tel:${d.phone}" class="cr-btn bg-amber-500 hover:bg-amber-400 text-white px-2.5 py-1.5 text-xs text-center font-bold">
                      📞 Call
                    </a>
                  ` : ''}
                  <button type="button" class="dir-view-driver-pass-btn cr-btn cr-btn-secondary flex-1 py-1.5 text-xs text-center cursor-pointer select-none"
                          data-id="${d.id}" data-label="${d.label}" data-name="${d.driver_name}" data-plate="${d.van_no}" data-phone="${d.phone || ''}">
                    🎟️ Pass QR
                  </button>
                  <button type="button" class="dir-view-driver-info-btn cr-btn bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex-1 py-1.5 text-xs text-center font-bold cursor-pointer select-none"
                          data-id="${d.id}" data-label="${d.label}" data-name="${d.driver_name}" data-plate="${d.van_no}" data-phone="${d.phone || ''}" data-type="${d.vehicle_type || '4_wheeler'}">
                    ℹ️ Info QR
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- ========================================== -->
        <!-- 3. STAFF DIRECTORY (SEARCH STRICTLY BY NAME) -->
        <!-- ========================================== -->
        <div id="grid-staff" class="${initialTab === 'staff' ? '' : 'hidden '}space-y-4 animate-fade-in-up">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 class="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>👔 Personally Added Staff</span>
              </h2>
              <p class="text-[11px] text-slate-400 mt-0.5">Campus helpers, attendants, and non-gate staff passes.</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              ${staff.length > 0 ? `
                <button type="button" id="dir-print-all-staff-btn" class="cr-btn cr-btn-secondary text-xs py-2 px-3 shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                  <span>🖨️</span> <span>Print QRs</span>
                </button>
                <button type="button" id="open-bulk-vehicle-modal-btn" class="cr-btn bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs py-2 px-3 shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap" title="Bulk edit vehicle numbers and vehicle types for all staff">
                  <span>📋</span> <span>Quick Vehicle Manager</span>
                </button>
              ` : ''}
              <button type="button" id="open-add-staff-modal-btn" class="cr-btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 px-3.5 shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                <span>➕</span> <span>Add Staff</span>
              </button>
            </div>
          </div>

          <!-- Dedicated Search Bar for Staff -->
          <div class="cr-card p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center gap-3">
            <div class="relative flex-1">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                🔍
              </div>
              <input type="text" id="dir-search-staff" placeholder="Search staff by full name or vehicle number..."
                     class="w-full text-xs sm:text-sm py-2.5 pl-10 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner" />
              <button type="button" id="dir-clear-staff-search" class="hidden absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold cursor-pointer p-1">✕</button>
            </div>
          </div>

          <div id="dir-staff-no-results" class="hidden cr-card p-12 text-center text-slate-400 text-xs">
            No staff members found matching "<span class="search-term font-semibold text-slate-700 dark:text-slate-200"></span>".
          </div>

          <div id="dir-staff-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${staff.length === 0 ? `
              <div class="col-span-full cr-card p-12 text-center text-slate-400 text-xs">
                No personally added staff yet. Click <b>"➕ Add Staff"</b> above.
              </div>
            ` : staff.map(s => {
              const hasPlate = s.van_no && s.van_no !== 'Staff Pass' && s.van_no !== 'STAFF PASS';
              const vehTypeBadge = s.vehicle_type === '2_wheeler' 
                ? '🛵 2 Wheeler' 
                : (s.vehicle_type === '4_wheeler' ? '🚗 4 Wheeler' : (hasPlate ? '🚗 Vehicle' : '🚶 Campus Staff Pass'));
              const vehIcon = s.vehicle_type === '2_wheeler' ? '🛵' : '🚗';
              return `
              <div class="dir-staff-card cr-card p-5 space-y-3 border-l-4 border-l-emerald-500 flex flex-col justify-between"
                   data-name="${(s.driver_name || '').toLowerCase()}" data-label="${(s.label || '').toLowerCase()}" data-van="${(hasPlate ? s.van_no : '').toLowerCase()}">
                <div>
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      ${s.label}
                    </span>
                    <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                      ${vehTypeBadge}
                    </span>
                  </div>

                  <div class="mt-3">
                    <h3 class="font-bold text-base text-slate-900 dark:text-white">${s.driver_name}</h3>
                    <div class="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Role: Campus Staff
                    </div>
                    ${hasPlate ? `
                      <div class="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-1.5 flex items-center gap-1.5">
                        <span>${vehIcon}</span>
                        <span class="tracking-wide">${s.van_no}</span>
                      </div>
                    ` : ''}
                    ${s.phone ? `
                      <div class="text-xs text-slate-500 mt-1">📞 ${s.phone}</div>
                    ` : ''}
                  </div>
                </div>

                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                  ${s.phone ? `
                    <a href="tel:${s.phone}" class="cr-btn bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 px-2.5 text-xs text-center font-bold">
                      📞 Call
                    </a>
                  ` : ''}
                  <button type="button" class="dir-edit-staff-btn cr-btn cr-btn-secondary flex-1 py-1.5 text-xs text-center font-bold cursor-pointer select-none"
                          data-id="${s.id}" data-label="${s.label}" data-name="${s.driver_name}" data-phone="${s.phone || ''}" data-van="${hasPlate ? s.van_no : ''}" data-vehicle-type="${s.vehicle_type || ''}">
                    ✏️ Edit
                  </button>
                  <button type="button" class="dir-view-staff-pass-btn cr-btn cr-btn-secondary flex-1 py-1.5 text-xs text-center font-bold cursor-pointer select-none"
                          data-id="${s.id}" data-label="${s.label}" data-name="${s.driver_name}" data-plate="${hasPlate ? s.van_no : ''}" data-phone="${s.phone || ''}">
                    🎟️ View Pass
                  </button>
                  <button type="button" class="dir-delete-staff-btn p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer select-none"
                          data-id="${s.id}" data-name="${s.driver_name}" title="Remove staff">
                    🗑️
                  </button>
                </div>
              </div>
            `;
            }).join('')}
          </div>
        </div>

        <!-- MODAL: ADD STAFF PERSONALLY -->
        <div id="add-staff-modal" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm hidden items-center justify-center p-4">
          <div class="cr-card max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in-up border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <span class="text-xl">➕</span>
                <h3 class="font-bold text-base text-slate-900 dark:text-white">Add Staff Member</h3>
              </div>
              <button type="button" id="close-add-staff-modal-btn" class="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold cursor-pointer select-none">
                ✕
              </button>
            </div>

            <form id="add-staff-form" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Staff Full Name <span class="text-rose-500">*</span>
                </label>
                <input type="text" id="add-staff-name" required class="cr-input text-base font-semibold" placeholder="e.g. Ramu Chandan" autocomplete="off" autocorrect="off" spellcheck="false" data-lpignore="true" />
                <p class="text-[10px] text-slate-400 mt-1">Full name requires both first and last name.</p>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vehicle License Plate Number <span class="text-rose-500">*</span>
                </label>
                <input type="text" id="add-staff-vehicle-no" required minlength="6" class="cr-input uppercase tracking-wider font-mono font-bold text-center text-base" placeholder="__  __  __  ____" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" data-lpignore="true" />
                <p class="text-[10px] text-slate-400 mt-1 text-center font-medium">Spaces fill automatically as you type (State, District, Series, Number)</p>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vehicle Type <span class="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select id="add-staff-vehicle-type" class="cr-input">
                  <option value="">Select vehicle type (optional)</option>
                  <option value="4_wheeler">🚗 4 Wheeler (Car / SUV / Van)</option>
                  <option value="2_wheeler">🛵 2 Wheeler (Bike / Scooter)</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number <span class="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input type="tel" id="add-staff-phone" class="cr-input font-mono" placeholder="e.g. 9876543210" autocomplete="off" />
              </div>

              <div class="pt-2 flex items-center justify-end gap-2">
                <button type="button" id="cancel-add-staff-btn" class="cr-btn cr-btn-secondary text-xs py-2 px-3.5 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" id="submit-add-staff-btn" class="cr-btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 px-4 font-bold shadow-md cursor-pointer">
                  ➕ Add Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- MODAL: EDIT STAFF PERSONALLY -->
        <div id="edit-staff-modal" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm hidden items-center justify-center p-4">
          <div class="cr-card max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in-up border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <span class="text-xl">✏️</span>
                <h3 class="font-bold text-base text-slate-900 dark:text-white">Edit Staff Member</h3>
                <span id="edit-staff-label-badge" class="text-xs font-black px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"></span>
              </div>
              <button type="button" id="close-edit-staff-modal-btn" class="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold cursor-pointer select-none">
                ✕
              </button>
            </div>

            <form id="edit-staff-form" class="space-y-4">
              <input type="hidden" id="edit-staff-id" />
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Staff Full Name <span class="text-rose-500">*</span>
                </label>
                <input type="text" id="edit-staff-name" required class="cr-input text-base font-semibold" placeholder="e.g. Ramu Chandan" autocomplete="off" autocorrect="off" spellcheck="false" data-lpignore="true" />
                <p class="text-[10px] text-slate-400 mt-1">Full name requires both first and last name.</p>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vehicle License Plate Number <span class="text-rose-500">*</span>
                </label>
                <input type="text" id="edit-staff-vehicle-no" required minlength="6" class="cr-input uppercase tracking-wider font-mono font-bold text-center text-base" placeholder="__  __  __  ____" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" data-lpignore="true" />
                <p class="text-[10px] text-slate-400 mt-1 text-center font-medium">Spaces fill automatically as you type (State, District, Series, Number)</p>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vehicle Type <span class="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select id="edit-staff-vehicle-type" class="cr-input">
                  <option value="">Select vehicle type (optional)</option>
                  <option value="4_wheeler">🚗 4 Wheeler (Car / SUV / Van)</option>
                  <option value="2_wheeler">🛵 2 Wheeler (Bike / Scooter)</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number <span class="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input type="tel" id="edit-staff-phone" class="cr-input font-mono" placeholder="e.g. 9876543210" autocomplete="off" />
              </div>

              <div class="pt-2 flex items-center justify-end gap-2">
                <button type="button" id="cancel-edit-staff-btn" class="cr-btn cr-btn-secondary text-xs py-2 px-3.5 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" id="submit-edit-staff-btn" class="cr-btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 px-4 font-bold shadow-md cursor-pointer">
                  💾 Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- MODAL: QUICK BULK STAFF VEHICLE MANAGER -->
        <div id="bulk-staff-vehicle-modal" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-3 sm:p-5">
          <div class="cr-card max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
            <!-- Modal Header -->
            <div class="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-bold">
                  📋
                </div>
                <div>
                  <h3 class="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    Quick Staff Vehicle Manager
                    <span id="bulk-vehicle-count-badge" class="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      ${staff.length} Staff
                    </span>
                  </h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400">
                    Quickly assign or restore vehicle numbers & vehicle types across all staff in one place.
                  </p>
                </div>
              </div>
              <button type="button" id="close-bulk-vehicle-modal-btn" class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-lg font-bold cursor-pointer select-none transition">
                ✕
              </button>
            </div>

            <!-- Modal Search & Filter Toolbar -->
            <div class="p-3 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 flex-wrap">
              <div class="relative flex-1 min-w-[200px]">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                <input type="text" id="bulk-vehicle-search" placeholder="Filter staff by name or label (e.g. Staff 5)..."
                       class="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" autocomplete="off" />
              </div>
              <div class="flex items-center gap-2 text-xs">
                <span class="text-slate-500 dark:text-slate-400">Filter:</span>
                <select id="bulk-vehicle-filter-type" class="px-2 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  <option value="all">All (${staff.length})</option>
                  <option value="with_vehicle">With Vehicle</option>
                  <option value="walk_in">Walk-in only</option>
                </select>
              </div>
            </div>

            <!-- Modal Scrollable Table Body -->
            <div class="flex-1 overflow-y-auto p-3 sm:p-5 divide-y divide-slate-100 dark:divide-slate-800" id="bulk-vehicle-rows-container">
              ${staff.map((s) => {
                const hasPlate = s.van_no && s.van_no !== 'Staff Pass' && s.van_no !== 'STAFF PASS';
                const curPlate = hasPlate ? s.van_no : '';
                const curType = s.vehicle_type || 'walk_in';
                return `
                <div class="bulk-vehicle-row py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                     data-id="${s.id}" data-name="${(s.driver_name || '').toLowerCase()}" data-label="${(s.label || '').toLowerCase()}">
                  <div class="flex items-center gap-3 sm:w-1/3 min-w-0">
                    <span class="text-xs font-black px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                      ${s.label}
                    </span>
                    <div class="min-w-0 truncate">
                      <div class="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">${s.driver_name}</div>
                      <div class="text-[11px] text-slate-400">Campus Staff Pass</div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 flex-1 sm:w-2/3">
                    <div class="flex-1">
                      <input type="text" class="bulk-plate-input cr-input py-1.5 px-2.5 text-xs font-mono font-bold uppercase tracking-wider text-center"
                             data-id="${s.id}" value="${curPlate}" placeholder="e.g. MH 12 AB 1234" autocomplete="off" autocapitalize="characters" />
                    </div>
                    <div class="w-36 sm:w-44 shrink-0">
                      <select class="bulk-type-select cr-input py-1.5 px-2 text-xs font-semibold" data-id="${s.id}">
                        <option value="walk_in" ${curType === 'walk_in' ? 'selected' : ''}>🚶 Walk-in</option>
                        <option value="4_wheeler" ${curType === '4_wheeler' ? 'selected' : ''}>🚗 4 Wheeler</option>
                        <option value="2_wheeler" ${curType === '2_wheeler' ? 'selected' : ''}>🛵 2 Wheeler</option>
                      </select>
                    </div>
                  </div>
                </div>
                `;
              }).join('')}
            </div>

            <!-- Modal Footer -->
            <div class="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3 flex-wrap">
              <div class="text-xs text-slate-500 dark:text-slate-400">
                🔒 Protected by Device Vault & Multi-Server Sync
              </div>
              <div class="flex items-center gap-2">
                <button type="button" id="cancel-bulk-vehicle-btn" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer select-none transition">
                  Cancel
                </button>
                <button type="button" id="save-bulk-vehicle-btn" class="px-5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 cursor-pointer select-none transition flex items-center gap-2">
                  <span>💾</span> <span id="save-bulk-btn-text">Save All Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  static attachEvents(user) {
    const tabParents = document.getElementById('dir-tab-parents');
    const tabDrivers = document.getElementById('dir-tab-drivers');
    const tabStaff = document.getElementById('dir-tab-staff');

    const gridParents = document.getElementById('grid-parents');
    const gridDrivers = document.getElementById('grid-drivers');
    const gridStaff = document.getElementById('grid-staff');

    function setActiveTab(tab) {
      DirectoriesPage.currentTab = tab;

      // Update Parent Tab button
      if (tab === 'parents') {
        tabParents.className = 'py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer select-none flex items-center justify-center gap-2 bg-indigo-600 text-white shadow-md';
        gridParents.classList.remove('hidden');
      } else {
        tabParents.className = 'py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer select-none flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
        gridParents.classList.add('hidden');
      }

      // Update Driver Tab button
      if (tab === 'drivers') {
        tabDrivers.className = 'py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer select-none flex items-center justify-center gap-2 bg-amber-500 text-white shadow-md';
        gridDrivers.classList.remove('hidden');
      } else {
        tabDrivers.className = 'py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer select-none flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
        gridDrivers.classList.add('hidden');
      }

      // Update Staff Tab button
      if (tab === 'staff') {
        tabStaff.className = 'py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer select-none flex items-center justify-center gap-2 bg-emerald-600 text-white shadow-md';
        gridStaff.classList.remove('hidden');
      } else {
        tabStaff.className = 'py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer select-none flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
        gridStaff.classList.add('hidden');
      }
    }

    if (tabParents) tabParents.onclick = () => setActiveTab('parents');
    if (tabDrivers) tabDrivers.onclick = () => setActiveTab('drivers');
    if (tabStaff) tabStaff.onclick = () => setActiveTab('staff');

    // ==========================================
    // Real-Time Search Handlers for All 3 Tabs
    // ==========================================

    // 1. PARENTS SEARCH (By Name or Phone)
    const searchParents = document.getElementById('dir-search-parents');
    const clearParents = document.getElementById('dir-clear-parents-search');
    const parentsNoRes = document.getElementById('dir-parents-no-results');
    const parentCards = document.querySelectorAll('#dir-parents-list .dir-parent-card');

    if (searchParents) {
      const filterParents = () => {
        const query = searchParents.value.trim().toLowerCase();
        const digits = query.replace(/\D/g, '');
        if (clearParents) clearParents.classList.toggle('hidden', !query);

        let visible = 0;
        parentCards.forEach(card => {
          const name = card.getAttribute('data-name') || '';
          const phone = card.getAttribute('data-phone') || '';
          const match = !query || name.includes(query) || (digits.length >= 3 && phone.includes(digits));
          card.style.display = match ? '' : 'none';
          if (match) visible++;
        });

        if (parentsNoRes) {
          parentsNoRes.classList.toggle('hidden', visible > 0 || !query);
          const term = parentsNoRes.querySelector('.search-term');
          if (term) term.textContent = searchParents.value.trim();
        }
      };

      searchParents.addEventListener('input', filterParents);
      if (clearParents) {
        clearParents.onclick = () => {
          searchParents.value = '';
          filterParents();
          searchParents.focus();
        };
      }
    }

    // 2. DRIVERS SEARCH (By Name, Phone, or Van No)
    const searchDrivers = document.getElementById('dir-search-drivers');
    const clearDrivers = document.getElementById('dir-clear-drivers-search');
    const driversNoRes = document.getElementById('dir-drivers-no-results');
    const driverCards = document.querySelectorAll('#dir-drivers-list .dir-driver-card');

    if (searchDrivers) {
      const filterDrivers = () => {
        const query = searchDrivers.value.trim().toLowerCase();
        const digits = query.replace(/\D/g, '');
        if (clearDrivers) clearDrivers.classList.toggle('hidden', !query);

        let visible = 0;
        driverCards.forEach(card => {
          const name = card.getAttribute('data-name') || '';
          const phone = card.getAttribute('data-phone') || '';
          const van = card.getAttribute('data-van') || '';
          const match = !query || name.includes(query) || van.includes(query) || (digits.length >= 3 && phone.includes(digits));
          card.style.display = match ? '' : 'none';
          if (match) visible++;
        });

        if (driversNoRes) {
          driversNoRes.classList.toggle('hidden', visible > 0 || !query);
          const term = driversNoRes.querySelector('.search-term');
          if (term) term.textContent = searchDrivers.value.trim();
        }
      };

      searchDrivers.addEventListener('input', filterDrivers);
      if (clearDrivers) {
        clearDrivers.onclick = () => {
          searchDrivers.value = '';
          filterDrivers();
          searchDrivers.focus();
        };
      }
    }

    // 3. STAFF SEARCH (By Full Name, Label, or Vehicle Number)
    const searchStaff = document.getElementById('dir-search-staff');
    const clearStaff = document.getElementById('dir-clear-staff-search');
    const staffNoRes = document.getElementById('dir-staff-no-results');
    const staffCards = document.querySelectorAll('#dir-staff-list .dir-staff-card');

    if (searchStaff) {
      const filterStaff = () => {
        const query = searchStaff.value.trim().toLowerCase();
        if (clearStaff) clearStaff.classList.toggle('hidden', !query);

        let visible = 0;
        staffCards.forEach(card => {
          const name = card.getAttribute('data-name') || '';
          const label = card.getAttribute('data-label') || '';
          const van = card.getAttribute('data-van') || '';
          const match = !query || name.includes(query) || label.includes(query) || van.includes(query);
          card.style.display = match ? '' : 'none';
          if (match) visible++;
        });

        if (staffNoRes) {
          staffNoRes.classList.toggle('hidden', visible > 0 || !query);
          const term = staffNoRes.querySelector('.search-term');
          if (term) term.textContent = searchStaff.value.trim();
        }
      };

      searchStaff.addEventListener('input', filterStaff);
      if (clearStaff) {
        clearStaff.onclick = () => {
          searchStaff.value = '';
          filterStaff();
          searchStaff.focus();
        };
      }
    }

    // Auto-spacing & Capitalizing Indian License Plate Formatter (Identical to Driver Registration)
    const attachPlateAutoFormatter = (inputEl) => {
      if (!inputEl) return () => {};
      let prevVal = inputEl.value || '';
      let isBackspacing = false;

      inputEl.addEventListener('keydown', (e) => {
        isBackspacing = e.key === 'Backspace' || e.key === 'Delete';
      });

      const formatFn = () => {
        const curVal = inputEl.value;
        if (isBackspacing || curVal.length < prevVal.length) {
          prevVal = curVal;
          return;
        }

        let raw = curVal.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (raw.length > 10) raw = raw.slice(0, 10);

        let formatted = '';
        if (raw.length <= 2) {
          formatted = raw;
        } else if (raw.length <= 4) {
          formatted = raw.slice(0, 2) + ' ' + raw.slice(2);
        } else if (raw.length <= 6) {
          formatted = raw.slice(0, 2) + ' ' + raw.slice(2, 4) + ' ' + raw.slice(4);
        } else {
          let state = raw.slice(0, 2);
          let rto = raw.slice(2, 4);
          let tail = raw.slice(4);
          let lettersMatch = tail.match(/^[A-Z]+/);
          if (lettersMatch) {
            let series = lettersMatch[0].slice(0, 2);
            let digits = tail.slice(series.length).slice(0, 4);
            formatted = `${state} ${rto} ${series}${digits ? ' ' + digits : ''}`;
          } else {
            formatted = `${state} ${rto} ${tail.slice(0, 2)} ${tail.slice(2, 6)}`;
          }
        }
        inputEl.value = formatted.trim();
        prevVal = inputEl.value;
      };

      inputEl.addEventListener('input', formatFn);
      inputEl.addEventListener('paste', () => setTimeout(formatFn, 0));
      return (val) => {
        if (val !== undefined) {
          inputEl.value = val;
          prevVal = '';
          isBackspacing = false;
        }
        formatFn();
      };
    };

    const formatAddPlate = attachPlateAutoFormatter(document.getElementById('add-staff-vehicle-no'));
    const formatEditPlate = attachPlateAutoFormatter(document.getElementById('edit-staff-vehicle-no'));

    // Add Staff Modal Controls
    const modal = document.getElementById('add-staff-modal');
    const openBtn = document.getElementById('open-add-staff-modal-btn');
    const closeBtn = document.getElementById('close-add-staff-modal-btn');
    const cancelBtn = document.getElementById('cancel-add-staff-btn');

    const openModal = () => {
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        const form = document.getElementById('add-staff-form');
        if (form) form.reset();
        if (formatAddPlate) formatAddPlate('');
        const nameInput = document.getElementById('add-staff-name');
        if (nameInput) setTimeout(() => nameInput.focus(), 50);
      }
    };

    const closeModal = () => {
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        const form = document.getElementById('add-staff-form');
        if (form) form.reset();
      }
    };

    if (openBtn) openBtn.onclick = openModal;
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    // Submit Add Staff Form
    const addForm = document.getElementById('add-staff-form');
    if (addForm) {
      addForm.onsubmit = async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('add-staff-name');
        const vehicleInput = document.getElementById('add-staff-vehicle-no');
        const typeSelect = document.getElementById('add-staff-vehicle-type');
        const phoneInput = document.getElementById('add-staff-phone');

        const name = (nameInput?.value || '').trim();
        const vehicleNo = (vehicleInput?.value || '').trim().toUpperCase();
        const vehicleType = (typeSelect?.value || '').trim();
        const phone = (phoneInput?.value || '').trim();
        const submitBtn = document.getElementById('submit-add-staff-btn');

        const parts = name.split(/\s+/).filter(Boolean);
        if (parts.length < 2 || parts[0].length < 2 || parts[1].length < 2) {
          window.showToast('Please enter full name (both first and last name, e.g. Ramu Chandan)', 'error');
          return;
        }

        if (!vehicleNo) {
          window.showToast('Vehicle number is compulsory for staff members', 'error');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';

        try {
          const res = await window.api.request('/api/drivers', {
            method: 'POST',
            body: JSON.stringify({
              driver_name: name,
              type: 'staff',
              van_no: vehicleNo,
              phone: phone,
              vehicle_type: vehicleType
            })
          });

          // Save new staff member locally
          const newMember = {
            id: res.id,
            label: res.label,
            type: 'staff',
            driver_name: name,
            van_no: vehicleNo,
            phone: phone,
            vehicle_type: vehicleType,
            created_at: new Date().toISOString()
          };
          try {
            const currentReg = JSON.parse(localStorage.getItem('campusride_persistent_staff_registry') || '[]');
            currentReg.push(newMember);
            localStorage.setItem('campusride_persistent_staff_registry', JSON.stringify(currentReg));

            const vault = JSON.parse(localStorage.getItem('campusride_staff_vehicle_vault') || '{}');
            vault[res.id] = { van_no: vehicleNo, vehicle_type: vehicleType, phone: phone, label: res.label, name: name, updated_at: Date.now() };
            if (name) vault[name.toLowerCase()] = vault[res.id];
            localStorage.setItem('campusride_staff_vehicle_vault', JSON.stringify(vault));
          } catch (e) {}

          window.showToast(`Staff member "${name}" registered as ${res.label}!`, 'success');
          closeModal();

          // Refresh Staff Directory view
          DirectoriesPage.currentTab = 'staff';
          const appEl = document.getElementById('app');
          appEl.innerHTML = `
            ${window.HeaderComponent.render(user)}
            <main class="pb-24 sm:pb-12">
              ${await DirectoriesPage.render(user)}
            </main>
          `;
          DirectoriesPage.attachEvents(user);
        } catch (err) {
          window.showToast(err.message || 'Failed to add staff', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = '➕ Add Staff Member';
        }
      };
    }

    // Delete Staff Handlers
    const deleteBtns = document.querySelectorAll('.dir-delete-staff-btn');
    deleteBtns.forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name') || 'this staff member';
        if (!confirm(`Are you sure you want to remove "${name}" from the staff directory?`)) {
          return;
        }

        try {
          await window.api.request(`/api/drivers/${id}`, { method: 'DELETE' });

          try {
            const currentReg = JSON.parse(localStorage.getItem('campusride_persistent_staff_registry') || '[]');
            const updatedReg = currentReg.filter(s => s.id !== id);
            localStorage.setItem('campusride_persistent_staff_registry', JSON.stringify(updatedReg));
          } catch (e) {}

          window.showToast(`Removed "${name}" from staff directory.`, 'info');

          // Refresh Staff Directory view
          DirectoriesPage.currentTab = 'staff';
          const appEl = document.getElementById('app');
          appEl.innerHTML = `
            ${window.HeaderComponent.render(user)}
            <main class="pb-24 sm:pb-12">
              ${await DirectoriesPage.render(user)}
            </main>
          `;
          DirectoriesPage.attachEvents(user);
        } catch (err) {
          window.showToast(err.message || 'Failed to delete staff member', 'error');
        }
      };
    });

    // View Pass Buttons (Direct Click + Delegated Fallback)
    const openDriverPass = (btn) => {
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const label = btn.getAttribute('data-label');
      const name = btn.getAttribute('data-name');
      const plate = btn.getAttribute('data-plate');
      const phone = btn.getAttribute('data-phone');
      if (typeof window.showPassModal === 'function') {
        window.showPassModal({ id, label, name, plate, phone, type: 'van' });
      } else if (typeof window.showDriverPassQRModal === 'function') {
        window.showDriverPassQRModal({ id, label, name, plate, phone });
      }
    };

    const openStaffPass = (btn) => {
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const label = btn.getAttribute('data-label');
      const name = btn.getAttribute('data-name');
      const plate = btn.getAttribute('data-plate') || '';
      const phone = btn.getAttribute('data-phone') || '';
      if (typeof window.showPassModal === 'function') {
        window.showPassModal({ id, label, name, plate, phone, type: 'staff' });
      } else if (typeof window.showDriverPassQRModal === 'function') {
        window.showDriverPassQRModal({ id, label, name, plate, phone });
      }
    };

    const openDriverInfo = (btn) => {
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const label = btn.getAttribute('data-label');
      const name = btn.getAttribute('data-name');
      const plate = btn.getAttribute('data-plate');
      const phone = btn.getAttribute('data-phone');
      const vehicle_type = btn.getAttribute('data-type');
      if (typeof window.showDriverInfoQRModal === 'function') {
        window.showDriverInfoQRModal({ id, label, name, plate, phone, vehicle_type });
      }
    };

    const viewDriverBtns = document.querySelectorAll('.dir-view-driver-pass-btn');
    viewDriverBtns.forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openDriverPass(btn);
      };
    });

    const viewDriverInfoBtns = document.querySelectorAll('.dir-view-driver-info-btn');
    viewDriverInfoBtns.forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openDriverInfo(btn);
      };
    });

    const viewStaffBtns = document.querySelectorAll('.dir-view-staff-pass-btn');
    viewStaffBtns.forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openStaffPass(btn);
      };
    });

    // Delegated container click fallback
    const dirContainer = document.getElementById('grid-staff') || document.getElementById('grid-drivers');
    if (dirContainer && !dirContainer._passDelegated) {
      dirContainer._passDelegated = true;
      document.addEventListener('click', (e) => {
        const sBtn = e.target.closest('.dir-view-staff-pass-btn');
        if (sBtn) {
          e.stopPropagation();
          openStaffPass(sBtn);
          return;
        }
        const dBtn = e.target.closest('.dir-view-driver-pass-btn');
        if (dBtn) {
          e.stopPropagation();
          openDriverPass(dBtn);
          return;
        }
        const infoBtn = e.target.closest('.dir-view-driver-info-btn');
        if (infoBtn) {
          e.stopPropagation();
          openDriverInfo(infoBtn);
          return;
        }
      });
    }

    // Bulk Print All Driver QRs
    const printAllDriversBtn = document.getElementById('dir-print-all-drivers-btn');
    if (printAllDriversBtn) {
      printAllDriversBtn.onclick = () => {
        const driversList = DirectoriesPage.currentDrivers || [];
        if (driversList.length === 0) {
          window.showToast('No drivers to print', 'info');
          return;
        }
        if (typeof window.printBulkPasses === 'function') {
          window.printBulkPasses('All Drivers', driversList.map(d => ({
            id: d.id,
            label: d.label,
            name: d.driver_name,
            number: d.van_no ? `${d.label} • ${d.van_no}` : d.label,
            van_no: d.van_no
          })));
        }
      };
    }

    // Bulk Print All Staff QRs
    const printAllStaffBtn = document.getElementById('dir-print-all-staff-btn');
    if (printAllStaffBtn) {
      printAllStaffBtn.onclick = () => {
        const staffList = DirectoriesPage.currentStaff || [];
        if (staffList.length === 0) {
          window.showToast('No staff to print', 'info');
          return;
        }
        if (typeof window.printBulkPasses === 'function') {
          window.printBulkPasses('All Staff', staffList.map(s => {
            const hasPlate = s.van_no && s.van_no !== 'Staff Pass' && s.van_no !== 'STAFF PASS';
            return {
              id: s.id,
              label: s.label,
              name: s.driver_name,
              number: hasPlate ? `${s.label} • ${s.van_no}` : s.label,
              van_no: hasPlate ? s.van_no : ''
            };
          }));
        }
      };
    }

    // Edit Staff Modal Controls
    const editModal = document.getElementById('edit-staff-modal');
    const closeEditBtn = document.getElementById('close-edit-staff-modal-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-staff-btn');
    const editForm = document.getElementById('edit-staff-form');

    const openEditModal = (staffMember) => {
      if (!editModal) return;
      document.getElementById('edit-staff-id').value = staffMember.id;
      document.getElementById('edit-staff-name').value = staffMember.name;
      document.getElementById('edit-staff-phone').value = staffMember.phone || '';
      if (formatEditPlate) {
        formatEditPlate(staffMember.van || '');
      } else {
        document.getElementById('edit-staff-vehicle-no').value = staffMember.van || '';
      }
      document.getElementById('edit-staff-vehicle-type').value = (staffMember.vehicleType === '2_wheeler' || staffMember.vehicleType === '4_wheeler') ? staffMember.vehicleType : '';
      document.getElementById('edit-staff-label-badge').textContent = staffMember.label;

      editModal.classList.remove('hidden');
      editModal.classList.add('flex');
      const vanInput = document.getElementById('edit-staff-vehicle-no');
      if (vanInput && !vanInput.value) {
        setTimeout(() => vanInput.focus(), 50);
      } else {
        const nameInput = document.getElementById('edit-staff-name');
        if (nameInput) setTimeout(() => nameInput.focus(), 50);
      }
    };

    const closeEditModal = () => {
      if (!editModal) return;
      editModal.classList.add('hidden');
      editModal.classList.remove('flex');
      if (editForm) editForm.reset();
    };

    if (closeEditBtn) closeEditBtn.onclick = closeEditModal;
    if (cancelEditBtn) cancelEditBtn.onclick = closeEditModal;

    const editBtns = document.querySelectorAll('.dir-edit-staff-btn');
    editBtns.forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const label = btn.getAttribute('data-label');
        const name = btn.getAttribute('data-name');
        const phone = btn.getAttribute('data-phone');
        const van = btn.getAttribute('data-van') || '';
        const vehicleType = btn.getAttribute('data-vehicle-type') || '';
        openEditModal({ id, label, name, phone, van, vehicleType });
      };
    });

    if (editForm) {
      editForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-staff-id').value;
        const name = document.getElementById('edit-staff-name').value.trim();
        const phone = document.getElementById('edit-staff-phone').value.trim();
        const vehicleNo = document.getElementById('edit-staff-vehicle-no').value.trim().toUpperCase();
        const vehicleType = document.getElementById('edit-staff-vehicle-type').value.trim();
        const submitBtn = document.getElementById('submit-edit-staff-btn');

        const parts = name.split(/\s+/).filter(Boolean);
        if (parts.length < 2 || parts[0].length < 2 || parts[1].length < 2) {
          window.showToast('Please enter full name (both first and last name, e.g. Ramu Chandan)', 'error');
          return;
        }

        if (!vehicleNo) {
          window.showToast('Vehicle number is compulsory for staff members', 'error');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
          await window.api.request(`/api/drivers/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
              driver_name: name,
              phone: phone,
              van_no: vehicleNo,
              vehicle_type: vehicleType
            })
          });

          // Update local persistent device storage and vault
          try {
            const currentReg = JSON.parse(localStorage.getItem('campusride_persistent_staff_registry') || '[]');
            const idx = currentReg.findIndex(s => s.id === id);
            if (idx !== -1) {
              currentReg[idx].driver_name = name;
              currentReg[idx].phone = phone;
              currentReg[idx].van_no = vehicleNo;
              currentReg[idx].vehicle_type = vehicleType;
              localStorage.setItem('campusride_persistent_staff_registry', JSON.stringify(currentReg));
            }
            const vault = JSON.parse(localStorage.getItem('campusride_staff_vehicle_vault') || '{}');
            vault[id] = { van_no: vehicleNo, vehicle_type: vehicleType, phone: phone, name: name, updated_at: Date.now() };
            if (name) vault[name.toLowerCase()] = vault[id];
            localStorage.setItem('campusride_staff_vehicle_vault', JSON.stringify(vault));
          } catch (e) {}

          window.showToast(`Staff info for "${name}" updated successfully!`, 'success');
          closeEditModal();

          // Refresh Staff Directory view
          DirectoriesPage.currentTab = 'staff';
          const appEl = document.getElementById('app');
          appEl.innerHTML = `
            ${window.HeaderComponent.render(user)}
            <main class="pb-24 sm:pb-12">
              ${await DirectoriesPage.render(user)}
            </main>
          `;
          DirectoriesPage.attachEvents(user);
        } catch (err) {
          window.showToast(err.message || 'Failed to update staff info', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = '💾 Save Changes';
        }
      };
    }

    // Bulk Staff Vehicle Manager Controls
    const bulkVehicleModal = document.getElementById('bulk-staff-vehicle-modal');
    const openBulkBtn = document.getElementById('open-bulk-vehicle-modal-btn');
    const closeBulkBtn = document.getElementById('close-bulk-vehicle-modal-btn');
    const cancelBulkBtn = document.getElementById('cancel-bulk-vehicle-btn');
    const saveBulkBtn = document.getElementById('save-bulk-vehicle-btn');
    const searchBulkInput = document.getElementById('bulk-vehicle-search');
    const filterBulkType = document.getElementById('bulk-vehicle-filter-type');

    if (openBulkBtn && bulkVehicleModal) {
      openBulkBtn.onclick = () => {
        bulkVehicleModal.classList.remove('hidden');
        bulkVehicleModal.classList.add('flex');
        // Attach auto-formatters to all plate inputs in bulk modal
        const plateInputs = bulkVehicleModal.querySelectorAll('.bulk-plate-input');
        plateInputs.forEach(input => {
          if (!input._formatterAttached) {
            input._formatterAttached = true;
            attachPlateAutoFormatter(input);
          }
        });
        if (searchBulkInput) {
          searchBulkInput.value = '';
          setTimeout(() => searchBulkInput.focus(), 50);
        }
      };
    }

    const closeBulkModal = () => {
      if (!bulkVehicleModal) return;
      bulkVehicleModal.classList.add('hidden');
      bulkVehicleModal.classList.remove('flex');
    };

    if (closeBulkBtn) closeBulkBtn.onclick = closeBulkModal;
    if (cancelBulkBtn) cancelBulkBtn.onclick = closeBulkModal;

    // Filter rows in bulk vehicle modal
    const filterBulkRows = () => {
      if (!bulkVehicleModal) return;
      const q = (searchBulkInput?.value || '').trim().toLowerCase();
      const typeFilter = filterBulkType?.value || 'all';
      const rows = bulkVehicleModal.querySelectorAll('.bulk-vehicle-row');

      rows.forEach(r => {
        const name = r.getAttribute('data-name') || '';
        const label = r.getAttribute('data-label') || '';
        const plateInput = r.querySelector('.bulk-plate-input');
        const plate = (plateInput?.value || '').toLowerCase();
        const typeSelect = r.querySelector('.bulk-type-select');
        const selType = typeSelect?.value || 'walk_in';

        const matchesQuery = !q || name.includes(q) || label.includes(q) || plate.includes(q);
        let matchesType = true;
        if (typeFilter === 'with_vehicle') {
          matchesType = (plate && plate !== 'staff pass') || (selType !== 'walk_in');
        } else if (typeFilter === 'walk_in') {
          matchesType = (!plate || plate === 'staff pass') && (selType === 'walk_in');
        }

        r.style.display = (matchesQuery && matchesType) ? '' : 'none';
      });
    };

    if (searchBulkInput) searchBulkInput.addEventListener('input', filterBulkRows);
    if (filterBulkType) filterBulkType.addEventListener('change', filterBulkRows);

    // Save All in Bulk Vehicle Modal
    if (saveBulkBtn && bulkVehicleModal) {
      saveBulkBtn.onclick = async () => {
        saveBulkBtn.disabled = true;
        const btnText = document.getElementById('save-bulk-btn-text');
        if (btnText) btnText.textContent = 'Saving All...';

        try {
          const rows = bulkVehicleModal.querySelectorAll('.bulk-vehicle-row');
          const currentStaff = DirectoriesPage.currentStaff || [];
          const staffMap = new Map();
          currentStaff.forEach(s => staffMap.set(s.id, { ...s }));

          let vault = {};
          try {
            vault = JSON.parse(localStorage.getItem('campusride_staff_vehicle_vault') || '{}');
          } catch (e) {}

          const updatedList = [];
          rows.forEach(r => {
            const id = r.getAttribute('data-id');
            const plateInput = r.querySelector('.bulk-plate-input');
            const typeSelect = r.querySelector('.bulk-type-select');
            const plateVal = (plateInput?.value || '').trim().toUpperCase();
            const typeVal = typeSelect?.value || 'walk_in';

            const staffObj = staffMap.get(id);
            if (staffObj) {
              staffObj.van_no = plateVal || 'Staff Pass';
              staffObj.vehicle_type = typeVal;

              // Save to vault
              vault[id] = { van_no: staffObj.van_no, vehicle_type: staffObj.vehicle_type, phone: staffObj.phone || '', label: staffObj.label, name: staffObj.driver_name, updated_at: Date.now() };
              if (staffObj.driver_name) vault[staffObj.driver_name.toLowerCase()] = vault[id];

              updatedList.push(staffObj);
            }
          });

          // Save to persistent storage and vault
          localStorage.setItem('campusride_persistent_staff_registry', JSON.stringify(updatedList));
          localStorage.setItem('campusride_staff_vehicle_vault', JSON.stringify(vault));

          // Send to server
          await window.api.request('/api/drivers/sync', {
            method: 'POST',
            body: JSON.stringify({ staffList: updatedList })
          });

          window.showToast('✅ All staff vehicle details saved permanently!', 'success');
          closeBulkModal();

          // Refresh Staff Directory view
          DirectoriesPage.currentTab = 'staff';
          const appEl = document.getElementById('app');
          appEl.innerHTML = `
            ${window.HeaderComponent.render(user)}
            <main class="pb-24 sm:pb-12">
              ${await DirectoriesPage.render(user)}
            </main>
          `;
          DirectoriesPage.attachEvents(user);
        } catch (err) {
          window.showToast(err.message || 'Failed to save staff vehicle details', 'error');
          saveBulkBtn.disabled = false;
          if (btnText) btnText.textContent = 'Save All Changes';
        }
      };
    }
  }
}

window.DirectoriesPage = DirectoriesPage;
