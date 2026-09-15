/* Rebuild the Course Timetable page from the Google Sheet.
   ------------------------------------------------------------------
   Run by .github/workflows/sync-timetable.yml on the hour, and by hand
   with `node scripts/sync-timetable.mjs`.

   Sibling of scripts/sync-calendar.mjs and deliberately built the same
   way: fetch the sheet as CSV, sort it, render it to HTML, splice that
   HTML into academics/course-timetable.html between the TIMETABLE:START
   and TIMETABLE:END markers. Nothing outside those markers is touched.

   Rendering happens HERE, not in the browser, on purpose: the page ships
   with every course already in the markup, so it reads correctly with no
   JavaScript and never shows a spinner or a blank frame inside the
   Google Sites embed. js/timetable.js only adds what a build step cannot
   know — the reader's own date, and their choice of program filter.

   Two things this sheet does that the calendar's does not:

     - `published` is the registrar's visibility switch. Anything that is
       not TRUE is dropped here, so an unpublished or cancelled course
       never reaches the page at all — not even hidden in the markup.
     - there are no term-date columns. `term` holds a slug (`fall26`,
       `winter27`), and the window is derived from it by SEASONS below,
       using the same boundaries the academic calendar sheet already
       uses. That is what lets the page know which term is running.

   Fails without writing if the sheet looks wrong (unreachable, empty,
   missing a column, or carrying a term slug it cannot read). A bad fetch
   must never blank the timetable. */

import { readFileSync, writeFileSync } from 'node:fs';

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PAGE = join(ROOT, 'academics', 'course-timetable.html');

/* The sheet: "ICS Course Timetable — Website Source".
   Must be shared as "Anyone with the link → Viewer" for this to fetch. */
const SHEET_ID = process.env.TIMETABLE_SHEET_ID
  || '1s4ynrR9GklFt0i5OvngqyonJIJ5QLgouP9eCkaojbjU';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

const START = '<!-- TIMETABLE:START -->';
const END = '<!-- TIMETABLE:END -->';

/* Fewer published courses than this and we assume the fetch is wrong
   rather than that ICS has stopped teaching. */
const MIN_COURSES = 6;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/* Term slug → the window it covers and the words shown for it. These are
   the boundaries the academic calendar sheet already uses, so a term is
   "current" on the same days on both pages. Change them in one place and
   change them in the other. `sprummer` is the name ICS uses for the May
   to August term; `summer` and `spring` are accepted as aliases because
   the timetable sheet spells it `summer26`. */
const SEASONS = {
  winter:   { code: 'W', name: 'Winter Term',   from: [1, 1],  to: [4, 30] },
  sprummer: { code: 'S', name: 'Sprummer Term', from: [5, 1],  to: [8, 31] },
  summer:   { code: 'S', name: 'Sprummer Term', from: [5, 1],  to: [8, 31] },
  spring:   { code: 'S', name: 'Sprummer Term', from: [5, 1],  to: [8, 31] },
  fall:     { code: 'F', name: 'Fall Term',     from: [9, 1],  to: [12, 31] }
};

/* Program slug → the short name on the tag, and the full degree name for
   anyone who does not already know the abbreviation. Order matters: tags
   render in this order on every course, so the eye learns one pattern.
   CSTC is left unexpanded because the sheet is the only place it is
   spelled, and guessing at a degree name would be worse than silence. */
const PROGRAMS = [
  ['ma',   'MA',    'MA in Philosophy'],
  ['phd',  'PhD',   'PhD in Philosophy'],
  ['mws',  'MWS',   'Master of Worldview Studies'],
  ['mael', 'MA-EL', 'MA (Phil) in Educational Leadership'],
  ['mwse', 'MWS-E', 'Master of Worldview Studies in Education'],
  ['cstc', 'CSTC',  '']
];

/* ---------------------------------------------------------------- CSV */

/* Google's CSV export quotes any field containing a comma, quote or
   newline, and escapes a literal quote by doubling it. Course
   descriptions are full of all three. */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
      continue;
    }

    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }

  row.push(field);
  rows.push(row);

  return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

/* The sheet carries more columns than the page renders (enrolment notes,
   registration email, last date to register, maximum enrolment). Only
   the ones listed here are read; the rest are left to the registrar. */
const COLUMNS = ['id', 'published', 'sectionorder', 'title', 'code', 'term',
  'programs', 'credits', 'instructorname', 'instructorurl', 'subtitle',
  'descriptionshort', 'descriptionmore', 'tstcode', 'format', 'meetingday',
  'meetingtime', 'syllabusurl', 'requiredbooks', 'prerequisites', 'cstcarea'];

function toRecords(rows) {
  const header = rows[0].map(h => h.trim().toLowerCase());

  for (const col of COLUMNS) {
    if (!header.includes(col)) {
      throw new Error(`Sheet is missing the "${col}" column. Found: ${header.join(', ')}`);
    }
  }

  const at = name => header.indexOf(name);
  const cell = (r, name) => (r[at(name)] || '').trim();

  return rows.slice(1).map(r => ({
    id: cell(r, 'id'),
    published: cell(r, 'published').toUpperCase() === 'TRUE',
    order: cell(r, 'sectionorder'),
    title: cell(r, 'title'),
    code: cell(r, 'code'),
    term: cell(r, 'term').toLowerCase(),
    programs: cell(r, 'programs').toLowerCase().split(/\s+/).filter(Boolean),
    credits: cell(r, 'credits'),
    instructor: cell(r, 'instructorname'),
    instructorUrl: cell(r, 'instructorurl'),
    subtitle: cell(r, 'subtitle'),
    blurb: cell(r, 'descriptionshort'),
    more: cell(r, 'descriptionmore'),
    tstCode: cell(r, 'tstcode'),
    format: cell(r, 'format'),
    meetingDay: cell(r, 'meetingday'),
    meetingTime: cell(r, 'meetingtime'),
    syllabusUrl: cell(r, 'syllabusurl'),
    books: cell(r, 'requiredbooks'),
    prerequisites: cell(r, 'prerequisites'),
    cstcArea: cell(r, 'cstcarea')
  })).filter(c => c.title && c.term);
}

/* ------------------------------------------------------------ ordering */

/* "winter27" → the term it names. Two-digit years are 2000s; four-digit
   years are taken as written. An unreadable slug throws rather than
   guessing, because a term placed in the wrong window would silently
   show as finished. */
function parseTerm(slug) {
  const m = /^([a-z]+)[\s_-]*(\d{2}|\d{4})$/.exec(slug);
  if (!m) {
    throw new Error(
      `Cannot read the term "${slug}". It must be a season and a year, ` +
      `like "fall26" or "winter2027".`
    );
  }

  const season = SEASONS[m[1]];
  if (!season) {
    throw new Error(
      `Unknown term season "${m[1]}" in "${slug}". Use one of: ` +
      `${Object.keys(SEASONS).join(', ')}.`
    );
  }

  const year = m[2].length === 2 ? 2000 + parseInt(m[2], 10) : parseInt(m[2], 10);
  const pad = n => String(n).padStart(2, '0');

  return {
    slug,
    code: `${season.code}${pad(year % 100)}`,
    name: `${season.name} ${year}`,
    start: `${year}-${pad(season.from[0])}-${pad(season.from[1])}`,
    end: `${year}-${pad(season.to[0])}-${pad(season.to[1])}`
  };
}

function groupTerms(courses) {
  const terms = new Map();

  for (const c of courses) {
    if (!terms.has(c.term)) {
      terms.set(c.term, { ...parseTerm(c.term), courses: [] });
    }
    terms.get(c.term).courses.push(c);
  }

  /* sectionOrder is the registrar's override. It is blank on every row
     today, in which case sheet order stands — which is how the registrar
     already arranges a term. */
  for (const term of terms.values()) {
    term.courses.forEach((c, i) => { c._at = i; });
    term.courses.sort((a, b) => {
      const oa = a.order === '' ? Infinity : parseFloat(a.order);
      const ob = b.order === '' ? Infinity : parseFloat(b.order);
      if (oa !== ob) return (Number.isNaN(oa) ? Infinity : oa) - (Number.isNaN(ob) ? Infinity : ob);
      return a._at - b._at;
    });
  }

  /* Chronological, oldest first. The browser decides what to show. */
  return [...terms.values()].sort((a, b) => a.start.localeCompare(b.start));
}

/* ------------------------------------------------------------ rendering */

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* The registrar writes book and course titles between asterisks. Only a
   matched pair on one line becomes emphasis, and the opening one has to
   start a word: the sheet is also full of lone asterisks used as footnote
   marks, doubled ones (`**James Dunn`) that open nothing, and a ` * `
   separator inside `subtitle` — all of which must survive as the
   characters they are. Closing asterisks are taken wherever they fall,
   because the sheet has plenty typed tight against the next word
   (`*Time and Narrative*(Vols. I-III)`). */
function emphasise(escaped) {
  return escaped
    /* Doubled asterisks first, so `**Title**` does not get read as an
       empty pair of single ones. */
    .replace(/(^|[\s(\[.,;:])\*\*(?=\S)([^*\n]*[^\s*])\*\*/g, '$1<em>$2</em>')
    .replace(/(^|[\s(\[.,;:])\*(?=\S)([^*\n]*[^\s*])\*/g, '$1<em>$2</em>');
}

/* Sheet prose → paragraphs. A blank line starts a new one; a single
   newline is a line break, which is how the reading lists are written. */
function prose(text, className, pad) {
  return text.split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `${pad}<p class="${className}">${emphasise(esc(p)).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

/* Hyphens typed as range dashes become en dashes. Bounded to digits and
   spaced hyphens so hyphenated words are left alone. */
function dashes(s) {
  return s.replace(/(\d)\s*-\s*(\d)/g, '$1–$2').replace(/ - /g, ' – ');
}

function formatRange(start, end) {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (isNaN(s) || isNaN(e)) return '';
  return `${MONTHS[s.getUTCMonth()]} ${s.getUTCDate()} – ` +
    `${MONTHS[e.getUTCMonth()]} ${e.getUTCDate()}, ${e.getUTCFullYear()}`;
}

/* `subtitle` packs several facets into one cell separated by " * "
   ("MA-EL Instructional Concentration * CSTC Area 3"). Middots read as
   the list it actually is. */
function subtitle(s) {
  return esc(s.split(/\s+\*\s+/).map(p => p.trim()).filter(Boolean).join(' · '));
}

/* When a course meets, in one line where that is honest and in a list
   where it is not. The intensives spell every session into `meetingDay`
   separated by semicolons; six dates squashed onto one row is unreadable,
   so the row says how many there are and the dates go in the disclosure. */
function meeting(c) {
  const day = c.meetingDay.trim();
  const time = dashes(c.meetingTime.trim());
  const parts = day ? day.split(';').map(p => p.trim()).filter(Boolean) : [];

  if (parts.length >= 3) {
    return { line: `${parts.length} scheduled sessions`, sessions: parts.map(dashes) };
  }

  const when = parts.map(dashes).join(' · ');
  if (when && time) return { line: `${when}, ${time}`, sessions: null };
  if (when) return { line: when, sessions: null };
  if (time) return { line: time, sessions: null };
  return { line: null, sessions: null };
}

function programTags(slugs) {
  const items = PROGRAMS
    .filter(([slug]) => slugs.includes(slug))
    .map(([slug, short, full]) => {
      const title = full ? ` title="${esc(full)}"` : '';
      return `<li class="tt-tag" data-program="${slug}"${title}>${esc(short)}</li>`;
    });

  /* A slug the sheet has that this script does not know about still
     shows, spelled as it was typed, rather than disappearing. */
  const extra = slugs
    .filter(s => !PROGRAMS.some(([slug]) => slug === s))
    .map(s => `<li class="tt-tag" data-program="${esc(s)}">${esc(s.toUpperCase())}</li>`);

  return items.concat(extra);
}

/* Names what opening the disclosure will actually show, rather than
   saying "more" and leaving the reader to find out. */
function summarise(parts) {
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function renderCourse(c) {
  const when = meeting(c);
  const tags = programTags(c.programs);

  /* Everything that belongs behind the disclosure, in reading order. */
  const panels = [];
  const named = [];

  if (c.more) {
    named.push('the full description');
    panels.push(prose(c.more, 'tt-more__p', '            '));
  }
  if (when.sessions) {
    named.push('session dates');
    panels.push(`            <h4 class="tt-more__h">Session dates</h4>
            <ol class="tt-sessions">
${when.sessions.map(s => `              <li>${esc(s)}</li>`).join('\n')}
            </ol>`);
  }
  if (c.books) {
    named.push('required reading');
    panels.push(`            <h4 class="tt-more__h">Required reading</h4>
${prose(c.books, 'tt-more__p', '            ')}`);
  }
  if (c.prerequisites) {
    named.push('prerequisites');
    panels.push(`            <h4 class="tt-more__h">Prerequisites</h4>
${prose(c.prerequisites, 'tt-more__p', '            ')}`);
  }

  /* Both labels ship; CSS shows whichever matches the open state, so the
     control always names what the next click does. */
  const named_ = esc(summarise(named));
  const details = panels.length ? `          <details class="tt-more">
            <summary class="tt-more__toggle">
              <span class="tt-more__show">Show ${named_}</span>
              <span class="tt-more__hide">Hide ${named_}</span>
            </summary>
${panels.join('\n')}
          </details>` : '';

  /* The instructor's own page, or their address when the sheet gives one
     instead. A bare faculty.icscanada.edu with no person on the end is
     not a link to anybody, so it is dropped. */
  const url = c.instructorUrl;
  const linkable = url && !/^https?:\/\/faculty\.icscanada\.edu\/?$/i.test(url);
  const byline = c.instructor
    ? (linkable
      ? `<a class="tt-course__who" href="${esc(url)}">${esc(c.instructor)}</a>`
      : `<span class="tt-course__who">${esc(c.instructor)}</span>`)
    : '';

  const meta = [
    byline,
    c.format ? `<span class="tt-course__format">${esc(c.format)}</span>` : '',
    when.line ? `<span class="tt-course__when">${esc(when.line)}</span>`
      : `<span class="tt-course__when tt-course__when--open">No fixed meeting time</span>`
  ].filter(Boolean).join('\n            ');

  /* The rail: what a registrar reads first and a student quotes in an
     email. Codes can be a pair ("120504 / 220504") — one per line, so the
     column stays narrow. */
  const codes = c.code
    ? c.code.split('/').map(p => p.trim()).filter(Boolean)
    : [];

  const rail = [
    codes.length
      ? `<p class="tt-course__code">${codes.map(esc).join('<span class="tt-course__slash"> / </span>')}</p>`
      : '',
    c.credits ? `<p class="tt-course__credits">${esc(c.credits)}</p>` : '',
    c.tstCode ? `<p class="tt-course__tst"><abbr title="Cross-listed with the Toronto School of Theology">TST</abbr> ${esc(c.tstCode)}</p>` : '',
    c.cstcArea ? `<p class="tt-course__area">${esc(c.cstcArea)}</p>` : ''
  ].filter(Boolean).join('\n          ');

  return `      <li class="tt-course" id="course-${esc(c.id)}" data-programs="${esc(c.programs.join(' '))}">
        <div class="tt-course__rail">
          ${rail}
        </div>
        <div class="tt-course__main">
${tags.length ? `          <ul class="tt-course__progs" aria-label="Programs">
${tags.map(t => `            ${t}`).join('\n')}
          </ul>\n` : ''}          <h3 class="tt-course__title">${esc(c.title)}</h3>
${c.subtitle ? `          <p class="tt-course__sub">${subtitle(c.subtitle)}</p>\n` : ''}          <p class="tt-course__meta">
            ${meta}
          </p>
${c.blurb ? prose(c.blurb, 'tt-course__blurb', '          ') + '\n' : ''}${details ? details + '\n' : ''}${c.syllabusUrl ? `          <p class="tt-course__actions"><a class="tt-syllabus" href="${esc(c.syllabusUrl)}">Syllabus<span class="tt-syllabus__arrow" aria-hidden="true">→</span></a></p>\n` : ''}        </div>
      </li>`;
}

function renderTerm(term) {
  const n = term.courses.length;
  return `  <section class="tt-term" id="term-${esc(term.code)}"
           data-term="${esc(term.code)}" data-start="${esc(term.start)}" data-end="${esc(term.end)}">
    <header class="tt-term__head">
      <p class="tt-term__code">${esc(term.code)}</p>
      <h2 class="tt-term__name">${esc(term.name)}</h2>
      <p class="tt-term__range">${esc(formatRange(term.start, term.end))} · <span class="tt-term__count" data-count="${n}">${n} ${n === 1 ? 'course' : 'courses'}</span></p>
    </header>
    <ol class="tt-term__list">
${term.courses.map(renderCourse).join('\n')}
    </ol>
  </section>`;
}

function renderJump(terms) {
  const items = terms.map(t =>
    `      <li><a href="#term-${esc(t.code)}" data-term="${esc(t.code)}">${esc(t.name)}</a></li>`
  ).join('\n');

  /* Outside .container and carrying its own, so the sticky bar's rule and
     background reach the viewport edges without a negative-margin bleed
     that would have to be re-tuned at every breakpoint. */
  return `  <nav class="tt-jump" aria-label="Jump to a term">
    <div class="container">
      <ul class="tt-jump__list">
${items}
      </ul>
    </div>
  </nav>`;
}

/* The filter ships hidden and js/timetable.js reveals it. A control that
   cannot do anything is worse than no control, and with no JavaScript
   every course is visible already — which is the answer the filter would
   have given. */
function renderFilter(terms) {
  const present = new Set();
  terms.forEach(t => t.courses.forEach(c => c.programs.forEach(p => present.add(p))));
  if (present.size < 2) return '';

  const known = PROGRAMS.filter(([slug]) => present.has(slug));
  const extra = [...present].filter(s => !PROGRAMS.some(([slug]) => slug === s)).sort();

  const buttons = [
    `        <button class="tt-filter__chip is-on" type="button" data-program="all" aria-pressed="true">All courses</button>`,
    ...known.map(([slug, short, full]) =>
      `        <button class="tt-filter__chip" type="button" data-program="${slug}"${full ? ` title="${esc(full)}"` : ''} aria-pressed="false">${esc(short)}</button>`),
    ...extra.map(slug =>
      `        <button class="tt-filter__chip" type="button" data-program="${esc(slug)}" aria-pressed="false">${esc(slug.toUpperCase())}</button>`)
  ].join('\n');

  return `  <div class="tt-filter" hidden>
    <div class="container">
      <p class="tt-filter__label" id="tt-filter-label">Show courses for</p>
      <div class="tt-filter__chips" role="group" aria-labelledby="tt-filter-label">
${buttons}
      </div>
      <p class="tt-filter__status" role="status"></p>
    </div>
  </div>`;
}

function render(terms) {
  const stamp = new Date().toISOString().slice(0, 10);
  return [
    `  <!-- Generated from the Google Sheet by scripts/sync-timetable.mjs on ${stamp}.`,
    `       Edit the sheet, not this markup — anything between the TIMETABLE markers`,
    `       is replaced on the next sync. -->`,
    renderFilter(terms),
    renderJump(terms),
    `  <div class="container tt-terms">`,
    ...terms.map(renderTerm),
    `  </div>`
  ].filter(Boolean).join('\n');
}

/* ----------------------------------------------------------------- main */

/* TIMETABLE_CSV_FILE points the sync at a local CSV instead of the sheet,
   for testing the rendering offline. The workflow never sets it. */
async function fetchCSV() {
  if (process.env.TIMETABLE_CSV_FILE) {
    return readFileSync(process.env.TIMETABLE_CSV_FILE, 'utf8');
  }

  const res = await fetch(CSV_URL, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(
      `Could not fetch the sheet (HTTP ${res.status}). ` +
      `Check that it is shared as "Anyone with the link → Viewer".`
    );
  }

  const text = await res.text();

  /* An unshared sheet answers 200 with a sign-in page rather than CSV. */
  if (/^\s*</.test(text)) {
    throw new Error(
      'The sheet returned a web page instead of CSV, which means it is not ' +
      'publicly readable. Share it as "Anyone with the link → Viewer".'
    );
  }

  return text;
}

/* Google Sheets rewrites anything that looks like a date the moment it is
   typed: "21-Jan 3" becomes "21-Jan 2003". These columns are free text
   and must never contain a timestamp, so a rewritten cell is reported
   rather than published looking like nonsense. */
function warnCoerced(courses) {
  const SUSPECT = /^\d{4}-\d{2}-\d{2}([ T]|$)/;
  const hits = [];

  for (const c of courses) {
    for (const field of ['code', 'meetingDay', 'meetingTime', 'credits', 'cstcArea']) {
      if (SUSPECT.test(c[field])) hits.push(`${c.term} "${c.title}" → ${field} reads "${c[field]}"`);
    }
  }

  if (hits.length) {
    console.warn(
      `::warning::Google Sheets has rewritten ${hits.length} cell(s) into dates: ` +
      `${hits.join('; ')}. Set those columns to Format → Number → Plain text and retype them.`
    );
  }
}

async function main() {
  const text = await fetchCSV();

  const all = toRecords(parseCSV(text));

  /* `published` is the registrar's switch, and a cancelled course is set
     to FALSE. Dropping those rows here rather than hiding them in CSS is
     the point: they never reach the page. */
  const courses = all.filter(c => c.published);

  if (courses.length < MIN_COURSES) {
    throw new Error(
      `Only ${courses.length} published course(s) came back out of ${all.length} rows; ` +
      `expected at least ${MIN_COURSES}. Refusing to overwrite the page.`
    );
  }

  warnCoerced(courses);

  const terms = groupTerms(courses);

  /* The page falls back to its "not published yet" notice the day after
     the last term ends. Warn while there is still time to add one — this
     shows up in the Actions log and in the workflow's run summary. */
  const RUNWAY_DAYS = 90;
  const last = terms[terms.length - 1];
  const daysLeft = Math.round(
    (new Date(`${last.end}T00:00:00Z`) - new Date()) / 86400000
  );

  if (daysLeft < 0) {
    console.warn(
      `::warning::Every term in the sheet has ended (the last, ${last.code}, ` +
      `ended ${last.end}). The timetable page is showing its "not published ` +
      `yet" notice. Add the next term's courses to the sheet.`
    );
  } else if (daysLeft < RUNWAY_DAYS) {
    console.warn(
      `::warning::The timetable runs out in ${daysLeft} days — ${last.code} ` +
      `ends ${last.end} and no later term is in the sheet. Add the next one.`
    );
  }

  const page = readFileSync(PAGE, 'utf8');
  const a = page.indexOf(START);
  const b = page.indexOf(END);
  if (a === -1 || b === -1 || b < a) {
    throw new Error(`Could not find the ${START} / ${END} markers in ${PAGE}.`);
  }

  const next = page.slice(0, a + START.length)
    + '\n' + render(terms) + '\n'
    + page.slice(b);

  if (next === page) {
    console.log(`No change — ${terms.length} terms, ${courses.length} courses.`);
    return;
  }

  writeFileSync(PAGE, next);
  console.log(
    `Updated ${terms.length} terms, ${courses.length} courses ` +
    `(${all.length - courses.length} unpublished row(s) skipped): ` +
    `${terms.map(t => `${t.code}×${t.courses.length}`).join(', ')}`
  );
}

main().catch(err => {
  console.error(`sync-timetable failed: ${err.message}`);
  process.exit(1);
});
