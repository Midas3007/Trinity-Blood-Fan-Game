"""Small binary-image helpers in numpy (no scipy): shifts, erosion/dilation, connected components."""
from __future__ import annotations

from collections import deque

import numpy as np

N4 = [(-1, 0), (1, 0), (0, -1), (0, 1)]
N8 = N4 + [(-1, -1), (-1, 1), (1, -1), (1, 1)]


def shift(mask: np.ndarray, dy: int, dx: int, fill: bool = False) -> np.ndarray:
    """mask shifted so out[y, x] = mask[y + dy, x + dx]."""
    h, w = mask.shape
    out = np.full_like(mask, fill)
    ys, yd = (slice(dy, h), slice(0, h - dy)) if dy >= 0 else (slice(0, h + dy), slice(-dy, h))
    xs, xd = (slice(dx, w), slice(0, w - dx)) if dx >= 0 else (slice(0, w + dx), slice(-dx, w))
    out[yd, xd] = mask[ys, xs]
    return out


def erode(mask: np.ndarray, n: int = 1) -> np.ndarray:
    for _ in range(n):
        m = mask.copy()
        for dy, dx in N4:
            m &= shift(mask, dy, dx)
        mask = m
    return mask


def dilate(mask: np.ndarray, n: int = 1) -> np.ndarray:
    for _ in range(n):
        m = mask.copy()
        for dy, dx in N4:
            m |= shift(mask, dy, dx)
        mask = m
    return mask


def components(mask: np.ndarray, neighbours=N8) -> list[np.ndarray]:
    """Connected components of True pixels; each as an (K, 2) array of (y, x)."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    out = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]:
            continue
        seen[y0, x0] = True
        q = deque([(y0, x0)])
        pts = []
        while q:
            y, x = q.popleft()
            pts.append((y, x))
            for dy, dx in neighbours:
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        out.append(np.array(pts))
    return out


def remove_small(mask: np.ndarray, min_size: int) -> np.ndarray:
    """Drops connected True regions smaller than min_size pixels."""
    out = mask.copy()
    for c in components(mask):
        if len(c) < min_size:
            out[c[:, 0], c[:, 1]] = False
    return out


def fill_small_holes(mask: np.ndarray, max_size: int) -> np.ndarray:
    """Fills enclosed False regions smaller than max_size (regions touching the border are background)."""
    out = mask.copy()
    h, w = mask.shape
    for c in components(~mask, N4):
        touches = (c[:, 0] == 0).any() or (c[:, 0] == h - 1).any() or (c[:, 1] == 0).any() or (c[:, 1] == w - 1).any()
        if not touches and len(c) < max_size:
            out[c[:, 0], c[:, 1]] = True
    return out
