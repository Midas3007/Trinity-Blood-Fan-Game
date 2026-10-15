"""Stage 4: scale a keyed figure to sprite size. 'area' = premultiplied box averaging (with an unsharp pass
at 4x target size so edges survive), 'nearest' = plain nearest-neighbour. Never bilinear/bicubic."""
from __future__ import annotations

import numpy as np
from PIL import Image, ImageFilter

COVERAGE = 0.5  # a target pixel is opaque when at least half its source area is opaque


def _box(img: np.ndarray, size: tuple[int, int]) -> np.ndarray:
    a = img[..., 3:4].astype(np.float64) / 255.0
    pre = img[..., :3].astype(np.float64) * a
    rgb = np.stack(
        [np.array(Image.fromarray(pre[..., i].astype(np.float32), "F").resize(size, Image.BOX)) for i in range(3)], axis=-1
    )
    cov = np.array(Image.fromarray(a[..., 0].astype(np.float32), "F").resize(size, Image.BOX))
    safe = np.where(cov > 1e-6, cov, 1.0)[..., None]
    col = np.clip(rgb / safe, 0, 255)
    out = np.zeros((size[1], size[0], 4), dtype=np.uint8)
    out[..., :3] = np.round(col).astype(np.uint8)
    out[..., 3] = np.where(cov >= COVERAGE, 255, 0)
    out[out[..., 3] == 0, :3] = 0
    return out


def scale(img: np.ndarray, factor: float, method: str = "area", sharpen: bool = True) -> np.ndarray:
    h, w = img.shape[:2]
    size = (max(1, round(w * factor)), max(1, round(h * factor)))
    if method == "nearest":
        out = np.array(Image.fromarray(img, "RGBA").resize(size, Image.NEAREST))
        out[..., 3] = np.where(out[..., 3] > 127, 255, 0)
        return out
    if method != "area":
        raise ValueError(f"unknown method {method!r}")
    if sharpen and factor < 0.25:
        mid = (size[0] * 4, size[1] * 4)
        stage = _box(img, mid)
        rgb = Image.fromarray(stage[..., :3], "RGB").filter(ImageFilter.UnsharpMask(radius=1, percent=80, threshold=0))
        stage[..., :3] = np.array(rgb)
        stage[stage[..., 3] == 0, :3] = 0
        return _box(stage, size)
    return _box(img, size)
