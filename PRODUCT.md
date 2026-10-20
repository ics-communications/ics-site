# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- Prospective graduate students, donors, members, and the wider church and academic public who visit the ICS site to understand the school and act (apply, request info, register, donate).
- ICS faculty and staff, who also carry the institution's identity into the world on printed collateral (business cards) and share it face to face.

## Product Purpose
The Institute for Christian Studies (ICS) is an interdisciplinary graduate school in Toronto and online, in the reformational Christian tradition. It brings together theology, philosophy, education, and culture. It has operated for over fifty years. The site and its collateral exist to present the school truthfully and invite people into it.

## Positioning
"Where Faith Meets Rigorous Scholarship." ICS offers intellectual hospitality across traditions: faith with room to question. Its scholarship is grounded in reformational philosophy and engaged with contemporary society. The long-standing tagline is "a tradition of inquiry, a spirit of engagement."

## Operating Context
- The static site is built from HTML, the shared `css/styles.css`, and per-page CSS. The academic calendar and course timetable sync from Google Sheets.
- Business cards are 3.5 × 2 in, digitally printed in full colour (CMYK) with no special finishes. They are produced from a fillable PDF template plus a generator script that batch-produces print-ready cards from a staff list (`info/BusinessCards/`).

## Capabilities and Constraints
- Per-person card fields: full name, optional pronouns/credentials line, two title lines, email, phone.
- Fixed card content: "Institute for Christian Studies", 59 St. George Street, Toronto, ON M5S 2E6 Canada, www.icscanada.edu. The user asked for fewer fixed lines than the old card had, so the tagline and full address may be trimmed or moved.
- Print files need 0.125 in bleed, crop marks, and fonts that are embedded and licensed for use.

## Brand Commitments
- Institution name: Institute for Christian Studies (ICS).
- The ICS logo: serif "I" and "S" around a "C" formed by a descending dove. Sources are in `SVG-Logos/` and `info/BusinessCards/assets/`. The logo is used unaltered.
- Brand red is #BE0B28.

## Evidence on Hand
- Old card source: `info/BusinessCards/BW Business Card.pdf`. Sample proof: `ICS-BusinessCard-SampleProof.pdf`. Generator: `make_business_card.py`.
- Real staff names and titles live in `about/administrative-staff.html` and `info/BusinessCards/ics-org-chart.html`.

## Product Principles
- Hospitable rigour: serious scholarship that welcomes the person.
- Truthful presentation: real people, real programs, no invented claims.
- One identity across the web and print.
