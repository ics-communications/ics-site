/**
 * The referee page (academics/reference.html).
 *
 * The request email links here with ?t=<token>. This script asks the
 * MA/PhD Apps Script what the token is for (GET ?t=), shows the form for
 * an academic or a personal referee, keeps a draft on this device, and
 * posts the letter back to the same script ({ kind: 'reference' }).
 * See philosophy/_scripts/ma-phd-references.gs.
 */
(function () {
  'use strict';

  var CONFIG = {
    // The same deployment the application form posts to (js/application.js).
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxBb9RU5nOTZxZSqb81WBPLrC53ptBRvVE_Ii5Fpt8jvC5tpdR_As_mazCgJ9LKpBSgcQ/exec',
    MAX_FILE_BYTES: 10 * 1024 * 1024,
    MIN_WORDS: 50,
    LOOKUP_TIMEOUT: 30000
  };
  var FILE_TYPES = {
    pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    odt: 'application/vnd.oasis.opendocument.text', rtf: 'application/rtf'
  };
  var REGISTRAR = 'academic-registrar@icscanada.edu';

  var section = document.getElementById('reference');
  var form = document.getElementById('rf-form');
  var state = document.getElementById('rf-state');
  var loading = document.getElementById('rf-loading');
  var ledger = document.getElementById('rf-ledger');
  var range = document.getElementById('rf-range');
  var errorBox = document.getElementById('rf-error');
  var sendBtn = document.getElementById('rf-send');
  if (!form || !state) return;

  var token = (new URLSearchParams(location.search).get('t') || '').trim().toLowerCase();
  var draftKey = 'ics-reference-' + token;
  var info = null;
  var letterFile = null;
  var sending = false;

  /* ── Small helpers ──────────────────────────────────────────────────────── */

  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function field(name) { return form.elements[name]; }
  function val(name) {
    var el = form.elements[name];
    if (!el) return '';
    if (el instanceof RadioNodeList) {
      var on = $all('input[name="' + name + '"]', form).filter(function (r) { return r.checked && !r.disabled; })[0];
      return on ? on.value : '';
    }
    return el.type === 'checkbox' ? (el.checked ? el.value : '') : String(el.value || '').trim();
  }
  function words(s) { return (String(s).trim().match(/\S+/g) || []).length; }
  function sizeLabel(bytes) { return bytes < 1048576 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB'; }
  function mail(subject) {
    return '<a href="mailto:' + REGISTRAR + (subject ? '?subject=' + encodeURIComponent(subject) : '') + '">' + REGISTRAR + '</a>';
  }
  function firstName() { return info ? String(info.applicant).split(' ')[0] : 'the applicant'; }

  /* ── States ─────────────────────────────────────────────────────────────── */

  function showState(html, focus) {
    loading.hidden = true;
    section.setAttribute('aria-busy', 'false');
    state.innerHTML = html;
    state.hidden = false;
    if (focus) state.focus({ preventScroll: true });
  }
  function ledgerHtml() {
    return '<dl class="rf-ledger">' +
      '<div><dt>Applicant</dt><dd>' + esc(info.applicant) + '</dd></div>' +
      '<div><dt>Program</dt><dd>' + esc(info.program) + '</dd></div>' +
      (info.received ? '<div><dt>Received</dt><dd>' + esc(info.received) + '</dd></div>' : '<div><dt>Due</dt><dd>' + esc(info.due) + '</dd></div>') +
      '</dl>';
  }
  function linkProblem(kind) {
    range.textContent = kind === 'offline' ? 'Your link couldn’t be checked.' : 'This link doesn’t work.';
    var html = {
      missing: '<h3>This page needs the link from your email</h3>' +
        '<p>Each referee has a private link in the request email from the Institute for Christian Studies. Open that email and use its <b>Submit your letter</b> button. If you can’t find it, write to ' + mail('Reference letter link') + ' and we’ll send it again.</p>',
      not_found: '<h3>We don’t recognize this link</h3>' +
        '<p>It may have been copied incompletely, or replaced by a newer request. Try the button in the most recent email from us, or write to ' + mail('Reference letter link') + '.</p>',
      offline: '<h3>We couldn’t check your link</h3>' +
        '<p>Check your connection and try again. If it keeps happening, you can email your letter to ' + mail('Letter of reference') + ' instead.</p>' +
        '<div class="rf-actions"><button type="button" class="af-send" id="rf-retry">Try again</button></div>'
    }[kind];
    showState(html, true);
    var retry = document.getElementById('rf-retry');
    if (retry) retry.addEventListener('click', function () {
      state.hidden = true;
      loading.hidden = false;
      section.setAttribute('aria-busy', 'true');
      range.textContent = 'Checking your link…';
      lookup();
    });
  }

  /* ── Lookup ─────────────────────────────────────────────────────────────── */

  function lookup() {
    if (!/^[a-f0-9]{32}$/.test(token)) return linkProblem(token ? 'not_found' : 'missing');
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, CONFIG.LOOKUP_TIMEOUT);
    fetch(CONFIG.SCRIPT_URL + '?t=' + encodeURIComponent(token), { signal: ctrl ? ctrl.signal : undefined, cache: 'no-store' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        clearTimeout(timer);
        if (!data || !data.ok) return linkProblem(data && data.error === 'not_found' ? 'not_found' : 'offline');
        info = data;
        if (data.status === 'received') return showReceived();
        if (data.status === 'closed') return showClosed();
        showForm();
      })
      .catch(function () { clearTimeout(timer); linkProblem('offline'); });
  }

  function showReceived() {
    range.textContent = 'Your letter is in. Thank you.';
    showState('<h3>We already have your letter</h3>' +
      '<p>Your letter of reference for ' + esc(info.applicant) + ' arrived on ' + esc(info.received) + ', and a receipt went to your email. ' +
      'To correct or add to it, write to ' + mail('Reference for ' + info.applicant) + '.</p>' + ledgerHtml());
  }
  function showClosed() {
    range.textContent = 'This request is closed.';
    showState('<h3>This request has been closed</h3>' +
      '<p>The Academic Registrar is no longer collecting letters through this link. If you’d still like to write for ' + esc(info.applicant) + ', please email ' + mail('Reference for ' + info.applicant) + '.</p>');
  }

  /* ── The form ───────────────────────────────────────────────────────────── */

  function showForm() {
    var academic = info.kind === 'academic';
    // Only the questions for this kind of referee: hidden and disabled, so
    // they neither show nor count.
    $all('[data-kind]', form).forEach(function (el) {
      var on = el.getAttribute('data-kind') === info.kind;
      el.hidden = !on;
      $all('input, select, textarea', el).concat(el.matches('input, select, textarea') ? [el] : []).forEach(function (x) { x.disabled = !on; });
    });
    $all('[data-fill]').forEach(function (el) {
      var k = el.getAttribute('data-fill');
      el.textContent = k === 'first' ? firstName() : info[k] || '';
    });
    var detail = academic ? (info.referee.institution || '') : (info.relationship || '');
    if (detail) {
      var dd = ledger.querySelector('[data-fill="applicant"]');
      var small = document.createElement('small');
      small.textContent = (academic ? 'Lists you at ' : 'Lists you as: ') + detail;
      dd.appendChild(small);
    }
    range.textContent = (info.slot ? info.slot + '. ' : '') + 'Due ' + info.due + '.';
    document.getElementById('rf-sub').textContent = info.applicant + ' has applied to the ' + info.program +
      ' at the Institute for Christian Studies, Toronto, and named you as ' + (academic ? 'an academic referee' : 'their personal referee') + '.';

    var draft = loadDraft();
    var prefill = { name: info.referee.name, email: info.referee.email, institution: academic ? info.referee.institution : '' };
    Object.keys(prefill).forEach(function (k) { if (field(k) && !field(k).value) field(k).value = prefill[k] || ''; });
    restoreDraft(draft);

    loading.hidden = true;
    ledger.hidden = false;
    form.hidden = false;
    section.setAttribute('aria-busy', 'false');
    syncConditions();
    countWords();
  }

  function syncConditions() {
    $all('[data-show-when]', form).forEach(function (el) {
      var parts = el.getAttribute('data-show-when').split('=');
      el.hidden = val(parts[0]) !== parts[1];
    });
  }

  /* ── Draft (this device only; the file is never stored) ─────────────────── */

  function loadDraft() {
    try { return JSON.parse(localStorage.getItem(draftKey)) || {}; } catch (e) { return {}; }
  }
  var saveTimer;
  function saveDraft() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var data = {};
      $all('input[name], textarea[name], select[name]', form).forEach(function (el) {
        if (el.disabled || el.type === 'file') return;
        if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
        else if (el.type === 'checkbox') data[el.name] = el.checked;
        else data[el.name] = el.value;
      });
      try { localStorage.setItem(draftKey, JSON.stringify(data)); } catch (e) { /* private mode: no draft */ }
    }, 400);
  }
  function restoreDraft(d) {
    Object.keys(d).forEach(function (name) {
      $all('[name="' + name + '"]', form).forEach(function (el) {
        if (el.disabled) return;
        if (el.type === 'radio') el.checked = el.value === d[name];
        else if (el.type === 'checkbox') el.checked = d[name] === true;
        else if (d[name]) el.value = d[name];
      });
    });
  }
  function clearDraft() { try { localStorage.removeItem(draftKey); } catch (e) { /* nothing kept */ } }

  /* ── Letter: a file, or typed ───────────────────────────────────────────── */

  var slot = form.querySelector('[data-doc="letter"]');
  var drop = slot.querySelector('.af-drop');
  var input = slot.querySelector('input[type="file"]');
  var list = slot.querySelector('.af-files');

  function renderFile(problem) {
    list.innerHTML = '';
    if (letterFile) {
      var li = document.createElement('li');
      li.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7zM14 3v5h5"/></svg>' +
        '<span class="af-file-name">' + esc(letterFile.name) + '</span><span class="af-file-size">' + sizeLabel(letterFile.size) + '</span>' +
        '<button type="button" class="af-file-remove">Remove<span class="af-sr"> ' + esc(letterFile.name) + '</span></button>';
      li.querySelector('button').addEventListener('click', function () { letterFile = null; renderFile(); input.focus(); });
      list.appendChild(li);
    }
    if (problem) {
      var p = document.createElement('li');
      p.className = 'af-file-problem';
      p.textContent = problem;
      list.appendChild(p);
    }
    drop.hidden = !!letterFile;
  }
  function fileType(file) {
    var ext = (file.name.match(/\.([a-z0-9]+)$/i) || [])[1];
    return ext ? FILE_TYPES[ext.toLowerCase()] || '' : '';
  }
  function takeFile(files) {
    var file = files && files[0];
    if (!file) return;
    if (!fileType(file)) return renderFile('“' + file.name + '” can’t be uploaded here. Use a PDF or Word file, or type your letter instead.');
    if (file.size > CONFIG.MAX_FILE_BYTES) return renderFile('“' + file.name + '” is ' + sizeLabel(file.size) + '; the limit is 10 MB. Try saving it as a smaller PDF.');
    letterFile = file;
    clearFieldError(slot);
    renderFile();
  }
  input.addEventListener('change', function () { takeFile(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(function (t) {
    drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
  });
  ['dragleave', 'drop'].forEach(function (t) {
    drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
  });
  drop.addEventListener('drop', function (e) { takeFile(e.dataTransfer.files); });

  var countEl = document.getElementById('rf-count');
  function countWords() {
    var n = words(field('letter').value);
    countEl.textContent = n === 0 ? 'At least ' + CONFIG.MIN_WORDS + ' words.'
      : n.toLocaleString('en-CA') + (n === 1 ? ' word' : ' words') + (n < CONFIG.MIN_WORDS ? ' (at least ' + CONFIG.MIN_WORDS + ')' : '');
    countEl.classList.toggle('is-short', n > 0 && n < CONFIG.MIN_WORDS);
  }
  field('letter').addEventListener('input', countWords);

  /* ── Validation ─────────────────────────────────────────────────────────── */

  var HOSTS = '.af-field, .af-choices, .af-doc';
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setError(target, message) {
    var host = target.closest(HOSTS);
    if (!host) return;
    var box = host.querySelector(':scope > .af-error-msg');
    if (!box) {
      box = document.createElement('p');
      box.className = 'af-error-msg';
      box.id = (target.id || target.name || 'rf') + '-error';
      host.appendChild(box);
    }
    box.textContent = message;
    host.classList.add('has-error');
    $all('input, textarea, select', host).forEach(function (el) {
      if (el.type !== 'file') { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-errormessage', box.id); }
    });
  }
  function clearFieldError(host) {
    if (!host) return;
    var box = host.querySelector(':scope > .af-error-msg');
    if (box) box.remove();
    host.classList.remove('has-error');
    $all('[aria-invalid]', host).forEach(function (el) { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-errormessage'); });
  }
  function clearErrors() {
    $all('.af-error-msg', form).forEach(function (e) { e.remove(); });
    $all('.has-error', form).forEach(function (e) { e.classList.remove('has-error'); });
    $all('[aria-invalid]', form).forEach(function (e) { e.removeAttribute('aria-invalid'); e.removeAttribute('aria-errormessage'); });
    errorBox.hidden = true;
  }

  /** Marks every problem; returns the first problem element, or null. */
  function validate() {
    clearErrors();
    var first = null;
    var academic = info.kind === 'academic';
    function fail(el, msg) { setError(el, msg); if (!first) first = el; }
    var radio = function (name) { return $all('input[name="' + name + '"]', form).filter(function (r) { return !r.disabled; })[0]; };

    if (!val('name')) fail(field('name'), 'Enter your name.');
    if (!val('email')) fail(field('email'), 'Enter your email address.');
    else if (!EMAIL.test(val('email'))) fail(field('email'), 'Check your email address; it should look like name@example.com.');
    if (academic && !val('title')) fail(field('title'), 'Enter your position, for example your academic rank or role.');
    if (academic && !val('institution')) fail(field('institution'), 'Enter your institution.');

    if (!val('capacity')) fail(radio('capacity'), 'Choose how you know ' + firstName() + '.');
    else if (val('capacity') === 'other' && !val('capacityOther')) fail(field('capacityOther'), 'Say briefly how you know ' + firstName() + '.');
    if (!val('known')) fail(field('known'), 'Choose how long you have known ' + firstName() + '.');
    if (academic && !val('recommendation')) fail(radio('recommendation'), 'Choose your overall recommendation.');

    if (val('mode') === 'upload') {
      if (!letterFile) fail(input, 'Upload your letter, or choose “Type it here” to write it on this page.');
    } else {
      var n = words(field('letter').value);
      if (n === 0) fail(field('letter'), 'Write your letter here, or choose “Upload a file”.');
      else if (n < CONFIG.MIN_WORDS) fail(field('letter'), 'Your letter has ' + n + ' words. Please write at least ' + CONFIG.MIN_WORDS + ', or upload a file.');
    }
    if (!field('declaration').checked) fail(field('declaration'), 'Confirm that the letter is your own and accurate.');
    if (!val('signature')) fail(field('signature'), 'Type your full name to sign.');
    return first;
  }

  /* ── Sending ────────────────────────────────────────────────────────────── */

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve({ name: file.name, type: fileType(file), data: String(r.result).split(',')[1] }); };
      r.onerror = function () { reject(r.error); };
      r.readAsDataURL(file);
    });
  }

  function payload(file) {
    var academic = info.kind === 'academic';
    return {
      kind: 'reference',
      token: token,
      referee: {
        name: val('name'), email: val('email'), phone: val('phone'),
        title: academic ? val('title') : '',
        institution: academic ? val('institution') : val('organization')
      },
      capacity: val('capacity'),
      capacityOther: val('capacity') === 'other' ? val('capacityOther') : '',
      known: val('known'),
      recommendation: academic ? val('recommendation') : '',
      letter: file ? { file: file } : { text: field('letter').value },
      declaration: field('declaration').checked,
      signature: val('signature')
    };
  }

  function showSendError(message) {
    sending = false;
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send my letter';
    form.hidden = false;
    ledger.hidden = false;
    state.hidden = true;
    errorBox.innerHTML = '<strong>Your letter wasn’t sent.</strong> ' + message;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ block: 'center' });
    errorBox.focus({ preventScroll: true });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    var problem = validate();
    if (problem) {
      var count = $all('.af-error-msg', form).length;
      errorBox.innerHTML = '<strong>' + (count === 1 ? 'One answer needs' : count + ' answers need') + ' attention.</strong> Each is marked below.';
      errorBox.hidden = false;
      var host = problem.closest(HOSTS) || problem;
      host.scrollIntoView({ block: 'center' });
      (problem.type === 'file' ? slot.querySelector('.af-drop-label') : problem).focus({ preventScroll: true });
      return;
    }
    sending = true;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending…';

    var useFile = val('mode') === 'upload';
    (useFile ? readFile(letterFile) : Promise.resolve(null))
      .then(function (file) {
        form.hidden = true;
        ledger.hidden = true;
        showState('<h3>Sending your letter…</h3><p>Please keep this page open. A large file can take a minute.</p><div class="af-sending-rule"></div>', true);
        return fetch(CONFIG.SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload(file))
        });
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.ok) return succeed(data);
        if (data && data.error === 'invalid') return showSendError(esc(data.message) + ' Correct it and send again.');
        if (data && (data.error === 'not_found' || data.error === 'closed')) {
          return showSendError(esc(data.message) + ' You can email your letter to ' + mail('Letter of reference for ' + info.applicant) + '.');
        }
        showSendError('Something went wrong on our side. Your answers are still here; try again in a few minutes, or email your letter to ' + mail('Letter of reference for ' + info.applicant) + '.');
      })
      .catch(function () {
        showSendError('The connection dropped before we heard back. Check your connection and send again; if your letter did arrive, you’ll be told it’s already received. You can also email it to ' + mail('Letter of reference for ' + info.applicant) + '.');
      });
  });

  function succeed(data) {
    sending = false;
    clearDraft();
    var email = val('email');
    var today = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
    info.received = data.duplicate && data.received ? data.received : today;
    range.textContent = 'Your letter is in. Thank you.';
    showState('<h3>Thank you. Your letter has arrived.</h3>' +
      '<p>' + (data.duplicate
        ? 'We already had your letter for ' + esc(info.applicant) + ', so nothing more is needed.'
        : 'Your letter for ' + esc(info.applicant) + ' is with the Academic Registrar, and a receipt is on its way to <b>' + esc(email) + '</b>. ' + esc(firstName()) + ' will hear that it arrived, but not what it says.') +
      ' To correct anything, reply to the receipt or write to ' + mail('Reference for ' + info.applicant) + '.</p>' + ledgerHtml(), true);
    state.scrollIntoView({ block: 'start' });
  }

  /* ── Wiring ─────────────────────────────────────────────────────────────── */

  form.addEventListener('input', function (e) {
    saveDraft();
    if (e.target.closest('.has-error')) clearFieldError(e.target.closest(HOSTS));
  });
  form.addEventListener('change', function (e) {
    syncConditions();
    saveDraft();
    if (e.target.closest('.has-error')) clearFieldError(e.target.closest(HOSTS));
  });
  window.addEventListener('beforeunload', function (e) {
    if (sending) { e.preventDefault(); e.returnValue = ''; }
  });

  renderFile();
  lookup();
})();
