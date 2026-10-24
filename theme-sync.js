/*
 * Graphyte theme sync (and embed navigation bridge)
 * Relume code embeds run in sandboxed iframes, so they can't see the site's CSS custom properties,
 * and their links can't navigate the page (see navigate() below).
 * This script (in the site's head) reads every custom property the site defines on :root, plus its
 * Google Fonts links, and posts them into each embed. Embeds ask for them on load and apply them to
 * their own :root, so a custom component inherits the design system and follows any changes to it.
 *
 * Head code:
 *   <script src="https://cdn.jsdelivr.net/gh/mattdetails/graphyte-site@v1.0.6/theme-sync.js" defer></script>
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

  // Navigation on behalf of embeds. Relume's embed sandbox has no allow-top-navigation and sets
  // <base target="_blank">, so a link inside an embed can only open a new tab. Embeds post the link
  // here instead and the page navigates itself. Same-origin only; same-page anchors scroll smoothly.
  function navigate(href, source) {
    var url;
    try { url = new URL(href, location.href); } catch (e) { return; }
    if (url.origin !== location.origin) return;
    try { source.postMessage({ type: 'graphyte:navigate-ack' }, '*'); } catch (e) {}
    if (url.pathname === location.pathname && url.hash) {
      var target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (target) {
        var nav = document.querySelector('[id^="sc-navbar"], nav'), off = -((nav ? nav.getBoundingClientRect().height : 64) + 16);
        if (window.lenis) window.lenis.scrollTo(target, { offset: off });
        else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + off, behavior: 'smooth' });
        if (history.pushState) history.pushState(null, '', url.hash);
        return;
      }
    }
    location.assign(url.href);
  }

  addEventListener('message', function (e) {
    var d = e.data; if (!d || !e.source) return;
    // Embeds ask for the theme when they are ready; this is the reliable path.
    if (d.type === 'graphyte:theme-request') send(e.source);
    if (d.type === 'graphyte:navigate' && typeof d.href === 'string') navigate(d.href, e.source);
  });
  // Also push on viewport changes (breakpoint tokens) and when embed frames get inserted.
  addEventListener('resize', schedule);
  if (window.MutationObserver) new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'complete') sendAll(); else addEventListener('load', sendAll);
})();
