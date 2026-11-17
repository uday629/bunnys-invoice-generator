(() => {
'use strict';
const { Calc, I18N } = window;
const api = window.api;
const root = document.getElementById('app');
const S = { settings: null, clients: [], invoices: [], view: 'dashboard', param: null, info: {}, dirty: false, filter: { q: '', st: 'all' }, cq: '' };
const t = (k) => I18N.T('en', k);
const locale = () => 'en-US';
const money = (n, c) => Calc.format(n, c || S.settings.currency, locale());
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fdate = (iso) => { try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }); } catch (_) { return iso; } };

/* Safe DOM builder: text is always a text node, never HTML. */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  kids.flat(Infinity).forEach((c) => { if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return el;
}
const ICON = {
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z', invoices: 'M6 2h9l5 5v15H6V2zm8 1.5V8h4.5L14 3.5zM8 12h8v1.6H8V12zm0 4h8v1.6H8V16z',
  clients: 'M16 11a3 3 0 100-6 3 3 0 000 6zm-8 0a3 3 0 100-6 3 3 0 000 6zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .1 1.2.8 2 1.9 2 3.4V19h6v-2.5c0-2.3-4.700-3.500-7-3.500z',
  settings: 'M19.4 13a7.800 7.800 0 000-2l2-1.600-2-3.400-2.400 1a7.500 7.500 0 00-1.700-1L15 3h-4l-.4 3a7.500 7.500 0 00-1.700 1l-2.400-1-2 3.400 2 1.600a7.800 7.800 0 000 2l-2 1.600 2 3.400 2.400-1c.5.400 1.100.7 1.700 1l.4 3h4l.4-3c.6-.3 1.200-.6 1.700-1l2.400 1 2-3.400-2-1.600zM13 15.500a3.500 3.500 0 110-7 3.500 3.500 0 010 7z',
  about: 'M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
};
const icon = (n) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'currentColor'); s.setAttribute('aria-hidden', 'true'); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', ICON[n]); s.append(p); return s; };

function toast(msg, kind) { const el = h('div', { class: 'toast ' + (kind || '') }, msg); document.getElementById('toasts').append(el); setTimeout(() => el.remove(), 3500); }
async function call(p, okMsg) { const r = await p; if (!r.ok) { toast(r.error || t('failed'), 'err'); throw new Error('handled'); } if (okMsg) toast(okMsg, 'ok'); return r.data; }
async function reload() { S.__ = await call(api.getState()); S.settings = S.__.settings; Calc.setCustom(S.settings.customCurrencies || []); S.clients = S.__.clients; S.invoices = S.__.invoices; }

function modal(title, body, { wide, actions } = {}) {
  const prev = document.activeElement;
  const close = () => { bg.remove(); document.removeEventListener('keydown', esc); if (prev && prev.focus) prev.focus(); };
  const esc = (e) => { if (e.key === 'Escape') close(); };
  const bg = h('div', { class: 'modal-bg', onclick: (e) => { if (e.target === bg) close(); } },
    h('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, h('h2', {}, title), body, actions ? h('div', { class: 'actions' }, actions(close)) : null));
  document.addEventListener('keydown', esc); document.body.append(bg);
  const f = bg.querySelector('input,select,textarea,button'); if (f) f.focus();
  return close;
}
function confirmBox(msg) { return new Promise((res) => { modal(t('delete'), h('p', {}, msg), { actions: (close) => [h('button', { class: 'btn', onclick: () => { close(); res(false); } }, t('cancel')), h('button', { class: 'btn danger', onclick: () => { close(); res(true); } }, t('delete'))] }); }); }

function field(label, input, id) { const i = id || 'f' + Math.random().toString(36).slice(2, 8); input.id = i; return h('div', { class: 'field' }, h('label', { for: i }, label), input); }
const inp = (v, o = {}) => h('input', { type: o.type || 'text', value: v === undefined ? '' : v, maxlength: o.max || 200, placeholder: o.ph, step: o.step, min: o.min, 'data-k': o.k, oninput: o.on });

/* ---------- Router ---------- */
function go(view, param) {
  if (S.dirty && !confirm(t('unsaved'))) return;
  S.dirty = false; S.view = view; S.param = param || null; render();
}
const VIEWS = { dashboard, invoices, editor, detail, clients, settings, about };
function render() {
  const main = h('main', { class: 'main', tabindex: '-1' }, VIEWS[S.view]());
  const nav = (id) => h('button', { class: 'nav' + ((S.view === id || (id === 'invoices' && (S.view === 'editor' || S.view === 'detail'))) ? ' on' : ''), onclick: () => go(id), 'aria-current': S.view === id ? 'page' : null }, icon(id), h('span', {}, t(id)));
  root.replaceChildren(h('aside', { class: 'side' },
    h('div', { class: 'brand' }, h('img', { src: 'logo.png', alt: '' }), h('div', {}, h('b', {}, 'Bunnys'), h('span', {}, t('app').replace('Bunnys ', '')))),
    nav('dashboard'), nav('invoices'), nav('clients'), nav('settings'), h('div', { class: 'grow' }), nav('about'),
    h('div', { class: 'foot' }, 'Made by Bunnys Framelab', h('br'), h('a', { onclick: () => api.openExternal('https://framelabmedia.odoo.com/') }, 'Website'), ' · ', h('a', { onclick: () => api.openExternal('https://www.instagram.com/bunnysframelab/') }, 'Instagram'))), main);
}
const head = (title, ...right) => h('div', { class: 'head' }, h('h1', {}, title), h('div', { class: 'chips' }, right));
const badge = (inv) => { const s = inv.effectiveStatus; return h('span', { class: 'pill s-' + s }, t('status_' + s)); };
const emptyBox = (a, b, btn) => h('div', { class: 'empty' }, h('img', { src: 'logo.png', alt: '' }), h('b', {}, a), h('div', {}, b), btn ? h('div', { style: 'margin-top:16px' }, btn) : null);

/* ---------- Dashboard ---------- */
function dashboard() {
  const byCur = {};
  S.invoices.forEach((i) => { if (i.effectiveStatus === 'draft' || i.effectiveStatus === 'void') return; const c = (byCur[i.currency] = byCur[i.currency] || { total: 0, paid: 0, bal: 0, od: 0 }); c.total += i.totals.total; c.paid += i.totals.paid; c.bal += i.totals.balance; if (i.effectiveStatus === 'overdue') c.od++; });
  const cur = Object.keys(byCur).sort((a, b) => (a === S.settings.currency ? -1 : b === S.settings.currency ? 1 : a.localeCompare(b)));
  const sum = (k, fmt) => cur.length ? cur.map((c) => fmt ? money(byCur[c][k], c) : byCur[c][k]).join(' · ') : (fmt ? money(0) : '0');
  const stat = (k, v) => h('div', { class: 'card stat' }, h('div', { class: 'k' }, k), h('div', { class: 'v' }, v));
  const od = cur.reduce((s, c) => s + byCur[c].od, 0);
  // last 6 months bar chart, default currency
  const months = []; const d0 = new Date(); for (let n = 5; n >= 0; n--) { const d = new Date(d0.getFullYear(), d0.getMonth() - n, 1); months.push({ key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), label: d.toLocaleDateString(locale(), { month: 'short' }), v: 0 }); }
  S.invoices.forEach((i) => { if (i.currency !== S.settings.currency || i.effectiveStatus === 'draft' || i.effectiveStatus === 'void') return; const m = months.find((x) => x.key === i.issueDate.slice(0, 7)); if (m) m.v += i.totals.total; });
  const max = Math.max(1, ...months.map((m) => m.v));
  const recent = [...S.invoices].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 6);
  return h('div', {}, head(t('dashboard'), h('button', { class: 'btn primary', onclick: () => go('editor') }, '+ ' + t('new_invoice'))),
    h('div', { class: 'grid g4' }, stat(t('revenue'), sum('total', true)), stat(t('collected'), sum('paid', true)), stat(t('outstanding'), sum('bal', true)), stat(t('overdue_count'), String(od))),
    h('div', { class: 'grid', style: 'grid-template-columns:2fr 3fr;margin-top:16px' },
      h('div', { class: 'card' }, h('h2', {}, t('revenue') + ' · ' + S.settings.currency), h('div', { class: 'bars' }, months.map((m) => h('div', { class: 'bar' }, h('i', { style: `height:${Math.max(2, (m.v / max) * 100)}%`, title: money(m.v) }), h('span', {}, m.label))))),
      h('div', { class: 'card' }, h('h2', {}, t('recent')), recent.length ? invoiceTable(recent) : emptyBox(t('empty_invoices'), t('empty_invoices_sub'), h('button', { class: 'btn primary', onclick: () => go('editor') }, '+ ' + t('new_invoice'))))));
}
function invoiceTable(list) {
  return h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, t('number')), h('th', {}, t('client')), h('th', {}, t('due_date')), h('th', {}, t('filter_status')), h('th', { class: 'r' }, t('total')))),
    h('tbody', {}, list.map((i) => h('tr', { class: 'row', tabindex: '0', onclick: () => go('detail', i.id), onkeydown: (e) => { if (e.key === 'Enter') go('detail', i.id); } },
      h('td', {}, h('b', {}, i.number)), h('td', {}, i.client.name), h('td', {}, fdate(i.dueDate)), h('td', {}, badge(i)), h('td', { class: 'r' }, money(i.totals.total, i.currency))))));
}

/* ---------- Invoices list ---------- */
function invoices() {
  const wrap = h('div', {}); const body = h('div', { class: 'card' });
  const draw = () => {
    const q = S.filter.q.toLowerCase();
    const list = S.invoices.filter((i) => (S.filter.st === 'all' || i.effectiveStatus === S.filter.st) && (!q || (i.number + ' ' + i.client.name).toLowerCase().includes(q))).sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.number.localeCompare(a.number));
    body.replaceChildren(!S.invoices.length ? emptyBox(t('empty_invoices'), t('empty_invoices_sub'), h('button', { class: 'btn primary', onclick: () => go('editor') }, '+ ' + t('new_invoice'))) : list.length ? invoiceTable(list) : emptyBox(t('no_results'), ''));
  };
  const sel = h('select', { 'aria-label': t('filter_status'), onchange: (e) => { S.filter.st = e.target.value; draw(); } }, ['all', 'draft', 'sent', 'partial', 'paid', 'overdue', 'void'].map((s) => h('option', { value: s, selected: S.filter.st === s }, s === 'all' ? t('all') : t('status_' + s))));
  wrap.append(head(t('invoices'), h('button', { class: 'btn', onclick: () => call(api.exportCsv()).then((r) => r.saved && toast(t('saved'), 'ok')).catch(() => {}) }, t('export_csv')), h('button', { class: 'btn primary', onclick: () => go('editor') }, '+ ' + t('new_invoice'))),
    h('div', { class: 'toolbar' }, h('input', { type: 'search', placeholder: t('search'), 'aria-label': t('search'), value: S.filter.q, maxlength: 80, oninput: (e) => { S.filter.q = e.target.value; draw(); } }), sel), body);
  draw(); return wrap;
}

/* ---------- Editor ---------- */
function blankInvoice() {
  const s = S.settings; const issue = today();
  return { number: s.numberPrefix + s.nextNumber, status: 'draft', issueDate: issue, dueDate: addDays(issue, s.defaultDueDays), currency: s.currency, client: { name: '', email: '', phone: '', address: '', taxId: '' }, clientId: '',
    items: [{ description: '', qty: 1, price: 0, taxRate: s.defaultTaxRate }], discount: { type: 'fixed', value: 0 }, shipping: 0, payments: [], notes: s.defaultNotes, terms: s.defaultTerms, template: s.template, poNumber: '' };
}
function editor() {
  const existing = S.param ? S.invoices.find((i) => i.id === S.param) : null;
  const inv = existing ? JSON.parse(JSON.stringify(existing)) : (S.dup || blankInvoice()); S.dup = null;
  const totalsBox = h('div', { class: 'totals' }); const errBox = h('div', { class: 'err-msg', role: 'alert' });
  const mark = () => { S.dirty = true; };
  const upd = () => { const tt = Calc.compute(inv); const row = (k, v, c) => h('div', { class: c }, h('span', {}, k), h('b', {}, v));
    totalsBox.replaceChildren(row(t('subtotal'), money(tt.subtotal, inv.currency)), tt.discount ? row(t('discount'), '−' + money(tt.discount, inv.currency)) : '', tt.tax ? row(t('tax'), money(tt.tax, inv.currency)) : '', tt.shipping ? row(t('shipping'), money(tt.shipping, inv.currency)) : '', row(t('total'), money(tt.total, inv.currency), 'big')); };
  const bind = (obj, key, o = {}) => (e) => { obj[key] = o.num ? e.target.value : e.target.value; mark(); upd(); };
  const itemsBody = h('tbody', {});
  const drawItems = () => {
    itemsBody.replaceChildren(...inv.items.map((it, n) => h('tr', {},
      h('td', { style: 'width:44%' }, h('input', { value: it.description, maxlength: 500, 'aria-label': t('description'), placeholder: t('description'), oninput: (e) => { it.description = e.target.value; mark(); } })),
      h('td', {}, h('input', { type: 'number', min: 0, step: 'any', value: it.qty, 'aria-label': t('qty'), oninput: (e) => { it.qty = e.target.value; mark(); upd(); } })),
      h('td', {}, h('input', { type: 'number', step: 'any', value: it.price, 'aria-label': t('price'), oninput: (e) => { it.price = e.target.value; mark(); upd(); } })),
      h('td', {}, h('input', { type: 'number', min: 0, max: 100, step: 'any', value: it.taxRate, 'aria-label': t('tax') + ' %', oninput: (e) => { it.taxRate = e.target.value; mark(); upd(); } })),
      h('td', { class: 'r', style: 'width:100px' }, h('button', { class: 'btn sm danger', 'aria-label': t('remove'), disabled: inv.items.length < 2, onclick: () => { inv.items.splice(n, 1); mark(); drawItems(); upd(); } }, '✕')))));
  };
  const clientSel = h('select', { 'aria-label': t('client'), onchange: (e) => { const c = S.clients.find((x) => x.id === e.target.value); if (c) { inv.clientId = c.id; inv.client = { name: c.name, email: c.email, phone: c.phone, address: c.address, taxId: c.taxId }; mark(); drawClient(); } } },
    h('option', { value: '' }, t('select_client')), S.clients.map((c) => h('option', { value: c.id, selected: inv.clientId === c.id }, c.name)));
  const clientBox = h('div', {}); const drawClient = () => clientBox.replaceChildren(
    h('div', { class: 'row2' }, field(t('name') + ' *', inp(inv.client.name, { on: (e) => { inv.client.name = e.target.value; mark(); }, max: 120 })), field(t('email'), inp(inv.client.email, { type: 'email', max: 254, on: (e) => { inv.client.email = e.target.value; mark(); } }))),
    h('div', { class: 'row3' }, field(t('phone'), inp(inv.client.phone, { max: 40, on: (e) => { inv.client.phone = e.target.value; mark(); } })), field(t('address'), inp(inv.client.address, { max: 400, on: (e) => { inv.client.address = e.target.value; mark(); } })), field(t('tax_id'), inp(inv.client.taxId, { max: 60, on: (e) => { inv.client.taxId = e.target.value; mark(); } }))));
  const curSel = h('select', { 'aria-label': t('currency'), onchange: (e) => { inv.currency = e.target.value; mark(); upd(); } }, Object.keys(Calc.CURRENCIES).map((c) => h('option', { value: c, selected: inv.currency === c }, c + ' ' + Calc.CURRENCIES[c])));
  const tplSel = h('select', { onchange: (e) => { inv.template = e.target.value; mark(); } }, ['modern', 'classic', 'minimal'].map((x) => h('option', { value: x, selected: inv.template === x }, t('theme_' + x))));
  const discType = h('select', { 'aria-label': t('discount'), onchange: (e) => { inv.discount.type = e.target.value; mark(); upd(); } }, h('option', { value: 'fixed', selected: inv.discount.type === 'fixed' }, t('fixed')), h('option', { value: 'percent', selected: inv.discount.type === 'percent' }, t('percent')));
  async function save(status, after) {
    errBox.textContent = ''; inv.status = status || (inv.status === 'void' ? 'void' : inv.status);
    try { const saved = await call(api.saveInvoice(inv), t('invoice_saved')); S.dirty = false; await reload(); after === 'preview' ? go('detail', saved.id) : go('detail', saved.id); } catch (e) { if (e.message !== 'handled') throw e; const m = document.querySelector('.toast.err:last-child'); errBox.textContent = m ? m.textContent : ''; }
  }
  drawItems(); drawClient(); upd();
  return h('div', {}, head(existing ? t('edit') + ' ' + inv.number : t('new_invoice'),
    h('button', { class: 'btn', onclick: () => { S.dirty = false; existing ? go('detail', existing.id) : go('invoices'); } }, t('cancel')),
    h('button', { class: 'btn', onclick: async () => { try { const html = await call(api.previewDraft(inv)); showPreview(html); } catch (e) { if (e.message !== 'handled') throw e; } } }, t('preview')),
    h('button', { class: 'btn', onclick: () => save('draft') }, t('save') + ' · ' + t('status_draft')),
    h('button', { class: 'btn primary', onclick: () => save('sent') }, t('save') + ' · ' + t('status_sent'))),
  errBox,
  h('div', { class: 'grid', style: 'grid-template-columns:1fr' },
    h('div', { class: 'card' }, h('div', { class: 'row4' }, field(t('number') + ' *', inp(inv.number, { max: 40, on: bind(inv, 'number') })), field(t('issue_date'), inp(inv.issueDate, { type: 'date', on: bind(inv, 'issueDate') })), field(t('due_date'), inp(inv.dueDate, { type: 'date', on: bind(inv, 'dueDate') })), field(t('currency'), curSel)),
      h('div', { class: 'row2' }, field(t('po_number'), inp(inv.poNumber, { max: 60, on: bind(inv, 'poNumber') })), field(t('template'), tplSel))),
    h('div', { class: 'card' }, h('h2', {}, t('bill_to')), field(t('client'), clientSel), clientBox),
    h('div', { class: 'card' }, h('h2', {}, t('items')), h('table', { class: 'items-t' }, h('thead', {}, h('tr', {}, h('th', {}, t('description')), h('th', {}, t('qty')), h('th', {}, t('price')), h('th', {}, t('tax') + ' %'), h('th', {}))), itemsBody),
      h('button', { class: 'btn sm', style: 'margin-top:10px', onclick: () => { if (inv.items.length < 200) { inv.items.push({ description: '', qty: 1, price: 0, taxRate: S.settings.defaultTaxRate }); mark(); drawItems(); upd(); } } }, '+ ' + t('add_item')),
      h('div', { class: 'row3', style: 'max-width:560px;margin:14px 0 0 auto;align-items:end' }, field(t('discount'), inp(inv.discount.value, { type: 'number', min: 0, step: 'any', on: (e) => { inv.discount.value = e.target.value; mark(); upd(); } })), field(' ', discType), field(t('shipping'), inp(inv.shipping, { type: 'number', min: 0, step: 'any', on: (e) => { inv.shipping = e.target.value; mark(); upd(); } }))), totalsBox),
    h('div', { class: 'card row2' }, field(t('notes'), h('textarea', { maxlength: 2000, oninput: bind(inv, 'notes') }, inv.notes)), field(t('terms'), h('textarea', { maxlength: 2000, oninput: bind(inv, 'terms') }, inv.terms)))));
}
function showPreview(html) {
  const f = h('iframe', { class: 'pv', sandbox: '', title: t('preview'), srcdoc: html });
  modal(t('preview'), f, { wide: true, actions: (close) => [h('button', { class: 'btn', onclick: close }, t('back'))] });
}

/* ---------- Detail ---------- */
function detail() {
  const inv = S.invoices.find((i) => i.id === S.param); if (!inv) { S.view = 'invoices'; return invoices(); }
  const tt = inv.totals; const st = inv.effectiveStatus;
  const persist = async (patch, msg) => { try { await call(api.saveInvoice({ ...inv, ...patch }), msg); await reload(); render(); } catch (e) { if (e.message !== 'handled') throw e; } };
  const addPayment = () => {
    const amt = inp(String(tt.balance), { type: 'number', step: 'any', min: 0 }); const date = inp(today(), { type: 'date' }); const meth = inp('', { max: 60, ph: 'Cash / bKash / Bank' });
    modal(t('add_payment'), h('div', {}, field(t('amount') + ' (' + inv.currency + ')', amt), field(t('date'), date), field(t('method'), meth)), { actions: (close) => [h('button', { class: 'btn', onclick: close }, t('cancel')),
      h('button', { class: 'btn primary', onclick: async () => { close(); await persist({ status: inv.status === 'draft' ? 'sent' : inv.status, payments: [...inv.payments, { date: date.value, amount: amt.value, method: meth.value }] }, t('saved')); } }, t('save'))] });
  };
  const html = h('div', { class: 'card', style: 'padding:0;overflow:hidden' }); const frame = h('iframe', { class: 'pv', sandbox: '', title: t('preview'), style: 'height:78vh' }); html.append(frame);
  call(api.invoiceHtml(inv.id)).then((x) => { frame.srcdoc = x; }).catch(() => {});
  return h('div', {}, head(inv.number, badge(inv),
    h('button', { class: 'btn', onclick: () => go('invoices') }, '← ' + t('back')),
    inv.status !== 'void' ? h('button', { class: 'btn', onclick: () => go('editor', inv.id) }, t('edit')) : null,
    inv.status === 'draft' ? h('button', { class: 'btn', onclick: () => persist({ status: 'sent' }, t('saved')) }, t('mark_sent')) : null,
    (st !== 'paid' && st !== 'void' && st !== 'draft') ? h('button', { class: 'btn accent', onclick: addPayment }, '+ ' + t('add_payment')) : null,
    h('button', { class: 'btn', onclick: () => call(api.print(inv.id)).catch(() => {}) }, t('print')),
    h('button', { class: 'btn primary', onclick: () => call(api.exportPdf(inv.id)).then((r) => r.saved && toast(t('exported'), 'ok')).catch(() => {}) }, t('export_pdf'))),
  h('div', { class: 'grid', style: 'grid-template-columns:1fr 330px;align-items:start' }, html,
    h('div', { class: 'grid' },
      h('div', { class: 'card' }, h('h2', {}, t('client')), h('b', {}, inv.client.name), h('div', { class: 'muted' }, inv.client.email || ''), h('div', { class: 'muted' }, inv.client.phone || '')),
      h('div', { class: 'card' }, h('h2', {}, t('payments')),
        inv.payments.length ? inv.payments.map((p) => h('div', { style: 'display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line)' }, h('span', {}, fdate(p.date) + (p.method ? ' · ' + p.method : '')), h('b', {}, money(p.amount, inv.currency)))) : h('div', { class: 'muted' }, '—'),
        h('div', { style: 'display:flex;justify-content:space-between;margin-top:10px' }, h('span', {}, t('balance_due')), h('b', {}, money(tt.balance, inv.currency)))),
      h('div', { class: 'card chips' },
        h('button', { class: 'btn sm', onclick: () => { const c = JSON.parse(JSON.stringify(inv)); delete c.id; c.number = S.settings.numberPrefix + S.settings.nextNumber; c.status = 'draft'; c.payments = []; c.issueDate = today(); c.dueDate = addDays(c.issueDate, S.settings.defaultDueDays); S.dup = c; go('editor'); } }, t('duplicate')),
        inv.status !== 'void' ? h('button', { class: 'btn sm', onclick: () => persist({ status: 'void' }, t('saved')) }, t('void')) : null,
        h('button', { class: 'btn sm danger', onclick: async () => { if (await confirmBox(t('confirm_delete'))) { await call(api.deleteInvoice(inv.id), t('deleted')).catch(() => {}); await reload(); go('invoices'); } } }, t('delete'))))));
}
/* ---------- Clients ---------- */
function clients() {
  const body = h('div', { class: 'card' });
  const draw = () => { const q = S.cq.toLowerCase(); const list = S.clients.filter((c) => !q || (c.name + ' ' + c.email).toLowerCase().includes(q));
    body.replaceChildren(!S.clients.length ? emptyBox(t('empty_clients'), t('empty_clients_sub'), h('button', { class: 'btn primary', onclick: () => clientForm() }, '+ ' + t('new_client'))) : !list.length ? emptyBox(t('no_results'), '') :
      h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, t('name')), h('th', {}, t('email')), h('th', {}, t('phone')), h('th', { class: 'r' }, t('invoices')), h('th', {}))),
        h('tbody', {}, list.map((c) => h('tr', {}, h('td', {}, h('b', {}, c.name)), h('td', {}, c.email), h('td', {}, c.phone), h('td', { class: 'r' }, String(S.invoices.filter((i) => i.clientId === c.id).length)),
          h('td', { class: 'r' }, h('button', { class: 'btn sm', onclick: () => clientForm(c) }, t('edit')), ' ', h('button', { class: 'btn sm danger', 'aria-label': t('delete'), onclick: async () => { if (await confirmBox(t('confirm_delete'))) { await call(api.deleteClient(c.id), t('deleted')).catch(() => {}); await reload(); render(); } } }, '✕'))))))); };
  draw();
  return h('div', {}, head(t('clients'), h('button', { class: 'btn primary', onclick: () => clientForm() }, '+ ' + t('new_client'))), h('div', { class: 'toolbar' }, h('input', { type: 'search', placeholder: t('search'), 'aria-label': t('search'), maxlength: 80, value: S.cq, oninput: (e) => { S.cq = e.target.value; draw(); } })), body);
}
function clientForm(c) {
  const d = c ? { ...c } : { name: '', email: '', phone: '', address: '', taxId: '', notes: '' };
  const f = h('div', {}, field(t('name') + ' *', inp(d.name, { max: 120, on: (e) => { d.name = e.target.value; } })), h('div', { class: 'row2' }, field(t('email'), inp(d.email, { type: 'email', max: 254, on: (e) => { d.email = e.target.value; } })), field(t('phone'), inp(d.phone, { max: 40, on: (e) => { d.phone = e.target.value; } }))),
    field(t('address'), h('textarea', { maxlength: 400, oninput: (e) => { d.address = e.target.value; } }, d.address)), field(t('tax_id'), inp(d.taxId, { max: 60, on: (e) => { d.taxId = e.target.value; } })));
  modal(c ? t('edit') : t('new_client'), f, { actions: (close) => [h('button', { class: 'btn', onclick: close }, t('cancel')), h('button', { class: 'btn primary', onclick: async () => { try { await call(api.saveClient(d), t('saved')); close(); await reload(); render(); } catch (e) { if (e.message !== 'handled') throw e; } } }, t('save'))] });
}

/* ---------- Settings ---------- */
function settings() {
  const s = JSON.parse(JSON.stringify(S.settings)); const b = s.business;
  const logoPrev = h('div', {}); const drawLogo = () => logoPrev.replaceChildren(b.logo ? h('img', { class: 'logo-prev', src: b.logo, alt: '' }) : h('span', { class: 'muted' }, '—'));
  drawLogo();
  const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', style: 'display:none', onchange: (e) => {
    const f = e.target.files[0]; if (!f) return; if (f.size > 400 * 1024) { toast('Logo max 400 KB', 'err'); return; }
    const r = new FileReader(); r.onload = () => { if (/^data:image\/(png|jpeg|webp);base64,/.test(r.result)) { b.logo = r.result; drawLogo(); } else toast('PNG / JPG / WebP only', 'err'); }; r.readAsDataURL(f); } });
  const o = (k, obj = s, extra = {}) => inp(obj[k], { ...extra, on: (e) => { obj[k] = e.target.value; } });
  const sel = (k, opts) => h('select', { onchange: (e) => { s[k] = e.target.value; } }, opts.map(([v, l]) => h('option', { value: v, selected: s[k] === v }, l)));
  const curSel = h('select', { 'aria-label': t('currency'), id: 'defcur', onchange: (e) => { s.currency = e.target.value; } });
  const fillCur = () => { const known = Object.assign({}, ...s.customCurrencies.map((c) => ({ [c.code]: c.symbol })), Object.fromEntries(Calc.BUILTIN_CODES.map((c) => [c, Calc.CURRENCIES[c]])));
    curSel.replaceChildren(...[...Calc.BUILTIN_CODES, ...s.customCurrencies.map((c) => c.code)].map((c) => h('option', { value: c, selected: s.currency === c }, c + ' ' + known[c]))); };
  const cList = h('div', {}); const cc = { code: '', symbol: '', decimals: '2' };
  const drawCustom = () => { fillCur(); cList.replaceChildren(...s.customCurrencies.map((c, n) => h('div', { style: 'display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)' }, h('span', {}, h('b', {}, c.code), '  ' + c.symbol + '  ·  ' + c.decimals + ' decimals'), h('button', { class: 'btn sm danger', 'aria-label': t('remove'), onclick: () => { if (s.currency === c.code) s.currency = 'BDT'; s.customCurrencies.splice(n, 1); drawCustom(); } }, '✕')))); };
  const ccCode = inp('', { max: 5, ph: 'e.g. QAR' }); const ccSym = inp('', { max: 6, ph: 'e.g. QR' });
  const ccDec = h('select', { 'aria-label': 'Decimals' }, h('option', { value: '2' }, '2 decimals'), h('option', { value: '0' }, '0 decimals'));
  const addCustom = () => { const code = ccCode.value.trim().toUpperCase(); const symbol = ccSym.value.trim();
    if (!/^[A-Z]{2,5}$/.test(code)) return toast('Code must be 2-5 letters', 'err'); if (!symbol) return toast('Enter a symbol', 'err');
    if (Calc.BUILTIN_CODES.includes(code) || s.customCurrencies.some((c) => c.code === code)) return toast(code + ' already exists', 'err'); if (s.customCurrencies.length >= 10) return toast('Max 10 custom currencies', 'err');
    s.customCurrencies.push({ code, symbol, decimals: Number(ccDec.value) }); ccCode.value = ''; ccSym.value = ''; drawCustom(); };
  s.customCurrencies = s.customCurrencies || [];
  const save = async () => { try { s.nextNumber = parseInt(s.nextNumber, 10) || 1; s.defaultTaxRate = parseFloat(s.defaultTaxRate) || 0; s.defaultDueDays = parseInt(s.defaultDueDays, 10) || 0; await call(api.saveSettings(s), t('saved')); await reload(); render(); } catch (e) { if (e.message !== 'handled') throw e; } };
  drawCustom();
  return h('div', {}, head(t('settings'), h('button', { class: 'btn primary', onclick: save }, t('save'))),
    h('div', { class: 'grid g2' },
      h('div', { class: 'card' }, h('h2', {}, t('business')), field(t('business_name'), o('name', b, { max: 120 })), h('div', { class: 'row2' }, field(t('email'), o('email', b, { type: 'email', max: 254 })), field(t('phone'), o('phone', b, { max: 40 }))),
        field(t('address'), h('textarea', { maxlength: 400, oninput: (e) => { b.address = e.target.value; } }, b.address)), h('div', { class: 'row2' }, field(t('website'), o('website', b, { max: 200 })), field(t('tax_id'), o('taxId', b, { max: 60 }))),
        h('div', { class: 'field' }, h('label', {}, t('logo')), logoPrev, h('div', { class: 'chips' }, h('button', { class: 'btn sm', onclick: () => file.click() }, t('choose_logo')), h('button', { class: 'btn sm', onclick: () => { b.logo = ''; drawLogo(); } }, t('remove')), file))),
      h('div', { class: 'card' }, h('h2', {}, t('invoices')), field(t('currency'), curSel, 'defcur'),
        h('div', { class: 'row2' }, field(t('prefix'), o('numberPrefix', s, { max: 12 })), field(t('next_number'), o('nextNumber', s, { type: 'number', min: 1 }))),
        h('div', { class: 'row3' }, field(t('default_tax'), o('defaultTaxRate', s, { type: 'number', min: 0, step: 'any' })), field(t('due_days'), o('defaultDueDays', s, { type: 'number', min: 0 })), field(t('template'), sel('template', [['modern', t('theme_modern')], ['classic', t('theme_classic')], ['minimal', t('theme_minimal')]]))),
        h('div', { class: 'field' }, h('label', {}, 'Custom currencies (your own code + symbol)'), cList, h('div', { class: 'row4', style: 'align-items:end;margin-top:8px' }, field('Code', ccCode), field('Symbol', ccSym), field('Decimals', ccDec), h('div', { class: 'field' }, h('button', { class: 'btn sm', onclick: addCustom }, '+ Add')))),
        field(t('payment_details'), h('textarea', { maxlength: 1000, oninput: (e) => { s.paymentDetails = e.target.value; } }, s.paymentDetails)),
        field(t('default_notes'), h('textarea', { maxlength: 2000, oninput: (e) => { s.defaultNotes = e.target.value; } }, s.defaultNotes)), field(t('default_terms'), h('textarea', { maxlength: 2000, oninput: (e) => { s.defaultTerms = e.target.value; } }, s.defaultTerms)))),
    h('div', { class: 'grid g2', style: 'margin-top:16px' },
      h('div', { class: 'card' }, h('h2', {}, t('backup')), h('div', { class: 'chips' }, h('button', { class: 'btn', onclick: () => call(api.exportBackup()).then((r) => r.saved && toast(t('saved'), 'ok')).catch(() => {}) }, t('export_backup')), h('button', { class: 'btn', onclick: async () => { try { const r = await call(api.importBackup()); if (r.restored) { toast(t('restored'), 'ok'); await reload(); render(); } } catch (e) { if (e.message !== 'handled') throw e; } } }, t('import_backup')))),
      h('div', { class: 'card' }, h('h2', {}, t('privacy')), h('p', { class: 'muted' }, t('privacy_text')), h('b', {}, S.info.encrypted ? '🔒 ' + t('enc_on') : '⚠️ ' + t('enc_off')))));
}

/* ---------- About ---------- */
function about() {
  const link = (txt, url) => h('button', { class: 'btn', onclick: () => api.openExternal(url) }, txt);
  return h('div', {}, h('div', { class: 'card about-hero' }, h('img', { src: 'logo.png', alt: 'Bunnys Framelab' }), h('h1', { class: 'grad-text', style: 'margin-top:16px' }, t('app')), h('p', { class: 'muted' }, t('made_by') + ' · ' + t('version') + ' ' + (S.info.version || '')),
    h('div', { class: 'chips', style: 'justify-content:center' }, link('🌐 ' + t('visit_site'), 'https://framelabmedia.odoo.com/'), link('📸 ' + t('follow'), 'https://www.instagram.com/bunnysframelab/')), h('p', { class: 'muted', style: 'max-width:520px;margin:20px auto 0' }, t('privacy_text'))));
}

/* ---------- Boot ---------- */
(async () => {
  root.append(h('div', { class: 'main' }, h('div', { class: 'skeleton' })));
  try { S.info = (await api.info()).data || {}; document.documentElement.classList.toggle('mac', S.info.platform === 'darwin'); document.body.classList.toggle('mac', S.info.platform === 'darwin'); await reload(); render(); } catch (_) { root.replaceChildren(h('div', { class: 'main' }, 'Failed to load.')); }
  window.addEventListener('beforeunload', (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
})();
})();
