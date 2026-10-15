"""Hand-fixes (e.g. from Aseprite) live in art/overrides and are re-applied on every build, so re-runs never lose them.
- art/overrides/<entity>/<animation>/<frame>.png replaces one frame (must be exactly the cell size).
- art/overrides/<entity>/<entity>_<animation>.png replaces the whole sheet."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image


def apply_frames(frames: list[np.ndarray], overrides_dir: Path, entity: str, animation: str) -> list[str]:
    applied = []
    d = overrides_dir / entity / animation
    for i in range(len(frames)):
        p = d / f"{i}.png"
        if p.is_file():
            o = np.array(Image.open(p).convert("RGBA"))
            if o.shape != frames[i].shape:
                raise ValueError(f"{p}: override is {o.shape[1]}x{o.shape[0]}, cell is {frames[i].shape[1]}x{frames[i].shape[0]}")
            frames[i] = o
            applied.append(str(p))
    return applied


def sheet_override(overrides_dir: Path, entity: str, animation: str) -> np.ndarray | None:
    p = overrides_dir / entity / f"{entity}_{animation}.png"
    return np.array(Image.open(p).convert("RGBA")) if p.is_file() else None
