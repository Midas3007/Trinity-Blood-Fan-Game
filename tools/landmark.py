"""Large landmark backdrops (e.g. the cathedral front) from a painting on magenta: key the background, shrink to a
width in game pixels, lock to Requiem 48 with light dithering, keep binary transparency.
Usage: python3 -E -s -m tools.landmark <src.png> <out.png> <width_px>"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from tools.spritegen import alpha, ingest, quantize
from tools.spritegen.palette import Palette


def main(src, out, width):
    keyed = alpha.key(ingest.load(src))
    h, w = keyed.shape[:2]
    height = round(h * width / w)
    im = Image.fromarray(keyed, "RGBA").resize((width, height), Image.Resampling.BOX)
    a = np.asarray(im).copy()
    a[..., 3] = np.where(a[..., 3] >= 128, 255, 0)
    pal = Palette.from_hex(Path("art/palette/requiem48.hex"))
    q = quantize.quantize(a, pal, dither=True, dither_strength=8)
    Image.fromarray(q, "RGBA").save(out)
    print("wrote", out, q.shape[1], "x", q.shape[0])


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]))
