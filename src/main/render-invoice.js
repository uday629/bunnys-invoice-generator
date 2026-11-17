'use strict';
/* Builds the invoice HTML (used for preview + PDF). Everything is HTML-escaped; no scripts. */
const Calc = require('../shared/calc');
const { T } = require('../shared/i18n');

const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl = (s) => esc(s).replace(/\n/g, '<br>');
const fmtDate = (d, lang) => {
  if (!d) return '';
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }); } catch (_) { return d; }
};

function renderInvoice(inv, settings) {
  const lang = 'en';
  const t = (k) => T(lang, k);
  const biz = settings.business;
  const tot = Calc.compute(inv);
  const st = Calc.status(inv);
  const money = (n) => esc(Calc.format(n, inv.currency, 'en-US'));
  const showTax = inv.items.some((i) => i.taxRate > 0);
  const rows = inv.items.map((it, n) => {
    const amt = Calc.round(it.qty * it.price, Calc.decimals(inv.currency));
    return `<tr><td class="n">${n + 1}</td><td>${nl(it.description)}</td><td class="r">${esc(it.qty)}</td><td class="r">${money(it.price)}</td>${showTax ? `<td class="r">${esc(it.taxRate)}%</td>` : ''}<td class="r b">${money(amt)}</td></tr>`;
  }).join('');
  const sumRow = (l, v, cls = '') => `<tr class="${cls}"><td>${l}</td><td class="r">${v}</td></tr>`;
  const stamp = st === 'paid' ? `<div class="stamp paid">${esc(t('status_paid'))}</div>` : st === 'void' ? `<div class="stamp void">${esc(t('status_void'))}</div>` : '';

  const css = `
  *{box-sizing:border-box}html,body{margin:0;padding:0}
  body{font-family:"Segoe UI",-apple-system,"SF Pro Text","Helvetica Neue",Arial,"Nirmala UI","Bangla Sangam MN","Microsoft YaHei","Yu Gothic","Malgun Gothic","PingFang SC","Hiragino Sans","Noto Sans","Arial Unicode MS",sans-serif;color:#15151c;font-size:12.5px;line-height:1.5;background:#fff}
  .page{padding:40px 44px;position:relative;min-height:100vh}
  .bar{height:7px;background:linear-gradient(90deg,#1F6BFF,#6A2BFF,#FF1F56,#FF8A00);border-radius:4px;margin-bottom:26px}
  .top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
  .logo{max-height:64px;max-width:180px;object-fit:contain;display:block;margin-bottom:8px}
  h1{font-size:30px;letter-spacing:.04em;margin:0 0 4px;text-transform:uppercase;background:linear-gradient(90deg,#1F6BFF,#FF8A00);-webkit-background-clip:text;background-clip:text;color:transparent}
  .muted{color:#5a5a6a}.biz b{font-size:15px}
  .meta{text-align:right}.meta div{margin-bottom:2px}.meta .k{color:#5a5a6a}
  .parties{display:flex;gap:40px;margin:26px 0 20px}.parties>div{flex:1}
  .lbl{font-size:10px;font-weight:700;letter-spacing:.12em;color:#1F6BFF;text-transform:uppercase;margin-bottom:4px}
  table.items{width:100%;border-collapse:collapse;margin-top:6px}
  .items th{background:#08080A;color:#fff;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;padding:9px 10px;text-align:left}
  .items th.r,.items td.r{text-align:right}.items td{padding:10px;border-bottom:1px solid #e6e6ee;vertical-align:top}
  .items td.n{width:28px;color:#8a8a99}.b{font-weight:600}
  .sum{width:300px;margin-left:auto;margin-top:16px;border-collapse:collapse}.sum td{padding:5px 10px}
  .sum tr.total td{background:#1F6BFF;color:#fff;font-weight:700;font-size:14px;border-radius:0}
  .sum tr.bal td{font-weight:700;font-size:14px;border-top:2px solid #08080A}
  .blocks{display:flex;gap:30px;margin-top:26px}.blocks>div{flex:1}
  .foot{position:absolute;left:44px;right:44px;bottom:26px;text-align:center;font-size:10.5px;color:#8a8a99;border-top:1px solid #e6e6ee;padding-top:8px}
  .stamp{position:absolute;right:64px;top:250px;font-size:34px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;border:4px solid;padding:2px 16px;border-radius:8px;transform:rotate(-12deg);opacity:.75}
  .stamp.paid{color:#13a561;border-color:#13a561}.stamp.void{color:#d0203f;border-color:#d0203f}
  .classic h1{background:none;color:#08080A;-webkit-background-clip:initial}.classic .bar{background:#08080A;height:3px}
  .classic .items th{background:#fff;color:#08080A;border-top:2px solid #08080A;border-bottom:2px solid #08080A}.classic .sum tr.total td{background:#08080A}.classic .lbl{color:#08080A}
  .minimal h1{background:none;color:#15151c;font-weight:300}.minimal .bar{display:none}
  .minimal .items th{background:none;color:#5a5a6a;border-bottom:1px solid #15151c}.minimal .sum tr.total td{background:none;color:#15151c;border-top:2px solid #15151c}.minimal .lbl{color:#5a5a6a}
  @page{size:A4;margin:0}
  `;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(inv.number)}</title><style>${css}</style></head><body><div class="page ${esc(inv.template)}">
  <div class="bar"></div>${stamp}
  <div class="top">
    <div class="biz">${biz.logo ? `<img class="logo" alt="" src="${esc(biz.logo)}">` : ''}<b>${esc(biz.name)}</b><div class="muted">${nl(biz.address)}${biz.email ? '<br>' + esc(biz.email) : ''}${biz.phone ? '<br>' + esc(biz.phone) : ''}${biz.website ? '<br>' + esc(biz.website) : ''}${biz.taxId ? '<br>' + esc(t('tax_id')) + ': ' + esc(biz.taxId) : ''}</div></div>
    <div class="meta"><h1>${esc(t('invoice'))}</h1>
      <div><span class="k">${esc(t('number'))}:</span> <b>${esc(inv.number)}</b></div>
      <div><span class="k">${esc(t('issue_date'))}:</span> ${esc(fmtDate(inv.issueDate, lang))}</div>
      <div><span class="k">${esc(t('due_date'))}:</span> ${esc(fmtDate(inv.dueDate, lang))}</div>
      ${inv.poNumber ? `<div><span class="k">${esc(t('po_number'))}:</span> ${esc(inv.poNumber)}</div>` : ''}</div>
  </div>
  <div class="parties"><div><div class="lbl">${esc(t('bill_to'))}</div><b>${esc(inv.client.name)}</b><div class="muted">${nl(inv.client.address)}${inv.client.email ? '<br>' + esc(inv.client.email) : ''}${inv.client.phone ? '<br>' + esc(inv.client.phone) : ''}${inv.client.taxId ? '<br>' + esc(t('tax_id')) + ': ' + esc(inv.client.taxId) : ''}</div></div>
  <div><div class="lbl">${esc(t('amount_due'))}</div><div style="font-size:22px;font-weight:700">${money(tot.balance)}</div></div></div>
  <table class="items"><thead><tr><th>#</th><th>${esc(t('description'))}</th><th class="r">${esc(t('qty'))}</th><th class="r">${esc(t('price'))}</th>${showTax ? `<th class="r">${esc(t('tax'))}</th>` : ''}<th class="r">${esc(t('amount'))}</th></tr></thead><tbody>${rows}</tbody></table>
  <table class="sum">${sumRow(esc(t('subtotal')), money(tot.subtotal))}${tot.discount ? sumRow(esc(t('discount')), '−' + money(tot.discount)) : ''}${tot.tax ? sumRow(esc(t('tax')), money(tot.tax)) : ''}${tot.shipping ? sumRow(esc(t('shipping')), money(tot.shipping)) : ''}${sumRow(esc(t('total')), money(tot.total), 'total')}${tot.paid ? sumRow(esc(t('paid')), '−' + money(tot.paid)) : ''}${sumRow(esc(t('balance_due')), money(tot.balance), 'bal')}</table>
  <div class="blocks">${settings.paymentDetails ? `<div><div class="lbl">${esc(t('payment_details'))}</div><div class="muted">${nl(settings.paymentDetails)}</div></div>` : ''}${inv.notes ? `<div><div class="lbl">${esc(t('notes'))}</div><div class="muted">${nl(inv.notes)}</div></div>` : ''}${inv.terms ? `<div><div class="lbl">${esc(t('terms'))}</div><div class="muted">${nl(inv.terms)}</div></div>` : ''}</div>
  <div class="foot">${esc(t('generated_by'))}</div></div></body></html>`;
}
module.exports = { renderInvoice, esc };
