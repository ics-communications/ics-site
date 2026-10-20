# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML published by GitHub Pages ("Deploy from a branch"), generated ahead of time by a build script from one content file, with a GitHub Action that rebuilds when the content file changes. Readable with no JavaScript, so it also works framed inside Google Sites. Chosen with the user, 2026-10-02.

## Users

Prospective graduate students weighing the ICS MA in Philosophy or PhD in Philosophy. Confirmed audiences (from the 2026 MA/PhD redesign brief, approved by the user as the product record):

- students preparing for academic research or teaching;
- teachers, ministers, writers, institutional leaders, and public intellectuals;
- people seeking advanced Christian scholarship for personal or vocational formation;
- students drawn to theology, biblical studies, culture, politics, education, aesthetics, or religion, not only self-identified philosophers;
- international and geographically dispersed students looking for a rigorous online program;
- prospective MA students with no prior connection to ICS or Reformational philosophy.

Their job: decide whether ICS is the right place for serious, faith-shaped graduate study, understand what the degree actually requires, and know the next concrete step.

## Product Purpose

ICS is a small, Ontario-chartered Christian graduate school (Toronto, founded 1967) whose MA and PhD form students through close intellectual apprenticeship. Success: a visitor understands within the first screen that ICS offers rigorous Christian graduate scholarship without being told it is only for philosophers, sees that the programs are online and can be part-time, and contacts the Program Director or Registrar, or applies.

## Positioning

Spiritually attuned, culturally relevant Christian scholarship addressing the deepest questions of human life. Faith is treated as intellectually generative rather than added to neutral scholarship; scholarship is tied to personal, ecclesial, institutional, and cultural problems; learning happens as apprenticeship between Junior Members (students) and Senior Members (faculty) in small seminars. The official degree names remain MA in Philosophy and PhD in Philosophy, but the faculty teaches theology and biblical studies as much as philosophy, so the identity must not read as philosophy-only. The positioning is expected to shift as the faculty changes.

## Operating Context

- Every current MA/PhD course in the ICS Course Catalogue is delivered online synchronously (catalogue checked 2026-10-02).
- Program Director: Neal DeRoo (confirmed by the user 2026-10-02); public contact for fit and supervision questions. The Academic Registrar (academic-registrar@icscanada.edu) handles applications.
- Faculty directory: faculty.icscanada.edu (Senior Members, cross-appointed faculty, emeriti, adjuncts, sessionals) with real headshots.
- Course catalogue: courses.icscanada.edu; timetable and calendar generated in this repo.
- Application: the MA/PhD application form PDF linked from the current admissions page.
- Affiliations: Toronto School of Theology (up to two TST courses may count); conjoint PhD with the Vrije Universiteit Amsterdam.

## Capabilities and Constraints

- MA: three foundation courses, six electives, one capstone interdisciplinary seminar, plus a thesis and one foreign language (per the current published program page). Can be completed part-time.
- PhD: two years of coursework plus three years of dissertation work is the full-time pathway; part-time study is available, including during coursework. Standalone Ontario degree or VU conjoint degree. Foreign-language competency is a completion requirement, not an admission prerequisite.
- Terminology: explain Junior Member and Senior Member once per page, then use them naturally.
- Must not claim: generous financial aid, a winter (November 1) deadline, a required MA thesis for PhD entry, waived VU residency, current visa sponsorship, invented placement figures, invented testimonials, or future fundraising goals (certificate, postdocs, teaching fellows, lectureship) as current offerings.
- Open decisions, all marked VERIFY in the content file: degree names, umbrella language, official field names, deadlines, financial-aid process, tuition and scholarships, international/visa wording, VU residency wording, MA-thesis requirement for PhD admission, language requirements, faculty titles and supervision areas, placement data, testimonials and media permissions, photography rights.

## Brand Commitments

- Name: Institute for Christian Studies (ICS). The masthead/navigation must match faculty.icscanada.edu exactly (reference in `info/reference/faculty-nav/`). Everything below the masthead is a new visual design; the sister sites (www.icscanada.edu pages in the ics-site repo: crimson, burnt copper, cream, Libre Baskerville with Outfit; faculty.icscanada.edu: the same world as a journal register) are evidence of the brand, not binding.
- Voice: intellectually serious without being opaque; distinctively Christian without slogans; confident but factually restrained; warm and invitational; oriented to questions and formation more than career outcomes.
- Phrases the Program Director liked: "Find Your Scholarly Voice" (MA heading); "Scholarship as a Practice of Wisdom"; "Learning is apprenticeship, not transaction."

## Evidence on Hand

- Course catalogue snapshot (`info/reference/data/course-catalogue-2026-10-02.json`, from courses.icscanada.edu), every MA/PhD course with instructor, term, format, and description.
- Faculty directory snapshot (`info/reference/data/faculty/roster.py` and `content.json`, the build data behind faculty.icscanada.edu) with titles, research foci, publications; real headshots at faculty.icscanada.edu/assets/headshots/.
- Old MA, PhD, admissions, and program-design pages saved in `info/MA-PhD-Old/` (clean text in `info/reference/old-site-text/`).
- Two event photographs used on the main ICS site (`info/reference/photos/`); they appear to be ICS's own photography, but rights are unconfirmed.
- Absent and not to be fabricated: graduate placement data, student testimonials, scholarship amounts, current deadlines, tuition figures.

## Product Principles

1. Breadth before discipline: lead with Christian scholarship and the deepest questions of human life, then name philosophy, theology, and biblical studies as the disciplines that serve it.
2. Show the apprenticeship: real Senior Members, real seminars, real supervision, never generic claims of "close mentorship."
3. Restraint is credibility: say less rather than claim what is unverified; hide a section rather than fill it.
4. Accessible without dilution: online, part-time, international, and non-academic vocations are first-class paths, described accurately.
5. One fact, one place: shared program facts live in a single content file so the positioning can shift without a rebuild.

## Accessibility & Inclusion

Semantic HTML and heading order, keyboard-reachable controls, WCAG AA contrast, useful alt text, reduced-motion support, 44px touch targets (existing site convention). Pages must read fully without JavaScript inside the Google Sites embed.
