"""Pipeline option `erase`: remove dark, desaturated pixels (e.g. black wings) inside hand-placed polygons on an
approved crop, keeping bright or coloured details (hair, sash, crimson scythe) that pass over them.
Used to derive the wingless Crusnik 40% form from the winged design without new generations."""
from __future__ import annotations

import numpy as np
from PIL import Image, ImageDraw

DARK_MAX = 110       # brightest channel at or below this counts as "dark"
GREY_SPREAD = 40     # max channel spread for "desaturated"


def erase(img: np.ndarray, polygons: list[list[list[float]]]) -> np.ndarray:
    """`polygons` are lists of [x, y] in the crop's pixel coordinates."""
    if not polygons:
        return img
    h, w = img.shape[:2]
    mask_img = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask_img)
    for poly in polygons:
        draw.polygon([tuple(p) for p in poly], fill=255)
    inside = np.asarray(mask_img) > 0
    rgb = img[..., :3].astype(int)
    dark = rgb.max(axis=2) <= DARK_MAX
    grey = (rgb.max(axis=2) - rgb.min(axis=2)) <= GREY_SPREAD
    out = img.copy()
    out[inside & dark & grey, 3] = 0
    return out


def keep_largest(img: np.ndarray) -> np.ndarray:
    """Drop every opaque island except the largest (8-connected): cleans fragments an erase leaves floating."""
    from collections import deque

    solid = img[..., 3] > 0
    h, w = solid.shape
    labels = np.zeros((h, w), np.int32)
    sizes = [0]
    for y0, x0 in zip(*np.nonzero(solid)):
        if labels[y0, x0]:
            continue
        n = len(sizes)
        labels[y0, x0] = n
        q, size = deque([(y0, x0)]), 0
        while q:
            y, x = q.popleft()
            size += 1
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and solid[yy, xx] and not labels[yy, xx]:
                        labels[yy, xx] = n
                        q.append((yy, xx))
        sizes.append(size)
    if len(sizes) <= 2:
        return img
    out = img.copy()
    out[labels != int(np.argmax(sizes)), 3] = 0
    return out
