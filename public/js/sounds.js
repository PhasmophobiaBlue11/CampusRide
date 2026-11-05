// CampusRide — High-Quality Web Audio Synthesizer
// 100% Zero-Latency, Zero External Dependencies, Offline-First Sound System

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play a single oscillator tone with envelope
  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.2, delay = 0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const startTime = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  // Scan Beep (Gate Scanner barcode chirp)
  playScan() {
    this.playTone(880, 'sine', 0.08, 0.25);
  }

  // Entry Chime (Upward welcoming arpeggio)
  playEntry() {
    this.playTone(523.25, 'triangle', 0.12, 0.2, 0.0);   // C5
    this.playTone(659.25, 'triangle', 0.12, 0.22, 0.08);  // E5
    this.playTone(783.99, 'sine', 0.22, 0.25, 0.16);      // G5
    this.playTone(1046.50, 'sine', 0.35, 0.28, 0.24);     // C6
  }

  // Exit Tone (Smooth descending tone)
  playExit() {
    this.playTone(783.99, 'sine', 0.14, 0.22, 0.0);       // G5
    this.playTone(659.25, 'sine', 0.14, 0.2, 0.09);       // E5
    this.playTone(523.25, 'sine', 0.28, 0.25, 0.18);      // C5
  }

  // Error Buzzer (Low frequency double buzz)
  playError() {
    this.playTone(180, 'sawtooth', 0.12, 0.3, 0.0);
    this.playTone(160, 'sawtooth', 0.18, 0.3, 0.12);
  }

  // Success Fanfare
  playSuccess() {
    this.playTone(587.33, 'triangle', 0.15, 0.2, 0.0);    // D5
    this.playTone(739.99, 'triangle', 0.15, 0.2, 0.1);    // F#5
    this.playTone(880.00, 'triangle', 0.3, 0.25, 0.2);    // A5
  }

  // Welcome App Chime
  playWelcome() {
    this.playTone(440, 'sine', 0.2, 0.15, 0.0);
    this.playTone(659.25, 'sine', 0.35, 0.2, 0.12);
  }
}

window.sounds = new SoundSystem();
