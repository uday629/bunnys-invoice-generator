/* Shared money/invoice maths (UMD: used by main process and renderer). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'UGX']);
  const CURRENCIES = {
    BDT: '৳', USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', CAD: 'C$', SGD: 'S$', AED: 'د.إ',
    SAR: '﷼', JPY: '¥', CNY: '¥', KRW: '₩', MYR: 'RM', PKR: '₨', LKR: 'Rs', NPR: 'रू', THB: '฿',
    IDR: 'Rp', PHP: '₱', VND: '₫', TRY: '₺', RUB: '₽', BRL: 'R$', MXN: 'MX$', ZAR: 'R', NGN: '₦',
    KES: 'KSh', EGP: 'E£', CHF: 'CHF', SEK: 'kr', NOK: 'kr', DKK: 'kr', NZD: 'NZ$', QAR: '﷼', KWD: 'KD',
  };

  const decimals = (cur) => (ZERO_DECIMAL.has(cur) ? 0 : 2);
  const num = (v) => {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  /** Round half away from zero to `d` decimals, avoiding float drift. */
  const round = (v, d = 2) => {
    const f = Math.pow(10, d);
    const n = num(v);
    return (Math.sign(n) * Math.round(Math.abs(n) * f + 1e-9)) / f;
  };

  /**
   * Compute all totals for an invoice. Pure function; never trusts stored totals.
   * discount: {type:'percent'|'fixed', value}
   * items: [{qty, price, taxRate}]  (taxRate per-line, percent)
   */
  function compute(inv) {
    const d = decimals(inv.currency);
    const items = Array.isArray(inv.items) ? inv.items : [];
    let subtotal = 0;
    const lines = items.map((it) => {
      const amount = round(num(it.qty) * num(it.price), d);
      subtotal = round(subtotal + amount, d);
      return { amount, taxRate: Math.max(0, num(it.taxRate)) };
    });
    const dv = Math.max(0, num(inv.discount && inv.discount.value));
    let discount =
      inv.discount && inv.discount.type === 'percent' ? round((subtotal * Math.min(dv, 100)) / 100, d) : round(dv, d);
    discount = Math.min(discount, subtotal);
    const ratio = subtotal > 0 ? (subtotal - discount) / subtotal : 0;
    let tax = 0;
    const taxByRate = {};
    lines.forEach((l) => {
      const t = round(l.amount * ratio * (l.taxRate / 100), d);
      tax = round(tax + t, d);
      if (l.taxRate > 0) taxByRate[l.taxRate] = round((taxByRate[l.taxRate] || 0) + t, d);
    });
    const shipping = Math.max(0, round(inv.shipping, d));
    const total = round(subtotal - discount + tax + shipping, d);
    const paid = round(
      (Array.isArray(inv.payments) ? inv.payments : []).reduce((s, p) => s + Math.max(0, num(p.amount)), 0),
      d
    );
    const balance = round(Math.max(0, total - paid), d);
    return { subtotal, discount, tax, taxByRate, shipping, total, paid, balance };
  }

  function format(amount, cur, locale) {
    const d = decimals(cur);
    let s;
    try {
      s = new Intl.NumberFormat(locale || 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(
        round(amount, d)
      );
    } catch (_) {
      s = round(amount, d).toFixed(d);
    }
    const sym = CURRENCIES[cur] || cur;
    return sym + ' ' + s;
  }

  /** Effective status: derives "overdue" and "paid" from data. */
  function status(inv, now) {
    const t = compute(inv);
    if (inv.status === 'void') return 'void';
    if (inv.status === 'draft') return 'draft';
    if (t.total > 0 && t.balance === 0) return 'paid';
    const due = Date.parse(inv.dueDate);
    if (Number.isFinite(due) && due < (now || Date.now()) - 86399000) return 'overdue';
    return t.paid > 0 ? 'partial' : 'sent';
  }

  return { CURRENCIES, decimals, round, num, compute, format, status };
});
