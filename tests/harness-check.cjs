// A failed assertion must fail the process while allowing later tests to run.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const harness = require.resolve('./harness.cjs');
const run = spawnSync(process.execPath, ['-e', `
  const { test, finish } = require(${JSON.stringify(harness)});
  test('intentional failure', () => { throw new Error('expected'); });
  test('later test still runs', () => {});
  finish(null);
`], { encoding: 'utf8' });
assert.ifError(run.error);
assert.equal(run.status, 1);
assert.match(run.stderr, /FAIL intentional failure/);
assert.match(run.stdout, /PASS later test still runs/);
assert.match(run.stdout, /1\/2 tests passed/);
console.log('PASS harness failure propagation');
