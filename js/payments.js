/* Make a Payment — the student payment form on academics/payments.html.

   The student enters their first and last name, email, what the payment is for and how
   much, then pays through PayPal (with a PayPal account or as a guest by
   card). After PayPal captures the payment, this file posts the details
   to a Google Apps Script web app (_scripts/student-payments.gs), which
   checks the payment, records it in a Sheet and emails a receipt to the
   student and to the Academic Registrar.

   The one promise the page makes: the total in the summary is the amount
   charged. That total is the invoice amount plus a FEE_PERCENT PayPal fee,
   shown as its own line. The amount and purpose are validated before PayPal
   opens and locked while it is open, and PayPal is given the validated
   figures, never whatever is in the box at that moment.

   If the post to the script fails after the student has paid, the details
   are already saved in localStorage, so the page offers "Send again" (now
   or on a later visit) instead of ever asking them to pay twice.

   Until SCRIPT_URL is filled in, the page shows a "not available yet"
   notice and never loads PayPal, so it is safe to publish before setup.
   Setup steps: _scripts/SETUP.md.

   Usage: <script src="../js/payments.js" defer></script>, after
   footer.js and extlinks.js. */
(function () {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────────────────────
     MIN_AMOUNT, MAX_AMOUNT, CURRENCY and FEE_PERCENT must match CONFIG in
     _scripts/student-payments.gs. If you change one, change both. */
  var CONFIG = {
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyvTY1Jq3i91Y5uhTbQHz5iOJ-wD6LM55pnEBpSHEm2R_3gHH1Glawkxogc-O7tLCqvKA/exec',
                             // the Apps Script /exec URL (see _scripts/SETUP.md)
    PAYPAL_CLIENT_ID: 'AdZ0cWK3Bl7wjgmrmgk_On-ac13XCdpZxx8te_4IPlRDVoYx3ZNoGG8vK7mb8VXdKH2L-TM1M3sMj6oI',
                             // ICS's live PayPal app, shared with the other ICS forms; it is public
    SERVICE: 'ICS payment',  // names the payment in PayPal and in emails
    MIN_AMOUNT: 5,           // limits apply to the invoice amount, before the fee
    MAX_AMOUNT: 20000,
    CURRENCY: 'CAD',
    FEE_PERCENT: 2           // PayPal transaction fee added on top of the amount
  };

  var REGISTRAR = 'academic-registrar@icscanada.edu';
  var STORE_KEY = 'ics-payment-unsent';
  /* No 0/O, 1/I/L: a reference read over the phone stays unambiguous. */
  var REF_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[A-Za-z]{2,}$/;
  var POST_TIMEOUT_MS = 30000;

  /* How each purpose reads inside "You are paying … for ___." */
  var PURPOSE_PHRASE = {
    'Tuition': 'tuition',
    'Course or program fee': 'a course or program fee'
  };

  function $(id) { return document.getElementById(id); }

  var layout = $('pay-layout');
  var form = $('pay-form');
  var result = $('pay-result');
  var contact = document.querySelector('.pay__contact');
  if (!layout || !form || !result) return;

  var el = {
    firstName: $('pay-first'),
    lastName: $('pay-last'),
    email: $('pay-email'),
    purpose: $('pay-purpose'),
    detail: $('pay-detail'),
    amount: $('pay-amount'),
    note: $('pay-note'),
    website: $('pay-website')
  };
  var detailRow = $('pay-detail-row');
  var noteCount = $('pay-note-count');
  var errors = $('pay-errors');
  var errorsTitle = $('pay-errors-title');
  var errorsList = $('pay-errors-list');
  var slip = $('pay-slip');
  var slipTitle = $('pay-slip-title');
  var slipPurpose = $('pay-slip-purpose');
  var slipAmount = $('pay-slip-amount');
  var slipFee = $('pay-slip-fee');
  var summary = $('pay-summary');
  var buttons = $('paypal-buttons');
  var status = $('pay-status');

  /* ── Money ─────────────────────────────────────────────────────────
     Amounts are handled as whole cents, so nothing is ever rounded. */
  function centsToValue(cents) {
    return Math.floor(cents / 100) + '.' + ('0' + (cents % 100)).slice(-2);
  }
  function groupThousands(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function money(cents) {
    return 'CAD $' + groupThousands(Math.floor(cents / 100)) + '.' + ('0' + (cents % 100)).slice(-2);
  }
  function valueToCents(value) {
    var m = /^(\d+)\.(\d{2})$/.exec(String(value));
    return m ? parseInt(m[1], 10) * 100 + parseInt(m[2], 10) : NaN;
  }

  /* The PayPal fee on an amount, in cents, rounded to the nearest cent.
     The server computes it the same way and rejects any other figure. */
  function feeFor(cents) {
    return Math.round(cents * CONFIG.FEE_PERCENT / 100);
  }

  /* Accepts "1250", "1,250", "1250.5", "$1,250.50" and "CAD 1250".
     Returns { cents, value: "1250.50" } or { error: <kind> }. */
  function parseAmount(raw) {
    var s = String(raw || '').replace(/\s+/g, '');
    if (!s) return { error: 'empty' };
    if (s.indexOf('-') !== -1) return { error: 'zero' };
    s = s.replace(/^CAD/i, '').replace(/^\$/, '').replace(/CAD$/i, '');
    var m = /^(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d*))?$/.exec(s);
    if (!m) return { error: 'format' };
    var frac = m[2] || '';
    if (frac.length > 2) return { error: 'decimals' };
    var whole = m[1].replace(/,/g, '');
    if (whole.length > 9) return { error: 'max' };
    var cents = parseInt(whole, 10) * 100 + parseInt((frac + '00').slice(0, 2), 10);
    if (cents <= 0) return { error: 'zero' };
    if (cents < CONFIG.MIN_AMOUNT * 100) return { error: 'min' };
    if (cents > CONFIG.MAX_AMOUNT * 100) return { error: 'max' };
    return { cents: cents, value: centsToValue(cents) };
  }

  var AMOUNT_MESSAGES = {
    empty: 'Enter the amount you’re paying.',
    zero: 'Enter an amount greater than zero.',
    format: 'Enter the amount in numbers, for example 1,250.50.',
    decimals: 'Use no more than two decimal places, for example 1,250.50.',
    min: 'The smallest amount you can pay online is ' + money(CONFIG.MIN_AMOUNT * 100) + '.',
    max: 'The most you can pay online at once is ' + money(CONFIG.MAX_AMOUNT * 100) +
         '. For a larger payment, write to the Academic Registrar.'
  };

  /* ── Validation ────────────────────────────────────────────────── */
  function fullName(r) {
    return r.firstName ? r.firstName + ' ' + r.lastName : (r.name || '');
  }

  function purposeLabel(purpose, detail) {
    return purpose === 'Other' ? 'Other: ' + detail : purpose;
  }

  function checkField(key) {
    var v = el[key].value.trim();
    switch (key) {
      case 'firstName':
        return v ? '' : 'Enter your first name.';
      case 'lastName':
        return v ? '' : 'Enter your last name.';
      case 'email':
        if (!v) return 'Enter your email address, so we can send your receipt.';
        return EMAIL_RE.test(v) ? '' : 'Enter an email address like name@example.com.';
      case 'purpose':
        return v ? '' : 'Choose what this payment is for.';
      case 'detail':
        if (el.purpose.value !== 'Other') return '';
        return v ? '' : 'Say in a few words what this payment is for.';
      case 'amount':
        var a = parseAmount(v);
        return a.error ? AMOUNT_MESSAGES[a.error] : '';
    }
    return '';
  }

  /* Page order, so the error summary reads top to bottom. */
  var ORDER = ['firstName', 'lastName', 'email', 'purpose', 'amount', 'detail'];

  function setFieldError(key, message) {
    var input = el[key];
    var out = $(input.id + '-error');
    if (out) out.textContent = message;
    input.classList.toggle('is-invalid', !!message);
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  /* Validates every field. With `report`, also marks each bad field and
     shows the summary, which takes focus. Returns the clean data or null. */
  function validate(report) {
    var problems = [];
    ORDER.forEach(function (key) {
      var msg = checkField(key);
      if (report) setFieldError(key, msg);
      if (msg) problems.push({ key: key, message: msg });
    });
    if (report) showSummary(problems);
    if (problems.length) return null;
    var amount = parseAmount(el.amount.value);
    var purpose = el.purpose.value;
    return {
      firstName: el.firstName.value.trim(),
      lastName: el.lastName.value.trim(),
      email: el.email.value.trim(),
      purpose: purpose,
      detail: purpose === 'Other' ? el.detail.value.trim() : '',
      amount: amount.value,
      cents: amount.cents,
      fee: centsToValue(feeFor(amount.cents)),
      total: centsToValue(amount.cents + feeFor(amount.cents)),
      note: el.note.value.trim()
    };
  }

  function showSummary(problems) {
    errorsList.textContent = '';
    if (!problems.length) {
      errors.classList.remove('is-active');
      return;
    }
    errorsTitle.textContent = problems.length === 1
      ? 'There’s one thing to fix before you pay:'
      : 'There are ' + problems.length + ' things to fix before you pay:';
    problems.forEach(function (p) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + el[p.key].id;
      a.textContent = p.message;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        el[p.key].focus();
      });
      li.appendChild(a);
      errorsList.appendChild(li);
    });
    errors.classList.add('is-active');
    errors.focus();
  }

  /* ── Live summary ──────────────────────────────────────────────── */
  function setLine(dd, text, empty) {
    dd.textContent = text;
    dd.classList.toggle('is-empty', !!empty);
  }

  function updateSlip() {
    var purpose = el.purpose.value;
    var detail = el.detail.value.trim();
    var amount = parseAmount(el.amount.value);
    var purposeReady = purpose && (purpose !== 'Other' || detail);

    if (!purpose) setLine(slipPurpose, 'Not chosen yet', true);
    else if (purpose === 'Other') setLine(slipPurpose, detail || 'Other', !detail);
    else setLine(slipPurpose, purpose);

    if (amount.cents) {
      setLine(slipAmount, money(amount.cents));
      setLine(slipFee, money(feeFor(amount.cents)));
    } else {
      setLine(slipAmount, el.amount.value.trim() ? 'Check the amount' : 'Not entered yet', true);
      setLine(slipFee, CONFIG.FEE_PERCENT + '% of the amount', true);
    }

    var ready = !!(purposeReady && amount.cents);
    summary.textContent = '';
    if (ready) {
      var strong = document.createElement('strong');
      strong.textContent = money(amount.cents + feeFor(amount.cents));
      summary.appendChild(document.createTextNode('You are paying '));
      summary.appendChild(strong);
      summary.appendChild(document.createTextNode(': '));
      summary.appendChild(node('span', 'pay-slip__money', money(amount.cents)));
      summary.appendChild(document.createTextNode(' for ' +
        (PURPOSE_PHRASE[purpose] || '“' + detail + '”') + ', plus the ' + CONFIG.FEE_PERCENT +
        '% PayPal fee of '));
      summary.appendChild(node('span', 'pay-slip__money', money(feeFor(amount.cents))));
      summary.appendChild(document.createTextNode('.'));
    } else {
      summary.textContent = 'Fill in the form and your total appears here.';
    }
    if (ready !== slip.classList.contains('is-ready')) slip.classList.toggle('is-ready', ready);
  }

  function setStatus(text, tone) {
    status.textContent = text || '';
    if (tone) status.setAttribute('data-tone', tone);
    else status.removeAttribute('data-tone');
  }

  /* ── Field behaviour ───────────────────────────────────────────── */
  function syncDetailRow() {
    var other = el.purpose.value === 'Other';
    detailRow.hidden = !other;
    el.detail.required = other;
    if (!other) setFieldError('detail', '');
  }

  function updateCount() {
    var n = el.note.value.length;
    noteCount.textContent = n ? n + ' of 500 characters' : 'Up to 500 characters.';
  }

  ORDER.forEach(function (key) {
    var input = el[key];
    /* Check on leaving a field, never while the student is still typing
       in it; once a field is marked wrong, clear the mark the moment
       it is put right. */
    input.addEventListener('blur', function () {
      if (key === 'amount') {
        var a = parseAmount(input.value);
        if (a.cents) input.value = groupThousands(Math.floor(a.cents / 100)) + '.' + a.value.slice(-2);
      }
      if (input.value.trim() || input.classList.contains('is-invalid')) setFieldError(key, checkField(key));
      updateSlip();
    });
    input.addEventListener(key === 'purpose' ? 'change' : 'input', function () {
      if (key === 'purpose') syncDetailRow();
      if (input.classList.contains('is-invalid') && !checkField(key)) setFieldError(key, '');
      updateSlip();
    });
  });
  el.note.addEventListener('input', updateCount);

  /* Enter in a text field, or the "Continue to payment" button on narrow
     screens: check everything, then take the student to the summary. */
  function review() {
    var data = validate(true);
    if (!data) return;
    setStatus('Everything looks right. Choose PayPal, or Debit or Credit Card, to pay.');
    slipTitle.setAttribute('tabindex', '-1');
    slipTitle.focus();
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    review();
  });
  form.addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.key === 'Enter' && t.tagName === 'INPUT') {
      e.preventDefault();
      review();
    }
  });

  /* While PayPal is open the amount and purpose can't change, so what
     PayPal charges is what the summary shows. */
  var locked = false;
  function lock(on) {
    locked = on;
    el.amount.readOnly = on;
    el.detail.readOnly = on;
    el.purpose.disabled = on;
    if (on) setStatus('PayPal is open. The amount and purpose are locked until you finish or close PayPal.');
  }

  /* ── Reference ─────────────────────────────────────────────────── */
  function pad2(n) { return ('0' + n).slice(-2); }
  function makeRef() {
    var d = new Date();
    var bytes = new Uint8Array(4);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    var tail = '';
    for (var i = 0; i < bytes.length; i++) tail += REF_CHARS.charAt(bytes[i] % REF_CHARS.length);
    return 'PAY-' + String(d.getFullYear()).slice(2) + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '-' + tail;
  }

  /* ── Saved payment (paid, not yet recorded) ────────────────────── */
  function save(record) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(record)); } catch (e) { /* private mode: carry on */ }
  }
  function loadSaved() {
    try {
      var r = JSON.parse(localStorage.getItem(STORE_KEY));
      if (r && r.ref && r.orderId && r.amount) {
        /* Saved before the fee existed: nothing extra was charged. */
        if (!r.fee) { r.fee = '0.00'; r.total = r.amount; }
        return r;
      }
    } catch (e) { /* unreadable: treat as none */ }
    return null;
  }
  function clearSaved() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* nothing to clear */ }
  }

  /* ── Post to the Apps Script ───────────────────────────────────────
     text/plain keeps this a "simple" request: no CORS preflight, which
     Apps Script can't answer. */
  function postJSON(payload) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, POST_TIMEOUT_MS) : null;
    return fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      return res.json();
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    });
  }

  function send(record) {
    var payload = {
      ref: record.ref,
      orderId: record.orderId,
      captureId: record.captureId || '',
      payerEmail: record.payerEmail || '',
      amount: record.amount,
      fee: record.fee,
      total: record.total,
      firstName: record.firstName,
      lastName: record.lastName,
      name: record.firstName ? undefined : record.name,   // saved by the page before names were split
      email: record.email,
      purpose: record.purpose,
      detail: record.detail || '',
      note: record.note || '',
      website: el.website.value
    };
    return postJSON(payload).then(function (res) {
      if (res && res.ok) {
        clearSaved();
        showConfirmation(record);
      } else {
        showUnsent(record);
      }
    }, function () {
      showUnsent(record);
    });
  }

  /* ── Result panel ──────────────────────────────────────────────── */
  var ICONS = {
    done: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="7.5" x2="12" y2="12.5"/><line x1="12" y1="16.5" x2="12.01" y2="16.5"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="1"/><polyline points="3 6 12 13 21 6"/></svg>'
  };

  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function para(parts) {
    /* parts: strings, or [text] for a <strong> */
    var p = node('p', 'pay-result__text');
    parts.forEach(function (part) {
      p.appendChild(typeof part === 'string' ? document.createTextNode(part) : node('strong', null, part[0]));
    });
    return p;
  }
  function details(record) {
    var dl = node('dl', 'pay-result__details');
    [
      ['Reference', record.ref],
      ['Amount', money(valueToCents(record.amount))],
      ['PayPal fee', money(valueToCents(record.fee))],
      ['Total paid', money(valueToCents(record.total))],
      ['For', purposeLabel(record.purpose, record.detail)],
      ['PayPal order', record.orderId]
    ].forEach(function (row) {
      var div = node('div');
      div.appendChild(node('dt', null, row[0]));
      div.appendChild(node('dd', null, row[1]));
      dl.appendChild(div);
    });
    return dl;
  }
  function registrarLink(record, label) {
    var subject = 'Online payment ' + record.ref + ' (PayPal order ' + record.orderId + ')';
    var body = 'Hello,\n\nI paid online but the payment page couldn’t send my details to you.\n\n' +
      'Reference: ' + record.ref + '\n' +
      'PayPal order: ' + record.orderId + '\n' +
      'Amount: ' + money(valueToCents(record.amount)) + '\n' +
      'PayPal fee: ' + money(valueToCents(record.fee)) + '\n' +
      'Total paid: ' + money(valueToCents(record.total)) + '\n' +
      'For: ' + purposeLabel(record.purpose, record.detail) + '\n' +
      'Name: ' + fullName(record) + '\n' +
      'Email: ' + record.email + '\n\nThank you.';
    var a = node('a', 'inline-link pay-result__link', label);
    a.href = 'mailto:' + REGISTRAR + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    return a;
  }

  /* `quiet` on page load: show the panel without pulling focus (and the
     scroll) past the hero. */
  function showResult(tone, icon, title, children, quiet) {
    result.textContent = '';
    result.setAttribute('data-tone', tone);
    var badge = node('div', 'rsvp-form__confirm-icon');
    badge.innerHTML = ICONS[icon];
    result.appendChild(badge);
    result.appendChild(node('h2', 'pay-result__title', title));
    children.forEach(function (c) { result.appendChild(c); });
    layout.hidden = true;
    result.hidden = false;
    setStatus('');
    if (!quiet) result.focus();
  }

  function showConfirmation(record) {
    var kids = [
      para(['We’ve emailed a receipt to ', [record.email], '. PayPal sends its own receipt separately.']),
      details(record)
    ];
    if (record.captureStatus === 'PENDING') {
      kids.push(para(['PayPal is still finishing this payment. You don’t need to do anything: the Registrar will see it once PayPal releases it.']));
    }
    kids.push(para(['Keep your reference number. It’s the quickest way for the Registrar to find this payment.']));
    showResult('done', 'done', 'Thank you. Your payment is complete.', kids);
  }

  function showUnsent(record, quiet) {
    var again = node('button', 'btn btn-accent', 'Send again');
    again.type = 'button';
    again.addEventListener('click', function () {
      again.disabled = true;
      again.textContent = 'Sending…';
      send(record);
    });
    var actions = node('div', 'pay-result__actions');
    actions.appendChild(again);
    actions.appendChild(registrarLink(record, 'Email the Registrar instead'));

    var dismiss = node('button', 'pay-result__dismiss', 'I’ve sorted this out with the Registrar');
    dismiss.type = 'button';
    dismiss.addEventListener('click', function () {
      if (!window.confirm('Clear this payment from this browser? Only do this if the Registrar already has it.')) return;
      clearSaved();
      result.hidden = true;
      layout.hidden = false;
      start();
      el.firstName.focus();
    });

    showResult('warn', 'warn', 'Your payment went through, but we couldn’t record it yet.', [
      para(['Your payment is safe (PayPal order ', [record.orderId], ') and you won’t be charged again. We couldn’t reach the Registrar’s records just now, so your emailed receipt hasn’t gone out yet.']),
      details(record),
      para(['Choose “Send again” to try once more. Nothing will be charged. If it still doesn’t go through, email the Registrar and they’ll match it with PayPal.']),
      actions,
      dismiss
    ], quiet);
  }

  function showUnavailable() {
    /* The hero's promise of PayPal and receipts doesn't hold here. */
    var heroSub = document.querySelector('.hero__sub');
    if (heroSub) heroSub.textContent = 'Payments to ICS are arranged through the Academic Registrar.';
    var p = node('p', 'pay-result__text');
    p.appendChild(document.createTextNode('Please write to the Academic Registrar at '));
    var a = node('a', 'inline-link', REGISTRAR);
    a.href = 'mailto:' + REGISTRAR + '?subject=' + encodeURIComponent('Making a payment to ICS');
    p.appendChild(a);
    p.appendChild(document.createTextNode(', and they’ll tell you how to pay.'));
    if (contact) contact.hidden = true;
    showResult('info', 'mail', 'Online payment isn’t available right now', [p], true);
  }

  /* ── PayPal ────────────────────────────────────────────────────── */
  var sdkRequested = false;
  var attempt = null;
  var rejectedByForm = false;

  function loadPayPal() {
    if (sdkRequested) return;
    sdkRequested = true;
    setStatus('Loading PayPal…');
    var s = document.createElement('script');
    s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(CONFIG.PAYPAL_CLIENT_ID) +
      '&currency=' + CONFIG.CURRENCY + '&intent=capture&components=buttons&disable-funding=paylater';
    s.async = true;
    s.onload = renderButtons;
    s.onerror = paypalFailed;
    document.head.appendChild(s);
  }

  function paypalFailed() {
    setStatus('PayPal didn’t load. Check your connection and reload the page. If it still won’t load, write to the Academic Registrar.', 'error');
  }

  function renderButtons() {
    if (!window.paypal || !window.paypal.Buttons) return paypalFailed();
    window.paypal.Buttons({
      style: { layout: 'vertical', shape: 'rect', label: 'pay', height: 45 },

      /* Runs before PayPal's window opens. A bad form stops it here, so
         PayPal never opens on an amount the student didn't mean. */
      onClick: function (data, actions) {
        rejectedByForm = false;
        if (!validate(true)) {
          rejectedByForm = true;
          return actions.reject();
        }
        lock(true);
        return actions.resolve();
      },

      createOrder: function (data, actions) {
        var clean = validate(true);
        if (!clean) {
          rejectedByForm = true;
          lock(false);
          return Promise.reject(new Error('The form has errors.'));
        }
        attempt = clean;
        attempt.ref = makeRef();
        return actions.order.create({
          intent: 'CAPTURE',
          purchase_units: [{
            /* The fee rides as PayPal's "handling" line, so the payer sees
               amount and fee separately on PayPal's side too. */
            amount: {
              currency_code: CONFIG.CURRENCY,
              value: attempt.total,
              breakdown: {
                item_total: { currency_code: CONFIG.CURRENCY, value: attempt.amount },
                handling: { currency_code: CONFIG.CURRENCY, value: attempt.fee }
              }
            },
            description: (CONFIG.SERVICE + ': ' + purposeLabel(attempt.purpose, attempt.detail)).slice(0, 127),
            custom_id: attempt.ref,
            invoice_id: attempt.ref
          }],
          application_context: {
            brand_name: 'Institute for Christian Studies',
            shipping_preference: 'NO_SHIPPING'
          }
        });
      },

      onApprove: function (data, actions) {
        setStatus('Completing your payment with PayPal…');
        return actions.order.capture().then(function (order) {
          var unit = (order && order.purchase_units && order.purchase_units[0]) || {};
          var capture = unit.payments && unit.payments.captures && unit.payments.captures[0];
          if (!capture || (capture.status !== 'COMPLETED' && capture.status !== 'PENDING')) {
            lock(false);
            setStatus('PayPal couldn’t complete the payment, so you haven’t been charged. Try again, or choose a different card.', 'error');
            return;
          }
          var record = {
            ref: attempt.ref,
            orderId: order.id || data.orderID,
            amount: attempt.amount,
            fee: attempt.fee,
            total: attempt.total,
            captureId: capture.id || '',
            captureStatus: capture.status,
            payerEmail: (order.payer && order.payer.email_address) || '',
            firstName: attempt.firstName,
            lastName: attempt.lastName,
            email: attempt.email,
            purpose: attempt.purpose,
            detail: attempt.detail,
            note: attempt.note,
            savedAt: new Date().toISOString()
          };
          /* Saved before the post, so a paid student is never asked to
             pay again, even if this tab closes now. */
          save(record);
          setStatus('Payment received. Sending your details to the Registrar…');
          return send(record);
        }, function (err) {
          /* A declined card: let PayPal ask for another one. */
          if (err && /INSTRUMENT_DECLINED/.test(String(err.message || err))) return actions.restart();
          lock(false);
          setStatus('PayPal couldn’t complete the payment, so you haven’t been charged. Try again, or choose a different card.', 'error');
        });
      },

      onCancel: function () {
        lock(false);
        setStatus('You closed PayPal before paying, so nothing was charged. Your details are still here when you’re ready.');
      },

      onError: function () {
        if (locked) lock(false);
        if (rejectedByForm) { setStatus(''); return; }
        setStatus('Something went wrong with PayPal and nothing was charged. Please try again in a moment.', 'error');
      }
    }).render(buttons).then(function () {
      setStatus('');
    }, paypalFailed);
  }

  function watchForPayPal() {
    if (!('IntersectionObserver' in window)) return loadPayPal();
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) {
        io.disconnect();
        loadPayPal();
      }
    }, { rootMargin: '600px 0px' });
    io.observe(slip);
  }

  /* ── Start ─────────────────────────────────────────────────────── */
  function start() {
    syncDetailRow();
    updateCount();
    updateSlip();
    watchForPayPal();
  }

  if (!CONFIG.SCRIPT_URL) {
    showUnavailable();
    return;
  }
  var unsent = loadSaved();
  if (unsent) {
    showUnsent(unsent, true);
    return;
  }
  start();
})();
