/* Masthead navigation, copied from faculty.icscanada.edu js/site.js (2026-10-02).
   Everything here is progressive enhancement: the pages are complete without it. */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  /* ── Mobile menu ─────────────────────────────────────────────── */
  var burger = document.querySelector('.ics-burger');
  var menu = document.getElementById('mobileMenu');

  function closeMenu() {
    if (!menu) return;
    menu.classList.remove('is-open');
    document.body.style.overflow = '';
    if (burger) {
      burger.setAttribute('aria-expanded', 'false');
      burger.focus();
    }
  }

  if (burger && menu) {
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-controls', 'mobileMenu');
    burger.addEventListener('click', function () {
      menu.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      burger.setAttribute('aria-expanded', 'true');
      var close = menu.querySelector('.ics-mobile-menu__close');
      if (close) close.focus();
    });
    var closeBtn = menu.querySelector('.ics-mobile-menu__close');
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMenu();
    });
  }

  /* ── Desktop dropdowns: hover opens them in CSS, this is for keyboards ── */
  Array.prototype.forEach.call(
    document.querySelectorAll('.ics-nav__item > button'),
    function (btn) {
      btn.addEventListener('click', function () {
        var open = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', open ? 'false' : 'true');
      });
    }
  );

})();
