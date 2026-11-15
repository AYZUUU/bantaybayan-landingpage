const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("push notifications identify records and clicks stay on the dashboard", async () => {
  const handlers = {};
  const notices = [];
  const messages = [];
  const navigated = [];
  const client = {
    url: "https://dashboard.test/dashboard",
    postMessage: (message) => messages.push(message),
    focus: async () => client,
    navigate: async (url) => navigated.push(url),
  };
  const self = {
    addEventListener: (name, handler) => { handlers[name] = handler; },
    location: { origin: "https://dashboard.test" },
    registration: { showNotification: async (_title, options) => notices.push(options) },
    clients: { matchAll: async () => [client] },
  };
  const source = fs.readFileSync(path.join(__dirname, "..", "public", "service-worker.js"), "utf8");
  vm.runInNewContext(source, { self, URL, Promise });
  let pending;
  const accountId = "11111111-1111-4111-8111-111111111111";
  for (const payload of [
    { event: "account_approval_requested", tag: `account-approval-${accountId}`, url: "/superadmin" },
    { event: "report_created", tag: "report-42", url: "/incidents" },
    { tag: "report-43", url: "/incidents" },
    { event: "account_approval_requested", tag: "invalid", url: "/superadmin" },
  ]) {
    handlers.push({
      data: { json: () => payload },
      waitUntil: (promise) => { pending = promise; },
    });
    await pending;
  }
  assert.equal(notices[0].data.url, `/superadmin?account=${accountId}`);
  assert.equal(messages[0].accountId, accountId);
  assert.equal(notices[1].data.url, "/incidents?report=42");
  assert.equal(notices[2].data.url, "/incidents?report=43");
  assert.equal(notices[3].data.url, "/superadmin");

  for (const url of [notices[1].data.url, "https://other.test/"]) {
    handlers.notificationclick({
      notification: { data: { url }, close() {} },
      waitUntil: (promise) => { pending = promise; },
    });
    await pending;
  }
  assert.deepEqual(navigated, [
    "https://dashboard.test/incidents?report=42",
    "https://dashboard.test/incidents",
  ]);
});
