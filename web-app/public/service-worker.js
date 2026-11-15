self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || "A new BantayBayan alert is available." };
  }

  const reportMatch = /^report-([1-9]\d*)$/.exec(payload.tag || "");
  const accountMatch = /^account-approval-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(payload.tag || "");
  const reportId = reportMatch && Number.isSafeInteger(Number(reportMatch[1]))
    ? reportMatch[1]
    : null;
  const accountId = accountMatch ? accountMatch[1] : null;
  const targetUrl =
    payload.event === "account_approval_requested" && accountId
      ? `/superadmin?account=${accountId}`
      : (payload.event === "report_created" || payload.event === "backup_requested" ||
          (!payload.event && payload.url === "/incidents")) && reportId
        ? `/incidents?report=${reportId}`
        : payload.url || "/incidents";
  const title = payload.title || "BantayBayan alert";
  const options = {
    body: payload.body || "Open BantayBayan to view the update.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: payload.tag || "bantaybayan-alert",
    data: { url: targetUrl },
  };
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    payload.event === "account_approval_requested"
      ? self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
          for (const client of clients) {
            client.postMessage({ type: "account_approval_requested", accountId });
          }
        })
      : Promise.resolve(),
  ]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    event.notification.data?.url || "/incidents",
    self.location.origin,
  );
  const targetUrl = target.origin === self.location.origin
    ? target.href
    : new URL("/incidents", self.location.origin).href;

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
