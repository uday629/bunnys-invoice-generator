'use strict';
/* Local-only encrypted data store. Data never leaves the device.
 * - Encrypted with the OS keychain via Electron safeStorage (DPAPI / Keychain).
 * - Atomic writes (tmp + rename), serialised through a promise queue (no race conditions).
 * - Rolling backup of the previous good file. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Calc = require('../shared/calc');

const DEFAULTS = () => ({
  v: 1,
  settings: {
    language: 'en', currency: 'BDT', customCurrencies: [],
    business: { name: '', email: '', phone: '', address: '', taxId: '', website: '', logo: '' },
    numberPrefix: 'INV-', nextNumber: 1, defaultTaxRate: 0, defaultDueDays: 14,
    defaultNotes: 'Thank you for your business!', defaultTerms: 'Payment is due by the due date shown above.',
    paymentDetails: '', template: 'modern',
  },
  clients: [], invoices: [],
});

class Store {
  constructor(dir, safeStorage) {
    this.dir = dir;
    this.file = path.join(dir, 'data.bin');
    this.safe = safeStorage;
    this.data = DEFAULTS();
    this.queue = Promise.resolve();
  }
  get encrypted() { return !!(this.safe && this.safe.isEncryptionAvailable()); }

  _encode(obj) {
    const json = Buffer.from(JSON.stringify(obj), 'utf8');
    if (this.encrypted) return Buffer.concat([Buffer.from('BIG1'), this.safe.encryptString(json.toString('utf8'))]);
    return Buffer.concat([Buffer.from('BIGP'), json]); // plain fallback, disclosed in UI
  }
  _decode(buf) {
    const tag = buf.subarray(0, 4).toString();
    const body = buf.subarray(4);
    if (tag === 'BIG1') {
      if (!this.encrypted) throw new Error('Encrypted data cannot be read: OS keychain unavailable');
      return JSON.parse(this.safe.decryptString(body));
    }
    if (tag === 'BIGP') return JSON.parse(body.toString('utf8'));
    throw new Error('Unrecognised data file');
  }

  load() {
    fs.mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    for (const f of [this.file, this.file + '.bak']) {
      if (!fs.existsSync(f)) continue;
      try {
        const d = this._decode(fs.readFileSync(f));
        this.data = Object.assign(DEFAULTS(), d);
        this.data.settings = Object.assign(DEFAULTS().settings, d.settings);
        Calc.setCustom(this.data.settings.customCurrencies);
        return;
      } catch (e) { /* try backup */ }
    }
  }

  /** Serialise all mutations; persist atomically. */
  mutate(fn) {
    const run = async () => {
      const next = JSON.parse(JSON.stringify(this.data));
      const result = fn(next);
      const tmp = this.file + '.' + crypto.randomBytes(4).toString('hex') + '.tmp';
      await fs.promises.writeFile(tmp, this._encode(next), { mode: 0o600 });
      if (fs.existsSync(this.file)) await fs.promises.copyFile(this.file, this.file + '.bak').catch(() => {});
      await fs.promises.rename(tmp, this.file);
      this.data = next;
      return result;
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => {});
    return p;
  }
}

const uid = () => crypto.randomBytes(9).toString('base64url');
const nowIso = () => new Date().toISOString();

function withTotals(inv) {
  return Object.assign({}, inv, { totals: Calc.compute(inv), effectiveStatus: Calc.status(inv) });
}
module.exports = { Store, DEFAULTS, uid, nowIso, withTotals };
