// Service worker mínimo: permite instalar la app. No guarda nada en caché
// (las reservas siempre se piden en directo al servidor).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
