"""Painted key art (title card, cutscene stills) -> a palette-locked image at the game's internal resolution.
Crops to the target aspect (centre, or anchored by --focus-x), box-downscales, then quantizes to the palette with
a light ordered dither so large paintings keep their gradients without leaving the palette."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from . import quantize
from .palette import Palette


def crop_to_aspect(img: Image.Image, w: int, h: int, focus_x: float = 0.5) -> Image.Image:
    sw, sh = img.size
    target = w / h
    if sw / sh > target:
        cw = round(sh * target)
        left = round(min(max(focus_x * sw - cw / 2, 0), sw - cw))
        return img.crop((left, 0, left + cw, sh))
    ch = round(sw / target)
    top = (sh - ch) // 2
    return img.crop((0, top, sw, top + ch))


def convert(src: Path, out: Path, pal: Palette, size: tuple[int, int], focus_x: float = 0.5,
            dither_strength: float = 12.0) -> Path:
    img = crop_to_aspect(Image.open(src).convert("RGB"), *size, focus_x=focus_x)
    small = img.resize(size, Image.Resampling.BOX)
    rgba = np.dstack([np.asarray(small), np.full(size[::-1], 255, np.uint8)])
    q = quantize.quantize(rgba, pal, dither=dither_strength > 0, dither_strength=dither_strength)
    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(q[..., :3], "RGB").save(out, optimize=True)
    return out
