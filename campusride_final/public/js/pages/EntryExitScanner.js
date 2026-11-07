// CampusRide — Gate Entry/Exit Pass Scanner (§7.4, §8.4)
// Always-on embedded camera with continuous scanning and zero-glitch mode toggling
class EntryExitScannerPage {
  static currentMode = 'entry'; // 'entry' | 'exit'
  static mediaStream = null;
  static isLoopRunning = false;
  static isCameraPaused = false;
  static lastScannedPayload = null;
  static lastScanTimestamp = 0;
  static animFrameId = null;
  static canvasElement = null;
  static canvasCtx = null;
  static barcodeDetector = null;

  static render() {
    const isEntry = EntryExitScannerPage.currentMode === 'entry';

    return `
      <div class="max-w-xl mx-auto px-4 py-5 space-y-4">
        
        <!-- Header & Back Navigation -->
        <div class="flex items-center justify-between">
          <button type="button" onclick="EntryExitScannerPage.cleanup(); window.goBack();" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <span class="text-base font-black">←</span> <span>Back</span>
          </button>
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Gate Pass Station</span>
        </div>

        <!-- Mode Switcher: Entry <-> Exit (Seamless switch without closing camera) -->
        <div class="cr-card p-2 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <div class="grid grid-cols-2 gap-2">
            <button type="button" id="scanner-mode-entry-btn" class="py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer select-none ${isEntry ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/50' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}">
              <span>🟢</span>
              <span>Campus Entry</span>
            </button>
            <button type="button" id="scanner-mode-exit-btn" class="py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer select-none ${!isEntry ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-400/50' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}">
              <span>🔴</span>
              <span>Campus Exit</span>
            </button>
          </div>
        </div>

        <!-- Always-On Camera Card -->
        <div class="cr-card p-4 sm:p-5 space-y-3.5 text-center">
          <div class="flex items-center justify-between text-xs px-1">
            <span id="scanner-current-badge" class="font-bold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isEntry ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'}">
              <span>${isEntry ? '📥 Mode: Campus Entry' : '📤 Mode: Campus Exit'}</span>
            </span>
            <span id="camera-status-indicator" class="text-slate-500 font-semibold flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Camera Always On</span>
            </span>
          </div>

          <!-- Video Viewport -->
          <div class="scanner-viewport relative w-full rounded-2xl overflow-hidden bg-black aspect-square max-h-[380px] mx-auto shadow-inner flex items-center justify-center">
            <video id="gate-scanner-video" class="w-full h-full object-cover" autoplay playsinline muted></video>
            
            <!-- Aiming Target Crosshair & Scanning Laser -->
            <div class="scanner-crosshair"></div>
            <div class="scanner-laser"></div>

            <!-- Paused Screen Overlay (Hidden by default) -->
            <div id="scanner-paused-overlay" class="hidden absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-3 p-4">
              <span class="text-4xl">⏸️</span>
              <div class="font-bold text-sm">Camera Stream Paused</div>
              <button type="button" id="resume-camera-overlay-btn" class="cr-btn cr-btn-primary text-xs py-2 px-4 rounded-xl font-bold">
                ▶️ Resume Camera
              </button>
            </div>
          </div>

          <!-- Controls: Manual Pause / Stop Camera -->
          <div class="flex items-center justify-between pt-1">
            <p class="text-[11px] text-slate-500 dark:text-slate-400 text-left">
              Camera stays active continuously across multiple passes.
            </p>
            <button type="button" id="toggle-camera-pause-btn" class="cr-btn cr-btn-secondary text-xs py-1.5 px-3 rounded-xl font-semibold cursor-pointer select-none">
              ⏹️ Pause Camera
            </button>
          </div>

          <!-- Scanned Feedback Banner -->
          <div id="gate-scan-feedback" class="hidden p-4 rounded-2xl border text-left text-xs space-y-1 transition duration-200"></div>

        </div>

      </div>
    `;
  }

  static async attachEvents() {
    const entryBtn = document.getElementById('scanner-mode-entry-btn');
    const exitBtn = document.getElementById('scanner-mode-exit-btn');
    const pauseBtn = document.getElementById('toggle-camera-pause-btn');
    const resumeOverlayBtn = document.getElementById('resume-camera-overlay-btn');

    // Smooth mode switching (Never closes or restarts the camera stream)
    if (entryBtn && exitBtn) {
      entryBtn.onclick = () => EntryExitScannerPage.switchMode('entry');
      exitBtn.onclick = () => EntryExitScannerPage.switchMode('exit');
    }

    // Manual pause/resume controls
    if (pauseBtn) {
      pauseBtn.onclick = () => EntryExitScannerPage.toggleCameraPause();
    }
    if (resumeOverlayBtn) {
      resumeOverlayBtn.onclick = () => EntryExitScannerPage.toggleCameraPause();
    }

    // Auto-start camera immediately when page opens
    await EntryExitScannerPage.startContinuousCamera();

    // Listen to hash change to clean up camera on navigate
    const handleHashChange = () => {
      EntryExitScannerPage.cleanup();
      window.removeEventListener('hashchange', handleHashChange);
    };
    window.addEventListener('hashchange', handleHashChange);
  }

  static switchMode(mode) {
    if (EntryExitScannerPage.currentMode === mode) return;
    EntryExitScannerPage.currentMode = mode;
    const isEntry = mode === 'entry';

    const entryBtn = document.getElementById('scanner-mode-entry-btn');
    const exitBtn = document.getElementById('scanner-mode-exit-btn');
    const currentBadge = document.getElementById('scanner-current-badge');

    if (entryBtn && exitBtn) {
      entryBtn.className = `py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer select-none ${isEntry ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/50' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`;
      exitBtn.className = `py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer select-none ${!isEntry ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-400/50' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`;
    }

    if (currentBadge) {
      currentBadge.className = `font-bold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isEntry ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'}`;
      currentBadge.innerHTML = `<span>${isEntry ? '📥 Mode: Campus Entry' : '📤 Mode: Campus Exit'}</span>`;
    }

    window.showToast(`Switched to ${isEntry ? 'Campus Entry' : 'Campus Exit'} mode. Camera active.`, 'info');
  }

  static async startContinuousCamera() {
    const video = document.getElementById('gate-scanner-video');
    if (!video) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      window.showToast('Camera not supported by this browser.', 'error');
      return;
    }

    try {
      if (!EntryExitScannerPage.mediaStream) {
        EntryExitScannerPage.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
        });
      }
      video.srcObject = EntryExitScannerPage.mediaStream;
      await video.play();

      // Initialize detection loop
      EntryExitScannerPage.isLoopRunning = true;
      EntryExitScannerPage.isCameraPaused = false;

      // Off-screen canvas for frame capture
      if (!EntryExitScannerPage.canvasElement) {
        EntryExitScannerPage.canvasElement = document.createElement('canvas');
        EntryExitScannerPage.canvasCtx = EntryExitScannerPage.canvasElement.getContext('2d', { willReadFrequently: true });
      }

      if ('BarcodeDetector' in window) {
        try {
          EntryExitScannerPage.barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
        } catch {}
      }

      EntryExitScannerPage.runScanLoop();
    } catch (err) {
      console.warn('Camera start error:', err.message);
      window.showToast('Camera access denied or unavailable: ' + err.message, 'error');
    }
  }

  static runScanLoop() {
    if (!EntryExitScannerPage.isLoopRunning) return;

    const video = document.getElementById('gate-scanner-video');
    if (!video || video.readyState < 2 || EntryExitScannerPage.isCameraPaused) {
      EntryExitScannerPage.animFrameId = requestAnimationFrame(() => EntryExitScannerPage.runScanLoop());
      return;
    }

    const canvas = EntryExitScannerPage.canvasElement;
    const ctx = EntryExitScannerPage.canvasCtx;

    if (canvas && ctx && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (EntryExitScannerPage.barcodeDetector) {
        EntryExitScannerPage.barcodeDetector.detect(video).then(barcodes => {
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            EntryExitScannerPage.handleScannedCode(barcodes[0].rawValue);
          }
        }).catch(() => {});
      } else if (window.jsQR) {
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = window.jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
          if (code && code.data) {
            EntryExitScannerPage.handleScannedCode(code.data);
          }
        } catch {}
      }
    }

    EntryExitScannerPage.animFrameId = requestAnimationFrame(() => EntryExitScannerPage.runScanLoop());
  }

  static handleScannedCode(payload) {
    const now = Date.now();
    // 2.5 second debounce to prevent rapid duplicate scanning of the same physical QR pass
    if (payload === EntryExitScannerPage.lastScannedPayload && (now - EntryExitScannerPage.lastScanTimestamp) < 2500) {
      return;
    }

    EntryExitScannerPage.lastScannedPayload = payload;
    EntryExitScannerPage.lastScanTimestamp = now;

    // Process scan asynchronously; CAMERA CONTINUES RUNNING!
    EntryExitScannerPage.processScan(payload);
  }

  static async processScan(qrPayload) {
    const mode = EntryExitScannerPage.currentMode;
    const feedbackBox = document.getElementById('gate-scan-feedback');

    try {
      const res = await window.api.request('/api/scanner/scan', {
        method: 'POST',
        body: JSON.stringify({ qrPayload, scanType: mode })
      });

      const timeStr = new Date(res.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Play audio feedback chime
      if (window.sounds) {
        if (mode === 'entry') window.sounds.playEntry();
        else window.sounds.playExit();
      }

      window.showToast(`✅ ${mode.toUpperCase()} recorded: ${res.driver.label} (${res.driver.name})`, 'success');

      if (feedbackBox) {
        feedbackBox.className = `p-4 rounded-2xl border text-left text-xs space-y-1 block ${mode === 'entry' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 shadow-md shadow-emerald-500/10' : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100 shadow-md shadow-rose-500/10'}`;
        feedbackBox.innerHTML = `
          <div class="font-bold text-sm flex items-center justify-between">
            <span class="flex items-center gap-1.5">
              <span>${mode === 'entry' ? '🟢' : '🔴'}</span>
              <span>${mode === 'entry' ? 'Campus Entry Verified' : 'Campus Exit Verified'}</span>
            </span>
            <span class="text-xs font-mono font-bold">${timeStr}</span>
          </div>
          <div class="font-bold text-base text-slate-900 dark:text-white pt-1">${res.driver.label} — ${res.driver.van_no}</div>
          <div class="text-xs">Operator: <b>${res.driver.name}</b></div>
          <div class="text-[11px] opacity-80 pt-0.5">
            ${mode === 'entry' ? 'Van marked inside campus. Parents notified.' : 'Van marked outside campus. Alternation rule enforced.'}
          </div>
        `;
      }
    } catch (err) {
      window.showToast(err.message, 'error');
      if (feedbackBox) {
        feedbackBox.className = 'p-4 rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 text-left text-xs space-y-1 block shadow-sm';
        feedbackBox.innerHTML = `
          <div class="font-bold text-sm text-rose-600 flex items-center gap-1">
            <span>✕</span> <span>Scan Rejected</span>
          </div>
          <div>${err.message}</div>
        `;
      }
    }
  }

  static toggleCameraPause() {
    EntryExitScannerPage.isCameraPaused = !EntryExitScannerPage.isCameraPaused;
    const overlay = document.getElementById('scanner-paused-overlay');
    const pauseBtn = document.getElementById('toggle-camera-pause-btn');

    if (EntryExitScannerPage.isCameraPaused) {
      if (overlay) overlay.classList.remove('hidden');
      if (pauseBtn) {
        pauseBtn.textContent = '▶️ Turn On Camera';
        pauseBtn.className = 'cr-btn cr-btn-primary text-xs py-1.5 px-3 rounded-xl font-semibold cursor-pointer';
      }
    } else {
      if (overlay) overlay.classList.add('hidden');
      if (pauseBtn) {
        pauseBtn.textContent = '⏹️ Pause Camera';
        pauseBtn.className = 'cr-btn cr-btn-secondary text-xs py-1.5 px-3 rounded-xl font-semibold cursor-pointer';
      }
    }
  }

  static cleanup() {
    EntryExitScannerPage.isLoopRunning = false;
    if (EntryExitScannerPage.animFrameId) {
      cancelAnimationFrame(EntryExitScannerPage.animFrameId);
      EntryExitScannerPage.animFrameId = null;
    }
    if (EntryExitScannerPage.mediaStream) {
      EntryExitScannerPage.mediaStream.getTracks().forEach(t => t.stop());
      EntryExitScannerPage.mediaStream = null;
    }
  }
}

window.EntryExitScannerPage = EntryExitScannerPage;
