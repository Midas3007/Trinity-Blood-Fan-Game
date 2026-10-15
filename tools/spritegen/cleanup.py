"""Stage 6 (before outline): remove orphan pixels and specks smaller than min_feature."""
from __future__ import annotations

import numpy as np

from . import morph


def cleanup(img: np.ndarray, min_feature: int = 2) -> np.ndarray:
    out = img.copy()
    opaque = out[..., 3] > 0
    # Opaque specks smaller than min_feature pixels disappear.
    keep = morph.remove_small(opaque, max(1, min_feature))
    out[~keep] = 0
    opaque = keep
    # Orphans: a pixel whose 8 opaque neighbours all have a different colour takes the most common neighbour colour.
    h, w = opaque.shape
    rgb = out[..., :3]
    src = rgb.copy()
    for y, x in zip(*np.nonzero(opaque)):
        neigh = []
        same = 0
        for dy, dx in morph.N8:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and opaque[ny, nx]:
                c = tuple(int(v) for v in src[ny, nx])
                neigh.append(c)
                same += c == tuple(int(v) for v in src[y, x])
        if len(neigh) >= 3 and same == 0:
            values, counts = np.unique(np.array(neigh), axis=0, return_counts=True)
            order = np.lexsort((values[:, 2], values[:, 1], values[:, 0], -counts))  # deterministic tie-break
            rgb[y, x] = values[order[0]]
    return out
