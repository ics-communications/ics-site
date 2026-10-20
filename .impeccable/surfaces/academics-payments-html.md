---
version: 1
slug: "academics-payments-html"
primary_target: "academics/payments.html"
related_targets: ["js/payments.js","css/pages/payments.css"]
---

# Student payment page

Scope: `academics/payments.html` with `js/payments.js`, `css/pages/payments.css`, and the Apps Script in `_scripts/`. Visitor mode: Operate. A current student pays tuition or a fee in one sitting and leaves with a receipt.

Audience: enrolled ICS students, often sent here by the Registrar in an email. Job: say who they are, what they are paying for and how much, pay by PayPal or card, and get proof. Constraints: unlisted (no nav, no sitemap) until the user says so. CAD only, $5 to $20,000. Purposes are Tuition, Course or program fee, and Other. The Registrar is the only staff recipient.

## Direction contract

THESIS: A page where the amount the student sees is the amount charged. This page refuses the generic checkout of a gray field stack with a floating total.

OWN-WORLD: The site's own pieces. Academics-section wine hero, a cream-warm band, the shared `.rsvp-form` card with its copper top rule and square corners. Baskerville names, and Outfit states the facts.

STORY: The student reads one line on what happens, fills four short fields, watches the receipt fill in, pays, and gets a reference number and a promise of two emails.

FIRST VIEWPORT: The hero title and one sentence. Below it, the form card on the left and the receipt slip on the right, sticky on desktop and stacked under the form on mobile. The PayPal buttons sit at the foot of the slip, under the sentence "You are paying CAD $X for Y."

FORM: The receipt slip. Brief-pinned (site template), no roll, seed key none.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
