// CampusRide — Dedicated Campus Directory (§7.7)
// Three Distinct Options:
// 1. Parents (View-only, NO add option)
// 2. Drivers (View-only, NO add option — automatically added upon driver account creation)
// 3. Staff (Non-gate staff added personally or by QR scan — asks ONLY for Name)
class DirectoriesPage {
  static currentTab = 'parents'; // 'parents' | 'drivers' | 'staff'

  static async render(user) {
    let drivers = [];
    let parents = [];
    let staff = [];

    // Load persistent staff and deletion tombstones from local device storage
    let localStaff = [];
    let deletedStaffIds = new Set();
    try {
      const stored = localStorage.getItem('campusride_persistent_staff_registry');
      if (stored) localStaff = JSON.parse(stored);
      const delStored = localStorage.getItem('campusride_deleted_staff_ids');
      if (delStored) deletedStaffIds = new Set(JSON.parse(delStored));
    } catch (e) {
      localStaff = [];
      deletedStaffIds = new Set();
    }
    localStaff = (Array.isArray(localStaff) ? localStaff : []).filter(s => s && s.id && !deletedStaffIds.has(s.id));

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

      // Server staff (filter out any locally deleted tombstones)
      const serverStaff = allDrivers.filter(d => d.type === 'staff' && !deletedStaffIds.has(d.id));

      // Indestructible Sync Check:
      // If the device has staff that the server is missing (e.g. fresh Render container or deployment),
      // merge immediately so the user never sees them disappear, and sync them back to the server.
      const missingOnServer = localStaff.filter(ls => !serverStaff.some(ss => ss.id === ls.id));
      if (missingOnServer.length > 0) {
        window.api.request('/api/drivers/sync', {
          method: 'POST',
          body: JSON.stringify({ staffList: missingOnServer })
        }).catch(err => console.warn('[Directories] Background staff sync notice:', err.message));

        const mergedMap = new Map();
        for (const s of [...serverStaff, ...missingOnServer]) {
          if (!deletedStaffIds.has(s.id)) {
            mergedMap.set(s.id, s);
          }
        }
        staff = Array.from(mergedMap.values());
      } else {
        staff = serverStaff;
      }

      // Keep device storage synchronized with current valid staff
      const registryMap = new Map();
      for (const s of localStaff) registryMap.set(s.id, s);
      for (const s of staff) registryMap.set(s.id, s);
      const updatedRegistry = Array.from(registryMap.values()).filter(s => !deletedStaffIds.has(s.id));
      localStorage.setItem('campusride_persistent_staff_registry', JSON.stringify(updatedRegistry));

      // Personally added staff: Staff 1, Staff 2, ...
      staff.sort((a, b) => {
        const numA = parseInt((a.label || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt((b.label || '').replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });
      parents = pRes.parents || [];
    } catch (err) {
      console.warn('[Directories] Fetch error:', err.message);
      // Offline fallback: Use local persistent staff
      staff = localStaff;
    }
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
          <button type="button" onclick="window.goBack()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <span class="text-base font-black">←</span> <span>Back</span>
          </button>
        </div>

        <!-- Page Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white">Campus Directory</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Browse registered Parents, transport Drivers, and personally added Staff passes.
            </p>
          </div>
        </div>

        <!-- 3 Dedicated Options Tabs (Parents, Drivers, Staff) -->
        <div class="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl max-w-xl">
          <button type="button" id="dir-tab-parents" class="py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer select-none flex items-center justify-center gap-1.5 ${initialTab === 'parents' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
            <span>👨‍👩‍👧 Parents</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full ${initialTab === 'parents' ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}">${parents.length}</span>
          </button>

          <button type="button" id="dir-tab-drivers" class="py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer select-none flex items-center justify-center gap-1.5 ${initialTab === 'drivers' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
            <span>🚌 Drivers</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full ${initialTab === 'drivers' ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}">${drivers.length}</span>
          </button>

          <button type="button" id="dir-tab-staff" class="py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer select-none flex items-center justify-center gap-1.5 ${initialTab === 'staff' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
            <span>👔 Staff</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full ${initialTab === 'staff' ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}">${staff.length}</span>
          </button>
        </div>

        <!-- 1. PARENTS DIRECTORY (NO ADD OPTION) -->
        <div id="grid-parents" class="${initialTab === 'parents' ? '' : 'hidden '}space-y-4 animate-fade-in-up">
          <div class="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 class="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>👨‍👩‍👧 Registered Parent Accounts (${parents.length})</span>
              </h2>
              <p class="text-[11px] text-slate-400 mt-0.5">Parents self-registered via account registration with student pickup details.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${parents.length === 0 ? `
              <div class="col-span-full cr-card p-12 text-center text-slate-400 text-xs">
                No parent accounts registered yet.
              </div>
            ` : parents.map(p => `
              <div class="cr-card p-5 space-y-3 border-l-4 border-l-indigo-500 flex flex-col justify-between">
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
                    <div class="text-slate-500 flex items-center gap-1.5 truncate" title="${p.address || ''}">
                      <span class="text-slate-400">Location:</span>
                      <span class="truncate">${p.address || 'Live GPS Coordinates'}</span>
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

        <!-- 2. DRIVERS DIRECTORY (NO ADD OPTION — Drivers automatically added upon registration as Van 1, Van 2, ...) -->
        <div id="grid-drivers" class="${initialTab === 'drivers' ? '' : 'hidden '}space-y-4 animate-fade-in-up">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 class="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>🚌 Registered Transport Drivers (${drivers.length})</span>
              </h2>
              <p class="text-[11px] text-slate-400 mt-0.5">Drivers are automatically added with sequential Van names upon account creation.</p>
            </div>
            ${drivers.length > 0 ? `
              <button type="button" id="dir-print-all-drivers-btn" class="cr-btn cr-btn-secondary text-xs py-2 px-3.5 shadow-sm flex items-center gap-1.5 cursor-pointer">
                <span>🖨️</span> <span>Print All Driver QRs</span>
              </button>
            ` : ''}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${drivers.length === 0 ? `
              <div class="col-span-full cr-card p-12 text-center text-slate-400 text-xs">
                No transport drivers registered yet. Drivers appear here automatically as soon as they create an account.
              </div>
            ` : drivers.map(d => `
              <div class="cr-card p-5 space-y-3 border-l-4 border-l-amber-500 flex flex-col justify-between">
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
                    <a href="tel:${d.phone}" class="cr-btn bg-amber-500 hover:bg-amber-400 text-white flex-1 py-1.5 text-xs text-center font-bold">
                      📞 Call Driver
                    </a>
                  ` : ''}
                  <button type="button" class="dir-view-driver-pass-btn cr-btn cr-btn-secondary flex-1 py-1.5 text-xs text-center cursor-pointer select-none"
                          data-id="${d.id}" data-label="${d.label}" data-name="${d.driver_name}" data-plate="${d.van_no}" data-phone="${d.phone || ''}">
                    🎟️ View Pass
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 3. STAFF DIRECTORY (NON-GATE STAFF ADDED PERSONALLY — ASKS ONLY FOR NAME OR SCAN QR) -->
        <div id="grid-staff" class="${initialTab === 'staff' ? '' : 'hidden '}space-y-4 animate-fade-in-up">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 class="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>👔 Personally Added Staff (${staff.length})</span>
              </h2>
              <p class="text-[11px] text-slate-400 mt-0.5">Campus helpers, attendants, and non-gate staff passes.</p>
            </div>
            <!-- Dual Add Options & Print All Staff QRs -->
            <div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              ${staff.length > 0 ? `
                <button type="button" id="dir-print-all-staff-btn" class="cr-btn cr-btn-secondary text-xs py-2 px-3 shadow-sm flex items-center gap-1.5 cursor-pointer">
                  <span>🖨️</span> <span>Print All Staff QRs</span>
                </button>
              ` : ''}
              <button type="button" id="open-scan-staff-qr-btn" class="cr-btn cr-btn-secondary text-xs py-2 px-3 shadow-sm flex items-center gap-1.5 cursor-pointer">
                <span>📷</span> <span>Scan QR</span>
              </button>
              <button type="button" id="open-add-staff-modal-btn" class="cr-btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 px-3.5 shadow-md flex items-center gap-1.5 cursor-pointer">
                <span>➕</span> <span>Add Staff</span>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${staff.length === 0 ? `
              <div class="col-span-full cr-card p-12 text-center text-slate-400 text-xs">
                No personally added staff yet. Click <b>"➕ Add Staff"</b> or <b>"📷 Scan QR"</b> above.
              </div>
            ` : staff.map(s => `
              <div class="cr-card p-5 space-y-3 border-l-4 border-l-emerald-500 flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      ${s.label}
                    </span>
                    <span class="text-[10px] font-semibold text-slate-400 uppercase">
                      🚶 Campus Staff Pass
                    </span>
                  </div>

                  <div class="mt-3">
                    <h3 class="font-bold text-base text-slate-900 dark:text-white">${s.driver_name}</h3>
                    <div class="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Role: Campus Staff
                    </div>
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
                          data-id="${s.id}" data-label="${s.label}" data-name="${s.driver_name}" data-phone="${s.phone || ''}">
                    ✏️ Edit
                  </button>
                  <button type="button" class="dir-view-staff-pass-btn cr-btn cr-btn-secondary flex-1 py-1.5 text-xs text-center font-bold cursor-pointer select-none"
                          data-id="${s.id}" data-label="${s.label}" data-name="${s.driver_name}" data-plate="Staff Pass" data-phone="${s.phone || ''}">
                    🎟️ View Pass
                  </button>
                  <button type="button" class="dir-delete-staff-btn p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer select-none"
                          data-id="${s.id}" data-name="${s.driver_name}" title="Remove staff">
                    🗑️
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- MODAL: ADD STAFF PERSONALLY (ASKS ONLY FOR NAME — NO VEHICLE NO, NO PHONE NO) -->
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
                <p class="text-[10px] text-slate-400 mt-1">Please enter full name (both first and last name). No vehicle or phone number is required.</p>
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
                  Phone Number (Optional)
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
        tabParents.className = 'py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer select-none flex items-center justify-center gap-1.5 bg-indigo-600 text-white shadow-md';
        gridParents.classList.remove('hidden');
      } else {
        tabParents.className = 'py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer select-none flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
        gridParents.classList.add('hidden');
      }

      // Update Driver Tab button
      if (tab === 'drivers') {
        tabDrivers.className = 'py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer select-none flex items-center justify-center gap-1.5 bg-amber-500 text-white shadow-md';
        gridDrivers.classList.remove('hidden');
      } else {
        tabDrivers.className = 'py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer select-none flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
        gridDrivers.classList.add('hidden');
      }

      // Update Staff Tab button
      if (tab === 'staff') {
        tabStaff.className = 'py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer select-none flex items-center justify-center gap-1.5 bg-emerald-600 text-white shadow-md';
        gridStaff.classList.remove('hidden');
      } else {
        tabStaff.className = 'py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer select-none flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
        gridStaff.classList.add('hidden');
      }
    }

    if (tabParents) tabParents.onclick = () => setActiveTab('parents');
    if (tabDrivers) tabDrivers.onclick = () => setActiveTab('drivers');
    if (tabStaff) tabStaff.onclick = () => setActiveTab('staff');

    // Add Staff Modal Controls
    const modal = document.getElementById('add-staff-modal');
    const openBtn = document.getElementById('open-add-staff-modal-btn');
    const closeBtn = document.getElementById('close-add-staff-modal-btn');
    const cancelBtn = document.getElementById('cancel-add-staff-btn');

    const openModal = () => {
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
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

    // QR SCANNER TO ADD STAFF (STRICT SUFFICIENCY CHECK)
    const scanQrBtn = document.getElementById('open-scan-staff-qr-btn');
    if (scanQrBtn) {
      scanQrBtn.onclick = () => {
        if (!window.CameraScannerModal) {
          window.showToast('Camera scanner component not available.', 'error');
          return;
        }

        const scanner = new window.CameraScannerModal({
          title: 'Scan Staff Registration QR',
          subtitle: 'Scan a QR code containing the staff member\'s full name',
          onScan: async (qrText) => {
            scanner.close();
            try {
              window.showToast('Verifying QR information sufficiency...', 'info');
              const res = await window.api.request('/api/scanner/register-qr', {
                method: 'POST',
                body: JSON.stringify({ text: qrText, type: 'staff' })
              });

              // Instantly persist in device storage so it survives redeployments
              try {
                const currentReg = JSON.parse(localStorage.getItem('campusride_persistent_staff_registry') || '[]');
                const newMember = {
                  id: res.id,
                  label: res.label,
                  driver_name: res.driver_name,
                  van_no: res.van_no || 'Staff Pass',
                  phone: res.phone || '',
                  vehicle_type: 'walk_in',
                  type: 'staff',
                  created_at: new Date().toISOString()
                };
                if (!currentReg.some(s => s.id === res.id)) {
                  currentReg.push(newMember);
                  localStorage.setItem('campusride_persistent_staff_registry', JSON.stringify(currentReg));
                }
                const delIds = JSON.parse(localStorage.getItem('campusride_deleted_staff_ids') || '[]').filter(id => id !== res.id);
                localStorage.setItem('campusride_deleted_staff_ids', JSON.stringify(delIds));
              } catch (e) {}

              window.showToast(`✅ Staff member "${res.driver_name}" added successfully as ${res.label}!`, 'success');

              // Refresh Staff Directory View
              DirectoriesPage.currentTab = 'staff';
              const appEl = document.getElementById('app');
              appEl.innerHTML = `
                ${window.HeaderComponent.render(user)}
                <main class="pb-24 sm:pb-12">
                  ${await DirectoriesPage.render(user)}
                </main>
              `;
              window.HeaderComponent.attachEvents(user);
              DirectoriesPage.attachEvents(user);
            } catch (err) {
              // Insufficient info: Do NOT add, report error
              window.showToast(err.message || 'Insufficient QR information. Not added.', 'error');
            }
          }
        });
        scanner.open();
      };
    }

    // Submit Add Staff Form (ASKS ONLY FOR NAME)
    const staffForm = document.getElementById('add-staff-form');
    if (staffForm) {
      staffForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = (document.getElementById('add-staff-name').value || '').trim();
        const submitBtn = document.getElementById('submit-add-staff-btn');

        // Full Name Validation (Both first and last name required, e.g. Ramu Chandan)
        const parts = name.split(/\s+/).filter(Boolean);
        if (parts.length < 2 || parts[0].length < 2 || parts[1].length < 2) {
          window.showToast('Please enter full name (both first and last name, e.g. Ramu Chandan)', 'error');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding Staff...';

        try {
          const res = await window.api.request('/api/drivers', {
            method: 'POST',
            body: JSON.stringify({
              driver_name: name,
              type: 'staff'
            })
          });

          // Instantly persist in device storage so it survives redeployments
          try {
            const currentReg = JSON.parse(localStorage.getItem('campusride_persistent_staff_registry') || '[]');
            const newMember = {
              id: res.id,
              label: res.label,
              driver_name: res.driver_name || name,
              van_no: res.van_no || 'Staff Pass',
              phone: res.phone || '',
              vehicle_type: 'walk_in',
              type: 'staff',
              created_at: res.created_at || new Date().toISOString()
            };
            if (!currentReg.some(s => s.id === res.id)) {
              currentReg.push(newMember);
              localStorage.setItem('campusride_persistent_staff_registry', JSON.stringify(currentReg));
            }
            const delIds = JSON.parse(localStorage.getItem('campusride_deleted_staff_ids') || '[]').filter(id => id !== res.id);
            localStorage.setItem('campusride_deleted_staff_ids', JSON.stringify(delIds));
          } catch (e) {}

          window.showToast(`Staff member "${name}" successfully registered as ${res.label}!`, 'success');
          closeModal();

          // Refresh page view maintaining the Staff tab
          DirectoriesPage.currentTab = 'staff';
          const appEl = document.getElementById('app');
          appEl.innerHTML = `
            ${window.HeaderComponent.render(user)}
            <main class="pb-24 sm:pb-12">
              ${await DirectoriesPage.render(user)}
            </main>
          `;
          window.HeaderComponent.attachEvents(user);
          DirectoriesPage.attachEvents(user);
        } catch (err) {
          window.showToast(err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = '➕ Add Staff Member';
        }
      };
    }

    // Delete Personally Added Staff
    document.querySelectorAll('.dir-delete-staff-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        if (!confirm(`Are you sure you want to remove staff pass for "${name}"?`)) return;

        try {
          await window.api.request(`/api/drivers/${id}`, { method: 'DELETE' });

          // Remove from device storage and mark ID as explicitly deleted
          try {
            const currentReg = JSON.parse(localStorage.getItem('campusride_persistent_staff_registry') || '[]').filter(s => s.id !== id);
            localStorage.setItem('campusride_persistent_staff_registry', JSON.stringify(currentReg));
            const delIds = JSON.parse(localStorage.getItem('campusride_deleted_staff_ids') || '[]');
            if (!delIds.includes(id)) delIds.push(id);
            localStorage.setItem('campusride_deleted_staff_ids', JSON.stringify(delIds));
          } catch (e) {}

          window.showToast(`Staff pass for "${name}" removed.`, 'success');

          // Refresh page view maintaining the Staff tab
          DirectoriesPage.currentTab = 'staff';
          const appEl = document.getElementById('app');
          appEl.innerHTML = `
            ${window.HeaderComponent.render(user)}
            <main class="pb-24 sm:pb-12">
              ${await DirectoriesPage.render(user)}
            </main>
          `;
          window.HeaderComponent.attachEvents(user);
          DirectoriesPage.attachEvents(user);
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      };
    });

    // View QR Pass Buttons
    document.querySelectorAll('.dir-view-driver-pass-btn, .dir-view-staff-pass-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const label = btn.getAttribute('data-label');
        const name = btn.getAttribute('data-name');
        const plate = btn.getAttribute('data-plate');
        const phone = btn.getAttribute('data-phone');
        if (window.showDriverPassQRModal) {
          window.showDriverPassQRModal({ id, label, name, plate, phone });
        }
      };
    });

    // Bulk Print QRs for Drivers (Max 6 per A4 sheet)
    const printDriversBtn = document.getElementById('dir-print-all-drivers-btn');
    if (printDriversBtn) {
      printDriversBtn.onclick = () => {
        if (!window.printBulkPasses) {
          return window.showToast('Printing component not loaded.', 'error');
        }
        window.printBulkPasses('CampusRide — Transport Drivers Passes', DirectoriesPage.currentDrivers || []);
      };
    }

    // Bulk Print QRs for Staff (Max 6 per A4 sheet)
    const printStaffBtn = document.getElementById('dir-print-all-staff-btn');
    if (printStaffBtn) {
      printStaffBtn.onclick = () => {
        if (!window.printBulkPasses) {
          return window.showToast('Printing component not loaded.', 'error');
        }
        window.printBulkPasses('CampusRide — Personally Added Staff Passes', DirectoriesPage.currentStaff || []);
      };
    }

    // Edit Staff Modal Controls & Submission
    const editModal = document.getElementById('edit-staff-modal');
    const closeEditBtn = document.getElementById('close-edit-staff-modal-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-staff-btn');
    const editForm = document.getElementById('edit-staff-form');

    const closeEditModal = () => {
      if (editModal) {
        editModal.classList.add('hidden');
        editModal.classList.remove('flex');
        if (editForm) editForm.reset();
      }
    };

    if (closeEditBtn) closeEditBtn.onclick = closeEditModal;
    if (cancelEditBtn) cancelEditBtn.onclick = closeEditModal;

    document.querySelectorAll('.dir-edit-staff-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name') || '';
        const phone = btn.getAttribute('data-phone') || '';
        const label = btn.getAttribute('data-label') || '';

        document.getElementById('edit-staff-id').value = id;
        document.getElementById('edit-staff-name').value = name;
        document.getElementById('edit-staff-phone').value = phone;
        const badge = document.getElementById('edit-staff-label-badge');
        if (badge) badge.textContent = label;

        if (editModal) {
          editModal.classList.remove('hidden');
          editModal.classList.add('flex');
          const nameInput = document.getElementById('edit-staff-name');
          if (nameInput) setTimeout(() => nameInput.focus(), 50);
        }
      };
    });

    if (editForm) {
      editForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-staff-id').value;
        const name = (document.getElementById('edit-staff-name').value || '').trim();
        const phone = (document.getElementById('edit-staff-phone').value || '').trim();
        const submitBtn = document.getElementById('submit-edit-staff-btn');

        const parts = name.split(/\s+/).filter(Boolean);
        if (parts.length < 2 || parts[0].length < 2 || parts[1].length < 2) {
          window.showToast('Please enter full name (both first and last name, e.g. Ramu Chandan)', 'error');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
          await window.api.request(`/api/drivers/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
              driver_name: name,
              phone: phone
            })
          });

          // Update local persistent device storage
          try {
            const currentReg = JSON.parse(localStorage.getItem('campusride_persistent_staff_registry') || '[]');
            const idx = currentReg.findIndex(s => s.id === id);
            if (idx !== -1) {
              currentReg[idx].driver_name = name;
              currentReg[idx].phone = phone;
              localStorage.setItem('campusride_persistent_staff_registry', JSON.stringify(currentReg));
            }
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
          window.HeaderComponent.attachEvents(user);
          DirectoriesPage.attachEvents(user);
        } catch (err) {
          window.showToast(err.message || 'Failed to update staff info', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = '💾 Save Changes';
        }
      };
    }
  }
}

window.DirectoriesPage = DirectoriesPage;
