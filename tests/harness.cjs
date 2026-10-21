const fs = require('node:fs');
const path = require('node:path');
const tests = [];

function test(name, fn) {
  try {
    fn();
    tests.push({ name, passed: true });
    console.log('PASS', name);
  } catch (error) {
    tests.push({ name, passed: false, error: String(error) });
    console.error('FAIL', name, error.message);
    process.exitCode = 1;
  }
}

function finish(output = path.join(__dirname, 'results.json')) {
  const passed = tests.filter(test => test.passed).length;
  console.log(`\n${passed}/${tests.length} tests passed`);
  if (output) fs.writeFileSync(output, JSON.stringify({ passed, total: tests.length, tests }, null, 2));
}

module.exports = { test, finish };
