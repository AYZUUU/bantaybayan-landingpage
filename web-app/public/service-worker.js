self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || "A new BantayBayan alert is available." };
  }

  const title = payload.title || "BantayBayan alert";
  const options = {
    body: payload.body || "Open BantayBayan to view the update.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: payload.tag || "bantaybayan-alert",
    data: { url: payload.url || "/incidents" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(
    event.notification.data?.url || "/incidents",
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url.startsWith(self.location.origin));
      if (existingClient) {
        return existingClient.focus().then(() => existingClient.navigate(targetUrl));
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
