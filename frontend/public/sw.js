/* LAAS24 PWA — minimal SW for installability; do not intercept full page loads. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Let the browser handle HTML navigations — avoids "network error" when fetch() rejects.
  if (req.mode === "navigate") {
    return;
  }
  event.respondWith(
    fetch(req).catch(() => {
      const url = req.url || "";
      if (url.includes("/api/")) {
        return new Response(JSON.stringify({ error: "offline", categories: [] }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("", { status: 503, statusText: "Network error" });
    })
  );
});
