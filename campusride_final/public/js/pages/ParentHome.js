// CampusRide — Parent Dashboard & Children Manager (§7.9, §8.3)
class ParentHomePage {
  static cachedVanLocation = null;
  static assignedVanId = null;
  static assignedVanLabel = null;
  static hasAttachedSSE = false;

  static async render(user) {
    let children = [];
    let notifications = [];
    let vans = [];
    let vanLocation = null;

    try {
      const [cRes, nRes, vRes, locRes] = await Promise.all([
        window.api.request('/api/children'),
        window.api.request('/api/notifications'),
        window.api.request('/api/drivers?type=van'),
        window.api.request('/api/locations')
      ]);
      children = cRes.children || [];
      notifications = nRes.notifications || [];
      vans = vRes.drivers || [];
      const locations = locRes.locations || [];
      
      const firstVanId = children[0]?.van_id;
      const firstVanLabel = children[0]?.van_label;

      if (firstVanId) {
        vanLocation = locations.find(l => l.van_id === firstVanId);
      }
      if (!vanLocation && firstVanLabel) {
        vanLocation = locations.find(l => (l.van_label || '').toLowerCase() === firstVanLabel.toLowerCase());
      }
      if (!vanLocation) {
        vanLocation = locations.find(l => l.live && Number(l.lat) !== 0);
      }
      if (!vanLocation && locations.length > 0) {
        vanLocation = locations[0];
      }
    } catch {}

    const trackedVanLabel = children[0]?.van_label || (vanLocation?.van_label) || 'Van 1';
    const isLive = Boolean(vanLocation && vanLocation.live);
    ParentHomePage.cachedVanLocation = vanLocation;
    ParentHomePage.assignedVanId = children[0]?.van_id || (vanLocation?.van_id);
    ParentHomePage.assignedVanLabel = trackedVanLabel;

    return `
      <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <!-- Live Van Status Banner -->
        <div class="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-2">
              <span id="parent-status-dot" class="w-2.5 h-2.5 rounded-full ${isLive ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}"></span>
              <span id="parent-status-label">${isLive ? 'BUS ACTIVE & EN ROUTE' : 'BUS AT REST / IDLE'}</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black">Tracking: ${trackedVanLabel}</h1>
            <p class="text-xs sm:text-sm text-blue-100 mt-1">
              ${children.length > 0 
                ? `Riding: ${children.map(c => c.name).join(', ')}` 
                : 'No children added yet — assign below to start tracking'}
            </p>
          </div>

          <div class="flex items-center gap-3">
            <button type="button" id="parent-track-maps-btn" class="cr-btn bg-white text-blue-900 hover:bg-blue-50 font-bold px-6 py-3.5 shadow-lg flex items-center gap-2 text-sm cursor-pointer select-none">
              <span>🗺️</span>
              <span id="parent-track-btn-text">${isLive ? 'Track Live Van in Maps' : 'View Van on Google Maps'}</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Children Manager (§7.9) -->
          <div class="cr-card p-6 space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <span class="text-xl">🧒</span>
                <h2 class="font-bold text-base text-slate-900 dark:text-white">My Children (${children.length}/5)</h2>
              </div>
              ${children.length < 5 ? `
                <button id="add-child-modal-btn" class="cr-btn cr-btn-primary text-xs py-1.5 px-3">
                  + Add Child
                </button>
              ` : `
                <span class="text-[10px] text-slate-400 font-semibold">Max 5 Reached</span>
              `}
            </div>

            <div class="space-y-2.5">
              ${children.length === 0 ? `
                <div class="text-center py-8 text-slate-400 text-xs">
                  Tap "+ Add Child" to assign your student to their campus van.
                </div>
              ` : children.map(c => `
                <div class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                  <div>
                    <div class="font-bold text-sm text-slate-900 dark:text-white">${c.name}</div>
                    <div class="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">Assigned to: ${c.van_label}</div>
                  </div>
                  <button class="delete-child-btn p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" data-id="${c.id}" title="Remove">
                    🗑️
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Real-time Notifications Feed (§7.9) -->
          <div class="cr-card p-6 space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <span class="text-xl">🔔</span>
                <h2 class="font-bold text-base text-slate-900 dark:text-white">Transit Notifications</h2>
              </div>
              <button id="mark-notifs-read-btn" class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                Mark Read
              </button>
            </div>

            <div class="space-y-2.5 max-h-[380px] overflow-y-auto">
              ${notifications.length === 0 ? `
                <div class="text-center py-8 text-slate-400 text-xs">
                  No notifications yet. You'll receive real-time alerts when your van enters campus or starts journey.
                </div>
              ` : notifications.map(n => `
                <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 ${n.read ? 'bg-white dark:bg-slate-900 opacity-75' : 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50'}">
                  <div class="flex items-center justify-between text-xs mb-1">
                    <span class="font-bold text-slate-800 dark:text-slate-100">${n.van_label} • ${n.event_type.toUpperCase()}</span>
                    <span class="text-[10px] text-slate-400">${new Date(n.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${n.message}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static attachEvents() {
    // Real-time Track van in Google Maps (fetches fresh server GPS on every click)
    const trackMapsBtn = document.getElementById('parent-track-maps-btn');
    if (trackMapsBtn) {
      trackMapsBtn.onclick = async () => {
        trackMapsBtn.disabled = true;
        const originalHtml = trackMapsBtn.innerHTML;
        trackMapsBtn.innerHTML = '<span class="animate-spin">🔄</span> Locating Van...';

        try {
          const locRes = await window.api.request('/api/locations');
          const locations = locRes.locations || [];

          let freshLoc = null;
          const targetVanId = ParentHomePage.assignedVanId;
          const targetLabel = ParentHomePage.assignedVanLabel;

          if (targetVanId) {
            freshLoc = locations.find(l => l.van_id === targetVanId);
          }
          if (!freshLoc && targetLabel) {
            freshLoc = locations.find(l => (l.van_label || '').toLowerCase() === targetLabel.toLowerCase());
          }
          if (!freshLoc) {
            freshLoc = locations.find(l => l.live && Number(l.lat) !== 0);
          }
          if (!freshLoc && locations.length > 0) {
            freshLoc = locations[0];
          }

          if (freshLoc) {
            ParentHomePage.cachedVanLocation = freshLoc;
          }

          if (freshLoc && Number(freshLoc.lat) !== 0 && Number(freshLoc.lng) !== 0) {
            window.openGoogleMaps(freshLoc.lat, freshLoc.lng, freshLoc.van_label || 'Campus Van');
          } else if (freshLoc && freshLoc.live) {
            window.showToast('Driver has started the journey! Waiting for initial GPS satellite signal from driver device. Please tap again in 5 seconds.', 'info');
          } else {
            window.showToast('Van is currently at rest. Live GPS tracking becomes active as soon as the driver clicks "Start Journey".', 'warning');
          }
        } catch (err) {
          const loc = ParentHomePage.cachedVanLocation;
          if (loc && loc.lat && loc.lng && Number(loc.lat) !== 0) {
            window.openGoogleMaps(loc.lat, loc.lng, loc.van_label || 'Campus Van');
          } else {
            window.showToast('Could not reach server to track van. Please check internet connection.', 'error');
          }
        } finally {
          trackMapsBtn.disabled = false;
          trackMapsBtn.innerHTML = originalHtml;
        }
      };
    }

    // Attach SSE listener to update parent banner in real-time
    if (window.api && window.api.on && !ParentHomePage.hasAttachedSSE) {
      ParentHomePage.hasAttachedSSE = true;

      window.api.on('journey_started', (data) => {
        ParentHomePage.updateLiveStatusUI(true, data);
        window.showToast(`🚀 ${data.label || 'Van'} has started journey! Live GPS is now tracking.`, 'info');
      });

      window.api.on('location_update', (data) => {
        ParentHomePage.updateLiveStatusUI(true, data);
      });

      window.api.on('journey_ended', (data) => {
        ParentHomePage.updateLiveStatusUI(false, data);
        window.showToast(`🛑 ${data.label || 'Van'} journey ended.`, 'info');
      });
    }

    // Add child modal
    const addBtn = document.getElementById('add-child-modal-btn');
    if (addBtn) {
      addBtn.onclick = () => ParentHomePage.openAddChildModal();
    }

    // Delete child
    document.querySelectorAll('.delete-child-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Remove this child profile?')) return;
        try {
          await window.api.request(`/api/children/${id}`, { method: 'DELETE' });
          window.showToast('Child profile removed', 'info');
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      };
    });

    // Mark notifications read
    const markBtn = document.getElementById('mark-notifs-read-btn');
    if (markBtn) {
      markBtn.onclick = async () => {
        try {
          await window.api.request('/api/notifications/mark-read', { method: 'POST' });
          window.showToast('Notifications marked as read', 'info');
          window.location.reload();
        } catch {}
      };
    }
  }

  static updateLiveStatusUI(isLive, data) {
    if (data && data.lat && data.lng) {
      if (!ParentHomePage.cachedVanLocation) ParentHomePage.cachedVanLocation = {};
      ParentHomePage.cachedVanLocation.lat = data.lat;
      ParentHomePage.cachedVanLocation.lng = data.lng;
      ParentHomePage.cachedVanLocation.live = isLive ? 1 : 0;
      if (data.label) ParentHomePage.cachedVanLocation.van_label = data.label;
    }

    const dot = document.getElementById('parent-status-dot');
    const label = document.getElementById('parent-status-label');
    const trackBtnText = document.getElementById('parent-track-btn-text');

    if (dot) {
      dot.className = `w-2.5 h-2.5 rounded-full ${isLive ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`;
    }
    if (label) {
      label.textContent = isLive ? 'BUS ACTIVE & EN ROUTE' : 'BUS AT REST / IDLE';
    }
    if (trackBtnText) {
      trackBtnText.textContent = isLive ? 'Track Live Van in Maps' : 'View Van on Google Maps';
    }
  }

  static async openAddChildModal() {
    let vans = [];
    try {
      const res = await window.api.request('/api/drivers?type=van');
      vans = res.drivers || [];
    } catch {}

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';
    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 class="font-bold text-lg text-slate-900 dark:text-white">Add Child Profile</h3>
          <button id="close-child-modal" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form id="add-child-form" class="space-y-3.5">
          <div>
            <label class="block text-xs font-semibold mb-1">Child's Name & Class</label>
            <input type="text" id="new-child-name" required class="cr-input" placeholder="e.g. Aarav Sharma (Class 4B)" />
          </div>

          <div>
            <label class="block text-xs font-semibold mb-1">Assigned Transport Van</label>
            <select id="new-child-van" required class="cr-input">
              <option value="">Select a Campus Van...</option>
              ${vans.map(v => `<option value="${v.id}">${v.label} — ${v.driver_name} (${v.van_no})</option>`).join('')}
            </select>
          </div>

          <button type="submit" class="cr-btn cr-btn-primary w-full py-2.5 mt-2">
            Save Child & Sync Van
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-child-modal').onclick = () => modal.remove();

    modal.querySelector('#add-child-form').onsubmit = async (e) => {
      e.preventDefault();
      const name = modal.querySelector('#new-child-name').value.trim();
      const van_id = modal.querySelector('#new-child-van').value;

      try {
        await window.api.request('/api/children', {
          method: 'POST',
          body: JSON.stringify({ name, van_id })
        });
        window.showToast('Child added and van synced!', 'success');
        modal.remove();
        window.location.reload();
      } catch (err) {
        window.showToast(err.message, 'error');
      }
    };
  }
}

window.ParentHomePage = ParentHomePage;
