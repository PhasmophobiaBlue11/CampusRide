// CampusRide — Live Fleet & Google Maps Radar (§7.10)
// Directly redirects to Google Maps with precise coordinates automatically
class LiveMapPage {
  static async render(user) {
    const isParent = Boolean(user.parentProfile);
    let vans = [];
    let locations = [];

    try {
      const [vRes, lRes] = await Promise.all([
        window.api.request('/api/drivers?type=van'),
        window.api.request('/api/locations')
      ]);
      vans = vRes.drivers || [];
      locations = lRes.locations || [];
    } catch (e) {
      console.warn(e);
    }

    // Merge locations with van details
    const fleet = vans.map(v => {
      const loc = locations.find(l => l.van_id === v.id);
      return {
        ...v,
        lat: loc ? Number(loc.lat) : 0,
        lng: loc ? Number(loc.lng) : 0,
        live: Boolean(loc && loc.live && Number(loc.lat) !== 0),
        updated_at: loc ? loc.updated_at : null
      };
    });

    LiveMapPage.cachedFleet = fleet;
    const activeCount = fleet.filter(f => f.live).length;

    return `
      <div class="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <!-- Back Button -->
        <div>
          <button type="button" onclick="window.goBack()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <span class="text-base font-black">←</span> <span>Back</span>
          </button>
        </div>

        <!-- Hero Header -->
        <div class="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-2">
              <span class="w-2.5 h-2.5 rounded-full ${activeCount > 0 ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}"></span>
              ${activeCount} Vehicles Broadcasting GPS
            </div>
            <h1 class="text-2xl sm:text-3xl font-black">Live Fleet Tracking</h1>
            <p class="text-xs sm:text-sm text-blue-100 mt-1 max-w-lg">
              CampusRide connects directly to Google Maps for high-accuracy turn-by-turn navigation and live location view.
            </p>
          </div>

          <div>
            <button type="button" id="open-first-van-map-btn" 
               class="cr-btn bg-white text-blue-900 hover:bg-blue-50 font-bold px-6 py-3.5 shadow-lg flex items-center gap-2 text-sm whitespace-nowrap cursor-pointer">
              <span>🗺️</span>
              <span>Open Fleet on Google Maps</span>
            </button>
          </div>
        </div>

        <!-- Van Fleet Cards -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-bold text-base text-slate-900 dark:text-white">Active Transport Vehicles</h2>
            <span class="text-xs text-slate-500">${fleet.length} registered</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${fleet.length === 0 ? `
              <div class="col-span-full cr-card p-8 text-center text-slate-400 text-xs">
                No transport vans registered in fleet yet.
              </div>
            ` : fleet.map(v => `
              <div class="cr-card p-5 space-y-4 border ${v.live ? 'border-emerald-300 dark:border-emerald-800/60' : 'border-slate-200 dark:border-slate-800'}">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <span class="text-2xl">${v.live ? '🚌' : '🚐'}</span>
                    <div>
                      <div class="font-black text-base text-slate-900 dark:text-white">${v.label}</div>
                      <div class="text-xs text-slate-500 font-mono">${v.van_no}</div>
                    </div>
                  </div>
                  <span class="cr-badge ${v.live ? 'cr-badge-approved' : 'cr-badge-pending'} text-[10px]">
                    ${v.live ? '🟢 LIVE ON ROUTE' : '⚪ IDLE'}
                  </span>
                </div>

                <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
                  <div class="flex justify-between text-slate-500">
                    <span>Driver:</span>
                    <span class="font-semibold text-slate-900 dark:text-white">${v.driver_name}</span>
                  </div>
                  <div class="flex justify-between text-slate-500 font-mono">
                    <span>GPS Coordinates:</span>
                    <span class="font-bold text-blue-600 dark:text-blue-400">${v.lat !== 0 ? `${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}` : 'Awaiting GPS broadcast'}</span>
                  </div>
                </div>

                <button type="button" 
                   data-lat="${v.lat}" data-lng="${v.lng}" data-label="${v.label}"
                   class="view-van-map-btn cr-btn cr-btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer">
                  <span>🗺️</span>
                  <span>View ${v.label} in Google Maps</span>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  static attachEvents() {
    const firstBtn = document.getElementById('open-first-van-map-btn');
    if (firstBtn) {
      firstBtn.onclick = () => {
        const liveVan = (LiveMapPage.cachedFleet || []).find(v => v.live && v.lat !== 0) || (LiveMapPage.cachedFleet || [])[0];
        if (liveVan && liveVan.lat && liveVan.lat !== 0) {
          window.openGoogleMaps(liveVan.lat, liveVan.lng, liveVan.label);
        } else {
          window.showToast('No active vehicles currently broadcasting GPS. The driver must click "Start Journey" first.', 'warning');
        }
      };
    }

    document.querySelectorAll('.view-van-map-btn').forEach(btn => {
      btn.onclick = () => {
        const lat = Number(btn.getAttribute('data-lat'));
        const lng = Number(btn.getAttribute('data-lng'));
        const label = btn.getAttribute('data-label') || 'Van';
        if (lat && lng && lat !== 0) {
          window.openGoogleMaps(lat, lng, label);
        } else {
          window.showToast(`${label} has not broadcasted its live location yet. Tracking becomes active when driver clicks "Start Journey".`, 'warning');
        }
      };
    });
  }
}

window.LiveMapPage = LiveMapPage;
