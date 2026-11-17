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
    payments: 'Payments', items: 'Line items', lang_en: 'English', lang_bn: 'বাংলা', total_invoices: 'invoices', filter_status: 'Status',
    unsaved: 'You have unsaved changes. Leave anyway?', required: 'This field is required', invoice_saved: 'Invoice saved',
    mark_paid: 'Mark fully paid', restored: 'Backup restored', theme_modern: 'Modern', theme_classic: 'Classic', theme_minimal: 'Minimal',
  };
  const bn = {
    app: 'বানিস ইনভয়েস জেনারেটর', dashboard: 'ড্যাশবোর্ড', invoices: 'ইনভয়েস', clients: 'ক্লায়েন্ট', settings: 'সেটিংস', about: 'পরিচিতি',
    new_invoice: 'নতুন ইনভয়েস', new_client: 'নতুন ক্লায়েন্ট', search: 'খুঁজুন…', all: 'সব', invoice: 'ইনভয়েস', number: 'ইনভয়েস নং',
    issue_date: 'ইস্যুর তারিখ', due_date: 'পরিশোধের তারিখ', po_number: 'পিও / রেফ', bill_to: 'বিল প্রাপক', description: 'বিবরণ', qty: 'পরিমাণ',
    price: 'দাম', tax: 'ট্যাক্স', amount: 'টাকা', subtotal: 'সাবটোটাল', discount: 'ডিসকাউন্ট', shipping: 'শিপিং', total: 'মোট',
    paid: 'পরিশোধিত', balance_due: 'বকেয়া', amount_due: 'প্রদেয় অর্থ', notes: 'নোট', terms: 'শর্তাবলী', payment_details: 'পেমেন্টের তথ্য',
    tax_id: 'ট্যাক্স / ভ্যাট আইডি', generated_by: 'বানিস ইনভয়েস জেনারেটর দিয়ে তৈরি · Bunnys Framelab',
    status_draft: 'ড্রাফট', status_sent: 'পাঠানো হয়েছে', status_partial: 'আংশিক পরিশোধ', status_paid: 'পরিশোধিত', status_overdue: 'মেয়াদোত্তীর্ণ', status_void: 'বাতিল',
    save: 'সংরক্ষণ', cancel: 'বাতিল', delete: 'মুছুন', edit: 'সম্পাদনা', duplicate: 'কপি করুন', export_pdf: 'পিডিএফ এক্সপোর্ট', print: 'প্রিন্ট',
    add_item: 'আইটেম যোগ', add_payment: 'পেমেন্ট যোগ', mark_sent: 'পাঠানো হয়েছে চিহ্নিত করুন', void: 'বাতিল করুন', back: 'পিছনে', preview: 'প্রিভিউ',
    revenue: 'মোট ইনভয়েস', outstanding: 'বকেয়া', collected: 'আদায়', overdue_count: 'মেয়াদোত্তীর্ণ ইনভয়েস',
    recent: 'সাম্প্রতিক ইনভয়েস', empty_invoices: 'এখনো কোনো ইনভয়েস নেই', empty_invoices_sub: 'এক মিনিটেই প্রথম ইনভয়েস তৈরি করুন।',
    empty_clients: 'এখনো কোনো ক্লায়েন্ট নেই', empty_clients_sub: 'ক্লায়েন্ট যোগ করলে প্রতিবার তথ্য লিখতে হবে না।', no_results: 'কিছু পাওয়া যায়নি',
    client: 'ক্লায়েন্ট', name: 'নাম', email: 'ইমেইল', phone: 'ফোন', address: 'ঠিকানা', currency: 'মুদ্রা', language: 'ভাষা',
    business: 'আপনার ব্যবসা', business_name: 'ব্যবসার নাম', website: 'ওয়েবসাইট', logo: 'লোগো', choose_logo: 'লোগো বাছুন', remove: 'সরান',
    prefix: 'ইনভয়েস প্রিফিক্স', next_number: 'পরবর্তী নম্বর', default_tax: 'ডিফল্ট ট্যাক্স %', due_days: 'ডিফল্ট মেয়াদ (দিন)', default_notes: 'ডিফল্ট নোট',
    default_terms: 'ডিফল্ট শর্ত', template: 'টেমপ্লেট', percent: '%', fixed: 'নির্দিষ্ট', select_client: 'সংরক্ষিত ক্লায়েন্ট বাছুন…', saved: 'সংরক্ষিত',
    deleted: 'মুছে ফেলা হয়েছে', exported: 'পিডিএফ সেভ হয়েছে', failed: 'কিছু ভুল হয়েছে', confirm_delete: 'স্থায়ীভাবে মুছে ফেলবেন?', backup: 'ব্যাকআপ ও রিস্টোর',
    export_backup: 'ব্যাকআপ এক্সপোর্ট', import_backup: 'ব্যাকআপ ইমপোর্ট', export_csv: 'সিএসভি এক্সপোর্ট', privacy: 'প্রাইভেসি ও নিরাপত্তা',
    privacy_text: 'সব ডেটা এই কম্পিউটারেই থাকে। কিছুই আপলোড হয় না। আপনার ডেটা ফাইল অপারেটিং সিস্টেমের কীচেইন দিয়ে এনক্রিপ্ট করা।',
    enc_on: 'ডেটা এনক্রিপশন: চালু (OS কীচেইন)', enc_off: 'ডেটা এনক্রিপশন: এই সিস্টেমে অনুপলব্ধ (লোকালি সংরক্ষিত, এনক্রিপ্টেড নয়)',
    made_by: 'তৈরি করেছে Bunnys Framelab', visit_site: 'ওয়েবসাইট', follow: 'ইনস্টাগ্রাম', version: 'ভার্সন', method: 'পদ্ধতি', date: 'তারিখ',
    payments: 'পেমেন্ট', items: 'আইটেম', lang_en: 'English', lang_bn: 'বাংলা', total_invoices: 'টি ইনভয়েস', filter_status: 'স্ট্যাটাস',
    unsaved: 'অসংরক্ষিত পরিবর্তন আছে। তবুও বের হবেন?', required: 'এই ঘরটি আবশ্যক', invoice_saved: 'ইনভয়েস সংরক্ষিত',
    mark_paid: 'সম্পূর্ণ পরিশোধিত', restored: 'ব্যাকআপ রিস্টোর হয়েছে', theme_modern: 'মডার্ন', theme_classic: 'ক্লাসিক', theme_minimal: 'মিনিমাল',
  };
  const D = { en, bn };
  const T = (lang, k) => (D[lang] && D[lang][k]) || en[k] || k;
  return { T, D };
});
