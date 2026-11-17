'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const call = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);
contextBridge.exposeInMainWorld('api', Object.freeze({
  info: call('app:info'), getState: call('state:get'), saveSettings: call('settings:save'),
  saveClient: call('client:save'), deleteClient: call('client:delete'),
  saveInvoice: call('invoice:save'), deleteInvoice: call('invoice:delete'),
  invoiceHtml: call('invoice:html'), previewDraft: call('invoice:previewDraft'), exportPdf: call('invoice:pdf'), print: call('app:print'),
  exportBackup: call('data:exportBackup'), importBackup: call('data:importBackup'), exportCsv: call('data:exportCsv'),
  openExternal: call('external:open'),
}));
