"""HUD portrait from the title painting: crop the face, shrink to 40x40 in full colour, round mask.
Usage: python3 -E -s -m tools.portrait <title-raw.png>"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

SIZE = 40


def main(src):
    im = Image.open(src).convert("RGB")
    W, H = im.size
    cx, cy, s = int(W * 0.772), int(H * 0.255), int(W * 0.105)    # face position in the title painting
    face = im.crop((cx - s // 2, cy - s // 2, cx + s // 2, cy + s // 2)).resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    rgba = np.dstack([np.asarray(face), np.full((SIZE, SIZE), 255, np.uint8)])
    # Full colour like the title painting (UI art; the palette lock is for sprites and tiles).
    q = rgba.copy()
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    q[(xx - SIZE / 2 + 0.5) ** 2 + (yy - SIZE / 2 + 0.5) ** 2 > (SIZE / 2) ** 2, 3] = 0
    out = Path("public/assets/ui/portrait.png")
    Image.fromarray(q, "RGBA").save(out)
    print("wrote", out)


if __name__ == "__main__":
    main(sys.argv[1])
