"""Stage 1: load a source image and sanity-check it."""
from __future__ import annotations

import hashlib
import logging
from pathlib import Path

import numpy as np
from PIL import Image

log = logging.getLogger("spritegen")

MIN_SIDE = 512
MAGENTA = np.array([255, 0, 255])


def sha256(path: Path) -> str:
    return "sha256:" + hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load(path: str | Path) -> np.ndarray:
    """Returns an (H, W, 4) uint8 RGBA array. Hard-fails on missing/unreadable files; warns on soft issues."""
    p = Path(path)
    if not p.is_file():
        raise FileNotFoundError(p)
    try:
        with Image.open(p) as im:
            img = np.array(im.convert("RGBA"))
    except Exception as e:  # noqa: BLE001 - any decode error is a hard failure
        raise ValueError(f"{p}: unreadable image ({e})") from e
    h, w = img.shape[:2]
    if min(h, w) < MIN_SIDE:
        log.warning("%s: small source (%dx%d); detail may be lost", p.name, w, h)
    corners = np.concatenate([img[:8, :8, :3].reshape(-1, 3), img[-8:, -8:, :3].reshape(-1, 3)])
    if np.mean(np.linalg.norm(corners.astype(int) - MAGENTA, axis=1)) > 80:
        log.warning("%s: corners are not magenta; background removal may fail", p.name)
    return img
