const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("../node_modules/typescript");

class FakeElement {
  constructor(cluster = null) { this.cluster = cluster; }
  closest(selector) { return selector === ".incident-map-cluster, .incident-map-expanded-cluster" ? this.cluster : null; }
}

const source = fs.readFileSync(path.join(__dirname, "..", "src", "utils", "clusterTouch.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api, Element: FakeElement, Math, Array });

function setup(openResult = true) {
  const handlers = new Map();
  const cluster = new FakeElement();
  const target = new FakeElement(cluster);
  const opened = [];
  const container = {
    contains: (element) => element === cluster,
    addEventListener: (name, handler) => handlers.set(name, handler),
    removeEventListener: (name) => handlers.delete(name),
  };
  const cleanup = api.listenForClusterTaps(container, (element) => {
    opened.push(element);
    return openResult;
  });
  const touch = (x, y, identifier = 1) => ({ clientX: x, clientY: y, identifier });
  return {
    cluster, opened, handlers, cleanup, touch,
    start(touches = [touch(10, 10)], timeStamp = 100, eventTarget = target) {
      handlers.get("touchstart")({ touches, timeStamp, target: eventTarget });
    },
    end(changedTouches = [touch(10, 10)], timeStamp = 200, touches = []) {
      let prevented = false;
      handlers.get("touchend")({
        touches, changedTouches, timeStamp,
        preventDefault: () => { prevented = true; },
      });
      return prevented;
    },
  };
}

test("a cluster tap expands once and suppresses its synthetic click", () => {
  const fixture = setup();
  fixture.start();
  assert.equal(fixture.end(), true);
  assert.deepEqual(fixture.opened, [fixture.cluster]);
  fixture.cleanup();
  assert.equal(fixture.handlers.size, 0);
});

test("pans, long presses, cancelled and multi-touch gestures do not expand", () => {
  const fixture = setup();
  fixture.start(); assert.equal(fixture.end([fixture.touch(30, 10)]), false);
  fixture.start(); assert.equal(fixture.end([fixture.touch(10, 10)], 700), false);
  fixture.start(); fixture.handlers.get("touchcancel")(); assert.equal(fixture.end(), false);
  fixture.start([fixture.touch(10, 10), fixture.touch(20, 20, 2)]); assert.equal(fixture.end(), false);
  fixture.start(); assert.equal(fixture.end([fixture.touch(10, 10, 2)]), false);
  fixture.start([fixture.touch(10, 10)], 100, new FakeElement()); assert.equal(fixture.end(), false);
  assert.equal(fixture.opened.length, 0);
});

test("an unresolved cluster leaves the normal browser click available", () => {
  const fixture = setup(false);
  fixture.start();
  assert.equal(fixture.end(), false);
});
