// Real-app smoke test: node scripts/e2e.js  (needs a display; use xvfb-run on Linux)
const { _electron: electron } = require('playwright-core');
const path = require('path'); const fs = require('fs'); const os = require('os');
(async () => {
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'big-'));
  const app = await electron.launch({ args: [path.join(__dirname, '..'), '--no-sandbox', '--user-data-dir=' + ud], cwd: path.join(__dirname, '..') });
  const w = await app.firstWindow(); const errs = []; w.on('pageerror', (e) => errs.push(e.message)); w.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await w.setViewportSize({ width: 1280, height: 820 }); await w.waitForSelector('.nav');
  const shot = (n) => w.screenshot({ path: path.join(process.env.SHOTS || ud, n + '.png') });
  const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
  // settings
  await w.click('.nav >> nth=3'); await w.fill('.card input[maxlength="120"]', 'Bunnys Framelab'); await w.click('.btn.primary'); await w.waitForSelector('.toast');
  // client
  await w.click('.nav >> nth=2'); await w.click('.btn.primary'); await w.fill('.modal input >> nth=0', 'Acme Studio'); await w.fill('.modal input[type=email]', 'hello@acme.test'); await w.click('.modal .btn.primary'); await w.waitForSelector('td b');
  ok((await w.textContent('td b')) === 'Acme Studio', 'client created');
  // invoice
  await w.click('.nav >> nth=1'); await w.click('.btn.primary >> nth=-1');
  await w.selectOption('select >> nth=3', { index: 1 }).catch(() => {}); 
  await w.selectOption('.card select[aria-label="Client"]', { index: 1 });
  await w.fill('.items-t input >> nth=0', 'Logo design <img src=x onerror=alert(1)>'); await w.fill('.items-t input >> nth=1', '2'); await w.fill('.items-t input >> nth=2', '1500');
  const tot = await w.textContent('.totals .big'); ok(/3,?000/.test(tot), 'live total ' + tot.trim());
  await shot('editor');
  await w.click('.btn.primary >> text=Sent'); await w.waitForSelector('iframe.pv');
  await w.waitForTimeout(600); await shot('detail');
  ok(errs.length === 0, 'no console/page errors ' + errs.join('|'));
  // XSS check: injected img must not exist in DOM of the app, and iframe is sandboxed w/o scripts
  ok((await w.locator('img[src="x"]').count()) === 0, 'no XSS img in app DOM');
  await w.click('.btn >> text=Record payment').catch(() => {}); await w.waitForSelector('.modal'); await w.click('.modal .btn.primary'); await w.waitForTimeout(500);
  ok((await w.textContent('.pill')).includes('Paid'), 'payment marks paid');
  await w.click('.nav >> nth=0'); await w.waitForTimeout(700); await shot('dashboard');
  // preload surface/isolation
  ok(await w.evaluate(() => typeof require === 'undefined' && typeof process === 'undefined'), 'no node access in renderer');
  ok(await w.evaluate(async () => { try { await fetch('https://example.com'); return false; } catch (_) { return true; } }), 'network blocked');
  const ext = await w.evaluate(() => window.api.openExternal('https://evil.example')); ok(ext.ok === false, 'external link allowlist enforced');
  const bad = await w.evaluate(() => window.api.saveInvoice({ id: '../x', items: [] })); ok(bad.ok === false, 'bad IPC payload rejected');
  const enc = fs.existsSync(path.join(ud, 'data', 'data.bin')); ok(enc, 'data file written'); 
  await app.close(); fs.rmSync(ud, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
