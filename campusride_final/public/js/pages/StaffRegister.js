// CampusRide — Staff Registration Notice
// Staff accounts are created and managed exclusively by the Administrator (§Unified Staff Account)
class StaffRegisterPage {
  static render() {
    return `
      <div class="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div class="cr-card w-full max-w-md p-6 sm:p-8 animate-fade-in-up text-center space-y-5">
          <!-- Back Button -->
          <div class="text-left mb-2">
            <button type="button" onclick="window.goBack()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
              <span class="text-base font-black">←</span> <span>Back</span>
            </button>
          </div>

          <div class="w-16 h-16 mx-auto rounded-3xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-3xl shadow-lg">
            🛂
          </div>

          <div>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white">Unified Staff Account System</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Self-service staff registration is disabled. All teachers and gate security personnel use <b>one single common staff account</b> created exclusively by the Administrator.
            </p>
          </div>

          <div class="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-left text-xs space-y-2">
            <div class="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <span>ℹ️</span> <span>How to Access Staff Desk:</span>
            </div>
            <ul class="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
              <li>Ask your school administrator for the common staff username, password, and 4-digit PIN.</li>
              <li>Sign in once using the credentials.</li>
              <li>On future visits, simply enter the 4-digit PIN to quickly unlock your staff console.</li>
            </ul>
          </div>

          <a href="#/staff" class="cr-btn cr-btn-primary block w-full py-2.5 font-bold shadow-md text-xs cursor-pointer text-center">
            Go to Staff Sign In →
          </a>
        </div>
      </div>
    `;
  }

  static attachEvents() {}
}

window.StaffRegisterPage = StaffRegisterPage;
