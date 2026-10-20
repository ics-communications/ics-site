# Prompt: Design and build the new ICS MA & PhD site

> **How to run:** from the root of the new repository (with this `info/` folder at its root), start Claude Code and say: *"Execute info/ma-phd-redesign-prompt.md."*
> Everything the work needs is inside `info/`. The live sites listed below are for re-checking facts, not required inputs.

---

## 1. The job

Design and build a new website for the Institute for Christian Studies (ICS) **MA in Philosophy and PhD in Philosophy** programs, following `info/ma-phd-website-redesign-brief.md` (the brief). Use the **impeccable** skill (`/impeccable`) for the whole design-and-build process, including its finish review and DESIGN.md.

In order:

1. Review the old site (`info/MA-PhD-Old/`) and the earlier Pastel draft (`info/reference/pastel-draft/`). The new site does **not** need a page for every old page.
2. Use `/impeccable` to create a **new visual design**. The only pinned element is the **masthead and navigation bar, which must match faculty.icscanada.edu**; reference kit in `info/reference/faculty-nav/`.
3. Build the site as described in the brief: copy, information architecture, factual corrections, content system, accessibility.
4. **Assess the result for user experience** from the point of view of each prospective-student audience in the brief, fix what the assessment finds, and write up the assessment.
5. Use `/copy-review` to export all the copy from the new pages into **one Word document with Track Changes on**. Neal DeRoo, the MA/PhD Program Director, will mark up the wording there, so his edits can be applied quickly. Save it in `info/` and report its path.

Don't stop at recommendations. Build it, verify it, and hand over the documents in §10.

---

## 2. What's in `info/`

| Path | What it is | How to use it |
|---|---|---|
| `ma-phd-website-redesign-brief.md` | **The governing brief.** Strategy, audiences, tone, IA, required factual corrections, evidence sections, maintainability, design and UX requirements, acceptance criteria, human-confirmation checklist. | Read it in full first. It wins over everything below except where §6 records a conflict to flag. |
| `MA-PhD-Old/` | Saved Google Sites pages of the old site: Academics, MA in Philosophy, PhD Program, Admission Requirements & Modes of Study, Program Design (fields of study), Master of Worldview Studies. | Source of current published program facts. Ignore the `._*` files (macOS metadata). |
| `reference/old-site-text/*.md` | The same six pages as clean text, with site nav and footer removed. | Read these instead of the raw HTML. |
| `reference/pastel-draft/` | The earlier interactive draft (10 HTML pages + 2 full-page screenshots), taken from the Pastel review link in the brief. | Keep its good ideas (see §7). Repeat none of its errors (§7). Its visual look is an anti-reference. |
| `reference/PRODUCT-seed.md` | A product record for these pages, written from the brief and confirmed with the user on 2026-10-02. | The starting PRODUCT.md for impeccable's `init` (§4, step 2). |
| `reference/faculty-nav/` | Masthead kit copied from faculty.icscanada.edu: `nav.html` (markup), `nav.css` (rules + geometry notes), `nav.js` (mobile menu + keyboard dropdowns), logo PNG, favicon, 4 screenshots (desktop, desktop dropdown, mobile, mobile menu open). | The pinned navigation. Reproduce it exactly (§5). |
| `reference/brand/*.svg` | ICS logo marks (red, black, white, full white). | Brand assets. |
| `reference/photos/` | `seminar-discussion.jpg`, `community-gathering.jpg`, the two event photographs on the main ICS homepage. They appear to be ICS's own photography; **rights unconfirmed**. | The only candid photography on hand. Label them for rights confirmation (§9). |
| `reference/data/course-catalogue-2026-10-02.json` | Snapshot of the full ICS Course Catalogue data (24 courses: title, code, term, programs, instructor, format, meeting time, descriptions). | Verified source for course titles, instructors, terms and online delivery. |
| `reference/data/faculty/` | The build data behind faculty.icscanada.edu (`roster.py` = standings and titles; `content.json` = bio text from before later edits; `patches.py` = edits faculty asked for), plus `live-pages-2026-10-02/`, the live faculty pages as served that day. | Verified source for faculty titles, standing, research areas, publications. **If they disagree, the live pages win.** |
| `Institute for Christian Studies - Course Timetable*` | An older saved timetable page. | Background only. |

Live sources, for re-checking only:

- faculty.icscanada.edu (headshots at `https://faculty.icscanada.edu/assets/headshots/<slug>.jpg` and `<slug>-400.jpg`)
- courses.icscanada.edu (course anchors: `https://courses.icscanada.edu/#course-<id>`)
- www.icscanada.edu

---

## 3. Decisions already confirmed with the user (2026-10-02)

Treat these as answers to impeccable's interview questions. Don't ask them again.

- **The brief is the product record.** Audience, positioning, tone and corrections come from the brief; `reference/PRODUCT-seed.md` records them.
- **Program Director: Neal DeRoo.** Name him on the pages as the contact for questions about fit, fields and supervision: `nderoo@icscanada.edu`. Applications and admissions logistics go to the Academic Registrar: `academic-registrar@icscanada.edu`.
- **Hosting and stack:** static HTML on **GitHub Pages** ("Deploy from a branch"), generated by a **build script** from **one content file**, with the generated HTML committed. Add a GitHub Action that reruns the build when the content file changes and commits the result. Then a non-developer can edit facts in the GitHub web editor and the site updates itself. Use no framework and no client-side rendering. Every page must be complete with JavaScript off. Use Node (no runtime dependencies) or Python, whichever the repo already favours. If it favours neither, use Node.
- **Navigation:** identical to faculty.icscanada.edu (§5).
- **Everything below the masthead is a new visual design**, chosen through impeccable's direction round. Don't default to the main ICS site's or faculty site's look; treat them as brand evidence only.
- **Build path:** code-first unless image generation is available in this session, in which case let impeccable offer comp-first as it normally does.

Ask the user only about genuine gaps that remain after reading the brief, this prompt and the repo.

---

## 4. Process (impeccable owns the design steps; follow its references exactly)

1. **Orient.** Inspect the new repo: anything already there, conventions, existing README, `.gitignore`, Pages settings if visible. Read the brief, then every file in §2. Write a short list of duplicated or contradictory program facts across the old site, the Pastel draft and the brief (brief step 2).
2. **Invoke `/impeccable`.** Run its `context` step.
   - For `init`, copy `info/reference/PRODUCT-seed.md` to `PRODUCT.md` at the repo root, fix any paths that changed, and confirm it with one compact question round. It was already confirmed with the user, so present it for approval rather than re-interviewing.
   - Record the build path in `.impeccable/config.json` only if the user states one.
3. **Implementation plan.** The brief requires a short plan before structural work. Show the user, in under 20 lines:
   - the routes;
   - the content-file schema;
   - the build pipeline;
   - the component list;
   - how hidden or unverified sections work.
   Then continue.
4. **New visual world:** impeccable `new-work.md` → "Create or replace the visual world".
   - Run the direction round with `concept-seed --scope direction --mode persuade`, and present it on impeccable's decision page.
   - Pinned constraints for every direction:
     - the faculty-site masthead, unchanged;
     - real ICS imagery only (faculty headshots + the two event photos); no stock photography as final art;
     - WCAG AA contrast;
     - pages readable with no JS.
   - Anti-references:
     - the Pastel draft's generic university template: stock library and Oxford-style building photos, centred heading over a row of icon-tile cards, navy/plum palette;
     - a generic corporate-university look;
     - anything that reads as "philosophy department only".
   - What the design must make felt (from the brief):
     - intellectual seriousness, warmth and depth;
     - **spiritually attuned, culturally relevant Christian scholarship**;
     - learning as **apprenticeship, not transaction**;
     - scholarship as a practice of wisdom.
   - The decisive, uncopyable assets:
     - the real Senior Members and the real seminars they teach this year, all online;
     - the questions those seminars ask (see course descriptions in the catalogue snapshot).
   - The design should demonstrate those, not claim them.
   - Record the direction contract in the surface brief, as impeccable specifies.
5. **Build** (impeccable §6 "Build with full commitment"), to the requirements in §5 and §6 below.
6. **Inspect and finish** (impeccable §7):
   - capture desktop 1440 and mobile 390;
   - run `impeccable detect --json` once;
   - spawn `impeccable-finish-reviewer`, act on its disposition within its round budget;
   - spawn `impeccable-documenter` to write `DESIGN.md` + `.impeccable/design.json`.
7. **UX assessment** (§8), then **copy export** (§9), then **handover** (§10).

---

## 5. Build requirements

### Pages and routes

Clean URLs as `<route>/index.html`. Pages:

| Route | Page | Mode | Must contain (from the brief's IA) |
|---|---|---|---|
| `/` | MA & PhD landing | Persuade | Broad program identity in the first screen, without "philosophy only". Concise MA and PhD intros with their distinct purposes. The ICS approach. Fields / areas of study. Online and part-time access. Mentorship and community. Credible calls to action (not after every section). |
| `/ma/` | MA overview | Persuade | Who it's for. The approach. **Curriculum: three foundation courses, six electives, one capstone interdisciplinary seminar** (identical wording everywhere), plus thesis and language requirements (§6). Full- and part-time pathways. Representative courses by active full-time Senior Members. Next steps. "Find Your Scholarly Voice" as the heading. |
| `/phd/` | PhD overview | Persuade | Audiences beyond future professors. Standalone Ontario degree and VU conjoint option. Coursework, candidacy, dissertation, mentorship. Timeline **labelled as the full-time pathway**, with the part-time option stated next to it. Online delivery and the VU residency requirement. Placement section (hidden until data). Testimonial section (hidden until approved). |
| `/phd/faq/` | PhD FAQ | Read | The brief's topics: admissions preparation; full- and part-time study; online study; international applicants and visas; VU residency; candidacy exam; language requirements; completion time; funding and tuition. Use real disclosure elements that work without JS. |
| `/faculty/` | Faculty | Read | Active full-time Senior Members first: research areas, representative courses, books, supervision interests. Cross-appointed faculty labelled as such. **Emeritus faculty in a clearly separate section.** Courses taught by emeriti, sessionals or adjuncts, and Senior Members whose current teaching is in other programs, clearly labelled. |

Optional, only if it improves the journey without repeating content:

- `/ma/faq/` (same messaging system);
- `/apply/`: how to apply; links to the application form PDF and the Registrar. The old site's MA/PhD form is at `https://drive.google.com/file/d/14lygErsjLj7X_Gfl_uJIZuUNWpEx0OAJ/view`, so mark it **VERIFY current form**.

Also ship a 404 page, `sitemap.xml` and `robots.txt`.

### Masthead / navigation (pinned)

- Reproduce `info/reference/faculty-nav/` exactly:
  - black bar, 100px tall (69px at ≤1200px);
  - white-and-red ICS logo, 53px (30px at ≤1200px), linking to `https://www.icscanada.edu/`;
  - links in `'Helvetica Neue', Helvetica, Arial`: 0.8rem, weight 600, 0.14em tracking, uppercase;
  - hover/active shown by a `#D31145` underline, 1.5px thick at a 6px offset;
  - dropdowns right-aligned on black with a 2px red top border;
  - asymmetric three-bar burger below 1200px, opening a full-screen black overlay menu with a red ×;
  - a skip link;
  - keyboard-operable dropdowns (`nav.js`);
  - Escape closes the overlay.
- Compare against the four screenshots at desktop and mobile.
- Keep the class names and structure. Change only the items.
- Items (adjust if the routes change):
  - **Overview**
  - **MA**
  - **PhD** (dropdown: PhD Overview, PhD FAQ)
  - **Faculty**
  - **ICS** (dropdown, as on the faculty site: ICS Home, Programs, Courses & Syllabi, Admissions, Research (CPRSE), Critical Faith Podcast)
- If the design has a primary CTA, it lives in the page, not in the masthead. The faculty bar has no button.
- `--ink` and `--brand-red` stay scoped to the masthead.
- The skip link and focus outlines use the new design's tokens.

### Content system (the brief's maintainability requirement)

- **One content file** (e.g. `content/site.json` or `content/site.mjs`) holds every fact:
  - degree names;
  - umbrella positioning line;
  - curriculum structure;
  - delivery modes;
  - deadlines;
  - tuition and financial-aid language;
  - contacts and CTAs;
  - fields of study;
  - FAQ items;
  - faculty profiles: standing, titles, research areas, books, supervision interests, headshot, program role;
  - courses: id, title, code, term, instructor, format, catalogue link, `representative` flag;
  - testimonials;
  - placement data;
  - history items.
- Templates never hard-code a fact. A change to the curriculum wording in one place changes every card, table, timeline and FAQ.
- **Every unverified fact carries a `verify` field** naming who must confirm it (e.g. `"verify": "Academic Office"`). The build has two modes:
  - **draft:** the default for this round. Renders verify items with a visible, styled `VERIFY` marker, so Neal sees them in the Word export.
  - **publish:** a flag. Omits or falls back on every unverified item and **fails the build** if a required fact is still unverified. A placeholder can never ship by accident.
- **Hideable evidence sections:** `placement` and `testimonials` render nothing (no heading, no empty frame) when their data is empty or `enabled: false`.
  - The testimonial component supports **text or video** (with captions/transcript) and attributes a Junior Member and their mentor.
  - The placement component supports a headline figure, a list of institutions/roles and a source note. It displays **only supplied data**.
  - In draft mode, show each as a clearly labelled development placeholder block ("Placement data — awaiting verified figures from the Academic Office"). Never show fake quotes, names or numbers.
- **Reusable components:**
  - program card;
  - course card (links to its catalogue entry);
  - faculty profile;
  - FAQ item;
  - testimonial;
  - outcome statistic;
  - curriculum diagram/timeline (one source, used on landing, MA, PhD and FAQ);
  - program comparison (MA vs PhD, scannable but not oversimplified).
- **Future-proof positioning:** keep the umbrella identity in content, not templates, so the site can lean more philosophy-centred later by editing the content file only.
- **README** for the new repo:
  - how to edit content on GitHub;
  - what the Action does;
  - draft vs publish;
  - how to hide or show evidence sections;
  - the Google Sites embed rules below.

### Google Sites embed (the sister ICS sites are framed into Google Sites)

- `www.icscanada.edu` and the other Google Sites hosts refuse framing.
- The embed sandbox ignores `target="_top"`.
- So every **off-site** link opens in a new tab (`target="_blank" rel="noopener"`). Do it with a small script, plus `target` in the generated HTML for no-JS. On-site links keep the default target.
- Never write `target="_top"`.
- `mailto:` links are left alone.

### Quality floor

- Semantic HTML and correct heading order: one `h1` per page.
- Keyboard-reachable everything, visible focus.
- AA contrast.
- Useful alt text on meaningful images; empty alt on decorative ones.
- Restrained motion with `prefers-reduced-motion` respected.
- 44px touch targets.
- No horizontal scroll at 320px.
- Fast loading with minimal dependencies: self-host fonts or use at most one font service.
- **No broken internal links, and no placeholder link presented as complete.** Write a link checker into the build or a test script and run it.

---

## 6. Facts: verified, to verify, and conflicts

### Verified from repo sources (cite the source in a content-file comment when you use one)

**Delivery.** Every MA/PhD course in the catalogue snapshot (Winter 2026 to Winter 2027) is **online**: synchronous seminars, one summer online intensive. Meeting times are in ET. This proves "can be pursued online", but don't promise every future course will be.

**MA (old site, `old-site-text/ma-in-philosophy.md`):**
- Designed to guide Junior Members toward a vocation in "integrally Christian scholarship", in the university or in careers where disciplined Christian thought and writing matter; the goal is to "develop their own scholarly voice".
- Ten courses: **three foundation courses, six electives, one interdisciplinary (capstone) seminar.**
- **Reading knowledge of one foreign language** before the thesis exam, normally via an approved language course that counts as an elective.
- **Thesis** of 17,000–25,000 words, developed with a mentor, then an oral defence.
- Up to two TST courses may count. Up to two transferred graduate credits, with approval.
- Full-time is two years. **Part-time is available** (brief).

**PhD (old site, `old-site-text/phd-program.md`):**
- **Full-time pathway:** about 2 years of coursework, then about 3 years of dissertation. Always label this as the full-time pathway.
- **Part-time is available, including during coursework** (brief).
- Requirements:
  - coursework: foundations, an Interdisciplinary Seminar, electives;
  - a pre-dissertation literature review leading to a dissertation proposal;
  - a **pre-dissertation (candidacy) examination**, written and oral, by internal and external examiners;
  - reading proficiency in **at least two languages other than English**. Per the brief, this is a requirement for completion, **not admission**.
- Two degree tracks:
  - **Standalone ICS PhD**, authorized by Ontario (ICS has granted its own PhD since 2005, under its 1983 Act, amended 1992 and 2005).
  - **Conjoint PhD with the Vrije Universiteit Amsterdam**: coursework and exams at ICS; dissertation defence and degree conferral in Amsterdam.
- Up to two TST courses may count. Up to two transferred credits.
- Describe the candidacy exam as the brief does: it tests readiness to begin dissertation research and mastery of the broad areas the proposed dissertation engages.

**Full-time load (old admissions page):** six semester courses per academic year counts as full-time. People in full-time employment are advised to take one course per term. Non-degree students may take courses for credit, and a couple of courses can later count toward a degree.

**Fields of study.** The old site lists **seven**:
1. Aesthetics, Hermeneutics, and Philosophy of Discourse
2. Anthropology and Ethics
3. History and Historiography of Philosophy
4. Knowledge, Truth, and Learning
5. Philosophy of Religion and Philosophical Theology
6. Social and Political Philosophy
7. Theology and Biblical Studies

`old-site-text/program-design.md` has a one-line description of each, and the "overlapping neighbourhoods" metaphor.
- Use the official names unless the Academic Office approves new ones (**VERIFY official field names**).
- The number stated must match the number shown.
- **Never use "Religious Studies" as a field title.**

**Representative courses by active full-time Senior Members** (catalogue snapshot; build the course showcase from these, not from emeriti or sessionals):

| Senior Member | Course | Term | Notes |
|---|---|---|---|
| Neal DeRoo | *Material Spirituality: Rethinking Religion* (223001) | Winter 2027 | Wed 2–5pm ET, online. Phenomenology of religion; no prior phenomenology assumed. |
| Neal DeRoo | *Religion, Life and Society: Reformational Philosophy* (1107AC/2107AC) | Fall 2026 | Online. A prerequisite for the IDS, so likely a foundation course: **VERIFY**. |
| Neal DeRoo | *Issues in Phenomenology: Life* (223001) | Winter 2026 | Past. |
| Ron Kuipers | *Imagining the World with Ricoeur: Narrative, Action, and the Sacred in Ricoeur's Hermeneutic Phenomenology* (120504/220504) | Winter 2027 | Online. |
| Ron Kuipers | *Pragmatism, Race, and Religion* (120501/220501) | Winter 2026 | Past. |
| Nik Ansell | *God in Flesh and Blood: Revolutions in Christology* (240811) | Winter 2027 | Biblical theology seminar, TST cross-listed. |
| Nik Ansell | *Biblical Foundations: Narrative, Wisdom, and the Art of Interpretation* (1108AC/2108AC) | Fall 2026 | |
| Nik Ansell | *God/Sex/Word/Flesh: Gender, Theology, and the Body* (220804) | Fall 2026 | |
| Nik Ansell | *Meaning/Being/Knowing: The Disciplinary and Interdisciplinary Implications of a Christian Ontology* (2105AC) | Winter 2026 & Winter 2027 | In partnership with Calvin University. |
| Neal DeRoo & Nik Ansell | *IDS: The Post-Truth, the Un/Truth, and Nothing but the Truth* (2400AC) | Winter 2026 | The interdisciplinary seminar. |

- The "AC" codes look like the foundation sequence and "IDS" the interdisciplinary seminar. **VERIFY** before labelling any course "foundation" or "capstone".
- Present past terms as "recently taught" and future terms as scheduled. Link each course to `https://courses.icscanada.edu/#course-<id>`.

**Faculty** (`data/faculty/live-pages-2026-10-02/`, `roster.py`):

- **Senior Members:**
  - **Nik Ansell** (PhD, MPhilF, BA), Associate Professor of Theology.
    - Research: biblical theology, Christology, eschatology, wisdom, theology of gender, phenomenology of revelation.
    - Books: *The Annihilation of Hell* (Paternoster, 2013); *The Woman Will Overcome the Warrior* (UPA, 1994).
  - **Neal DeRoo** (PhD, MA, BA), Professor of Philosophy; **MA/PhD Program Director**.
    - Research on the live page: phenomenology, the theological turn, philosophy of religion, critical phenomenology, God and materiality, "what is religion", philosophies of liturgy. **Add political phenomenology** (brief).
    - Books: *Material Spirituality: A Transcendental Phenomenology of Religion* (Bloomsbury, 2026); *The Political Logic of Experience: Expression in Phenomenology* (Fordham, 2022).
    - Co-edited: *Philosophies of Liturgy* (Bloomsbury, 2023), *Philosophical Perspectives on Existential Gratitude* (Bloomsbury, 2023), *Oxford Handbook of Phenomenology of Religion* (forthcoming).
    - Use only these; the Pastel draft listed others that the ICS page does not.
  - **Ronald A. Kuipers** (PhD, MPhilF, BA), Professor of Philosophy of Religion; Interim Academic Dean; Director, CPRSE.
    - Research: religion in the public sphere, faith and reason, religious language, secularization and democracy.
    - Books: *Critical Faith* (Rodopi, 2002); *Richard Rorty* (Bloomsbury, 2013).
  - **Gideon Strauss**, Associate Professor of Leadership and Worldview Studies, and **Edith van der Boom**, Associate Professor of Philosophy of Education and Practice of Pedagogy and Director of the MA-EL Program, are Senior Members.
    - Their current courses are all MA-EL / MWS-E / CSTC, not MA/PhD.
    - List them, labelled as teaching mainly in the education programs. **VERIFY** their MA/PhD supervision roles.
- **Cross-appointed from The King's University:** Michael DeMoor (Associate Professor of Social Philosophy) and Jeffrey Dudiak (Professor of Philosophy). **VERIFY** their MA/PhD teaching and supervision.
- **Emeriti** (separate section; years served):
  - Hendrik Hart † (1967–2001)
  - James Olthuis (1968–2004)
  - Calvin Seerveld † (1972–1995)
  - Robert Sweetman (1991–2023; H. Evan Runner Chair in the History of Philosophy)
  - Lambert Zuidervaart (2002–2016)
  - Doug Blomberg (2003–2018)
  - **Rebekah Smick**, Professor Emerita of Philosophy of Arts and Culture, retired 2025. This confirms the brief's correction: **not** among active faculty.
  - Sweetman (*Albert the Great, Meister Eckhart, and Women's Spirituality*, Winter 2027) and Smick (*Reconsidering Kant's Aesthetics*, Fall 2026) still teach MA/PhD courses. Label these "taught by emeritus faculty".
- **Adjuncts:** Jonathan Chaplin, Adrienne Dengerink Chaplin, Sylvia Keesmaat.
- **Sessionals:**
  - Dean Dettloff (ICS PhD, 2021);
  - Andrew Tebbutt and Jacob Benjamins (each a SSHRC Postdoctoral Research Fellow). Benjamins teaches *Attention in the Age of Distraction*, Fall 2026.
  - These are individual fellowships. **Don't** present a postdoctoral program as an ICS offering.
- **Headshots:** download the real ones from `https://faculty.icscanada.edu/assets/headshots/<slug>.jpg` (and `-400.jpg`). Slugs: `nik-ansell`, `neal-deroo`, `ronald-kuipers`, `gideon-strauss`, `edith-van-der-boom`, `michael-demoor`, `jeffrey-dudiak`, and as in `roster.py`.
  - The brief says one earlier image was an obvious mismatch for Neal; use `neal-deroo.jpg` from the faculty site and nothing else.

### Must be marked VERIFY (never guessed)

- **Application deadline.** The old site says **February 1** for fall MA & PhD. The Pastel draft also said April 1 and November 1 and "rolling". Show none as final. Mark **VERIFY WITH ACADEMIC OFFICE**, and never publish a November 1 / winter deadline.
- **Financial aid.** Say "affordable tuition" and describe only verified assistance. Historically, aid decisions ran once a year: late applications "will not usually be eligible for financial aid" (old site). **VERIFY WITH ACADEMIC OFFICE.** Never say "generous financial aid".
- **Tuition figures:** link to the tuition page; don't state numbers unless verified.
- **International students and visas.** At the Director's review, ICS could not offer student visas, so international students studied online. **VERIFY BEFORE PUBLICATION.**
- **VU residency.** The conjoint agreement formally includes a **six-month residency requirement**. State it, and don't promise a waiver. **VERIFY AGAINST THE CURRENT ICS–VU AGREEMENT.**
- **PhD admission and the MA thesis.** The old site says a master's degree "including a thesis" is required, with a background in philosophy "encouraged". The Director questions the thesis requirement. **VERIFY WITH ACADEMIC OFFICE**, and word it so it does not exclude applicants in the meantime.
- **Course title:** the brief writes *Material Spirituality: Re-Thinking Religion*; the catalogue writes *Rethinking Religion*. Use the catalogue spelling and flag it.
- Which courses are the foundation courses and the capstone seminar (see above).
- Gideon Strauss, Edith van der Boom, Michael DeMoor and Jeffrey Dudiak: MA/PhD roles.
- The application form PDF link.
- Both event photographs: rights.
- **History names:** Brian Walsh, Nancy Pearcey, Richard Mouw, James K. A. Smith, Kristin Kobes Du Mez, CPJ, CLAC, Jubilee, ARCU. Only after the relationship is verified; default to omitting them.
  - James K. A. Smith (Class of '95) and Kristin Kobes Du Mez already appear with quotations on the main ICS homepage. Even so, **VERIFY** before reusing them here.

### Conflict rule

If the brief and a repo source conflict, don't silently choose. Use the brief's correction in the copy, mark the item VERIFY, and list it in the checklist (§10). Example: old site "MA with thesis required" vs brief "questioned".

---

## 7. The Pastel draft: keep vs. fix

**Keep and refine:**
- "Find Your Scholarly Voice" (MA heading).
- The MA as preparation for integrally Christian scholarship in the academy, classroom or public square.
- "Scholarship as a Practice of Wisdom", now in conversation with *spiritually attuned, culturally relevant scholarship*.
- "Learning is apprenticeship, not transaction."
- The Junior Member / Senior Member explanation, given once.
- The overlapping-"neighbourhoods" idea for fields, if it stays clear.
- The breadth of the hero line: *"Graduate programs for scholars and seekers called to pursue wisdom at the intersection of faith and the deepest questions of human life."*

**Do not repeat:**
- "Philosophical Apprenticeship" and "Where Rigorous Philosophy Meets Radical Faith" as the identity. That is a philosophy-only frame.
- Fields titled "Religious Studies", "Theological Studies", "Faith & Philosophy", and "Seven … Neighbourhoods" over **six** cards.
- "Generous financial aid" and "community supported … generous aid".
- April 1 / November 1 / February 1 deadlines shown as fact; "reviewed on a rolling basis".
- "Located in Toronto … one of the world's great university cities" framing that implies relocation.
- Stock photos (library shelves, open book, an Oxford-like college).
- Rebekah Smick among active faculty.
- Course lists and books for faculty not found in ICS sources.
- "Master's degree with a thesis component" stated as a flat requirement.
- An Apply button after every section.

---

## 8. UX assessment

After the impeccable finish review, assess the built site from each audience in the brief.

**Walk these journeys at desktop 1440 and mobile 390, with JS on and off:**

1. A pastor or teacher with no ICS connection, wondering whether an MA is for them and whether they must move.
2. A theology / biblical-studies student who doesn't see themselves as a "philosopher".
3. An international applicant: can I do this from abroad, and what about visas?
4. A future academic weighing the PhD: standalone vs VU, timeline, candidacy, languages, placement.
5. A working professional considering a **part-time** PhD for non-academic reasons.
6. Someone checking faculty fit: who would supervise my interest in X, and what do they teach this year?

For each journey, record:
- clicks or scrolls to the answer;
- where they hesitated or could be misled;
- what's missing;
- the fix.

**Score the brief's acceptance criteria** one by one (pass / partial / fail, with evidence).

**Fix every material issue in one batch** within impeccable's round budget, then re-verify. Write the result to **`info/ma-phd-ux-assessment.md`**: journeys, criteria table, issues fixed, issues left open with reasons.

---

## 9. Copy export for Neal (`/copy-review`)

Invoke `/copy-review` on the **built draft-mode pages**, all of them, in nav order.

- Factor the masthead and footer out as chrome. Include them as an appendix (`--include-chrome`) so Neal can review nav labels once.
- Keep `VERIFY` markers visible in the text so he can resolve them in Word.
- Title: "ICS MA & PhD — Copy for Review". Subtitle: the draft URL, or "Draft, <date>".
- Track Changes **on**. TOC depth 2.
- Save as **`info/ma-phd-copy-for-review.docx`**, with its manifest beside it (`info/ma-phd-copy-review-manifest.json`) for the return trip.
- Run the skill's checks before reporting the path:
  - heading count;
  - distinctive strings present;
  - `w:trackChanges` and `w:updateFields` set;
  - sane file size.
- This site is **generated**. When Neal's edited .docx comes back, `reconcile.py` produces `changes.json`. Each change goes into the **content file** (never the generated HTML), then rebuild and diff.
- Say this once in the handover, and put it in the README.
- Note the skill's limits for him:
  - link targets, alt text and images aren't in the document;
  - one edit to a repeated string applies everywhere.

---

## 10. Handover (end of run)

Give the user:

1. The built site and how to preview it locally (one command). Also what to switch on in GitHub Pages settings.
2. `info/ma-phd-copy-for-review.docx`, the path to send to Neal.
3. `info/ma-phd-ux-assessment.md`.
4. **`info/ma-phd-verification-checklist.md`.** The brief's "Items to Flag for Human Confirmation", each with:
   - the current wording on the site;
   - the source;
   - **the exact content-file key or keys to change**;
   - who must confirm (Academic Office, Program Director, VU agreement, communications/rights).
   - Include every VERIFY item from §6 and every placeholder location.
5. The impeccable finish review's disposition, at its real scope, plus the DESIGN.md path.
6. Anything not done, said plainly.

Commit the work on a branch with clear messages, if the user wants commits. Ask before pushing or changing GitHub settings.
