"""Social cards from the title art and the in-game screenshots. Usage: python3 -I cards.py <title.png> <shotsdir> <outdir>"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

TITLE_ART, SHOTS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
F = "/usr/share/fonts/truetype/freefont/"
import os
BLACKLETTER = os.environ.get("BLACKLETTER", "/home/user/Trinity-Blood-Fan-Game/public/assets/fonts/UnifrakturCook-Bold.ttf")
def font(n, s): return ImageFont.truetype(F + n, s)
BG = (12, 10, 16)
CREAM, ROSE, DIM = (242, 230, 218), (222, 164, 172), (150, 140, 160)
NOTICE = "Unofficial fan-made project. Not affiliated with or endorsed by the rights holders of Trinity Blood."

def shot(name): return Image.open(f"{SHOTS}/{name}.png").convert("RGB")

def cover(im, w, h, cx=0.5, cy=0.5):
    """Scale to cover w x h (nearest for pixel art), then crop around (cx, cy)."""
    s = max(w / im.width, h / im.height)
    r = im.resize((round(im.width * s), round(im.height * s)), Image.NEAREST)
    x = int((r.width - w) * cx); y = int((r.height - h) * cy)
    return r.crop((x, y, x + w, y + h))

def shade(im, top=0.0, bottom=0.75, start=0.45):
    """Darken toward the bottom so text reads."""
    g = Image.new("L", (1, 256))
    for i in range(256):
        t = i / 255
        a = top + (bottom - top) * max(0, (t - start) / (1 - start)) if t > start else top
        g.putpixel((0, i), int(255 * a))
    mask = g.resize(im.size)
    return Image.composite(Image.new("RGB", im.size, BG), im, mask)

def text(d, xy, s, f, fill, anchor="ma", stroke=4):
    d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(8, 6, 12))

def gothic_title(im, xy, s, f):
    """The name in heavy textura: a dark outline, a blood-red drop shadow, then bone fading to crimson."""
    d = ImageDraw.Draw(im)
    x, y = xy
    d.text((x, y + f.size * 0.05), s, font=f, fill=(46, 8, 17), anchor="ma", stroke_width=6, stroke_fill=(46, 8, 17))
    d.text((x, y), s, font=f, fill=(8, 6, 12), anchor="ma", stroke_width=5, stroke_fill=(8, 6, 12))
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).text((x, y), s, font=f, fill=255, anchor="ma")
    l, t, r, b = mask.getbbox()
    grad = Image.new("RGB", im.size)
    gd = ImageDraw.Draw(grad)
    stops = [(0, (239, 234, 242)), (0.55, (221, 215, 230)), (0.8, (212, 40, 62)), (1, (106, 21, 36))]
    for yy in range(t, b + 1):
        k = (yy - t) / max(1, b - t)
        for (a0, c0), (a1, c1) in zip(stops, stops[1:]):
            if a0 <= k <= a1:
                u = (k - a0) / (a1 - a0)
                gd.line([(l, yy), (r, yy)], fill=tuple(int(c0[i] + (c1[i] - c0[i]) * u) for i in range(3)))
                break
    im.paste(grad, (0, 0), mask)

# 1. Key art: 1600x900 (X / YouTube) and 1080x1350 (Instagram)
art = Image.open(TITLE_ART).convert("RGB")
for w, h, name in ((1600, 900, "keyart_16x9"), (1080, 1350, "keyart_4x5")):
    im = shade(cover(art, w, h, 0.5, 0.35), 0.0, 0.85, 0.42)
    d = ImageDraw.Draw(im)
    big = ImageFont.truetype(BLACKLETTER, int(w * 0.105)); sub = font("FreeSerifItalic.ttf", int(w * 0.03)); small = font("FreeSerifItalic.ttf", int(w * 0.0165))
    y = h * (0.58 if h < w else 0.6)
    gothic_title(im, (w / 2, y - big.size * 0.15), "Trinity Blood", big)
    d = ImageDraw.Draw(im)
    text(d, (w / 2, y + big.size * 1.15), "a fan-made gothic Metroidvania  ·  playable in your browser", sub, ROSE, stroke=3)
    text(d, (w / 2, h - small.size * 2.4), NOTICE, small, DIM, stroke=2)
    im.save(f"{OUT}/{name}.png", optimize=True)

# 2. Collage 2x2, 1080x1080
tiles = [("cathedral", 0.5, 0.25, "The cathedral by night"), ("crusnik", 0.5, 0.55, "Become the Crusnik"),
         ("nave", 0.45, 0.5, "Candlelit nave"), ("wings", 0.5, 0.5, "Eighty percent")]
C = 1080; g = 8; cell = (C - g * 3) // 2
col = Image.new("RGB", (C, C), BG); dc = ImageDraw.Draw(col)
cap = font("FreeSerifItalic.ttf", 30)
for i, (n, cx, cy, label) in enumerate(tiles):
    t = shade(cover(shot(n), cell, cell, cx, cy), 0, 0.8, 0.6)
    x = g + (i % 2) * (cell + g); y = g + (i // 2) * (cell + g)
    col.paste(t, (x, y))
    text(dc, (x + cell / 2, y + cell - 52), label, cap, CREAM, stroke=3)
col.save(f"{OUT}/collage_1x1.png", optimize=True)

# 3. Instagram carousel, 1080x1350 each
slides = [
    ("cathedral", 0.5, 0.3, "Istvan, by night", "Twenty-two rooms of a gothic city: rooftops,\ncatacombs, a cathedral and a vampire count's fortress."),
    ("crusnik", 0.5, 0.55, "The priest is not what he seems", "Fill the blood meter, and become the Crusnik:\na scythe, a chain lash, a far higher leap."),
    ("marchesa_panel", 0.5, 0.3, "Six bosses", "Duels with patterns to learn, parry and punish,\nwith voiced cutscenes."),
    ("nave", 0.42, 0.5, "Altars to rest and travel", "Pray to save, refill your holy water,\nand travel between the altars you have found."),
    ("wings", 0.5, 0.5, "Secrets", "Hidden relics, a lore book, a bestiary\n— and a code we are not telling you."),
]
for i, (n, cx, cy, title, body) in enumerate(slides, 1):
    w, h = 1080, 1350
    if n.endswith("_panel"):
        # A wide cutscene panel: shown whole, large, on the dark page (no over-zoom).
        src = shot(n); sc = (w - 60) / src.width
        pan = src.resize((int(src.width * sc), int(src.height * sc)), Image.NEAREST)
        im = Image.new("RGB", (w, h), BG)
        im.paste(pan, (30, 300))
        ImageDraw.Draw(im).rectangle([28, 298, 30 + pan.width + 1, 300 + pan.height + 1], outline=(200, 168, 96), width=3)
    else:
        im = shade(cover(shot(n), w, h, cx, cy), 0.0, 0.9, 0.5)
    d = ImageDraw.Draw(im)
    text(d, (w / 2, h - 330), title, font("FreeSerifBold.ttf", 66), CREAM)
    d.multiline_text((w / 2, h - 230), body, font=font("FreeSerif.ttf", 34), fill=(226, 216, 228), anchor="ma", align="center",
                     spacing=10, stroke_width=3, stroke_fill=(8, 6, 12))
    text(d, (w / 2, h - 60), NOTICE, font("FreeSerifItalic.ttf", 19), DIM, stroke=2)
    text(d, (w - 40, 40), f"{i}/{len(slides)}", font("FreeSerif.ttf", 28), DIM, "ra", 2)
    im.save(f"{OUT}/carousel_{i}.png", optimize=True)
print("done")
