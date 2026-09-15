# ics-site

Static pages for the Institute for Christian Studies. Every page shares one
stylesheet and one footer.

## Layout

```
index.html              landing page
academics/
  academic-calendar.html  /academics/academic-calendar — generated from a
                          Google Sheet, see "The academic calendar" below
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
scripts/
  sync-calendar.mjs     rebuilds the academic calendar page from the sheet
.github/workflows/
  sync-calendar.yml     runs that sync hourly
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

`academics/academic-calendar.html` is the one generated page on the site. Term
dates live in a Google Sheet so the registrar can edit them without touching
this repository:

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
