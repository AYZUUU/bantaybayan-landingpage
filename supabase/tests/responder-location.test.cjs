const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function setup(options = {}) {
  let running = options.running ?? false;
  let task;
  const calls = [];
  const location = options.location ?? {
    timestamp: Date.now(),
    coords: { latitude: 14.5, longitude: 121 },
  };
  const native = {
    Accuracy: { Balanced: 3 },
    requestForegroundPermissionsAsync: async () => ({ granted: options.foreground !== false }),
    requestBackgroundPermissionsAsync: async () => ({ granted: options.background !== false }),
    hasServicesEnabledAsync: async () => true,
    getCurrentPositionAsync: async () => location,
    hasStartedLocationUpdatesAsync: async () => running,
    startLocationUpdatesAsync: async () => {
      calls.push("start");
      if (options.startFails) throw new Error("start failed");
      running = true;
    },
    stopLocationUpdatesAsync: async () => { calls.push("stop"); running = false; },
  };
  const supabase = {
    auth: { getSession: async () => ({ data: { session: options.session === false ? null : {} }, error: null }) },
    rpc: async (name, args) => {
      calls.push([name, args]);
      if (name === "start_responder_location_sharing") {
        return { data: options.count !== 0, error: null };
      }
      return { data: options.count ?? 1, error: null };
    },
  };
  const source = fs.readFileSync(path.join(__dirname, "..", "..", "services", "responderLocation.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(id) {
      if (id === "expo-location") return native;
      if (id === "expo-constants") return {
        __esModule: true,
        default: { executionEnvironment: options.expoGo ? "storeClient" : "standalone" },
        ExecutionEnvironment: { StoreClient: "storeClient" },
      };
      if (id === "expo-task-manager") return {
        isTaskDefined: () => false,
        defineTask: (_name, fn) => { task = fn; },
      };
      if (id === "react-native") return { Platform: { OS: "android" } };
      if (id === "./supabase") return { supabase };
      throw new Error(`Unexpected dependency: ${id}`);
    },
    console: { error() {} },
  });
  return { api: exports, task, calls, location };
}

test("Expo Go cannot enable background sharing or publish a location", async () => {
  const state = setup({ expoGo: true });
  await assert.rejects(state.api.startResponderLocation(), /not supported in Expo Go/);
  assert.equal(state.calls.length, 0);
});

test("sharing requires background permission and an assigned response", async () => {
  const denied = setup({ background: false });
  await assert.rejects(denied.api.startResponderLocation(), /Allow location all the time/);
  assert.equal(denied.calls.length, 0);

  const unassigned = setup({ count: 0 });
  await assert.rejects(unassigned.api.startResponderLocation(), /No eligible active citizen response/);
  assert.equal(unassigned.calls.some((call) => call === "start"), false);
});

test("stale locations are rejected and failed startup clears the shared position", async () => {
  const stale = setup({ location: { timestamp: Date.now() - 120000, coords: { latitude: 14.5, longitude: 121 } } });
  await assert.rejects(stale.api.startResponderLocation(), /outdated location/);
  assert.equal(stale.calls[0][0], "start_responder_location_sharing");
  assert.equal(stale.calls[1][0], "clear_my_responder_live_locations");

  const failed = setup({ startFails: true });
  await assert.rejects(failed.api.startResponderLocation(), /start failed/);
  assert.equal(failed.calls[0][0], "start_responder_location_sharing");
  assert.equal(failed.calls[1][0], "update_responder_live_location");
  assert.equal(failed.calls[3][0], "clear_my_responder_live_locations");
});

test("background sharing stops when no eligible response remains", async () => {
  const state = setup({ running: true, count: 0 });
  await state.task({ data: { locations: [state.location] }, error: null });
  assert.equal(state.calls[0][0], "update_responder_live_location");
  assert.equal(state.calls[1], "stop");
  assert.equal(state.calls[2][0], "clear_my_responder_live_locations");
});

test("stopping inactive sharing does not contact the server unless retrying cleanup", async () => {
  const state = setup();
  await state.api.stopResponderLocation();
  assert.equal(state.calls.length, 0);
  await state.api.stopResponderLocation(true);
  assert.equal(state.calls[0][0], "clear_my_responder_live_locations");
});
