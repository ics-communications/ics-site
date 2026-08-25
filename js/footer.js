/* Shared site footer.
   Usage: place <script src="js/footer.js"></script> where the footer should
   appear (adjust the src path for pages in subdirectories). The footer's
   styles live in css/styles.css, which every page must also link. */
(function () {
  'use strict';

  var footerHTML = `
<footer class="site-footer">
  <div class="container">
    <div class="footer__grid">
      <div>
        <div class="footer__brand">Institute for Christian Studies</div>
        <p class="footer__desc">Graduate education, research, and community service in the Reformational tradition since 1967. Forming the next generation of Christian scholars.</p>
        <address class="footer__address">
          59 St. George Street<br>Toronto, Ontario M5S 2E6<br>Canada<br><br>
          1-416-979-2331<br>
          <a href="mailto:info@icscanada.edu" style="color:var(--accent-light)">info@icscanada.edu</a>
        </address>
      </div>
      <div>
        <h4 class="footer__heading">Programs</h4>
        <ul class="footer__links">
          <li><a href="https://www.icscanada.edu/academics/phd-program">PhD in Philosophy</a></li>
          <li><a href="https://www.icscanada.edu/academics/master-of-arts-in-philosophy">MA in Philosophy</a></li>
          <li><a href="https://education.icscanada.edu/mael">MA(Phil) Ed. Leadership</a></li>
          <li><a href="https://education.icscanada.edu/mwse">Master of Worldview Studies in Education</a></li>
          <li><a href="https://www.icscanada.edu/academics/courses-and-syllabi">Courses &amp; Syllabi</a></li>
          <li><a href="https://f2bf.icscanada.edu">Free to be Faithful</a></li>
        </ul>
      </div>
      <div>
        <h4 class="footer__heading">Admissions</h4>
        <ul class="footer__links">
          <li><a href="https://www.icscanada.edu/admissions">Prospective Students</a></li>
          <li><a href="https://www.icscanada.edu/admissions/admission-requirements-modes-of-study">Requirements &amp; Modes</a></li>
          <li><a href="https://www.icscanada.edu/admissions/financial-aid">Financial Aid</a></li>
          <li><a href="https://www.icscanada.edu/admissions/tuition-fees">Tuition &amp; Fees</a></li>
          <li><a href="https://www.icscanada.edu/admissions/international-students">International Students</a></li>
          <li><a href="https://www.icscanada.edu/faq">FAQ</a></li>
        </ul>
      </div>
      <div>
        <h4 class="footer__heading">Connect</h4>
        <ul class="footer__links">
          <li><a href="https://www.icscanada.edu/about/our-story">Our Story</a></li>
          <li><a href="https://www.icscanada.edu/about/mission-educational-creed">Mission &amp; Creed</a></li>
          <li><a href="https://faculty.icscanada.edu/">Faculty</a></li>
          <li><a href="https://www.icscanada.edu/research">Research (CPRSE)</a></li>
          <li><a href="https://www.icscanada.edu/events">Events</a></li>
          <li><a href="https://www.icscanada.edu/critical-faith-podcast">Critical Faith Podcast</a></li>
          <li><a href="https://perspective.icscanada.edu/">Perspective Newsletter</a></li>
          <li><a href="https://www.icscanada.edu/about/become-a-member">Become a Member</a></li>
          <li><a href="https://www.icscanada.edu/donate">Donate</a></li>
        </ul>
      </div>
    </div>

    <div class="footer__bottom">
      <span>&copy; 2026 Institute for Christian Studies &middot;
        <a href="https://www.icscanada.edu/about/privacy-policy" style="color:inherit">Privacy</a> &middot;
        <a href="https://www.icscanada.edu/about/accessibility-policy" style="color:inherit">Accessibility</a>
      </span>
      <div class="footer__social">
        <a href="https://www.facebook.com/instituteforchristianstudies" aria-label="Facebook" title="Facebook">f</a>
        <a href="https://twitter.com/InsChr" aria-label="X" title="X / Twitter">𝕏</a>
        <a href="https://www.instagram.com/instituteforchristianstudies/" aria-label="Instagram" title="Instagram">ig</a>
        <a href="https://www.linkedin.com/school/icscanada" aria-label="LinkedIn" title="LinkedIn">in</a>
        <a href="https://www.youtube.com/user/ChristianStudies" aria-label="YouTube" title="YouTube">▶</a>
        <a href="https://instituteforchristianstudies.substack.com" aria-label="Substack" title="Substack" class="social-substack">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24l9.54-5.58L20.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>
          </svg>
        </a>
      </div>
    </div>
  </div>
</footer>
`;

  document.currentScript.insertAdjacentHTML('beforebegin', footerHTML);
})();
