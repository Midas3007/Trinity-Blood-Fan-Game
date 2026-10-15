"""Stage 8: pack equal-size cells into a grid sheet."""
from __future__ import annotations

import numpy as np


def next_pot(n: int) -> int:
    p = 1
    while p < n:
        p *= 2
    return p


def pack(frames: list[np.ndarray], columns: int | None = None, pot: bool = False) -> tuple[np.ndarray, int]:
    if not frames:
        raise ValueError("no frames to pack")
    ch, cw = frames[0].shape[:2]
    if any(f.shape != frames[0].shape for f in frames):
        raise ValueError("all frames must share one cell size")
    cols = columns or len(frames)
    rows = (len(frames) + cols - 1) // cols
    w, h = cols * cw, rows * ch
    if pot:
        w, h = next_pot(w), next_pot(h)
    sheet = np.zeros((h, w, 4), dtype=np.uint8)
    for i, f in enumerate(frames):
        r, c = divmod(i, cols)
        sheet[r * ch : (r + 1) * ch, c * cw : (c + 1) * cw] = f
    return sheet, cols
