"""Split a sheet holding several figures (turnaround, pose batch) into one image per figure, left to right."""
from __future__ import annotations

import numpy as np


def figures(img: np.ndarray, min_gap: int = 8, min_width: int = 8) -> list[np.ndarray]:
    """Cuts at runs of fully transparent columns at least `min_gap` wide. Returns RGBA crops (full height)."""
    occupied = (img[..., 3] > 0).any(axis=0)
    spans: list[list[int]] = []
    x, w = 0, len(occupied)
    while x < w:
        if not occupied[x]:
            x += 1
            continue
        start = x
        gap = 0
        while x < w and gap < min_gap:
            gap = 0 if occupied[x] else gap + 1
            x += 1
        end = x - gap
        if end - start >= min_width:
            spans.append([start, end])
    return [img[:, a:b] for a, b in spans]


def bbox(img: np.ndarray) -> tuple[int, int, int, int] | None:
    """(top, left, bottom, right) exclusive of opaque pixels, or None if empty."""
    ys, xs = np.nonzero(img[..., 3] > 0)
    if len(ys) == 0:
        return None
    return int(ys.min()), int(xs.min()), int(ys.max()) + 1, int(xs.max()) + 1
