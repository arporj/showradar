// Minimal service worker for Web Push — just enough to receive a push
// event, show a notification, and route a click to the right page. Not a
// full PWA install/offline setup (that's a separate, later step); this file
// can be extended or replaced by a precaching-aware service worker then
// without touching the push logic below.

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
    icon: "/next.svg",
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
