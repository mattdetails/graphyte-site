#!/usr/bin/env python3
"""
Graphyte hex-fade background generator.

Lays out a perfect hexagonal lattice (graphite under a microscope) and fades
it out by shrinking each cell with distance from a bloom point or edge, the
way a halftone fades. Pure SVG, no dependencies.

Usage:
  python3 hexfade.py --mode corner --theme light --w 896 --h 1200 -o light-corner.svg
  python3 hexfade.py --preset all          # writes the standard set

Modes:
  corner   bloom from the bottom-right corner (default)
  edge     band along the bottom edge, fading upward
  wave     like corner, but the fade boundary curves like a contour line

Themes (Graphyte 2026 palette):
  dark     ground neutral-950 #120502, cells orange-500 #FF5521
  light    ground sand-100 #F6EFE4, cells neutral-900 #1A1817, orange at the dense end
"""
import argparse
import math
import os

PALETTE = {
    "dark": {"ground": "#120502", "cell": "#FF5521", "accent": None},
    "light": {"ground": "#F7F5F3", "cell": "#1A1817", "accent": "#FF5521"},  # matches the site's scheme-1 ground
}


def ease(t):
    # smoothstep: gentle at both ends so the fade reads as a gradient, not a step
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def hexagon(cx, cy, r):
    # pointy-top hexagon
    pts = []
    for i in range(6):
        a = math.radians(60 * i - 30)
        pts.append(f"{cx + r * math.cos(a):.2f},{cy + r * math.sin(a):.2f}")
    return " ".join(pts)


def generate(w, h, mode="corner", theme="light", cell=44.0, gap=0.14,
             fade_start=0.12, fade_end=0.62, accent_until=0.12, wave_amp=0.12, wave_len=0.9,
             origin="br", ground=None, colour=None):
    """
    cell         centre-to-centre spacing in px
    gap          fraction of the cell left as ground between tiles at full size
    fade_start   distance (as a fraction of the diagonal) where cells begin shrinking
    fade_end     distance where cells have vanished
    accent_until on the light theme, cells closer than this get the accent colour
    origin       which corner the bloom grows from: br, tr, bl, tl
    ground/colour override the theme's ground and cell colours (hex strings)
    """
    pal = dict(PALETTE[theme])
    if ground: pal["ground"] = ground
    if colour: pal["cell"] = colour
    ox = w if origin[1] == "r" else 0
    oy = h if origin[0] == "b" else 0
    diag = math.hypot(w, h)
    row_h = cell * math.sqrt(3) / 2
    full_r = (cell / 2) * (1 - gap) / math.cos(math.radians(30))  # radius so flats nearly touch

    def distance(x, y):
        if mode == "edge":
            return (h - y) / h  # 0 at the bottom edge, 1 at the top
        d = math.hypot(ox - x, oy - y) / diag  # 0 at the bloom corner
        if mode == "wave":
            # bend the contour with a slow sine along the diagonal
            along = (x / w + (h - y) / h) / 2
            d += wave_amp * math.sin(along * math.tau * wave_len)
        return d

    polys = []
    rows = int(h / row_h) + 3
    cols = int(w / cell) + 3
    for j in range(-1, rows):
        cy = h - j * row_h  # start at the bottom so the dense edge lines up
        x_off = (cell / 2) if j % 2 else 0
        for i in range(-1, cols):
            cx = i * cell + x_off
            d = distance(cx, cy)
            t = (d - fade_start) / (fade_end - fade_start)
            scale = 1 - ease(t)
            if scale < 0.035:
                continue
            r = full_r * scale
            colour = pal["cell"]
            if pal["accent"] and d < accent_until:
                colour = pal["accent"]
            polys.append(f'<polygon points="{hexagon(cx, cy, r)}" fill="{colour}"/>')

    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">',
        f'<rect width="{w}" height="{h}" fill="{pal["ground"]}"/>',
        "<g>",
        *polys,
        "</g>",
        "</svg>",
    ]
    return "\n".join(svg)


PRESETS = {
    "light-corner-portrait": dict(w=896, h=1200, mode="corner", theme="light"),
    "dark-corner-portrait": dict(w=896, h=1200, mode="corner", theme="dark"),
    "dark-wave-portrait": dict(w=896, h=1200, mode="wave", theme="dark", fade_end=0.72),
    "dark-edge-wide": dict(w=1600, h=900, mode="edge", theme="dark", fade_start=0.05, fade_end=0.5),
    "light-edge-wide": dict(w=1600, h=900, mode="edge", theme="light", fade_start=0.05, fade_end=0.5, accent_until=0.08),
    "dark-corner-square": dict(w=1200, h=1200, mode="corner", theme="dark"),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preset", help="name from PRESETS, or 'all'")
    ap.add_argument("--mode", default="corner", choices=["corner", "edge", "wave"])
    ap.add_argument("--theme", default="light", choices=list(PALETTE))
    ap.add_argument("--w", type=int, default=896)
    ap.add_argument("--h", type=int, default=1200)
    ap.add_argument("--cell", type=float, default=44.0)
    ap.add_argument("--fade-start", type=float, default=0.12)
    ap.add_argument("--fade-end", type=float, default=0.62)
    ap.add_argument("--accent-until", type=float, default=0.12)
    ap.add_argument("--origin", default="br", choices=["br", "tr", "bl", "tl"])
    ap.add_argument("--gap", type=float, default=0.14)
    ap.add_argument("--ground")
    ap.add_argument("--colour")
    ap.add_argument("-o", "--out", default="hexfade.svg")
    ap.add_argument("--outdir", default="out")
    a = ap.parse_args()

    if a.preset:
        os.makedirs(a.outdir, exist_ok=True)
        names = list(PRESETS) if a.preset == "all" else [a.preset]
        for name in names:
            path = os.path.join(a.outdir, f"{name}.svg")
            with open(path, "w") as f:
                f.write(generate(**PRESETS[name]))
            print(path)
        return

    svg = generate(a.w, a.h, a.mode, a.theme, a.cell, gap=a.gap, fade_start=a.fade_start,
                   fade_end=a.fade_end, accent_until=a.accent_until, origin=a.origin,
                   ground=a.ground, colour=a.colour)
    with open(a.out, "w") as f:
        f.write(svg)
    print(a.out)


if __name__ == "__main__":
    main()
