/*
 * Graphyte smooth scroll
 * Loads Lenis from jsDelivr and starts it. Plain script, no build step.
 *
 * Add to the site's <head> or end of <body> with:
 *   <script src="https://cdn.jsdelivr.net/gh/USER/REPO@TAG/site/smooth-scroll.js" defer></script>
 *
 * Behaviour:
 * - Does nothing if the visitor has "reduce motion" switched on.
 * - Touch devices keep native scrolling (Lenis default), so phones feel normal.
 * - In-page anchor links (href="#section") scroll smoothly instead of jumping.
 * - Exposes window.lenis so other scripts can call lenis.scrollTo(...).
 */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.lenis) return;

  var LENIS_SRC = 'https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js';

  function start() {
    if (typeof window.Lenis !== 'function') return;

    var lenis = new window.Lenis({
      duration: 1.1,        // seconds; lower = snappier, higher = floatier
      lerp: 0.1,            // ignored when duration is set, kept for reference
      smoothWheel: true,
      syncTouch: false      // native scrolling on touch
    });
    window.lenis = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Smooth in-page anchors
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -80 }); // leave room for the fixed navbar
    });
  }

  var s = document.createElement('script');
  s.src = LENIS_SRC;
  s.async = true;
  s.onload = start;
  document.head.appendChild(s);
})();
