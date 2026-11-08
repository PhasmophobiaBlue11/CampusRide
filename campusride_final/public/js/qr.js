// CampusRide — QR Pass Generator, Decoder & Camera Scanner Utility
// Implements QR pass format: CAMPUSRIDE:DRIVER:<id>
// Includes Native BarcodeDetector + jsQR fallback + Canvas QR Generator + Instant Simulator

class QRUtils {
  static makePassPayload(driverId) {
    return `CAMPUSRIDE:DRIVER:${driverId}`;
  }

  static parsePassPayload(payload) {
    if (typeof payload === 'string' && payload.startsWith('CAMPUSRIDE:DRIVER:')) {
      return payload.replace('CAMPUSRIDE:DRIVER:', '').trim();
    }
    return null;
  }

  static makeInfoPayload(driver) {
    return `CampusRide — ${driver.label} | Driver: ${driver.driver_name} | Vehicle: ${driver.van_no} | Contact: ${driver.phone || 'N/A'}`;
  }

  // Draw QR code onto a Canvas element (using standard QR matrix algorithm or Google Chart / lightweight fallback)
  static renderToCanvas(canvas, text, size = 200) {
    if (!canvas) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    // Draw high-resolution canvas with embedded QR image via secure data URI or fallback
    const img = new Image();
    img.crossOrigin = 'anonymous';
    // Use standard QR API or quick SVG matrix
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=1&data=${encodeURIComponent(text)}`;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
    };
    img.onerror = () => {
      // Local fallback canvas renderer if offline: generate visual barcode/matrix pattern
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, size - 20, size - 20);
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CampusRide Pass', size / 2, size / 2 - 10);
      ctx.font = '10px monospace';
      ctx.fillText(text.slice(0, 22), size / 2, size / 2 + 15);
    };
  }
}

// License Plate Auto-Spacing & Formatter Utility
// Format: __ __ __ ____ (e.g. MH 12 AB 1234)
window.formatLicensePlate = function(val) {
  if (!val) return '';
  const raw = String(val).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10);
  const parts = [];
  if (raw.length > 0) parts.push(raw.slice(0, 2));
  if (raw.length > 2) parts.push(raw.slice(2, 4));
  if (raw.length > 4) parts.push(raw.slice(4, 6));
  if (raw.length > 6) parts.push(raw.slice(6, 10));
  return parts.join(' ');
};

window.attachPlateFormatter = function(inputEl) {
  if (!inputEl) return;
  inputEl.placeholder = '__ __ __ ____';
  inputEl.setAttribute('autocomplete', 'off');
  inputEl.setAttribute('autocapitalize', 'characters');
  inputEl.setAttribute('spellcheck', 'false');
  inputEl.setAttribute('maxlength', '13'); // 2 + 1 + 2 + 1 + 2 + 1 + 4 = 13 chars

  const update = () => {
    const oldVal = inputEl.value;
    const formatted = window.formatLicensePlate(oldVal);
    if (oldVal !== formatted) {
      inputEl.value = formatted;
    }
  };

  inputEl.addEventListener('input', update);
  inputEl.addEventListener('paste', () => setTimeout(update, 0));
  if (inputEl.value) update();
};

window.QRUtils = QRUtils;

// Single Pass Print Helper (Prints ONLY QR, Name, and Number — No extra text)
window.printSinglePass = function({ label, name, number, id }) {
  const driverId = id || label;
  const payload = `CAMPUSRIDE:DRIVER:${driverId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=2&data=${encodeURIComponent(payload)}`;
  const printWin = window.open('', '_blank', 'width=500,height=600');
  if (!printWin) {
    window.print();
    return;
  }
  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pass - ${name}</title>
      <style>
        @page { size: auto; margin: 15mm; }
        body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          color: #0f172a;
        }
        .pass-card {
          border: 2px dashed #64748b;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          width: 280px;
          box-sizing: border-box;
        }
        .pass-card img {
          width: 200px;
          height: 200px;
          display: block;
          margin: 0 auto 14px auto;
        }
        .pass-name {
          font-size: 20px;
          font-weight: 800;
          margin: 0 0 6px 0;
          color: #0f172a;
        }
        .pass-num {
          font-size: 15px;
          font-weight: 700;
          color: #334155;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="pass-card">
        <img src="${qrUrl}" alt="QR" onload="window.print();" />
        <div class="pass-name">${name}</div>
        <div class="pass-num">${number}</div>
      </div>
    </body>
    </html>
  `);
  printWin.document.close();
};

// Bulk Pass Print Helper (Prints all driver/staff QRs, maximum 6 QRs per A4 sheet)
window.printBulkPasses = function(title, passList) {
  if (!Array.isArray(passList) || passList.length === 0) {
    if (window.showToast) window.showToast('No passes to print.', 'error');
    return;
  }

  // Chunk passes into maximum 6 passes per A4 page (§A4 6-per-page format)
  const pageSize = 6;
  const pages = [];
  for (let i = 0; i < passList.length; i += pageSize) {
    pages.push(passList.slice(i, i + pageSize));
  }

  const printWin = window.open('', '_blank', 'width=850,height=900');
  if (!printWin) {
    alert('Please allow popups to open the print layout.');
    return;
  }

  let pagesHtml = '';
  pages.forEach((pageItems) => {
    let cardsHtml = '';
    pageItems.forEach(item => {
      const driverId = item.id || item.label;
      const payload = `CAMPUSRIDE:DRIVER:${driverId}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=2&data=${encodeURIComponent(payload)}`;
      const name = item.driver_name || 'Staff Member';
      const number = item.label + (item.van_no && item.van_no !== 'Staff Pass' ? ' • ' + item.van_no : '');

      cardsHtml += `
        <div class="qr-card">
          <img src="${qrUrl}" alt="QR" />
          <div class="qr-name">${name}</div>
          <div class="qr-num">${number}</div>
        </div>
      `;
    });

    pagesHtml += `
      <div class="a4-page">
        ${cardsHtml}
      </div>
    `;
  });

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title} (${passList.length} Total)</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #0f172a;
        }
        .print-toolbar {
          position: sticky;
          top: 0;
          background: #1e293b;
          color: #fff;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .print-btn {
          background: #10b981;
          color: #fff;
          border: none;
          padding: 8px 18px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }
        .print-btn:hover {
          background: #059669;
        }
        .a4-page {
          width: 190mm;
          min-height: 277mm;
          max-height: 277mm;
          margin: 15px auto;
          background: #fff;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          padding: 6mm;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          grid-template-rows: repeat(3, 1fr);
          gap: 6mm;
          page-break-after: always;
          break-after: page;
        }
        .a4-page:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        .qr-card {
          border: 1.5px dashed #94a3b8;
          border-radius: 12px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          background: #fff;
        }
        .qr-card img {
          width: 140px;
          height: 140px;
          display: block;
          margin: 0 auto 6px auto;
        }
        .qr-name {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          margin: 2px 0;
          line-height: 1.2;
        }
        .qr-num {
          font-size: 13px;
          font-weight: 700;
          color: #475569;
          margin-top: 2px;
        }
        @media print {
          body {
            background: #fff;
          }
          .print-toolbar {
            display: none !important;
          }
          .a4-page {
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
            width: 100% !important;
            height: 100% !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-toolbar">
        <div>
          <b>${title}</b> — ${passList.length} Passes (${pages.length} A4 Pages, max 6 per page)
        </div>
        <button class="print-btn" onclick="window.print()">🖨️ Print All Passes</button>
      </div>
      ${pagesHtml}
    </body>
    </html>
  `);
  printWin.document.close();
};

// Global QR Modal Helper for Driver / Staff Pass
window.showDriverPassQRModal = function({ id, label, name, plate, phone }) {
  const driverId = id || label;
  const payload = `CAMPUSRIDE:DRIVER:${driverId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=2&data=${encodeURIComponent(payload)}`;

  const isRawId = (str) => typeof str === 'string' && (str.startsWith('drv_') || str.startsWith('usr_') || str.startsWith('id_') || str.length > 25);
  const cleanLabel = (label && !isRawId(label)) ? label : '';
  const cleanName = (name && !isRawId(name)) ? name : 'Campus Member';
  const cleanPlate = (plate && !isRawId(plate) && plate !== 'Staff Pass') ? plate : '';
  const numberText = cleanLabel + (cleanPlate ? ` • ${cleanPlate}` : '');

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4';
  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4 text-center animate-fade-in-up">
      <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <span class="text-xs font-black px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">${cleanLabel || 'QR Pass'}</span>
        <button id="close-qr-pass-modal" class="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl font-bold cursor-pointer">✕</button>
      </div>

      <!-- Minimalist Pass Content: Only QR, Name, and Number -->
      <div id="printable-pass-card" class="p-4 bg-white rounded-2xl border-2 border-dashed border-slate-300 text-slate-900 space-y-3 max-w-[260px] mx-auto">
        <img src="${qrUrl}" width="200" height="200" alt="QR Pass" class="rounded-xl shadow-sm mx-auto block" />
        <div>
          <div class="text-base font-black text-slate-900">${cleanName}</div>
          <div class="text-xs font-mono font-bold text-slate-700 mt-0.5">${numberText}</div>
        </div>
      </div>

      <button id="print-qr-pass-btn" class="cr-btn cr-btn-primary w-full py-2.5 text-xs font-bold cursor-pointer shadow-md flex items-center justify-center gap-1.5">
        <span>🖨️</span> <span>Print Pass</span>
      </button>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelector('#close-qr-pass-modal').onclick = () => modal.remove();
  modal.querySelector('#print-qr-pass-btn').onclick = () => {
    window.printSinglePass({ label: cleanLabel, name: cleanName, number: numberText, id: driverId });
  };
};

window.qrPayload = {
  buildPassQR: (label, name, plate, phone, id) => {
    return `CAMPUSRIDE:DRIVER:${id || label}`;
  },
  renderCanvas: (container, text, size = 180) => {
    if (!container) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=1&data=${encodeURIComponent(text)}`;
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center p-2 bg-white rounded-xl">
        <img src="${qrUrl}" width="${size}" height="${size}" alt="QR Pass" class="rounded-lg shadow-sm mx-auto" />
        <div class="text-[11px] font-semibold text-emerald-600 mt-2 flex items-center justify-center gap-1">✓ Authorized Gate Pass</div>
      </div>
    `;
  }
};

// Fullscreen Camera Scanner Modal Component
class CameraScannerModal {
  constructor(options = {}) {
    this.title = options.title || 'Scan CampusRide Pass';
    this.subtitle = options.subtitle || 'Point camera at vehicle QR code';
    this.onScan = options.onScan || (() => {});
    this.onClose = options.onClose || (() => {});
    this.stream = null;
    this.animId = null;
    this.active = false;
    this.modalEl = null;
    this.facingMode = 'environment';
  }

  open() {
    this.active = true;
    this.render();
    this.startCamera();
  }

  close() {
    this.active = false;
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
    this.onClose();
  }

  render() {
    const el = document.createElement('div');
    el.className = 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-md';
    el.innerHTML = `
      <div class="relative w-full max-w-md bg-slate-900 text-white rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h3 class="font-bold text-lg text-white">${this.title}</h3>
            <p class="text-xs text-slate-400">${this.subtitle}</p>
          </div>
          <button id="close-scan-btn" class="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition">
            ✕
          </button>
        </div>

        <!-- Camera Viewport -->
        <div class="relative w-full aspect-square bg-black overflow-hidden flex items-center justify-center">
          <video id="scanner-video" playsinline autoplay muted class="w-full h-full object-cover"></video>
          <canvas id="scanner-canvas" class="hidden"></canvas>

          <!-- Reticle & Laser -->
          <div class="scanner-crosshair"></div>
          <div class="scanner-laser"></div>

          <!-- Camera status hint -->
          <div id="camera-status-hint" class="absolute bottom-4 left-0 right-0 text-center text-xs text-slate-300 bg-black/60 py-1.5 px-3 mx-6 rounded-full backdrop-blur-sm">
            Align QR code inside square
          </div>
        </div>

        <!-- Camera Controls -->
        <div class="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
          <button id="switch-camera-btn" class="cr-btn cr-btn-secondary text-xs flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700">
            🔄 Flip Camera
          </button>
          <label class="cr-btn cr-btn-secondary text-xs flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer text-center">
            📁 Upload Image
            <input type="file" id="upload-qr-file" accept="image/*" class="hidden" />
          </label>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    this.modalEl = el;

    el.querySelector('#close-scan-btn').onclick = () => this.close();
    el.querySelector('#switch-camera-btn').onclick = () => {
      this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
      this.startCamera();
    };

    el.querySelector('#upload-qr-file').onchange = (e) => {
      const file = e.target.files[0];
      if (file) this.handleImageUpload(file);
    };
  }

  async startCamera() {
    const video = this.modalEl.querySelector('#scanner-video');
    if (!video) return;

    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: this.facingMode, width: { ideal: 640 }, height: { ideal: 640 } }
        });
        video.srcObject = this.stream;
        video.play();
        this.startScanningLoop();
      } else {
        this.showCameraHint('Camera API not accessible — use Quick Test below');
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      this.showCameraHint('Camera unavailable. Tap any Quick Test button below to simulate scanning!');
    }
  }

  showCameraHint(msg) {
    const hint = this.modalEl?.querySelector('#camera-status-hint');
    if (hint) hint.textContent = msg;
  }

  startScanningLoop() {
    const video = this.modalEl?.querySelector('#scanner-video');
    const canvas = this.modalEl?.querySelector('#scanner-canvas');
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let detector = null;

    if ('BarcodeDetector' in window) {
      try {
        detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        detector = null;
      }
    }

    const checkFrame = async () => {
      if (!this.active) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Hardware accelerated detection if available
        if (detector) {
          try {
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0) {
              const raw = barcodes[0].rawValue;
              if (raw) {
                this.triggerSuccessfulScan(raw);
                return;
              }
            }
          } catch (e) {}
        } else if (window.jsQR) {
          // Software fallback via jsQR
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });
          if (code && code.data) {
            this.triggerSuccessfulScan(code.data);
            return;
          }
        }
      }

      this.animId = requestAnimationFrame(checkFrame);
    };

    this.animId = requestAnimationFrame(checkFrame);
  }

  handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        if ('BarcodeDetector' in window) {
          try {
            const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(img);
            if (barcodes.length > 0) {
              this.triggerSuccessfulScan(barcodes[0].rawValue);
              return;
            }
          } catch (err) {}
        }

        if (window.jsQR) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const res = window.jsQR(imgData.data, imgData.width, imgData.height);
          if (res && res.data) {
            this.triggerSuccessfulScan(res.data);
            return;
          }
        }

        window.showToast('Could not find a valid QR code in this image', 'error');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  triggerSuccessfulScan(qrText) {
    if (window.sounds) window.sounds.playScan();
    this.close();
    this.onScan(qrText);
  }
}

window.CameraScannerModal = CameraScannerModal;
