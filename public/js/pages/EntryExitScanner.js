// CampusRide — Gate Entry/Exit Pass Scanner (§7.4, §8.4)
// Enforces alternation rule: Cannot enter twice, cannot exit without entry
class EntryExitScannerPage {
  static currentMode = 'entry'; // 'entry' | 'exit'

  static render() {
    const isEntry = EntryExitScannerPage.currentMode === 'entry';

    return `
      <div class="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <!-- Back Button -->
        <div>
          <button type="button" onclick="window.goBack()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <span class="text-base font-black">←</span> <span>Back</span>
          </button>
        </div>

        <!-- Top Mode Switcher -->
        <div class="cr-card p-4">
          <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
            Select Gate Operation Mode
          </div>
          <div class="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button type="button" id="mode-entry-btn" class="py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${isEntry ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}">
              <span>🟢</span>
              <span>Campus Entry</span>
            </button>
            <button type="button" id="mode-exit-btn" class="py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${!isEntry ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}">
              <span>🔴</span>
              <span>Campus Exit</span>
            </button>
          </div>
        </div>

        <!-- Scanner Card -->
        <div class="cr-card p-6 sm:p-8 text-center space-y-5">
          <div id="scanner-icon" class="w-16 h-16 mx-auto rounded-3xl ${isEntry ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} flex items-center justify-center text-3xl">
            ${isEntry ? '📥' : '📤'}
          </div>

          <div>
            <h2 id="scanner-title" class="text-xl font-bold text-slate-900 dark:text-white">
              Scan ${isEntry ? 'Campus Entry Pass' : 'Campus Exit Pass'}
            </h2>
            <p id="scanner-subtitle" class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              ${isEntry 
                ? 'Point camera at the driver’s pass QR to log vehicle check-in and notify parents.'
                : 'Point camera at the pass QR to log vehicle check-out and clear pending safety alerts.'}
            </p>
          </div>

          <!-- Open Camera Scanner CTA -->
          <div class="pt-2">
            <button type="button" id="open-gate-camera-btn" class="cr-btn ${isEntry ? 'cr-btn-primary' : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'} py-3 px-6 rounded-xl shadow-lg cursor-pointer font-bold">
              📷 Open Camera Scanner
            </button>
          </div>

          <!-- Scanned Result Feedback Box -->
          <div id="scan-feedback-box" class="hidden p-4 rounded-2xl border text-left text-xs space-y-1"></div>
        </div>
      </div>
    `;
  }

  static attachEvents() {
    const entryBtn = document.getElementById('mode-entry-btn');
    const exitBtn = document.getElementById('mode-exit-btn');
    const icon = document.getElementById('scanner-icon');
    const title = document.getElementById('scanner-title');
    const subtitle = document.getElementById('scanner-subtitle');
    const camBtn = document.getElementById('open-gate-camera-btn');

    function updateModeUI(mode) {
      EntryExitScannerPage.currentMode = mode;
      const isEntry = mode === 'entry';
      if (entryBtn && exitBtn) {
        entryBtn.className = `py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${isEntry ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`;
        exitBtn.className = `py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${!isEntry ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`;
      }
      if (icon) {
        icon.className = `w-16 h-16 mx-auto rounded-3xl ${isEntry ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} flex items-center justify-center text-3xl`;
        icon.textContent = isEntry ? '📥' : '📤';
      }
      if (title) title.textContent = `Scan ${isEntry ? 'Campus Entry Pass' : 'Campus Exit Pass'}`;
      if (subtitle) {
        subtitle.textContent = isEntry 
          ? 'Point camera at the driver’s pass QR to log vehicle check-in and notify parents.'
          : 'Point camera at the pass QR to log vehicle check-out and clear pending safety alerts.';
      }
      if (camBtn) {
        camBtn.className = `cr-btn ${isEntry ? 'cr-btn-primary' : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'} py-3 px-6 rounded-xl shadow-lg cursor-pointer font-bold`;
      }
    }

    if (entryBtn && exitBtn) {
      entryBtn.onclick = () => updateModeUI('entry');
      exitBtn.onclick = () => updateModeUI('exit');
    }

    if (camBtn) {
      camBtn.onclick = () => {
        const mode = EntryExitScannerPage.currentMode;
        const scanner = new window.CameraScannerModal({
          title: mode === 'entry' ? 'Scan Entry Pass' : 'Scan Exit Pass',
          subtitle: `Scanning for CAMPUSRIDE Pass (${mode.toUpperCase()})`,
          onScan: (qrPayload) => {
            EntryExitScannerPage.processScan(qrPayload);
          }
        });
        scanner.open();
      };
    }
  }

  static async processScan(qrPayload) {
    const mode = EntryExitScannerPage.currentMode;
    const box = document.getElementById('scan-feedback-box');

    try {
      const res = await window.api.request('/api/scanner/scan', {
        method: 'POST',
        body: JSON.stringify({ qrPayload, scanType: mode })
      });

      const timeStr = new Date(res.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      window.showToast(`${mode.toUpperCase()} recorded for ${res.driver.label} (${res.driver.name})!`, 'success');

      if (window.sounds) {
        if (mode === 'entry') window.sounds.playEntry();
        else window.sounds.playExit();
      }

      if (box) {
        box.className = `p-4 rounded-2xl border text-left text-xs space-y-1 block ${mode === 'entry' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'}`;
        box.innerHTML = `
          <div class="font-bold text-sm flex items-center justify-between">
            <span>✓ ${mode === 'entry' ? 'Entry Logged' : 'Exit Logged'}</span>
            <span class="text-xs font-mono">${timeStr}</span>
          </div>
          <div><b>Vehicle:</b> ${res.driver.label} (${res.driver.van_no})</div>
          <div><b>Operator:</b> ${res.driver.name}</div>
          <div class="text-[11px] opacity-80 pt-1">
            ${mode === 'entry' ? 'Parents notified of campus arrival. Safety timer running.' : 'Alternation completed. Van marked outside campus.'}
          </div>
        `;
      }
    } catch (err) {
      window.showToast(err.message, 'error');
      if (box) {
        box.className = 'p-4 rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 text-left text-xs space-y-1 block';
        box.innerHTML = `
          <div class="font-bold text-sm text-rose-600">✕ Scan Rejected</div>
          <div>${err.message}</div>
        `;
      }
    }
  }
}

window.EntryExitScannerPage = EntryExitScannerPage;
