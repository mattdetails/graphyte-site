/*
 * Graphyte hero badge
 * Swaps the home hero's eyebrow (Relume's Announcement Banner) for the "Badge modern / Dot / Success"
 * badge from the Figma design system: a white pill with a green dot and the banner's message.
 *
 * The Relume banner stays the source of truth. Its message text (and link, if it has one) is read
 * from it, so copy is still edited in Relume. custom.css hides the banner's row before first paint
 * and styles the badge (.gr-badge).
 *
 * Relume markup it anchors on (home hero):
 *   <div class="stack"> <div class="row"> <div class="r-d"> <a class="announcement-banner">
 *     <span class="tag">…Available</span> <div data-bind='{"text":"textContent"}'>Message</div> …
 *   </a></div></div> <h1>…</h1> </div>
 *
 * Head code:
 *   <script src="https://cdn.jsdelivr.net/gh/mattdetails/graphyte-site@v1.0.8/hero-badge.js" defer></script>
 */
(function () {
  function build() {
    var h1 = document.querySelector('h1');
    var section = h1 && (h1.closest('section') || h1.parentElement);
    var banner = section && section.querySelector('.announcement-banner');
    if (!banner || section.querySelector('.gr-badge')) return;

    // The message is the banner's bound text, not the "Available" tag or the trailing icon.
    var msg = banner.querySelector(':scope > [data-bind]') || banner.querySelector('[data-bind]');
    var label = (msg ? msg.textContent : banner.textContent).trim();
    if (!label) return;

    // Replace the whole row the banner sits in, so the badge lands directly above the heading.
    var root = banner;
    while (root.parentElement && root.parentElement !== section && !root.parentElement.contains(h1)) root = root.parentElement;

    var href = banner.getAttribute('href');
    var badge = document.createElement(href ? 'a' : 'span');
    badge.className = 'gr-badge';
    if (href) badge.setAttribute('href', href);

    var dot = document.createElement('span');
    dot.className = 'gr-badge__dot';
    dot.setAttribute('aria-hidden', 'true');

    var text = document.createElement('span');
    text.className = 'gr-badge__text';
    text.textContent = label;

    badge.appendChild(dot);
    badge.appendChild(text);
    root.setAttribute('data-gr-replaced', '');
    root.parentElement.insertBefore(badge, root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
