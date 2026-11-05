// CampusRide — Admin Dashboard (§7.2)
// Restricted Scope: Staff Approvals, Revoke/Block Staff Accounts, and Gate Register Audit only.
// (Admin cannot add drivers or staff; gate staff handles driver/staff onboarding)
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
      <div class="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <!-- Back Button -->
        <div>
          <button type="button" onclick="window.goBack()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <span class="text-base font-black">←</span> <span>Back</span>
          </button>
        </div>

        <!-- Header banner -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl">
          <div>
            <div class="flex items-center gap-2 mb-1.5">
              <span class="text-[11px] font-bold uppercase tracking-wider bg-blue-500/30 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                Administrator Control Center
              </span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black">Staff Approvals & Gate Audit</h1>
            <p class="text-xs sm:text-sm text-blue-200 mt-1 max-w-xl">
              Authorize incoming gate staff requests, manage active staff access, and inspect campus entry/exit audit registers.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <a href="#/van-register" class="cr-btn bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs py-2.5 px-4 shadow-lg flex items-center gap-1.5">
              <span>📋</span> View Gate Register
            </a>
          </div>
        </div>

        <!-- Approval Tabs (§7.2) -->
        <div class="cr-card p-6">
          <div class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 class="font-bold text-base text-slate-900 dark:text-white">Staff Authorization Management</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Review onboarding requests and manage approved gate staff credentials.</p>
            </div>
            <div class="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button class="approval-tab-btn px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" data-tab="pending">
                Pending (${pending.length})
              </button>
              <button class="approval-tab-btn px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white" data-tab="approved">
                Approved (${approved.length})
              </button>
              <button class="approval-tab-btn px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white" data-tab="rejected">
                Rejected (${rejected.length})
              </button>
            </div>
          </div>

          <!-- Pending Requests Tab -->
          <div id="tab-content-pending" class="tab-pane py-4 space-y-3">
            ${pending.length === 0 ? `
              <div class="text-center py-10 text-slate-500">
                <span class="text-3xl">🎉</span>
                <p class="font-semibold text-sm mt-2">No pending staff requests</p>
                <p class="text-xs text-slate-400">All gate staff registration requests have been resolved.</p>
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
                  <div class="text-xs text-slate-600 dark:text-slate-300 mt-1 italic">${r.notes || 'No notes attached'}</div>
                </div>
                <div class="flex items-center gap-2 self-end md:self-center">
                  <button class="cr-btn cr-btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 approve-req-btn" data-id="${r.id}">
                    ✓ Approve Access
                  </button>
                  <button class="cr-btn cr-btn-secondary text-xs py-1.5 px-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 reject-req-btn" data-id="${r.id}">
                    ✕ Reject
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Approved Staff Tab -->
          <div id="tab-content-approved" class="tab-pane py-4 space-y-3 hidden">
            ${approved.length === 0 ? `
              <div class="text-center py-10 text-slate-500">No approved staff yet.</div>
            ` : approved.map(r => `
              <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-base text-slate-900 dark:text-white">${r.full_name}</span>
                    <span class="cr-badge cr-badge-approved text-[10px]">Gate Approved</span>
                    ${r.is_admin ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">ADMIN</span>' : ''}
                  </div>
                  <div class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-3">
                    <span>📧 ${r.email}</span>
                    <span>📞 ${r.phone}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2 self-end md:self-center">
                  ${!r.is_admin ? `
                    <button class="cr-btn cr-btn-secondary text-xs py-1.5 px-3 text-purple-600 promote-req-btn" data-id="${r.id}" title="Promote to full admin">
                      ⭐ Promote to Admin
                    </button>
                  ` : ''}
                  <button class="cr-btn cr-btn-destructive text-xs py-1.5 px-3 block-staff-btn" data-id="${r.id}" title="Revoke access and block">
                    🚫 Block / Delete Staff
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Rejected Staff Tab -->
          <div id="tab-content-rejected" class="tab-pane py-4 space-y-3 hidden">
            ${rejected.length === 0 ? `
              <div class="text-center py-10 text-slate-500">No rejected requests.</div>
            ` : rejected.map(r => `
              <div class="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/30 flex items-center justify-between bg-rose-50/30 dark:bg-rose-950/20">
                <div>
                  <div class="font-bold text-sm text-slate-900 dark:text-white">${r.full_name}</div>
                  <div class="text-xs text-slate-500">${r.email} • ${r.phone}</div>
                </div>
                <span class="cr-badge cr-badge-rejected text-[10px]">Rejected</span>
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
        btn.className = 'approval-tab-btn px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white';

        document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
        const activePane = document.getElementById(`tab-content-${tab}`);
        if (activePane) activePane.classList.remove('hidden');
      };
    });

    // Approve
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

    // Reject
    document.querySelectorAll('.reject-req-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Reject this staff application?')) return;
        btn.disabled = true;
        try {
          await window.api.request(`/api/staff-requests/${id}/review`, {
            method: 'POST',
            body: JSON.stringify({ status: 'rejected' })
          });
          window.showToast('Staff request marked as rejected.', 'info');
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          btn.disabled = false;
        }
      };
    });

    // Promote
    document.querySelectorAll('.promote-req-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Promote this staff member to full administrator privileges?')) return;
        btn.disabled = true;
        try {
          await window.api.request(`/api/staff-requests/${id}/promote`, { method: 'POST' });
          window.showToast('User successfully promoted to Administrator!', 'success');
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          btn.disabled = false;
        }
      };
    });

    // Block
    document.querySelectorAll('.block-staff-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Revoke access and block this staff account immediately?')) return;
        btn.disabled = true;
        try {
          await window.api.request(`/api/staff-requests/${id}/block`, { method: 'POST' });
          window.showToast('Staff access revoked and account blocked.', 'info');
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
