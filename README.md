# ics-site

Static pages for the Institute for Christian Studies. Every page shares one
stylesheet and one footer.

## Layout

```
index.html              landing page
academics/
  academic-calendar.html  /academics/academic-calendar — generated from a
                          Google Sheet, see "The academic calendar" below
  course-timetable.html   /academics/course-timetable — generated from a
                          Google Sheet, see "The course timetable" below
about/                  /about section
  index.html              About Us
  academic-registrar.html job posting, linked from employment-opportunities
  accessibility-policy.html
  administrative-staff.html
  become-a-member.html
  employment-opportunities.html
  mission-educational-creed.html
  privacy-policy.html
assets/images/          photos used by the pages
docs/                   PDFs linked from the pages (job postings, etc.)
css/
  styles.css            shared design system — tokens, buttons, hero, footer,
                        reveal, responsive rules. Every page links this.
  pages/<name>.css      page-specific rules only, loaded after styles.css
js/
  footer.js             the site footer, injected where the tag sits
  reveal.js             scroll-reveal for elements with class="reveal"
  extlinks.js           sends off-site links to a new tab (see Google Sites embed)
  calendar.js           academic calendar only — pins the current term, hides
                        finished ones
  timetable.js          course timetable only — same, plus the program filter
scripts/
  sync-calendar.mjs     rebuilds the academic calendar page from the sheet
  sync-timetable.mjs    rebuilds the course timetable page from its sheet
.github/workflows/
  sync-calendar.yml     runs that sync hourly
  sync-timetable.yml    runs the timetable sync hourly, on the half hour
SVG-Logos/              logo source files
```

## Adding a page

In `<head>`, after the Google Fonts link:

```html
<link rel="stylesheet" href="../css/styles.css">
<link rel="stylesheet" href="../css/pages/your-page.css">
```

At the end of `<body>`, where the footer should appear:

```html
<script src="../js/footer.js"></script>
<script src="../js/extlinks.js"></script>
<script src="../js/reveal.js" defer></script>
```

`extlinks.js` must come *after* `footer.js` so the injected footer links are
covered.

Drop `reveal.js` if the page has no `.reveal` elements, and drop the `../` from
all the paths for a page at the repo root. If the page reveals on scroll, also
keep the no-JS fallback in `<head>`:

```html
<noscript><style>.reveal{opacity:1!important;transform:none!important}</style></noscript>
```

## Editing rules

- **Shared first.** If a change should apply everywhere — footer, buttons,
  colours, type scale, breakpoints — edit `css/styles.css`, not a page file.
- **Page files are for differences only.** A rule that duplicates `styles.css`
  verbatim belongs in `styles.css`.
- **Overriding a shared rule** is fine (page files load last), but redeclare
  every property you need: the shared rule's *other* declarations still apply.
  Where a page rule ends in `display: block` / `min-height: initial` /
  `margin-bottom: 0`-style declarations, those are pinning back values the
  shared rule would otherwise impose. Don't delete them without checking.
- **Footer content** lives in `js/footer.js` and nowhere else. Changing a link
  there changes it on every page.

## The Google Sites embed

These pages are published to GitHub Pages and pulled into Google Sites as
full-page URL embeds (`icscanada.edu/about` frames `/ics-site/about/`). Two
constraints follow, and both are easy to trip over:

- **Every Google Sites host refuses to be framed.** `icscanada.edu`, `fics.`,
  `faculty.` and `perspective.` all answer with `X-Frame-Options: DENY`. A plain
  link to one of them tries to load inside the embed, is refused, and leaves the
  visitor staring at a blank frame.
- **The embed's sandbox has no `allow-top-navigation`.** `target="_top"` and
  `target="_parent"` are therefore ignored outright — the click does nothing.
  `allow-popups` *is* granted, so `target="_blank"` works.

`js/extlinks.js` resolves this: every link to another origin gets
`target="_blank" rel="noopener"`. Links within this site keep their default
target and navigate inside the embed, which is what we want. `mailto:` and
`tel:` are left alone — `allow-popups` covers them, and forcing `_blank` would
leave stray empty tabs behind.

So: **don't hand-write `target="_top"` anywhere**, and don't "fix" an off-site
link by deleting its `target` — that brings the blank frame back.

## The academic calendar

`academics/academic-calendar.html` is one of two generated pages on the site
(the other is the course timetable, below). Term dates live in a Google Sheet so
the registrar can edit them without touching this repository:

**[ICS Academic Calendar — Website Source](https://docs.google.com/spreadsheets/d/1BR2WXXlbwq70yQtxFauU3YVkWI6oVpue1ViuBMsB4qc/edit)**

### How an edit reaches the site

```
Sheet edited  →  hourly GitHub Action  →  scripts/sync-calendar.mjs
                                             fetches the sheet as CSV,
                                             sorts it, renders the HTML,
                                             splices it into the page
                                       →  commits, GitHub Pages redeploys
```

The Action (`.github/workflows/sync-calendar.yml`) runs on the hour and commits
only when the rendered calendar actually changed. For an urgent edit, use
**Actions → Sync academic calendar → Run workflow** instead of waiting.

Two quirks of GitHub's scheduler worth knowing: a `schedule` run can arrive
10–20 minutes late at peak times, and GitHub **disables scheduled workflows
after 60 days with no repository activity** (it emails the owner first). Any
push, or one manual run, resets that clock.

### Why the cron works here (checked against this repo's settings)

| Requirement | This repo |
| --- | --- |
| Actions enabled | yes, all actions allowed |
| Schedules run only on the default branch | workflow is on `main`, the default |
| Bot must be able to push to `main` | no branch protection |
| `GITHUB_TOKEN` needs write | repo default is **read**; the workflow's own `permissions: contents: write` overrides it |
| Bot commit must redeploy the site | Pages is classic branch-based (`main` / `/`), so any commit rebuilds it |
| Minutes | repo is public — Actions are free |

That last row matters more than it looks: if Pages were ever switched to
"GitHub Actions" as the build source, a commit made by `GITHUB_TOKEN` would
**not** trigger the deploy workflow, and the site would stop updating even
though the sync kept committing. Keep Pages on "Deploy from a branch".

If the first run ever fails with a 403 on `git push`, the fix is
Settings → Actions → General → Workflow permissions → "Read and write".

### Editing the sheet

One row per event. Columns:

| Column | Notes |
| --- | --- |
| `Term Code` | `F26`, `W27`, `S27`… Groups the rows into terms. |
| `Term Name` | Displayed heading, e.g. `Fall Term 2026`. Repeat it on every row of the term. |
| `Term Start` / `Term End` | `YYYY-MM-DD`. **This is what decides whether a term is current, upcoming or finished.** Repeat on every row. |
| `Month` | Full month name, e.g. `September`. |
| `Date` | `11`, or a range as `11 to 13` / `21 to Jan 3`, or `TBA`. |
| `Event` | The text shown to the reader. |
| `Category` | `deadline`, `classes`, `holiday` or `event` — sets the tag and colour. Anything else falls back to `event`. |
| `Tentative` | Any mark (an `x`) adds the asterisk that means "date may change". |

Rows are sorted for you: by month, then by the first number in `Date`, with
`TBA` last in its month. You do not need to keep the sheet tidy.

**Write ranges as `11 to 13`, never `11-13`.** Google Sheets reads `21-Jan 3`
as a date and silently rewrites the cell to `21-Jan 2003`. Setting the `Date`
column to *Format → Number → Plain text* prevents this for good, and is worth
doing once.

### Two things that will break the sync

- **The sheet must stay shared as "Anyone with the link → Viewer."** The
  Action signs in as nobody. Without that, the fetch gets a sign-in page and
  the workflow fails (loudly — it will not blank the page).
- **Don't rename or delete the header row.** The sync matches columns by name
  and refuses to write if one is missing.

The sync refuses to write on any bad fetch, short response, or malformed term
date, so a Google outage leaves the last good calendar in place.

### Keep a term ahead in the sheet

The page can only show what the sheet holds. Once the last term's `Term End`
has passed, there is no current or upcoming term left and the page switches to
a "dates for the coming term are not published yet" notice with the past terms
opened below it — correct, but not what you want visitors to see.

The sync warns in the Actions log once the last term is **within 90 days** of
ending, and again every run after it has ended. Add the next term before then
and the notice never appears.

### Editing the page itself

Everything between `<!-- CALENDAR:START -->` and `<!-- CALENDAR:END -->` is
replaced on every sync — edit the sheet, not that markup. Everything outside
the markers (the hero, the notes below the calendar) is hand-written and safe
to edit.

To preview a change without touching the live sheet:

```bash
CALENDAR_CSV_FILE=./some-local.csv node scripts/sync-calendar.mjs
```

### Why it is not fetched in the browser

The page ships with every term already in the HTML, so it reads correctly with
no JavaScript and never shows a spinner or an empty frame inside the Google
Sites embed. `js/calendar.js` only reorders what is already there — pinning the
current term to the top, folding finished terms into the "past terms"
disclosure, dimming dates that have passed — because which term is current
depends on the reader's date, not on when the sync last ran.

## The course timetable

`academics/course-timetable.html` is the site's second generated page, built the
same way as the academic calendar and worth reading that section first. Courses
live in a Google Sheet so the registrar can add, edit and pull them without
touching this repository:

**[ICS Course Timetable — Website Source](https://docs.google.com/spreadsheets/d/1s4ynrR9GklFt0i5OvngqyonJIJ5QLgouP9eCkaojbjU/edit)**

```
Sheet edited  →  hourly GitHub Action  →  scripts/sync-timetable.mjs
                                             fetches the sheet as CSV,
                                             drops unpublished rows, groups
                                             by term, renders the HTML,
                                             splices it into the page
                                       →  commits, GitHub Pages redeploys
```

`.github/workflows/sync-timetable.yml` runs at half past the hour — offset from
the calendar sync so the two are never racing for the same push — and commits
only when the rendered timetable actually changed. For an urgent edit, use
**Actions → Sync course timetable → Run workflow**. Everything in the calendar
section about GitHub's scheduler, the `permissions: contents: write` line, and
keeping Pages on "Deploy from a branch" applies here identically.

### Editing the sheet

One row per course. The sync reads these columns and ignores the rest, so extra
columns the registrar keeps for their own purposes (`enrolmentNotes`,
`registrationEmail`, `lastDateToRegister`, `maxEnrolment`, `updatedAt`,
`certificateTags`) are safe to keep and are not published.

| Column | Notes |
| --- | --- |
| `id` | Anything unique. Becomes the course's anchor (`#course-<id>`), so changing it breaks any link someone has saved. |
| `published` | **`TRUE` or the row does not appear at all.** This is the switch for a cancelled or not-yet-announced course — it is dropped by the sync, not hidden by CSS, so it never reaches the page. |
| `sectionOrder` | Optional. A number to force a course's position within its term. Blank everywhere means sheet order stands, which is usually what you want. |
| `title` | The course title. |
| `code` | `260004`, or a pair as `120504 / 220504`. |
| `term` | A season and a year: `fall26`, `winter27`, `summer26`. **This is what decides whether a term is current, upcoming or finished** — see below. |
| `programs` | Space-separated, lowercase: `ma phd mws mael mwse cstc`. Drives both the tags on the course and the filter at the top of the page. An unrecognised slug still shows, spelled as typed. |
| `credits` | Free text, e.g. `1 Credit`. |
| `instructorName` / `instructorUrl` | The URL may be a faculty page or a `mailto:`. A bare `https://faculty.icscanada.edu` with no person on the end is printed as plain text rather than linked. |
| `subtitle` | A line of facets under the title. Separate them with ` * ` — `MA-EL Instructional Concentration * CSTC Area 3` renders as `… · CSTC Area 3`. |
| `descriptionShort` | The paragraph shown on the closed row. |
| `descriptionMore` | The rest, behind the "Show the full description" disclosure. Optional. |
| `tstCode` | Toronto School of Theology cross-listing code. Shown beside the course code. |
| `format` | `Online Synchronous`, `Blended (…)`, `Online Intensive`… shown as typed. |
| `meetingDay` / `meetingTime` | See "How meeting times are read" below. |
| `syllabusUrl` | Linked as **Syllabus**. Off-site, so it opens in a new tab. |
| `requiredBooks` | Free text, behind the disclosure. Blank lines start new paragraphs. |
| `prerequisites` | Free text, behind the disclosure. |
| `cstcArea` | `Area 3`, `Areas 2 and 4`… shown beside the course code. |

### How the term is worked out

There are no term-date columns in this sheet. `scripts/sync-timetable.mjs`
derives the window from the `term` slug, using the same boundaries the academic
calendar sheet already uses, so a term is "current" on the same days on both
pages:

| Slug | Term | Window |
| --- | --- | --- |
| `winter27` | Winter Term 2027 (`W27`) | January 1 – April 30 |
| `summer26` | Sprummer Term 2026 (`S26`) | May 1 – August 31 |
| `fall26` | Fall Term 2026 (`F26`) | September 1 – December 31 |

`summer`, `sprummer` and `spring` are all accepted and all render as
**Sprummer Term**, which is what the academic calendar calls the May–August
term. If those windows ever change, they are the `SEASONS` table at the top of
`scripts/sync-timetable.mjs` — and the calendar sheet has to change with them.

A slug the sync cannot read (`autumn26`, `fall`, a typo) **fails the whole sync
without writing**, rather than quietly filing the term in the wrong window where
it would show as already finished.

### How meeting times are read

- `meetingDay` + `meetingTime` become one line: `Thursdays, 3:00pm – 6:00pm ET`.
- Nothing in either column reads *No fixed meeting time*, which is the honest
  answer for a blended or asynchronous course.
- An intensive that spells every session into `meetingDay` **separated by
  semicolons** gets `6 scheduled sessions` on the row and the dates themselves
  in the disclosure. Two semicolon-separated parts are joined with a middot
  instead.

Hyphens between numbers become en dashes on the page, so `6:00-9:00pm` is fine
to type.

### Emphasis in the prose columns

The registrar writes book and course titles between asterisks, and the sync
turns a **matched pair on one line** into italics — `*Culture Making*` and
`**Culture Making**` both work. Everything else is left as the character it is:
a lone asterisk used as a footnote mark, the ` * ` separator in `subtitle`, and
an opener with no closer (`**James Dunn, …` with the title running to the end of
the line) all survive untouched.

Two consequences worth knowing:

- An asterisk typed tight against the *previous* word (`… to Practise* is a
  course`) has no opener and stays on the page as a stray `*`. Two rows in the
  sheet do this today.
- The closing asterisk may sit tight against the next word or a bracket
  (`*Time and Narrative*(Vols. I-III)`); only the opening one has to start a
  word.

### Two things that will break the sync

Identical to the calendar, and for the same reasons:

- **The sheet must stay shared as "Anyone with the link → Viewer."** The Action
  signs in as nobody; without that the fetch gets a sign-in page (HTTP 200, not
  an error) and the workflow fails loudly rather than blanking the page.
- **Don't rename or delete the header row.** The sync matches columns by name
  and refuses to write if one is missing.

It also refuses to write if fewer than six published courses come back, or if a
term slug is unreadable — so a Google outage leaves the last good timetable in
place.

### Watch the plain-text columns

Google Sheets rewrites anything that looks like a date the moment it is typed:
`21-Jan 3` silently becomes `21-Jan 2003`. It has already done this to
`lastDateToRegister`, where some cells read `2027-01-04 0:00:00` and others read
`January 4`. That column is not published, so nothing is broken today — but set
`code`, `meetingDay`, `meetingTime`, `credits` and `cstcArea` to
*Format → Number → Plain text* and they cannot be caught by it. The sync prints
a GitHub Actions `::warning::` naming any published cell that has been rewritten
into a timestamp.

### Keep a term ahead in the sheet

Same rule as the calendar. Once the last term's window has passed there is no
current or upcoming term left, and the page switches to a "courses for the
coming term are not published yet" notice with the past terms opened below it.
The sync warns in the Actions log once the last term is **within 90 days** of
ending, and again every run after it has ended.

### Editing the page itself

Everything between `<!-- TIMETABLE:START -->` and `<!-- TIMETABLE:END -->` is
replaced on every sync — edit the sheet, not that markup. The hero and the
"Registering and reading further" notes below the timetable are hand-written and
safe to edit.

To preview a change without touching the live sheet:

```bash
TIMETABLE_CSV_FILE=./some-local.csv node scripts/sync-timetable.mjs
```

### What the browser adds

`js/timetable.js` reorders what is already in the page — it never fetches. It
pins the current term to the top, folds finished terms into the "past terms"
disclosure, and does three things the calendar does not:

- **Reveals the program filter.** The filter ships with `hidden` in the markup
  and is unhidden here, so with no JavaScript there is no dead control — every
  course is visible, which is the answer the filter would have given. A link to
  `…/course-timetable#mael` opens pre-filtered.
- **States when a filter empties a term** rather than leaving a term heading
  with nothing under it.
- **Opens every course disclosure for a print** and closes again afterwards
  (a `<details>` cannot be forced open from CSS). It deliberately leaves the
  past-terms archive closed: that is the one disclosure a reader has chosen not
  to see, and forcing it open turns a printout of the current term into thirty
  pages.

### Why the layout is a list and not a weekly grid

The page it replaces was a Mon–Fri grid of time slots. Of the seminars in a
given term, fewer than half have a day and a time at all — the rest are blended,
intensive or asynchronous, and a grid has nowhere to put them. A ruled list
holds all of them, reads the same at 390px and 1440px, and prints.
