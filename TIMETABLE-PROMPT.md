Rebuild the Course Timetable page for the ICS site, the same way the Academic
Calendar page was rebuilt. Use /impeccable.

## Read this first

There is a finished precedent in this repo. Read it before planning anything:

- `academics/academic-calendar.html` — the page (note the CALENDAR:START/END markers)
- `css/pages/academic-calendar.css`
- `js/calendar.js`
- `scripts/sync-calendar.mjs`
- `.github/workflows/sync-calendar.yml`
- the "The academic calendar" section of `README.md` — explains the whole
  architecture and why it is built this way
- `about/*.html` — the design system the calendar page follows. Match it.

The architecture to copy exactly:

    Sheet edited -> hourly GitHub Action -> scripts/sync-*.mjs fetches CSV,
    renders HTML, splices it between markers in the page -> commits ->
    GitHub Pages redeploys

**The browser never fetches.** Every row ships inside the HTML so the page
works with no JavaScript and never shows a spinner or an empty frame inside
the Google Sites iframe embed. Client JS only adds what a build step cannot
know: today's date. Do not "improve" this into a client-side fetch.

## Sources

- **Data:** https://docs.google.com/spreadsheets/d/1s4ynrR9GklFt0i5OvngqyonJIJ5QLgouP9eCkaojbjU/edit
  Verify it is shared "Anyone with the link -> Viewer" — the Action signs in as
  nobody. Check with the Google Drive tools if you have them.
- **Old page:** `info/Institute for Christian Studies - Course Timetable.html`
  (a saved Google Sites page; strip the tags to read it). Treat it as content
  evidence and as an anti-reference for the design.
- Target path: `academics/course-timetable.html`, alongside the calendar.

## What is different from the calendar — do not just clone it

The timetable sheet is much richer than the calendar's. One row per course,
21 columns: `id`, `published`, `sectionOrder`, `title`, `code`, `term`,
`programs`, `credits`, `instructorName`, `instructorUrl`, `subtitle`,
`descriptionShort`, `descriptionMore`, `tstCode`, `format`, `meetingDay`,
`meetingTime`, `syllabusUrl`, `requiredBooks`, `prerequisites`, `cstcArea`.

Four things that need real decisions, not defaults:

1. **There are no term dates in this sheet.** `term` holds slugs like
   `fall26`, `winter27`, `summer26`. The calendar decided current/upcoming/
   finished from `Term Start`/`Term End` columns; this sheet has neither. Pick
   one and say which: add two columns to this sheet, derive the window from
   the slug in code, or read the windows from the calendar sheet
   (`1BR2WXXlbwq70yQtxFauU3YVkWI6oVpue1ViuBMsB4qc`), which already has them:
   fall = Sep 1–Dec 31, winter = Jan 1–Apr 30, sprummer = May 1–Aug 31.

2. **`published` is a visibility switch the registrar already uses.** TRUE/FALSE.
   At least one row is a cancelled course set to FALSE. Rows that are not TRUE
   must not render at all — this is separate from hiding finished terms.

3. **The old page was a weekly grid** (time slots down, Monday–Friday across),
   not a list. `meetingDay`, `meetingTime` and `format` support that, but a
   grid is hostile on a phone and some courses are asynchronous/blended with no
   slot. Decide the layout deliberately and justify it; the calendar's ruled
   ledger is a good reference for tone but is not automatically right here.

4. **`programs` is a space-separated tag list** (`ma`, `phd`, `mws`, `mael`,
   `mwse`, `cstc`). Most visitors care about one program. A filter is probably
   worth it — but it must degrade to "everything visible" with no JS.

Also: `descriptionShort` vs `descriptionMore` implies progressive disclosure,
`syllabusUrl` and `instructorUrl` are real links (`extlinks.js` will send
off-site ones to a new tab), and some `instructorUrl` values are `mailto:`.

## Requirements

- Current term first, finished terms hidden behind a "past terms" disclosure,
  exactly like the calendar. Same reasoning, same client-side date logic.
- Match the `about/` design system: shared `css/styles.css` tokens, the hero
  pattern, `js/footer.js` + `js/extlinks.js`, full SEO/OpenGraph/JSON-LD head
  block. Page-specific CSS in `css/pages/course-timetable.css` only.
- An empty state for when every term has finished — the calendar page went
  blank in that case until it was caught and fixed. Do not repeat that.
- A print stylesheet. Students and the registrar print these.
- Update `README.md` the way the calendar section does.

## Gotchas learned the hard way on the calendar

- **Google Sheets silently coerces date-like cells.** `21-Jan 3` became
  `21-Jan 2003`. Check every cell that could look like a date, and tell the
  user to set those columns to Format -> Number -> Plain text.
- **Never bleed a sticky bar with negative margins** matched to `.container`
  padding — the padding changes at four breakpoints and it overflowed on
  mobile. Put the element outside `.container` with its own inside.
- **The sync must refuse to write on a bad fetch**, short response, or missing
  column. An unshared sheet returns HTTP 200 with a sign-in HTML page, not an
  error. A Google outage must leave the last good page in place.
- **Warn early when the data runs out** — the sync prints a GitHub Actions
  `::warning::` when the last term is within 90 days of ending.
- **Keep GitHub Pages on "Deploy from a branch."** If it is ever switched to
  "GitHub Actions", commits made by `GITHUB_TOKEN` will not trigger the deploy
  and the site will freeze silently while the sync keeps committing.
- `CALENDAR_CSV_FILE=./local.csv node scripts/sync-calendar.mjs` renders from a
  local file for offline testing. Build the same escape hatch.
- Repo settings are already correct for cron: Actions enabled, `main` is the
  default branch, no branch protection, public repo, Pages is branch-based. The
  default workflow token is read-only, so the workflow must declare
  `permissions: contents: write` itself.

## Before you build

Ask me about anything genuinely ambiguous — especially the layout question (3)
and how to resolve term windows (1). Do not spawn subagents.

## Verify before reporting done

- Real fetch against the live sheet, not just a local CSV.
- With JS: current term first, finished terms archived, `published` = FALSE
  rows absent.
- With JS disabled: every published course present and readable.
- Simulate future dates (Playwright `clock.setFixedTime`) across a term
  rollover and past the last term — confirm no blank page.
- Zero horizontal overflow at 390 / 768 / 1024 / 1440.
- `node .claude/skills/impeccable/scripts/detect.mjs --json <files>` clean.
- Do not commit or push until I say so.
