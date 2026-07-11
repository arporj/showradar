// Service worker for both Web Push and PWA installability. Deliberately not
// an offline-first cache — this app is data-heavy (TMDb/library state changes
// constantly), so a network-first passthrough avoids ever serving stale
// content; the fetch handler below exists only to satisfy installability
// criteria (Chrome/Android require an active SW with a fetch listener).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "ShowRadar", body: event.data.text() };
  }

  const title = payload.title || "ShowRadar";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    data: { url: payload.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = clientsList.find((client) => client.url.includes(targetUrl));
      if (existing) {
        await existing.focus();
        return;
      }
      const anyClient = clientsList[0];
      if (anyClient) {
        await anyClient.navigate(targetUrl);
        await anyClient.focus();
        return;
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
