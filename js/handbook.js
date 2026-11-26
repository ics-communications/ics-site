/* Junior Member Handbook (single page): the sidebar.
   - marks the chapter in view, and the section within it, and keeps that
     row visible in the sidebar;
   - below 1120px opens the sidebar as a drawer from the bar;
   - searches the whole handbook, lists the places in the sidebar and marks
     the words in the section a result opens.
   The search shares its synonyms and ranking with js/handbook-guide.js, so
   both editions find the same things. The page reads fully without this
   script: the sidebar is plain anchor links and the search stays hidden. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };

  var side = $('#hb-side');
  var bar = $('.hb-bar');
  var chapters = $$('.hb-ch');
  if (!side || !chapters.length) return;

  var nav = $('.hb-side__nav', side);
  var form = $('.hb-search', side);
  var input = $('#hb-q');
  var clearBtn = $('.hb-search__clear', side);
  var results = $('#hb-results');
  var resMeta = $('.hb-results__meta', results);
  var resList = $('.hb-results__list', results);
  var menuBtn = bar && $('.hb-bar__menu', bar);
  var findBtn = bar && $('.hb-bar__search', bar);
  var where = bar && $('.hb-bar__where', bar);
  var closeBtn = $('.hb-side__close', side);
  var narrow = window.matchMedia('(max-width: 1119px)');

  form.hidden = false;

  /* ------------------------------------------------------ place-keeping */
  var rows = {};
  $$('.hb-side__ch', side).forEach(function (li) { rows[li.getAttribute('data-ch')] = li; });
  var heads = {};          // chapter id -> its h3s, in order
  chapters.forEach(function (c) { heads[c.id] = $$('.hb-ch__body h3[id]', c); });

  var curCh = null, curSub = null;
  function keepInView(el) {
    if (!el || side.matches(':hover') || side.contains(doc.activeElement)) return;
    var top = $('.hb-side__head', side).offsetHeight;
    var s = side.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (r.top < s.top + top + 8) side.scrollTop -= (s.top + top + 8 - r.top);
    else if (r.bottom > s.bottom - 8) side.scrollTop += (r.bottom - s.bottom + 8);
  }
  function markChapter(id) {
    if (id === curCh) return;
    if (curCh && rows[curCh]) {
      rows[curCh].classList.remove('is-current');
      $('.hb-side__link', rows[curCh]).removeAttribute('aria-current');
    }
    curCh = id;
    var li = id && rows[id];
    if (where) {
      where.textContent = li
        ? $('.hb-side__no', li).textContent + ' · ' + $('.hb-side__name', li).textContent
        : '';
    }
    if (!li) return;
    li.classList.add('is-current');
    $('.hb-side__link', li).setAttribute('aria-current', 'true');
  }
  function markSub(hid) {
    if (hid === curSub) return;
    if (curSub) {
      var old = $('.hb-side__subs a.is-current', side);
      if (old) { old.classList.remove('is-current'); old.removeAttribute('aria-current'); }
    }
    curSub = hid;
    var a = hid && $('.hb-side__subs a[href="#' + hid + '"]', side);
    if (a) { a.classList.add('is-current'); a.setAttribute('aria-current', 'true'); }
  }

  // The chapter (and section) whose top has passed a line a quarter of the
  // way down the screen is the one being read.
  var ticking = false;
  function update() {
    ticking = false;
    var line = (bar ? bar.offsetHeight : 0) + window.innerHeight * 0.25;
    var id = null;
    for (var i = 0; i < chapters.length; i++) {
      if (chapters[i].getBoundingClientRect().top <= line) id = chapters[i].id;
      else break;
    }
    var hid = null;
    (heads[id] || []).some(function (h) {
      if (h.getBoundingClientRect().top <= line) { hid = h.id; return false; }
      return true;
    });
    markChapter(id);
    markSub(hid);
    if (!narrow.matches && nav && !nav.hidden) {
      keepInView(hid ? $('.hb-side__subs a.is-current', side) : (id && $('.hb-side__link', rows[id])));
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();

  /* ------------------------------------------------------------- drawer */
  var scrim = doc.createElement('div');
  scrim.className = 'hb-scrim';
  scrim.setAttribute('aria-hidden', 'true');
  doc.body.appendChild(scrim);
  var opener = null;

  function isOpen() { return side.classList.contains('is-open'); }
  function openDrawer(toSearch, from) {
    if (!narrow.matches) {
      if (toSearch) input.focus();
      return;
    }
    opener = from || null;
    side.classList.add('is-open');
    scrim.classList.add('is-on');
    root.classList.add('hb-drawer-open');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    side.setAttribute('role', 'dialog');
    side.setAttribute('aria-modal', 'true');
    if (toSearch) {
      input.focus();
    } else {
      var cur = $('.hb-side__subs a.is-current', side) || (curCh && $('.hb-side__link', rows[curCh]));
      var target = (results.hidden ? cur : $('.hb-res', results)) || input;
      target.focus({ preventScroll: true });
      if (target.scrollIntoView) target.scrollIntoView({ block: 'center' });
    }
  }
  function closeDrawer(restore) {
    if (!isOpen()) return;
    side.classList.remove('is-open');
    scrim.classList.remove('is-on');
    root.classList.remove('hb-drawer-open');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    side.removeAttribute('role');
    side.removeAttribute('aria-modal');
    if (restore && opener) opener.focus({ preventScroll: true });
    opener = null;
  }
  if (menuBtn) menuBtn.addEventListener('click', function () { openDrawer(false, menuBtn); });
  if (findBtn) findBtn.addEventListener('click', function () { openDrawer(true, findBtn); });
  if (closeBtn) closeBtn.addEventListener('click', function () { closeDrawer(true); });
  scrim.addEventListener('click', function () { closeDrawer(true); });
  var onChange = function () { if (!narrow.matches) closeDrawer(false); update(); };
  if (narrow.addEventListener) narrow.addEventListener('change', onChange);
  else if (narrow.addListener) narrow.addListener(onChange);

  // a link in the drawer closes it first, so the page can scroll to the place
  side.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (a && isOpen()) closeDrawer(false);
  });

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (isOpen()) { e.preventDefault(); closeDrawer(true); return; }
      if (doc.activeElement === input && input.value) { e.preventDefault(); clearSearch(true); }
      return;
    }
    // keep Tab inside the open drawer
    if (e.key === 'Tab' && isOpen()) {
      var f = $$('a[href], button, input', side).filter(function (el) {
        return !el.hidden && el.offsetParent !== null;
      });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }
    // "/" anywhere but a text field goes to the search
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      openDrawer(true, findBtn);
      input.focus();
      input.select();
    }
  });

  /* ------------------------------------------------------------- search */
  var SYN = {
    student: ['junior member'], students: ['junior member'],
    teacher: ['senior member'], teachers: ['senior member'], professor: ['senior member'],
    professors: ['senior member'], faculty: ['senior member'], instructor: ['senior member'],
    supervisor: ['mentor'], advisor: ['mentor'], adviser: ['mentor'],
    cost: ['tuition', 'fee'], costs: ['tuition', 'fee'], price: ['tuition', 'fee'],
    fees: ['tuition', 'fee'], afford: ['tuition', 'financial'], money: ['financial', 'tuition'],
    pay: ['tuition', 'payment'], paying: ['tuition', 'payment'],
    scholarship: ['financial', 'bursar'], scholarships: ['financial', 'bursar'],
    aid: ['financial'], loan: ['osap', 'student loans'], loans: ['osap', 'student loans'],
    funding: ['financial'], bursary: ['bursar'],
    apply: ['admission'], applying: ['admission'], application: ['admission'],
    requirements: ['prerequisite'], admit: ['admission'],
    online: ['on-line', 'zoom'], remote: ['on-line', 'zoom'], distance: ['on-line'],
    master: ['ma'], masters: ['ma'], doctorate: ['phd'], doctoral: ['phd'],
    due: ['deadline'], dates: ['deadline', 'calendar'],
    drop: ['dropping', 'withdraw'], quit: ['withdraw', 'termination'],
    pause: ['leave of absence'], break: ['leave of absence'],
    fail: ['failing', 'unsatisfactory'], marks: ['grade'], grades: ['grade'],
    contact: ['contacts'], phone: ['contacts'], email: ['contacts', 'email'],
    'non-degree': ['special studies'], nondegree: ['special studies']
  };

  // one character in, one character out, so positions in the folded text
  // are positions in the page's text
  function foldChar(c) {
    var n = c.normalize ? c.normalize('NFD') : c;
    return n.charAt(0).toLowerCase();
  }
  function fold(s) { return Array.prototype.map.call(s, foldChar).join(''); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function html(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function wordRe(alt, flags) {
    return new RegExp('(?:^|[^a-z0-9])(' + esc(alt) + ')' + (alt.length <= 3 ? '(?![a-z0-9])' : ''), flags || 'i');
  }
  function anyRe(alts) {
    return new RegExp(alts.map(function (x) {
      return '(?:^|[^a-z0-9])(' + esc(x) + ')' + (x.length <= 3 ? '(?![a-z0-9])' : '');
    }).join('|'), 'gi');
  }
  function clean(s) { return s.replace(/\s+/g, ' ').trim(); }

  // One record per chapter opening, per section (h3) and per sub-heading (h4).
  var index = null;
  function buildIndex() {
    index = [];
    var order = 0;
    chapters.forEach(function (c) {
      var body = $('.hb-ch__body', c);
      var no = $('.hb-ch__no', c);
      var num = no ? no.textContent : '';
      var short = c.getAttribute('data-short') || '';
      var h2 = $('.hb-ch__title', c).cloneNode(true);
      $$('.hb-ch__label', h2).forEach(function (x) { x.remove(); });
      var chTitle = clean(h2.textContent);
      var chWhere = num + ' · ' + short;
      var hs = $$('h3[id], h4[id]', body).filter(function (h) {
        return !h.classList.contains('label') && !h.closest('aside');
      });
      var recs = [{ id: c.id, title: chTitle, where: chWhere, parent: '', parts: [], nodes: [], order: order++, top: true }];
      var h3 = '';
      hs.forEach(function (h) {
        var t = clean(h.textContent);
        if (h.tagName === 'H3') h3 = t;
        recs.push({ id: h.id, title: t, where: chWhere, parent: h.tagName === 'H4' ? h3 : '',
                    parts: [], nodes: [], order: order++, el: h });
      });
      var walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);
      var cur = recs[0], next = 0, node;
      while ((node = walker.nextNode())) {
        var p = node.parentNode;
        if (p.closest('.hb-ch__label, .footnote-back, script, style')) continue;
        while (next < hs.length && (hs[next] === p || hs[next].contains(node) ||
               (hs[next].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING))) {
          cur = recs[next + 1];
          next++;
        }
        cur.nodes.push(node);
        // a heading's own words are its title, not part of its text
        if (!(cur.el && cur.el.contains(node))) cur.parts.push(node.nodeValue);
      }
      recs.forEach(function (r) {
        // blank form lines ("________") say nothing in a snippet
        r.raw = clean(r.parts.join(' ').replace(/_{3,}/g, ' '));
        r.f = fold(r.raw);
        r.ft = fold(r.title);
        r.fw = fold(r.where + ' ' + r.parent);
        delete r.parts;
        index.push(r);
      });
    });
  }

  // words a student puts around the question ("how much does it cost") that no heading contains
  var STOP = {};
  ('a an and are as at be been by can could did do does for from get give go have how i if in into is it its me '
    + 'much my need of on or our should so some than that the their there this to us was we what when where which '
    + 'who why will with would you your about know want find tell').split(' ').forEach(function (w) { STOP[w] = 1; });

  // words that name everyone the handbook is about: they help a ranking but never decide a match
  var WEAK = { student: 1, students: 1, junior: 1, member: 1, members: 1, ics: 1, institute: 1 };

  function parse(q) {
    var tokens = [], kept = [];
    var re = /"([^"]+)"|(\S+)/g, m;
    while ((m = re.exec(q))) {
      var t = fold((m[1] || m[2]).replace(/^[^\w]+|[^\w]+$/g, ''));
      if (!t) continue;
      tokens.push(t);
      if (m[1] || !STOP[t]) kept.push(t);
    }
    if (!kept.length) kept = tokens;           // a search made only of small words still runs
    return kept.map(function (t) {
      var alts = [t];
      (SYN[t] || []).forEach(function (a) { alts.push(a); });
      alts.weak = !!WEAK[t];
      return alts;
    });
  }

  function count(re, s, cap) {
    var n = 0, m;
    var g = new RegExp(re.source, 'gi');
    while ((m = g.exec(s)) && n < cap) { n++; if (g.lastIndex === m.index) g.lastIndex++; }
    return n;
  }

  function search(q) {
    if (!index) buildIndex();
    var toks = parse(q);
    if (!toks.length) return { hits: [], alts: [], total: 0 };
    var tokRes = toks.map(function (alts) { return alts.map(function (a) { return wordRe(a); }); });
    var plain = toks.map(function (alts) { return alts[0]; }).join(' ');
    var starts = new RegExp('^' + esc(plain) + '(?![a-z0-9])');
    var strong = toks.filter(function (alts) { return !alts.weak; }).length;
    var needAll = strong || toks.length;
    var all = [], some = [];
    index.forEach(function (r) {
      var score = 0, matched = 0;
      for (var i = 0; i < tokRes.length; i++) {
        var best = 0;
        tokRes[i].forEach(function (re, j) {
          var s = 0;
          if (re.test(r.ft)) s += 8;
          if (re.test(r.fw)) s += 2;
          s += count(re, r.f, 6);
          if (j > 0) s *= 0.7;           // a synonym counts for a little less than the word itself
          if (s > best) best = s;
        });
        if (best <= 0) continue;
        if (strong && toks[i].weak) score += best * 0.3;
        else { matched++; score += best; }
      }
      if (!matched) return;
      // a heading that is, or begins with, what was typed is what they are after
      if (r.ft === plain) score += 40;
      else if (starts.test(r.ft)) score += 15;
      if (r.parent === '') score += 4;   // a section outranks a sub-heading inside one
      var hit = { rec: r, score: score, matched: matched };
      some.push(hit);
      if (matched === needAll) all.push(hit);
    });
    var byScore = function (x, y) { return y.score - x.score || x.rec.order - y.rec.order; };
    var byMatch = function (x, y) { return y.matched - x.matched || byScore(x, y); };
    var partial = false, out = all.sort(byScore);
    if (needAll > 1 && all.length < 5) {
      // few places have every word: put those first, then the ones with the most of them
      var rest = some.filter(function (h) { return h.matched < needAll; }).sort(byMatch);
      partial = out.length ? 'some' : 'none';
      out = out.concat(rest);
    }
    var flat = [];
    toks.forEach(function (alts) { alts.forEach(function (a) { if (flat.indexOf(a) < 0) flat.push(a); }); });
    return { hits: out.slice(0, 40), total: out.length, alts: flat, partial: partial };
  }

  function snippet(r, alts) {
    var f = r.f, pos = -1;
    alts.forEach(function (a) {
      var m = wordRe(a).exec(f);
      if (m) {
        var p = m.index + m[0].length - m[1].length;
        if (pos < 0 || p < pos) pos = p;
      }
    });
    if (pos < 0) return html(r.raw.slice(0, 140)) + (r.raw.length > 140 ? '…' : '');
    var a = Math.max(0, pos - 50), b = Math.min(r.raw.length, pos + 110);
    while (a > 0 && /\S/.test(r.raw.charAt(a - 1))) a--;
    while (b < r.raw.length && /\S/.test(r.raw.charAt(b))) b++;
    var seg = r.raw.slice(a, b), fseg = f.slice(a, b);
    var re = anyRe(alts);
    var out = '', last = 0, m;
    while ((m = re.exec(fseg))) {
      var hit = m.slice(1).filter(Boolean)[0];
      var s = m.index + m[0].length - hit.length;
      out += html(seg.slice(last, s)) + '<mark>' + html(seg.slice(s, s + hit.length)) + '</mark>';
      last = s + hit.length;
      if (re.lastIndex === m.index) re.lastIndex++;
    }
    out += html(seg.slice(last));
    return (a > 0 ? '…' : '') + out + (b < r.raw.length ? '…' : '');
  }

  // mark the searched words in the section a result opens (CSS Custom
  // Highlight API: nothing in the page's markup changes)
  var canMark = !!(window.CSS && CSS.highlights && window.Highlight);
  function markWords(rec, alts) {
    if (!canMark) return;
    CSS.highlights.delete('hb-hit');
    if (!rec || !alts.length) return;
    var ranges = [];
    rec.nodes.forEach(function (node) {
      var text = fold(node.nodeValue), re = anyRe(alts), m;
      while ((m = re.exec(text))) {
        var hit = m.slice(1).filter(Boolean)[0];
        var s = m.index + m[0].length - hit.length;
        var r = doc.createRange();
        r.setStart(node, s);
        r.setEnd(node, s + hit.length);
        ranges.push(r);
        if (re.lastIndex === m.index) re.lastIndex++;
      }
    });
    if (ranges.length) {
      var h = new Highlight();
      ranges.forEach(function (r) { h.add(r); });
      CSS.highlights.set('hb-hit', h);
    }
  }

  var shown = [], lastAlts = [];
  function showResults(q) {
    var res = search(q);
    shown = res.hits;
    lastAlts = res.alts;
    resList.innerHTML = '';
    if (!res.hits.length) {
      resMeta.innerHTML = 'Nothing in the handbook matches “' + html(q) + '”. Try one or two key words, '
        + 'browse the <a href="#contents">contents</a>, or ask the Registrar at '
        + '<a href="mailto:academic-registrar@icscanada.edu">academic-registrar@icscanada.edu</a>.';
    } else {
      var n = res.total;
      var places = res.total > res.hits.length
        ? 'The best ' + res.hits.length + ' of ' + n + ' places'
        : n + (n === 1 ? ' place' : ' places');
      resMeta.textContent = res.partial === 'none'
        ? 'No one place has all of those words. ' + places + ' with some of them.'
        : res.partial === 'some'
          ? 'Only a few places have all of those words; they come first. ' + places + '.'
          : places + (n === 1 ? ' matches “' : ' match “') + clean(q) + '”.';
      var frag = doc.createDocumentFragment();
      res.hits.forEach(function (h, i) {
        var li = doc.createElement('li');
        var a = doc.createElement('a');
        a.className = 'hb-res';
        a.href = '#' + h.rec.id;
        a.setAttribute('data-i', i);
        a.innerHTML = '<span class="hb-res__where">' + html(h.rec.where + (h.rec.parent ? ' · ' + h.rec.parent : '')) + '</span>'
          + '<span class="hb-res__t">' + html(h.rec.title) + '</span>'
          + '<span class="hb-res__s">' + snippet(h.rec, res.alts) + '</span>';
        li.appendChild(a);
        frag.appendChild(li);
      });
      resList.appendChild(frag);
    }
    results.hidden = false;
    nav.hidden = true;
    side.scrollTop = 0;
  }

  function clearSearch(keepFocus) {
    input.value = '';
    clearBtn.hidden = true;
    results.hidden = true;
    nav.hidden = false;
    resList.innerHTML = '';
    resMeta.textContent = '';
    shown = [];
    if (canMark) CSS.highlights.delete('hb-hit');
    update();
    if (keepFocus) input.focus();
  }

  var timer = null;
  input.addEventListener('input', function () {
    clearTimeout(timer);
    var q = input.value;
    clearBtn.hidden = !q;
    if (!q.trim()) { clearSearch(false); return; }
    timer = setTimeout(function () { showResults(q); }, 140);
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearTimeout(timer);
    if (!input.value.trim()) return;
    showResults(input.value);
    var first = $('.hb-res', resList);
    if (first) first.click();
  });
  clearBtn.addEventListener('click', function () { clearSearch(true); });

  resList.addEventListener('click', function (e) {
    var a = e.target.closest('.hb-res');
    if (!a) return;
    var h = shown[+a.getAttribute('data-i')];
    $$('.hb-res.is-active', resList).forEach(function (x) { x.classList.remove('is-active'); });
    a.classList.add('is-active');
    if (h) markWords(h.rec, lastAlts);
    // the jump itself is the link's own (the sidebar's click handler closes
    // the drawer first)
  });

  // arrow keys move between the field and the results
  side.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    var items = $$('.hb-res', resList);
    if (!items.length || results.hidden) return;
    var i = items.indexOf(doc.activeElement);
    if (doc.activeElement === input) {
      if (e.key === 'ArrowDown') { e.preventDefault(); items[0].focus(); }
      return;
    }
    if (i < 0) return;
    e.preventDefault();
    if (e.key === 'ArrowDown' && i < items.length - 1) items[i + 1].focus();
    else if (e.key === 'ArrowUp') (i > 0 ? items[i - 1] : input).focus();
  });
})();
