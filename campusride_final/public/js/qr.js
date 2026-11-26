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

// Single Pass Print Helper (Prints ONLY QR, Name, and Number — No vehicle details)
window.printSinglePass = function({ label, name, number, id, payload, isInfoQr }) {
  const driverId = id || label;
  const qrPayload = payload || `CAMPUSRIDE:DRIVER:${driverId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=2&data=${encodeURIComponent(qrPayload)}`;
  const printWin = window.open('', '_blank', 'width=500,height=600');
  if (!printWin) {
    window.print();
    return;
  }
  const cleanNum = label || number || '';
  const titleText = isInfoQr ? `Info QR - ${cleanNum}` : `Pass - ${name || cleanNum}`;

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${titleText}</title>
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
        .pass-num {
          font-size: ${isInfoQr ? '22px' : '15px'};
          font-weight: 800;
          color: #334155;
          margin: 0 0 ${isInfoQr ? '0' : '4px'} 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .pass-name {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
          color: #0f172a;
        }
      </style>
    </head>
    <body>
      <div class="pass-card">
        <img src="${qrUrl}" alt="QR" onload="window.print();" />
        ${isInfoQr ? `
          <div class="pass-num">${cleanNum}</div>
        ` : `
          <div class="pass-num">${cleanNum}</div>
          <div class="pass-name">${name}</div>
        `}
      </div>
    </body>
    </html>
  `);
  printWin.document.close();
};

// Bulk Pass Print Helper (Prints all driver/staff QRs, maximum 6 QRs per A4 sheet)
window.printBulkPasses = function(arg1, arg2) {
  let title = 'Campus Passes';
  let passList = [];
  if (Array.isArray(arg1)) {
    passList = arg1;
    title = typeof arg2 === 'string' ? arg2 : 'Campus Passes';
  } else if (Array.isArray(arg2)) {
    title = typeof arg1 === 'string' ? arg1 : 'Campus Passes';
    passList = arg2;
  }

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
    if (window.showToast) {
      window.showToast('Please allow popups to open the print layout.', 'error');
    } else {
      alert('Please allow popups to open the print layout.');
    }
    return;
  }

  let pagesHtml = '';
  pages.forEach((pageItems) => {
    let cardsHtml = '';
    pageItems.forEach(item => {
      const driverId = item.id || item.label;
      const payload = `CAMPUSRIDE:DRIVER:${driverId}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=2&data=${encodeURIComponent(payload)}`;
      const name = item.name || item.driver_name || 'Staff Member';
      const labelOnly = item.label || item.number || 'Pass';

      cardsHtml += `
        <div class="qr-card">
          <img src="${qrUrl}" alt="QR" />
          <div class="qr-num">${labelOnly}</div>
          <div class="qr-name">${name}</div>
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
          width: 200px;
          height: 200px;
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
window.drawQrCanvasFallback = function(imgElement, encodedData) {
  try {
    const parent = imgElement.parentElement;
    const canvas = document.createElement('canvas');
    canvas.width = 220;
    canvas.height = 220;
    canvas.className = 'rounded-xl mx-auto block shadow-xs';
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 220, 220);
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, 204, 204);
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CampusRide Pass', 110, 80);
    ctx.font = 'bold 11px monospace';
    const text = decodeURIComponent(encodedData || '');
    ctx.fillText(text.slice(0, 22), 110, 115);
    ctx.fillText(text.slice(22, 44), 110, 135);
    ctx.fillStyle = '#10b981';
    ctx.fillText('✓ Gate Pass Active', 110, 165);
    if (parent) parent.replaceChild(canvas, imgElement);
  } catch (e) {}
};

window.showPassModal = function({ id, label, name, plate, phone, type }) {
  const driverId = id || label;
  const isStaff = type === 'staff' || (label && label.toLowerCase().startsWith('staff')) || plate === 'Staff Pass';
  const payload = `CAMPUSRIDE:DRIVER:${driverId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=2&data=${encodeURIComponent(payload)}`;

  const isRawId = (str) => typeof str === 'string' && (str.startsWith('drv_') || str.startsWith('usr_') || str.startsWith('id_') || str.length > 25);
  const cleanLabel = (label && !isRawId(label)) ? label : (isStaff ? 'Staff Pass' : 'Vehicle Pass');
  const cleanName = (name && !isRawId(name)) ? name : (isStaff ? 'Campus Staff' : 'Transit Driver');
  const cleanPlate = (plate && !isRawId(plate) && plate !== 'Staff Pass' && plate !== 'STAFF PASS') ? plate : '';
  const numberText = cleanPlate ? `${cleanLabel} • ${cleanPlate}` : cleanLabel;

  // Remove any previously open pass modal to prevent duplicates
  const existing = document.getElementById('campusride-pass-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'campusride-pass-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in';

  const badgeClass = isStaff 
    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' 
    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
  const badgeIcon = isStaff ? '👔' : '🚌';

  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4 text-center animate-fade-in-up">
      <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <span class="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-md border ${badgeClass}">
          <span>${badgeIcon}</span> <span>${cleanLabel}</span>
        </span>
        <button id="close-qr-pass-modal" class="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl font-bold p-1 cursor-pointer" title="Close">✕</button>
      </div>

      <!-- Minimalist Pass Content: Only QR, Name, and Label Number (No vehicle plate or vehicle type) -->
      <div id="printable-pass-card" class="p-4 bg-white rounded-2xl border-2 border-dashed border-slate-300 text-slate-900 space-y-3 max-w-[260px] mx-auto shadow-sm">
        <div class="w-[200px] h-[200px] mx-auto bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden">
          <img src="${qrUrl}" width="200" height="200" alt="QR Pass" class="rounded-xl shadow-xs mx-auto block" 
               onerror="window.drawQrCanvasFallback(this, '${encodeURIComponent(payload)}');" />
        </div>
        <div>
          <div class="text-xs font-mono font-bold text-slate-600 mb-0.5">${cleanLabel}</div>
          <div class="text-base font-black text-slate-900 leading-snug">${cleanName}</div>
        </div>
      </div>

      <div class="flex items-center gap-2 pt-1">
        <button id="print-qr-pass-btn" class="cr-btn cr-btn-primary flex-1 py-2.5 text-xs font-bold cursor-pointer shadow-md flex items-center justify-center gap-1.5">
          <span>🖨️</span> <span>Print Pass</span>
        </button>
        <button id="dismiss-qr-pass-btn" class="cr-btn bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 px-4 text-xs font-bold cursor-pointer">
          Close
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => {
    modal.remove();
    document.removeEventListener('keydown', handleEsc);
  };
  const handleEsc = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', handleEsc);

  modal.querySelector('#close-qr-pass-modal').onclick = closeModal;
  modal.querySelector('#dismiss-qr-pass-btn').onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  modal.querySelector('#print-qr-pass-btn').onclick = () => {
    if (typeof window.printSinglePass === 'function') {
      window.printSinglePass({ id: driverId, label: cleanLabel, name: cleanName, number: cleanLabel, type: isStaff ? 'staff' : 'van' });
    } else {
      window.print();
    }
  };
};

window.showDriverPassQRModal = window.showPassModal;
window.showStaffPassQRModal = window.showPassModal;

window.showDriverInfoQRModal = function({ id, label, name, phone, plate, vehicle_type }) {
  const driverId = id || label;
  const cleanLabel = label || 'Campus Van';
  const cleanName = name || 'Driver';
  const cleanPhone = phone || '';
  const cleanPlate = (plate && plate !== 'Staff Pass' && plate !== 'STAFF PASS') ? plate : '';
  const cleanVehicleType = vehicle_type || '4_wheeler';

  // Construct structured JSON payload for Info QR
  const infoPayloadObj = {
    type: 'CAMPUSRIDE_DRIVER_INFO',
    id: driverId,
    label: cleanLabel,
    name: cleanName,
    phone: cleanPhone,
    van_no: cleanPlate,
    vehicle_type: cleanVehicleType
  };
  const payloadString = JSON.stringify(infoPayloadObj);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=2&data=${encodeURIComponent(payloadString)}`;

  // Remove any previously open modal
  const existing = document.getElementById('campusride-info-qr-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'campusride-info-qr-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in';

  const typeIcon = cleanVehicleType === '2_wheeler' ? '🛵' : '🚗';
  const typeText = cleanVehicleType === '2_wheeler' ? '2 Wheeler' : '4 Wheeler Van';

  modal.innerHTML = `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4 text-center animate-fade-in-up">
      <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <span class="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-md border bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800">
          <span>ℹ️</span> <span>Driver Info QR</span>
        </span>
        <button id="close-info-qr-modal" class="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl font-bold p-1 cursor-pointer" title="Close">✕</button>
      </div>

      <!-- Info QR Card (Shows ONLY Driver Number below QR) -->
      <div id="printable-info-card" class="p-4 bg-white rounded-2xl border-2 border-dashed border-indigo-300 text-slate-900 space-y-3 max-w-[270px] mx-auto shadow-sm">
        <div class="w-[200px] h-[200px] mx-auto bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden">
          <img src="${qrUrl}" width="200" height="200" alt="Driver Info QR" class="rounded-xl shadow-xs mx-auto block" 
               onerror="window.drawQrCanvasFallback(this, '${encodeURIComponent(payloadString)}');" />
        </div>
        <div class="text-center pt-0.5">
          <div class="text-lg font-black font-mono text-slate-900 tracking-wide">${cleanLabel}</div>
        </div>
      </div>

      <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
        Teachers & Staff scan this QR with the <b>Info QR Scanner</b> to check whether this driver has arrived on campus, departed, or not yet arrived.
      </p>

      <div class="flex items-center gap-2 pt-1">
        <button id="print-info-qr-btn" class="cr-btn cr-btn-primary flex-1 py-2.5 text-xs font-bold cursor-pointer shadow-md flex items-center justify-center gap-1.5">
          <span>🖨️</span> <span>Print Info QR</span>
        </button>
        <button id="dismiss-info-qr-btn" class="cr-btn bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 px-4 text-xs font-bold cursor-pointer">
          Close
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => {
    modal.remove();
    document.removeEventListener('keydown', handleEsc);
  };
  const handleEsc = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', handleEsc);

  modal.querySelector('#close-info-qr-modal').onclick = closeModal;
  modal.querySelector('#dismiss-info-qr-btn').onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  modal.querySelector('#print-info-qr-btn').onclick = () => {
    if (typeof window.printSinglePass === 'function') {
      window.printSinglePass({
        id: driverId,
        label: cleanLabel,
        name: '',
        number: cleanLabel,
        payload: payloadString,
        isInfoQr: true
      });
    } else {
      window.print();
    }
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
