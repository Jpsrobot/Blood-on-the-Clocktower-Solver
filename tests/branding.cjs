// Independent app-branding regression checks (no browser or npm modules required).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const APP_NAME = '血濡れた時計台ヘルパー';
let passed = 0;
function test(label, fn) { fn(); passed++; console.log(`PASS branding: ${label}`); }
function pngSize(p) {
  const b = fs.readFileSync(path.join(root,p));
  assert.equal(b.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
  return [b.readUInt32BE(16),b.readUInt32BE(20)];
}
test('one Japanese display name in branding module', () => {
  assert(read('src/branding.ts').includes(`APP_NAME = '${APP_NAME}'`));
});
test('home screen uses shared name and artwork', () => {
  const s=read('src/App.tsx');
  assert(s.includes('<h1>{APP_NAME}</h1>'));
  assert(s.includes('src={APP_ICON_URL}'));
});
test('runtime title, icons and manifest are registered', () => {
  const s=read('src/main.tsx');
  for(const part of ['document.title = APP_NAME','brandingLink(\'icon\'','brandingLink(\'apple-touch-icon\'','brandingLink(\'manifest\'']) assert(s.includes(part));
});
test('original square artwork is included unchanged in app source', () => {
  assert.deepEqual(pngSize('src/assets/app-icon.png'),[960,960]);
});
test('web manifest displays exact Japanese app name', () => {
  const data=JSON.parse(read('public/manifest.webmanifest'));
  assert.equal(data.name,APP_NAME);
  assert.equal(data.short_name,APP_NAME);
  assert.deepEqual(pngSize('public/app-icon-192.png'),[192,192]);
  assert.deepEqual(pngSize('public/app-icon-512.png'),[512,512]);
});
test('web icon and maskable variant both exist', () => {
  assert.deepEqual(pngSize('public/app-icon-maskable-512.png'),[512,512]);
  assert.deepEqual(pngSize('public/apple-touch-icon.png'),[180,180]);
  assert(fs.existsSync(path.join(root,'public/favicon.ico')));
});
test('Android launcher resources cover all densities and adaptive icons', () => {
  for(const [density,size] of Object.entries({mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192})) {
    const prefix=`android_branding/res/mipmap-${density}/`;
    assert.deepEqual(pngSize(prefix+'ic_launcher.png'),[size,size]);
    assert.deepEqual(pngSize(prefix+'ic_launcher_round.png'),[size,size]);
    assert.deepEqual(pngSize(prefix+'ic_launcher_foreground.png'),[size*108/48,size*108/48]);
  }
  assert(read('android_branding/res/mipmap-anydpi-v26/ic_launcher.xml').includes('@mipmap/ic_launcher_foreground'));
  assert(read('android_branding/res/mipmap-anydpi-v26/ic_launcher_round.xml').includes('@drawable/ic_launcher_background'));
});
console.log(`Branding checks: ${passed}/${passed} passed`);
