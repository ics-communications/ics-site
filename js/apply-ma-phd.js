/* Apply to the MA or PhD — the page's own small behaviours.

   The form itself is run by js/application.js (a copy of the philosophy
   site's script). This file only does two things around it:

     1. Deadline. Reads the next "Application Deadline: MA & PhD" row from
        the academic calendar page, which is synced from the Registrar's
        Google Sheet, and writes its full date and distance into the
        deadline line. One source of truth: when the sheet changes, this
        page follows. If the calendar can't be read, the static line in
        the HTML stays as it is.

     2. Rail. Marks the part of the application the reader is in, the way
        the calendar's rail marks a term.

   Usage: <script src="../js/apply-ma-phd.js" defer></script>, after
   footer.js and extlinks.js. */
(function () {
  'use strict';

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var MS_PER_DAY = 86400000;

  /* Same date handling as js/calendar.js: compare local dates, never
     instants, and never parse a bare ISO date as UTC. */
  function today() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function parseISO(str) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function relative(days) {
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    if (days < 7) return 'in ' + days + ' days';
    if (days < 14) return 'next week';
    if (days < 60) return 'in ' + Math.round(days / 7) + ' weeks';
    return 'in ' + Math.round(days / 30) + ' months';
  }

  /* ── 1. Deadline ─────────────────────────────────────────────────────── */

  var line = document.getElementById('apply-deadline');
  if (line && window.fetch && window.DOMParser) {
    fetch('academic-calendar.html', { cache: 'no-cache' })
      .then(function (res) { if (!res.ok) throw new Error(res.status); return res.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var now = today();
        var next = null;
        var rows = doc.querySelectorAll('.cal-ev--deadline[data-date]');
        for (var i = 0; i < rows.length; i++) {
          var title = rows[i].querySelector('.cal-ev__title');
          if (!title || !/application deadline/i.test(title.textContent) ||
              !/\bMA\b[\s\S]*\bPhD\b/.test(title.textContent)) continue;
          var date = parseISO(rows[i].getAttribute('data-date'));
          if (date && date >= now && (!next || date < next)) next = date;
        }
        if (!next) return;   // nothing announced yet: keep the static line

        var days = Math.round((next - now) / MS_PER_DAY);
        line.querySelector('[data-deadline-date]').textContent =
          MONTHS[next.getMonth()] + ' ' + next.getDate() + ', ' + next.getFullYear();
        line.querySelector('[data-deadline-rel]').textContent = relative(days);
        line.classList.add('is-dated');
      })
      .catch(function () { /* offline, or opened from disk: static line stands */ });
  }

  /* ── 2. Rail ─────────────────────────────────────────────────────────── */

  var links = Array.prototype.slice.call(document.querySelectorAll('.ap-jump__list a'));
  if (!links.length || !('IntersectionObserver' in window)) return;

  var targets = links.map(function (a) {
    return document.getElementById(a.getAttribute('href').slice(1));
  });
  var visible = {};

  function mark(id) {
    links.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('is-current', on);
      if (on) {
        a.setAttribute('aria-current', 'location');
        /* Keep the marked item in view on a rail that scrolls sideways. */
        var list = a.closest('.ap-jump__list');
        var left = a.offsetLeft - list.offsetLeft;
        if (left < list.scrollLeft || left + a.offsetWidth > list.scrollLeft + list.clientWidth) {
          list.scrollLeft = left - 24;
        }
      } else {
        a.removeAttribute('aria-current');
      }
    });
  }

  /* The current part is the last one whose top has passed a line just
     under the rail. */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
    var current = null;
    targets.forEach(function (t) {
      if (t && !t.closest('[hidden]') && visible[t.id]) current = current || t.id;
    });
    if (current) { mark(current); return; }
    /* Nothing in the band: keep the last mark unless its part has gone
       (the form is replaced by the confirmation once it is sent). */
    var on = document.querySelector('.ap-jump__list a.is-current');
    var t = on && document.getElementById(on.getAttribute('href').slice(1));
    if (on && (!t || t.closest('[hidden]'))) mark(null);
  }, { rootMargin: '-18% 0px -60% 0px' });

  targets.forEach(function (t) { if (t) io.observe(t); });
})();
