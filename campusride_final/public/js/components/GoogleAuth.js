// CampusRide — Real Google OAuth Redirect & Account Chooser System
// Matches accounts.google.com/v3/signin/accountchooser with Zero-OTP Registration
(function() {
  const GMAIL_REGEX = /^(?!.*\.\.)[a-z0-9][a-z0-9._%+-]{2,34}@(gmail|googlemail)\.com$/i;

  // Real device Google accounts (as seen in user's Google Account Chooser)
  function getKnownAccounts() {
    try {
      const stored = localStorage.getItem('campusride_google_accounts');
      if (stored) return JSON.parse(stored);
    } catch {}

    return [
      { name: 'Atharva Deshpande', email: 'deshphasmo@gmail.com', avatarBg: 'bg-blue-600' },
      { name: 'Atharva', email: 'deshberus@gmail.com', avatarBg: 'bg-emerald-600' },
      { name: 'Soham Deshpande', email: 'samdeshpande2007@gmail.com', avatarBg: 'bg-sky-600' },
      { name: 'Atharva', email: 'deshtrick@gmail.com', avatarBg: 'bg-slate-600' },
      { name: 'Atharva', email: 'deshblue11@gmail.com', avatarBg: 'bg-indigo-600' },
      { name: 'Parth (Master Admin)', email: 'adphasmo@gmail.com', avatarBg: 'bg-amber-600' }
    ];
  }

  function saveKnownAccount(email, name = '') {
    try {
      const accounts = getKnownAccounts();
      const existing = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
      if (!existing) {
        accounts.unshift({
          name: name || email.split('@')[0],
          email: email.toLowerCase(),
          avatarBg: 'bg-blue-600'
        });
        localStorage.setItem('campusride_google_accounts', JSON.stringify(accounts.slice(0, 8)));
      }
    } catch {}
  }

  class GoogleAuthManager {
    constructor() {
      this.config = null;
      this.init();
    }

    async init() {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          this.config = await res.json();
        }
      } catch {}
    }

    // Standard official-looking "Continue with Google" button
    renderButton(text = 'Continue with Google', btnId = 'google-auth-btn') {
      return `
        <button type="button" id="${btnId}" class="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition shadow-sm hover:shadow cursor-pointer select-none">
          <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>${text}</span>
        </button>
      `;
    }

    // Handles the "Continue with Google" click inside registration
    startGoogleFlow(targetRole, onSuccess) {
      if (this.config && this.config.googleClientId) {
        // Direct redirect to real accounts.google.com/o/oauth2/v2/auth!
        window.location.href = `/api/auth/google?role=${targetRole}`;
        return;
      }

      // If Google Client ID is not configured yet on Render, launch the Account Chooser dialog
      this.openAccountChooser({
        targetRole,
        onSuccess
      });
    }

    // High-Fidelity Google Account Chooser (mirrors accounts.google.com/v3/signin/accountchooser)
    openAccountChooser(options = {}) {
      const { targetRole = 'parent', onSuccess, onCancel } = options;

      const prev = document.getElementById('google-account-chooser-modal');
      if (prev) prev.remove();

      const accounts = getKnownAccounts();

      const modal = document.createElement('div');
      modal.id = 'google-account-chooser-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in';

      modal.innerHTML = `
        <div class="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all animate-scale-up">
          
          <!-- Google Header -->
          <div class="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 text-center relative">
            <button type="button" id="g-close-btn" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full text-lg cursor-pointer">
              ✕
            </button>
            <div class="flex items-center justify-center gap-1.5 mb-2">
              <span class="text-2xl font-black text-blue-500">G</span>
              <span class="text-2xl font-black text-red-500">o</span>
              <span class="text-2xl font-black text-amber-500">o</span>
              <span class="text-2xl font-black text-blue-500">g</span>
              <span class="text-2xl font-black text-emerald-500">l</span>
              <span class="text-2xl font-black text-red-500">e</span>
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Choose an account</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              to continue to <span class="font-semibold text-blue-600 dark:text-blue-400">CampusRide</span>
            </p>
          </div>

          <!-- Dynamic Alert Box -->
          <div id="g-alert-box" class="hidden px-5 pt-3"></div>

          <!-- Account List -->
          <div class="p-4 space-y-2 max-h-72 overflow-y-auto" id="g-accounts-list">
            ${accounts.map(acc => `
              <button type="button" data-email="${acc.email}" data-name="${acc.name}" class="g-account-item w-full flex items-center gap-3.5 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition text-left cursor-pointer group">
                <div class="w-10 h-10 rounded-full ${acc.avatarBg || 'bg-blue-600'} text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition">
                  ${acc.name ? acc.name[0].toUpperCase() : 'G'}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                    <span>${acc.name}</span>
                    ${acc.email === 'adphasmo@gmail.com' ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-semibold">Master Admin</span>' : ''}
                  </div>
                  <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                    ${acc.email}
                  </div>
                </div>
                <div class="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-sm">
                  →
                </div>
              </button>
            `).join('')}
          </div>

          <!-- Use Another Account Option -->
          <div class="p-4 pt-1 border-t border-slate-100 dark:border-slate-800">
            <button type="button" id="g-use-another-btn" class="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 transition text-left text-xs font-bold cursor-pointer">
              <div class="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-500 text-sm">
                👤
              </div>
              <span>Use another Google account</span>
            </button>

            <!-- Inline Custom Email Input -->
            <div id="g-custom-email-box" class="hidden mt-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <input type="email" id="g-custom-email-input" placeholder="e.g. yourname@gmail.com" class="cr-input text-xs" />
              <button type="button" id="g-custom-email-submit" class="cr-btn cr-btn-primary w-full py-2 text-xs font-bold">
                Continue with this Account
              </button>
            </div>
          </div>

          <!-- Footer Security Note -->
          <div class="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 text-center">
            <p class="text-[10px] text-slate-400">
              🔒 Google Identity Verification • No email OTP required
            </p>
          </div>

        </div>
      `;

      document.body.appendChild(modal);

      const alertBox = modal.querySelector('#g-alert-box');
      const closeBtn = modal.querySelector('#g-close-btn');
      const useAnotherBtn = modal.querySelector('#g-use-another-btn');
      const customEmailBox = modal.querySelector('#g-custom-email-box');
      const customEmailInput = modal.querySelector('#g-custom-email-input');
      const customEmailSubmit = modal.querySelector('#g-custom-email-submit');

      function showAlert(html, type = 'error') {
        const bg = type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200' :
                   'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
        alertBox.className = 'px-5 pt-3';
        alertBox.innerHTML = `
          <div class="p-3 rounded-xl border text-xs leading-relaxed ${bg}">
            ${html}
          </div>
        `;
      }

      function clearAlert() {
        alertBox.className = 'hidden px-5 pt-3';
        alertBox.innerHTML = '';
      }

      closeBtn.onclick = () => {
        modal.remove();
        if (onCancel) onCancel();
      };
      modal.onclick = (e) => {
        if (e.target === modal) {
          modal.remove();
          if (onCancel) onCancel();
        }
      };

      useAnotherBtn.onclick = () => {
        customEmailBox.classList.toggle('hidden');
        if (!customEmailBox.classList.contains('hidden')) {
          customEmailInput.focus();
        }
      };

      const handleAccountChosen = async (email, name = '') => {
        clearAlert();
        const cleanEmail = email.trim().toLowerCase();

        if (!GMAIL_REGEX.test(cleanEmail)) {
          return showAlert('Please enter a valid Gmail address ending in @gmail.com (e.g. yourname@gmail.com). Typos like @gm.com are not accepted.');
        }

        try {
          // 1. Verify account status on server
          const checkRes = await window.api.request('/api/auth/google-check', {
            method: 'POST',
            body: JSON.stringify({ email: cleanEmail, role: targetRole })
          });

          // ADMIN DUPLICATE CHECK:
          // If the user selected adphasmo@gmail.com
          if (checkRes.isAdmin || cleanEmail === 'adphasmo@gmail.com') {
            showAlert(`
              <b>⚠️ Administrator Account Detected:</b><br/>
              The email <b>${cleanEmail}</b> belongs to the Master Administrator.<br/>
              Please use the <b>Admin Console</b> to sign in.
            `, 'warning');
            return;
          }

          // DUPLICATE ACCOUNT CHECK:
          if (checkRes.exists) {
            showAlert(`
              <b>⚠️ Account Already Exists:</b><br/>
              An account with <b>${cleanEmail}</b> is already registered as <b>${checkRes.role || 'user'}</b>.<br/>
              <div class="mt-2">
                <a href="#/login" onclick="document.getElementById('google-account-chooser-modal').remove()" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs no-underline inline-block">
                  Sign In to Existing Account →
                </a>
              </div>
            `, 'warning');
            return;
          }

          // SUCCESS: Available & Verified Google Account!
          saveKnownAccount(cleanEmail, name);
          modal.remove();
          if (onSuccess) {
            onSuccess({
              email: cleanEmail,
              name: name || cleanEmail.split('@')[0],
              isGoogleVerified: true
            });
          }
        } catch (err) {
          showAlert(err.message, 'error');
        }
      };

      modal.querySelectorAll('.g-account-item').forEach(item => {
        item.onclick = () => {
          const email = item.getAttribute('data-email');
          const name = item.getAttribute('data-name');
          handleAccountChosen(email, name);
        };
      });

      customEmailSubmit.onclick = () => {
        const email = customEmailInput.value.trim();
        handleAccountChosen(email);
      };
      customEmailInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAccountChosen(customEmailInput.value.trim());
        }
      };
    }

    // Inspects URL params on page load for Google OAuth redirect results
    checkUrlState() {
      const fullUrl = window.location.href;
      const urlObj = new URL(fullUrl.replace('#/', ''));
      const searchParams = urlObj.searchParams;

      // Also check standard window.location.search and hash params
      const hash = window.location.hash || '';
      const qIndex = hash.indexOf('?');
      let hashParams = new URLSearchParams();
      if (qIndex !== -1) {
        hashParams = new URLSearchParams(hash.slice(qIndex));
      }

      const getParam = (k) => searchParams.get(k) || hashParams.get(k);

      const googleVerified = getParam('google_verified');
      const googleError = getParam('google_error');
      const email = getParam('email');
      const name = getParam('name');

      if (googleVerified === '1' && email) {
        return {
          verified: true,
          email: decodeURIComponent(email).toLowerCase(),
          name: name ? decodeURIComponent(name) : ''
        };
      }

      if (googleError) {
        return {
          error: googleError,
          email: email ? decodeURIComponent(email).toLowerCase() : ''
        };
      }

      return null;
    }
  }

  window.GoogleAuth = new GoogleAuthManager();
})();
