// Real Chromium, localStorage and application workers; no source-text assertions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.BOTC_TEST_PORT || 4179);
const url = `http://127.0.0.1:${port}`;
const saveKey = 'clocktower.ja.snapshot.v2';
const backupKey = 'clocktower.ja.snapshot.backup.v2';
const server = spawn(process.execPath, [path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let browser;

async function stored(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey);
}
async function waitForSave(page, expected) {
  await page.waitForFunction(({ key, expected }) => {
    const game = JSON.parse(localStorage.getItem(key));
    return game && Object.entries(expected).every(([field, value]) => game[field] === value);
  }, { key: saveKey, expected });
}
async function rename(page, name) {
  await page.locator('.player-button').filter({ has: page.locator('.player-seat', { hasText: /^1L$/ }) }).click();
  await page.getByRole('button', { name: 'プレイヤー情報', exact: true }).click();
  await page.getByLabel('名前', { exact: true }).fill(name);
  await page.getByRole('button', { name: '確定', exact: true }).click();
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await page.waitForFunction(({ key, name }) => JSON.parse(localStorage.getItem(key))?.playerNames['1L'] === name, { key: saveKey, name });
}

(async () => {
  const deadline = Date.now() + 20000;
  while (true) {
    if (server.exitCode !== null) throw new Error(`Vite stopped: ${serverOutput}`);
    try { if ((await fetch(url)).ok) break; } catch {}
    if (Date.now() > deadline) throw new Error(`Vite did not start: ${serverOutput}`);
    await delay(100);
  }
  browser = await chromium.launch({ headless: true, ...(process.env.BOTC_CHROMIUM_PATH ? { executablePath: process.env.BOTC_CHROMIUM_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 393, height: 851 } });
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.accept());
  await page.goto(url);
  await page.getByRole('heading', { name: '血濡れた時計台ヘルパー' }).waitFor();
  await page.getByRole('button', { name: 'ゲーム開始', exact: true }).click();
  await page.locator('select').first().selectOption('9');
  await page.getByRole('button', { name: '開始', exact: true }).click();
  await waitForSave(page, { playerCount: 9, night: 1 });
  assert.equal(await page.locator('.player-button:disabled').count(), 6);
  await rename(page, '直樹');
  const beforeAdvance = await stored(page);
  await page.getByRole('button', { name: '次の夜', exact: true }).click();
  await waitForSave(page, { night: 2 });
  await rename(page, '変更後');
  await page.getByRole('button', { name: 'メニュー', exact: true }).click();
  await page.getByRole('button', { name: '夜を戻す', exact: true }).click();
  await waitForSave(page, { night: 1 });
  assert.deepEqual(await stored(page), beforeAdvance, 'Undo restores the entire pre-night game');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.reload();
  await page.getByRole('button', { name: '続きから', exact: true }).click();
  assert.deepEqual(await stored(page), beforeAdvance, 'Reload and resume retain Japanese names and game data');
  console.log('PASS browser: Japanese UI, nine seats, full undo, pagehide, reload and resume');

  for (const name of ['tb-legacy', 'bmr-grandmother', 'snv', 'custom']) {
    const game = JSON.parse(fs.readFileSync(path.join(__dirname, 'saves', `${name}.json`), 'utf8'));
    await page.evaluate(({ key, game }) => { localStorage.clear(); localStorage.setItem(key, JSON.stringify(game)); }, { key: saveKey, game });
    await page.reload();
    await page.getByRole('button', { name: '続きから', exact: true }).click();
    await waitForSave(page, { playset: game.playset });
    const resumed = await stored(page);
    assert.deepEqual(resumed.selfInfoLog, game.selfInfoLog);
    assert.deepEqual(resumed.selfRole, game.selfRole);
    if (game.scriptRoleIds) assert.deepEqual(resumed.scriptRoleIds, game.scriptRoleIds);
    await page.reload();
    await page.getByRole('button', { name: '続きから', exact: true }).waitFor();
    console.log(`PASS browser: ${name} resume and second reload`);
  }

  await page.evaluate(({ saveKey, backupKey, game }) => {
    localStorage.clear(); localStorage.setItem(saveKey, '{broken');
    localStorage.setItem(backupKey, JSON.stringify(game));
  }, { saveKey, backupKey, game: beforeAdvance });
  await page.reload();
  await page.getByRole('button', { name: '保存データを救出する', exact: true }).waitFor();
  assert.equal(await page.evaluate(key => localStorage.getItem(key), saveKey), '{broken');
  await page.getByRole('button', { name: '続きから', exact: true }).click();
  await waitForSave(page, { playerCount: 9 });
  assert.deepEqual(await stored(page), beforeAdvance);
  assert.deepEqual(errors, [], 'No browser runtime exceptions');
  console.log('PASS browser: corrupt-primary recovery with valid backup; no runtime exceptions');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  server.kill();
});
