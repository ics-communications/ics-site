/* Junior Member Handbook: marks the chapter in view on the sticky rail and
   keeps that tab visible as the rail scrolls sideways. The page reads fully
   without it; the rail is plain anchor links. */
(function () {
  'use strict';

  var rail = document.querySelector('.hb-rail');
  var list = document.querySelector('.hb-rail__list');
  var chapters = Array.prototype.slice.call(document.querySelectorAll('.hb-ch'));
  if (!rail || !list || !chapters.length) return;

  var links = {};
  Array.prototype.forEach.call(list.querySelectorAll('a[data-ch]'), function (a) {
    links[a.getAttribute('data-ch')] = a;
  });

  // Sticky offsets follow the rail's real height (it changes with font size).
  function setRailHeight() {
    document.documentElement.style.setProperty('--hb-rail', rail.offsetHeight + 'px');
  }
  setRailHeight();
  window.addEventListener('resize', setRailHeight);

  var current = null;
  function mark(id) {
    if (id === current) return;
    if (current && links[current]) {
      links[current].classList.remove('is-current');
      links[current].removeAttribute('aria-current');
    }
    current = id;
    var a = id && links[id];
    if (!a) return;
    a.classList.add('is-current');
    a.setAttribute('aria-current', 'true');
    // Scroll the rail sideways only; never move the page.
    var left = a.offsetLeft - list.offsetLeft;
    var right = left + a.offsetWidth;
    if (left < list.scrollLeft + 24 || right > list.scrollLeft + list.clientWidth - 48) {
      list.scrollTo({ left: Math.max(0, left - 24), behavior: 'smooth' });
    }
  }

  // The chapter whose top has passed a line just under the rail is current.
  var ticking = false;
  function update() {
    ticking = false;
    var line = rail.offsetHeight + window.innerHeight * 0.25;
    var id = null;
    for (var i = 0; i < chapters.length; i++) {
      if (chapters[i].getBoundingClientRect().top <= line) id = chapters[i].id;
      else break;
    }
    mark(id);
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
})();
