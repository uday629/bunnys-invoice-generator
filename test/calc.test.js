const test = require('node:test'); const assert = require('node:assert');
const Calc = require('../src/shared/calc'); const V = require('../src/shared/validate');
const base = { currency: 'USD', items: [{ qty: 3, price: 19.99, taxRate: 10 }, { qty: 1, price: 0.1, taxRate: 0 }], discount: { type: 'percent', value: 10 }, shipping: 5, payments: [{ amount: 20 }] };
test('totals', () => { const t = Calc.compute(base); assert.equal(t.subtotal, 60.07); assert.equal(t.discount, 6.01); assert.equal(t.tax, 5.4); assert.equal(t.total, 64.46); assert.equal(t.balance, 44.46); });
test('no float drift', () => assert.equal(Calc.compute({ currency: 'USD', items: [{ qty: 3, price: 0.1, taxRate: 0 }] }).total, 0.3));
test('zero-decimal currency', () => assert.equal(Calc.compute({ currency: 'JPY', items: [{ qty: 1, price: 100.6, taxRate: 0 }] }).total, 101));
test('discount capped', () => assert.equal(Calc.compute({ currency: 'USD', items: [{ qty: 1, price: 10, taxRate: 0 }], discount: { type: 'fixed', value: 99 } }).total, 0));
test('status', () => { assert.equal(Calc.status({ ...base, status: 'sent', dueDate: '2000-01-01', payments: [] }), 'overdue'); assert.equal(Calc.status({ ...base, status: 'sent', dueDate: '2099-01-01', payments: [{ amount: 999 }] }), 'paid'); });
const good = () => ({ number: 'INV-1', status: 'sent', issueDate: '2026-01-01', dueDate: '2026-01-15', currency: 'BDT', client: { name: 'A' }, items: [{ description: 'x', qty: 1, price: 5 }] });
test('valid invoice passes', () => assert.equal(V.invoice(good()).items[0].taxRate, 0));
test('rejects bad input', () => {
  for (const mut of [(i) => { i.currency = 'XXX'; }, (i) => { i.items = []; }, (i) => { i.items[0].qty = 'abc'; }, (i) => { i.dueDate = '2025-01-01'; }, (i) => { i.issueDate = '2026-13-45'; }, (i) => { i.client.email = 'x<script>@a.b'; }, (i) => { i.id = '../../etc'; }, (i) => { i.number = 'x'.repeat(100); }, (i) => { i.status = 'hacked'; }, (i) => { i.client = null; }])
    { const i = good(); mut(i); assert.throws(() => V.invoice(i), V.ValidationError); }
});
test('mass assignment stripped', () => { const i = good(); i.isAdmin = true; i.totals = { total: 1 }; const o = V.invoice(i); assert.equal(o.isAdmin, undefined); assert.equal(o.totals, undefined); });
test('logo must be image data URL', () => { const s = { business: { logo: 'javascript:alert(1)' } }; assert.throws(() => V.settings(s)); assert.throws(() => V.settings({ business: { logo: 'data:image/svg+xml;base64,AAAA' } })); });
test('custom currency: register, format, validate, replace', () => {
  const s = (c, cur) => ({ business: {}, currency: cur, customCurrencies: c });
  const out = V.settings(s([{ code: 'xyz', symbol: 'Z$', decimals: 0 }], 'XYZ'));
  assert.equal(out.currency, 'XYZ'); assert.equal(Calc.format(1234.6, 'XYZ'), 'Z$ 1,235'); assert.equal(Calc.decimals('XYZ'), 0);
  assert.throws(() => V.settings(s([{ code: 'USD', symbol: '$' }], 'USD')), V.ValidationError);
  assert.throws(() => V.settings(s([{ code: 'A1', symbol: '$' }], 'BDT')), V.ValidationError);
  assert.throws(() => V.settings(s([{ code: 'QQQ', symbol: '<script>' + 'x'.repeat(9) }], 'BDT')), V.ValidationError);
  V.settings(s([], 'BDT')); assert.equal(Calc.CURRENCIES.XYZ, undefined);
});
