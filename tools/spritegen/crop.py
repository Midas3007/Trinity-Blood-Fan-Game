"""Stage 3/placement: put a scaled figure into a fixed cell with the pivot at bottom-centre.
Horizontal anchor = centre of the figure's lowest 30% (feet/legs), so weapon swings don't shift the body."""
from __future__ import annotations

import numpy as np

from .split import bbox

FOOT_BAND = 0.3


def foot_centre_x(img: np.ndarray) -> float:
    b = bbox(img)
    if b is None:
        return img.shape[1] / 2
    top, _, bottom, _ = b
    band_top = bottom - max(1, round((bottom - top) * FOOT_BAND))
    ys, xs = np.nonzero(img[band_top:bottom, :, 3] > 0)
    return float(xs.mean()) + 0.5 if len(xs) else img.shape[1] / 2


def place(fig: np.ndarray, cell: tuple[int, int], lift: int = 0, foot_x: float | None = None) -> tuple[np.ndarray, dict]:
    """Returns (cell RGBA, metadata). Feet land on the cell's bottom row (pivot = (w/2, h)); `lift` raises the
    figure (for airborne frames). Pixels that would fall outside the cell are reported as clipped."""
    cw, ch = cell
    out = np.zeros((ch, cw, 4), dtype=np.uint8)
    b = bbox(fig)
    meta = {"clipped": False, "bbox": None}
    if b is None:
        return out, meta
    top, left, bottom, right = b
    fx = foot_centre_x(fig) if foot_x is None else foot_x
    dx = round(cw / 2 - fx)
    dy = ch - bottom - lift
    ys, xs = np.nonzero(fig[..., 3] > 0)
    ty, tx = ys + dy, xs + dx
    ok = (ty >= 0) & (ty < ch) & (tx >= 0) & (tx < cw)
    meta["clipped"] = bool((~ok).any())
    out[ty[ok], tx[ok]] = fig[ys[ok], xs[ok]]
    meta["bbox"] = [int(left + dx), int(top + dy), int(right - left), int(bottom - top)]
    return out, meta
