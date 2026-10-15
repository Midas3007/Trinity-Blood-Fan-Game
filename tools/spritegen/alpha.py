"""Stage 2: magenta chroma key -> binary alpha, despeckle, hole fill, anti-fringe erosion."""
from __future__ import annotations

import numpy as np

from . import morph

MAGENTA = np.array([255, 0, 255])


def key(img: np.ndarray, tolerance: float = 40.0, despeckle: int = 4, holes: int = 4, erode: int = 1, dilate: int = 0,
        open_px: int = 0) -> np.ndarray:
    """Returns RGBA with alpha strictly 0 or 255. The binary threshold happens here, before any downscale."""
    rgb = img[..., :3].astype(np.int32)
    dist = np.linalg.norm(rgb - MAGENTA, axis=-1)
    # Pink fringe from soft AI edges: strongly magenta-tinted pixels (R and B both well above G) count as background.
    tinted = (rgb[..., 0] - rgb[..., 1] > 90) & (rgb[..., 2] - rgb[..., 1] > 90) & (np.abs(rgb[..., 0] - rgb[..., 2]) < 70)
    opaque = (dist >= tolerance) & ~tinted & (img[..., 3] > 127)
    if open_px:
        # Morphological opening removes structures thinner than 2*open_px+1 (e.g. a drawn ground line).
        opaque = morph.dilate(morph.erode(opaque, open_px), open_px)
    if despeckle:
        opaque = morph.remove_small(opaque, despeckle)
    if holes:
        opaque = morph.fill_small_holes(opaque, holes)
    if erode:
        opaque = morph.erode(opaque, erode)
    if dilate:
        opaque = morph.dilate(opaque, dilate)
    out = img.copy()
    out[..., 3] = np.where(opaque, 255, 0).astype(np.uint8)
    out[~opaque, :3] = 0
    return out
