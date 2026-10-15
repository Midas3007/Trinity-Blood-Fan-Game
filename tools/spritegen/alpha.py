"""Stage 2: magenta chroma key -> binary alpha, despeckle, hole fill, anti-fringe erosion."""
from __future__ import annotations

import numpy as np

from . import morph

MAGENTA = np.array([255, 0, 255])


def border_colour(img: np.ndarray, band: int = 6) -> np.ndarray:
    """Median colour of the image border: the actual background, which models often render off-magenta."""
    rgb = img[..., :3].astype(np.int32)
    edges = np.concatenate([rgb[:band].reshape(-1, 3), rgb[-band:].reshape(-1, 3), rgb[:, :band].reshape(-1, 3),
                            rgb[:, -band:].reshape(-1, 3)])
    return np.median(edges, axis=0)


def key(img: np.ndarray, tolerance: float = 40.0, despeckle: int = 4, holes: int = 4, erode: int = 1, dilate: int = 0,
        open_px: int = 0) -> np.ndarray:
    """Returns RGBA with alpha strictly 0 or 255. The binary threshold happens here, before any downscale."""
    rgb = img[..., :3].astype(np.int32)
    bg = border_colour(img)
    # Key against the real background when it is still clearly magenta-ish; otherwise fall back to pure magenta.
    target = bg if (bg[0] > 150 and bg[2] > 150 and bg[1] < 110) else MAGENTA
    dist = np.linalg.norm(rgb - target, axis=-1)
    # Pink fringe from soft AI edges: strongly magenta-tinted pixels (R and B both well above G) count as background.
    tinted = (rgb[..., 0] - rgb[..., 1] > 90) & (rgb[..., 2] - rgb[..., 1] > 90) & (np.abs(rgb[..., 0] - rgb[..., 2]) < 70)
    # Pale magenta-pink (models sometimes add "motion swoosh" marks): bright, red ~ blue, green clearly lower.
    pale = (rgb[..., 0] > 200) & (rgb[..., 2] > 200) & (np.abs(rgb[..., 0] - rgb[..., 2]) < 40) & (rgb[..., 1] < rgb[..., 0] - 40)
    opaque = (dist >= tolerance) & ~tinted & ~pale & (img[..., 3] > 127)
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
