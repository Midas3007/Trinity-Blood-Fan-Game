"""Split a sheet holding several figures (turnaround, pose batch) into one image per figure, left to right."""
from __future__ import annotations

import numpy as np

from . import morph

COARSE = 4  # component analysis runs on a 1/4-size mask for speed


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


def figures_expected(img: np.ndarray, expected: int) -> list[np.ndarray]:
    """For sheets whose figures nearly touch (flaring coats): cut at the `expected - 1` emptiest columns, spaced
    apart, then keep only the largest connected body in each slice so stray bits of neighbours are dropped."""
    mask = img[..., 3] > 0
    occ = mask.sum(axis=0).astype(np.float64)
    cols = np.nonzero(occ)[0]
    if len(cols) == 0 or expected < 1:
        return []
    left, right = int(cols.min()), int(cols.max()) + 1
    span = right - left
    min_sep = span / (2 * expected)
    # Smooth occupancy so single-pixel dips don't win; pick valleys greedily, keeping cuts apart.
    k = max(1, int(span / (expected * 20)))
    smooth = np.convolve(occ, np.ones(2 * k + 1) / (2 * k + 1), mode="same")
    cuts: list[int] = []
    candidates = sorted(range(left + int(min_sep), right - int(min_sep)), key=lambda x: (smooth[x], x))
    for x in candidates:
        if len(cuts) == expected - 1:
            break
        # Each pair of cuts (and the sheet edges) must have a figure's body between them, so two cuts never
        # fall inside the same empty gap.
        body = 0.5 * occ.max()
        if all(abs(x - c) >= min_sep and occ[min(x, c) : max(x, c)].max() > body for c in cuts + [left, right]
               if c != x):
            cuts.append(x)
    bounds = [left] + sorted(cuts) + [right]
    out = []
    for a, b in zip(bounds[:-1], bounds[1:]):
        piece = img[:, a:b].copy()
        coarse = piece[::COARSE, ::COARSE, 3] > 0
        comps = morph.components(coarse)
        if not comps:
            continue
        main = max(comps, key=len)
        keep = np.zeros_like(coarse)
        keep[main[:, 0], main[:, 1]] = True
        keep = morph.dilate(keep, 1)
        full = np.repeat(np.repeat(keep, COARSE, axis=0), COARSE, axis=1)[: piece.shape[0], : piece.shape[1]]
        piece[~full] = 0
        out.append(piece)
    return out
