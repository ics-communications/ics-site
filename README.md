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
same way as the academic calendar and worth reading that section first. It is
the registrar's weekly timetable — slots down, weekdays across, one course to a
square — and nothing more: **every course title links out to its entry on the
[ICS Course Catalogue](https://courses.icscanada.edu/)**, which is where the
description, the reading list, the prerequisites, the syllabus and how to
register all live. Both pages are generated from the same sheet, so neither has
to be kept in step with the other by hand:

**[ICS Course Timetable — Website Source](https://docs.google.com/spreadsheets/d/1s4ynrR9GklFt0i5OvngqyonJIJ5QLgouP9eCkaojbjU/edit)**

```
Sheet edited  →  hourly GitHub Action  →  scripts/sync-timetable.mjs
                                             fetches the sheet as CSV,
                                             drops unpublished rows, groups
                                             by term, lays each term out as
                                             a weekly grid, splices it in
                                       →  commits, GitHub Pages redeploys
```

`.github/workflows/sync-timetable.yml` runs at half past the hour — offset from
the calendar sync so the two are never racing for the same push — and commits
only when the rendered timetable actually changed. For an urgent edit, use
**Actions → Sync course timetable → Run workflow**. Everything in the calendar
section about GitHub's scheduler, the `permissions: contents: write` line, and
keeping Pages on "Deploy from a branch" applies here identically.

### Editing the sheet

One row per course. The timetable reads **twelve** of the sheet's columns and
ignores every other one, because everything else about a course is published by
the catalogue instead. Editing `descriptionShort`, `requiredBooks`,
`enrolmentNotes` or `syllabusUrl` changes the catalogue and leaves this page
alone, which is the intended division of labour.

| Column | Notes |
| --- | --- |
| `id` | **This is the link.** Each title points at `courses.icscanada.edu/#course-<id>`, which is the anchor the catalogue gives that course's card. Change an id and the timetable link breaks — and so does any link anyone has saved. |
| `published` | **`TRUE` or the row does not appear at all.** This is the switch for a cancelled or not-yet-announced course — it is dropped by the sync, not hidden by CSS, so it never reaches the page. |
| `sectionOrder` | Optional. A number to force a course's position. Only affects the order of courses sharing one square, and the order of the list under the grid. |
| `title` | Shown in the square, and linked. |
| `code` | `260004`, or a pair as `120504 / 220504`. |
| `term` | A season and a year: `fall26`, `winter27`, `summer26`. **This is what decides whether a term is current, upcoming or finished** — see below. |
| `programs` | Space-separated, lowercase: `ma phd mws mael mwse cstc`. Drives the filter at the top of the page. An unrecognised slug still gets a chip, spelled as typed. |
| `instructorName` | Shown under the code. A leading `Dr.` is dropped — the squares are narrow and it is on every one of them. |
| `format` | `Online Synchronous`, `Blended (…)`, `Online Intensive`. Only shown for courses that are *not* on the weekly grid, where it is the explanation for why they are not. |
| `meetingDay` / `meetingTime` | **What puts a course in a square.** See below. |
| `cstcArea` | `Area 3`, `Areas 2 and 4`… appended to the title as `(CSTC 3)` / `(CSTC 2, 4)`, the way the registrar's own timetable documents write it. |

### What puts a course in a square

A course gets a square only when **`meetingDay` is a bare weekday** — `Thursday`
or `Thursdays`, and nothing else in the cell — **and `meetingTime` parses into a
start and an end.** Everything else is listed under the grid, under the heading
*No fixed weekly slot*, with its `format` and whatever `meetingDay` and
`meetingTime` say.

That rule is deliberately strict, and it is what the registrar's own timetable
documents do: a blended course, an August intensive, or `Tuesdays July 14 - Aug
10` has no weekly square, and inventing one would put a course on a grid it does
not belong to.

`meetingTime` is read loosely, because the sheet spells it a dozen ways. All of
these work:

| Typed | Read as |
| --- | --- |
| `3:00pm - 6:00pm ET` | 15:00 – 18:00 |
| `10:00am - 1:00pm` | 10:00 – 13:00 |
| `6:00-9:00pm ET` | 18:00 – 21:00 |
| `7-9pm ET` | 19:00 – 21:00 |
| `12-3pm ET` | 12:00 – 15:00 |

Where only one end of the range carries `am`/`pm` the other inherits it, and a
start that would land after its own end is read as the morning instead. Slot
rows are then sorted by start time, and **only the weekdays a term actually uses
get a column** — an empty Monday is dropped rather than printed five weeks
running.

An intensive that spells every session into `meetingDay` separated by semicolons
gets those dates listed under the grid, joined with middots. Hyphens between
numbers become en dashes on the page, so `6:00-9:00pm` is fine to type.

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

### Two things that will break the sync

Identical to the calendar, and for the same reasons:

- **The sheet must stay shared as "Anyone with the link → Viewer."** The Action
  signs in as nobody; without that the fetch gets a sign-in page (HTTP 200, not
  an error) and the workflow fails loudly rather than blanking the page.
- **Don't rename or delete the header row.** The sync matches columns by name
  and refuses to write if one of the twelve is missing.

It also refuses to write if fewer than six published courses come back, or if a
term slug is unreadable — so a Google outage leaves the last good timetable in
place.

### Watch the plain-text columns

Google Sheets rewrites anything that looks like a date the moment it is typed:
`21-Jan 3` silently becomes `21-Jan 2003`. It has already done this elsewhere in
this sheet — `lastDateToRegister` holds a mix of `2027-01-04 0:00:00` and
`January 4` — so set `code`, `meetingDay`, `meetingTime` and `cstcArea` to
*Format → Number → Plain text* before it reaches a column this page publishes.
A rewritten `meetingTime` would quietly drop its course off the grid. The sync
prints a GitHub Actions `::warning::` naming any published cell that has been
turned into a timestamp.

### Keep a term ahead in the sheet

Same rule as the calendar. Once the last term's window has passed there is no
current or upcoming term left, and the page switches to a "timetable for the
coming term is not published yet" notice with the past terms opened below it.
The sync warns in the Actions log once the last term is **within 90 days** of
ending, and again every run after it has ended.

### Editing the page itself

Everything between `<!-- TIMETABLE:START -->` and `<!-- TIMETABLE:END -->` is
replaced on every sync — edit the sheet, not that markup. The hero and the
"About this timetable" notes below the grids are hand-written and safe to edit.

To preview a change without touching the live sheet:

```bash
TIMETABLE_CSV_FILE=./some-local.csv node scripts/sync-timetable.mjs
```

### What the browser adds

`js/timetable.js` reorders what is already in the page — it never fetches. It
pins the current term to the top, folds finished terms into the "past terms"
disclosure, and adds the program filter:

- **The filter ships with `hidden` in the markup** and is unhidden here, so with
  no JavaScript there is no dead control — every course is visible, which is the
  answer the filter would have given. A link to `…/course-timetable#mael` opens
  pre-filtered.
- Filtering a grid means more than hiding squares: **an emptied slot row and an
  emptied day column come out too**, so the week never shrinks to a lattice of
  blanks, and a term with nothing left says so instead of showing a bare
  heading.

### Why it is a table, and why it scrolls on a phone

A timetable is a table, and it is marked up as one — `<th scope="col">` for the
day, `<th scope="row">` for the slot — so a screen reader can say "Wednesday,
18:00 – 21:00" on any square. Five columns of course titles will not fit on a
phone, so below about 46rem the grid scrolls sideways **inside its own box**
while the page itself never scrolls horizontally, and the time column stays
pinned to the left edge so no square is ever left without a time on it.
