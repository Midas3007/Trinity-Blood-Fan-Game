"""Draws the original placeholder PWA icons (cross + crescent moon). Run: python3 -I scripts/make-icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
BG, MOON, CROSS = "#0b0a10", "#c9c2d6", "#8e1b2c"


def art(size: int) -> Image.Image:
    s = size / 64  # artwork is designed on a 64x64 grid, matching icon.svg
    img = Image.new("RGBA", (size, size), BG)
    d = ImageDraw.Draw(img)
    d.ellipse([(44 - 9) * s, (18 - 9) * s, (44 + 9) * s, (18 + 9) * s], fill=MOON)
    d.ellipse([(48 - 8) * s, (15 - 8) * s, (48 + 8) * s, (15 + 8) * s], fill=BG)
    d.rectangle([28 * s, 12 * s, 36 * s - 1, 54 * s - 1], fill=CROSS)
    d.rectangle([18 * s, 22 * s, 46 * s - 1, 30 * s - 1], fill=CROSS)
    return img


for name, size in [("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)]:
    art(size).save(OUT / name)

# Maskable: artwork shrunk into the central safe zone.
mask = Image.new("RGBA", (512, 512), BG)
mask.paste(art(360), (76, 76))
mask.save(OUT / "icon-512-maskable.png")
