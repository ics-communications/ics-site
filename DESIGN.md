---
name: Institute for Christian Studies
description: One identity across web and print, in wine, copper and cream, with Libre Baskerville speaking and Outfit stating the facts.
colors:
  wine: "#9B0D24"
  wine-deep: "#7A0A1C"
  wine-mid: "#BE0B28"
  wine-soft: "#D44B5E"
  accent: "#A85A32"
  accent-light: "#C87A52"
  accent-on-wine: "#E9B48F"
  accent-muted: "#8E4A28"
  accent-pale: "#EEDACA"
  accent-deep: "#7A4020"
  teal: "#7A5C3A"
  teal-muted: "#6B4E30"
  teal-pale: "#E6D9C6"
  teal-deep: "#5A4228"
  cream: "#FDFBF7"
  cream-warm: "#F9F5ED"
  parchment: "#F0E9DD"
  text-dark: "#2E1318"
  text-body: "#3A3330"
  text-muted: "#857E78"
  text-on-dark: "#E8C2C2"
typography:
  display:
    fontFamily: "Libre Baskerville, Georgia, serif"
    fontSize: "clamp(2.2rem, 5vw, 3.4rem)"
    fontWeight: 700
    lineHeight: 1.12
  headline:
    fontFamily: "Libre Baskerville, Georgia, serif"
    fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Libre Baskerville, Georgia, serif"
    fontSize: "1.3rem"
    fontWeight: 700
    lineHeight: 1.25
  voice:
    fontFamily: "Libre Baskerville, Georgia, serif"
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Outfit, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Outfit, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 600
    letterSpacing: "0.08em"
  card-name:
    fontFamily: "Libre Baskerville, serif"
    fontSize: "15pt"
    fontWeight: 400
  card-call:
    fontFamily: "Libre Baskerville, serif"
    fontSize: "8.6pt"
    fontWeight: 400
  card-response:
    fontFamily: "Libre Baskerville, serif"
    fontSize: "17pt"
    fontWeight: 400
  card-fact:
    fontFamily: "Outfit, sans-serif"
    fontSize: "7.4pt"
    fontWeight: 400
    letterSpacing: "0.01em"
rounded:
  none: "0"
  xs: "3px"
  sm: "4px"
  full: "50%"
spacing:
  container-pad: "2rem"
  container-pad-mobile: "1.25rem"
  section: "4.5rem"
  section-lg: "5rem"
  card-margin: "13pt"
  card-bleed: "0.125in"
components:
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.75rem 1.6rem"
    height: "44px"
  button-accent-hover:
    backgroundColor: "{colors.accent-deep}"
  button-outline-dark:
    backgroundColor: "transparent"
    textColor: "{colors.wine}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.75rem 1.6rem"
  button-outline-dark-hover:
    backgroundColor: "{colors.wine}"
    textColor: "{colors.cream}"
  program-card:
    backgroundColor: "{colors.cream-warm}"
    textColor: "{colors.text-body}"
    rounded: "{rounded.none}"
    padding: "2.2rem 1.8rem 1.8rem"
  degree-tag:
    textColor: "{colors.wine-mid}"
    rounded: "{rounded.xs}"
    padding: "0.1rem 0.45rem"
  site-footer:
    backgroundColor: "{colors.wine-deep}"
    textColor: "{colors.text-on-dark}"
    padding: "3.5rem 0 2rem"
  business-card-front:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.text-dark}"
    width: "3.5in"
    height: "2in"
    padding: "13pt"
  business-card-back:
    backgroundColor: "{colors.wine}"
    textColor: "{colors.cream}"
    width: "3.5in"
    height: "2in"
    padding: "13pt"
---

# Design System: Institute for Christian Studies

## Overview

**Creative North Star: "The Scholar's Hearth"**

A warm, bookish world. Wine and cream set the ground, copper carries the voice, and a warm umber gives programs a second register. Libre Baskerville carries what the institution says: names, headings, and an italic speaking voice. Outfit carries the facts: dates, contacts, labels, body copy. Surfaces are flat and square-cornered. Depth comes from tone (wine over wine-deep, cream over cream-warm), with a soft lift on hover.

The website (`css/styles.css` plus per-page CSS) is the source of the world. Print is an extension of it. The business card (`info/BusinessCards/make_ics_card.py`) carries the same palette in CMYK, the same two faces, and the same copper thread, compressed to 3.5 × 2 in.

**Key Characteristics:**
- Wine-drenched heroes and footers; cream content grounds.
- Copper for the italic voice, calls to act, and thin rules.
- Serif for what is said, sans for what is stated.
- Square buttons and cards, with small radii only on tags.
- Tone-on-tone depth rather than heavy shadow.

## Colors

The palette is warm, with no cool hues: crimson, burnt copper, umber and parchment.

### Primary
- **Ecclesiastical Wine** (`wine`): headings, names, the email line on the card, outline buttons, and the drenched back of the card.
- **Deep Wine** (`wine-deep`): hero ground, under a wine gradient overlay, and the footer.
- **ICS Brand Red** (`wine-mid`): the logo's red. Also used for degree-tag text. On print it is reserved for the logo.
- **Rose Wine** (`wine-soft`): the hover tint on a program card's top border.

### Secondary
- **Burnt Copper** (`accent`): primary buttons, the 3px accent rule, card top borders, list dots, the card's call line, hairline and web address.
- **Light Copper** (`accent-light`): decorative copper, such as gradient rules and list dots. It is too dark for text on wine (2.6:1).
- **Copper Glow** (`accent-on-wine`): copper text on wine grounds, such as hero italics, eyebrows, footer headings and link hovers. It holds 4.6:1 on wine and 6:1 on wine-deep.
- **Muted Copper** (`accent-muted`): small copper text such as dates, number labels and the card's credentials line.
- **Deep Copper** (`accent-deep`): button hover and italic program questions.
- **Copper Blush** (`accent-pale`): the left border on program questions.

### Tertiary
- **Warm Umber** (`teal` family; the CSS variable names are legacy and the hue is umber): the second program group's border, number, question and link. It is an alternate register for parallel content, never a third accent on the same element.

### Neutral
- **Cream** (`cream`): the page and the card front.
- **Warm Cream / Parchment** (`cream-warm`, `parchment`): banded sections and card surfaces.
- **Ink** (`text-dark`): strong text and card titles and phone.
- **Body Umber-Grey** (`text-body`): running text.
- **Stone** (`text-muted`): tertiary text.
- **Rose Mist** (`text-on-dark`): body text on wine, and the card's address line.
- **Hairline border**: `rgba(155,13,36,0.08)`, a wine-tinted divider.

### Print (CMYK)
Built from the web hex values in the card generator. They are provisional until ICS confirms an official CMYK for brand red with the printer.

| Token | CMYK | Card role |
|---|---|---|
| wine | 10 / 100 / 80 / 35 | back ground, email |
| wine + 10K | 10 / 100 / 80 / 45 | dove watermark only |
| wine-mid (brand red) | 5 / 100 / 80 / 15 | front logo |
| accent | 20 / 65 / 85 / 15 | call line, hairline, web address |
| accent-muted | 25 / 70 / 90 / 30 | credentials |
| cream | 0 / 2 / 6 / 0 | front ground, back text and logo (deepened so it prints) |
| text-dark | 40 / 80 / 60 / 80 | titles, phone |
| text-on-dark | 0 / 25 / 12 / 5 | back address |

### Named Rules
**The Copper Voice Rule.** Copper speaks: italic phrases, calls to act and rules. Wine names. Never set a name or heading in copper, and never set the italic voice in wine.

**The Logo Red Rule.** On print, brand red (#BE0B28) appears only in the logo, on cream. On wine, the logo reverses to cream. It is never set in copper, umber or ink.

## Typography

**Display Font:** Libre Baskerville (with Georgia, serif), weights 400, 400 italic and 700.
**Body Font:** Outfit (with the system sans stack), weights 300 to 700.

**Character:** A bookish transitional serif speaks over a clean geometric sans. The serif's italic is the institution's speaking voice.

### Hierarchy
- **Display** (700, clamp 2.2–3.4rem, 1.12): hero titles in cream on wine. Emphasis is italic in light copper.
- **Headline** (700, clamp 1.6–2.4rem, 1.2): section titles in wine.
- **Title** (700, 1.3rem, 1.25): card and program titles in wine.
- **Voice** (400 italic, 0.85–1.05rem): program questions, quotes and subtitles in deep copper.
- **Body** (Outfit 400, 1rem at a 110% root, 1.65): body copy. The hero subtitle uses Outfit 300.
- **Label** (Outfit 600, 0.78rem, 0.08em, uppercase): buttons and text links.

### Print scale (business card)
- **Name**: Baskerville 400, 15 pt, in wine. It shrinks to a 12 pt floor. A name too long at 12 pt breaks onto two lines at 12 on 13.5 pt.
- **Call**: Baskerville italic, 8.6 pt, in copper, at top left.
- **Response**: Baskerville italic, 17 pt, in cream, on two lines.
- **Credentials**: Outfit 400, 6.6 pt, in muted copper. Floor 6 pt.
- **Titles**: Outfit 300, 7.6 pt, in ink, on a 9.5 pt step. Floor 6.5 pt.
- **Email / Phone**: Outfit 400 (wine) and 300 (ink), 7.4 pt, on a 9.5 pt step. Floor 6.5 pt, with the width capped so the lines stay clear of the logo.
- **Web**: Outfit 500, 7.4 pt, in copper, tracked 0.02em.
- **Back signature**: the name in Outfit 500 at 7.2 pt in cream; the address in Outfit 400 at 6.8 pt in rose mist.

### Named Rules
**The Two Voices Rule.** Baskerville for what is said (names, headings, the italic voice), Outfit for what is stated (contacts, dates, labels, body). Don't swap them.

**The Six-Point Floor Rule.** No print text below 6 pt. A line that cannot fit at its floor is refused and must be rewritten, not shrunk further.

## Layout

Web: a 1200px container with 2rem side padding (1.25rem at 768px and below). Sections breathe at 4.5–5rem vertical padding. Program groups sit in a 3-column grid with a 1.5rem gap. The footer is a 1.8fr / 1fr / 1fr / 1fr grid that becomes 2 columns at 1024px. The root size is 110%, stepping to 100%, 95% and 90% at 768, 480 and 360px. Touch targets are at least 44px.

Print: 3.5 × 2 in trim, 0.125 in bleed, crop marks outside the bleed, and a 13 pt inner margin. The front is a single left-aligned column: call, then name, credentials, titles, a copper hairline, then email, phone and web. When a line is blank, the gap closes and the contact block stays anchored to the web baseline.

## Elevation & Depth

Flat by default, with tonal layering. Wine-deep sits under a wine gradient, and cream-warm bands sit against cream. Shadows appear only as a hover response: a copper glow under buttons and a faint wine lift under cards. The one exception is the featured book cover, which is shown as a physical object with its own cast shadow. Print has no shadows. Its only depth is the tone-on-tone dove.

### Named Rules
**The Lift-On-Hover Rule.** Surfaces rest flat. On hover they rise 1–3px with a soft tinted shadow, and touch devices drop the lift.

## Shapes

Square by default. Buttons and cards have no radius. Small radii (3–5px) are kept for tags, widget frames and social tiles, and 50% for dots and avatars. Lines are the shape language: a 3px copper-to-transparent accent rule, a 3px copper top border on cards, a 2px blush left border on quotes, and hairline wine-tinted dividers. On the card, the rule is a single 22 pt copper hairline at 0.5 pt.

## Components

### Buttons
Square and confident.
- **Shape:** square corners (0).
- **Primary (accent):** copper with white uppercase Outfit 600 label, 0.75rem × 1.6rem padding, 44px minimum height.
- **Hover / Focus:** deepens to deep copper, lifts 1px, and gains a copper glow. Focus-visible draws a 2px wine outline offset 3px. On touch, pressing scales the button to 0.97.
- **Outline dark / light:** a 1.5px wine border that fills wine on hover; on wine grounds, a translucent white border that turns light copper on hover.

### Program Cards
- **Corner Style:** square.
- **Background:** warm cream with a hairline border and a 3px copper top border (umber in the second group).
- **Content:** a serif number in muted copper, a wine serif title, an italic copper question with a blush left rule, and degree tags (wine-mid text on a 6% wine tint, 3px radius).
- **Hover:** lifts 3px; the top border shifts to rose wine.

### Footer
Wine-deep ground with rose-mist text. Headings are Outfit 700 uppercase, tracked, in light copper, and links turn light copper on hover. Separated by hairlines.

### Business Card (print)
**Call and response.** The tagline is split across the two faces. The cream front opens with "a tradition of inquiry," in copper italic, and its comma hangs so the reader turns the card. The wine back answers "a spirit of engagement." in large cream italic. The front holds the person; the back holds the institution.
- **Front logo:** the full ICS logo in brand red, 25 pt high, at the right margin, its foot on the web address baseline.
- **Back signature:** the cream logo, 22 pt high, at bottom left, followed by the institution name and a one-line address.
- **Dove watermark:** only the dove "C", clipped to its own circle, 200 pt across. It is set in wine + 10K on wine, centred 52 pt in from the right trim and bleeding off the edge, and never extends past the bleed.
- **Production:** fonts are embedded as static instances. Form fields set type in the card's own faces. The batch generator refuses any line that will not fit.

## Do's and Don'ts

### Do:
- **Do** use the logo intact, drawn from `SVG-Logos/` vectors: brand red on cream, cream on wine.
- **Do** keep the dove watermark tone-on-tone (one step darker, +10K) so text can cross it and stay legible.
- **Do** set print colour in CMYK from the table above. Confirm brand red with the printer before a large run.
- **Do** keep copper to the voice, actions and rules, and let wine and cream carry the mass.
- **Do** hold print type at or above its floor (6 pt minimum, 12 pt for names).

### Don't:
- **Don't** set the whole tagline on one face of the card. The split is the card's idea.
- **Don't** extract, crop or restyle any part of the logo except the dove "C" watermark, and don't use the watermark in a contrasting colour.
- **Don't** round buttons or cards.
- **Don't** introduce cool hues. The palette is wine, copper, umber and cream; the only exception is a third-party mark in its own colour, such as the Facebook widget's blue.
