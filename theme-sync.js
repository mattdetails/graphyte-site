/*
 * Graphyte theme sync
 * Relume code embeds run in sandboxed iframes, so they can't see the site's CSS custom properties.
 * This script (in the site's head) reads every custom property the site defines on :root, plus its
 * Google Fonts links, and posts them into each embed. Embeds ask for them on load and apply them to
 * their own :root, so a custom component inherits the design system and follows any changes to it.
 *
 * Head code:
 *   <script src="https://cdn.jsdelivr.net/gh/mattdetails/graphyte-site@v1.0.5/theme-sync.js" defer></script>
 *
 * Embed side (see footer-embed.html):
 *   parent.postMessage({ type: 'graphyte:theme-request' }, '*');
 *   addEventListener('message', e => { if (e.data && e.data.type === 'graphyte:theme') { ...apply e.data.tokens... } });
 */
(function () {
  var timer;

  // Every custom property declared on :root / html / body across the site's stylesheets, with its
  // computed value for the current viewport (so breakpoint overrides come through).
  function tokens() {
    var names = {};
    function scan(rules) {
      for (var i = 0; i < rules.length; i++) {
        var r = rules[i];
        if (r.style && /(^|,)\s*(:root|html|body)\b/.test(r.selectorText || '')) {
          for (var j = 0; j < r.style.length; j++) if (r.style[j].indexOf('--') === 0) names[r.style[j]] = 1;
        }
        if (r.cssRules) scan(r.cssRules);
      }
    }
    for (var s = 0; s < document.styleSheets.length; s++) {
      try { scan(document.styleSheets[s].cssRules); } catch (e) { /* cross-origin sheet, skip */ }
    }
    var cs = getComputedStyle(document.documentElement), out = {};
    Object.keys(names).forEach(function (n) { var v = cs.getPropertyValue(n).trim(); if (v) out[n] = v; });
    return out;
  }

  function fonts() {
    var links = document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]'), out = [];
    for (var i = 0; i < links.length; i++) out.push(links[i].href);
    return out;
  }

  function send(win) {
    try { win.postMessage({ type: 'graphyte:theme', tokens: tokens(), fonts: fonts() }, '*'); } catch (e) {}
  }

  function sendAll() {
    var frames = document.querySelectorAll('iframe');
    for (var i = 0; i < frames.length; i++) if (frames[i].contentWindow) send(frames[i].contentWindow);
  }

  function schedule() { clearTimeout(timer); timer = setTimeout(sendAll, 120); }

  // Embeds ask when they are ready; this is the reliable path.
  addEventListener('message', function (e) {
    if (e.data && e.data.type === 'graphyte:theme-request' && e.source) send(e.source);
  });
  // Also push on viewport changes (breakpoint tokens) and when embed frames get inserted.
  addEventListener('resize', schedule);
  if (window.MutationObserver) new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'complete') sendAll(); else addEventListener('load', sendAll);
})();
