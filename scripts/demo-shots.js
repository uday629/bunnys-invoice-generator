// Dev-only: seeds fictional demo data in a temp profile and captures README screenshots + verifies PDF output.
const { _electron: electron } = require('playwright-core');
const path = require('path'); const fs = require('fs'); const os = require('os');
(async () => {
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'big-demo-')); const out = path.join(__dirname, '..', 'docs', 'img');
  const app = await electron.launch({ args: [path.join(__dirname, '..'), '--no-sandbox', '--user-data-dir=' + ud] });
  const w = await app.firstWindow(); await w.setViewportSize({ width: 1360, height: 860 }); await w.waitForSelector('.nav');
  const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'logo.png')).toString('base64');
  await w.evaluate(async (logo) => {
    const st = (await window.api.getState()).data; const s = st.settings;
    s.business = { name: 'Bunnys Framelab', email: 'hello@example.com', phone: '+880 1700-000000', address: 'Dhaka, Bangladesh', taxId: '', website: 'framelabmedia.odoo.com', logo };
    s.paymentDetails = 'bKash: 01700-000000\nBank: Example Bank · A/C 0000 0000'; s.defaultTaxRate = 5;
    await window.api.saveSettings(s);
    const names = ['Nova Studio', 'Pixel & Co.', 'Riya Rahman', 'Orbit Media']; const cl = [];
    for (const n of names) cl.push((await window.api.saveClient({ name: n, email: n.split(/[ &]/)[0].toLowerCase() + '@example.com', phone: '', address: 'Dhaka', taxId: '' })).data);
    const d = (o) => { const x = new Date(); x.setDate(x.getDate() + o); return x.toISOString().slice(0, 10); };
    const mk = (i, c, issue, due, items, status, pay) => ({ number: 'INV-' + (1000 + i), status, issueDate: d(issue), dueDate: d(due), currency: 'BDT', clientId: cl[c].id, client: { name: cl[c].name, email: cl[c].email, phone: '', address: 'Dhaka', taxId: '' }, items, discount: { type: 'fixed', value: 0 }, shipping: 0, payments: pay || [], notes: 'Thank you for your business!', terms: 'Payment due by the date above.', template: 'modern', poNumber: '' });
    const L = [
      mk(1, 0, -150, -136, [{ description: 'Brand identity package', qty: 1, price: 45000, taxRate: 5 }], 'sent', [{ date: d(-140), amount: 47250, method: 'Bank' }]),
      mk(2, 1, -110, -96, [{ description: 'Product photography (20 shots)', qty: 20, price: 1500, taxRate: 5 }], 'sent', [{ date: d(-100), amount: 31500, method: 'bKash' }]),
      mk(3, 2, -80, -66, [{ description: 'Wedding highlight film', qty: 1, price: 60000, taxRate: 0 }], 'sent', [{ date: d(-70), amount: 60000, method: 'Cash' }]),
      mk(4, 3, -50, -36, [{ description: 'Social media motion pack', qty: 5, price: 7000, taxRate: 5 }], 'sent', [{ date: d(-40), amount: 36750, method: 'Bank' }]),
      mk(5, 0, -35, -21, [{ description: 'Website redesign — phase 1', qty: 1, price: 85000, taxRate: 5 }], 'sent', [{ date: d(-25), amount: 40000, method: 'bKash' }]),
      mk(6, 1, -20, -6, [{ description: 'Logo animation', qty: 1, price: 18000, taxRate: 5 }, { description: 'Sound design', qty: 1, price: 6000, taxRate: 5 }], 'sent'),
      mk(7, 3, -9, 5, [{ description: 'YouTube channel edit (monthly)', qty: 8, price: 4500, taxRate: 0 }], 'sent'),
      mk(8, 2, -2, 12, [{ description: 'Portrait session', qty: 1, price: 12000, taxRate: 0 }], 'draft'),
    ];
    for (const i of L) { const r = await window.api.saveInvoice(i); if (!r.ok) throw new Error(r.error); }
  }, logo);
  await w.reload(); await w.waitForSelector('.nav'); await w.waitForTimeout(800);
  await w.screenshot({ path: path.join(out, 'dashboard.png') });
  await w.click('.nav >> nth=1'); await w.waitForTimeout(300); await w.screenshot({ path: path.join(out, 'invoices.png') });
  await w.click('tr.row >> nth=4'); await w.waitForSelector('iframe.pv'); await w.waitForTimeout(900); await w.screenshot({ path: path.join(out, 'invoice.png') });
  await w.click('.nav >> nth=3'); await w.waitForTimeout(300); await w.screenshot({ path: path.join(out, 'settings.png') });
  // verify real PDF generation in the main process
  const pdf = await app.evaluate(async ({ BrowserWindow }, dir) => {
    const path = process.getBuiltinModule('node:path'); const req = process.getBuiltinModule('node:module').createRequire(path.join(dir, 'x.js')); const { renderInvoice } = req('./src/main/render-invoice.js');
    const inv = { number: 'T-1', status: 'sent', issueDate: '2026-01-01', dueDate: '2026-01-15', currency: 'BDT', client: { name: 'বাংলা 日本語 Ünï Test' }, items: [{ description: 'any-language text', qty: 1, price: 100, taxRate: 0 }], discount: { type: 'fixed', value: 0 }, shipping: 0, payments: [], template: 'modern', notes: '', terms: '' };
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } });
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(renderInvoice(inv, { language: 'en', business: { name: 'B', logo: '' }, paymentDetails: '' })));
    const b = await win.webContents.printToPDF({ pageSize: 'A4', printBackground: true }); win.destroy(); return b.toString('base64');
  }, path.join(__dirname, '..'));
  const buf = Buffer.from(pdf, 'base64'); fs.writeFileSync(path.join(ud, 't.pdf'), buf);
  console.log(buf.subarray(0, 5).toString() === '%PDF-' && buf.length > 5000 ? 'PASS pdf generated (' + buf.length + ' bytes)' : 'FAIL pdf');
  fs.copyFileSync(path.join(ud, 't.pdf'), '/tmp/shots/t.pdf');
  await app.close(); fs.rmSync(ud, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
