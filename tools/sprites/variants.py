"""Colour/style variants of existing sprite sheets, kept inside the Requiem 48 palette (no new art needed).
Usage: python3 -I tools/sprites/variants.py   (from the repo root; rewrites the variant sheets and index.json)

  boss_cain       Cain, ground form: Abel's 80% look with white wings and coat, blond hair; the scythe is replaced by a gold lance.
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

REDS = {hx(h) for h in ("2e0811", "4a0f1b", "6a1524", "8e1b2c", "ad2a3a", "d4283e", "e85a5f", "f39a8f")}


def remove_scythe(im: Image.Image) -> list[list[tuple[int, int]]]:
    """Takes the red scythe out of each cell (pixels inside the body take the body's colour; the rest go clear).
    Returns the scythe's pixels per cell, so a lance can be laid along the same line."""
    px = im.load(); w, h = im.size
    cell = h  # sheets are one row of square cells
    found = [[] for _ in range(w // cell)]
    for y in range(h):
        for x in range(w):
            if px[x, y][3] and px[x, y][:3] in REDS:
                found[x // cell].append((x, y))
    for _ in range(3):
        for pts in found:
            for x, y in pts:
                if px[x, y][3] == 0 or px[x, y][:3] not in REDS: continue
                ns = [px[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < w and 0 <= y + dy < h]
                body = [n for n in ns if n[3] and n[:3] not in REDS]
                if len(body) >= 3:
                    px[x, y] = max(set(body), key=body.count)
    for pts in found:
        for x, y in pts:
            if px[x, y][3] and px[x, y][:3] in REDS: px[x, y] = (0, 0, 0, 0)
    peel_thin(im, {p for pts in found for p in pts})
    keep_largest(im, cell)
    return found


def peel_thin(im: Image.Image, scythe: set) -> None:
    """The blade's dark outline is a 1-px line hugging where the red was: near it, peel pixels with few neighbours."""
    px = im.load(); w, h = im.size
    near = {(x + dx, y + dy) for x, y in scythe for dx in range(-2, 3) for dy in range(-2, 3)}
    for _ in range(4):
        gone = []
        for x, y in near:
            if not (0 <= x < w and 0 <= y < h) or px[x, y][3] == 0: continue
            n = sum(1 for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx or dy) and 0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3])
            if n <= 3: gone.append((x, y))
        for q in gone: px[q] = (0, 0, 0, 0)


def keep_largest(im: Image.Image, cell: int) -> None:
    """In each cell keep only the biggest connected shape (the body): the blade's outline left floating goes."""
    px = im.load(); w, h = im.size
    for c in range(w // cell):
        seen = set(); parts = []
        for y in range(h):
            for x in range(c * cell, (c + 1) * cell):
                if px[x, y][3] == 0 or (x, y) in seen: continue
                stack = [(x, y)]; seen.add((x, y)); part = []
                while stack:
                    a, b = stack.pop(); part.append((a, b))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            n = (a + dx, b + dy)
                            if c * cell <= n[0] < (c + 1) * cell and 0 <= n[1] < h and n not in seen and px[n][3]:
                                seen.add(n); stack.append(n)
                parts.append(part)
        parts.sort(key=len)
        for part in parts[:-1]:
            for p in part: px[p] = (0, 0, 0, 0)


def draw_lance(im: Image.Image, scythes: list[list[tuple[int, int]]], length=74):
    """A gold lance along the line the scythe was held (its main axis), head toward the facing side (right)."""
    from math import atan2, cos, sin
    px = im.load(); h = im.size[1]
    SHAFT, SHADE, HEAD, LINE = hx("e8c86a"), hx("9c7a2c"), hx("ffffff"), hx("3b3444")
    for i, pts in enumerate(scythes):
        if len(pts) < 6: continue
        cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts)
        sxx = sum((p[0] - cx) ** 2 for p in pts); syy = sum((p[1] - cy) ** 2 for p in pts)
        sxy = sum((p[0] - cx) * (p[1] - cy) for p in pts)
        a = 0.5 * atan2(2 * sxy, sxx - syy)
        dx, dy = cos(a), sin(a)
        if dx < 0: dx, dy = -dx, -dy
        x0, x1 = i * h, (i + 1) * h
        def put(x, y, c):
            x, y = int(round(x)), int(round(y))
            if x0 <= x < x1 and 0 <= y < h: px[x, y] = c + (255,)
        for t in range(-length // 2, length // 2):
            x, y = cx + dx * t, cy + dy * t
            put(x, y + 1, LINE); put(x, y - 1, LINE)
        for t in range(-length // 2, length // 2):
            x, y = cx + dx * t, cy + dy * t
            put(x, y, SHAFT if t % 6 else SHADE)
        tx, ty = cx + dx * length / 2, cy + dy * length / 2  # the spearhead
        nx, ny = -dy, dx
        for k in range(8):
            wdt = 3 - k * 3 / 8
            for j in range(-int(wdt), int(wdt) + 1):
                put(tx + dx * k + nx * j, ty + dy * k + ny * j, HEAD if abs(j) < wdt - 0.5 else LINE)
        for j in (-3, -2, 2, 3):  # a small crossguard
            put(tx + nx * j, ty + ny * j, SHAFT)


def recolor(src: Path, dst: Path, cmap: dict, edge: str | None, lance: bool = False):
    im = Image.open(src).convert("RGBA")
    scythes = remove_scythe(im) if lance else None
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
    if scythes: draw_lance(out, scythes)
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst)

def variant(src_sheet: str, src_anim: str, entity: str, out_dir: str, anim: str, cmap: dict, edge: str | None, lance=False):
    src = SPR / src_sheet
    man = json.loads(src.with_suffix(".json").read_text())
    name = f"{entity}_{anim}"
    dst = SPR / out_dir / f"{name}.png"
    recolor(src, dst, cmap, edge, lance)
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

def guard_map():
    """Iron Choir -> imperial guard: grey steel becomes blue enamel, red cloth becomes gold."""
    return {"3b3444": "2f4a63", "4a4252": "2f4a63", "5c5464": "4f7c9e", "6f6676": "4f7c9e", "8a8392": "7fb6d6",
            "a59fb0": "7fb6d6", "b8b1c4": "bfe0ef", "2e0811": "7a4a1e", "4a0f1b": "a86b2a", "6a1524": "c4a04a", "8e1b2c": "e8c86a"}


def zealot_map():
    """Inquisition hunter -> Rosenkreuz zealot: dark crimson robes become black with a hot orange trim."""
    return {"2e0811": "14111c", "4a0f1b": "251f30", "6a1524": "d9963a", "8e1b2c": "e85a5f",
            "180f20": "2e0811", "241b2e": "4a0f1b", "2e2836": "4a0f1b"}


def folder_variant(src_dir: str, src_entity: str, entity: str, out_dir: str, cmap: dict, edge=None):
    """Every sheet of an enemy, recoloured under a new entity name (animation names unchanged)."""
    out = []
    for src in sorted((SPR / src_dir).glob(f"{src_entity}_*.png")):
        man = json.loads(src.with_suffix(".json").read_text())
        dst = SPR / out_dir / src.name.replace(src_entity, entity)
        recolor(src, dst, cmap, edge)
        if entity == "npc_astharoshe":
            im = Image.open(dst).convert("RGBA"); add_mitre(im, next(iter(man["animations"]))); im.save(dst)
        man["entity"] = entity
        man["sheet"] = dst.name
        man["variant_of"] = str(src.relative_to(SPR))
        dst.with_suffix(".json").write_text(json.dumps(man, indent=2, sort_keys=True) + "\n")
        out.append(dst)
    return out


def ion_map():
    """The blond young man in black -> Ion: a Methuselah noble in deep blue."""
    return {"0b0a10": "2f4a63", "14111c": "1c1826", "1c1826": "4f7c9e", "2e2836": "4f7c9e"}


def astharoshe_map():
    """The duellist nun -> Astharoshe (owner: blonde, in blue): the veil becomes blonde hair, crimson becomes blue."""
    return {"a59fb0": "c4a04a", "b8b1c4": "e8c86a", "ddd7e6": "f6e3a3", "efeaf2": "f6e3a3", "8a8392": "9c7a2c", "6f6676": "7a4a1e",
            "2e0811": "2f4a63", "4a0f1b": "4f7c9e", "6a1524": "7fb6d6", "8e1b2c": "bfe0ef", "180f20": "1c1826", "241b2e": "2f4a63",
            "32263e": "2f4a63", "41324f": "4f7c9e"}


# Where her head is in each pose (centre x, top y of the hood), read off zoomed frames; the fallen pose has none.
HEADS = {"dash": (69, 58), "idle": (55, 50), "leap": (54, 44), "slash1": (59, 52), "slash2": (55, 51)}


def add_mitre(im: Image.Image, anim: str) -> None:
    """Astharoshe (owner: blonde, in blue, with a mitre): blonde locks under a bishop's mitre on her head."""
    if anim not in HEADS:
        return
    px = im.load(); w, h = im.size
    cx, ty = HEADS[anim]
    BLUE, LIGHT, GOLD, LINE = hx("2f4a63"), hx("4f7c9e"), hx("e8c86a"), hx("0b0a10")
    HAIR, HAIR2 = hx("e8c86a"), hx("c4a04a")
    # blonde: the hood just under the mitre and one long lock down her back (the sprites face right)
    for y in range(ty + 1, min(h, ty + 11)):
        for x in range(cx - 4, cx + 3):
            if not (0 <= x < w) or not px[x, y][3]: continue
            r_, g_, b_ = px[x, y][:3]
            if r_ + g_ + b_ > 150: continue                       # the face and veil stay
            under_mitre = y <= ty + 3
            lock = x in (cx - 4, cx - 3) and y > ty + 3
            if under_mitre or lock:
                px[x, y] = (HAIR if (x + y) % 2 else HAIR2) + (255,)
    # the mitre: pointed arch, gold centre stripe, gold band on the brow; K outline, D shade side
    MITRE = [
        "...KK...",
        "..KGGK..",
        ".KLGGBK.",
        ".KLGGBK.",
        "KLLGGBDK",
        "KLLGGBDK",
        "KGGGGGGK",
    ]
    cols = {"K": LINE, "B": BLUE, "D": hx("1c1826"), "L": LIGHT, "G": GOLD}
    mx = cx - len(MITRE[0]) // 2
    my = ty - len(MITRE) + 2
    for j, row in enumerate(MITRE):
        for i, ch in enumerate(row):
            x, y = mx + i, my + j
            if ch != "." and 0 <= x < w and 0 <= y < h:
                px[x, y] = cols[ch] + (255,)


FOLDERS = [
    ("enemies/iron_choir", "enemy_iron_choir", "enemy_imperial_guard", "enemies/imperial_guard", guard_map()),
    ("enemies/inquisitor", "enemy_inquisitor", "enemy_zealot", "enemies/zealot", zealot_map()),
    ("npcs/dietrich", "npc_dietrich", "npc_ion", "npcs/ion", ion_map(), "0b0a10"),
    ("bosses/paula", "boss_paula", "npc_astharoshe", "npcs/astharoshe", astharoshe_map()),
]

if __name__ == "__main__":
    for src_dir, src_entity, entity, out_dir, cmap, *edge in FOLDERS:
        for d in folder_variant(src_dir, src_entity, entity, out_dir, cmap, *edge):
            print(d.relative_to(ROOT))
    for pose, entity, folder, anim, cmap, edge in JOBS:
        print(variant(C80.format(pose), pose, entity, folder, anim, cmap, edge, lance=entity.startswith("boss_cain")).relative_to(ROOT))
    print(write_index(SPR).relative_to(ROOT))
