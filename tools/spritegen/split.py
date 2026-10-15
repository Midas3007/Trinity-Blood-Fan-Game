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


MAX_ERODE = 10  # coarse pixels; separates touching figures by shrinking until their cores come apart


def _box(c: np.ndarray) -> tuple[int, int, int, int]:
    return int(c[:, 0].min()), int(c[:, 1].min()), int(c[:, 0].max()), int(c[:, 1].max())


def _gap(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> int:
    dy = max(0, max(a[0], b[0]) - min(a[2], b[2]))
    dx = max(0, max(a[1], b[1]) - min(a[3], b[3]))
    return dx + dy


def _seed_labels(coarse: np.ndarray, expected: int) -> np.ndarray | None:
    """Label map (-1 = none) with `expected` figures. Seeds are the largest components after eroding just enough
    to separate touching figures; seeds then grow back through the silhouette (multi-source flood)."""
    from collections import deque

    for k in range(MAX_ERODE + 1):
        m = morph.erode(coarse, k) if k else coarse
        comps = sorted(morph.components(m), key=len, reverse=True)
        if len(comps) >= expected and len(comps[expected - 1]) >= 0.05 * len(comps[0]):
            break
    else:
        return None
    labels = np.full(coarse.shape, -1, dtype=np.int32)
    q: deque[tuple[int, int]] = deque()
    for i, c in enumerate(comps[:expected]):
        labels[c[:, 0], c[:, 1]] = i
        q.extend((int(y), int(x)) for y, x in c)
    h, w = coarse.shape
    while q:
        y, x = q.popleft()
        for dy, dx in morph.N8:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and coarse[ny, nx] and labels[ny, nx] < 0:
                labels[ny, nx] = labels[y, x]
                q.append((ny, nx))
    # Detached bits never reached by the flood join the figure whose box is nearest.
    boxes = [_box(np.argwhere(labels == i)) for i in range(expected)]
    for bit in morph.components(coarse & (labels < 0)):
        owner = min(range(expected), key=lambda i: (_gap(_box(bit), boxes[i]), i))
        labels[bit[:, 0], bit[:, 1]] = owner
    return labels


def figures_by_components(img: np.ndarray, expected: int) -> list[np.ndarray] | None:
    """2D separation into exactly `expected` figures (separate or touching). None if it can't be done."""
    mask = img[..., 3] > 0
    coarse = mask[::COARSE, ::COARSE]
    labels = _seed_labels(coarse, expected)
    if labels is None:
        return None
    # Fine pixels take the label of their coarse cell; pixels in unlabeled cells take a labeled 8-neighbour cell.
    full = np.repeat(np.repeat(labels, COARSE, axis=0), COARSE, axis=1)[: mask.shape[0], : mask.shape[1]]
    for _ in range(COARSE):
        missing = mask & (full < 0)
        if not missing.any():
            break
        for dy, dx in morph.N8:
            shifted = np.full_like(full, -1)
            ys, xs = slice(max(dy, 0), full.shape[0] + min(dy, 0)), slice(max(dx, 0), full.shape[1] + min(dx, 0))
            yd, xd = slice(max(-dy, 0), full.shape[0] + min(-dy, 0)), slice(max(-dx, 0), full.shape[1] + min(-dx, 0))
            shifted[yd, xd] = full[ys, xs]
            fill = missing & (full < 0) & (shifted >= 0)
            full[fill] = shifted[fill]
    lefts = [int(np.nonzero((full == i).any(axis=0))[0].min()) for i in range(expected)]
    out = []
    for i in sorted(range(expected), key=lambda i: lefts[i]):
        sel = mask & (full == i)
        cols = np.nonzero(sel.any(axis=0))[0]
        a, b = int(cols.min()), int(cols.max()) + 1
        piece = np.zeros((img.shape[0], b - a, 4), dtype=np.uint8)
        keep = sel[:, a:b]
        piece[keep] = img[:, a:b][keep]
        out.append(piece)
    return out


def figures_expected(img: np.ndarray, expected: int) -> list[np.ndarray]:
    """Separate exactly `expected` figures: 2D components first; if figures truly touch, cut at the
    `expected - 1` emptiest columns and keep the largest body in each slice."""
    found = figures_by_components(img, expected)
    if found is not None:
        return found
    return _figures_by_columns(img, expected)


def _figures_by_columns(img: np.ndarray, expected: int) -> list[np.ndarray]:
    """Column-cut fallback for figures that touch."""
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
