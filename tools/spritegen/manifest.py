"""Stage 9: JSON manifest next to each sheet (what the game reads). Gameplay timing stays in src/data/attacks.json;
the manifest carries frames, art timing and events (docs/sprite-pipeline.md §4.5)."""
from __future__ import annotations

import json
from pathlib import Path


def build(sheet_name: str, entity: str, animation: str, cell: tuple[int, int], columns: int, frame_count: int,
          anim_cfg: dict, palette_name: str, source_hashes: list[str]) -> dict:
    durations = anim_cfg.get("durations_ms", 100)
    if isinstance(durations, (int, float)):
        durations = [int(durations)] * frame_count
    if len(durations) != frame_count:
        raise ValueError(f"{entity}/{animation}: {len(durations)} durations for {frame_count} frames")
    anim = {"frames": list(range(frame_count)), "durations_ms": durations, "loop": bool(anim_cfg.get("loop", False)),
            "events": anim_cfg.get("events", [])}
    for key in ("attack", "hitboxes", "hurtbox"):
        if key in anim_cfg:
            anim[key] = anim_cfg[key]
    return {
        "sheet": sheet_name,
        "entity": entity,
        "cell_width": cell[0],
        "cell_height": cell[1],
        "pivot_x": cell[0] // 2,
        "pivot_y": cell[1],
        "columns": columns,
        "animations": {animation: anim},
        "palette": palette_name,
        "source_hashes": source_hashes,
    }


def write(path: Path, data: dict) -> None:
    # No timestamps: identical inputs must give byte-identical outputs (docs/sprite-pipeline.md §7.9).
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n")
