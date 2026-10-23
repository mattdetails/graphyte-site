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
