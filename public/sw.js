// PotroNET Service Worker — Online only, no cache
// All requests pass through to the network. If network fails, show offline page.

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sin conexión — PotroNET</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #0a0a0a;
      color: #fff;
      font-family: system-ui, sans-serif;
      text-align: center;
      padding: 2rem;
    }
    .orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(80px);
      pointer-events: none;
      opacity: 0.4;
    }
    .orb-1 { width: 300px; height: 300px; background: #3b82f6; top: -100px; left: -100px; }
    .orb-2 { width: 250px; height: 250px; background: #8b5cf6; bottom: -80px; right: -80px; }
    .icon { font-size: 4rem; margin-bottom: 1.5rem; }
    h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 0.75rem; }
    p { color: #888; font-size: 1rem; margin-bottom: 2rem; max-width: 320px; }
    button {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: #fff;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 9999px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="icon">📡</div>
  <h1>Sin conexión</h1>
  <p>PotroNET necesita conexión a internet para funcionar. Conéctate e inténtalo de nuevo.</p>
  <button onclick="location.reload()">Reintentar</button>
</body>
</html>`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Only handle GET navigation requests for offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(OFFLINE_HTML, {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      })
    );
    return;
  }

  // All other requests: pass through to network, no caching
  event.respondWith(fetch(event.request));
});
