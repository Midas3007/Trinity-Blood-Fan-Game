"""Stage 10: check shipped sheets. Non-zero exit (via the CLI) on any problem."""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image

from .palette import Palette


def validate_sheet(png: Path, pal: Palette) -> tuple[list[str], Counter]:
    problems: list[str] = []
    mpath = png.with_suffix(".json")
    if not mpath.is_file():
        return [f"{png.name}: missing manifest {mpath.name}"], Counter()
    m = json.loads(mpath.read_text())
    img = np.array(Image.open(png).convert("RGBA"))
    cw, ch = m["cell_width"], m["cell_height"]
    h, w = img.shape[:2]
    if w % cw or h % ch:
        problems.append(f"{png.name}: sheet {w}x{h} is not a multiple of the {cw}x{ch} cell")
    if (m["pivot_x"], m["pivot_y"]) != (cw // 2, ch):
        problems.append(f"{png.name}: pivot must be bottom-centre ({cw // 2},{ch})")
    a = img[..., 3]
    if ((a != 0) & (a != 255)).any():
        problems.append(f"{png.name}: semi-transparent pixels")
    opaque = img[a == 255][:, :3]
    hist = Counter(tuple(int(v) for v in c) for c in opaque)
    off = [c for c in hist if not pal.contains(c)]
    if off:
        problems.append(f"{png.name}: {len(off)} off-palette colours, e.g. #{''.join(f'{v:02x}' for v in off[0])}")
    cols = m["columns"]
    for anim, data in m["animations"].items():
        for f in data["frames"]:
            r, c = divmod(f, cols)
            cell = a[r * ch : (r + 1) * ch, c * cw : (c + 1) * cw]
            if cell.shape != (ch, cw):
                problems.append(f"{png.name}: {anim} frame {f} outside the sheet")
                continue
            # Feet may sit on the bottom row (pivot); top, left and right edges must stay clear.
            if cell[0].any() or cell[:, 0].any() or cell[:, -1].any():
                problems.append(f"{png.name}: {anim} frame {f} touches the cell edge (clipped?)")
        if len(data["durations_ms"]) != len(data["frames"]):
            problems.append(f"{png.name}: {anim} durations/frames count mismatch")
    return problems, hist


def validate_dir(root: Path, pal: Palette) -> tuple[list[str], dict[str, Counter]]:
    problems, hists = [], {}
    for png in sorted(root.rglob("*.png")):
        p, hist = validate_sheet(png, pal)
        problems += p
        hists[str(png.relative_to(root))] = hist
    return problems, hists
