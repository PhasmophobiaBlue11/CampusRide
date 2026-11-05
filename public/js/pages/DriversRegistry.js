// CampusRide — Vans & Staff Registry Management (§7.3)
// Gate staff adds drivers/staff via manual entry or QR scanning; Admin has view/delete-only access.
class DriversRegistryPage {
  static currentTab = 'van'; // 'van' | 'staff'

  static async render(user) {
    let drivers = [];
    try {
      const res = await window.api.request('/api/drivers');
      drivers = res.drivers || [];
    } catch {}

    const vans = drivers.filter(d => d.type === 'van');
    const staff = drivers.filter(d => d.type === 'staff');

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
            <h1 class="text-2xl font-black text-slate-900 dark:text-white">Vans & Staff Registry</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active transport vehicles and staff passes. ${user.role === 'admin' ? '(Admin audit mode — Gate Staff adds new vehicles/staff)' : 'Managed by Gate Operations.'}
            </p>
          </div>
          <div class="flex items-center gap-2">
            ${user.role !== 'admin' ? `
              <button id="add-entry-modal-btn" class="cr-btn cr-btn-primary text-xs py-2 px-3.5 shadow-md flex items-center gap-1.5 cursor-pointer">
                <span id="add-btn-icon">➕</span>
                <span id="add-btn-text">Add Campus Van</span>
              </button>
            ` : `
              <span class="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                👁️ Admin Audit View
              </span>
            `}
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button type="button" id="tab-van-btn" class="px-4 py-2 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-md cursor-pointer">
            🚌 Campus Vans (${vans.length})
          </button>
          <button type="button" id="tab-staff-btn" class="px-4 py-2 rounded-xl text-xs font-bold transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer">
            🚗 Staff Passes (${staff.length})
          </button>
        </div>

        <!-- Vans Grid Container -->
        <div id="grid-vans-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
          ${vans.length === 0 ? `
            <div class="col-span-full text-center py-12 text-slate-400 text-xs">
              No campus vans registered yet.
              ${user.role !== 'admin' ? 'Tap "+ Add" above to register one.' : ''}
            </div>
          ` : vans.map(d => `
            <div class="cr-card p-5 flex flex-col justify-between space-y-4">
              <div>
                <div class="flex items-center justify-between">
                  <span class="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    ${d.label}
                  </span>
                  <span class="text-[11px] font-semibold text-slate-400 uppercase">
                    ${d.vehicle_type === '2_wheeler' ? '🛵 2-Wheeler' : '🚌 4-Wheeler'}
                  </span>
                </div>

                <div class="mt-3">
                  <h3 class="font-bold text-base text-slate-900 dark:text-white">${d.driver_name}</h3>
                  <div class="font-mono text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                    Plate: ${d.van_no}
                  </div>
                  <div class="text-xs text-slate-500 mt-1">📞 ${d.phone || 'No phone recorded'}</div>
                </div>
              </div>

              <!-- Pass Actions -->
              <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button class="view-qr-btn cr-btn cr-btn-secondary text-xs py-1.5 px-3 flex-1 cursor-pointer" data-id="${d.id}" data-label="${d.label}" data-name="${d.driver_name}" data-plate="${d.van_no}" data-phone="${d.phone || ''}">
                  🎟️ View QR Pass
                </button>
                ${user.role === 'admin' ? `
                  <button class="delete-driver-btn p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer" data-id="${d.id}" data-label="${d.label}" title="Delete and renumber">
                    🗑️
                  </button>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Staff Grid Container (hidden by default) -->
        <div id="grid-staff-container" class="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
          ${staff.length === 0 ? `
            <div class="col-span-full text-center py-12 text-slate-400 text-xs">
              No staff vehicle passes registered yet.
              ${user.role !== 'admin' ? 'Tap "+ Add" above to issue one.' : ''}
            </div>
          ` : staff.map(d => `
            <div class="cr-card p-5 flex flex-col justify-between space-y-4">
              <div>
                <div class="flex items-center justify-between">
                  <span class="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    ${d.label}
                  </span>
                  <span class="text-[11px] font-semibold text-slate-400 uppercase">
                    ${d.vehicle_type === '2_wheeler' ? '🛵 2-Wheeler' : '🚗 4-Wheeler'}
                  </span>
                </div>

                <div class="mt-3">
                  <h3 class="font-bold text-base text-slate-900 dark:text-white">${d.driver_name}</h3>
                  <div class="font-mono text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                    Plate: ${d.van_no}
                  </div>
                  <div class="text-xs text-slate-500 mt-1">📞 ${d.phone || 'No phone recorded'}</div>
                </div>
              </div>

              <!-- Pass Actions -->
              <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button class="view-qr-btn cr-btn cr-btn-secondary text-xs py-1.5 px-3 flex-1 cursor-pointer" data-id="${d.id}" data-label="${d.label}" data-name="${d.driver_name}" data-plate="${d.van_no}" data-phone="${d.phone || ''}">
                  🎟️ View QR Pass
                </button>
                ${user.role === 'admin' ? `
                  <button class="delete-driver-btn p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer" data-id="${d.id}" data-label="${d.label}" title="Delete and renumber">
                    🗑️
                  </button>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  static attachEvents(user) {
    const tabVan = document.getElementById('tab-van-btn');
    const tabStaff = document.getElementById('tab-staff-btn');
    const gridVans = document.getElementById('grid-vans-container');
    const gridStaff = document.getElementById('grid-staff-container');
    const addBtnText = document.getElementById('add-btn-text');

    if (tabVan && tabStaff && gridVans && gridStaff) {
      tabVan.onclick = () => {
        DriversRegistryPage.currentTab = 'van';
        tabVan.className = 'px-4 py-2 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-md cursor-pointer';
        tabStaff.className = 'px-4 py-2 rounded-xl text-xs font-bold transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer';
        gridVans.classList.remove('hidden');
        gridStaff.classList.add('hidden');
        if (addBtnText) addBtnText.textContent = 'Add Campus Van';
      };

      tabStaff.onclick = () => {
        DriversRegistryPage.currentTab = 'staff';
        tabStaff.className = 'px-4 py-2 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-md cursor-pointer';
        tabVan.className = 'px-4 py-2 rounded-xl text-xs font-bold transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer';
        gridStaff.classList.remove('hidden');
        gridVans.classList.add('hidden');
        if (addBtnText) addBtnText.textContent = 'Add Staff Pass';
      };
    }

    // Add entry dialog (for gate staff)
    const addBtn = document.getElementById('add-entry-modal-btn');
    if (addBtn) {
      addBtn.onclick = () => DriversRegistryPage.openAddModal();
    }

    // View QR Pass modal
    document.querySelectorAll('.view-qr-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const label = btn.getAttribute('data-label');
        const name = btn.getAttribute('data-name');
        const plate = btn.getAttribute('data-plate');
        const phone = btn.getAttribute('data-phone');
        DriversRegistryPage.openQRModal({ id, label, name, plate, phone });
      };
    });

    // Delete van with renumbering confirmation (§7.3)
    document.querySelectorAll('.delete-driver-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const label = btn.getAttribute('data-label');
        if (!confirm(`Delete ${label}? Its logs will be cascaded and all remaining labels will be sequentially renumbered.`)) return;

        try {
          await window.api.request(`/api/drivers/${id}`, { method: 'DELETE' });
          window.showToast(`${label} deleted and remaining vehicles renumbered!`, 'info');
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      };
    });
  }

  // Modal with 2 clear options: Fill Details Manually or Scan QR (§8.4)
  static openAddModal() {
    const isVan = DriversRegistryPage.currentTab === 'van';
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';
    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-fade-in-up">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 class="font-bold text-lg text-slate-900 dark:text-white">Gate Registration: ${isVan ? 'Campus Van' : 'Staff Vehicle'}</h3>
          <button id="close-add-modal" class="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
        </div>

        <!-- Mode Toggle Tabs -->
        <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
          <button type="button" id="mode-manual-btn" class="py-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm cursor-pointer">
            ✍️ Fill Details
          </button>
          <button type="button" id="mode-scan-btn" class="py-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer">
            📷 Scan QR Code
          </button>
        </div>

        <!-- Mode 1: Manual Form -->
        <form id="add-driver-form" class="space-y-3.5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Name (Driver / Staff)</label>
            <input type="text" id="new-driver-name" required class="cr-input" placeholder="e.g. Ramesh Sharma" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number (10 Digits)</label>
            <input type="tel" id="new-driver-phone" class="cr-input" placeholder="9876500000" pattern="[0-9]{10}" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vehicle License Plate</label>
            <input type="text" id="new-driver-plate" required minlength="6" class="cr-input uppercase font-mono font-bold tracking-wider" placeholder="MH 31 DC 9633" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vehicle Type</label>
            <select id="new-driver-veh-type" class="cr-input">
              <option value="4_wheeler" ${isVan ? 'selected' : ''}>4 Wheeler (Van / Bus / Car)</option>
              <option value="2_wheeler" ${!isVan ? 'selected' : ''}>2 Wheeler (Bike / Scooter)</option>
            </select>
          </div>

          <button type="submit" id="save-driver-btn" class="cr-btn cr-btn-primary w-full py-2.5 mt-2 cursor-pointer font-bold">
            Create & Issue Pass
          </button>
        </form>

        <!-- Mode 2: Scan QR Section (Hidden initially) -->
        <div id="scan-qr-section" class="hidden text-center py-6 space-y-4">
          <div class="w-16 h-16 mx-auto rounded-3xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center text-3xl">
            📷
          </div>
          <div>
            <h4 class="font-bold text-sm text-slate-900 dark:text-white">Scan Registration QR</h4>
            <p class="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Scan driver's QR code containing name, phone, and vehicle plate to register instantly.
            </p>
          </div>
          <button type="button" id="start-cam-scan-btn" class="cr-btn cr-btn-primary py-2.5 px-6 rounded-xl shadow-lg cursor-pointer font-bold">
            Open Camera Scanner
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#close-add-modal').onclick = () => modal.remove();

    // Mode switching
    const manualBtn = modal.querySelector('#mode-manual-btn');
    const scanBtn = modal.querySelector('#mode-scan-btn');
    const manualForm = modal.querySelector('#add-driver-form');
    const scanSection = modal.querySelector('#scan-qr-section');

    manualBtn.onclick = () => {
      manualBtn.className = 'py-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm cursor-pointer';
      scanBtn.className = 'py-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer';
      manualForm.classList.remove('hidden');
      scanSection.classList.add('hidden');
    };

    scanBtn.onclick = () => {
      scanBtn.className = 'py-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm cursor-pointer';
      manualBtn.className = 'py-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer';
      manualForm.classList.add('hidden');
      scanSection.classList.remove('hidden');
    };

    // Camera scanner
    modal.querySelector('#start-cam-scan-btn').onclick = () => {
      const scanner = new window.CameraScannerModal({
        title: 'Scan Registration QR',
        subtitle: `Scanning registration code for ${isVan ? 'Van' : 'Staff Pass'}`,
        onScan: async (qrText) => {
          try {
            const res = await window.api.request('/api/scanner/register-qr', {
              method: 'POST',
              body: JSON.stringify({ text: qrText, type: isVan ? 'van' : 'staff' })
            });
            modal.remove();
            window.showToast(`Registered successfully as ${res.label}!`, 'success');
            window.location.reload();
          } catch (err) {
            window.showToast(err.message, 'error');
          }
        }
      });
      scanner.open();
    };

    // Form submit
    manualForm.onsubmit = async (e) => {
      e.preventDefault();
      const driver_name = modal.querySelector('#new-driver-name').value.trim();
      const phone = modal.querySelector('#new-driver-phone').value.trim();
      const van_no = modal.querySelector('#new-driver-plate').value.trim().toUpperCase();
      const vehicle_type = modal.querySelector('#new-driver-veh-type').value;

      const submitBtn = modal.querySelector('#save-driver-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';

      try {
        const res = await window.api.request('/api/drivers', {
          method: 'POST',
          body: JSON.stringify({
            driver_name,
            phone,
            van_no,
            vehicle_type,
            type: isVan ? 'van' : 'staff'
          })
        });

        modal.remove();
        window.showToast(`${res.driver.label} created successfully!`, 'success');
        window.location.reload();
      } catch (err) {
        window.showToast(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create & Issue Pass';
      }
    };
  }

  // QR Pass Dialog with QR Code and Print (§7.6)
  static openQRModal({ id, label, name, plate, phone }) {
    const isVan = label.toLowerCase().startsWith('van');
    const payload = window.qrPayload.buildPassQR(label, name, plate, phone);

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';
    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4 text-center animate-fade-in-up">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <span class="text-xs font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">${label}</span>
          <button id="close-qr-modal" class="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
        </div>

        <div class="py-2">
          <div class="text-xs text-slate-400 font-bold uppercase tracking-wider">Campus Transit Pass</div>
          <h3 class="text-lg font-black text-slate-900 dark:text-white mt-0.5">${name}</h3>
          <div class="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">${plate}</div>
        </div>

        <!-- Rendered QR Code -->
        <div class="flex justify-center p-4 bg-white rounded-2xl shadow-inner border border-slate-200 inline-block mx-auto">
          <div id="qr-canvas-holder"></div>
        </div>

        <p class="text-[11px] text-slate-400">
          Gate staff scans this QR code at campus entry and exit gates.
        </p>

        <button id="print-qr-btn" class="cr-btn cr-btn-primary w-full py-2.5 text-xs font-bold cursor-pointer">
          🖨️ Print Pass Card
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    const holder = modal.querySelector('#qr-canvas-holder');
    window.qrPayload.renderCanvas(holder, payload, 180);

    modal.querySelector('#close-qr-modal').onclick = () => modal.remove();
    modal.querySelector('#print-qr-btn').onclick = () => window.print();
  }
}

window.DriversRegistryPage = DriversRegistryPage;
