"""Cut a kit sheet (buildings or interior panels on magenta) into named high-res crops in art/source/approved/kit/.
A ground line drawn across the whole sheet is removed first so the pieces separate.
Usage: python3 -E -s -m tools.level.approve_kit <sheet.png> name1,name2,..."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from tools.spritegen import alpha, ingest, split

OUT = Path(__file__).resolve().parents[2] / "art/source/approved/kit"


def main(src, names):
    img = alpha.key(ingest.load(src))
    solid = img[..., 3] > 0
    # rows that are opaque across most of the sheet are a shared ground line: drop them
    wide = solid.mean(axis=1) > 0.95
    img[wide, :, 3] = 0
    figs = split.figures_expected(img, len(names))
    OUT.mkdir(parents=True, exist_ok=True)
    for name, f in zip(names, figs):
        b = split.bbox(f)
        crop = f[b[0]:b[2], b[1]:b[3]]
        Image.fromarray(crop, "RGBA").save(OUT / f"{name}.png")
        print(name, crop.shape[1], "x", crop.shape[0])


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2].split(","))
