// CampusRide — Gate Staff Vehicle & Staff Registration (§7.5, §8.4)
// Dual-Mode: (1) Scan plain-text QR or (2) Fill details manually (Name, Phone, Vehicle No.)
class RegistrationScannerPage {
  static currentMode = 'scan'; // 'scan' | 'manual'
  static currentType = 'van';  // 'van' | 'staff'

  static render() {
    return `
      <div class="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <!-- Back Button -->
        <div>
          <button type="button" onclick="window.goBack()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <span class="text-base font-black">←</span> <span>Back</span>
          </button>
        </div>

        <!-- Header -->
        <div class="text-center sm:text-left">
          <h1 class="text-2xl font-black text-slate-900 dark:text-white">Gate Registration: Drivers & Staff</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gate staff authority: Register transport vans or staff vehicles via QR scan or manual details form.
          </p>
        </div>

        <!-- Mode Toggle Tabs (Mode 1 vs Mode 2) -->
        <div class="cr-card p-2">
          <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
            <button type="button" id="tab-mode-scan" class="py-2.5 rounded-lg transition bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm cursor-pointer">
              📷 Mode 1: Scan QR Code
            </button>
            <button type="button" id="tab-mode-manual" class="py-2.5 rounded-lg transition text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer">
              ✍️ Mode 2: Fill Details (Manual)
            </button>
          </div>
        </div>

        <!-- Vehicle Type Filter (Campus Van vs Staff Vehicle) -->
        <div class="flex items-center gap-2">
          <button type="button" id="tab-type-van" class="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-md cursor-pointer">
            🚌 Campus Van Pass
          </button>
          <button type="button" id="tab-type-staff" class="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer">
            🚗 Staff Vehicle Pass
          </button>
        </div>

        <!-- Mode 1 Container: Scan QR View -->
        <div id="container-mode-scan" class="cr-card p-6 sm:p-8 text-center space-y-5 animate-fade-in-up">
          <div class="w-16 h-16 mx-auto rounded-3xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center text-3xl">
            📷
          </div>

          <div>
            <h2 id="scan-view-title" class="text-xl font-bold text-slate-900 dark:text-white">
              Scan Van Registration QR
            </h2>
            <p id="scan-view-desc" class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Scan the driver's plain-text registration QR code to automatically parse name, phone, and plate number.
            </p>
          </div>

          <div class="pt-2">
            <button type="button" id="open-reg-scanner-btn" class="cr-btn cr-btn-primary py-3 px-6 rounded-xl shadow-lg cursor-pointer">
              📷 Open Camera Scanner
            </button>
          </div>

          <div id="reg-scan-result" class="hidden p-4 rounded-2xl border text-left text-xs space-y-1"></div>
        </div>

        <!-- Mode 2 Container: Fill Details Form -->
        <div id="container-mode-manual" class="hidden cr-card p-6 sm:p-8 space-y-4 animate-fade-in-up">
          <div>
            <h2 id="manual-view-title" class="text-xl font-bold text-slate-900 dark:text-white">
              Add New Campus Van
            </h2>
            <p id="manual-view-desc" class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter the basic driver and vehicle information to immediately issue a pass.
            </p>
          </div>

          <form id="manual-reg-form" class="space-y-4" autocomplete="off">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Driver / Staff Full Name</label>
              <input type="text" id="manual-driver-name" required class="cr-input" placeholder="e.g. Ramesh Sharma" autocomplete="off" autocorrect="off" spellcheck="false" data-lpignore="true" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number (10 Digits)</label>
              <input type="tel" id="manual-driver-phone" class="cr-input" placeholder="9876500000" pattern="[0-9]{10}" autocomplete="off" autocorrect="off" spellcheck="false" data-lpignore="true" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vehicle License Plate (Number)</label>
              <input type="text" id="manual-driver-plate" required minlength="6" class="cr-input uppercase font-mono font-bold tracking-wider text-center" placeholder="__  __  __  ____" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" data-lpignore="true" />
              <p class="text-[10px] text-slate-400 mt-1 text-center font-medium">Spaces fill automatically as you type</p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vehicle Type</label>
              <select id="manual-driver-veh-type" class="cr-input">
                <option value="4_wheeler">4 Wheeler (Van / Bus / Car)</option>
                <option value="2_wheeler">2 Wheeler (Bike / Scooter)</option>
              </select>
            </div>

            <button type="submit" id="manual-reg-submit-btn" class="cr-btn cr-btn-primary w-full py-2.5 mt-2 font-bold shadow-md cursor-pointer">
              Register & Issue Pass
            </button>
          </form>
        </div>
      </div>
    `;
  }

  static attachEvents() {
    let activeMode = 'scan';
    let activeType = 'van';

    const scanTabBtn = document.getElementById('tab-mode-scan');
    const manualTabBtn = document.getElementById('tab-mode-manual');
    const scanContainer = document.getElementById('container-mode-scan');
    const manualContainer = document.getElementById('container-mode-manual');

    const vanTypeBtn = document.getElementById('tab-type-van');
    const staffTypeBtn = document.getElementById('tab-type-staff');

    const scanTitle = document.getElementById('scan-view-title');
    const scanDesc = document.getElementById('scan-view-desc');
    const manualTitle = document.getElementById('manual-view-title');
    const manualDesc = document.getElementById('manual-view-desc');
    const vehTypeSelect = document.getElementById('manual-driver-veh-type');

    function updateTypeUI() {
      if (activeType === 'van') {
        vanTypeBtn.className = 'flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-md cursor-pointer';
        staffTypeBtn.className = 'flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer';

        if (scanTitle) scanTitle.textContent = 'Scan Van Registration QR';
        if (scanDesc) scanDesc.textContent = 'Scan the driver\'s plain-text registration QR code to automatically parse name, phone, and plate number.';
        if (manualTitle) manualTitle.textContent = 'Add New Campus Van';
        if (manualDesc) manualDesc.textContent = 'Enter driver and van information to immediately issue a sequential van pass.';
        if (vehTypeSelect) vehTypeSelect.value = '4_wheeler';
      } else {
        staffTypeBtn.className = 'flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition bg-blue-600 text-white shadow-md cursor-pointer';
        vanTypeBtn.className = 'flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer';

        if (scanTitle) scanTitle.textContent = 'Scan Staff Pass QR';
        if (scanDesc) scanDesc.textContent = 'Scan staff member\'s registration QR code to automatically register their campus entry pass.';
        if (manualTitle) manualTitle.textContent = 'Add Staff Vehicle Pass';
        if (manualDesc) manualDesc.textContent = 'Enter staff details and vehicle plate to immediately issue a staff vehicle pass.';
        if (vehTypeSelect) vehTypeSelect.value = '2_wheeler';
      }
    }

    // Switch between Mode 1 (Scan) and Mode 2 (Manual)
    if (scanTabBtn && manualTabBtn && scanContainer && manualContainer) {
      scanTabBtn.onclick = () => {
        activeMode = 'scan';
        scanTabBtn.className = 'py-2.5 rounded-lg transition bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm cursor-pointer';
        manualTabBtn.className = 'py-2.5 rounded-lg transition text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer';
        scanContainer.classList.remove('hidden');
        manualContainer.classList.add('hidden');
      };

      manualTabBtn.onclick = () => {
        activeMode = 'manual';
        manualTabBtn.className = 'py-2.5 rounded-lg transition bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm cursor-pointer';
        scanTabBtn.className = 'py-2.5 rounded-lg transition text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer';
        manualContainer.classList.remove('hidden');
        scanContainer.classList.add('hidden');
      };
    }

    // Switch between Campus Van and Staff Vehicle
    if (vanTypeBtn && staffTypeBtn) {
      vanTypeBtn.onclick = () => {
        activeType = 'van';
        updateTypeUI();
      };

      staffTypeBtn.onclick = () => {
        activeType = 'staff';
        updateTypeUI();
      };
    }

    // Open Camera Scanner
    const openBtn = document.getElementById('open-reg-scanner-btn');
    if (openBtn) {
      openBtn.onclick = () => {
        const scanner = new window.CameraScannerModal({
          title: 'Scan Registration QR',
          subtitle: `Scanning registration code for ${activeType === 'van' ? 'Campus Van' : 'Staff Pass'}`,
          onScan: (qrText) => {
            RegistrationScannerPage.processRegistration(qrText, activeType);
          }
        });
        scanner.open();
      };
    }

    // Manual Form Plate Formatter
    const manualPlate = document.getElementById('manual-driver-plate');
    if (manualPlate) {
      let isBackspacing = false;
      manualPlate.addEventListener('keydown', (e) => {
        isBackspacing = e.key === 'Backspace' || e.key === 'Delete';
      });
      manualPlate.addEventListener('input', () => {
        if (isBackspacing) return;
        let raw = manualPlate.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
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
        manualPlate.value = formatted.trim();
      });
    }

    const manualForm = document.getElementById('manual-reg-form');
    if (manualForm) {
      manualForm.onsubmit = async (e) => {
        e.preventDefault();
        const driver_name = document.getElementById('manual-driver-name').value.trim();
        const phone = document.getElementById('manual-driver-phone').value.trim();
        const van_no = document.getElementById('manual-driver-plate').value.trim().toUpperCase();
        const vehicle_type = document.getElementById('manual-driver-veh-type').value;

        const btn = document.getElementById('manual-reg-submit-btn');
        btn.disabled = true;
        btn.textContent = 'Registering...';

        try {
          const res = await window.api.request('/api/drivers', {
            method: 'POST',
            body: JSON.stringify({ driver_name, phone, van_no, vehicle_type, type: activeType })
          });

          window.showToast(`Registered successfully as ${res.driver.label}!`, 'success');
          setTimeout(() => {
            window.location.hash = '#/drivers';
          }, 1200);
        } catch (err) {
          window.showToast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Register & Issue Pass';
        }
      };
    }
  }

  static async processRegistration(text, type) {
    const box = document.getElementById('reg-scan-result');

    try {
      const res = await window.api.request('/api/scanner/register-qr', {
        method: 'POST',
        body: JSON.stringify({ text, type })
      });

      window.showToast(`Registered successfully as ${res.label}!`, 'success');
      if (box) {
        box.className = 'p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 text-left text-xs space-y-1 block';
        box.innerHTML = `
          <div class="font-bold text-sm text-emerald-700 dark:text-emerald-300">✓ Registered: ${res.label}</div>
          <div><b>Driver/Staff:</b> ${res.driver_name}</div>
          <div><b>Vehicle Plate:</b> ${res.van_no}</div>
          <div class="pt-1 text-[11px] opacity-80">Added to active registry. Printable QR pass generated.</div>
        `;
      }
    } catch (err) {
      window.showToast(err.message, 'error');
      if (box) {
        box.className = 'p-4 rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 text-left text-xs space-y-1 block';
        box.innerHTML = `
          <div class="font-bold text-sm text-rose-600">✕ Registration Failed</div>
          <div>${err.message}</div>
        `;
      }
    }
  }
}

window.RegistrationScannerPage = RegistrationScannerPage;
