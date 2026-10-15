"""Texture stage (owner: "more texture, like the backgrounds"). Three cheap passes that give small sprites the
painted, shaded look of the rooms without new art:

- `grade` (before quantize): dark cloth leans violet in its shadows and gets local contrast, so folds and seams
  survive palette mapping instead of collapsing into one flat grey. Hair and skin (bright pixels) are untouched.
- light ordered dither (before quantize, `dither_strength` in quantize) keeps the painted source's gradients.
- `shade` (after outline): light from the upper left. The pixel just inside the outline is lifted on the lit
  side and deepened on the far side, which reads as a rim light and gives the body volume.
"""
from __future__ import annotations

import numpy as np
from PIL import Image, ImageFilter

from .palette import Palette

SHADOW_TINT = np.array([70.0, 40.0, 95.0])   # deep violet, the rooms' shadow colour
DARK_BELOW = 0.42                            # luminance under which a pixel counts as cloth/shadow
CONTRAST_BLUR = 1.2
CONTRAST_GAIN = 0.9
RIM_GAIN, RIM_ADD = 1.3, 10.0
CORE_SHADOW = 0.65


def grade(img: np.ndarray, amount: float) -> np.ndarray:
    if amount <= 0:
        return img
    out = img.copy()
    rgb = out[..., :3].astype(np.float64)
    lum = rgb.mean(-1, keepdims=True) / 255.0
    w = np.clip(1 - lum * 2.2, 0, 1) * amount
    rgb = rgb * (1 - w) + SHADOW_TINT * lum * 1.6 * w
    blurred = np.array(Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(CONTRAST_BLUR)))
    dark = (lum < DARK_BELOW).astype(np.float64)
    rgb = np.clip(rgb + (rgb - blurred.astype(np.float64)) * CONTRAST_GAIN * dark, 0, 255)
    out[..., :3] = np.round(rgb).astype(np.uint8)
    out[out[..., 3] == 0, :3] = 0
    return out


def _shifted(mask: np.ndarray, dy: int, dx: int) -> np.ndarray:
    """mask value at (y + dy, x + dx), False outside the image."""
    h, w = mask.shape
    s = np.zeros_like(mask)
    s[max(-dy, 0) : h - max(dy, 0), max(-dx, 0) : w - max(dx, 0)] = mask[max(dy, 0) : h + min(dy, 0), max(dx, 0) : w + min(dx, 0)]
    return s


def shade(img: np.ndarray, pal: Palette) -> np.ndarray:
    a = img[..., 3] > 0
    inner = a & _shifted(a, -1, 0) & _shifted(a, 0, -1) & _shifted(a, 1, 0) & _shifted(a, 0, 1)
    lit = inner & ((_shifted(a, -1, 0) & ~_shifted(a, -2, 0)) | (_shifted(a, 0, -1) & ~_shifted(a, 0, -2)))
    core = inner & ((_shifted(a, 1, 0) & ~_shifted(a, 2, 0)) | (_shifted(a, 0, 1) & ~_shifted(a, 0, 2))) & ~lit
    out = img.copy()
    rgb = out[..., :3].astype(np.float64)
    rgb[lit] = np.clip(rgb[lit] * RIM_GAIN + RIM_ADD, 0, 255)
    rgb[core] = rgb[core] * CORE_SHADOW
    m = lit | core
    if m.any():
        out[m, :3] = pal.colours[pal.nearest_index(np.round(rgb[m]).astype(np.uint8))]
    return out
