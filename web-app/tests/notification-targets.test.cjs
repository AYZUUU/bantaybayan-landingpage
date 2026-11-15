const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("../node_modules/typescript");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "utils", "notificationTargets.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api, encodeURIComponent });

test("notification paths identify the report or account", () => {
  const accountId = "11111111-1111-4111-8111-111111111111";
  assert.equal(api.reportNotificationPath(42), "/incidents?report=42");
  assert.equal(api.accountNotificationPath(accountId), `/superadmin?account=${accountId}`);
  assert.equal(api.accountNotificationPath("invalid"), "/superadmin");
});

test("login only restores authorized notification destinations", () => {
  const accountPath = "/superadmin?account=11111111-1111-4111-8111-111111111111";
  assert.equal(api.safeNotificationReturnPath("/incidents?report=42", "admin"), "/incidents?report=42");
  assert.equal(api.safeNotificationReturnPath(accountPath, "superadmin"), accountPath);
  assert.equal(api.safeNotificationReturnPath(accountPath, "admin"), null);
  assert.equal(api.safeNotificationReturnPath("//example.test", "superadmin"), null);
  assert.equal(api.safeNotificationReturnPath("/incidents?report=42&next=other", "admin"), null);
  assert.equal(api.safeNotificationReturnPath("/incidents?report=999999999999999999999", "admin"), null);
});
