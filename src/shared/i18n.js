(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.I18N = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const en = {
    app: "Bunnys Invoice Generator", dashboard: 'Dashboard', invoices: 'Invoices', clients: 'Clients', settings: 'Settings', about: 'About',
    new_invoice: 'New invoice', new_client: 'New client', search: 'Search…', all: 'All', invoice: 'Invoice', number: 'Invoice no.',
    issue_date: 'Issue date', due_date: 'Due date', po_number: 'PO / Ref', bill_to: 'Bill to', description: 'Description', qty: 'Qty',
    price: 'Price', tax: 'Tax', amount: 'Amount', subtotal: 'Subtotal', discount: 'Discount', shipping: 'Shipping', total: 'Total',
    paid: 'Paid', balance_due: 'Balance due', amount_due: 'Amount due', notes: 'Notes', terms: 'Terms', payment_details: 'Payment details',
    tax_id: 'Tax / VAT ID', generated_by: 'Created with Bunnys Invoice Generator · Made by Bunnys Framelab',
    status_draft: 'Draft', status_sent: 'Sent', status_partial: 'Partially paid', status_paid: 'Paid', status_overdue: 'Overdue', status_void: 'Void',
    save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', duplicate: 'Duplicate', export_pdf: 'Export PDF', print: 'Print',
    add_item: 'Add item', add_payment: 'Record payment', mark_sent: 'Mark as sent', void: 'Void', back: 'Back', preview: 'Preview',
    revenue: 'Total invoiced', outstanding: 'Outstanding', collected: 'Collected', overdue_count: 'Overdue invoices',
    recent: 'Recent invoices', empty_invoices: 'No invoices yet', empty_invoices_sub: 'Create your first invoice in under a minute.',
    empty_clients: 'No clients yet', empty_clients_sub: 'Add clients to reuse their details on every invoice.', no_results: 'Nothing matches your search',
    client: 'Client', name: 'Name', email: 'Email', phone: 'Phone', address: 'Address', currency: 'Currency', language: 'Language',
    business: 'Your business', business_name: 'Business name', website: 'Website', logo: 'Logo', choose_logo: 'Choose logo', remove: 'Remove',
    prefix: 'Invoice prefix', next_number: 'Next number', default_tax: 'Default tax %', due_days: 'Default due (days)', default_notes: 'Default notes',
    default_terms: 'Default terms', template: 'Template', percent: '%', fixed: 'Fixed', select_client: 'Select a saved client…', saved: 'Saved',
    deleted: 'Deleted', exported: 'PDF saved', failed: 'Something went wrong', confirm_delete: 'Delete this permanently?', backup: 'Backup & restore',
    export_backup: 'Export backup', import_backup: 'Import backup', export_csv: 'Export CSV', privacy: 'Privacy & security',
    privacy_text: 'All data stays on this computer. Nothing is uploaded. Your data file is encrypted with your operating system keychain.',
    enc_on: 'Data encryption: ON (OS keychain)', enc_off: 'Data encryption: unavailable on this system (stored locally, unencrypted)',
    made_by: 'Made by Bunnys Framelab', visit_site: 'Website', follow: 'Instagram', version: 'Version', method: 'Method', date: 'Date',
    payments: 'Payments', items: 'Line items', total_invoices: 'invoices', filter_status: 'Status',
    unsaved: 'You have unsaved changes. Leave anyway?', required: 'This field is required', invoice_saved: 'Invoice saved',
    mark_paid: 'Mark fully paid', restored: 'Backup restored', theme_modern: 'Modern', theme_classic: 'Classic', theme_minimal: 'Minimal',
  };
  const D = { en };
  const T = (_lang, k) => en[k] || k;
  return { T, D };
});
