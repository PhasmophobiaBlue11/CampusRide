// CampusRide — Driver Info & Campus Arrival Status Scanner (§Info QR)
// Decodes Driver Info QRs and immediately tells teachers & staff if a child's van has arrived, left, or not yet entered today.
class InfoScannerPage {
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
    return `
      <div class="max-w-xl mx-auto px-4 py-5 space-y-4 animate-fade-in-up">
        
        <!-- Header & Back Navigation -->
        <div class="flex items-center justify-between">
          <button type="button" onclick="InfoScannerPage.cleanup(); window.goBack();" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <span class="text-base font-black">←</span> <span>Back</span>
          </button>
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Driver Info Station</span>
        </div>

        <!-- Banner Info Card -->
        <div class="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-300/30 text-slate-900 dark:text-white space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xl">ℹ️</span>
            <h1 class="text-base font-black">Driver Info & Campus Arrival Status</h1>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-300">
            Scan any Driver's <b>Info QR</b> to check whether a student's van has arrived on campus, departed, or not yet entered today.
          </p>
        </div>

        <!-- Camera Scanner Card -->
        <div class="cr-card p-4 sm:p-5 space-y-3.5 text-center">
          <div class="flex items-center justify-between text-xs px-1">
            <span class="font-bold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
              <span>📷 Point Camera at Info QR</span>
            </span>
            <span id="info-camera-status-indicator" class="text-slate-500 font-semibold flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Camera Active</span>
            </span>
          </div>

          <!-- Video Viewport -->
          <div class="scanner-viewport relative w-full rounded-2xl overflow-hidden bg-black aspect-square max-h-[340px] mx-auto shadow-inner flex items-center justify-center">
            <video id="info-scanner-video" class="w-full h-full object-cover" autoplay playsinline muted></video>
            
            <!-- Aiming Target Crosshair & Scanning Laser -->
            <div class="scanner-crosshair"></div>
            <div class="scanner-laser"></div>

            <!-- Paused Screen Overlay -->
            <div id="info-scanner-paused-overlay" class="hidden absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-3 p-4">
              <span class="text-4xl">⏸️</span>
              <div class="font-bold text-sm">Camera Stream Paused</div>
              <button type="button" id="resume-info-camera-overlay-btn" class="cr-btn cr-btn-primary text-xs py-2 px-4 rounded-xl font-bold cursor-pointer">
                ▶️ Resume Camera
              </button>
            </div>
          </div>

          <!-- Controls: Pause Camera -->
          <div class="flex items-center justify-between pt-1">
            <p class="text-[11px] text-slate-500 dark:text-slate-400 text-left">
              Camera automatically detects Driver Info QR codes.
            </p>
            <button type="button" id="toggle-info-camera-pause-btn" class="cr-btn cr-btn-secondary text-xs py-1.5 px-3 rounded-xl font-semibold cursor-pointer select-none">
              ⏹️ Pause Camera
            </button>
          </div>

          <!-- Scanned Result Card -->
          <div id="info-scan-result-card" class="hidden animate-fade-in-up text-left space-y-3 pt-2"></div>
        </div>

        <!-- Manual Lookup Option -->
        <div class="cr-card p-4 space-y-2">
          <div class="text-xs font-bold text-slate-700 dark:text-slate-300">🔍 Manual Driver / Van Plate Search</div>
          <form id="info-manual-search-form" class="flex gap-2">
            <input type="text" id="info-manual-input" required class="cr-input flex-1 text-xs" placeholder="Enter Vehicle No or Driver Name (e.g. MH12 or Ramu)" />
            <button type="submit" class="cr-btn cr-btn-primary text-xs px-4 py-2 font-bold cursor-pointer shrink-0">
              Check Status
            </button>
          </form>
        </div>

      </div>
    `;
  }

  static async attachEvents() {
    const pauseBtn = document.getElementById('toggle-info-camera-pause-btn');
    const resumeOverlayBtn = document.getElementById('resume-info-camera-overlay-btn');
    const searchForm = document.getElementById('info-manual-search-form');

    if (pauseBtn) {
      pauseBtn.onclick = () => InfoScannerPage.toggleCameraPause();
    }
    if (resumeOverlayBtn) {
      resumeOverlayBtn.onclick = () => InfoScannerPage.toggleCameraPause();
    }

    if (searchForm) {
      searchForm.onsubmit = async (e) => {
        e.preventDefault();
        const query = document.getElementById('info-manual-input').value.trim();
        if (!query) return;
        await InfoScannerPage.lookupDriverStatus({ van_no: query, name: query, id: query });
      };
    }

    // Auto-start camera
    await InfoScannerPage.startContinuousCamera();

    // Clean up on hashchange
    const handleHashChange = () => {
      InfoScannerPage.cleanup();
      window.removeEventListener('hashchange', handleHashChange);
    };
    window.addEventListener('hashchange', handleHashChange);
  }

  static async startContinuousCamera() {
    const video = document.getElementById('info-scanner-video');
    if (!video) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      window.showToast('Camera not supported by this browser.', 'error');
      return;
    }

    try {
      if (!InfoScannerPage.mediaStream) {
        InfoScannerPage.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
        });
      }
      video.srcObject = InfoScannerPage.mediaStream;
      await video.play();

      InfoScannerPage.isLoopRunning = true;
      InfoScannerPage.isCameraPaused = false;

      if (!InfoScannerPage.canvasElement) {
        InfoScannerPage.canvasElement = document.createElement('canvas');
        InfoScannerPage.canvasCtx = InfoScannerPage.canvasElement.getContext('2d', { willReadFrequently: true });
      }

      if ('BarcodeDetector' in window) {
        try {
          InfoScannerPage.barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
        } catch {}
      }

      InfoScannerPage.runScanLoop();
    } catch (err) {
      console.warn('Camera start error:', err.message);
      window.showToast('Camera access denied or unavailable: ' + err.message, 'error');
    }
  }

  static runScanLoop() {
    if (!InfoScannerPage.isLoopRunning) return;

    const video = document.getElementById('info-scanner-video');
    if (!video || video.readyState < 2 || InfoScannerPage.isCameraPaused) {
      InfoScannerPage.animFrameId = requestAnimationFrame(() => InfoScannerPage.runScanLoop());
      return;
    }

    const canvas = InfoScannerPage.canvasElement;
    const ctx = InfoScannerPage.canvasCtx;

    if (canvas && ctx && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (InfoScannerPage.barcodeDetector) {
        InfoScannerPage.barcodeDetector.detect(video).then(barcodes => {
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            InfoScannerPage.handleScannedCode(barcodes[0].rawValue);
          }
        }).catch(() => {});
      } else if (window.jsQR) {
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = window.jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
          if (code && code.data) {
            InfoScannerPage.handleScannedCode(code.data);
          }
        } catch {}
      }
    }

    InfoScannerPage.animFrameId = requestAnimationFrame(() => InfoScannerPage.runScanLoop());
  }

  static handleScannedCode(payload) {
    const now = Date.now();
    if (payload === InfoScannerPage.lastScannedPayload && (now - InfoScannerPage.lastScanTimestamp) < 2500) {
      return;
    }

    InfoScannerPage.lastScannedPayload = payload;
    InfoScannerPage.lastScanTimestamp = now;

    InfoScannerPage.processScannedPayload(payload);
  }

  static async processScannedPayload(rawPayload) {
    let parsedInfo = null;

    // 1. Try parsing JSON format
    try {
      parsedInfo = JSON.parse(rawPayload);
    } catch {}

    // 2. If pass QR format CAMPUSRIDE:DRIVER:<id>
    if (!parsedInfo && rawPayload.startsWith('CAMPUSRIDE:DRIVER:')) {
      const driverId = rawPayload.replace('CAMPUSRIDE:DRIVER:', '').trim();
      parsedInfo = { id: driverId };
    }

    // 3. If line-separated key:value format
    if (!parsedInfo && rawPayload.includes('\n')) {
      parsedInfo = {};
      rawPayload.split('\n').forEach(line => {
        const [k, ...v] = line.split(':');
        if (k && v.length) {
          const key = k.trim().toLowerCase().replace(/\s+/g, '_');
          parsedInfo[key] = v.join(':').trim();
        }
      });
    }

    if (!parsedInfo) {
      parsedInfo = { name: rawPayload.trim(), van_no: rawPayload.trim() };
    }

    await InfoScannerPage.lookupDriverStatus(parsedInfo);
  }

  static async lookupDriverStatus(params) {
    const resultBox = document.getElementById('info-scan-result-card');
    if (resultBox) {
      resultBox.classList.remove('hidden');
      resultBox.innerHTML = `
        <div class="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-500 animate-pulse">
          🔍 Searching driver records and campus logs...
        </div>
      `;
    }

    try {
      const queryParams = new URLSearchParams();
      if (params.id) queryParams.set('id', params.id);
      if (params.van_no || params.vehicle_no || params.plate) queryParams.set('van_no', params.van_no || params.vehicle_no || params.plate);
      if (params.name || params.driver_name) queryParams.set('name', params.name || params.driver_name);

      const res = await window.api.request(`/api/drivers/status-check?${queryParams.toString()}`);
      const driver = res.driver;
      const transit = res.transit;

      if (window.sounds) window.sounds.playSuccess();

      // Format timestamp
      let timeFormatted = 'Today';
      if (transit.lastTimestamp) {
        timeFormatted = new Date(transit.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      let statusBadgeHtml = '';
      if (transit.status === 'entered') {
        statusBadgeHtml = `
          <div class="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border-2 border-emerald-400 text-emerald-900 dark:text-emerald-100 shadow-sm space-y-1">
            <div class="flex items-center gap-2 font-black text-sm text-emerald-700 dark:text-emerald-300">
              <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>🟢 ARRIVED / ON CAMPUS</span>
            </div>
            <p class="text-xs font-semibold leading-relaxed">
              Van entered campus at <b>${timeFormatted}</b> via gate. Currently inside campus and has NOT left yet.
            </p>
          </div>
        `;
      } else if (transit.status === 'exited') {
        statusBadgeHtml = `
          <div class="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-400 text-rose-900 dark:text-rose-100 shadow-sm space-y-1">
            <div class="flex items-center gap-2 font-black text-sm text-rose-700 dark:text-rose-300">
              <span class="w-3 h-3 rounded-full bg-rose-500"></span>
              <span>🔴 LEFT CAMPUS / DEPARTED</span>
            </div>
            <p class="text-xs font-semibold leading-relaxed">
              Van exited and departed campus at <b>${timeFormatted}</b>.
            </p>
          </div>
        `;
      } else {
        statusBadgeHtml = `
          <div class="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border-2 border-amber-400 text-amber-900 dark:text-amber-100 shadow-sm space-y-1">
            <div class="flex items-center gap-2 font-black text-sm text-amber-700 dark:text-amber-300">
              <span class="w-3 h-3 rounded-full bg-amber-500"></span>
              <span>🟡 NOT YET ENTERED TODAY</span>
            </div>
            <p class="text-xs font-semibold leading-relaxed">
              No gate entry recorded for today. The van has NOT arrived on campus yet.
            </p>
          </div>
        `;
      }

      if (resultBox) {
        resultBox.innerHTML = `
          <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg space-y-3">
            <!-- Driver Info Header -->
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  ${driver.label || 'Campus Van'}
                </span>
                <h3 class="font-black text-base text-slate-900 dark:text-white mt-1">${driver.name}</h3>
              </div>
              <div class="text-right">
                <div class="font-mono font-black text-sm text-slate-900 dark:text-white">${driver.van_no}</div>
                <div class="text-[11px] text-slate-400">${driver.vehicle_type === '2_wheeler' ? '🛵 2-Wheeler' : '🚌 4-Wheeler Van'}</div>
              </div>
            </div>

            <!-- Phone / Contact -->
            ${driver.phone ? `
              <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                <span class="text-slate-500">Driver Phone:</span>
                <a href="tel:${driver.phone}" class="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                  <span>📞</span> <span>${driver.phone}</span>
                </a>
              </div>
            ` : ''}

            <!-- Transit Status Card -->
            ${statusBadgeHtml}

            <!-- Reset / Scan Next -->
            <button type="button" id="info-scan-next-btn" class="cr-btn cr-btn-secondary w-full py-2 text-xs font-bold cursor-pointer">
              🔄 Scan Another Driver QR
            </button>
          </div>
        `;

        const nextBtn = document.getElementById('info-scan-next-btn');
        if (nextBtn) {
          nextBtn.onclick = () => {
            resultBox.classList.add('hidden');
            resultBox.innerHTML = '';
            InfoScannerPage.lastScannedPayload = null;
          };
        }
      }

      window.showToast(`Decoded: ${driver.name} (${transit.statusLabel})`, 'info');
    } catch (err) {
      if (window.sounds) window.sounds.playError();
      if (resultBox) {
        resultBox.innerHTML = `
          <div class="p-4 rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 text-xs space-y-2">
            <div class="font-bold text-sm flex items-center gap-1.5 text-rose-600">
              <span>✕</span> <span>Driver Not Found</span>
            </div>
            <p>${err.message || 'No matching driver record found in campus database.'}</p>
            <button type="button" onclick="document.getElementById('info-scan-result-card').classList.add('hidden');" class="cr-btn cr-btn-secondary text-xs py-1.5 px-3">
              Close
            </button>
          </div>
        `;
      }
      window.showToast(err.message, 'error');
    }
  }

  static toggleCameraPause() {
    InfoScannerPage.isCameraPaused = !InfoScannerPage.isCameraPaused;
    const overlay = document.getElementById('info-scanner-paused-overlay');
    const pauseBtn = document.getElementById('toggle-info-camera-pause-btn');

    if (InfoScannerPage.isCameraPaused) {
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
    InfoScannerPage.isLoopRunning = false;
    if (InfoScannerPage.animFrameId) {
      cancelAnimationFrame(InfoScannerPage.animFrameId);
      InfoScannerPage.animFrameId = null;
    }
    if (InfoScannerPage.mediaStream) {
      InfoScannerPage.mediaStream.getTracks().forEach(track => track.stop());
      InfoScannerPage.mediaStream = null;
    }
  }
}

window.InfoScannerPage = InfoScannerPage;
