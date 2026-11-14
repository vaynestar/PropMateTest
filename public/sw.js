/*
 * The minimum service worker that makes PropMate installable.
 *
 * Chrome will not fire `beforeinstallprompt` — so no "Install app" button can
 * ever appear — unless the site registers a service worker that handles the
 * `fetch` event. That is the only reason this file exists.
 *
 * It deliberately caches NOTHING.
 *
 * PropMate is behind a session cookie, and every interesting page is a
 * per-user server render: one resident's invoices, another's unit, the
 * admin's tenant list. A cache-first or stale-while-revalidate worker would
 * store those responses under a URL key with no notion of who they belonged
 * to, and hand them to whoever asked next on that device — the resident
 * demo phone passed between UAT participants being exactly that case.
 *
 * Offline support is a roadmap item (04 Index Roadmap Stack § B). When it is
 * built it must cache only the static shell and public assets, never a
 * response to an authenticated request.
 */

self.addEventListener("install", () => {
  // Take over straight away rather than waiting for every tab to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass straight through. Present only to satisfy the installability check.
  event.respondWith(fetch(event.request));
});
