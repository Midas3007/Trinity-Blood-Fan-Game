"""Stage 5: map every opaque pixel to the nearest palette colour (CIEDE2000), optional Bayer 4x4 dither."""
from __future__ import annotations

import numpy as np

from .palette import Palette

BAYER4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float64) / 16.0 - 0.5


def quantize(img: np.ndarray, pal: Palette, dither: bool = False, dither_strength: float = 24.0) -> np.ndarray:
    out = img.copy()
    mask = out[..., 3] > 0
    if not mask.any():
        return out
    rgb = out[..., :3].astype(np.float64)
    if dither:
        h, w = mask.shape
        tile = np.tile(BAYER4, (h // 4 + 1, w // 4 + 1))[:h, :w]
        rgb = np.clip(rgb + tile[..., None] * dither_strength, 0, 255)
    src = np.round(rgb[mask]).astype(np.uint8)
    idx = pal.nearest_index(src)
    out[mask, :3] = pal.colours[idx]
    return out
