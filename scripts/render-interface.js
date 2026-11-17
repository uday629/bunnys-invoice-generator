const { chromium } = require('playwright-core'); const path = require('path');
(async () => { const b = await chromium.launch({ args: ['--no-sandbox'], executablePath: process.env.CHROME || undefined }); const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.join(__dirname, '..', 'docs', 'interface.html')); await p.waitForTimeout(500); await p.screenshot({ path: path.join(__dirname, '..', 'docs', 'interface.png'), fullPage: true }); await b.close(); })();
