/*
 * Graphyte smooth scroll
 * Loads Lenis from jsDelivr and starts it. Plain script, no build step.
 *
 * Add to the site's <head> or end of <body> with:
 *   <script src="https://cdn.jsdelivr.net/gh/mattdetails/graphyte-site@v1.0.3/smooth-scroll.js" defer></script>
 *
 * Behaviour:
 * - Does nothing if the visitor has "reduce motion" switched on.
 * - Touch devices keep native scrolling (Lenis default), so phones feel normal.
 * - Same-page anchor links (Relume renders them as https://site/#section) scroll smoothly
 *   instead of jumping, and the offset is measured from the fixed navbar.
 * - Landing on the page with a hash in the URL glides to that section from the top.
 * - Exposes window.lenis so other scripts can call lenis.scrollTo(...).
 */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.lenis) return;

  var LENIS_SRC = 'https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js';

  // Lenis's recommended CSS. The first rule matters most: Relume sets
  // scroll-behavior: smooth on <html>, and if that stays on, the browser
  // smooths every frame Lenis already smoothed, which feels laggy and rubbery.
  var css = [
    'html.lenis { scroll-behavior: auto !important; }',
    'html.lenis, html.lenis body { height: auto; }',
    '.lenis:not(.lenis-autoToggle).lenis-stopped { overflow: clip; }',
    '.lenis.lenis-smooth [data-lenis-prevent] { overscroll-behavior: contain; }',
    '.lenis.lenis-smooth iframe { pointer-events: none; }'
  ].join('\n');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

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

    // Room for the fixed navbar, measured from the page rather than guessed.
    function navOffset() {
      var nav = document.querySelector('[id^="sc-navbar"], nav');
      var h = nav ? nav.getBoundingClientRect().height : 0;
      return -(h ? h + 16 : 80);
    }

    function targetFor(hash) {
      if (!hash || hash.length < 2) return null;
      var id;
      try { id = decodeURIComponent(hash.slice(1)); } catch (err) { id = hash.slice(1); }
      return document.getElementById(id);
    }

    // Smooth in-page anchors. Relume renders section links as full URLs
    // (https://site/#section-id), so match on the resolved URL, not on href="#...".
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target === '_blank') return;
      var url;
      try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
      if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
      var target = targetFor(url.hash);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: navOffset() });
      if (history.pushState) history.pushState(null, '', url.hash);
    }, true);

    // Arriving from another page with a hash (/contact -> /#services): the browser has already
    // jumped, so start from the top and glide to the section instead.
    if (location.hash && targetFor(location.hash)) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          lenis.scrollTo(targetFor(location.hash), { offset: navOffset(), duration: 1.4 });
        });
      });
    }
  }

  var s = document.createElement('script');
  s.src = LENIS_SRC;
  s.async = true;
  s.onload = start;
  document.head.appendChild(s);
})();
