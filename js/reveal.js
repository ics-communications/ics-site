/* Shared scroll-reveal for elements carrying the .reveal class.
   Usage: <script src="js/reveal.js" defer></script> (adjust the path for pages
   in subdirectories). The .reveal / .reveal.visible styles, and the
   prefers-reduced-motion opt-out, live in css/styles.css.

   Pages that need a staggered or otherwise bespoke reveal keep their own
   inline observer instead of loading this file. */
(function () {
  'use strict';

  function run() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    /* No IntersectionObserver: show everything rather than leaving the page
       blank, since .reveal starts at opacity 0. */
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(els, function (el) {
        el.classList.add('visible');
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });

    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }

  /* Loaded with defer, or dropped in at the end of <body> -- either way make
     sure the markup exists before we query it. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
