// CampusRide — Admin Dashboard (§7.2)
// Restricted Scope: Gate Staff Approvals & Decline System ONLY.
// (Admin cannot access parent accounts, gate pass scanner, drivers directory, or pass registers)
class AdminDashboardPage {
  static async render() {
    let requests = [];
    try {
      const res = await window.api.request('/api/staff-requests');
      requests = res.requests || [];
    } catch (e) {
      console.error(e);
    }

    const pending = requests.filter(r => r.status === 'pending');
    const approved = requests.filter(r => r.status === 'approved');
    const rejected = requests.filter(r => r.status === 'rejected');

    return `
      <div class="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <!-- Back Button -->
        <div>
          <button type="button" onclick="window.goBack()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <span class="text-base font-black">←</span> <span>Back</span>
          </button>
        </div>

        <!-- Header Banner: Staff Registration Approvals ONLY -->
        <div class="bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-[11px] font-bold uppercase tracking-wider bg-purple-500/30 px-3 py-0.5 rounded-full border border-purple-400/30">
              Administrator Portal
            </span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-black tracking-tight">Staff Registration Approvals</h1>
          <p class="text-xs sm:text-sm text-purple-200 mt-1 max-w-xl leading-relaxed">
            Review onboarding requests and approve or decline gate security staff accounts.
          </p>
        </div>

        <!-- Approval Tabs -->
        <div class="cr-card p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 class="font-bold text-base text-slate-900 dark:text-white">Staff Authorization Decisions</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Manage gate security access requests.</p>
            </div>
            <div class="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold self-start sm:self-auto">
              <button class="approval-tab-btn px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 shadow-sm text-purple-700 dark:text-purple-300 font-bold" data-tab="pending">
                Pending (${pending.length})
              </button>
              <button class="approval-tab-btn px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white" data-tab="approved">
                Approved (${approved.length})
              </button>
              <button class="approval-tab-btn px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white" data-tab="rejected">
                Declined (${rejected.length})
              </button>
            </div>
          </div>

          <!-- Pending Requests Tab -->
          <div id="tab-content-pending" class="tab-pane py-4 space-y-3">
            ${pending.length === 0 ? `
              <div class="text-center py-12 text-slate-500 space-y-2">
                <span class="text-4xl">🎉</span>
                <p class="font-bold text-sm text-slate-800 dark:text-slate-200">No pending staff requests</p>
                <p class="text-xs text-slate-400">All incoming registration requests have been resolved.</p>
              </div>
            ` : pending.map(r => `
              <div class="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-base text-slate-900 dark:text-white">${r.full_name}</span>
                    <span class="cr-badge cr-badge-pending text-[10px]">Awaiting Approval</span>
                  </div>
                  <div class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-3">
                    <span>📧 ${r.email}</span>
                    <span>📞 ${r.phone}</span>
                    <span>🕒 Applied: ${new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  ${r.notes ? `<div class="text-xs text-slate-600 dark:text-slate-300 mt-1 italic">${r.notes}</div>` : ''}
                </div>
                <div class="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button class="cr-btn cr-btn-primary text-xs py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 font-bold approve-req-btn shadow-sm" data-id="${r.id}">
                    ✓ Approve Access
                  </button>
                  <button class="cr-btn cr-btn-secondary text-xs py-2 px-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold reject-req-btn" data-id="${r.id}">
                    ✕ Decline
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Approved Staff Tab -->
          <div id="tab-content-approved" class="tab-pane py-4 space-y-3 hidden">
            ${approved.length === 0 ? `
              <div class="text-center py-12 text-slate-500 space-y-2">
                <span class="text-4xl">👥</span>
                <p class="font-bold text-sm text-slate-800 dark:text-slate-200">No approved gate staff</p>
                <p class="text-xs text-slate-400">Approved staff members will appear here.</p>
              </div>
            ` : approved.map(r => `
              <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-base text-slate-900 dark:text-white">${r.full_name}</span>
                    <span class="cr-badge cr-badge-approved text-[10px]">Gate Approved</span>
                  </div>
                  <div class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-3">
                    <span>📧 ${r.email}</span>
                    <span>📞 ${r.phone}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button class="cr-btn cr-btn-destructive text-xs py-1.5 px-3 block-staff-btn font-bold" data-id="${r.id}" title="Revoke access and decline staff">
                    ✕ Decline / Revoke Access
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Declined Staff Tab -->
          <div id="tab-content-rejected" class="tab-pane py-4 space-y-3 hidden">
            ${rejected.length === 0 ? `
              <div class="text-center py-12 text-slate-500 space-y-2">
                <span class="text-4xl">🛡️</span>
                <p class="font-bold text-sm text-slate-800 dark:text-slate-200">No declined requests</p>
                <p class="text-xs text-slate-400">Declined staff requests will appear here.</p>
              </div>
            ` : rejected.map(r => `
              <div class="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50/30 dark:bg-rose-950/20">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-sm text-slate-900 dark:text-white">${r.full_name}</span>
                    <span class="cr-badge cr-badge-rejected text-[10px]">Declined</span>
                  </div>
                  <div class="text-xs text-slate-500 mt-1">${r.email} • ${r.phone}</div>
                </div>
                <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button class="cr-btn cr-btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 font-bold approve-req-btn shadow-sm" data-id="${r.id}">
                    ✓ Approve Access
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  static attachEvents() {
    // Tab switching
    const tabBtns = document.querySelectorAll('.approval-tab-btn');
    tabBtns.forEach(btn => {
      btn.onclick = () => {
        const tab = btn.getAttribute('data-tab');
        tabBtns.forEach(b => {
          b.className = 'approval-tab-btn px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white';
        });
        btn.className = 'approval-tab-btn px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 shadow-sm text-purple-700 dark:text-purple-300 font-bold';

        document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
        const activePane = document.getElementById(`tab-content-${tab}`);
        if (activePane) activePane.classList.remove('hidden');
      };
    });

    // Approve Request
    document.querySelectorAll('.approve-req-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        try {
          await window.api.request(`/api/staff-requests/${id}/review`, {
            method: 'POST',
            body: JSON.stringify({ status: 'approved' })
          });
          window.showToast('Staff member approved successfully!', 'success');
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          btn.disabled = false;
        }
      };
    });

    // Decline / Reject Request
    document.querySelectorAll('.reject-req-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Decline this gate staff application?')) return;
        btn.disabled = true;
        try {
          await window.api.request(`/api/staff-requests/${id}/review`, {
            method: 'POST',
            body: JSON.stringify({ status: 'rejected' })
          });
          window.showToast('Staff request marked as declined.', 'info');
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          btn.disabled = false;
        }
      };
    });

    // Revoke / Decline Approved Staff
    document.querySelectorAll('.block-staff-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Decline and revoke access for this staff account?')) return;
        btn.disabled = true;
        try {
          await window.api.request(`/api/staff-requests/${id}/block`, { method: 'POST' });
          window.showToast('Staff access declined and account deactivated.', 'info');
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          btn.disabled = false;
        }
      };
    });
  }
}

window.AdminDashboardPage = AdminDashboardPage;
