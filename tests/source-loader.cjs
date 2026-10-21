// Load a TS/TSX entry for Node-side worker, hook and server-render regressions.
// Runtime dependencies already built by tests/run.cjs use their compiled output.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function loadSource(entry, mocks = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const source = fs.readFileSync(file, 'utf8').replaceAll('import.meta.url', JSON.stringify(`file://${file}`));
    const code = ts.transpileModule(source, { fileName: file, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const localRequire = name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (!name.startsWith('.')) return require(name);
      const base = path.resolve(path.dirname(file), name);
      const compiled = path.join(root, '.engine-test', path.relative(path.join(root, 'src'), base)) + '.js';
      if (fs.existsSync(compiled)) return require(compiled);
      const target = ['.ts', '.tsx'].map(ext => base + ext).find(f => fs.existsSync(f));
      if (!target) throw new Error(`Cannot resolve ${name} from ${file}`);
      return load(target);
    };
    new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
    return module.exports;
  }
  return load(path.resolve(root, entry));
}
module.exports = { loadSource };
