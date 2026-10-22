"""Colour/style variants of existing sprite sheets, kept inside the Requiem 48 palette (no new art needed).
Usage: python3 -I tools/sprites/variants.py   (from the repo root; rewrites the variant sheets and index.json)

  boss_cain       Cain, ground form: Abel's 80% look with white wings and coat, blond hair, a gold weapon.
  boss_cainfull   Cain's full form (the sky): the same, radiant, with crimson edges.
  abel_crusnik100 Abel at 100%: black, with crimson membranes and a blazing red edge (bat wings are drawn in code).
"""
import json, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SPR = ROOT / "public/assets/sprites"
sys.path.insert(0, str(ROOT))
from tools.spritegen.build import write_index  # noqa: E402

def hx(h): return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

GREYS = ["0b0a10", "14111c", "1c1826", "251f30", "2e2836", "3b3444", "4a4252", "5c5464", "6f6676", "8a8392", "a59fb0",
         "b8b1c4", "c9c2d6", "ddd7e6", "efeaf2"]
LUM = {h: i for i, h in enumerate(GREYS)}

def cain_map(full: bool):
    """Dark coat and wings become white (shading inverted), light hair becomes gold, red becomes gold."""
    m = {}
    lights = ["ddd7e6", "c9c2d6", "b8b1c4", "a59fb0"]
    for h in GREYS:
        i = LUM[h]
        if i <= 8:  # coat, wings: dark -> light, keeping the order of shades
            m[h] = ["efeaf2", "ddd7e6", "c9c2d6", "b8b1c4", "a59fb0", "8a8392", "ffffff", "ffffff", "efeaf2"][i]
        else:  # silver hair -> blond
            m[h] = ["9c7a2c", "c4a04a", "e8c86a", "f6e3a3", "f6e3a3", "ffffff"][i - 9]
    for h, to in {"180f20": "c9c2d6", "241b2e": "b8b1c4", "32263e": "a59fb0", "41324f": "8a8392",
                  "2e0811": "7a4a1e", "4a0f1b": "a86b2a", "6a1524": "c4a04a", "8e1b2c": "e8c86a", "ad2a3a": "f6e3a3",
                  "d4283e": "f6e3a3"}.items():
        m[h] = to
    if full:  # radiant: brighter whites, gold weapon turns crimson-gold
        m.update({"0b0a10": "ffffff", "14111c": "efeaf2", "2e0811": "8e1b2c", "4a0f1b": "ad2a3a", "6a1524": "d9963a"})
    return m

def abel100_map():
    m = {h: h for h in GREYS}
    m.update({"3b3444": "4a0f1b", "4a4252": "6a1524", "5c5464": "8e1b2c", "6f6676": "6a1524",
              "180f20": "2e0811", "241b2e": "2e0811", "32263e": "4a0f1b", "41324f": "4a0f1b",
              "2e0811": "6a1524", "4a0f1b": "ad2a3a", "6a1524": "d4283e", "8e1b2c": "e85a5f", "ad2a3a": "f39a8f"})
    return m

def recolor(src: Path, dst: Path, cmap: dict, edge: str | None):
    im = Image.open(src).convert("RGBA")
    px = im.load(); w, h = im.size
    lut = {hx(k): hx(v) for k, v in cmap.items()}
    out = im.copy(); po = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0: continue
            po[x, y] = lut.get((r, g, b), (r, g, b)) + (a,)
    if edge:  # a one-pixel coloured rim inside the silhouette (outline / glow)
        e = hx(edge)
        for y in range(h):
            for x in range(w):
                if px[x, y][3] == 0: continue
                if any(not (0 <= x + dx < w and 0 <= y + dy < h) or px[x + dx, y + dy][3] == 0
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    po[x, y] = e + (255,)
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst)

def variant(src_sheet: str, src_anim: str, entity: str, out_dir: str, anim: str, cmap: dict, edge: str | None):
    src = SPR / src_sheet
    man = json.loads(src.with_suffix(".json").read_text())
    name = f"{entity}_{anim}"
    dst = SPR / out_dir / f"{name}.png"
    recolor(src, dst, cmap, edge)
    man["entity"] = entity
    man["sheet"] = dst.name
    man["animations"] = {anim: man["animations"][src_anim]}
    man["variant_of"] = src_sheet
    dst.with_suffix(".json").write_text(json.dumps(man, indent=2, sort_keys=True) + "\n")
    return dst

C80 = "abel_crusnik80/abel_crusnik80_{}.png"
JOBS = [
    # (source pose, entity, folder, new animation name, colours, rim)
    *[(p, "boss_cain", "bosses/cain", a, cain_map(False), "4a4252") for p, a in
      (("hover", "idle"), ("fly", "fly"), ("dive", "lance"), ("hover", "cast"), ("hover", "hurt"), ("dive", "defeated"))],
    *[(p, "boss_cainfull", "bosses/cainfull", a, cain_map(True), "ad2a3a") for p, a in
      (("hover", "idle"), ("fly", "fly"), ("dive", "lance"), ("hover", "cast"), ("hover", "hurt"), ("dive", "defeated"))],
    *[(p, "abel_crusnik100", "abel_crusnik100", p, abel100_map(), "8e1b2c") for p in ("hover", "fly", "dive")],
]

if __name__ == "__main__":
    for pose, entity, folder, anim, cmap, edge in JOBS:
        print(variant(C80.format(pose), pose, entity, folder, anim, cmap, edge).relative_to(ROOT))
    print(write_index(SPR).relative_to(ROOT))
