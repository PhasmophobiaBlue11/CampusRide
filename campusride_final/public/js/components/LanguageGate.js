// CampusRide — First-Run Language Gate & Welcome Modal (§4.1, §18)
class LanguageGate {
  static check() {
    const chosen = localStorage.getItem('campusride_lang');
    if (!chosen) {
      LanguageGate.showModal();
    }
  }

  static showModal() {
    if (document.getElementById('language-gate-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'language-gate-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4';
    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 text-center animate-fade-in-up">
        <!-- Logo Icon -->
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 6v6"></path><path d="M15 6v6"></path><path d="M2 12h19.6"></path>
            <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 7.3 19.6 7 19 7H5c-.6 0-1.1.3-1.4.8L2.2 12.8c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"></path>
            <circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle>
          </svg>
        </div>

        <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-1">CampusRide</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-6">Choose your preferred language / भाषा निवडा / अपनी भाषा चुनें</p>

        <div class="space-y-3">
          <button class="lang-pick-btn w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-left flex items-center justify-between group transition" data-lang="en">
            <div class="flex items-center gap-3">
              <span class="text-2xl">🇬🇧</span>
              <div>
                <div class="font-bold text-slate-900 dark:text-white text-base">English</div>
                <div class="text-xs text-slate-500">Default campus interface</div>
              </div>
            </div>
            <span class="text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition">→</span>
          </button>

          <button class="lang-pick-btn w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-left flex items-center justify-between group transition" data-lang="mr">
            <div class="flex items-center gap-3">
              <span class="text-2xl">🇮🇳</span>
              <div>
                <div class="font-bold text-slate-900 dark:text-white text-base">मराठी (Marathi)</div>
                <div class="text-xs text-slate-500">कॅम्पस वाहतूक प्रणाली</div>
              </div>
            </div>
            <span class="text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition">→</span>
          </button>

          <button class="lang-pick-btn w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-left flex items-center justify-between group transition" data-lang="hi">
            <div class="flex items-center gap-3">
              <span class="text-2xl">🇮🇳</span>
              <div>
                <div class="font-bold text-slate-900 dark:text-white text-base">हिन्दी (Hindi)</div>
                <div class="text-xs text-slate-500">परिसर परिवहन प्रणाली</div>
              </div>
            </div>
            <span class="text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition">→</span>
          </button>
        </div>

        <p class="text-[11px] text-slate-400 mt-6">You can change this anytime from Settings.</p>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll('.lang-pick-btn').forEach(btn => {
      btn.onclick = () => {
        const lang = btn.getAttribute('data-lang');
        window.i18n.setLanguage(lang);
        modal.remove();
        if (window.sounds) window.sounds.playWelcome();
        window.location.reload();
      };
    });
  }
}

window.LanguageGate = LanguageGate;
