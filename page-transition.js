/*
 * Graphyte page transition
 * Leaving a page: a field of brand hexes ripples in from the click point until the screen is covered,
 * then the browser navigates. Arriving: the new page starts covered and the hexes ripple back out.
 *
 * Three pieces, all needed:
 * 1. custom.css, "Page transition" block (Head start): paints the cover before first paint.
 * 2. One inline line in the head code (Head end), before this script. It adds html.gt-in when we
 *    arrived through a transition, so only those page loads start covered:
 *      <script>try{var t=+sessionStorage.getItem('gt-at');if(t&&Date.now()-t<4000&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('gt-in')}catch(e){}</script>
 * 3. This file (Head end):
 *      <script src="https://cdn.jsdelivr.net/gh/mattdetails/graphyte-site@v1.0.9/page-transition.js" defer></script>
 *
 * Skipped for: "reduce motion", new-tab and modifier clicks, target="_blank", downloads, other sites,
 * mailto:/tel:, links to files, links that only jump within the page (smooth-scroll.js has those),
 * and any link inside [data-no-transition].
 * Colours: set --gt-cover (the covered screen) and --gt-edge (the leading edge of the wave) on :root.
 * Embed links (the footer) come through theme-sync.js, which calls window.graphyteTransition(href).
 */
(function () {
  if (window.graphyteTransition) return;
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var STAGGER = 260;    // ms from the first hex to the last
  var GROW = 180;       // ms each hex takes to grow or shrink. Total each way: STAGGER + GROW = 440ms.
  var SHADES = 8;       // colour steps from edge to cover; one canvas fill per step
  var KEY = 'gt-at', KEY_X = 'gt-x', KEY_Y = 'gt-y';
  var FILE = /\.(pdf|zip|png|jpe?g|gif|webp|avif|svg|mp4|mov|webm|mp3|csv|docx?|xlsx?|pptx?)$/i;

  function store(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function clearStore() { store(KEY, null); store(KEY_X, null); store(KEY_Y, null); }

  function colour(name, fallback) {
    var v = getComputedStyle(root).getPropertyValue(name).trim();
    return v || fallback;
  }
  function rgb(c) {
    // Resolve any CSS colour to [r, g, b] through a 1px canvas.
    var x = document.createElement('canvas').getContext('2d');
    x.fillStyle = '#000'; x.fillStyle = c; x.fillRect(0, 0, 1, 1);
    var d = x.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }

  // ---------- the hex field ----------
  var canvas, ctx, cells, W, H, cover, edge, shades;

  function setup() {
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;pointer-events:none;display:block';
      ctx = canvas.getContext('2d');
    }
    if (!canvas.isConnected) (document.body || root).appendChild(canvas);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cover = rgb(colour('--gt-cover', colour('--scheme3-background', '#080707')));
    edge = rgb(colour('--gt-edge', colour('--color-color1-400', '#FF5521')));
    shades = [];
    for (var s = 0; s < SHADES; s++) {
      var k = s / (SHADES - 1);
      shades.push('rgb(' + [0, 1, 2].map(function (i) { return Math.round(edge[i] + (cover[i] - edge[i]) * k); }).join(',') + ')');
    }

    // Pointy-top hexes in offset rows, the same lattice as the hero and footer.
    // Cell width scales with the screen so a phone and a wide monitor get a similar count across.
    var cell = Math.max(34, Math.min(64, W / 26));
    var R = cell / Math.sqrt(3);          // circumradius that tiles exactly
    var rowH = R * 1.5;
    cells = [];
    for (var j = -1; j * rowH < H + R; j++) {
      var off = (j & 1) ? cell / 2 : 0;
      for (var i = -1; i * cell < W + cell; i++) {
        var cx = i * cell + off, cy = j * rowH;
        // A little fixed jitter so the wave front isn't a perfect circle.
        var n = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
        cells.push({ x: cx, y: cy, j: (n - Math.floor(n)) * 0.08 });
      }
    }
    setup.R = R * 1.06;                   // slight overlap at full size, so no hairline seams show
  }

  function hex(x, y, r) {
    for (var a = 0; a < 6; a++) {
      var t = Math.PI / 3 * a - Math.PI / 6;
      var px = x + r * Math.cos(t), py = y + r * Math.sin(t);
      if (a) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  // Draw one frame. dir 1 = covering (grow), -1 = uncovering (shrink).
  function frame(elapsed, ox, oy, maxD, dir) {
    ctx.clearRect(0, 0, W, H);
    var paths = [], done = true;
    for (var s = 0; s < SHADES; s++) paths.push(null);
    for (var c = 0; c < cells.length; c++) {
      var h = cells[c];
      var delay = (Math.hypot(h.x - ox, h.y - oy) / maxD + h.j) / 1.08 * STAGGER;
      var t = Math.max(0, Math.min(1, (elapsed - delay) / GROW));
      if (t < 1) done = false;
      var p = dir > 0 ? ease(t) : 1 - ease(t);   // p = how "full" this hex is
      if (p <= 0.01) continue;
      var s2 = Math.min(SHADES - 1, Math.round(p * p * (SHADES - 1)));  // small hexes are edge colour
      if (!paths[s2]) { paths[s2] = true; }
      h.p = p; h.s = s2;
    }
    for (var k = 0; k < SHADES; k++) {
      if (!paths[k]) continue;
      ctx.beginPath();
      for (var m = 0; m < cells.length; m++) {
        var q = cells[m];
        if (q.s === k && q.p > 0.01) hex(q.x, q.y, setup.R * q.p);
      }
      ctx.fillStyle = shades[k];
      ctx.fill();
    }
    for (var z = 0; z < cells.length; z++) cells[z].p = 0;
    return done;
  }

  function full() {
    ctx.fillStyle = shades[SHADES - 1];
    ctx.fillRect(0, 0, W, H);
  }

  var gen = 0;   // bumped by teardown(), so an animation that's been cancelled stops and does nothing
  function run(dir, ox, oy, then) {
    var my = gen, start = 0, ended = false;
    var maxD = Math.max(Math.hypot(ox, oy), Math.hypot(W - ox, oy), Math.hypot(ox, H - oy), Math.hypot(W - ox, H - oy)) || 1;
    function end() {
      if (ended || my !== gen) return;
      ended = true;
      if (dir > 0) full(); else ctx.clearRect(0, 0, W, H);
      if (then) then();
    }
    function tick(now) {
      if (ended || my !== gen) return;
      if (!start) start = now;
      if (frame(now - start, ox, oy, maxD, dir)) end(); else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    // Browsers pause animation frames in background tabs; finish on time regardless.
    setTimeout(end, STAGGER + GROW + 250);
  }

  function teardown() {
    gen++;
    root.classList.remove('gt-in', 'gt-busy');
    if (canvas && canvas.isConnected) canvas.remove();
  }

  // ---------- leaving ----------
  var busy = false, safety;

  function leave(href, x, y) {
    if (busy) return true;
    busy = true;
    setup();
    canvas.style.pointerEvents = 'auto';     // swallow double clicks while covering
    root.classList.add('gt-busy');
    run(1, x, y, function () {
      store(KEY, String(Date.now()));
      store(KEY_X, String(x / W)); store(KEY_Y, String(y / H));
      location.assign(href);
      // If the navigation never happens (cancelled, download, server error page that didn't load),
      // don't leave the visitor staring at a covered screen.
      clearTimeout(safety);
      safety = setTimeout(function () { if (!document.hidden) uncover(x, y); }, 6000);
    });
    return true;
  }

  function uncover(x, y) {
    busy = false;
    clearStore();
    if (!canvas || !canvas.isConnected) setup();
    canvas.style.pointerEvents = 'none';
    run(-1, x, y, teardown);
  }

  function eligible(url, a) {
    if (!/^https?:$/.test(url.protocol) || url.origin !== location.origin) return false;
    if (a) {
      if (a.target && a.target !== '_self') return false;
      if (a.hasAttribute('download') || /\bexternal\b/.test(a.rel || '')) return false;
      if (a.closest('[data-no-transition]')) return false;
    }
    if (FILE.test(url.pathname)) return false;
    // Same page, only the hash differs: that's an in-page jump, not a page change.
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return false;
    return true;
  }

  if (!reduce) {
    // Capture phase on the window, so we see the click first: the navbar's links stop the click
    // before it reaches the document. In-page hash links are left to smooth-scroll.js (eligible()
    // says no to them), and a link inside [data-no-transition] is never touched.
    window.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var url;
      try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
      if (!eligible(url, a)) return;
      e.preventDefault();
      var x = e.clientX, y = e.clientY;
      if (!x && !y) {   // keyboard activation: start from the link itself
        var b = a.getBoundingClientRect(); x = b.left + b.width / 2; y = b.top + b.height / 2;
      }
      leave(url.href, x, y);
    }, true);

    // Fetch the next page while the pointer is on its way, so it's usually ready by the time
    // the screen is covered.
    var fetched = {};
    function prefetch(e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || (navigator.connection && navigator.connection.saveData)) return;
      var url;
      try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
      if (!eligible(url, a) || url.pathname === location.pathname) return;
      url.hash = '';
      if (fetched[url.href]) return;
      fetched[url.href] = 1;
      var l = document.createElement('link'); l.rel = 'prefetch'; l.href = url.href; document.head.appendChild(l);
    }
    document.addEventListener('pointerover', prefetch, { passive: true });
    document.addEventListener('focusin', prefetch);
  }

  // For theme-sync.js (links inside embeds). Returns true when it took over the navigation.
  window.graphyteTransition = function (href) {
    if (reduce) return false;
    var url;
    try { url = new URL(href, location.href); } catch (e) { return false; }
    if (!eligible(url, null)) return false;
    return leave(url.href, window.innerWidth / 2, window.innerHeight);
  };

  // ---------- arriving ----------
  function arrive() {
    if (!root.classList.contains('gt-in')) { clearStore(); return; }
    var at = +read(KEY) || 0;
    var x = parseFloat(read(KEY_X)), y = parseFloat(read(KEY_Y));
    clearStore();
    // The CSS cover gives up on its own after 2.5s (in case this script never loads). If we're
    // already past that, the page is showing; don't flash the cover back over it.
    if (Date.now() - at > 2300) { teardown(); return; }
    setup();
    full();                                  // canvas takes over from the CSS cover, same colour
    root.classList.remove('gt-in');
    var ox = (isFinite(x) ? x : 0.5) * W, oy = (isFinite(y) ? y : 0.5) * H;
    // Give web fonts a moment so text doesn't reflow just as it's revealed, but never wait long.
    var go = function () { if (go.ran) return; go.ran = 1; run(-1, ox, oy, teardown); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    setTimeout(go, 150);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrive);
  else arrive();

  // Back/forward cache: a page restored from cache comes back exactly as it was left, i.e. covered.
  addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    busy = false; clearTimeout(safety); clearStore(); teardown();
  });
  addEventListener('resize', function () { if (busy && canvas) { setup(); full(); } });
})();
