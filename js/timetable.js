/* Course Timetable — put the reader's own "now", and their own program,
   into the page.

   The page ships from scripts/sync-timetable.mjs with every published
   course already in the markup, oldest term first, so it is complete and
   readable with no JavaScript at all. Courses that are not published are
   not hidden here — the sync never wrote them. What this file adds is the
   two things the build step cannot know:

     - today's date: the term under way moves to the top and is labelled,
       upcoming terms follow it, finished terms move into a closed "past
       terms" disclosure;
     - which program the reader is in: the filter above the terms ships
       hidden and is revealed here, because a control that cannot do
       anything is worse than no control at all.

   Without this file the visitor still gets every course in chronological
   order with no dead controls — worse, but never broken. Nothing here
   fetches.

   Usage: <script src="../js/timetable.js" defer></script>, after
   footer.js and extlinks.js. */
(function () {
  'use strict';

  var MS_PER_DAY = 86400000;

  /* Midnight today, in the reader's own timezone. Comparing dates rather
     than instants is what keeps "the term ending today has not ended"
     true. */
  function today() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /* "2026-09-01" → local midnight on that day. Deliberately not
     new Date(str), which parses a bare date as UTC and lands on the
     previous day for anyone west of Greenwich. */
  function parseISO(str) {
    if (!str) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function each(list, fn) {
    Array.prototype.forEach.call(list, fn);
  }

  function courseWord(n) {
    return n === 1 ? '1 course' : n + ' courses';
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
    var head = term.querySelector('.tt-term__head');
    if (!head) return;
    head.insertBefore(el('p', 'tt-term__status tt-term__status--' + modifier, text), head.firstChild);
  }

  /* ------------------------------------------------------ empty state */

  /* Every term in the sheet has ended and none has been added for the
     term ahead. Without this the page would fold its entire contents into
     the archive and show a bare toggle, which reads as broken rather than
     as "not published yet". */
  function empty(host) {
    var box = el('div', 'tt-empty');
    box.appendChild(el('h2', 'tt-empty__title',
      'Courses for the coming term are not published yet'));
    box.appendChild(el('p', 'tt-empty__body',
      'Every term listed here has finished. The timetable for the term ahead ' +
      'is usually posted a few months in advance — past terms are below, and ' +
      'the Registrar can confirm what is being offered in the meantime.'));

    var link = el('a', 'inline-link', 'academic-registrar@icscanada.edu');
    link.href = 'mailto:academic-registrar@icscanada.edu';
    var ask = el('p', 'tt-empty__body');
    ask.appendChild(document.createTextNode('Write to '));
    ask.appendChild(link);
    ask.appendChild(document.createTextNode('.'));
    box.appendChild(ask);

    host.appendChild(box);
  }

  /* ---------------------------------------------------------- archive */

  function archive(host, past, openByDefault) {
    if (!past.length) return;

    var box = el('details', 'tt-archive__box');
    var summary = el('summary', 'tt-archive__toggle');
    var noun = past.length === 1 ? '1 past term' : past.length + ' past terms';
    /* Both labels ship; CSS shows whichever matches the open state, so the
       control always names what the next click does. */
    summary.appendChild(el('span', 'tt-archive__show', 'View ' + noun));
    summary.appendChild(el('span', 'tt-archive__hide', 'Hide ' + noun));
    box.appendChild(summary);

    var body = el('div', 'tt-archive__body');
    /* Most recently finished first: the one a reader is likeliest to want. */
    past.slice().reverse().forEach(function (term) {
      term.classList.add('tt-term--past');
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

    var left = 0;

    each(jump.querySelectorAll('li'), function (li) {
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

  /* ----------------------------------------------------------- filter */

  function setUpFilter(root) {
    var bar = root.querySelector('.tt-filter');
    if (!bar) return;

    var chips = bar.querySelectorAll('.tt-filter__chip');
    var status = bar.querySelector('.tt-filter__status');
    var courses = root.querySelectorAll('.tt-course');
    var terms = root.querySelectorAll('.tt-term');
    if (!chips.length || !courses.length) return;

    var known = {};
    each(chips, function (chip) { known[chip.getAttribute('data-program')] = chip.textContent.trim(); });

    /* Every term gets its own "nothing here" line up front, shown only
       while a filter has emptied that term. A heading with nothing under
       it reads as a page that broke. */
    each(terms, function (term) {
      var note = el('p', 'tt-term__none');
      note.hidden = true;
      var list = term.querySelector('.tt-term__list');
      if (list && list.parentNode) list.parentNode.insertBefore(note, list.nextSibling);
    });

    function apply(program, animate) {
      var total = 0;
      var shown = 0;
      var i = 0;

      each(courses, function (course) {
        var progs = (course.getAttribute('data-programs') || '').split(/\s+/);
        var match = program === 'all' || progs.indexOf(program) !== -1;

        total++;
        course.hidden = !match;

        each(course.querySelectorAll('.tt-tag'), function (tag) {
          tag.classList.toggle('is-match',
            program !== 'all' && tag.getAttribute('data-program') === program);
        });

        if (!match) return;
        shown++;

        if (animate) {
          course.classList.remove('is-settling');
          course.style.setProperty('--tt-i', String(Math.min(i++, 9)));
          /* Reading offsetWidth restarts the animation on a row that was
             already visible before this click. */
          void course.offsetWidth;
          course.classList.add('is-settling');
        }
      });

      each(terms, function (term) {
        var live = term.querySelectorAll('.tt-course:not([hidden])').length;
        var count = term.querySelector('.tt-term__count');
        var note = term.querySelector('.tt-term__none');

        if (count) count.textContent = courseWord(live);
        if (note) {
          note.hidden = live !== 0;
          note.textContent = 'No ' + (known[program] || program) +
            ' courses in this term.';
        }
      });

      each(chips, function (chip) {
        var on = chip.getAttribute('data-program') === program;
        chip.classList.toggle('is-on', on);
        chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      status.textContent = '';
      if (program !== 'all') {
        status.appendChild(document.createTextNode(
          'Showing ' + courseWord(shown) + ' of ' + total + ' for ' +
          (known[program] || program) + '. '));
        var clear = el('button', 'tt-filter__clear', 'Show all courses');
        clear.type = 'button';
        clear.addEventListener('click', function () { choose('all'); });
        status.appendChild(clear);
      }
    }

    /* The chosen program goes into the hash so the choice survives a
       reload and can be linked to. replaceState rather than assigning
       location.hash: this is not a place in the document to scroll to. */
    function choose(program) {
      apply(program, true);
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', program === 'all'
          ? window.location.pathname + window.location.search
          : '#' + program);
      }
    }

    each(chips, function (chip) {
      chip.addEventListener('click', function () {
        choose(chip.getAttribute('data-program'));
      });
    });

    bar.hidden = false;

    /* A link to /academics/course-timetable#mael opens on that program.
       Anything else in the hash — a term anchor, a course anchor — is
       left to the browser. */
    var fromHash = window.location.hash.replace(/^#/, '');
    apply(known[fromHash] ? fromHash : 'all', false);
  }

  /* ------------------------------------------------------------ print */

  /* A details element cannot be forced open from CSS, and paper cannot be
     clicked, so every course disclosure opens for the print and anything
     this opened closes again afterwards — the screen is left as the reader
     had it.

     The past-terms archive is deliberately not opened. It is the one
     disclosure whose contents a reader has actively chosen not to see, and
     forcing it open turns a two-page printout of the current term into
     thirty pages of terms that have finished. Open it on screen and it
     prints; leave it closed and it does not. */
  function setUpPrint(root) {
    var opened = [];
    var printing = false;

    function expand() {
      /* Chromium fires beforeprint and flips the print media query, so
         without this guard the second call would record an empty list and
         nothing would ever close again. */
      if (printing) return;
      printing = true;
      opened = [];
      each(root.querySelectorAll('.tt-more:not([open])'), function (d) {
        d.open = true;
        opened.push(d);
      });
    }

    function restore() {
      if (!printing) return;
      printing = false;
      opened.forEach(function (d) { d.open = false; });
      opened = [];
    }

    window.addEventListener('beforeprint', expand);
    window.addEventListener('afterprint', restore);

    /* Safari fires neither event; it answers the media query instead. */
    if (window.matchMedia) {
      var mq = window.matchMedia('print');
      var onChange = function (e) { (e.matches ? expand : restore)(); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  /* ------------------------------------------------------------- main */

  function run() {
    var host = document.querySelector('.tt-terms');
    if (!host) return;

    var terms = Array.prototype.slice.call(host.querySelectorAll('.tt-term'));
    if (!terms.length) return;

    var archiveHost = document.querySelector('.tt-archive');
    var jump = document.querySelector('.tt-jump');
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
    order.forEach(function (term) { host.appendChild(term); });

    if (lead) {
      if (lead === groups.current) {
        lead.classList.add('tt-term--current');
        label(lead, 'Current term', 'current');
      } else {
        lead.classList.add('tt-term--next');
        label(lead, 'Starts soon', 'next');
      }
    }

    rest.forEach(function (term) { label(term, 'Upcoming', 'upcoming'); });

    if (!order.length) empty(host);

    if (archiveHost) archive(archiveHost, groups.past, !order.length);
    trimJump(jump, order, lead ? lead.getAttribute('data-term') : null);

    /* After the archive has moved terms, so the filter counts and the
       per-term notes cover the past terms too. */
    setUpFilter(document);
    setUpPrint(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
