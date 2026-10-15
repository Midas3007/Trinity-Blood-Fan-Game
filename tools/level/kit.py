"""Painted building kit: facades and interior panels (keyed, split crops in art/source/approved/kit/) baked to the exact
size each building needs and locked to Requiem 48. Output: public/assets/rooms/<key>.png."""
from pathlib import Path
import numpy as np
from PIL import Image
from tools.spritegen import quantize
from tools.spritegen.palette import Palette

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "art/source/approved/kit"
OUT = ROOT / "public/assets/rooms"
PAL = Palette.from_hex(ROOT / "art/palette/requiem48.hex")


def _bake(src_name, w, h, cover):
    src = Image.open(SRC / f"{src_name}.png").convert("RGBA")
    sw, sh = src.size
    if cover:  # crop to the target aspect (no distortion), centred
        target = w / h
        if sw / sh > target:
            cw = round(sh * target); src = src.crop(((sw - cw) // 2, 0, (sw - cw) // 2 + cw, sh))
        else:
            ch = round(sw / target); src = src.crop((0, sh - ch, sw, sh))
    im = src.resize((w, h), Image.Resampling.BOX)
    a = np.asarray(im).copy()
    a[..., 3] = np.where(a[..., 3] >= 128, 255, 0)
    return quantize.quantize(a, PAL, dither=True, dither_strength=6)


def _save(key, arr):
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr, "RGBA").save(OUT / f"{key}.png", optimize=True)


WALL_SHARE = 0.78  # of a painted front's height, the walls (the rest is roof)


def facade(key, src_names, x_px, bottom_px, w_px, wall_h_px, layers, x0, x1, top, gy):
    """Front of a house: painted to the wall height (plus its roof above). A wide building becomes several painted
    houses side by side, each kept in proportion. `src_names`: one name or a list to cycle through."""
    names = [src_names] if isinstance(src_names, str) else list(src_names)
    h_px = round(wall_h_px / WALL_SHARE)
    widths = []
    for n in names:
        sw, sh = Image.open(SRC / f"{n}.png").size
        widths.append(h_px * sw / sh)
    count = max(1, round(w_px / (sum(widths) / len(widths))))
    seg = [w_px // count + (1 if i < w_px % count else 0) for i in range(count)]
    canvas = np.zeros((h_px, w_px, 4), np.uint8)
    x = 0
    for i, sw_px in enumerate(seg):
        canvas[:, x:x + sw_px] = _bake(names[i % len(names)], sw_px, h_px, cover=False)
        x += sw_px
    _save(key, canvas)
    return {"key": key, "x": x_px, "y": bottom_px, "w": w_px, "h": h_px, "layer": "facade"}


def interior(key, src_names, x_px, bottom_px, w_px, h_px):
    """One storey's painted rooms: as many room paintings side by side as fit at their natural proportions."""
    names = [src_names] if isinstance(src_names, str) else list(src_names)
    sw, sh = Image.open(SRC / f"{names[0]}.png").size
    count = max(1, round(w_px / (h_px * sw / sh)))
    seg = [w_px // count + (1 if i < w_px % count else 0) for i in range(count)]
    canvas = np.zeros((h_px, w_px, 4), np.uint8)
    x = 0
    for i, sw_px in enumerate(seg):
        canvas[:, x:x + sw_px] = _bake(names[i % len(names)], sw_px, h_px, cover=True)
        x += sw_px
    _save(key, canvas)
    return {"key": key, "x": x_px, "y": bottom_px, "w": w_px, "h": h_px, "layer": "interior"}
