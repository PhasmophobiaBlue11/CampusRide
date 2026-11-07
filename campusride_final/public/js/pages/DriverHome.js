// CampusRide — Driver Console & Transit Dispatch
// Prominent Main Start/End Journey Button at the top, Zero Maps dependencies
class DriverHomePage {
  static currentVanId = null;
  static currentVanLabel = null;
  static currentVanPlate = null;
  static driverName = null;
  static isJourneyActive = false;
  static cachedStudents = [];

  // --- DEVICE-FIRST STORAGE & SYNC ---
  static getDeviceStudents(vanId) {
    if (!vanId) return null;
    try {
      const data = localStorage.getItem(`campusride_device_students_${vanId}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static saveDeviceStudents(vanId, students) {
    if (!vanId || !students) return;
    try {
      localStorage.setItem(`campusride_device_students_${vanId}`, JSON.stringify(students));
    } catch {}
  }

  static async render(user) {
    DriverHomePage.driverName = user.display_name || user.email;
    let vanId = user.driverProfile?.selected_van_id;
    let vanLabel = user.driverProfile?.selected_van_label || 'Van 1';
    let vanPlate = 'Transit Vehicle';

    try {
      const vansRes = await window.api.request('/api/drivers?type=van');
      const vans = vansRes.drivers || [];
      if (vanId) {
        const found = vans.find(v => v.id === vanId);
        if (found) {
          vanLabel = found.label;
          vanPlate = found.van_no || 'Campus Transit Pass';
        }
      } else if (vans.length > 0) {
        const match = vans.find(v => (v.phone && user.phone && v.phone === user.phone) || (v.driver_name && user.display_name && v.driver_name.toLowerCase() === user.display_name.toLowerCase())) || vans[0];
        if (match) {
          vanId = match.id;
          vanLabel = match.label;
          vanPlate = match.van_no || 'Campus Transit Pass';
        }
      }
    } catch (e) {
      console.warn('Could not resolve van:', e);
    }

    DriverHomePage.currentVanId = vanId;
    DriverHomePage.currentVanLabel = vanLabel;
    DriverHomePage.currentVanPlate = vanPlate;

    // Check live state from server
    if (vanId) {
      try {
        const statusRes = await window.api.request(`/api/journey/status?vanId=${vanId}`);
        DriverHomePage.isJourneyActive = Boolean(statusRes.live);
      } catch (e) {
        console.warn('Could not fetch journey status:', e);
      }
    }

    // Load students (device first, then server sync)
    let students = DriverHomePage.getDeviceStudents(vanId) || [];
    if (vanId) {
      try {
        const res = await window.api.request(`/api/my-students?vanId=${vanId}`);
        if (res && Array.isArray(res.students)) {
          students = res.students;
          DriverHomePage.saveDeviceStudents(vanId, students);
        }
      } catch (err) {
        console.warn('Offline mode for students:', err.message);
      }
    }
    DriverHomePage.cachedStudents = students;

    const isActive = DriverHomePage.isJourneyActive;

    return `
      <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">

        <!-- MAIN HERO JOURNEY ACTION BUTTON (PROMINENT AT VERY TOP) -->
        <div id="driver-main-action-card" class="cr-card p-6 sm:p-8 text-center border-2 ${isActive ? 'border-rose-400 bg-rose-50/20 dark:bg-rose-950/20 shadow-rose-500/20' : 'border-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-emerald-500/20'} shadow-2xl space-y-3">
          <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isActive ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'}">
            <span class="w-2.5 h-2.5 rounded-full ${isActive ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}"></span>
            <span id="journey-state-text">${isActive ? 'TRIP ACTIVE & IN PROGRESS' : 'VEHICLE READY TO DEPART'}</span>
          </div>

          <div id="driver-btn-container" class="pt-2">
            ${!isActive ? `
              <button id="start-journey-btn" class="w-full py-5 sm:py-6 px-6 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xl sm:text-2xl shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 transition transform active:scale-95 cursor-pointer">
                <span class="text-3xl">🚀</span>
                <span>START JOURNEY</span>
              </button>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                Tap to begin trip. Instantly logs start time and notifies all parent activity boards.
              </p>
            ` : `
              <button id="end-journey-btn" class="w-full py-5 sm:py-6 px-6 rounded-3xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xl sm:text-2xl shadow-xl shadow-rose-600/30 flex items-center justify-center gap-3 transition transform active:scale-95 cursor-pointer">
                <span class="text-3xl">🛑</span>
                <span>END JOURNEY</span>
              </button>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                Trip is currently active! Tap when all students are safely dropped off to conclude route.
              </p>
            `}
          </div>
        </div>

        <!-- Vehicle Details & Security Gate Pass CTA -->
        <div class="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="text-xs font-semibold text-blue-300 uppercase tracking-wider">Assigned Vehicle</div>
            <h2 class="text-2xl font-black">${vanLabel} — ${vanPlate}</h2>
            <p class="text-xs text-slate-300 mt-0.5">
              Driver: <b>${user.display_name || user.email}</b> • Phone: <b>${user.phone || 'Recorded'}</b>
            </p>
          </div>

          <div class="flex items-center gap-3">
            <button type="button" id="driver-show-gate-pass-btn" class="cr-btn bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 px-5 rounded-2xl shadow-lg flex items-center gap-2 cursor-pointer select-none">
              <span class="text-lg">🎟️</span>
              <span>Show Gate Pass QR</span>
            </button>
          </div>
        </div>

        <!-- Assigned Student Roster -->
        <div class="cr-card p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">🎒</span>
              <div>
                <h3 class="font-bold text-base text-slate-900 dark:text-white">Assigned Students (${students.length})</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">Students riding on this transit vehicle</p>
              </div>
            </div>
            <span class="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800">
              ${students.length} on roster
            </span>
          </div>

          <div class="space-y-3">
            ${students.length === 0 ? `
              <div class="text-center py-8 text-slate-400 text-xs">
                No students currently assigned to this van. Parents will appear here once linked.
              </div>
            ` : students.map((s, idx) => `
              <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-blue-400 transition">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-black text-sm flex items-center justify-center shrink-0">
                    #${idx + 1}
                  </div>
                  <div>
                    <div class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>${s.name}</span>
                    </div>
                    <div class="text-xs text-slate-500 mt-0.5">
                      Parent Contact: ${s.parent_name || 'Guardian'} ${s.parent_phone ? `(${s.parent_phone})` : ''}
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  ${s.parent_phone ? `
                    <a href="tel:${s.parent_phone}" class="cr-btn cr-btn-secondary text-xs py-1.5 px-3 rounded-xl flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <span>📞</span> <span>Call Parent</span>
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

  static attachEvents(user) {
    DriverHomePage.bindJourneyButtons(user);

    // Show Gate Pass QR modal for Driver
    const passBtn = document.getElementById('driver-show-gate-pass-btn');
    if (passBtn) {
      passBtn.onclick = () => {
        const vanId = DriverHomePage.currentVanId;
        if (window.showDriverPassQRModal) {
          window.showDriverPassQRModal({
            id: vanId,
            label: DriverHomePage.currentVanLabel || 'Campus Van Pass',
            name: DriverHomePage.driverName || 'Campus Van Driver',
            plate: DriverHomePage.currentVanPlate || 'Authorized Vehicle'
          });
        }
      };
    }
  }

  static bindJourneyButtons(user) {
    const vanId = DriverHomePage.currentVanId || user.driverProfile?.selected_van_id;

    const startBtn = document.getElementById('start-journey-btn');
    if (startBtn) {
      startBtn.onclick = async () => {
        startBtn.disabled = true;
        startBtn.innerHTML = '<span class="animate-spin">⏳</span> Starting Journey...';

        try {
          const res = await window.api.request('/api/journey/start', {
            method: 'POST',
            body: JSON.stringify({ vanId, lat: 0, lng: 0 })
          });

          DriverHomePage.isJourneyActive = true;
          DriverHomePage.currentVanId = res.vanId || vanId;
          DriverHomePage.updateUIState(true);

          window.showToast('🚀 Journey started! Parent activity board updated.', 'success');
        } catch (err) {
          window.showToast(err.message, 'error');
          startBtn.disabled = false;
          startBtn.innerHTML = '<span class="text-3xl">🚀</span><span>START JOURNEY</span>';
        }
      };
    }

    const endBtn = document.getElementById('end-journey-btn');
    if (endBtn) {
      endBtn.onclick = async () => {
        endBtn.disabled = true;
        endBtn.innerHTML = '<span class="animate-spin">⏳</span> Concluding Journey...';

        try {
          await window.api.request('/api/journey/end', {
            method: 'POST',
            body: JSON.stringify({ vanId })
          });

          DriverHomePage.isJourneyActive = false;
          DriverHomePage.updateUIState(false);

          window.showToast('🛑 Journey concluded. Completion recorded for all parents.', 'info');
        } catch (err) {
          window.showToast(err.message, 'error');
          endBtn.disabled = false;
          endBtn.innerHTML = '<span class="text-3xl">🛑</span><span>END JOURNEY</span>';
        }
      };
    }
  }

  static updateUIState(isActive) {
    DriverHomePage.isJourneyActive = isActive;
    const actionCard = document.getElementById('driver-main-action-card');
    const stateText = document.getElementById('journey-state-text');
    const btnContainer = document.getElementById('driver-btn-container');

    if (actionCard) {
      actionCard.className = `cr-card p-6 sm:p-8 text-center border-2 ${isActive ? 'border-rose-400 bg-rose-50/20 dark:bg-rose-950/20 shadow-rose-500/20' : 'border-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-emerald-500/20'} shadow-2xl space-y-3`;
    }

    if (stateText) {
      stateText.textContent = isActive ? 'TRIP ACTIVE & IN PROGRESS' : 'VEHICLE READY TO DEPART';
    }

    if (btnContainer) {
      if (isActive) {
        btnContainer.innerHTML = `
          <button id="end-journey-btn" class="w-full py-5 sm:py-6 px-6 rounded-3xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xl sm:text-2xl shadow-xl shadow-rose-600/30 flex items-center justify-center gap-3 transition transform active:scale-95 cursor-pointer">
            <span class="text-3xl">🛑</span>
            <span>END JOURNEY</span>
          </button>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Trip is currently active! Tap when all students are safely dropped off to conclude route.
          </p>
        `;
      } else {
        btnContainer.innerHTML = `
          <button id="start-journey-btn" class="w-full py-5 sm:py-6 px-6 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xl sm:text-2xl shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 transition transform active:scale-95 cursor-pointer">
            <span class="text-3xl">🚀</span>
            <span>START JOURNEY</span>
          </button>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Tap to begin trip. Instantly logs start time and notifies all parent activity boards.
          </p>
        `;
      }
      DriverHomePage.bindJourneyButtons(window.currentUser || {});
    }
  }
}

window.DriverHomePage = DriverHomePage;
