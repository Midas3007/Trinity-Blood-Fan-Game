"""Palette loading, sRGB -> CIE Lab conversion and CIEDE2000 nearest-colour matching."""
from __future__ import annotations

from pathlib import Path

import numpy as np


def load_hex(path: str | Path) -> np.ndarray:
    """Reads one RRGGBB per line ('#' prefix and trailing '; comments' allowed). Returns (N, 3) uint8."""
    colours = []
    for raw in Path(path).read_text().splitlines():
        line = raw.split(";")[0].strip().lstrip("#")
        if not line:
            continue
        if len(line) != 6:
            raise ValueError(f"{path}: bad colour line {raw!r}")
        colours.append([int(line[i : i + 2], 16) for i in (0, 2, 4)])
    if not colours:
        raise ValueError(f"{path}: empty palette")
    return np.array(colours, dtype=np.uint8)


def srgb_to_lab(rgb: np.ndarray) -> np.ndarray:
    """(..., 3) uint8 sRGB -> (..., 3) float Lab (D65)."""
    c = rgb.astype(np.float64) / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m = np.array(
        [[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]]
    )
    xyz = lin @ m.T
    xyz = xyz / np.array([0.95047, 1.0, 1.08883])
    eps, kappa = 216 / 24389, 24389 / 27
    f = np.where(xyz > eps, np.cbrt(xyz), (kappa * xyz + 16) / 116)
    L = 116 * f[..., 1] - 16
    a = 500 * (f[..., 0] - f[..., 1])
    b = 200 * (f[..., 1] - f[..., 2])
    return np.stack([L, a, b], axis=-1)


def ciede2000(lab1: np.ndarray, lab2: np.ndarray) -> np.ndarray:
    """CIEDE2000 colour difference; broadcasts over leading dimensions."""
    L1, a1, b1 = lab1[..., 0], lab1[..., 1], lab1[..., 2]
    L2, a2, b2 = lab2[..., 0], lab2[..., 1], lab2[..., 2]
    C1 = np.hypot(a1, b1)
    C2 = np.hypot(a2, b2)
    Cbar = (C1 + C2) / 2
    G = 0.5 * (1 - np.sqrt(Cbar**7 / (Cbar**7 + 25.0**7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p = np.degrees(np.arctan2(b1, a1p)) % 360
    h2p = np.degrees(np.arctan2(b2, a2p)) % 360
    dLp = L2 - L1
    dCp = C2p - C1p
    dhp = h2p - h1p
    dhp = np.where(dhp > 180, dhp - 360, dhp)
    dhp = np.where(dhp < -180, dhp + 360, dhp)
    dhp = np.where(C1p * C2p == 0, 0, dhp)
    dHp = 2 * np.sqrt(C1p * C2p) * np.sin(np.radians(dhp) / 2)
    Lbarp = (L1 + L2) / 2
    Cbarp = (C1p + C2p) / 2
    hsum = h1p + h2p
    hbarp = np.where(np.abs(h1p - h2p) > 180, np.where(hsum < 360, (hsum + 360) / 2, (hsum - 360) / 2), hsum / 2)
    hbarp = np.where(C1p * C2p == 0, hsum, hbarp)
    T = (
        1
        - 0.17 * np.cos(np.radians(hbarp - 30))
        + 0.24 * np.cos(np.radians(2 * hbarp))
        + 0.32 * np.cos(np.radians(3 * hbarp + 6))
        - 0.20 * np.cos(np.radians(4 * hbarp - 63))
    )
    dtheta = 30 * np.exp(-(((hbarp - 275) / 25) ** 2))
    Rc = 2 * np.sqrt(Cbarp**7 / (Cbarp**7 + 25.0**7))
    Sl = 1 + 0.015 * (Lbarp - 50) ** 2 / np.sqrt(20 + (Lbarp - 50) ** 2)
    Sc = 1 + 0.045 * Cbarp
    Sh = 1 + 0.015 * Cbarp * T
    Rt = -np.sin(np.radians(2 * dtheta)) * Rc
    return np.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh))


class Palette:
    """A fixed palette with a cached CIEDE2000 nearest-colour lookup."""

    def __init__(self, colours: np.ndarray, name: str = "palette"):
        self.colours = colours.astype(np.uint8)
        self.name = name
        self.lab = srgb_to_lab(self.colours)
        self._cache: dict[tuple[int, int, int], int] = {}
        self._set = {tuple(int(v) for v in c) for c in self.colours}

    @classmethod
    def from_hex(cls, path: str | Path) -> "Palette":
        return cls(load_hex(path), Path(path).name)

    def __len__(self) -> int:
        return len(self.colours)

    def contains(self, rgb: tuple[int, int, int]) -> bool:
        return tuple(int(v) for v in rgb) in self._set

    def nearest_index(self, rgb: np.ndarray) -> np.ndarray:
        """(N, 3) uint8 -> (N,) palette indices. Unique colours are computed once and cached."""
        flat = rgb.reshape(-1, 3)
        uniq, inverse = np.unique(flat, axis=0, return_inverse=True)
        todo = [i for i, u in enumerate(uniq) if tuple(int(v) for v in u) not in self._cache]
        if todo:
            lab = srgb_to_lab(uniq[todo])
            d = ciede2000(lab[:, None, :], self.lab[None, :, :])
            best = np.argmin(d, axis=1)
            for i, idx in zip(todo, best):
                self._cache[tuple(int(v) for v in uniq[i])] = int(idx)
        idx = np.array([self._cache[tuple(int(v) for v in u)] for u in uniq], dtype=np.int64)
        return idx[inverse.reshape(-1)]
