'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, session, safeStorage, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const Calc = require('../shared/calc');
const V = require('../shared/validate');
const { Store, uid, nowIso, withTotals, DEFAULTS } = require('./store');
const { renderInvoice } = require('./render-invoice');

const ALLOWED_EXTERNAL = new Set(['https://framelabmedia.odoo.com/', 'https://www.instagram.com/bunnysframelab/']);
const PAGE = path.join(__dirname, '..', 'renderer', 'index.html');
const isDev = !app.isPackaged;
let win; let store;

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

function safeError(e) {
  if (e instanceof V.ValidationError) return { ok: false, error: e.message };
  console.error('[error]', e && e.code ? e.code : 'internal'); // never log data/stack to user
  return { ok: false, error: 'Something went wrong. Please try again.' };
}
/** Only the app's own window/frame may call IPC. */
function trusted(e) {
  try { return e.senderFrame && e.senderFrame.url === require('url').pathToFileURL(PAGE).href && win && e.sender === win.webContents; } catch (_) { return false; }
}
function handle(channel, fn) {
  ipcMain.handle(channel, async (e, ...args) => {
    if (!trusted(e)) return { ok: false, error: 'Forbidden' };
    try { return { ok: true, data: await fn(...args) }; } catch (err) { return safeError(err); }
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 980, minHeight: 640, show: false, backgroundColor: '#08080A', title: 'Bunnys Invoice Generator',
    icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true,
      webSecurity: true, allowRunningInsecureContent: false, spellcheck: false, devTools: isDev,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(PAGE);
  win.webContents.setWindowOpenHandler(({ url }) => { openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (url !== require('url').pathToFileURL(PAGE).href) { e.preventDefault(); openExternal(url); } });
  win.webContents.on('will-attach-webview', (e) => e.preventDefault());
  win.on('closed', () => { win = null; });
}
function openExternal(url) { if (ALLOWED_EXTERNAL.has(url)) shell.openExternal(url); }

function hardenSession() {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_wc, _p, cb) => cb(false));
  ses.setPermissionCheckHandler(() => false);
  // Offline app: block every network request except local files/data.
  ses.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*', 'ftp://*/*'] }, (_d, cb) => cb({ cancel: true }));
  ses.webRequest.onHeadersReceived((d, cb) => cb({ responseHeaders: d.responseHeaders }));
}

async function pdfBuffer(html) {
  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false, contextIsolation: true, nodeIntegration: false, offscreen: false } });
  try {
    await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    return await w.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { marginType: 'none' } });
  } finally { w.destroy(); }
}
const safeName = (s) => String(s).replace(/[^\w.\- ]+/g, '_').slice(0, 80) || 'invoice';

function register() {
  const S = () => store.data;
  handle('app:info', () => ({ version: app.getVersion(), platform: process.platform, encrypted: store.encrypted }));
  handle('state:get', () => ({
    settings: S().settings, clients: S().clients, invoices: S().invoices.map(withTotals),
  }));
  handle('settings:save', (s) => store.mutate((d) => { d.settings = V.settings(s); return d.settings; }));

  handle('client:save', (c) => store.mutate((d) => {
    const v = V.client(c);
    if (v.id) {
      const i = d.clients.findIndex((x) => x.id === v.id); if (i < 0) throw new V.ValidationError('Client not found');
      d.clients[i] = { ...d.clients[i], ...v, updatedAt: nowIso() }; return d.clients[i];
    }
    if (d.clients.length >= 5000) throw new V.ValidationError('Client limit reached');
    const n = { ...v, id: uid(), createdAt: nowIso() }; d.clients.push(n); return n;
  }));
  handle('client:delete', (id) => store.mutate((d) => { V.id(id, 'Client id'); d.clients = d.clients.filter((c) => c.id !== id); return true; }));

  handle('invoice:save', (inv) => store.mutate((d) => {
    const v = V.invoice(inv);
    if (v.id) {
      const i = d.invoices.findIndex((x) => x.id === v.id); if (i < 0) throw new V.ValidationError('Invoice not found');
      d.invoices[i] = { ...d.invoices[i], ...v, updatedAt: nowIso() }; return withTotals(d.invoices[i]);
    }
    if (d.invoices.length >= 50000) throw new V.ValidationError('Invoice limit reached');
    if (d.invoices.some((x) => x.number === v.number)) throw new V.ValidationError('Invoice number already exists');
    v.payments = v.payments.map((p) => ({ ...p, id: p.id || uid() }));
    const n = { ...v, id: uid(), createdAt: nowIso() }; d.invoices.push(n);
    // advance counter when the number used matches the pattern
    const m = String(n.number).match(/(\d+)$/);
    if (m && n.number === d.settings.numberPrefix + m[1]) d.settings.nextNumber = Math.max(d.settings.nextNumber, parseInt(m[1], 10) + 1);
    return withTotals(n);
  }));
  handle('invoice:delete', (id) => store.mutate((d) => { V.id(id, 'Invoice id'); d.invoices = d.invoices.filter((x) => x.id !== id); return true; }));
  handle('invoice:html', (id) => { V.id(id, 'Invoice id'); const inv = S().invoices.find((x) => x.id === id); if (!inv) throw new V.ValidationError('Invoice not found'); return renderInvoice(inv, S().settings); });
  handle('invoice:previewDraft', (inv) => renderInvoice(V.invoice(inv), S().settings));
  handle('invoice:pdf', async (id) => {
    V.id(id, 'Invoice id');
    const inv = S().invoices.find((x) => x.id === id); if (!inv) throw new V.ValidationError('Invoice not found');
    const r = await dialog.showSaveDialog(win, { defaultPath: safeName(inv.number) + '.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (r.canceled || !r.filePath) return { saved: false };
    await fs.promises.writeFile(r.filePath, await pdfBuffer(renderInvoice(inv, S().settings)));
    return { saved: true };
  });

  handle('data:exportBackup', async () => {
    const r = await dialog.showSaveDialog(win, { defaultPath: `bunnys-backup-${nowIso().slice(0, 10)}.json`, filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (r.canceled || !r.filePath) return { saved: false };
    await fs.promises.writeFile(r.filePath, JSON.stringify(S(), null, 2), { mode: 0o600 });
    return { saved: true };
  });
  handle('data:importBackup', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (r.canceled || !r.filePaths[0]) return { restored: false };
    const stat = await fs.promises.stat(r.filePaths[0]);
    if (stat.size > 50 * 1024 * 1024) throw new V.ValidationError('Backup file is too large');
    let raw; try { raw = JSON.parse(await fs.promises.readFile(r.filePaths[0], 'utf8')); } catch (_) { throw new V.ValidationError('Not a valid backup file'); }
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.invoices) || !Array.isArray(raw.clients)) throw new V.ValidationError('Not a valid backup file');
    // Re-validate everything; keep only server-side ids/timestamps we can trust.
    const clean = DEFAULTS();
    clean.settings = V.settings(raw.settings);
    clean.clients = raw.clients.slice(0, 5000).map((c) => ({ ...V.client(c), id: V.id(c.id, 'Client id') }));
    clean.invoices = raw.invoices.slice(0, 50000).map((i) => ({ ...V.invoice(i), id: V.id(i.id, 'Invoice id'), createdAt: nowIso() }));
    await store.mutate((d) => { d.settings = clean.settings; d.clients = clean.clients; d.invoices = clean.invoices; });
    return { restored: true };
  });
  handle('data:exportCsv', async () => {
    const r = await dialog.showSaveDialog(win, { defaultPath: 'bunnys-invoices.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] });
    if (r.canceled || !r.filePath) return { saved: false };
    // Neutralise spreadsheet formula injection (CSV injection).
    const cell = (v) => { let s = String(v === undefined || v === null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const rows = [['Number', 'Client', 'Issue date', 'Due date', 'Status', 'Currency', 'Subtotal', 'Tax', 'Total', 'Paid', 'Balance']];
    S().invoices.forEach((i) => { const t = Calc.compute(i); rows.push([i.number, i.client.name, i.issueDate, i.dueDate, Calc.status(i), i.currency, t.subtotal, t.tax, t.total, t.paid, t.balance]); });
    await fs.promises.writeFile(r.filePath, '﻿' + rows.map((x) => x.map(cell).join(',')).join('\r\n'), { mode: 0o600 });
    return { saved: true };
  });
  handle('external:open', (url) => { if (typeof url !== 'string' || !ALLOWED_EXTERNAL.has(url)) throw new V.ValidationError('Link not allowed'); shell.openExternal(url); return true; });
  handle('app:print', async (id) => {
    V.id(id, 'Invoice id');
    const inv = S().invoices.find((x) => x.id === id); if (!inv) throw new V.ValidationError('Invoice not found');
    const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } });
    await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(renderInvoice(inv, S().settings)));
    await new Promise((res) => w.webContents.print({ printBackground: true }, () => res()));
    w.destroy(); return true;
  });
}

app.whenReady().then(() => {
  store = new Store(path.join(app.getPath('userData'), 'data'), safeStorage);
  store.load();
  hardenSession(); register();
  Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]) : null);
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('web-contents-created', (_e, c) => { c.on('will-attach-webview', (ev) => ev.preventDefault()); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
