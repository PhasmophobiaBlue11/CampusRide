// CampusRide — Parent Dashboard with Dedicated Notification Boards
// Board 1: Van Journey Activity (Started & Ended with date/time)
// Board 2: Campus Security Gate Activity (Entered & Exited campus with date/time)
// Zero Maps / GPS dependency
class ParentHomePage {
  static currentVanId = null;
  static hasAttachedSSE = false;

  static formatDateTime(isoString) {
    if (!isoString) return '--';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const datePart = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { date: datePart, time: timePart, full: `${datePart} at ${timePart}` };
  }

  // --- DEVICE-FIRST STORAGE & SYNC ---
  static getDeviceParentData(userId) {
    if (!userId) return null;
    try {
      const d = localStorage.getItem(`campusride_device_parent_data_${userId}`);
      return d ? JSON.parse(d) : null;
    } catch {
      return null;
    }
  }

  static saveDeviceParentData(userId, data) {
    if (!userId || !data) return;
    try {
      localStorage.setItem(`campusride_device_parent_data_${userId}`, JSON.stringify(data));
    } catch {}
  }

  static async render(user) {
    let children = [];
    let vans = [];
    let boards = {
      van: null,
      isJourneyActive: false,
      isCampusPresent: false,
      journeyLogs: [],
      gateLogs: []
    };

    // 1. Device-first load
    const cached = ParentHomePage.getDeviceParentData(user.id);
    if (cached) {
      children = cached.children || [];
      vans = cached.vans || [];
      boards = cached.boards || boards;
    }

    // 2. Fetch authoritative data from server
    try {
      const [cRes, vRes, bRes] = await Promise.all([
        window.api.request('/api/children'),
        window.api.request('/api/drivers?type=van'),
        window.api.request('/api/parent/boards')
      ]);
      children = cRes.children || [];
      vans = vRes.drivers || [];
      boards = bRes || boards;

      // Save to device storage
      ParentHomePage.saveDeviceParentData(user.id, { children, vans, boards });
    } catch (e) {
      console.warn('Network sync notice:', e.message);
    }

    const van = boards.van || (vans.length > 0 ? vans[0] : null);
    ParentHomePage.currentVanId = van ? van.id : null;
    const isLive = Boolean(boards.isJourneyActive);
    const isInside = Boolean(boards.isCampusPresent);

    const vanName = van ? `${van.label} (${van.van_no || 'Campus Transit'})` : 'Campus Van';
    const driverName = van ? (van.driver_name || 'Assigned Driver') : 'Staff Driver';

    const journeyLogs = boards.journeyLogs || [];
    const gateLogs = boards.gateLogs || [];

    return `
      <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        <!-- Live Status Hero Card -->
        <div class="bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-2">
                <span class="w-2.5 h-2.5 rounded-full ${isLive ? 'bg-emerald-400 animate-ping' : isInside ? 'bg-blue-400' : 'bg-slate-400'}"></span>
                <span id="parent-hero-badge">${isLive ? 'VAN CURRENTLY EN ROUTE' : isInside ? 'VAN INSIDE CAMPUS' : 'VAN AT REST / IDLE'}</span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-black">${vanName}</h1>
              <p class="text-xs sm:text-sm text-indigo-100 mt-1">
                Driver: <b>${driverName}</b> • ${children.length > 0 ? `Student: <b>${children.map(c => c.name).join(', ')}</b>` : 'No student assigned yet'}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <span class="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-semibold border border-white/20">
                🔒 Safe Transit Monitoring
              </span>
            </div>
          </div>
        </div>

        <!-- TWO DEDICATED NOTIFICATION BOARDS -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

          <!-- BOARD 1: Van Journey Activity (Started & Ended) -->
          <div class="cr-card p-5 sm:p-6 space-y-4 border-2 border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2.5">
                <div class="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center text-xl shadow-sm">
                  🚌
                </div>
                <div>
                  <h2 class="font-bold text-base text-slate-900 dark:text-white leading-tight">Journey Activity Board</h2>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">Transit start and completion timeline</p>
                </div>
              </div>
              <span class="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                ${journeyLogs.length} events
              </span>
            </div>

            <!-- Active Journey Pulse Banner -->
            ${isLive ? `
              <div class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center gap-3 animate-smooth-pulse">
                <span class="text-2xl">🚀</span>
                <div class="text-xs">
                  <div class="font-bold">Trip Currently In Progress</div>
                  <div class="text-[11px] opacity-80">Van is actively on its route. Parents will see completion when driver ends trip.</div>
                </div>
              </div>
            ` : ''}

            <!-- Journey Log Entries -->
            <div id="journey-logs-list" class="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              ${journeyLogs.length === 0 ? `
                <div class="text-center py-10 text-slate-400 text-xs space-y-1">
                  <div class="text-2xl">⏳</div>
                  <div>No journey activity recorded yet.</div>
                  <div class="text-[10px] text-slate-500">Events appear when the driver starts or ends transit.</div>
                </div>
              ` : journeyLogs.map(log => {
                const isStart = log.event_type === 'journey_start';
                const formatted = ParentHomePage.formatDateTime(log.timestamp);
                return `
                  <div class="p-3.5 rounded-2xl border ${isStart ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20' : 'border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20'} board-item-enter space-y-1.5">
                    <div class="flex items-center justify-between">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isStart ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'}">
                        <span>${isStart ? '🚀' : '🏁'}</span>
                        <span>${isStart ? 'JOURNEY STARTED' : 'JOURNEY COMPLETED'}</span>
                      </span>
                      <span class="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">${formatted.time}</span>
                    </div>
                    <div class="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between pt-0.5">
                      <span>${formatted.date}</span>
                      <span class="text-[11px] text-slate-500">Driver: ${log.driver_name || driverName}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- BOARD 2: Campus Security Gate Activity (Entered & Exited) -->
          <div class="cr-card p-5 sm:p-6 space-y-4 border-2 border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2.5">
                <div class="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-xl shadow-sm">
                  🏫
                </div>
                <div>
                  <h2 class="font-bold text-base text-slate-900 dark:text-white leading-tight">Campus Gate Activity Board</h2>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">Security gate entrance & exit records</p>
                </div>
              </div>
              <span class="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                ${gateLogs.length} events
              </span>
            </div>

            <!-- Current Gate Status Banner -->
            <div class="p-3.5 rounded-2xl ${isInside ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'} flex items-center gap-3">
              <span class="text-2xl">${isInside ? '🏫' : '🚪'}</span>
              <div class="text-xs">
                <div class="font-bold">${isInside ? 'Van Is Currently Inside Campus Grounds' : 'Van Is Outside Campus'}</div>
                <div class="text-[11px] opacity-80">${isInside ? 'Verified entry scan by security guard at school entrance.' : 'Waiting for next campus gate pass check-in.'}</div>
              </div>
            </div>

            <!-- Gate Log Entries -->
            <div id="gate-logs-list" class="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              ${gateLogs.length === 0 ? `
                <div class="text-center py-10 text-slate-400 text-xs space-y-1">
                  <div class="text-2xl">🛂</div>
                  <div>No security gate events logged yet.</div>
                  <div class="text-[10px] text-slate-500">Security scans QR pass at campus gate upon entry & exit.</div>
                </div>
              ` : gateLogs.map(log => {
                const isEntry = log.event_type === 'entry';
                const formatted = ParentHomePage.formatDateTime(log.timestamp);
                return `
                  <div class="p-3.5 rounded-2xl border ${isEntry ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20' : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20'} board-item-enter space-y-1.5">
                    <div class="flex items-center justify-between">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isEntry ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'}">
                        <span>${isEntry ? '🟢' : '🟡'}</span>
                        <span>${isEntry ? 'ENTERED CAMPUS' : 'EXITED CAMPUS'}</span>
                      </span>
                      <span class="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">${formatted.time}</span>
                    </div>
                    <div class="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between pt-0.5">
                      <span>${formatted.date}</span>
                      <span class="text-[11px] text-slate-500 font-medium">Checked by: ${log.scanned_by || 'Gate Staff'}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

        </div>

        <!-- Children Management Section -->
        <div class="cr-card p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🧒</span>
              <div>
                <h2 class="font-bold text-base text-slate-900 dark:text-white">Assigned Students (${children.length}/5)</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Assign your child to their campus transit van</p>
              </div>
            </div>
            ${children.length < 5 ? `
              <button id="add-child-modal-btn" class="cr-btn cr-btn-primary text-xs py-2 px-3.5 shadow-md">
                + Add Student
              </button>
            ` : `
              <span class="text-[10px] text-slate-400 font-semibold">Max 5 Reached</span>
            `}
          </div>

          <div class="space-y-3">
            ${children.length === 0 ? `
              <div class="text-center py-8 text-slate-400 text-xs">
                No children added yet. Tap "+ Add Student" to link your child with their campus van.
              </div>
            ` : children.map(c => `
              <div class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center">
                    🎒
                  </div>
                  <div>
                    <div class="font-bold text-sm text-slate-900 dark:text-white">${c.name}</div>
                    <div class="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">Assigned Van: ${c.van_label}</div>
                  </div>
                </div>
                <button class="delete-child-btn p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer" data-id="${c.id}" title="Remove Child">
                  🗑️
                </button>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  }

  static attachEvents() {
    // Add child modal
    const addBtn = document.getElementById('add-child-modal-btn');
    if (addBtn) {
      addBtn.onclick = () => ParentHomePage.openAddChildModal();
    }

    // Delete child handlers
    document.querySelectorAll('.delete-child-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Remove this child from tracking?')) return;
        try {
          await window.api.request(`/api/children/${id}`, { method: 'DELETE' });
          window.showToast('Child removed', 'info');
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      };
    });

    // Real-Time SSE Listener
    if (!ParentHomePage.hasAttachedSSE && window.api.events) {
      ParentHomePage.hasAttachedSSE = true;

      window.api.events.addEventListener('journey_started', () => {
        window.showToast('🚀 Journey started! Van is now en route.', 'info');
        setTimeout(() => window.location.reload(), 800);
      });

      window.api.events.addEventListener('journey_ended', () => {
        window.showToast('🏁 Journey completed! Van reached destination.', 'info');
        setTimeout(() => window.location.reload(), 800);
      });

      window.api.events.addEventListener('scan_recorded', (e) => {
        try {
          const data = JSON.parse(e.data);
          const typeStr = data.event_type === 'entry' ? 'Entered Campus' : 'Exited Campus';
          window.showToast(`🛂 Security Gate: ${data.driver?.label || 'Van'} ${typeStr}`, 'info');
          setTimeout(() => window.location.reload(), 800);
        } catch {}
      });
    }
  }

  static async openAddChildModal() {
    let vans = [];
    try {
      const res = await window.api.request('/api/drivers?type=van');
      vans = res.drivers || [];
    } catch {}

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="cr-card w-full max-w-sm p-6 space-y-4 animate-scale-up">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 class="font-bold text-base text-slate-900 dark:text-white">Add Student</h3>
          <button id="close-child-modal" class="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
        </div>
        <form id="add-child-form" class="space-y-3" autocomplete="off">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Student Full Name</label>
            <input type="text" id="modal-child-name" required class="cr-input text-xs" placeholder="e.g. Rahul Sharma" autocomplete="off" autocorrect="off" spellcheck="false" data-lpignore="true" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assigned Van</label>
            <select id="modal-child-van" required class="cr-input text-xs">
              <option value="">Select a Campus Van...</option>
              ${vans.map(v => `<option value="${v.id}">${v.label} - ${v.driver_name} (${v.van_no})</option>`).join('')}
            </select>
          </div>
          <button type="submit" id="modal-child-submit-btn" class="cr-btn cr-btn-primary w-full py-2 text-xs font-bold mt-2">
            Save Student
          </button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#close-child-modal');
    closeBtn.onclick = () => modal.remove();

    const form = modal.querySelector('#add-child-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const name = modal.querySelector('#modal-child-name').value.trim();
      const vanId = modal.querySelector('#modal-child-van').value;

      // Student Full Name Validation
      const nameParts = name.split(/\s+/).filter(Boolean);
      if (nameParts.length < 2 || nameParts[0].length < 2 || nameParts[1].length < 2) {
        return window.showToast('Please enter the student\'s full name (both first and last name, e.g. Rahul Sharma)', 'error');
      }

      const submitBtn = modal.querySelector('#modal-child-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';

      try {
        await window.api.request('/api/children', {
          method: 'POST',
          body: JSON.stringify({ name, vanId })
        });
        window.showToast('Student added successfully!', 'success');
        modal.remove();
        window.location.reload();
      } catch (err) {
        window.showToast(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Student';
      }
    };
  }
}

window.ParentHomePage = ParentHomePage;
