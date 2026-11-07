// CampusRide — Dedicated Working Staffs View (§4.1, §7.7)
// Displays all account-based staff members registered with login credentials (e.g. Atharva Deshpande @Staff2026)
class WorkingStaffPage {
  static async render(user) {
    let staff = [];
    try {
      const res = await window.api.request('/api/working-staff');
      staff = res.staff || [];
    } catch (err) {
      console.warn('[WorkingStaff] Notice fetching staff:', err.message);
    }

    return `
      <div class="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <!-- Back Button -->
        <div>
          <button type="button" onclick="window.goBack()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <span class="text-base font-black">←</span> <span>Back</span>
          </button>
        </div>

        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">👔</span>
              <h1 class="text-2xl font-black text-slate-900 dark:text-white">Working Staffs</h1>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Account-based gate security operators, campus controllers, and registered duty staff.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              👥 ${staff.length} Account-Based Staff
            </span>
          </div>
        </div>

        <!-- Staff Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
          ${staff.length === 0 ? `
            <div class="col-span-full cr-card p-12 text-center text-slate-400 text-xs">
              No account-based staff registered yet.
            </div>
          ` : staff.map(s => {
            const isApproved = s.status === 'approved';
            const isAdmin = s.is_admin || s.role === 'admin';
            return `
              <div class="cr-card p-5 space-y-3.5 border-l-4 ${isAdmin ? 'border-l-purple-500' : isApproved ? 'border-l-emerald-500' : 'border-l-amber-500'} flex flex-col justify-between">
                <div>
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl ${isAdmin ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'} flex items-center justify-center font-bold text-base shrink-0">
                        ${isAdmin ? '🛡️' : '👔'}
                      </div>
                      <div>
                        <h3 class="font-bold text-base text-slate-900 dark:text-white leading-tight">${s.full_name || s.username}</h3>
                        <div class="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          @${s.username}
                        </div>
                      </div>
                    </div>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isAdmin ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' : isApproved ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'} shrink-0">
                      ${isAdmin ? 'Master Admin' : isApproved ? 'Approved Staff' : 'Pending Review'}
                    </span>
                  </div>

                  <div class="space-y-1.5 mt-3 text-xs">
                    <div class="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <span class="text-slate-400">Role:</span>
                      <span class="font-semibold text-slate-800 dark:text-slate-200">${isAdmin ? 'System Administrator' : 'Gate Operations Staff'}</span>
                    </div>
                    <div class="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <span class="text-slate-400">Phone:</span>
                      <span class="font-mono font-medium">${s.phone || 'No phone recorded'}</span>
                    </div>
                    ${s.created_at ? `
                      <div class="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span>Joined:</span>
                        <span>${new Date(s.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    ` : ''}
                  </div>
                </div>

                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  ${s.phone ? `
                    <a href="tel:${s.phone}" class="cr-btn bg-emerald-600 hover:bg-emerald-500 text-white w-full py-1.5 text-xs text-center font-bold flex items-center justify-center gap-1.5">
                      <span>📞</span> <span>Call Staff (${s.phone})</span>
                    </a>
                  ` : `
                    <span class="text-xs text-slate-400 text-center w-full py-1">No phone number</span>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  static attachEvents() {}
}

window.WorkingStaffPage = WorkingStaffPage;
