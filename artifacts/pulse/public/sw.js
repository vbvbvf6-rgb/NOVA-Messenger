const CACHE_NAME = "pulse-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.postMessage({ type: "notification-click", url });
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener("push", (e) => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || "Pulse", {
      body: data.body || "",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      data: { url: data.url || "/" },
      vibrate: [100, 50, 100],
      tag: data.tag || "pulse-message",
      renotify: true,
    })
  );
});

self.addEventListener("message", (e) => {
  if (e.data?.type === "show-notification") {
    const { title, body, icon, url, tag } = e.data;
    self.registration.showNotification(title, {
      body,
      icon: icon || "/favicon.svg",
      badge: "/favicon.svg",
      data: { url: url || "/" },
      vibrate: [100, 50, 100],
      tag: tag || "pulse-message",
      renotify: true,
      silent: false,
    });
  }
});
