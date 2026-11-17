/* Strict schema validation + sanitisation for everything crossing the IPC boundary. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./calc'));
  else root.Validate = factory(root.Calc);
})(typeof self !== 'undefined' ? self : this, function (Calc) {
  'use strict';

  class ValidationError extends Error {}
  const fail = (m) => { throw new ValidationError(m); };

  const str = (v, max, name, { required = false } = {}) => {
    if (v === undefined || v === null) v = '';
    if (typeof v !== 'string') fail(`${name} must be text`);
    // strip control chars except newline/tab
    v = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
    if (required && !v) fail(`${name} is required`);
    if (v.length > max) fail(`${name} is too long (max ${max})`);
    return v;
  };
  const numIn = (v, name, min, max) => {
    const n = typeof v === 'number' ? v : parseFloat(v);
    if (!Number.isFinite(n)) fail(`${name} must be a number`);
    if (n < min || n > max) fail(`${name} out of range`);
    return n;
  };
  const date = (v, name, { required = false } = {}) => {
    v = str(v, 10, name, { required });
    if (!v) return '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(v))) fail(`${name} must be a valid date`);
    return v;
  };
  const id = (v, name) => {
    v = str(v, 64, name, { required: true });
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(v)) fail(`${name} is invalid`);
    return v;
  };
  const currency = (v) => {
    v = str(v, 3, 'Currency', { required: true });
    if (!Calc.CURRENCIES[v]) fail('Unsupported currency');
    return v;
  };
  const email = (v, name) => {
    v = str(v, 254, name);
    if (v && !/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(v)) fail(`${name} is not a valid email`);
    return v;
  };
  const MAX_LOGO = 600 * 1024;
  const logo = (v) => {
    if (!v) return '';
    if (typeof v !== 'string' || v.length > MAX_LOGO * 1.4) fail('Logo is too large (max 600 KB)');
    if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) fail('Logo must be PNG, JPG or WebP');
    return v;
  };
  const taxId = (v, name) => str(v, 60, name);

  function party(p, name) {
    p = p && typeof p === 'object' ? p : {};
    return {
      name: str(p.name, 120, `${name} name`, { required: true }),
      email: email(p.email, `${name} email`),
      phone: str(p.phone, 40, `${name} phone`),
      address: str(p.address, 400, `${name} address`),
      taxId: taxId(p.taxId, `${name} tax ID`),
    };
  }

  function client(c) {
    c = c && typeof c === 'object' ? c : fail('Invalid client');
    return { id: c.id ? id(c.id, 'Client id') : undefined, ...party(c, 'Client'), notes: str(c.notes, 500, 'Notes') };
  }

  function invoice(i) {
    i = i && typeof i === 'object' ? i : fail('Invalid invoice');
    const items = Array.isArray(i.items) ? i.items : fail('Items required');
    if (items.length < 1) fail('Add at least one line item');
    if (items.length > 200) fail('Too many line items (max 200)');
    const payments = Array.isArray(i.payments) ? i.payments : [];
    if (payments.length > 200) fail('Too many payments');
    const d = i.discount && typeof i.discount === 'object' ? i.discount : {};
    const out = {
      id: i.id ? id(i.id, 'Invoice id') : undefined,
      number: str(i.number, 40, 'Invoice number', { required: true }),
      status: ['draft', 'sent', 'void'].includes(i.status) ? i.status : fail('Invalid status'),
      issueDate: date(i.issueDate, 'Issue date', { required: true }),
      dueDate: date(i.dueDate, 'Due date', { required: true }),
      currency: currency(i.currency),
      client: party(i.client, 'Client'),
      clientId: i.clientId ? id(i.clientId, 'Client id') : '',
      items: items.map((it, n) => ({
        description: str(it && it.description, 500, `Item ${n + 1} description`, { required: true }),
        qty: numIn(it && it.qty, `Item ${n + 1} quantity`, 0, 1e9),
        price: numIn(it && it.price, `Item ${n + 1} price`, -1e12, 1e12),
        taxRate: numIn((it && it.taxRate) || 0, `Item ${n + 1} tax`, 0, 100),
      })),
      discount: { type: d.type === 'percent' ? 'percent' : 'fixed', value: numIn(d.value || 0, 'Discount', 0, 1e12) },
      shipping: numIn(i.shipping || 0, 'Shipping', 0, 1e12),
      payments: payments.map((p, n) => ({
        id: p && p.id ? id(p.id, 'Payment id') : undefined,
        date: date(p && p.date, `Payment ${n + 1} date`, { required: true }),
        amount: numIn(p && p.amount, `Payment ${n + 1} amount`, 0, 1e12),
        method: str(p && p.method, 60, `Payment ${n + 1} method`),
      })),
      notes: str(i.notes, 2000, 'Notes'),
      terms: str(i.terms, 2000, 'Terms'),
      template: ['modern', 'classic', 'minimal'].includes(i.template) ? i.template : 'modern',
      poNumber: str(i.poNumber, 60, 'PO number'),
    };
    if (Date.parse(out.dueDate) < Date.parse(out.issueDate)) fail('Due date cannot be before issue date');
    return out;
  }

  function settings(s) {
    s = s && typeof s === 'object' ? s : fail('Invalid settings');
    const b = s.business && typeof s.business === 'object' ? s.business : {};
    return {
      language: s.language === 'bn' ? 'bn' : 'en',
      currency: currency(s.currency || 'BDT'),
      business: {
        name: str(b.name, 120, 'Business name'),
        email: email(b.email, 'Business email'),
        phone: str(b.phone, 40, 'Business phone'),
        address: str(b.address, 400, 'Business address'),
        taxId: taxId(b.taxId, 'Business tax ID'),
        website: str(b.website, 200, 'Website'),
        logo: logo(b.logo),
      },
      numberPrefix: str(s.numberPrefix, 12, 'Number prefix').replace(/[^A-Za-z0-9-_]/g, ''),
      nextNumber: Math.floor(numIn(s.nextNumber || 1, 'Next number', 1, 99999999)),
      defaultTaxRate: numIn(s.defaultTaxRate || 0, 'Default tax', 0, 100),
      defaultDueDays: Math.floor(numIn(s.defaultDueDays === undefined ? 14 : s.defaultDueDays, 'Due days', 0, 365)),
      defaultNotes: str(s.defaultNotes, 2000, 'Default notes'),
      defaultTerms: str(s.defaultTerms, 2000, 'Default terms'),
      paymentDetails: str(s.paymentDetails, 1000, 'Payment details'),
      template: ['modern', 'classic', 'minimal'].includes(s.template) ? s.template : 'modern',
    };
  }

  return { ValidationError, invoice, client, settings, id, str };
});
