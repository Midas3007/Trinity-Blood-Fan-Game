"""Stage 7: 1 px outline on the outside of the silhouette.
- uniform: outline colour all round (8-neighbour).
- selective (default, approved art direction): dark outline at the sides and bottom; along top edges, which face
  the moonlight key from above, the outline is a darkened version of the colour it borders, mapped to the palette.
- none."""
from __future__ import annotations

import numpy as np

from . import morph
from .palette import Palette, srgb_to_lab

OUTLINE = (0x0B, 0x0A, 0x10)
TOP_DARKEN = 0.45  # Lab L* multiplier for selective top edges


def outline(img: np.ndarray, pal: Palette, mode: str = "selective", colour: tuple[int, int, int] = OUTLINE) -> np.ndarray:
    if mode == "none":
        return img
    out = img.copy()
    opaque = img[..., 3] > 0
    nbrs = morph.N8 if mode == "uniform" else morph.N4
    ring = np.zeros_like(opaque)
    for dy, dx in nbrs:
        ring |= morph.shift(opaque, dy, dx)
    ring &= ~opaque
    out[ring, :3] = colour
    out[ring, 3] = 255
    if mode == "selective":
        below = morph.shift(opaque, 1, 0)  # pixel directly below is part of the sprite
        side = morph.shift(opaque, 0, 1) | morph.shift(opaque, 0, -1)
        top_edge = ring & below & ~side
        if top_edge.any():
            src = np.roll(img[..., :3], -1, axis=0)[top_edge]  # the sprite colour just below
            lab = srgb_to_lab(src)
            lab[:, 0] *= TOP_DARKEN
            # Find the palette colour closest to the darkened Lab value.
            from .palette import ciede2000

            idx = np.argmin(ciede2000(lab[:, None, :], pal.lab[None, :, :]), axis=1)
            out[top_edge, :3] = pal.colours[idx]
    elif mode != "uniform":
        raise ValueError(f"unknown outline mode {mode!r}")
    return out
