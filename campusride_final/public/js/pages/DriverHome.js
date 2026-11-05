// CampusRide — Driver Dashboard & Live GPS Broadcast (§7.8, §8.2)
class DriverHomePage {
  static isJourneyActive = false;
  static watchId = null;
  static currentVanId = null;
  static lastKnownLat = null;
  static lastKnownLng = null;
  static cachedStudents = [];

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
        if (statusRes.lat && statusRes.lng) {
          DriverHomePage.lastKnownLat = statusRes.lat;
          DriverHomePage.lastKnownLng = statusRes.lng;
        }
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

    DriverHomePage.cachedStudents = students;

    const isActive = DriverHomePage.isJourneyActive;
    if (isActive && !DriverHomePage.watchId) {
      DriverHomePage.startRealGPSWatch(vanId);
    } else if (!DriverHomePage.lastKnownLat && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        DriverHomePage.lastKnownLat = Number(pos.coords.latitude.toFixed(6));
        DriverHomePage.lastKnownLng = Number(pos.coords.longitude.toFixed(6));
      }, () => {}, { enableHighAccuracy: true, timeout: 5000 });
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
              📍 Live GPS: ${DriverHomePage.lastKnownLat ? `${DriverHomePage.lastKnownLat.toFixed(5)}, ${DriverHomePage.lastKnownLng.toFixed(5)}` : 'Detecting Satellite Fix...'}
            </div>
            <div class="mt-2.5 flex flex-wrap items-center gap-2">
              <button type="button" id="driver-show-gate-pass-btn" class="cr-btn bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer select-none">
                <span>🎟️</span>
                <span>Show Gate Pass QR</span>
              </button>
              <button type="button" id="driver-view-self-map-btn" class="cr-btn bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-2 px-3 rounded-xl border border-white/30 flex items-center gap-1.5 cursor-pointer select-none">
                <span>📍</span>
                <span>View My Location in Maps</span>
              </button>
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

        <!-- Student Stops & Navigation Card -->
        <div class="cr-card p-6 border-2 border-amber-400/50 bg-amber-50/20 dark:bg-amber-950/20 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200 dark:border-amber-900/50">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">🎒</span>
              <div>
                <h2 class="font-black text-lg text-slate-900 dark:text-white">Assigned Student Stops (${students.length})</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Tap any student below to open Google Maps turn-by-turn navigation directly to their house</p>
              </div>
            </div>
            ${students.length > 0 ? `
              <button type="button" id="driver-route-all-btn" class="cr-btn bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                <span>🗺️</span>
                <span>Route All Stops in Maps</span>
              </button>
            ` : ''}
          </div>

          <div class="space-y-3">
            ${students.length === 0 ? `
              <div class="text-center py-8 text-slate-400 text-xs">No children currently assigned to this van.</div>
            ` : students.map((s, idx) => `
              <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-blue-400 transition">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-black text-sm flex items-center justify-center shrink-0">
                    #${idx + 1}
                  </div>
                  <div>
                    <div class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>${s.name}</span>
                      ${s.address_lat && s.address_lng && Number(s.address_lat) !== 0 ? `
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          GPS Locked
                        </span>
                      ` : ''}
                    </div>
                    <div class="text-xs text-slate-500 mt-0.5 truncate max-w-sm" title="${s.address || ''}">
                      📍 ${s.address || 'Address recorded on file'}
                    </div>
                  </div>
                </div>

                <button type="button" class="nav-student-btn cr-btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-md flex items-center gap-1.5 self-end sm:self-center cursor-pointer select-none whitespace-nowrap"
                        data-lat="${s.address_lat || ''}"
                        data-lng="${s.address_lng || ''}"
                        data-address="${encodeURIComponent(s.address || '')}"
                        data-name="${encodeURIComponent(s.name || 'Student')}">
                  <span>🗺️</span>
                  <span>Navigate to House</span>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  static attachEvents(user) {
    DriverHomePage.bindJourneyButtons(user);
    DriverHomePage.bindStudentNavButtons();
  }

  static bindStudentNavButtons() {
    // Individual student navigate button
    document.querySelectorAll('.nav-student-btn').forEach(btn => {
      btn.onclick = () => {
        const lat = btn.getAttribute('data-lat');
        const lng = btn.getAttribute('data-lng');
        const address = decodeURIComponent(btn.getAttribute('data-address') || '');
        const name = decodeURIComponent(btn.getAttribute('data-name') || 'Student');

        const launch = (originLat, originLng) => {
          if (window.openDirectionsTo) {
            window.openDirectionsTo(lat, lng, address, originLat, originLng);
          } else {
            const originParam = (originLat && originLng) ? `&origin=${originLat},${originLng}` : '';
            let url = '';
            if (lat && lng && Number(lat) !== 0) {
              url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${lat},${lng}&travelmode=driving`;
            } else if (address) {
              url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${encodeURIComponent(address)}&travelmode=driving`;
            }
            if (url) window.open(url, '_blank');
            else window.showToast(`No address recorded for ${name}`, 'warning');
          }
        };

        if (DriverHomePage.lastKnownLat && DriverHomePage.lastKnownLng) {
          launch(DriverHomePage.lastKnownLat, DriverHomePage.lastKnownLng);
        } else if (navigator.geolocation) {
          btn.innerHTML = '<span class="animate-spin">🔄</span> <span>Locating...</span>';
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              btn.innerHTML = '<span>🗺️</span> <span>Navigate to House</span>';
              DriverHomePage.lastKnownLat = pos.coords.latitude;
              DriverHomePage.lastKnownLng = pos.coords.longitude;
              launch(pos.coords.latitude, pos.coords.longitude);
            },
            () => {
              btn.innerHTML = '<span>🗺️</span> <span>Navigate to House</span>';
              launch(null, null);
            },
            { enableHighAccuracy: true, timeout: 3000 }
          );
        } else {
          launch(null, null);
        }
      };
    });

    // Route all student stops together
    const routeAllBtn = document.getElementById('driver-route-all-btn');
    if (routeAllBtn) {
      routeAllBtn.onclick = () => {
        const stops = DriverHomePage.cachedStudents || [];
        if (stops.length === 0) {
          return window.showToast('No assigned students to route', 'info');
        }

        const validStops = stops.map(s => {
          if (s.address_lat && s.address_lng && Number(s.address_lat) !== 0) {
            return `${s.address_lat},${s.address_lng}`;
          }
          return s.address ? encodeURIComponent(s.address) : null;
        }).filter(Boolean);

        if (validStops.length === 0) {
          return window.showToast('No valid student addresses found for routing', 'warning');
        }

        const originParam = (DriverHomePage.lastKnownLat && DriverHomePage.lastKnownLng)
          ? `&origin=${DriverHomePage.lastKnownLat},${DriverHomePage.lastKnownLng}`
          : '';

        if (validStops.length === 1) {
          const url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${validStops[0]}&travelmode=driving`;
          window.openMapsUrl ? window.openMapsUrl(url) : window.open(url, '_blank');
          return;
        }

        // Multiple stops: last stop is destination, preceding stops are waypoints
        const destination = validStops[validStops.length - 1];
        const waypoints = validStops.slice(0, -1).join('|');
        const url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
        window.openMapsUrl ? window.openMapsUrl(url) : window.open(url, '_blank');
      };
    }

    // View driver's own location in Google Maps
    const selfMapBtn = document.getElementById('driver-view-self-map-btn');
    if (selfMapBtn) {
      selfMapBtn.onclick = () => {
        if (DriverHomePage.lastKnownLat && DriverHomePage.lastKnownLng) {
          window.openGoogleMaps(DriverHomePage.lastKnownLat, DriverHomePage.lastKnownLng, 'My Van Location');
        } else if (navigator.geolocation) {
          selfMapBtn.textContent = 'Acquiring GPS...';
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              selfMapBtn.textContent = '📍 View My Location in Google Maps';
              DriverHomePage.lastKnownLat = pos.coords.latitude;
              DriverHomePage.lastKnownLng = pos.coords.longitude;
              window.openGoogleMaps(pos.coords.latitude, pos.coords.longitude, 'My Van Location');
            },
            (err) => {
              selfMapBtn.textContent = '📍 View My Location in Google Maps';
              window.showToast('Could not acquire device GPS. Please check location permissions.', 'error');
            },
            { enableHighAccuracy: true, timeout: 6000 }
          );
        } else {
          window.showToast('Device location is not supported by your browser.', 'error');
        }
      };
    }

    // Show Gate Pass QR modal for Driver
    const passBtn = document.getElementById('driver-show-gate-pass-btn');
    if (passBtn) {
      passBtn.onclick = () => {
        const vanId = DriverHomePage.currentVanId;
        if (window.showDriverPassQRModal) {
          window.showDriverPassQRModal({
            id: vanId,
            label: 'Van Transit Pass',
            name: 'Campus Van Driver',
            plate: 'Official Vehicle Pass'
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
        startBtn.innerHTML = '<span class="animate-spin">⏳</span> Acquiring GPS...';

        const doStart = async (realLat, realLng) => {
          try {
            startBtn.innerHTML = '<span class="animate-spin">⏳</span> Starting Journey...';
            const res = await window.api.request('/api/journey/start', {
              method: 'POST',
              body: JSON.stringify({ vanId, lat: realLat, lng: realLng })
            });

            DriverHomePage.isJourneyActive = true;
            DriverHomePage.currentVanId = res.vanId || vanId;
            DriverHomePage.lastKnownLat = realLat;
            DriverHomePage.lastKnownLng = realLng;

            DriverHomePage.startRealGPSWatch(DriverHomePage.currentVanId, realLat, realLng);
            DriverHomePage.updateUIState(true, realLat, realLng);

            window.showToast('🚀 Journey started! Live GPS is now broadcasting to parents.', 'success');
          } catch (err) {
            window.showToast(err.message, 'error');
            startBtn.disabled = false;
            startBtn.innerHTML = '<span class="text-2xl">🚀</span><span>START JOURNEY</span>';
          }
        };

        if (DriverHomePage.lastKnownLat && DriverHomePage.lastKnownLng) {
          doStart(DriverHomePage.lastKnownLat, DriverHomePage.lastKnownLng);
        } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = Number(pos.coords.latitude.toFixed(6));
              const lng = Number(pos.coords.longitude.toFixed(6));
              DriverHomePage.lastKnownLat = lat;
              DriverHomePage.lastKnownLng = lng;
              doStart(lat, lng);
            },
            (err) => {
              console.warn('Initial GPS check notice:', err.message);
              // Start anyway and let continuous watch acquire the lock
              doStart(null, null);
            },
            { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
          );
        } else {
          doStart(null, null);
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

          window.showToast('🛑 Journey ended. Live GPS tracking stopped.', 'info');
        } catch (err) {
          window.showToast(err.message, 'error');
          endBtn.disabled = false;
          endBtn.innerHTML = '<span class="text-2xl">🛑</span><span>END JOURNEY</span>';
        }
      };
    }
  }

  // Update hero status badge and toggle button in place
  static updateUIState(isActive, lat, lng) {
    const dot = document.getElementById('driver-status-dot');
    const label = document.getElementById('driver-status-label');
    const coords = document.getElementById('driver-gps-coordinates');
    const btnContainer = document.getElementById('driver-btn-container');

    if (dot && label) {
      dot.className = `w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`;
      label.textContent = isActive ? 'GPS BROADCASTING LIVE' : 'VEHICLE IDLE (NOT TRACKING)';
    }

    if (coords) {
      if (isActive) {
        coords.classList.remove('hidden');
        if (lat && lng) {
          coords.textContent = `📍 Live GPS: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
        } else {
          coords.textContent = '📍 Acquiring Real-Time Satellite Fix...';
        }
      } else {
        coords.classList.add('hidden');
      }
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

  // Real Hardware GPS Watch (§7.8)
  static startRealGPSWatch(vanId, initialLat, initialLng) {
    DriverHomePage.stopRealGPSWatch();

    const coordsDisplay = document.getElementById('driver-gps-coordinates');
    let lastSent = 0;

    const pushLocation = (lat, lng) => {
      DriverHomePage.lastKnownLat = lat;
      DriverHomePage.lastKnownLng = lng;
      if (coordsDisplay) {
        coordsDisplay.textContent = `📍 Live GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }
      window.api.request('/api/location/update', {
        method: 'POST',
        body: JSON.stringify({ vanId, lat, lng })
      }).catch(() => {});
    };

    if (initialLat && initialLng) {
      pushLocation(initialLat, initialLng);
    }

    if (navigator.geolocation) {
      DriverHomePage.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const now = Date.now();
          if (now - lastSent < 2000) return; // Throttle 2s
          lastSent = now;
          pushLocation(lat, lng);
        },
        (err) => {
          console.warn('Real GPS continuous watch notice:', err.message);
          if (coordsDisplay && DriverHomePage.lastKnownLat) {
            coordsDisplay.textContent = `📍 Live GPS: ${DriverHomePage.lastKnownLat.toFixed(5)}, ${DriverHomePage.lastKnownLng.toFixed(5)}`;
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
      );
    }
  }

  static stopRealGPSWatch() {
    if (DriverHomePage.watchId !== null) {
      if (navigator.geolocation) {
        navigator.geolocation.clearWatch(DriverHomePage.watchId);
      }
      DriverHomePage.watchId = null;
    }
  }
}

window.DriverHomePage = DriverHomePage;
