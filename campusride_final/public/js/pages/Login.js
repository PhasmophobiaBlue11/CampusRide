// CampusRide — Dedicated Isolated App Logins (§7.1)
// Completely separate portals with ZERO role-switch tabs or cross-role confusion.
// Supports 4-Digit Security PIN Quick Unlock for returning devices and mandatory Double Security.
// - Driver App: #/driver or /driver
// - Parent App: #/parent or /parent
// - Gate Staff App: #/staff or /staff
// - Admin Portal: #/admin or /admin

class LoginPage {
  static isPasswordMode = false;
  static isResetPinMode = false;
  static pendingVerification = null;
  static _keypadListener = null;
  static _audioCtx = null;

  // Render UPI / Paytm / GPay style 4-digit PIN boxes & square-key dialer
  static renderKeypad(formId, role, isDoubleSec = false) {
    const roleClass = `role-${role || 'staff'}`;
    const prefix = isDoubleSec ? 'double-sec' : 'quick-pin';
    return `
      <div class="upi-keypad-wrapper ${roleClass} my-1" data-target-form="${formId}">
        <input type="hidden" id="${prefix}-pin-input" name="pin" value="" />

        <!-- 4 Distinct UPI-Style PIN Input Boxes -->
        <div class="upi-pin-section">
          <div class="upi-pin-header">
            <span class="upi-pin-label">ENTER 4-DIGIT PIN</span>
            <button type="button" class="upi-show-btn" id="${prefix}-show-btn" title="Toggle PIN visibility">
              <span id="${prefix}-show-icon">👁️</span> <span id="${prefix}-show-text">SHOW</span>
            </button>
          </div>

          <div id="${prefix}-boxes" class="upi-boxes-row" aria-label="PIN input boxes">
            <div class="upi-pin-box active" data-index="0"></div>
            <div class="upi-pin-box" data-index="1"></div>
            <div class="upi-pin-box" data-index="2"></div>
            <div class="upi-pin-box" data-index="3"></div>
          </div>
        </div>

        <!-- Styled Keypad Panel (Enclosure matching user's image) -->
        <div class="upi-keypad-panel">
          <div class="upi-keypad-grid" id="${prefix}-keypad">
            <button type="button" class="upi-key-btn" data-key="1">1</button>
            <button type="button" class="upi-key-btn" data-key="2">2</button>
            <button type="button" class="upi-key-btn" data-key="3">3</button>

            <button type="button" class="upi-key-btn" data-key="4">4</button>
            <button type="button" class="upi-key-btn" data-key="5">5</button>
            <button type="button" class="upi-key-btn" data-key="6">6</button>

            <button type="button" class="upi-key-btn" data-key="7">7</button>
            <button type="button" class="upi-key-btn" data-key="8">8</button>
            <button type="button" class="upi-key-btn" data-key="9">9</button>

            <!-- Bottom row: Clear all, 0, Backspace -->
            <button type="button" class="upi-key-btn upi-key-action" data-action="clear" id="${prefix}-clear-btn" title="Clear all digits">
              <span class="text-base font-bold">✕</span>
            </button>
            <button type="button" class="upi-key-btn" data-key="0">0</button>
            <button type="button" class="upi-key-btn upi-key-action" data-action="backspace" id="${prefix}-del-btn" title="Delete last digit">
              <span class="text-lg">⌫</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // UPI Keypad Controller: Manages 4 PIN boxes, active cursors, haptics, show/hide, & auto-submit
  static setupKeypadController({
    keypadId,
    boxesContainerId,
    dotsContainerId,
    hiddenInputId,
    showBtnId,
    onAutoSubmit
  }) {
    const keypadEl = document.getElementById(keypadId);
    const boxesContainer = document.getElementById(boxesContainerId || dotsContainerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!keypadEl || !boxesContainer) return null;

    let currentPin = '';
    let isPeek = false;

    // Soft haptic feedback
    const triggerHaptic = (ms = 18) => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(ms); } catch (_) {}
      }
    };

    // Soft acoustic tap sound synthesizer
    const playClickSound = () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!LoginPage._audioCtx) LoginPage._audioCtx = new AudioCtx();
        if (LoginPage._audioCtx.state === 'suspended') LoginPage._audioCtx.resume();
        const osc = LoginPage._audioCtx.createOscillator();
        const gain = LoginPage._audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(540, LoginPage._audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(160, LoginPage._audioCtx.currentTime + 0.035);
        gain.gain.setValueAtTime(0.06, LoginPage._audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, LoginPage._audioCtx.currentTime + 0.035);
        osc.connect(gain);
        gain.connect(LoginPage._audioCtx.destination);
        osc.start();
        osc.stop(LoginPage._audioCtx.currentTime + 0.035);
      } catch (_) {}
    };

    const updateBoxes = () => {
      const boxes = boxesContainer.querySelectorAll('.upi-pin-box');
      boxes.forEach((box, idx) => {
        box.classList.remove('active', 'filled', 'peek');

        if (idx < currentPin.length) {
          box.classList.add('filled');
          if (isPeek) {
            box.classList.add('peek');
            box.innerHTML = `<span class="upi-pin-digit">${currentPin[idx]}</span>`;
          } else {
            box.innerHTML = `<span class="upi-pin-bullet"></span>`;
          }
        } else {
          box.innerHTML = '';
          if (idx === currentPin.length) {
            box.classList.add('active'); // active cursor for next digit
          }
        }
      });
      if (hiddenInput) {
        hiddenInput.value = currentPin;
      }
    };

    const addDigit = (digit) => {
      if (currentPin.length >= 4) return;
      currentPin += digit;
      triggerHaptic(18);
      playClickSound();
      updateBoxes();

      if (currentPin.length === 4 && typeof onAutoSubmit === 'function') {
        // Pause 130ms so user visually sees 4th box filled before auto-submitting
        setTimeout(() => {
          onAutoSubmit(currentPin);
        }, 130);
      }
    };

    const removeDigit = () => {
      if (currentPin.length === 0) return;
      currentPin = currentPin.slice(0, -1);
      triggerHaptic(14);
      playClickSound();
      updateBoxes();
    };

    const clearAll = () => {
      if (currentPin.length === 0) return;
      currentPin = '';
      triggerHaptic(16);
      playClickSound();
      updateBoxes();
    };

    const togglePeek = () => {
      isPeek = !isPeek;
      triggerHaptic(15);
      playClickSound();
      const showBtn = document.getElementById(showBtnId);
      const showIcon = showBtn?.querySelector('[id$="-show-icon"]');
      const showText = showBtn?.querySelector('[id$="-show-text"]');
      if (showIcon) showIcon.textContent = isPeek ? '🙈' : '👁️';
      if (showText) showText.textContent = isPeek ? 'HIDE' : 'SHOW';
      updateBoxes();
    };

    // Attach show button listener
    if (showBtnId) {
      const showBtn = document.getElementById(showBtnId);
      if (showBtn) {
        showBtn.onclick = (e) => {
          e.preventDefault();
          togglePeek();
        };
      }
    }

    const triggerErrorShake = () => {
      boxesContainer.classList.add('shake');
      triggerHaptic([40, 60, 40]);
      setTimeout(() => {
        boxesContainer.classList.remove('shake');
        currentPin = '';
        updateBoxes();
      }, 450);
    };

    // Button 3D click handlers
    const buttons = keypadEl.querySelectorAll('.upi-key-btn');
    buttons.forEach(btn => {
      const animatePress = () => {
        btn.classList.add('is-active');
        setTimeout(() => btn.classList.remove('is-active'), 110);
      };

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        animatePress();
        const key = btn.getAttribute('data-key');
        const action = btn.getAttribute('data-action');

        if (key !== null) {
          addDigit(key);
        } else if (action === 'backspace') {
          removeDigit();
        } else if (action === 'clear') {
          clearAll();
        }
      });
    });

    // Desktop physical keyboard support
    if (LoginPage._keypadListener) {
      window.removeEventListener('keydown', LoginPage._keypadListener);
      LoginPage._keypadListener = null;
    }

    const handleKeyDown = (e) => {
      if (!document.body.contains(keypadEl)) {
        window.removeEventListener('keydown', handleKeyDown);
        LoginPage._keypadListener = null;
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        const btn = keypadEl.querySelector(`button[data-key="${e.key}"]`);
        if (btn) {
          btn.classList.add('is-active');
          setTimeout(() => btn.classList.remove('is-active'), 110);
        }
        addDigit(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        const btn = keypadEl.querySelector('button[data-action="backspace"]');
        if (btn) {
          btn.classList.add('is-active');
          setTimeout(() => btn.classList.remove('is-active'), 110);
        }
        removeDigit();
      } else if (e.key === 'Escape') {
        clearAll();
      } else if (e.key === 'Enter') {
        if (currentPin.length === 4 && typeof onAutoSubmit === 'function') {
          onAutoSubmit(currentPin);
        }
      }
    };
    LoginPage._keypadListener = handleKeyDown;
    window.addEventListener('keydown', handleKeyDown);

    // Initial render: box 0 active with blinking cursor
    updateBoxes();

    return {
      getPin: () => currentPin,
      clearPin: () => {
        currentPin = '';
        updateBoxes();
      },
      triggerError: triggerErrorShake
    };
  }

  static render(role = 'staff') {
    const isDriver = role === 'driver';
    const isParent = role === 'parent';
    const isAdmin = role === 'admin';
    const isStaff = !isDriver && !isParent && !isAdmin;

    const portalTitle = isDriver ? 'CampusRide Driver App' :
                        isParent ? 'CampusRide Parent App' :
                        isAdmin ? 'CampusRide Admin Suite' :
                        'CampusRide Gate & Staff Desk';

    const portalDesc = isDriver ? 'Van Driver Console & Live GPS Journey Broadcasting' :
                       isParent ? 'Real-Time Van Radar, Student Tracking & Safety SOS' :
                       isAdmin ? 'Master Administrator Transit Console' :
                       'Campus Security, Pass Scanning & Daily Log Desk';

    const portalIcon = isDriver ? '🚌' :
                       isParent ? '👨‍👩‍👧' :
                       isAdmin ? '🛡️' : '🛂';

    const portalAccent = isDriver ? 'from-amber-500 to-orange-600' :
                         isParent ? 'from-indigo-600 to-purple-600' :
                         isAdmin ? 'from-purple-700 to-indigo-700' :
                         'from-blue-700 to-indigo-600';

    const btnClass = isDriver ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/25' :
                     isParent ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25' :
                     isAdmin ? 'bg-purple-700 hover:bg-purple-600 text-white shadow-purple-500/25' :
                     'cr-btn-primary shadow-blue-500/25';

    const usernamePlaceholder = isDriver ? 'Enter driver username' :
                                isParent ? 'Enter parent username' :
                                isAdmin ? 'Admin2026' :
                                'Enter staff username';

    // -----------------------------------------------------------
    // SCREEN 0: MANDATORY DOUBLE SECURITY PIN VERIFICATION (Step 2)
    // -----------------------------------------------------------
    if (LoginPage.pendingVerification) {
      const pending = LoginPage.pendingVerification;
      return `
        <div class="min-h-screen flex items-center justify-center p-4 relative z-10">
          <div class="cr-card w-full max-w-md p-6 sm:p-8 animate-fade-in-up text-center space-y-6">
            
            <!-- Brand / Security Header -->
            <div>
              <div class="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr ${portalAccent} flex items-center justify-center text-white shadow-xl text-3xl">
                🛡️
              </div>
              <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Double Security Check</h1>
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold mt-2">
                <span>🔒</span> Mandatory Step 2 of 2: Security PIN
              </div>
            </div>

            <!-- Verified Account Information Card -->
            <div class="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
              <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Credentials Verified</span>
              <div class="font-mono font-black text-lg text-blue-600 dark:text-blue-400 mt-0.5">
                @${pending.username}
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Please enter the 4-digit Security PIN for this account to complete sign in.
              </p>
            </div>

            <!-- PIN Keypad Form -->
            <form id="double-sec-form" class="space-y-4" autocomplete="off">
              ${LoginPage.renderKeypad('double-sec-form', pending.role || role, true)}

              <button type="submit" id="double-sec-submit-btn" class="cr-btn ${btnClass} w-full py-2.5 font-bold cursor-pointer shadow-md transition">
                🔓 Verify PIN & Complete Sign In
              </button>
            </form>

            <!-- Cancel / Back Button -->
            <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" id="cancel-double-sec-btn" class="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white hover:underline cursor-pointer">
                ← Back to Username & Password
              </button>
            </div>

          </div>
        </div>
      `;
    }

    // Check if there is a verified saved account with an active token on this device
    let savedAccount = null;
    const roleToken = localStorage.getItem(`campusride_${role}_token`) || 
                      (localStorage.getItem('campusride_app_role') === role ? localStorage.getItem('campusride_token') : null);

    try {
      const stored = localStorage.getItem(`campusride_saved_account_${role}`);
      if (stored && roleToken) {
        savedAccount = JSON.parse(stored);
      } else if (stored && !roleToken) {
        // Purge orphaned saved account when no active session token exists so user lands directly on Login page
        localStorage.removeItem(`campusride_saved_account_${role}`);
      }
    } catch {
      savedAccount = null;
    }

    // -----------------------------------------------------------
    // SCREEN 1A: RESET SECURITY PIN SCREEN (Forgot PIN)
    // -----------------------------------------------------------
    if (LoginPage.isResetPinMode && savedAccount && savedAccount.username) {
      return `
        <div class="min-h-screen flex items-center justify-center p-4 relative z-10">
          <div class="cr-card w-full max-w-md p-6 sm:p-8 animate-fade-in-up text-center space-y-6">
            
            <!-- Brand / Security Header -->
            <div>
              <div class="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr ${portalAccent} flex items-center justify-center text-white shadow-xl text-3xl">
                🔐
              </div>
              <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Reset Security PIN</h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your account password to verify your identity and set a new 4-digit PIN.
              </p>
            </div>

            <!-- Verified Account Information Card -->
            <div class="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
              <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Connected Account</span>
              <div class="font-mono font-black text-base text-blue-600 dark:text-blue-400 mt-0.5">
                @${savedAccount.username}
              </div>
            </div>

            <!-- Reset PIN Form -->
            <form id="reset-pin-form" data-username="${savedAccount.username}" data-role="${role}" class="space-y-4 text-left" autocomplete="off">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Password
                </label>
                <div class="relative flex items-center">
                  <input type="password" id="reset-pin-password" required class="cr-input pr-11" placeholder="Enter your account password" autocomplete="current-password" />
                  <button type="button" id="toggle-reset-password" class="absolute right-2.5 p-1 text-base text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none" title="Toggle password visibility">
                    👁️
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New 4-Digit PIN
                  </label>
                  <div class="relative flex items-center">
                    <input type="password" id="reset-pin-new" required pattern="[0-9]{4}" maxlength="4" inputmode="numeric" class="cr-input font-mono font-black text-xl tracking-widest text-center pr-10" placeholder="••••" autocomplete="off" />
                    <button type="button" id="toggle-reset-pin-new" class="absolute right-2 p-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none" title="Toggle PIN visibility">
                      👁️
                    </button>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm PIN
                  </label>
                  <div class="relative flex items-center">
                    <input type="password" id="reset-pin-confirm" required pattern="[0-9]{4}" maxlength="4" inputmode="numeric" class="cr-input font-mono font-black text-xl tracking-widest text-center pr-10" placeholder="••••" autocomplete="off" />
                    <button type="button" id="toggle-reset-pin-confirm" class="absolute right-2 p-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none" title="Toggle PIN visibility">
                      👁️
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" id="reset-pin-submit-btn" class="cr-btn ${btnClass} w-full py-2.5 font-bold cursor-pointer shadow-md transition">
                Reset PIN & Sign In
              </button>
            </form>

            <!-- Cancel Button -->
            <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" id="cancel-reset-pin-btn" class="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white hover:underline cursor-pointer">
                ← Back to PIN Unlock
              </button>
            </div>

          </div>
        </div>
      `;
    }

    // -----------------------------------------------------------
    // SCREEN 1: 4-DIGIT PIN QUICK UNLOCK SCREEN (Returning Device)
    // -----------------------------------------------------------
    if (savedAccount && savedAccount.username && !LoginPage.isPasswordMode) {
      return `
        <div class="min-h-screen flex items-center justify-center p-4 relative z-10">
          <div class="cr-card w-full max-w-md p-6 sm:p-8 animate-fade-in-up text-center space-y-6">
            
            <!-- Portal Brand Header -->
            <div>
              <div class="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr ${portalAccent} flex items-center justify-center text-white shadow-xl text-3xl">
                ${portalIcon}
              </div>
              <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">${portalTitle}</h1>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Quick Device Security PIN Unlock</p>
            </div>

            <!-- Saved Account Card -->
            <div class="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
              <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Connected Account</span>
              <div class="font-mono font-black text-base text-blue-600 dark:text-blue-400 mt-0.5">
                @${savedAccount.username}
              </div>
            </div>

            <!-- PIN Keypad Form -->
            <form id="pin-login-form" data-username="${savedAccount.username}" data-role="${role}" class="space-y-4" autocomplete="off">
              ${LoginPage.renderKeypad('pin-login-form', role, false)}

              <button type="submit" id="pin-unlock-submit-btn" class="cr-btn ${btnClass} w-full py-2.5 font-bold cursor-pointer shadow-md transition">
                🔓 Unlock App
              </button>
            </form>

            <!-- Forgot PIN option -->
            <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" id="forgot-pin-btn" class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                Forgot PIN?
              </button>
            </div>

          </div>
        </div>
      `;
    }

    // -----------------------------------------------------------
    // SCREEN 2: STANDARD USERNAME & PASSWORD LOGIN FORM
    // -----------------------------------------------------------
    const registrationCta = isDriver ? `
      <div class="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs">
        <span class="text-slate-600 dark:text-slate-400">New campus van driver?</span>
        <a href="#/register-driver" class="font-bold text-amber-700 dark:text-amber-400 hover:underline block mt-1">
          Register Vehicle & Set 4-Digit PIN →
        </a>
      </div>
    ` : isParent ? `
      <div class="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900/50 text-xs">
        <span class="text-slate-600 dark:text-slate-400">New student parent?</span>
        <a href="#/register-parent" class="font-bold text-indigo-700 dark:text-indigo-400 hover:underline block mt-1">
          Create Parent Account & Set 4-Digit PIN →
        </a>
      </div>
    ` : isStaff ? `
      <div class="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/50 text-xs text-left space-y-1">
        <div class="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
          <span>👔</span> <span>Common Staff Account Access:</span>
        </div>
        <p class="text-slate-600 dark:text-slate-400">
          All gate security staff & teachers share a single common account created by the Administrator. Please sign in with the username, password, and 4-digit PIN given by Admin.
        </p>
      </div>
    ` : '';

    return `
      <div class="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div class="cr-card w-full max-w-md p-6 sm:p-8 animate-fade-in-up">
          
          <!-- App Brand Header -->
          <div class="text-center mb-6">
            <div class="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr ${portalAccent} flex items-center justify-center text-white shadow-xl text-3xl">
              ${portalIcon}
            </div>
            <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">${portalTitle}</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">${portalDesc}</p>
          </div>

          <!-- Dedicated Login Form -->
          <form id="login-form" class="space-y-4" autocomplete="off">
            <input type="hidden" id="login-target-role" value="${role}" />
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Username</label>
                <a href="#/forgot-username${role ? '?role=' + role : ''}" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">Forgot?</a>
              </div>
              <input type="text" id="login-username" required class="cr-input" placeholder="${usernamePlaceholder}" value="${savedAccount?.username || ''}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Password</label>
                <a href="#/forgot-password${role ? '?role=' + role : ''}" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">Forgot?</a>
              </div>
              <div class="relative flex items-center">
                <input type="password" id="login-password" required class="cr-input pr-11" placeholder="••••••••" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" />
                <button type="button" id="toggle-login-password" class="absolute right-2.5 p-1 text-base text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer select-none" title="Toggle password visibility">
                  👁️
                </button>
              </div>
            </div>

            <button type="submit" id="login-submit-btn" class="cr-btn ${btnClass} w-full py-2.5 mt-2 font-bold cursor-pointer shadow-md transition">
              Sign In to ${isDriver ? 'Driver App' : isParent ? 'Parent App' : isAdmin ? 'Admin Console' : 'Gate Desk'}
            </button>
          </form>

          ${savedAccount && savedAccount.username ? `
            <div class="mt-3 text-center">
              <button type="button" id="switch-to-pin-btn" class="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                🔒 Unlock with 4-Digit PIN instead
              </button>
            </div>
          ` : ''}

          <!-- Dedicated Registration Notice / Link -->
          <div class="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-center space-y-3">
            ${registrationCta}
          </div>

        </div>
      </div>
    `;
  }

  static attachEvents() {
    // 0A. Reset Security PIN Form Handler (Forgot PIN)
    const resetPinForm = document.getElementById('reset-pin-form');
    if (resetPinForm) {
      const passInput = document.getElementById('reset-pin-password');
      const newPinInput = document.getElementById('reset-pin-new');
      const confirmPinInput = document.getElementById('reset-pin-confirm');
      const submitBtn = document.getElementById('reset-pin-submit-btn');
      const cancelBtn = document.getElementById('cancel-reset-pin-btn');

      // Eye toggles for Reset PIN form
      const setupToggle = (btnId, inputEl) => {
        const btn = document.getElementById(btnId);
        if (btn && inputEl) {
          btn.onclick = () => {
            const isPass = inputEl.type === 'password';
            inputEl.type = isPass ? 'text' : 'password';
            btn.textContent = isPass ? '🙈' : '👁️';
          };
        }
      };
      setupToggle('toggle-reset-password', passInput);
      setupToggle('toggle-reset-pin-new', newPinInput);
      setupToggle('toggle-reset-pin-confirm', confirmPinInput);

      if (cancelBtn) {
        cancelBtn.onclick = () => {
          LoginPage.isResetPinMode = false;
          const role = resetPinForm.getAttribute('data-role');
          const appEl = document.getElementById('app');
          if (appEl) {
            appEl.innerHTML = LoginPage.render(role);
            LoginPage.attachEvents();
          }
        };
      }

      resetPinForm.onsubmit = async (e) => {
        e.preventDefault();
        const username = resetPinForm.getAttribute('data-username');
        const role = resetPinForm.getAttribute('data-role');
        const password = passInput.value;
        const newPin = newPinInput.value.trim();
        const confirmPin = confirmPinInput.value.trim();

        if (!password) {
          return window.showToast('Please enter your account password', 'error');
        }
        if (!newPin || !/^\d{4}$/.test(newPin)) {
          return window.showToast('New PIN must be exactly 4 numeric digits', 'error');
        }
        if (newPin !== confirmPin) {
          return window.showToast('New PIN and Confirm PIN do not match', 'error');
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying & resetting PIN...';

        try {
          const res = await window.api.request('/api/auth/reset-pin', {
            method: 'POST',
            body: JSON.stringify({ username, password, newPin, required_role: role })
          });

          window.showToast('Security PIN reset successfully!', 'success');

          // Save account for quick 4-digit PIN unlock
          localStorage.setItem(`campusride_saved_account_${role}`, JSON.stringify({
            username: res.user?.username || username,
            role,
            hasPin: true
          }));
          localStorage.setItem(`campusride_${role}_token`, res.token);
          sessionStorage.setItem(`campusride_pin_unlocked_${role}`, 'true');
          window.api.setToken(res.token);

          LoginPage.isResetPinMode = false;
          LoginPage.isPasswordMode = false;
          localStorage.setItem('campusride_app_role', role);

          window.location.hash = '#/';
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Reset PIN & Sign In';
        }
      };
      return;
    }

    // 0. Double Security 4-Digit PIN Form Handler (Step 2 of Login)
    const doubleSecForm = document.getElementById('double-sec-form');
    if (doubleSecForm) {
      const submitBtn = document.getElementById('double-sec-submit-btn');
      const cancelBtn = document.getElementById('cancel-double-sec-btn');

      let keypadCtrl = null;

      const doSubmit = async (pinValue) => {
        const pending = LoginPage.pendingVerification;
        if (!pending) return;

        const pin = pinValue || keypadCtrl?.getPin() || '';
        if (!pin || pin.length !== 4) {
          if (keypadCtrl) keypadCtrl.triggerError();
          return window.showToast('Please enter your 4-digit PIN', 'error');
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying PIN...';

        try {
          const user = await window.api.login(pending.username, pending.password, pending.role, pin);
          window.showToast('Signed in successfully with double security!', 'success');

          // Save account for quick 4-digit PIN unlock next time on this device
          localStorage.setItem(`campusride_saved_account_${pending.role}`, JSON.stringify({
            username: user.username || pending.username,
            role: pending.role,
            hasPin: true
          }));
          sessionStorage.setItem(`campusride_pin_unlocked_${pending.role}`, 'true');
          LoginPage.pendingVerification = null;
          LoginPage.isPasswordMode = false;

          localStorage.setItem('campusride_app_role', pending.role);
          window.location.hash = '#/';
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = '🔓 Verify PIN & Complete Sign In';
          if (keypadCtrl) keypadCtrl.triggerError();
        }
      };

      keypadCtrl = LoginPage.setupKeypadController({
        keypadId: 'double-sec-keypad',
        boxesContainerId: 'double-sec-boxes',
        hiddenInputId: 'double-sec-pin-input',
        showBtnId: 'double-sec-show-btn',
        onAutoSubmit: (pin) => doSubmit(pin)
      });

      if (cancelBtn) {
        cancelBtn.onclick = () => {
          const role = LoginPage.pendingVerification?.role || 'staff';
          LoginPage.pendingVerification = null;
          const appEl = document.getElementById('app');
          if (appEl) {
            appEl.innerHTML = LoginPage.render(role);
            LoginPage.attachEvents();
          }
        };
      }

      doubleSecForm.onsubmit = async (e) => {
        e.preventDefault();
        await doSubmit();
      };
      return;
    }

    // 1. PIN Quick Unlock Form Handler (Returning Device)
    const pinForm = document.getElementById('pin-login-form');
    if (pinForm) {
      const submitBtn = document.getElementById('pin-unlock-submit-btn');
      const username = pinForm.getAttribute('data-username');
      const role = pinForm.getAttribute('data-role');

      let keypadCtrl = null;

      const doUnlock = async (pinValue) => {
        const pin = pinValue || keypadCtrl?.getPin() || '';

        if (!pin || pin.length !== 4) {
          if (keypadCtrl) keypadCtrl.triggerError();
          return window.showToast('Please enter your 4-digit PIN', 'error');
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Unlocking...';

        try {
          const user = await window.api.pinLogin(username, pin, role);
          window.showToast(`Unlocked as @${username}!`, 'success');

          // Mark unlocked in current device session
          sessionStorage.setItem(`campusride_pin_unlocked_${role}`, 'true');

          // Save active role and reload into app
          localStorage.setItem('campusride_app_role', role);
          window.location.hash = '#/';
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = '🔓 Unlock App';
          if (keypadCtrl) keypadCtrl.triggerError();
        }
      };

      keypadCtrl = LoginPage.setupKeypadController({
        keypadId: 'quick-pin-keypad',
        boxesContainerId: 'quick-pin-boxes',
        hiddenInputId: 'quick-pin-pin-input',
        showBtnId: 'quick-pin-show-btn',
        onAutoSubmit: (pin) => doUnlock(pin)
      });

      pinForm.onsubmit = async (e) => {
        e.preventDefault();
        await doUnlock();
      };

      // Forgot PIN button handler
      const forgotPinBtn = document.getElementById('forgot-pin-btn');
      if (forgotPinBtn) {
        forgotPinBtn.onclick = () => {
          LoginPage.isResetPinMode = true;
          const appEl = document.getElementById('app');
          if (appEl) {
            appEl.innerHTML = LoginPage.render(role);
            LoginPage.attachEvents();
          }
        };
      }
      return;
    }

    // 2. Standard Username & Password Form Handler
    const toggleBtn = document.getElementById('toggle-login-password');
    const passInput = document.getElementById('login-password');
    if (toggleBtn && passInput) {
      toggleBtn.onclick = () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        toggleBtn.textContent = isPass ? '🙈' : '👁️';
      };
    }

    // Switch back to PIN button if present
    const switchToPinBtn = document.getElementById('switch-to-pin-btn');
    if (switchToPinBtn) {
      switchToPinBtn.onclick = () => {
        LoginPage.isPasswordMode = false;
        LoginPage.pendingVerification = null;
        const targetRole = document.getElementById('login-target-role').value;
        const appEl = document.getElementById('app');
        if (appEl) {
          appEl.innerHTML = LoginPage.render(targetRole);
          LoginPage.attachEvents();
        }
      };
    }

    const form = document.getElementById('login-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const targetRole = document.getElementById('login-target-role').value;
        const btn = document.getElementById('login-submit-btn');

        btn.disabled = true;
        btn.textContent = 'Verifying credentials...';

        try {
          const res = await window.api.login(username, password, targetRole);

          // If double security PIN is required, transition to Step 2
          if (res && res.requiresPin) {
            LoginPage.pendingVerification = {
              username: res.username || username,
              password,
              role: targetRole,
              displayName: res.displayName || username
            };
            const appEl = document.getElementById('app');
            if (appEl) {
              appEl.innerHTML = LoginPage.render(targetRole);
              LoginPage.attachEvents();
            }
            return;
          }

          // If no PIN required (e.g. Master Admin without PIN)
          window.showToast('Signed in successfully!', 'success');
          sessionStorage.setItem(`campusride_pin_unlocked_${targetRole}`, 'true');
          LoginPage.isPasswordMode = false;
          LoginPage.pendingVerification = null;

          // Remember role in session
          localStorage.setItem('campusride_app_role', targetRole);

          // Redirect to root of this app
          window.location.hash = '#/';
          window.location.reload();
        } catch (err) {
          window.showToast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Sign In';
        }
      };
    }
  }
}

// Global App Directory / Launchpad Page (§7.1)
class AppLaunchpadPage {
  static render() {
    return `
      <div class="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div class="cr-card w-full max-w-xl p-6 sm:p-8 animate-fade-in-up">
          
          <div class="text-center mb-8">
            <div class="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-xl text-3xl">
              🚌
            </div>
            <h1 class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">CampusRide Network</h1>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto">
              Select your role below to launch your dedicated transportation portal.
            </p>
          </div>

          <div class="space-y-3.5">
            <a href="#/driver" onclick="localStorage.setItem('campusride_app_role', 'driver')" class="block p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent hover:from-amber-500/20 border border-amber-300/40 dark:border-amber-700/40 transition group cursor-pointer shadow-sm hover:shadow-md">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition">
                  🚌
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <h3 class="font-bold text-slate-900 dark:text-white text-base">Driver App</h3>
                    <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                      /driver
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Van console, journey start/end, live GPS sharing & student pickup navigation.
                  </p>
                </div>
                <div class="text-amber-600 dark:text-amber-400 font-bold text-lg group-hover:translate-x-1 transition">
                  →
                </div>
              </div>
            </a>

            <a href="#/parent" onclick="localStorage.setItem('campusride_app_role', 'parent')" class="block p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent hover:from-indigo-500/20 border border-indigo-300/40 dark:border-indigo-700/40 transition group cursor-pointer shadow-sm hover:shadow-md">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition">
                  👨‍👩‍👧
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <h3 class="font-bold text-slate-900 dark:text-white text-base">Parent App</h3>
                    <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                      /parent
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Student radar, real-time Google Maps van tracking, pickup alerts & emergency SOS.
                  </p>
                </div>
                <div class="text-indigo-600 dark:text-indigo-400 font-bold text-lg group-hover:translate-x-1 transition">
                  →
                </div>
              </div>
            </a>

            <a href="#/staff" onclick="localStorage.setItem('campusride_app_role', 'staff')" class="block p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent hover:from-blue-500/20 border border-blue-300/40 dark:border-blue-700/40 transition group cursor-pointer shadow-sm hover:shadow-md">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition">
                  🛂
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <h3 class="font-bold text-slate-900 dark:text-white text-base">Gate Staff Desk</h3>
                    <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      /staff
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Entry/exit pass scanning, Info QR scanner, daily log audit, and student arrivals.
                  </p>
                </div>
                <div class="text-blue-600 dark:text-blue-400 font-bold text-lg group-hover:translate-x-1 transition">
                  →
                </div>
              </div>
            </a>

            <a href="#/admin" onclick="localStorage.setItem('campusride_app_role', 'admin')" class="block p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent hover:from-purple-500/20 border border-purple-300/40 dark:border-purple-700/40 transition group cursor-pointer shadow-sm hover:shadow-md">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-700 text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition">
                  🛡️
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <h3 class="font-bold text-slate-900 dark:text-white text-base">Master Administrator</h3>
                    <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                      /admin
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Common staff account setup, live connected devices counter, and daily gate logs.
                  </p>
                </div>
                <div class="text-purple-600 dark:text-purple-400 font-bold text-lg group-hover:translate-x-1 transition">
                  →
                </div>
              </div>
            </a>
          </div>

        </div>
      </div>
    `;
  }

  static attachEvents() {}
}

window.LoginPage = LoginPage;
window.AppLaunchpadPage = AppLaunchpadPage;
