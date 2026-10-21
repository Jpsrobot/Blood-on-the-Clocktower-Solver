const fs = require('node:fs');
const path = require('node:path');
const { test } = require('../harness.cjs');
const { assert, validateSnapshot, saveSnapshot, loadSnapshot } = require('../fixtures.cjs');

for (const name of ['tb-legacy', 'bmr-grandmother', 'snv', 'custom']) {
  test(`Baseline ${name} save roundtrips without losing fields`, () => {
    const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, '../saves', `${name}.json`), 'utf8'));
    const previous = global.localStorage;
    const entries = new Map();
    global.localStorage = {
      getItem: key => entries.get(key) ?? null,
      setItem: (key, value) => entries.set(key, String(value)),
      removeItem: key => entries.delete(key),
    };
    try {
      assert(validateSnapshot(snapshot));
      assert(saveSnapshot(snapshot));
      assert.deepEqual(loadSnapshot(), snapshot);
      assert.deepEqual(JSON.parse(JSON.stringify(loadSnapshot())), snapshot);
    } finally {
      global.localStorage = previous;
    }
  });
}
