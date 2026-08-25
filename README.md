# ics-site

Static pages for the Institute for Christian Studies. Every page shares one
stylesheet and one footer.

## Layout

```
index.html              landing page
about/                  /about section
  index.html              About Us
  accessibility-policy.html
  administrative-staff.html
  become-a-member.html
  employment-opportunities.html
  mission-educational-creed.html
  privacy-policy.html
css/
  styles.css            shared design system — tokens, buttons, hero, footer,
                        reveal, responsive rules. Every page links this.
  pages/<name>.css      page-specific rules only, loaded after styles.css
js/
  footer.js             the site footer, injected where the tag sits
  reveal.js             scroll-reveal for elements with class="reveal"
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
<script src="../js/reveal.js" defer></script>
```

Drop `reveal.js` if the page has no `.reveal` elements, and drop the `../` from
all four paths for a page at the repo root. If the page reveals on scroll, also
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
