/* Rebuild the Academic Calendar page from the Google Sheet.
   ------------------------------------------------------------------
   Run by .github/workflows/sync-calendar.yml on the hour, and by hand
   with `node scripts/sync-calendar.mjs`.

   The sheet is the only place term dates are edited. This script fetches
   it as CSV, sorts it, renders it to HTML, and splices that HTML into
   academics/academic-calendar.html between the CALENDAR:START and
   CALENDAR:END markers. Nothing outside those markers is touched.

   Rendering happens HERE, not in the browser, on purpose: the page ships
   with every term already in the markup, so it reads correctly with no
   JavaScript and never shows a spinner or a blank frame inside the
   Google Sites embed. js/calendar.js only reorders what is already there
   — pinning the current term to the top and folding finished ones away —
   because "which term is current" depends on the visitor's date, not on
   when this script last ran.

   Fails without writing if the sheet looks wrong (unreachable, empty, or
   missing columns). A bad fetch must never blank the calendar. */

import { readFileSync, writeFileSync } from 'node:fs';

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PAGE = join(ROOT, 'academics', 'academic-calendar.html');

/* The sheet: "ICS Academic Calendar — Website Source".
   Must be shared as "Anyone with the link → Viewer" for this to fetch. */
const SHEET_ID = process.env.CALENDAR_SHEET_ID
  || '1BR2WXXlbwq70yQtxFauU3YVkWI6oVpue1ViuBMsB4qc';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

const START = '<!-- CALENDAR:START -->';
const END = '<!-- CALENDAR:END -->';

/* A term must have at least this many rows before we believe the fetch. */
const MIN_ROWS = 10;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/* Category slug → the word shown on the row. Anything unrecognised falls
   back to "event", so a typo in the sheet degrades to a plain row rather
   than breaking the build. */
const CATEGORIES = {
  deadline: 'Deadline',
  classes: 'Classes',
  holiday: 'Holiday',
  event: 'Event'
};

/* ---------------------------------------------------------------- CSV */

/* Google's CSV export quotes any field containing a comma, quote or
   newline, and escapes a literal quote by doubling it. */
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

  /* Drop trailing blank lines and rows that are entirely empty cells. */
  return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

function toRecords(rows) {
  const header = rows[0].map(h => h.trim().toLowerCase());
  const need = ['term code', 'term name', 'term start', 'term end',
    'month', 'date', 'event', 'category'];

  for (const col of need) {
    if (!header.includes(col)) {
      throw new Error(`Sheet is missing the "${col}" column. Found: ${header.join(', ')}`);
    }
  }

  const at = name => header.indexOf(name);

  return rows.slice(1).map(r => ({
    code: (r[at('term code')] || '').trim(),
    termName: (r[at('term name')] || '').trim(),
    termStart: (r[at('term start')] || '').trim(),
    termEnd: (r[at('term end')] || '').trim(),
    month: (r[at('month')] || '').trim(),
    date: (r[at('date')] || '').trim(),
    title: (r[at('event')] || '').trim(),
    category: (r[at('category')] || '').trim().toLowerCase(),
    tentative: (r[at('tentative')] || '').trim() !== ''
  })).filter(e => e.code && e.title);
}

/* ------------------------------------------------------------ ordering */

/* The first number in the Date cell, used for sorting and for resolving an
   ISO date. "11 to 13" → 11. "TBA" → null, which sorts to the end of its
   month because there is no day to place it on. */
function firstDay(date) {
  const m = date.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

/* Terms never straddle a calendar year (Fall is Sep–Dec, Winter Jan–Apr,
   Sprummer May–Aug), so every event in a term falls in the term's start
   year. A December range that reads "21 to Jan 3" still starts in
   December, which is the date we anchor on. */
function isoDate(termStart, month, date) {
  const day = firstDay(date);
  const monthIndex = MONTHS.indexOf(month);
  if (day === null || monthIndex === -1) return null;

  const year = parseInt(termStart.slice(0, 4), 10);
  if (!Number.isFinite(year)) return null;

  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function groupTerms(records) {
  const terms = new Map();

  for (const r of records) {
    if (!terms.has(r.code)) {
      terms.set(r.code, {
        code: r.code,
        name: r.termName,
        start: r.termStart,
        end: r.termEnd,
        events: []
      });
    }
    terms.get(r.code).events.push(r);
  }

  for (const term of terms.values()) {
    term.events.sort((a, b) => {
      const ma = MONTHS.indexOf(a.month);
      const mb = MONTHS.indexOf(b.month);
      if (ma !== mb) return ma - mb;

      const da = firstDay(a.date);
      const db = firstDay(b.date);
      if (da === null && db === null) return 0;
      if (da === null) return 1;   /* TBA last within its month */
      if (db === null) return -1;
      return da - db;
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

/* The sheet spells ranges "11 to 13" so Google Sheets cannot mistake them
   for dates and silently rewrite the cell. Readers get an en dash. */
function displayDate(date) {
  return date.replace(/\s+to\s+/i, ' – ');
}

function formatRange(start, end) {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (isNaN(s) || isNaN(e)) return '';

  const month = d => MONTHS[d.getUTCMonth()];
  const day = d => d.getUTCDate();

  const head = `${month(s)} ${day(s)}`;
  const tail = `${month(e)} ${day(e)}, ${e.getUTCFullYear()}`;
  return s.getUTCFullYear() === e.getUTCFullYear()
    ? `${head} – ${tail}`
    : `${head}, ${s.getUTCFullYear()} – ${tail}`;
}

function renderEvent(e, termStart) {
  const cat = CATEGORIES[e.category] ? e.category : 'event';
  const iso = isoDate(termStart, e.month, e.date);

  const attrs = [
    `class="cal-ev cal-ev--${cat}"`,
    iso ? `data-date="${iso}"` : null
  ].filter(Boolean).join(' ');

  /* The asterisk is the calendar's long-standing mark for a tentative
     date; the title attribute spells it out for anyone who does not know
     the convention, and the visually-hidden span for screen readers. */
  const mark = e.tentative
    ? ' <abbr class="cal-ev__tentative" title="Tentative — this date may change">*</abbr>'
    : '';

  return `        <li ${attrs}>
          <span class="cal-ev__day">${esc(displayDate(e.date))}</span>
          <span class="cal-ev__main">
            <span class="cal-ev__title">${esc(e.title)}${mark}</span>
            <span class="cal-ev__cat">${CATEGORIES[cat]}</span>
          </span>
        </li>`;
}

function renderTerm(term) {
  const months = [];
  for (const e of term.events) {
    const last = months[months.length - 1];
    if (last && last.name === e.month) last.events.push(e);
    else months.push({ name: e.month, events: [e] });
  }

  const body = months.map(m => `      <section class="cal-month">
        <h3 class="cal-month__name">${esc(m.name)}</h3>
        <ol class="cal-month__list">
${m.events.map(e => renderEvent(e, term.start)).join('\n')}
        </ol>
      </section>`).join('\n');

  return `  <section class="cal-term" id="term-${esc(term.code)}"
           data-term="${esc(term.code)}" data-start="${esc(term.start)}" data-end="${esc(term.end)}">
    <header class="cal-term__head">
      <p class="cal-term__code">${esc(term.code)}</p>
      <h2 class="cal-term__name">${esc(term.name)}</h2>
      <p class="cal-term__range">${esc(formatRange(term.start, term.end))}</p>
    </header>
    <div class="cal-term__body">
${body}
    </div>
  </section>`;
}

function renderJump(terms) {
  const items = terms.map(t =>
    `      <li><a href="#term-${esc(t.code)}" data-term="${esc(t.code)}">${esc(t.name)}</a></li>`
  ).join('\n');

  /* Outside .container and carrying its own, so the sticky bar's rule and
     background reach the viewport edges without a negative-margin bleed
     that would have to be re-tuned at every breakpoint. */
  return `  <nav class="cal-jump" aria-label="Jump to a term">
    <div class="container">
      <ul class="cal-jump__list">
${items}
      </ul>
    </div>
  </nav>`;
}

function render(terms) {
  const stamp = new Date().toISOString().slice(0, 10);
  return [
    `  <!-- Generated from the Google Sheet by scripts/sync-calendar.mjs on ${stamp}.`,
    `       Edit the sheet, not this markup — anything between the CALENDAR markers`,
    `       is replaced on the next sync. -->`,
    renderJump(terms),
    `  <div class="container cal-terms">`,
    ...terms.map(renderTerm),
    `  </div>`
  ].join('\n');
}

/* ----------------------------------------------------------------- main */

/* CALENDAR_CSV_FILE points the sync at a local CSV instead of the sheet,
   for testing the rendering offline. The workflow never sets it. */
async function fetchCSV() {
  if (process.env.CALENDAR_CSV_FILE) {
    return readFileSync(process.env.CALENDAR_CSV_FILE, 'utf8');
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

async function main() {
  const text = await fetchCSV();

  const records = toRecords(parseCSV(text));
  if (records.length < MIN_ROWS) {
    throw new Error(`Only ${records.length} rows came back; expected at least ${MIN_ROWS}. Refusing to overwrite the page.`);
  }

  const terms = groupTerms(records);
  for (const t of terms) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.start) || !/^\d{4}-\d{2}-\d{2}$/.test(t.end)) {
      throw new Error(`Term ${t.code} has a bad Term Start/Term End. Both must read YYYY-MM-DD.`);
    }
  }

  /* The calendar goes blank the day after its last term ends. Warn while
     there is still time to add one — this shows up in the Actions log and
     in the workflow's run summary. */
  const RUNWAY_DAYS = 90;
  const last = terms[terms.length - 1];
  const daysLeft = Math.round(
    (new Date(`${last.end}T00:00:00Z`) - new Date()) / 86400000
  );

  if (daysLeft < 0) {
    console.warn(
      `::warning::Every term in the sheet has ended (the last, ${last.code}, ` +
      `ended ${last.end}). The calendar page is showing its "not published ` +
      `yet" notice. Add the next term to the sheet.`
    );
  } else if (daysLeft < RUNWAY_DAYS) {
    console.warn(
      `::warning::The calendar runs out in ${daysLeft} days — ${last.code} ` +
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
    console.log(`No change — ${terms.length} terms, ${records.length} events.`);
    return;
  }

  writeFileSync(PAGE, next);
  console.log(`Updated ${terms.length} terms, ${records.length} events: ${terms.map(t => t.code).join(', ')}`);
}

main().catch(err => {
  console.error(`sync-calendar failed: ${err.message}`);
  process.exit(1);
});
