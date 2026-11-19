// CampusRide — Progressive Web App Service Worker (v7.4)
// High-Speed App Shell Caching & Instant Cold-Start Masking
const CACHE_NAME = 'campusride-app-v7.4';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/driver.html',
  '/parent.html',
  '/staff.html',
  '/admin.html',
  '/favicon.svg',
  '/favicon.ico',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/favicon-32x32.png',
  '/assets/favicon-16x16.png',
  '/css/app.css',
  '/manifest.json',
  '/js/sounds.js?v=5.4',
  '/js/i18n.js?v=5.4',
  '/js/api.js?v=5.4',
  '/js/qr.js?v=5.4',
  '/js/components/Header.js?v=5.4',
  '/js/components/LanguageGate.js?v=5.4',
  '/js/pages/Login.js?v=5.4',
  '/js/pages/StaffRegister.js?v=5.4',
  '/js/pages/DriverRegister.js?v=5.4',
  '/js/pages/ParentRegister.js?v=5.4',
  '/js/pages/ForgotPassword.js?v=5.4',
  '/js/pages/ForgotUsername.js?v=5.4',
  '/js/pages/AdminDashboard.js?v=5.4',
  '/js/pages/StaffHome.js?v=5.4',
  '/js/pages/EntryExitScanner.js?v=5.4',
  '/js/pages/RegistrationScanner.js?v=5.4',
  '/js/pages/VanRegister.js?v=5.4',
  '/js/pages/DriversRegistry.js?v=5.4',
  '/js/pages/DriverHome.js?v=5.4',
  '/js/pages/ParentHome.js?v=5.4',
  '/js/pages/Directories.js?v=5.4',
  '/js/pages/WorkingStaff.js?v=5.4',
  '/js/pages/Settings.js?v=5.4',
  '/js/app.js?v=5.4'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) => cache.add(url).catch(() => {}))
      );
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // 1. Never cache API routes, SSE, or non-GET calls
  if (url.pathname.startsWith('/api/') || req.method !== 'GET') {
    return;
  }

  // 2. Navigation requests (HTML pages): Fast Network with Cache Fallback
  // If Render takes > 1.2s to respond (cold boot), instantly return cached HTML!
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      new Promise((resolve) => {
        let timedOut = false;
        const timer = setTimeout(async () => {
          timedOut = true;
          const cached = await caches.match(req) || await caches.match('/index.html');
          if (cached) resolve(cached);
        }, 1200);

        fetch(req)
          .then(async (networkRes) => {
            clearTimeout(timer);
            if (networkRes && networkRes.ok) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(req, networkRes.clone());
            }
            if (!timedOut) resolve(networkRes);
          })
          .catch(async () => {
            clearTimeout(timer);
            const cached = await caches.match(req) || await caches.match('/index.html');
            if (cached) resolve(cached);
          });
      })
    );
    return;
  }

  // 3. Static assets: Stale-while-revalidate for instant load
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((networkRes) => {
        if (networkRes && networkRes.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, networkRes.clone()));
        }
        return networkRes;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
