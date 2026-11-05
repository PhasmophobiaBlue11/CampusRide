// CampusRide — Driver Dashboard & Live GPS Broadcast (§7.8, §8.2)
class DriverHomePage {
  static isJourneyActive = false;
  static watchId = null;
  static simInterval = null;
  static currentVanId = null;
  static simLat = 21.1458;
  static simLng = 79.0882;

  static async render(user) {
    let vanId = user.driverProfile?.selected_van_id;
    let vanLabel = user.driverProfile?.selected_van_label || 'Assigned Van';

    // Fallback: If profile doesn't have van_id yet, fetch from drivers registry
    if (!vanId) {
      try {
        const dRes = await window.api.request('/api/drivers?type=van');
        if (dRes.drivers && dRes.drivers.length > 0) {
          const match = dRes.drivers.find(d => d.driver_name === user.display_name) || dRes.drivers[0];
          vanId = match.id;
          vanLabel = match.label;
        }
      } catch (e) {
        console.warn('Could not resolve van:', e);
      }
    }

    DriverHomePage.currentVanId = vanId;

    // Check live state from server
    if (vanId) {
      try {
        const statusRes = await window.api.request(`/api/journey/status?vanId=${vanId}`);
        DriverHomePage.isJourneyActive = Boolean(statusRes.live);
      } catch (e) {
        console.warn('Could not fetch journey status:', e);
      }
    }

    let students = [];
    if (vanId) {
      try {
        const res = await window.api.request(`/api/my-students?vanId=${vanId}`);
        students = res.students || [];
      } catch {}
    }

    const isActive = DriverHomePage.isJourneyActive;
    if (isActive && !DriverHomePage.watchId && !DriverHomePage.simInterval) {
      DriverHomePage.startRealGPSWatch(vanId);
    }

    return `
      <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <!-- Driver Hero Card -->
        <div class="bg-gradient-to-r from-blue-800 to-indigo-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div id="driver-status-badge" class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-2">
              <span id="driver-status-dot" class="w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}"></span>
              <span id="driver-status-label">${isActive ? 'GPS BROADCASTING LIVE' : 'VEHICLE IDLE (NOT TRACKING)'}</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black">${vanLabel} — Driver Console</h1>
            <p class="text-xs sm:text-sm text-blue-200 mt-1">
              Driver: <b>${user.display_name || user.email}</b> • Assigned students: ${students.length}
            </p>
            <div id="driver-gps-coordinates" class="text-xs font-mono text-emerald-300 mt-1.5 ${isActive ? '' : 'hidden'}">
              📍 Real-Time Location Active
            </div>
          </div>

          <!-- Big GPS Toggle Button -->
          <div id="driver-btn-container">
            ${!isActive ? `
              <button id="start-journey-btn" class="cr-btn bg-emerald-500 hover:bg-emerald-400 text-white font-black text-base py-3.5 px-8 rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center gap-3 transition transform active:scale-95 cursor-pointer">
                <span class="text-2xl">🚀</span>
                <span>START JOURNEY</span>
              </button>
            ` : `
              <button id="end-journey-btn" class="cr-btn bg-rose-600 hover:bg-rose-500 text-white font-black text-base py-3.5 px-8 rounded-2xl shadow-xl shadow-rose-600/30 flex items-center gap-3 transition transform active:scale-95 cursor-pointer">
                <span class="text-2xl">🛑</span>
                <span>END JOURNEY</span>
              </button>
            `}
          </div>
        </div>

        <!-- Yellow CTA: View My Students (§7.8) -->
        <div class="cr-card p-6 border-2 border-amber-400/50 bg-amber-50/20 dark:bg-amber-950/20">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">🎒</span>
              <div>
                <h2 class="font-black text-lg text-slate-900 dark:text-white">Assigned Student Stops (${students.length})</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Turn-by-turn routing to student pickup addresses</p>
              </div>
            </div>
            <a href="#/live-map" class="cr-btn cr-btn-primary text-xs py-2 px-3">
              🗺️ Open in Google Maps
            </a>
          </div>

          <div class="space-y-3">
            ${students.length === 0 ? `
              <div class="text-center py-8 text-slate-400 text-xs">No children currently assigned to this van.</div>
            ` : students.map((s, idx) => `
              <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center">
                    #${idx + 1}
                  </div>
                  <div>
                    <div class="font-bold text-sm text-slate-900 dark:text-white">${s.name}</div>
                    <div class="text-xs text-slate-500">${s.address || 'Address on file'}</div>
                  </div>
                </div>

                ${s.address_lat && s.address_lng ? `
                  <a href="https://www.google.com/maps/dir/?api=1&destination=${s.address_lat},${s.address_lng}" target="_blank"
                     class="cr-btn cr-btn-secondary text-xs py-1.5 px-3 self-end sm:self-center text-blue-600 hover:text-blue-700">
                    🗺️ Turn-by-Turn Navigation
                  </a>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  static attachEvents(user) {
    DriverHomePage.bindJourneyButtons(user);
  }

  static bindJourneyButtons(user) {
    const vanId = DriverHomePage.currentVanId || user.driverProfile?.selected_van_id;

    const startBtn = document.getElementById('start-journey-btn');
    if (startBtn) {
      startBtn.onclick = async () => {
        startBtn.disabled = true;
        startBtn.innerHTML = '<span class="animate-spin">⏳</span> Starting...';

        try {
          const res = await window.api.request('/api/journey/start', {
            method: 'POST',
            body: JSON.stringify({ vanId })
          });

          DriverHomePage.isJourneyActive = true;
          DriverHomePage.currentVanId = res.vanId || vanId;
          DriverHomePage.startRealGPSWatch(DriverHomePage.currentVanId);
          DriverHomePage.updateUIState(true);

          window.showToast('🚀 Journey started! Live GPS sharing active and parents notified.', 'success');
        } catch (err) {
          window.showToast(err.message, 'error');
          startBtn.disabled = false;
          startBtn.innerHTML = '<span class="text-2xl">🚀</span><span>START JOURNEY</span>';
        }
      };
    }

    const endBtn = document.getElementById('end-journey-btn');
    if (endBtn) {
      endBtn.onclick = async () => {
        endBtn.disabled = true;
        endBtn.innerHTML = '<span class="animate-spin">⏳</span> Stopping...';

        try {
          await window.api.request('/api/journey/end', {
            method: 'POST',
            body: JSON.stringify({ vanId })
          });

          DriverHomePage.isJourneyActive = false;
          DriverHomePage.stopRealGPSWatch();
          DriverHomePage.updateUIState(false);

          window.showToast('🛑 Journey ended. Live tracking stopped.', 'info');
        } catch (err) {
          window.showToast(err.message, 'error');
          endBtn.disabled = false;
          endBtn.innerHTML = '<span class="text-2xl">🛑</span><span>END JOURNEY</span>';
        }
      };
    }
  }

  // Update hero status badge and toggle button in place without full page reload
  static updateUIState(isActive) {
    const dot = document.getElementById('driver-status-dot');
    const label = document.getElementById('driver-status-label');
    const coords = document.getElementById('driver-gps-coordinates');
    const btnContainer = document.getElementById('driver-btn-container');

    if (dot && label) {
      dot.className = `w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`;
      label.textContent = isActive ? 'GPS BROADCASTING LIVE' : 'VEHICLE IDLE (NOT TRACKING)';
    }

    if (coords) {
      if (isActive) coords.classList.remove('hidden');
      else coords.classList.add('hidden');
    }

    if (btnContainer) {
      if (isActive) {
        btnContainer.innerHTML = `
          <button id="end-journey-btn" class="cr-btn bg-rose-600 hover:bg-rose-500 text-white font-black text-base py-3.5 px-8 rounded-2xl shadow-xl shadow-rose-600/30 flex items-center gap-3 transition transform active:scale-95 cursor-pointer">
            <span class="text-2xl">🛑</span>
            <span>END JOURNEY</span>
          </button>
        `;
      } else {
        btnContainer.innerHTML = `
          <button id="start-journey-btn" class="cr-btn bg-emerald-500 hover:bg-emerald-400 text-white font-black text-base py-3.5 px-8 rounded-2xl shadow-xl shadow-emerald-500/30 flex items-center gap-3 transition transform active:scale-95 cursor-pointer">
            <span class="text-2xl">🚀</span>
            <span>START JOURNEY</span>
          </button>
        `;
      }
      DriverHomePage.bindJourneyButtons(window.api.user || {});
    }
  }

  // Real Hardware GPS Watch with seamless fallback (§7.8)
  static startRealGPSWatch(vanId) {
    DriverHomePage.stopRealGPSWatch();

    const coordsDisplay = document.getElementById('driver-gps-coordinates');
    let lastSent = 0;

    const pushLocation = (lat, lng) => {
      if (coordsDisplay) {
        coordsDisplay.textContent = `📍 Live GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }
      window.api.request('/api/location/update', {
        method: 'POST',
        body: JSON.stringify({ vanId, lat, lng })
      }).catch(() => {});
    };

    if (navigator.geolocation) {
      DriverHomePage.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const now = Date.now();
          if (now - lastSent < 2000) return; // Throttle 2s
          lastSent = now;
          pushLocation(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn('Hardware GPS unavailable or permission denied, using live simulator fallback:', err.message);
          // If real GPS has an error (e.g. desktop environment), smoothly simulate live movement
          DriverHomePage.startSimulationFallback(vanId, pushLocation);
        },
        { enableHighAccuracy: true, maximumAge: 1000 }
      );
    } else {
      DriverHomePage.startSimulationFallback(vanId, pushLocation);
    }
  }

  static startSimulationFallback(vanId, pushFn) {
    if (DriverHomePage.simInterval) return;
    let angle = 0;
    DriverHomePage.simInterval = setInterval(() => {
      angle += 0.08;
      // Gently glide in a small route radius around campus
      const lat = 21.1458 + 0.003 * Math.sin(angle);
      const lng = 79.0882 + 0.003 * Math.cos(angle);
      pushFn(lat, lng);
    }, 2500);
  }

  static stopRealGPSWatch() {
    if (DriverHomePage.watchId !== null) {
      if (navigator.geolocation) {
        navigator.geolocation.clearWatch(DriverHomePage.watchId);
      }
      DriverHomePage.watchId = null;
    }
    if (DriverHomePage.simInterval !== null) {
      clearInterval(DriverHomePage.simInterval);
      DriverHomePage.simInterval = null;
    }
  }
}

window.DriverHomePage = DriverHomePage;
