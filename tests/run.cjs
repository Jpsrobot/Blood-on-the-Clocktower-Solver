// Run from the existing Vite project's root: node tests/run.cjs
// Uses TypeScript already installed by the React + TypeScript Vite template.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
let compiler;
try {
  compiler = require.resolve('typescript/bin/tsc', { paths: [root] });
} catch {
  console.error('TypeScript was not found. Run npm install in your existing project, then try again.');
  process.exit(1);
}
const build = spawnSync(process.execPath, [compiler, '-p', 'tsconfig.engine.json'], { cwd: root, stdio: 'inherit' });
if (build.error) { console.error(build.error.message); process.exit(1); }
if (build.status !== 0) process.exit(build.status || 1);
// Vite uses type:module; the isolated rule tests intentionally compile to CommonJS.
fs.mkdirSync(path.join(root, '.engine-test'), { recursive: true });
fs.writeFileSync(path.join(root, '.engine-test', 'package.json'), JSON.stringify({ private: true, type: 'commonjs' }));
const run = spawnSync(process.execPath, [path.join(__dirname, 'engine.cjs')], { cwd: root, stdio: 'inherit' });
if (run.error) { console.error(run.error.message); process.exit(1); }
process.exit(run.status || 0);
