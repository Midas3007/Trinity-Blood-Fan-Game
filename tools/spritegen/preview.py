"""The tuning tool: one source figure through several heights x methods x outline modes, as one contact sheet."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from . import alpha, cleanup, crop, downscale, ingest, outline, quantize, split, tone
from .palette import Palette

BG = (28, 24, 38, 255)  # palette night shadow, so sprites are judged on a game-like background
LABEL_H = 12


def render(fig: np.ndarray, pal: Palette, height: int, method: str, outline_mode: str, cell: int, dither: bool = False,
           min_feature: int = 2, gamma: float = 1.0, squeeze: float = 1.0) -> np.ndarray:
    b = split.bbox(fig)
    if b is None:
        return np.zeros((cell, cell, 4), dtype=np.uint8)
    factor = height / (b[2] - b[0])
    small = downscale.scale(fig[b[0] : b[2], b[1] : b[3]], factor, method, squeeze=squeeze)
    small = quantize.quantize(tone.gamma(small, gamma), pal, dither=dither)
    small = cleanup.cleanup(small, min_feature)
    small = outline.outline(small, pal, outline_mode)
    # pad so the outline never touches the crop before placement
    padded = np.zeros((small.shape[0] + 2, small.shape[1] + 2, 4), dtype=np.uint8)
    padded[1:-1, 1:-1] = small
    placed, _ = crop.place(padded, (cell, cell))
    return placed


def contact_sheet(src: Path, pal: Palette, heights: list[int], methods: list[str], outlines: list[str], figure: int,
                  zoom: int, cell: int, open_px: int = 0, dither: bool = False, gammas: list[float] | None = None,
                  squeezes: list[float] | None = None) -> Image.Image:
    img = alpha.key(ingest.load(src), open_px=open_px)
    figs = split.figures(img)
    if not figs:
        raise ValueError(f"{src}: no figure found after background removal")
    fig = figs[min(figure, len(figs) - 1)]
    combos = [(m, o, g, q) for m in methods for o in outlines for g in (gammas or [1.0]) for q in (squeezes or [1.0])]
    tile = cell * zoom
    sheet = Image.new("RGBA", (tile * len(heights), (tile + LABEL_H) * len(combos) + LABEL_H), BG)
    draw = ImageDraw.Draw(sheet)
    for c, h in enumerate(heights):
        draw.text((c * tile + 3, 1), f"{h}px", fill=(239, 234, 242, 255))
    for r, (m, o, g, q) in enumerate(combos):
        y = LABEL_H + r * (tile + LABEL_H)
        draw.text((3, y + 1), f"{m} / {o} / gamma {g} / squeeze {q}", fill=(217, 150, 58, 255))
        for c, h in enumerate(heights):
            spr = render(fig, pal, h, m, o, cell, dither, gamma=g, squeeze=q)
            im = Image.fromarray(spr, "RGBA").resize((tile, tile), Image.NEAREST)
            bg = Image.new("RGBA", im.size, BG)
            sheet.alpha_composite(Image.alpha_composite(bg, im), (c * tile, y + LABEL_H))
    return sheet
