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

/* The grid is Monday to Friday, like the timetable it replaces. A course
   scheduled on a weekend would fall off the grid into the list below it. */
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

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

/* The sheet carries far more than the grid shows — descriptions, reading
   lists, prerequisites, syllabus links, enrolment notes. All of that lives
   on the course catalogue, which every title here links to, so only these
   columns are read. The rest are the registrar's, and the sync neither
   requires nor publishes them. */
const COLUMNS = ['id', 'published', 'sectionorder', 'title', 'code', 'term',
  'programs', 'instructorname', 'format', 'meetingday', 'meetingtime',
  'cstcarea'];

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
    instructor: cell(r, 'instructorname'),
    format: cell(r, 'format'),
    meetingDay: cell(r, 'meetingday'),
    meetingTime: cell(r, 'meetingtime'),
    cstcArea: cell(r, 'cstcarea')
  })).filter(c => c.id && c.title && c.term);
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

function formatRange(start, end) {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (isNaN(s) || isNaN(e)) return '';
  return `${MONTHS[s.getUTCMonth()]} ${s.getUTCDate()} – ` +
    `${MONTHS[e.getUTCMonth()]} ${e.getUTCDate()}, ${e.getUTCFullYear()}`;
}

/* Hyphens typed as range dashes become en dashes. Bounded to digits and
   spaced hyphens so hyphenated words are left alone. */
function dashes(s) {
  return s.replace(/(\d)\s*-\s*(\d)/g, '$1–$2').replace(/ - /g, ' – ');
}

/* --------------------------------------------------------- the grid */

/* A course earns a square on the weekly grid only when `meetingDay` is a
   bare weekday and `meetingTime` parses into a slot. Anything else —
   blank, an intensive's list of session dates, "Tuesdays July 14 - Aug 10"
   — is listed under the grid instead, which is what the registrar's own
   timetable documents do. Guessing a square for a course that does not
   have one would be worse than saying so. */
function weekday(meetingDay) {
  const m = /^(monday|tuesday|wednesday|thursday|friday)s?$/i.exec(meetingDay.trim());
  return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() : null;
}

/* "6:00-9:00pm ET" → { start: 1080, end: 1260 }, in minutes past midnight.
   The sheet spells these a dozen different ways. Where only one end of the
   range carries am/pm the other inherits it, and a start that lands after
   its own end is read as the morning instead — which is what turns
   "10 - 1pm" into 10:00-13:00 rather than 22:00-13:00. */
function parseSlot(meetingTime) {
  const m = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i
    .exec(meetingTime);
  if (!m) return null;

  const to24 = (h, mer) => {
    h = parseInt(h, 10);
    if (!mer) return h;
    mer = mer.toLowerCase();
    if (mer === 'pm' && h < 12) return h + 12;
    if (mer === 'am' && h === 12) return 0;
    return h;
  };

  const endMer = m[6] ? m[6].toLowerCase() : null;
  let startMer = m[3] ? m[3].toLowerCase() : endMer;

  let start = to24(m[1], startMer) * 60 + parseInt(m[2] || '0', 10);
  const end = to24(m[4], endMer) * 60 + parseInt(m[5] || '0', 10);

  if (start >= end && startMer === 'pm' && !m[3]) {
    start = to24(m[1], 'am') * 60 + parseInt(m[2] || '0', 10);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return null;

  return { start, end };
}

function clock(mins) {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

/* --------------------------------------------------------- one course */

/* The registrar's own timetables append the certificate area to the
   title — "The Craft of Reflective Practice (CSTC 2)". `cstcArea` holds
   it as "Area 2" or "Areas 2 and 4". */
function titleOf(c) {
  if (!c.cstcArea) return esc(c.title);
  const nums = c.cstcArea.match(/\d+/g);
  const area = nums ? `CSTC ${nums.join(', ')}` : c.cstcArea;
  return `${esc(c.title)} <span class="tt-cell__area">(${esc(area)})</span>`;
}

/* Cells are narrow and the honorific is the same on every one of them. */
function instructorOf(c) {
  return c.instructor.replace(/\bDrs?\.?\s+/g, '').trim();
}

const CATALOGUE = 'https://courses.icscanada.edu/#course-';

/* Title, code, instructor — the three things the old grid carried. The
   title is a link out to the course catalogue, which holds the
   description, the syllabus and how to register; every card there is
   anchored on this same id. */
function renderCourse(c, indent) {
  const pad = ' '.repeat(indent);
  return `${pad}<div class="tt-cell" data-programs="${esc(c.programs.join(' '))}">
${pad}  <a class="tt-cell__title" href="${CATALOGUE}${encodeURIComponent(c.id)}">${titleOf(c)}</a>
${pad}  <p class="tt-cell__code">${esc(c.code || '—')}</p>
${pad}  <p class="tt-cell__who">${esc(instructorOf(c))}</p>
${pad}</div>`;
}

function renderGrid(term, placed) {
  if (!placed.length) return '';

  /* Only the days and slots this term actually uses. An empty Monday
     column is a column of nothing, five weeks running. */
  const days = DAYS.filter(d => placed.some(p => p.day === d));
  const slots = [...new Map(placed.map(p =>
    [`${p.slot.start}-${p.slot.end}`, p.slot])).values()]
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const head = days.map(d =>
    `            <th scope="col" data-day="${d.toLowerCase()}">${d}</th>`).join('\n');

  const rows = slots.map(slot => {
    const key = `${slot.start}-${slot.end}`;
    const cells = days.map(day => {
      const here = placed.filter(p =>
        p.day === day && p.slot.start === slot.start && p.slot.end === slot.end);
      return here.length
        ? `            <td data-day="${day.toLowerCase()}">\n${here.map(p => renderCourse(p.course, 14)).join('\n')}\n            </td>`
        : `            <td data-day="${day.toLowerCase()}"></td>`;
    }).join('\n');

    return `          <tr data-slot="${key}">
            <th scope="row" class="tt-grid__time">${clock(slot.start)} – ${clock(slot.end)} ET</th>
${cells}
          </tr>`;
  }).join('\n');

  return `    <div class="tt-grid__scroll">
      <table class="tt-grid">
        <caption class="tt-vh">Weekly schedule, ${esc(term.name)}</caption>
        <thead>
          <tr>
            <th scope="col" class="tt-grid__corner">Time</th>
${head}
          </tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>`;
}

/* When a course meets, for the ones with no square on the grid. The
   intensives spell every session into `meetingDay` separated by
   semicolons; middots read as the list it is. */
function scheduleOf(c) {
  const day = c.meetingDay.split(';').map(p => dashes(p.trim())).filter(Boolean).join(' · ');
  const time = dashes(c.meetingTime.trim());
  if (day && time) return `${day}, ${time}`;
  return day || time || '';
}

function renderOffGrid(loose) {
  if (!loose.length) return '';

  const items = loose.map(c => {
    const when = scheduleOf(c);
    return `        <li class="tt-off__item" data-programs="${esc(c.programs.join(' '))}">
          <div class="tt-off__when">
${c.format ? `            <p class="tt-off__format">${esc(c.format)}</p>\n` : ''}${when ? `            <p class="tt-off__sched">${esc(when)}</p>\n` : ''}          </div>
          <div class="tt-off__what">
            <a class="tt-cell__title" href="${CATALOGUE}${encodeURIComponent(c.id)}">${titleOf(c)}</a>
            <p class="tt-cell__code">${esc(c.code || '—')}</p>
            <p class="tt-cell__who">${esc(instructorOf(c))}</p>
          </div>
        </li>`;
  }).join('\n');

  return `    <div class="tt-off">
      <h3 class="tt-off__title">No fixed weekly slot</h3>
      <ul class="tt-off__list">
${items}
      </ul>
    </div>`;
}

function renderTerm(term) {
  const placed = [];
  const loose = [];

  for (const c of term.courses) {
    const day = weekday(c.meetingDay);
    const slot = day ? parseSlot(c.meetingTime) : null;
    if (day && slot) placed.push({ course: c, day, slot });
    else loose.push(c);
  }

  const n = term.courses.length;
  const body = [renderGrid(term, placed), renderOffGrid(loose)].filter(Boolean).join('\n');

  return `  <section class="tt-term" id="term-${esc(term.code)}"
           data-term="${esc(term.code)}" data-start="${esc(term.start)}" data-end="${esc(term.end)}">
    <header class="tt-term__head">
      <p class="tt-term__code">${esc(term.code)}</p>
      <h2 class="tt-term__name">${esc(term.name)}</h2>
      <p class="tt-term__range">${esc(formatRange(term.start, term.end))} · <span class="tt-term__count">${n} ${n === 1 ? 'course' : 'courses'}</span></p>
    </header>
${body}
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
    for (const field of ['title', 'code', 'meetingDay', 'meetingTime', 'cstcArea']) {
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
