"""Turn a raw generation into small, committed pipeline inputs: key the background, split figures, and save each
figure scaled so a standing figure is WORK_SCALE x the sprite height. Raw 2K files stay out of git (they live in the
owner's Higgsfield library; the sidecar records the job id)."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

from . import alpha, downscale, ingest, split

WORK_SCALE = 8  # approved crops are 8x sprite size: plenty for the 4x sharpen pass, small enough to commit


def approve(src: Path, out_dir: Path, sprite_height: int, figures: list[int] | None = None, ref_height: int | None = None,
            open_px: int = 0, names: list[str] | None = None) -> list[Path]:
    img = alpha.key(ingest.load(src), open_px=open_px)
    figs = split.figures(img)
    if not figs:
        raise ValueError(f"{src}: no figures found")
    chosen = figures if figures is not None else list(range(len(figs)))
    crops = []
    for i in chosen:
        b = split.bbox(figs[i])
        crops.append(figs[i][b[0] : b[2], b[1] : b[3]])
    # Same factor for every figure on the sheet, so crouches stay shorter than standing poses.
    standing = ref_height or max(c.shape[0] for c in crops)
    factor = WORK_SCALE * sprite_height / standing
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for k, (i, c) in enumerate(zip(chosen, crops)):
        small = downscale.scale(c, factor, "area", sharpen=False)
        name = names[k] if names else f"{src.stem}_f{i}"
        p = out_dir / f"{name}.png"
        Image.fromarray(small, "RGBA").save(p, optimize=True)
        written.append(p)
    sidecar = out_dir / f"{src.stem}.approve.json"
    meta = {"source": src.name, "source_hash": ingest.sha256(src), "figures": chosen, "standing_px": int(standing),
            "factor": round(factor, 6), "open_px": open_px, "outputs": [p.name for p in written]}
    sidecar.write_text(json.dumps(meta, indent=2) + "\n")
    return written
