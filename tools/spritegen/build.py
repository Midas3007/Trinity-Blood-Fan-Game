"""Batch build from tools/spritegen/pipeline.yaml: approved crops -> frames -> sheet + manifest, then overrides."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import yaml
from PIL import Image

import json

from . import approve, cleanup, crop, downscale, ingest, manifest, outline, overrides, pack, quantize, tone
from .palette import Palette

OVERRIDES = Path("art/overrides")


def load_config(path: Path) -> dict:
    cfg = yaml.safe_load(path.read_text())
    if not isinstance(cfg, dict) or "entities" not in cfg:
        raise ValueError(f"{path}: needs 'defaults' and 'entities'")
    return cfg


def frame_from_crop(crop_img: np.ndarray, pal: Palette, opts: dict, cell: tuple[int, int]) -> tuple[np.ndarray, dict]:
    small = downscale.scale(crop_img, 1 / approve.WORK_SCALE, opts["method"], squeeze=float(opts.get("squeeze", 1.0)))
    small = tone.gamma(small, float(opts.get("gamma", 1.0)))
    small = quantize.quantize(small, pal, dither=bool(opts.get("dither", False)))
    small = cleanup.cleanup(small, int(opts.get("min_feature", 2)))
    small = outline.outline(small, pal, opts.get("outline", "selective"))
    padded = np.zeros((small.shape[0] + 2, small.shape[1] + 2, 4), dtype=np.uint8)
    padded[1:-1, 1:-1] = small
    return crop.place(padded, cell, lift=int(opts.get("lift", 0)), anchor=str(opts.get("anchor", "feet")))


SPRITES_ROOT = Path("public/assets/sprites")


def write_index(root: Path = SPRITES_ROOT) -> Path:
    """One file the game loads at startup: every shipped manifest, keyed by sheet path relative to `root`."""
    entries = {}
    for m in sorted(root.rglob("*.json")):
        if m.name == "index.json":
            continue
        data = json.loads(m.read_text())
        entries[str(m.with_suffix(".png").relative_to(root))] = data
    out = root / "index.json"
    out.write_text(json.dumps({"sheets": entries}, indent=2, sort_keys=True) + "\n")
    return out


def build_all(cfg_path: Path, only: str | None = None) -> list[str]:
    cfg = load_config(cfg_path)
    defaults = cfg.get("defaults", {})
    log = []
    for entity, ecfg in cfg["entities"].items():
        if only and entity != only:
            continue
        opts = {**defaults, **{k: v for k, v in ecfg.items() if k != "animations"}}
        pal = Palette.from_hex(opts["palette"])
        cell = tuple(ecfg["cell"])
        src_root, out_dir = Path(ecfg["source_dir"]), Path(ecfg["output_dir"])
        for anim, acfg in (ecfg.get("animations") or {}).items():
            files = sorted((src_root / anim).glob("*.png"))
            if not files:
                log.append(f"skip {entity}/{anim}: no approved sources in {src_root / anim}")
                continue
            aopts = {**opts, **(acfg or {})}
            frames, hashes = [], []
            for f in files:
                img = np.array(Image.open(f).convert("RGBA"))
                frame, meta = frame_from_crop(img, pal, aopts, cell)
                if meta["clipped"]:
                    log.append(f"WARN {entity}/{anim}: {f.name} clipped by the {cell[0]}x{cell[1]} cell")
                frames.append(frame)
                hashes.append(ingest.sha256(f))
            applied = overrides.apply_frames(frames, OVERRIDES, entity, anim)
            sheet, cols = pack.pack(frames, aopts.get("columns"))
            whole = overrides.sheet_override(OVERRIDES, entity, anim)
            if whole is not None:
                sheet = whole
                applied.append("whole sheet")
            out_dir.mkdir(parents=True, exist_ok=True)
            name = f"{entity}_{anim}"
            Image.fromarray(sheet, "RGBA").save(out_dir / f"{name}.png", optimize=True)
            m = manifest.build(f"{name}.png", entity, anim, cell, cols, len(frames), acfg or {}, Path(opts["palette"]).name, hashes)
            manifest.write(out_dir / f"{name}.json", m)
            log.append(f"built {out_dir / name}.png ({len(frames)} frames{', overrides: ' + ', '.join(applied) if applied else ''})")
    if SPRITES_ROOT.exists():
        log.append(f"wrote {write_index()}")
    return log
