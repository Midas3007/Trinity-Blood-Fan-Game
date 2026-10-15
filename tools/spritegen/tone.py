"""Optional pre-quantize tone curve. AI sources of dark clothing are often near-black, which collapses into the
outline colour at sprite size. A gamma < 1 lifts shadows so folds survive quantization (per-entity setting)."""
from __future__ import annotations

import numpy as np


def gamma(img: np.ndarray, g: float = 1.0) -> np.ndarray:
    """g < 1 lifts shadows (near-black sources); g > 1 darkens mid-tones while pure whites stay white
    (a dark coat with bright piping)."""
    if g == 1.0:
        return img
    out = img.copy()
    rgb = out[..., :3].astype(np.float64) / 255.0
    out[..., :3] = np.round(255 * rgb ** g).astype(np.uint8)
    out[out[..., 3] == 0, :3] = 0
    return out
