/* ICS student payments — Google Apps Script web app.

   Receives a payment from academics/payments.html after PayPal has
   captured it, checks it with PayPal, records it in a Google Sheet, and
   emails a receipt to the student and to the Academic Registrar.

   Setup, deployment and day-to-day use: SETUP.md, next to this file.
   Runs as ics-communications@icscanada.edu.

   Script properties (Project Settings → Script properties):
     PAYPAL_SECRET  optional. With it, every payment is checked with PayPal
                    automatically. Without it, rows are marked
                    CHECK PAYMENT for the Registrar to match by hand.
                    Never put the secret in this file or on the website.
     FOLDER_ID,
     SHEET_ID       written by setup(). Don't edit.

   CURRENCY, MIN_AMOUNT, MAX_AMOUNT and FEE_PERCENT must match CONFIG in
   js/payments.js. If you change one, change both. */

var CONFIG = {
  SERVICE: 'ICS payment',
  CURRENCY: 'CAD',
  MIN_AMOUNT: 5,
  MAX_AMOUNT: 20000,           // limits apply to the invoice amount, before the fee
  FEE_PERCENT: 2,              // PayPal fee added on top; the charge is amount + fee
  PAYPAL_CLIENT_ID: 'AdZ0cWK3Bl7wjgmrmgk_On-ac13XCdpZxx8te_4IPlRDVoYx3ZNoGG8vK7mb8VXdKH2L-TM1M3sMj6oI',
  PAYPAL_API: 'https://api-m.paypal.com',
  REGISTRAR: 'academic-registrar@icscanada.edu',
  ADMIN: 'ics-communications@icscanada.edu',      // receives failure alerts
  FOLDER_NAME: 'ICS Student Payments',
  SHEET_NAME: 'ICS Student Payments',
  TAB_NAME: 'Payments',
  TIME_ZONE: 'America/Toronto',
  PURPOSES: ['Tuition', 'Course or program fee', 'Other'],
  FROM_NAME: 'Institute for Christian Studies'
};

var HEADERS = [
  'Received', 'Reference', 'First name', 'Last name', 'Email', 'Purpose', 'Purpose detail',
  'Amount (CAD)', 'PayPal fee (CAD)', 'Total charged (CAD)', 'Note', 'Payment status', 'PayPal order ID',
  'PayPal capture ID', 'PayPal payer email'
];
var TEXT_COLUMNS = ['Reference', 'PayPal order ID', 'PayPal capture ID'];

var STATUS = {
  PAID: 'Paid',
  PENDING: 'Payment pending',
  CHECK: 'CHECK PAYMENT'
};

var ORDER_ID_RE = /^[A-Z0-9]{8,30}$/;
var REF_RE = /^PAY-\d{6}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/;
var EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[A-Za-z]{2,}$/;
var AMOUNT_RE = /^\d{1,9}\.\d{2}$/;
var CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
/* Single-line fields (the name goes into an email subject): no line breaks either. */
var LINE_RE = /[\u0000-\u001F\u007F]/;


/* ═══════════════════════════════════════════
   ENTRY POINTS
   ═══════════════════════════════════════════ */

/* Run once by hand from the editor (see SETUP.md). Creates the Drive
   folder and the Sheet, shares the folder with the Registrar, and logs
   the links. Running it again is harmless: it reuses what exists. */
function setup() {
  var props = PropertiesService.getScriptProperties();

  var folder = null;
  var folderId = props.getProperty('FOLDER_ID');
  if (folderId) {
    try { folder = DriveApp.getFolderById(folderId); } catch (err) { folder = null; }
  }
  if (!folder) {
    folder = DriveApp.createFolder(CONFIG.FOLDER_NAME);
    props.setProperty('FOLDER_ID', folder.getId());
  }
  try {
    folder.addEditor(CONFIG.REGISTRAR);
  } catch (err) {
    Logger.log('Could not share the folder with ' + CONFIG.REGISTRAR + ': ' + err);
  }

  var ss = null;
  var sheetId = props.getProperty('SHEET_ID');
  if (sheetId) {
    try { ss = SpreadsheetApp.openById(sheetId); } catch (err) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(CONFIG.SHEET_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(folder);
    props.setProperty('SHEET_ID', ss.getId());
  }
  ss.setSpreadsheetTimeZone(CONFIG.TIME_ZONE);

  var sheet = ss.getSheetByName(CONFIG.TAB_NAME);
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(CONFIG.TAB_NAME);
  }
  ensureHeaders_(sheet);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold');

  Logger.log('Folder: ' + folder.getUrl());
  Logger.log('Sheet:  ' + ss.getUrl());
  Logger.log('Shared with: ' + CONFIG.REGISTRAR + ' (editor)');
  Logger.log('PayPal: ' + paypalSetupStatus_());
}

/* Health check: open the /exec URL in a browser. */
function doGet() {
  var props = PropertiesService.getScriptProperties();
  return json_({
    ok: true,
    service: CONFIG.SERVICE,
    storage: props.getProperty('SHEET_ID') ? 'ready' : 'not set up: run setup()',
    paypal: props.getProperty('PAYPAL_SECRET') ? 'checked automatically' : 'not checked automatically',
    feePercent: CONFIG.FEE_PERCENT,
    names: 'first and last'
  });
}

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e && e.postData && e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad_request', message: 'The request could not be read.' });
  }
  if (!data || typeof data !== 'object') {
    return json_({ ok: false, error: 'bad_request', message: 'The request could not be read.' });
  }

  /* Honeypot: people leave it empty. Answer as if it worked, record nothing. */
  if (data.website) return json_({ ok: true, ref: String(data.ref || '') });

  var checked = validate_(data);
  if (!checked.ok) {
    return json_({ ok: false, error: 'invalid', field: checked.field, message: checked.message });
  }
  var p = checked.value;

  /* 1. Verify the payment with PayPal (when the secret is set). */
  var check = verifyPayment_(p);
  if (check.state === 'rejected') {
    console.warn('Payment rejected: ' + check.reason + ' (ref ' + p.ref + ', order ' + p.orderId + ')');
    return json_({ ok: false, error: 'not_verified', message: 'This payment could not be matched with PayPal.' });
  }
  p.status = check.state === 'verified' ? STATUS.PAID
           : check.state === 'pending' ? STATUS.PENDING
           : STATUS.CHECK;
  p.checkReason = check.reason || '';
  if (check.captureId) p.captureId = check.captureId;
  if (check.payerEmail) p.payerEmail = check.payerEmail;
  p.received = new Date();

  /* 2. Record it, once per PayPal order. */
  var sheetUrl = '';
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    return json_({ ok: false, error: 'busy', retry: true, message: 'Busy. Please try again.' });
  }
  try {
    var sheet = getSheet_();
    sheetUrl = sheet.getParent().getUrl();
    var cols = ensureHeaders_(sheet);
    var existingRef = findOrderRef_(sheet, cols, p.orderId);
    if (existingRef !== null) {
      if (existingRef === p.ref) return json_({ ok: true, ref: p.ref, duplicate: true });
      return json_({ ok: false, error: 'order_used', message: 'This PayPal order has already been recorded.' });
    }
    appendPayment_(sheet, cols, p);
    SpreadsheetApp.flush();
  } catch (err) {
    alertAdmin_('Payment NOT saved: ' + p.ref, p, err);
    return json_({ ok: false, error: 'save_failed', retry: true, message: 'The payment could not be recorded.' });
  } finally {
    lock.releaseLock();
  }

  /* 3. Email the receipts. The row is saved, so a mail failure is
     reported to ADMIN rather than to the student. */
  try {
    sendReceipts_(p, sheetUrl);
  } catch (err) {
    alertAdmin_('Payment saved, receipts NOT sent: ' + p.ref, p, err);
  }

  return json_({ ok: true, ref: p.ref });
}


/* ═══════════════════════════════════════════
   VALIDATION
   ═══════════════════════════════════════════ */

function validate_(d) {
  function fail(field, message) { return { ok: false, field: field, message: message }; }
  function text(v) { return typeof v === 'string' ? v.trim() : ''; }

  var firstName = text(d.firstName);
  var lastName = text(d.lastName);
  var email = text(d.email);
  var purpose = text(d.purpose);
  var detail = text(d.detail);
  var amount = text(d.amount);
  var note = text(d.note);
  var orderId = text(d.orderId);
  var ref = text(d.ref);
  var captureId = text(d.captureId);
  var payerEmail = text(d.payerEmail);

  var strings = [d.email, d.purpose, d.amount, d.orderId, d.ref];
  for (var i = 0; i < strings.length; i++) {
    if (typeof strings[i] !== 'string') return fail('request', 'A required field is missing.');
  }
  var optional = [d.detail, d.note, d.captureId, d.payerEmail, d.fee, d.total];
  for (var j = 0; j < optional.length; j++) {
    if (optional[j] != null && typeof optional[j] !== 'string') return fail('request', 'A field has the wrong type.');
  }

  /* First and last name, from the current page. A page cached from before
     the split sends one `name`; it is kept whole as the first name. */
  if (d.firstName != null || d.lastName != null) {
    if (typeof d.firstName !== 'string' || typeof d.lastName !== 'string') return fail('request', 'A field has the wrong type.');
    if (!firstName || firstName.length > 60 || LINE_RE.test(firstName)) return fail('firstName', 'First name is missing or too long.');
    if (!lastName || lastName.length > 60 || LINE_RE.test(lastName)) return fail('lastName', 'Last name is missing or too long.');
  } else {
    if (typeof d.name !== 'string') return fail('request', 'A required field is missing.');
    firstName = text(d.name);
    lastName = '';
    if (!firstName || firstName.length > 100 || LINE_RE.test(firstName)) return fail('name', 'Name is missing or too long.');
  }
  var name = lastName ? firstName + ' ' + lastName : firstName;
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return fail('email', 'Email address is not valid.');
  if (CONFIG.PURPOSES.indexOf(purpose) === -1) return fail('purpose', 'Purpose is not one of the choices.');
  if (purpose === 'Other') {
    if (!detail || detail.length > 80 || LINE_RE.test(detail)) return fail('detail', 'Purpose detail is missing or too long.');
  } else {
    detail = '';
  }
  if (!AMOUNT_RE.test(amount)) return fail('amount', 'Amount is not in the form 1250.00.');
  var cents = toCents_(amount);
  if (cents < CONFIG.MIN_AMOUNT * 100 || cents > CONFIG.MAX_AMOUNT * 100) return fail('amount', 'Amount is out of range.');
  /* The fee must be exactly what the page computes. A page cached from
     before the fee existed sends neither field: that payment carried no fee. */
  var feeCents = 0;
  if (d.fee != null || d.total != null) {
    feeCents = feeFor_(cents);
    if (text(d.fee) !== centsToValue_(feeCents)) return fail('fee', 'PayPal fee does not match.');
    if (text(d.total) !== centsToValue_(cents + feeCents)) return fail('total', 'Total does not match.');
  }
  if (note.length > 500 || CONTROL_RE.test(note.replace(/[\r\n\t]/g, ''))) return fail('note', 'Note is too long.');
  if (!ORDER_ID_RE.test(orderId)) return fail('orderId', 'PayPal order ID is not valid.');
  if (!REF_RE.test(ref)) return fail('ref', 'Reference is not valid.');
  if (captureId && !ORDER_ID_RE.test(captureId)) return fail('captureId', 'PayPal capture ID is not valid.');
  if (payerEmail && (payerEmail.length > 254 || !EMAIL_RE.test(payerEmail))) payerEmail = '';

  return {
    ok: true,
    value: {
      firstName: firstName, lastName: lastName, name: name, email: email, purpose: purpose, detail: detail,
      amount: amount, cents: cents, feeCents: feeCents, totalCents: cents + feeCents, note: note, orderId: orderId, ref: ref,
      captureId: captureId, payerEmail: payerEmail
    }
  };
}

/* "1250.00" → 125000. Exact: no floating point. */
function toCents_(value) {
  var m = /^(\d+)\.(\d{2})$/.exec(String(value));
  return m ? parseInt(m[1], 10) * 100 + parseInt(m[2], 10) : NaN;
}

function centsToValue_(cents) {
  return Math.floor(cents / 100) + '.' + ('0' + (cents % 100)).slice(-2);
}

/* The PayPal fee on an amount, rounded to the nearest cent. Same
   formula as feeFor() in js/payments.js. */
function feeFor_(cents) {
  return Math.round(cents * CONFIG.FEE_PERCENT / 100);
}

function formatMoney_(cents) {
  var whole = String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return CONFIG.CURRENCY + ' $' + whole + '.' + ('0' + (cents % 100)).slice(-2);
}


/* ═══════════════════════════════════════════
   PAYPAL
   ═══════════════════════════════════════════ */

/* Returns { state, reason, captureId, payerEmail }:
     verified    PayPal confirms every detail and the capture is COMPLETED
     pending     as verified, but PayPal is still holding the capture
     unverified  couldn't check (no secret, PayPal unreachable or 5xx)
     rejected    PayPal answered and the details don't match */
function verifyPayment_(p) {
  var secret = PropertiesService.getScriptProperties().getProperty('PAYPAL_SECRET');
  if (!secret) return { state: 'unverified', reason: 'PayPal checks are not turned on' };

  var token;
  try {
    token = paypalToken_(secret);
  } catch (err) {
    return { state: 'unverified', reason: 'Could not sign in to PayPal: ' + err.message };
  }

  var res;
  try {
    res = UrlFetchApp.fetch(CONFIG.PAYPAL_API + '/v2/checkout/orders/' + encodeURIComponent(p.orderId), {
      method: 'get',
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
  } catch (err) {
    return { state: 'unverified', reason: 'PayPal could not be reached' };
  }
  var code = res.getResponseCode();
  if (code >= 500) return { state: 'unverified', reason: 'PayPal returned ' + code };
  if (code === 404) return { state: 'rejected', reason: 'PayPal has no such order' };
  if (code !== 200) return { state: 'unverified', reason: 'PayPal returned ' + code };

  var order;
  try {
    order = JSON.parse(res.getContentText());
  } catch (err) {
    return { state: 'unverified', reason: 'PayPal sent an unreadable reply' };
  }

  var unit = (order.purchase_units || [])[0] || {};
  var capture = ((unit.payments || {}).captures || [])[0] || {};
  var amount = unit.amount || {};

  if (order.status !== 'COMPLETED') return { state: 'rejected', reason: 'Order status is ' + order.status };
  if (amount.currency_code !== CONFIG.CURRENCY) return { state: 'rejected', reason: 'Currency is ' + amount.currency_code };
  if (Math.round(parseFloat(amount.value) * 100) !== p.totalCents) {
    return { state: 'rejected', reason: 'Amount is ' + amount.value + ', not ' + centsToValue_(p.totalCents) };
  }
  if (unit.custom_id !== p.ref) return { state: 'rejected', reason: 'Reference does not match the order' };

  var found = {
    captureId: capture.id || '',
    payerEmail: (order.payer && order.payer.email_address) || ''
  };
  if (capture.status === 'COMPLETED') { found.state = 'verified'; return found; }
  if (capture.status === 'PENDING') {
    found.state = 'pending';
    found.reason = 'PayPal is holding the payment' +
      (capture.status_details && capture.status_details.reason ? ' (' + capture.status_details.reason + ')' : '');
    return found;
  }
  return { state: 'rejected', reason: 'Capture status is ' + (capture.status || 'missing') };
}

/* An OAuth token, cached for most of its life. Throws on failure. */
function paypalToken_(secret) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('paypal_token');
  if (cached) return cached;
  var res = UrlFetchApp.fetch(CONFIG.PAYPAL_API + '/v1/oauth2/token', {
    method: 'post',
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(CONFIG.PAYPAL_CLIENT_ID + ':' + secret) },
    payload: { grant_type: 'client_credentials' },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('PayPal sign-in returned ' + res.getResponseCode());
  var body = JSON.parse(res.getContentText());
  var ttl = Math.max(60, Math.min(21600, (body.expires_in || 3600) - 300));
  cache.put('paypal_token', body.access_token, ttl);
  return body.access_token;
}

function paypalSetupStatus_() {
  var secret = PropertiesService.getScriptProperties().getProperty('PAYPAL_SECRET');
  if (!secret) return 'NOT checked automatically. Rows will say CHECK PAYMENT. To turn checks on, see SETUP.md.';
  try {
    paypalToken_(secret);
    return 'checked automatically (signed in to PayPal OK).';
  } catch (err) {
    return 'PAYPAL_SECRET is set but PayPal refused it (' + err.message + '). Payments will be marked CHECK PAYMENT until it is fixed.';
  }
}


/* ═══════════════════════════════════════════
   SHEET
   ═══════════════════════════════════════════ */

function getSheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('No SHEET_ID: run setup() first.');
  var ss = SpreadsheetApp.openById(id);
  return ss.getSheetByName(CONFIG.TAB_NAME) || ss.getSheets()[0];
}

/* Makes sure every header exists, adding any that are missing at the
   right, so a column renamed or deleted by hand comes back without
   disturbing the rest. Returns { header: 1-based column }. */
function ensureHeaders_(sheet) {
  var lastCol = sheet.getLastColumn();
  var current = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  var cols = {};
  current.forEach(function (h, i) {
    h = String(h).trim();
    if (h && !cols[h]) cols[h] = i + 1;
  });
  var next = lastCol + 1;
  HEADERS.forEach(function (h) {
    if (!cols[h]) {
      sheet.getRange(1, next).setValue(h).setFontWeight('bold');
      cols[h] = next;
      next++;
    }
  });
  /* IDs as plain text, so Sheets never turns one into a number or a date. */
  var rows = Math.max(sheet.getMaxRows(), 2);
  TEXT_COLUMNS.forEach(function (h) {
    sheet.getRange(2, cols[h], rows - 1, 1).setNumberFormat('@');
  });
  return cols;
}

/* The Reference already recorded for this PayPal order, or null. */
function findOrderRef_(sheet, cols, orderId) {
  var last = sheet.getLastRow();
  if (last < 2) return null;
  var ids = sheet.getRange(2, cols['PayPal order ID'], last - 1, 1).getValues();
  var refs = sheet.getRange(2, cols['Reference'], last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === orderId) return String(refs[i][0]).trim();
  }
  return null;
}

function appendPayment_(sheet, cols, p) {
  var width = 0;
  Object.keys(cols).forEach(function (h) { width = Math.max(width, cols[h]); });
  var row = [];
  for (var i = 0; i < width; i++) row.push('');
  function put(h, v) { row[cols[h] - 1] = v; }
  put('Received', p.received);
  put('Reference', p.ref);
  put('First name', safeCell_(p.firstName));
  put('Last name', safeCell_(p.lastName));
  /* A sheet made before the name was split keeps its Name column filled. */
  if (cols['Name']) put('Name', safeCell_(p.name));
  put('Email', safeCell_(p.email));
  put('Purpose', p.purpose);
  put('Purpose detail', safeCell_(p.detail));
  put('Amount (CAD)', p.cents / 100);
  put('PayPal fee (CAD)', p.feeCents / 100);
  put('Total charged (CAD)', p.totalCents / 100);
  put('Note', safeCell_(p.note));
  put('Payment status', p.status);
  put('PayPal order ID', p.orderId);
  put('PayPal capture ID', p.captureId || '');
  put('PayPal payer email', safeCell_(p.payerEmail || ''));
  sheet.appendRow(row);
  var r = sheet.getLastRow();
  ['Amount (CAD)', 'PayPal fee (CAD)', 'Total charged (CAD)'].forEach(function (h) {
    sheet.getRange(r, cols[h]).setNumberFormat('#,##0.00');
  });
  sheet.getRange(r, cols['Received']).setNumberFormat('yyyy-mm-dd hh:mm');
}

/* A value that starts like a formula is stored as text, never run. */
function safeCell_(v) {
  v = String(v == null ? '' : v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}


/* ═══════════════════════════════════════════
   EMAIL
   ═══════════════════════════════════════════ */

function sendReceipts_(p, sheetUrl) {
  var when = Utilities.formatDate(p.received, CONFIG.TIME_ZONE, "MMMM d, yyyy 'at' h:mm a z");
  var money = formatMoney_(p.cents);
  var total = formatMoney_(p.totalCents);
  var purpose = p.purpose === 'Other' ? 'Other: ' + p.detail : p.purpose;
  var common = [
    ['Reference', p.ref],
    ['Date', when],
    ['Name', p.name],
    ['For', purpose],
    ['Amount', money],
    ['PayPal fee (' + CONFIG.FEE_PERCENT + '%)', formatMoney_(p.feeCents)],
    ['Total paid', total],
    ['PayPal order ID', p.orderId]
  ];
  var paidLine = p.feeCents
    ? total + ': ' + money + ' for ' + purpose + ', plus the ' + CONFIG.FEE_PERCENT + '% PayPal fee of ' + formatMoney_(p.feeCents)
    : money + ' for ' + purpose;

  /* To the student */
  var studentNotes = [
    'PayPal sends its own receipt separately.',
    'This email confirms that ICS has received your payment. It is not a tax receipt: official tuition tax forms come from the Academic Registrar.'
  ];
  if (p.status === STATUS.PENDING) {
    studentNotes.unshift('PayPal is still finishing this payment. You don’t need to do anything.');
  }
  MailApp.sendEmail({
    to: p.email,
    replyTo: CONFIG.REGISTRAR,
    name: CONFIG.FROM_NAME,
    subject: 'Your ICS payment receipt (' + p.ref + ')',
    htmlBody: receiptHtml_({
      title: 'Payment receipt',
      intro: 'Thank you, ' + p.firstName + '. We’ve received your payment of ' + paidLine + '.',
      rows: common,
      notes: studentNotes,
      footer: 'Questions? Reply to this email to reach the Academic Registrar.'
    }),
    body: receiptText_('Thank you, ' + p.firstName + '. We’ve received your payment of ' + paidLine + '.', common, studentNotes)
  });

  /* To the Registrar */
  var staffRows = common.concat([
    ['Email', p.email],
    ['Payment status', p.status],
    ['PayPal capture ID', p.captureId || '(not given)'],
    ['PayPal payer email', p.payerEmail || '(not given)']
  ]);
  if (p.note) staffRows.push(['Note from student', p.note]);
  var alert = null;
  if (p.status === STATUS.CHECK) {
    alert = 'CHECK PAYMENT. This payment was not checked with PayPal automatically (' + p.checkReason +
            '). Find PayPal order ' + p.orderId + ' and confirm ' + total + ' arrived before treating it as paid.';
  } else if (p.status === STATUS.PENDING) {
    alert = 'Payment pending. PayPal is holding this payment' + (p.checkReason ? ': ' + p.checkReason : '') +
            '. Check PayPal before treating it as paid.';
  }
  MailApp.sendEmail({
    to: CONFIG.REGISTRAR,
    replyTo: p.email,
    name: CONFIG.FROM_NAME + ' payments',
    subject: (p.status === STATUS.CHECK ? '[CHECK PAYMENT] ' : '') +
             'Payment received: ' + money + ' from ' + p.name + ' (' + p.ref + ')',
    htmlBody: receiptHtml_({
      alert: alert,
      title: 'Payment received',
      intro: p.name + ' paid ' + paidLine + '. Credit ' + money + ' to the student’s account.',
      rows: staffRows,
      notes: [],
      link: sheetUrl ? { href: sheetUrl, label: 'Open the payments sheet' } : null,
      footer: 'Reply to this email to reach the student.'
    }),
    body: receiptText_((alert ? alert + '\n\n' : '') + p.name + ' paid ' + paidLine + '. Credit ' + money + ' to the student’s account.', staffRows,
                       sheetUrl ? ['Payments sheet: ' + sheetUrl] : [])
  });
}

/* One template for both receipts. Inline styles only: mail clients
   strip <style>. Every value passes through esc_(). */
function receiptHtml_(o) {
  var serif = "Georgia, 'Times New Roman', serif";
  var sans = "Helvetica, Arial, sans-serif";
  var rows = o.rows.map(function (r) {
    return '<tr>' +
      '<td style="padding:9px 16px 9px 0;border-top:1px solid #EBDDD9;font:600 12px/1.4 ' + sans + ';letter-spacing:0.06em;text-transform:uppercase;color:#6B655F;vertical-align:top;white-space:nowrap;">' + esc_(r[0]) + '</td>' +
      '<td style="padding:9px 0;border-top:1px solid #EBDDD9;font:15px/1.5 ' + sans + ';color:#2E1318;vertical-align:top;word-break:break-word;">' + esc_(r[1]).replace(/\n/g, '<br>') + '</td>' +
      '</tr>';
  }).join('');
  var notes = (o.notes || []).map(function (n) {
    return '<p style="margin:0 0 10px;font:14px/1.6 ' + sans + ';color:#3A3330;">' + esc_(n) + '</p>';
  }).join('');
  var alert = o.alert
    ? '<div style="margin:0 0 22px;padding:14px 16px;background:#FBEFF0;border:2px solid #BE0B28;font:600 15px/1.5 ' + sans + ';color:#9B0D24;">' + esc_(o.alert) + '</div>'
    : '';
  var link = o.link
    ? '<p style="margin:18px 0 0;"><a href="' + esc_(o.link.href) + '" style="display:inline-block;padding:12px 20px;background:#A85A32;color:#ffffff;font:600 13px/1 ' + sans + ';letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;">' + esc_(o.link.label) + '</a></p>'
    : '';
  return '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F9F5ED;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9F5ED;"><tr><td align="center" style="padding:28px 12px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FDFBF7;border-top:3px solid #A85A32;">' +
    '<tr><td style="padding:28px 28px 8px;">' +
    '<p style="margin:0 0 18px;font:700 13px/1.4 ' + serif + ';color:#9B0D24;">Institute for Christian Studies</p>' +
    alert +
    '<h1 style="margin:0 0 10px;font:700 24px/1.25 ' + serif + ';color:#9B0D24;">' + esc_(o.title) + '</h1>' +
    '<p style="margin:0 0 20px;font:15px/1.6 ' + sans + ';color:#3A3330;">' + esc_(o.intro) + '</p>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #EBDDD9;margin:0 0 20px;">' + rows + '</table>' +
    notes + link +
    '</td></tr>' +
    '<tr><td style="padding:16px 28px 26px;font:13px/1.6 ' + sans + ';color:#6B655F;">' + esc_(o.footer) +
    '<br>Institute for Christian Studies, 59 St. George Street, Toronto, ON M5S 2E6</td></tr>' +
    '</table></td></tr></table></body></html>';
}

function receiptText_(intro, rows, notes) {
  return intro + '\n\n' +
    rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') +
    (notes.length ? '\n\n' + notes.join('\n\n') : '') +
    '\n\nInstitute for Christian Studies\n59 St. George Street, Toronto, ON M5S 2E6\n';
}

function esc_(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Tells ADMIN everything needed to fix a payment by hand. */
function alertAdmin_(subject, p, err) {
  try {
    MailApp.sendEmail({
      to: CONFIG.ADMIN,
      name: CONFIG.FROM_NAME + ' payments',
      subject: '[ICS payments] ' + subject,
      body: subject + '\n\n' +
        'Reference: ' + p.ref + '\n' +
        'PayPal order ID: ' + p.orderId + '\n' +
        'PayPal capture ID: ' + (p.captureId || '') + '\n' +
        'Payment status: ' + (p.status || '') + '\n' +
        'Amount: ' + formatMoney_(p.cents) + '\n' +
        'PayPal fee: ' + formatMoney_(p.feeCents || 0) + '\n' +
        'Total charged: ' + formatMoney_(p.totalCents || p.cents) + '\n' +
        'Purpose: ' + p.purpose + (p.detail ? ': ' + p.detail : '') + '\n' +
        'Name: ' + p.name + '\n' +
        'Email: ' + p.email + '\n' +
        'Note: ' + (p.note || '') + '\n\n' +
        'Error: ' + (err && err.message) + '\n' + (err && err.stack || '') + '\n\n' +
        'The student has paid. They were told their payment is safe and offered "Send again".'
    });
  } catch (mailErr) {
    console.error('Could not alert admin: ' + mailErr + ' / original: ' + err);
  }
}


function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
