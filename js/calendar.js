/* Academic Calendar — put the reader's own "now" into the page.

   The page ships from scripts/sync-calendar.mjs with every term already in
   the markup, oldest first, so it is complete and readable with no
   JavaScript at all. What this file adds is the one thing the build step
   cannot know: today's date.

     - the term under way moves to the top and is labelled;
     - upcoming terms follow it in order;
     - finished terms move into a closed "past terms" disclosure;
     - inside the current term, dates that have passed are dimmed, a rule
       marks where today falls, and the next date is called out.

   Without this file the visitor still gets the whole calendar in
   chronological order — worse, but never broken. Nothing here fetches.

   Usage: <script src="../js/calendar.js" defer></script>, after footer.js
   and extlinks.js. */
(function () {
  'use strict';

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  var MS_PER_DAY = 86400000;

  /* Midnight today, in the reader's own timezone. Comparing dates rather
     than instants is what makes "a deadline today is not yet past" true. */
  function today() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /* "2026-09-11" → local midnight on that day. Deliberately not
     new Date(str), which parses a bare date as UTC and lands on the
     previous day for anyone west of Greenwich. */
  function parseISO(str) {
    if (!str) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }

  function daysBetween(from, to) {
    return Math.round((to - from) / MS_PER_DAY);
  }

  function longDate(d) {
    return MONTHS[d.getMonth()] + ' ' + d.getDate();
  }

  function relative(days) {
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    if (days < 7) return 'in ' + days + ' days';
    if (days < 14) return 'next week';
    if (days < 60) return 'in ' + Math.round(days / 7) + ' weeks';
    return 'in ' + Math.round(days / 30) + ' months';
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ------------------------------------------------------------ terms */

  function classify(terms, now) {
    var current = null;
    var upcoming = [];
    var past = [];

    terms.forEach(function (term) {
      var start = parseISO(term.getAttribute('data-start'));
      var end = parseISO(term.getAttribute('data-end'));

      /* A term with unreadable dates is left where it is rather than
         guessed at — it stays visible, which is the safe failure. */
      if (!start || !end) { upcoming.push(term); return; }

      if (now > end) past.push(term);
      else if (now < start) upcoming.push(term);
      else if (!current) current = term;
      else upcoming.push(term);
    });

    return { current: current, upcoming: upcoming, past: past };
  }

  function label(term, text, modifier) {
    var head = term.querySelector('.cal-term__head');
    if (!head) return;
    var badge = el('p', 'cal-term__status cal-term__status--' + modifier, text);
    head.insertBefore(badge, head.firstChild);
  }

  /* ----------------------------------------------------------- events */

  /* Dim what has already happened, mark where today sits, and name the
     next date. Only meaningful inside the term that is actually running. */
  function annotate(term, now) {
    var events = term.querySelectorAll('.cal-ev[data-date]');
    var next = null;
    var nextDate = null;

    Array.prototype.forEach.call(events, function (ev) {
      var date = parseISO(ev.getAttribute('data-date'));
      if (!date) return;

      if (date < now) {
        ev.classList.add('is-past');
        return;
      }
      if (!next) { next = ev; nextDate = date; }
    });

    if (!next) return;

    next.classList.add('is-next');

    /* The rule goes immediately before the next date, which is exactly
       where today falls in the list. */
    var marker = el('li', 'cal-today');
    marker.setAttribute('aria-hidden', 'true');
    marker.appendChild(el('span', 'cal-today__label', 'Today'));
    next.parentNode.insertBefore(marker, next);

    var title = next.querySelector('.cal-ev__title');
    var days = daysBetween(now, nextDate);

    var strip = el('p', 'cal-term__next');
    strip.appendChild(el('span', 'cal-term__next-label', 'Next up'));
    strip.appendChild(el('span', 'cal-term__next-date', longDate(nextDate)));

    /* Strip the asterisk out of the copied title and put a real one back,
       so a tentative date does not get announced here as though it were
       settled. */
    var tentative = next.querySelector('.cal-ev__tentative');
    var text = el('span', 'cal-term__next-title',
      title ? title.textContent.replace(/\s*\*\s*$/, '').trim() : '');

    if (tentative) {
      var star = el('abbr', 'cal-ev__tentative', '*');
      star.title = tentative.title;
      text.appendChild(document.createTextNode(' '));
      text.appendChild(star);
    }

    strip.appendChild(text);
    strip.appendChild(el('span', 'cal-term__next-rel', relative(days)));

    var head = term.querySelector('.cal-term__head');
    if (head && head.parentNode) head.parentNode.insertBefore(strip, head.nextSibling);
  }

  /* ------------------------------------------------------ empty state */

  /* Every term in the sheet has ended and none has been added for the term
     ahead. Without this the page would fold its entire contents into the
     archive and show a bare toggle, which reads as broken rather than as
     "not published yet". */
  function empty(host) {
    var box = el('div', 'cal-empty');
    box.appendChild(el('h2', 'cal-empty__title',
      'Dates for the coming term are not published yet'));
    box.appendChild(el('p', 'cal-empty__body',
      'Every term listed here has finished. The calendar for the term ahead ' +
      'is usually posted a few months in advance — past terms are below, and ' +
      'the Registrar can confirm a date in the meantime.'));

    var link = el('a', 'inline-link', 'academic-registrar@icscanada.edu');
    link.href = 'mailto:academic-registrar@icscanada.edu';
    var ask = el('p', 'cal-empty__body');
    ask.appendChild(document.createTextNode('Write to '));
    ask.appendChild(link);
    ask.appendChild(document.createTextNode('.'));
    box.appendChild(ask);

    host.appendChild(box);
  }

  /* ---------------------------------------------------------- archive */

  function archive(host, past, openByDefault) {
    if (!past.length) return;

    var box = el('details', 'cal-archive__box');
    var summary = el('summary', 'cal-archive__toggle');
    var noun = past.length === 1 ? '1 past term' : past.length + ' past terms';
    /* Both labels ship; CSS shows whichever matches the open state, so the
       control always names what the next click does. */
    summary.appendChild(el('span', 'cal-archive__show', 'View ' + noun));
    summary.appendChild(el('span', 'cal-archive__hide', 'Hide ' + noun));
    box.appendChild(summary);

    var body = el('div', 'cal-archive__body');
    /* Most recently finished first: the one a reader is likeliest to want. */
    past.slice().reverse().forEach(function (term) {
      term.classList.add('cal-term--past');
      label(term, 'Ended', 'past');
      body.appendChild(term);
    });

    /* When nothing current or upcoming is left, the archive is the only
       content there is — so it opens rather than hiding behind a click. */
    if (openByDefault) box.open = true;

    box.appendChild(body);
    host.appendChild(box);
    host.hidden = false;
  }

  /* ------------------------------------------------------------- jump */

  /* Drop links to terms nobody can see, and mark the one we opened on. */
  function trimJump(jump, order, currentCode) {
    if (!jump) return;

    var visible = {};
    order.forEach(function (term) { visible[term.getAttribute('data-term')] = true; });

    var items = jump.querySelectorAll('li');
    var left = 0;

    Array.prototype.forEach.call(items, function (li) {
      var link = li.querySelector('a');
      var code = link && link.getAttribute('data-term');

      if (!code || !visible[code]) { li.parentNode.removeChild(li); return; }

      left++;
      if (code === currentCode) {
        link.classList.add('is-current');
        link.setAttribute('aria-current', 'true');
      }
    });

    /* One term left is not a choice worth showing. */
    if (left < 2) jump.parentNode.removeChild(jump);
  }

  /* ------------------------------------------------------------- main */

  function run() {
    var host = document.querySelector('.cal-terms');
    if (!host) return;

    var terms = Array.prototype.slice.call(host.querySelectorAll('.cal-term'));
    if (!terms.length) return;

    var archiveHost = document.querySelector('.cal-archive');
    var jump = document.querySelector('.cal-jump');
    var now = today();
    var groups = classify(terms, now);

    /* If no term is running — a gap between terms — the next one to start
       leads the page, so the top of the page is never empty. */
    var lead = groups.current;
    var rest = groups.upcoming;

    if (!lead && rest.length) {
      lead = rest[0];
      rest = rest.slice(1);
    }

    var order = [];
    if (lead) order.push(lead);
    order = order.concat(rest);

    /* Re-append in the order we just decided. Moving the existing nodes,
       rather than rebuilding them, keeps the markup — and the print
       stylesheet — working on exactly what the reader sees. Terms that end
       up in the archive are moved out of this container below. */
    order.forEach(function (term) {
      host.appendChild(term);
    });

    if (lead) {
      if (lead === groups.current) {
        lead.classList.add('cal-term--current');
        label(lead, 'Current term', 'current');
        annotate(lead, now);
      } else {
        lead.classList.add('cal-term--next');
        label(lead, 'Starts soon', 'next');
      }
    }

    rest.forEach(function (term) { label(term, 'Upcoming', 'upcoming'); });

    if (!order.length) empty(host);

    if (archiveHost) archive(archiveHost, groups.past, !order.length);
    trimJump(jump, order, lead ? lead.getAttribute('data-term') : null);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
