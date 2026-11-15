const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("../node_modules/typescript");

function setup({ profile = { id_photo_path: "reporter/id.jpg" }, error = null, signingError = null } = {}) {
  const calls = [];
  const supabase = {
    from(table) {
      calls.push(["from", table]);
      return {
        select(columns) {
          calls.push(["select", columns]);
          return {
            eq(column, value) {
              calls.push(["eq", column, value]);
              return { maybeSingle: async () => ({ data: profile, error }) };
            },
            order: async () => ({
              data: [{ id: 1, user_id: "citizen", image_path: null }],
              error: null,
            }),
          };
        },
      };
    },
  };
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "utils", "reports.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(id) {
      if (id === "./supabase") return { supabase };
      if (id === "./storageUrls") return {
        getCachedSignedStorageUrl: async (bucket, storagePath) => {
          calls.push(["signed", bucket, storagePath]);
          if (signingError) throw signingError;
          return "https://example.test/signed";
        },
      };
      throw new Error(`Unexpected dependency: ${id}`);
    },
    console,
  });
  return { api: exports, calls };
}

test("loads only the requested reporter's private ID using a signed URL", async () => {
  const { api, calls } = setup();
  assert.equal(await api.getReporterIdPhoto("citizen"), "https://example.test/signed");
  assert.deepEqual(calls, [
    ["from", "profiles"],
    ["select", "id_photo_path"],
    ["eq", "id", "citizen"],
    ["signed", "id-photos", "reporter/id.jpg"],
  ]);
});

test("distinguishes a missing ID from profile access errors", async () => {
  const missing = setup({ profile: { id_photo_path: null } });
  assert.equal(await missing.api.getReporterIdPhoto("citizen"), null);
  assert.equal(missing.calls.some(([kind]) => kind === "signed"), false);
  await assert.rejects(setup({ profile: null }).api.getReporterIdPhoto("citizen"), /account is unavailable/);
  await assert.rejects(
    setup({ error: { message: "permission denied" } }).api.getReporterIdPhoto("citizen"),
    /permission denied/,
  );
  await assert.rejects(
    setup({ signingError: new Error("storage unavailable") }).api.getReporterIdPhoto("citizen"),
    /storage unavailable/,
  );
});

test("dashboard report queries retain the reporter account ID", async () => {
  const { api, calls } = setup();
  const reports = await api.getAdminReports();
  assert.equal(reports[0].user_id, "citizen");
  assert.match(calls.find(([kind]) => kind === "select")[1], /\buser_id\b/);
});
