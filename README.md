# Graphyte site scripts

Small scripts for the Graphyte website (Relume Publish). Hosted on GitHub and served through jsDelivr so they can be added to the site with one script tag.

## smooth-scroll.js

Smooth scrolling with [Lenis](https://github.com/darkroomengineering/lenis). Respects "reduce motion", leaves phones on native scrolling, and makes in-page anchor links glide.

Add to the site's custom head code:

```html
<script src="https://cdn.jsdelivr.net/gh/mattdetails/graphyte-site@v1.0.3/smooth-scroll.js" defer></script>
```

Pin to a tag, not `main`, so the live site doesn't change when the repo does. After a change: bump the tag, push it, update the tag in the script tag.

Tuning: `duration` in the file controls the feel. 1.1 is gentle. Try 0.8 for snappier, 1.4 for floatier.

Known interaction: the home hero has its own scroll animation ("sticky content"). If the two fight, turn the hero animation off in Relume.

## Head code

`head-code.html` is the script block for Relume's Site settings → Custom code → Head, and `custom.css` is the
site's custom CSS. Edit them here, then paste each whole file into its field in Relume. Code embed
sections run in a sandboxed iframe, so anything that has to touch the page (CSS, page-level JS) goes in the
head, not an embed.

## Footer embed and theme sync

The footer is a Relume code embed: paste `footer-embed.html` whole into an embed section at the bottom of
the page. Embeds run in a sandboxed iframe, so `theme-sync.js` (loaded from the head) posts the site's CSS
custom properties and font links into every embed, and the footer applies them to its own `:root`. Change
the design system in Relume and the footer follows. The hex bloom is drawn inside the embed from the same
tokens.

## Hero badge

`hero-badge.js` (head) and the "Hero badge" block in `custom.css` swap the home hero's eyebrow (Relume's
Announcement Banner) for the design system's Badge (modern, dot, success). The banner stays in Relume as the
anchor: the badge takes its message text and link, so edit those in Relume. The CSS hides the banner before
first paint, so if the script fails to load the hero shows no eyebrow rather than the old banner.

## Logo tooltips

`logo-tooltips.js` (head) names each logo in the home page's "Tools I build with" row, as a hover tooltip
(styled in `custom.css` to match the design system's Tooltip) and as alt text. Relume's logo list has no
name field, so the names are in the script, keyed by each logo's asset id. Reordering is safe; a new or
replaced logo needs its id and name added there.

## Page transition

`page-transition.js` (head), the "Page transition" block in `custom.css`, and one inline line at the top of
`head-code.html`. Clicking a link to another page on the site ripples brand hexes in from the click point
until the screen is covered, then navigates; the new page starts covered and the hexes ripple back out.
About 440ms each way (`STAGGER` + `GROW` in the file).

- The inline line has to stay inline and first in the head code. It's what makes the new page start covered
  before its first paint; without it the page flashes before the hexes arrive.
- Colours: `--gt-cover` (the covered screen) and `--gt-edge` (the wave's leading edge) in `custom.css`.
- Skipped for "reduce motion", new-tab and modifier clicks, `target="_blank"`, downloads, files, other sites,
  `mailto:`/`tel:`, and links that only jump within the page. Put `data-no-transition` on a link (or any
  parent) to opt it out.
- Footer links come through `theme-sync.js`, which hands them to the transition.
- If the script fails to load, the cover lifts by itself after 2.5s. A page restored with the back button
  is uncovered straight away.
