const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..", "..");
const userId = "11111111-1111-4111-8111-111111111111";

function loadFunction(relativePath, createClient, webPush, fetchMock) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics.length, 0);
  let handler;
  const env = {
    SUPABASE_URL: "https://example.test",
    SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "service",
    VAPID_PUBLIC_KEY: "public",
    VAPID_PRIVATE_KEY: "private",
    VAPID_SUBJECT: "mailto:test@example.test",
  };
  vm.runInNewContext(compiled.outputText, {
    require: (id) => {
      if (id.startsWith("https://esm.sh/")) return { createClient };
      if (id === "npm:web-push@3.6.7") return webPush;
      throw new Error(`Unexpected import: ${id}`);
    },
    exports: {},
    Deno: { env: { get: (name) => env[name] }, serve: (fn) => { handler = fn; } },
    Request,
    Response,
    File,
    fetch: fetchMock,
    crypto,
    console: { error() {} },
  });
  return handler;
}

function post(body, token = "service") {
  return new Request("https://example.test", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("approval push is internal-only and targets active superadmins", async () => {
  const filters = [];
  const sent = [];
  let applicationStatus = "pending";
  const adminClient = {
    from(table) {
      let id;
      const query = {
        select() { return this; },
        eq(column, value) {
          filters.push([table, column, value]);
          if (column === "id") id = value;
          return this;
        },
        in(column, value) { filters.push([table, column, value]); return this; },
        maybeSingle: async () => ({
          data: table === "reports"
            ? { id: 42, user_id: null, emergency_type: "Fire", status: "Pending" }
            : id === "caller"
              ? { role: "admin", status: "active" }
              : { id: userId, role: "citizen", status: applicationStatus },
          error: null,
        }),
        then(resolve) {
          resolve({
            data: table === "profiles"
              ? [{ id: "superadmin-id" }]
              : [{ id: "sub", endpoint: "https://push.test", p256dh: "key", auth: "auth" }],
            error: null,
          });
        },
      };
      return query;
    },
  };
  const createClient = (_url, key) => key === "service"
    ? adminClient
    : { auth: { getUser: async () => ({ data: { user: { id: "caller" } }, error: null }) } };
  const push = {
    setVapidDetails() {},
    async sendNotification(subscription, payload) {
      sent.push({ subscription, payload: JSON.parse(payload) });
    },
  };
  const handler = loadFunction("supabase/functions/notify-report-event/index.ts", createClient, push);
  const body = { event: "account_approval_requested", userId };

  const result = await handler(post(body));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).sent, 1);
  assert.ok(filters.some(([table, column, value]) => table === "profiles" && column === "role" && value === "superadmin"));
  assert.ok(filters.some(([table, column, value]) => table === "profiles" && column === "status" && value === "active"));
  assert.ok(filters.some(([table, column, value]) => table === "web_push_subscriptions" && column === "user_id" && value[0] === "superadmin-id"));
  assert.equal(sent[0].payload.url, "/superadmin");
  assert.equal(sent[0].payload.event, body.event);
  assert.equal(sent[0].payload.body, "A new account is waiting for review.");

  const denied = await handler(post(body, "user"));
  assert.equal(denied.status, 403);
  assert.equal(sent.length, 1);
  const invalid = await handler(post({ ...body, userId: "invalid" }));
  assert.equal(invalid.status, 400);
  applicationStatus = "active";
  const alreadyApproved = await handler(post(body));
  assert.equal(alreadyApproved.status, 404);
  assert.equal(sent.length, 1);
  const report = await handler(post({ event: "report_created", reportId: 42 }));
  assert.equal(report.status, 200);
  assert.equal(sent[1].payload.event, "report_created");
  assert.equal(sent[1].payload.url, "/incidents");
});

test("failed notification does not undo a successful registration", async () => {
  let deleted = false;
  let notification;
  const adminClient = {
    auth: { admin: {
      createUser: async () => ({ data: { user: { id: userId } }, error: null }),
      deleteUser: async () => { deleted = true; return { error: null }; },
    } },
    storage: { from: () => ({
      upload: async () => ({ error: null }),
      remove: async () => { deleted = true; return { error: null }; },
    }) },
    from: () => ({
      update() { return this; },
      eq() { return this; },
      select() { return this; },
      maybeSingle: async () => ({ data: { id: userId }, error: null }),
    }),
  };
  const handler = loadFunction(
    "supabase/functions/register-user/index.ts",
    () => adminClient,
    null,
    async (_url, options) => {
      notification = JSON.parse(options.body);
      return new Response("unavailable", { status: 503 });
    },
  );
  const form = new FormData();
  for (const [key, value] of Object.entries({
    first_name: "Test", last_name: "User", contact_number: "123",
    email: "test@example.test", password: "password123", role: "responder",
  })) form.set(key, value);
  form.set("photo", new File(["test"], "id.jpg", { type: "image/jpeg" }));

  const result = await handler(new Request("https://example.test", { method: "POST", body: form }));
  assert.equal(result.status, 200);
  assert.deepEqual(notification, { event: "account_approval_requested", userId });
  assert.equal(deleted, false);
});

test("service worker displays approval notification and refreshes open queue", async () => {
  const handlers = {};
  const notices = [];
  const messages = [];
  const self = {
    addEventListener: (name, handler) => { handlers[name] = handler; },
    registration: { showNotification: async (title, options) => { notices.push({ title, options }); } },
    clients: { matchAll: async () => [{ postMessage: (message) => messages.push(message) }] },
  };
  const source = fs.readFileSync(path.join(root, "web-app/public/service-worker.js"), "utf8");
  vm.runInNewContext(source, { self, URL, Promise });
  let pending;
  handlers.push({
    data: { json: () => ({ title: "Account approval needed", url: "/superadmin", event: "account_approval_requested" }) },
    waitUntil: (promise) => { pending = promise; },
  });
  await pending;
  assert.equal(notices[0].options.data.url, "/superadmin");
  assert.equal(messages[0].type, "account_approval_requested");
});
