"""The Byzantine spear (owner, 2026-10-22: the Empire arc's second priest weapon), built from the sword sheets: in each
frame the sword's blade (the longest thin run of bright steel) is replaced by a long wooden shaft laid along the same
line, with a steel leaf-shaped head and a gold collar, and a long butt behind the hand. Writes abel_spear_* sheets.
Usage: python3 -I tools/sprites/spear.py
"""
import json, math, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SPR = ROOT / "public/assets/sprites"
sys.path.insert(0, str(ROOT))
from tools.spritegen.build import write_index  # noqa: E402

def hx(h): return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

STEEL = {hx(h) for h in ("ddd7e6", "ffffff", "efeaf2", "b8b1c4", "a59fb0", "8a8392")}
INK, WOOD, WOOD_HI = hx("0b0a10"), hx("5a3618"), hx("8a5a4c")
HEAD, HEAD_HI, HEAD_LO, GOLD = hx("b8b1c4"), hx("efeaf2"), hx("6f6676"), hx("c4a04a")
FORWARD, BUTT = 6, 16      # how far past the old blade tip the spear reaches, and how far the butt runs behind the hand


def blade(cell):
    """The sword's blade: the most elongated connected run of bright steel pixels (hair and face are round blobs)."""
    px = cell.load(); w, h = cell.size
    seen, best = set(), None
    for y in range(h):
        for x in range(w):
            if (x, y) in seen or not px[x, y][3] or px[x, y][:3] not in STEEL: continue
            comp, stack = [], [(x, y)]
            seen.add((x, y))
            while stack:
                cx, cy = stack.pop(); comp.append((cx, cy))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and px[nx, ny][3] and px[nx, ny][:3] in STEEL:
                            seen.add((nx, ny)); stack.append((nx, ny))
            if len(comp) < 4: continue
            xs = [p[0] for p in comp]; ys = [p[1] for p in comp]
            span = max(max(xs) - min(xs), max(ys) - min(ys))
            score = span * span / len(comp)                      # long and thin scores high
            if span >= 5 and (best is None or score > best[0]): best = (score, comp)
    return best[1] if best else None


def body_centre(cell):
    px = cell.load(); w, h = cell.size
    pts = [(x, y) for y in range(h) for x in range(w) if px[x, y][3] and px[x, y][:3] not in STEEL]
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def spear_cell(cell):
    out = cell.copy(); px = out.load(); w, h = out.size
    comp = blade(cell)
    if not comp: return out
    bc = body_centre(cell)
    # the blade's two ends: the farthest pair along its main line; the hilt is the one nearer the body
    a = max(comp, key=lambda p: (p[0] - bc[0]) ** 2 + (p[1] - bc[1]) ** 2)
    b = max(comp, key=lambda p: (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2)
    tip, hilt = a, b
    dx, dy = tip[0] - hilt[0], tip[1] - hilt[1]; n = math.hypot(dx, dy) or 1; ux, uy = dx / n, dy / n
    for p in comp: px[p] = (0, 0, 0, 0)                          # the sword goes
    def put(x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < w and 0 <= y < h: px[x, y] = c + (255,)
    length = n + FORWARD
    for k in range(-BUTT * 2, int(length * 2)):                 # the shaft, outlined
        t = k / 2
        x, y = hilt[0] + ux * t, hilt[1] + uy * t
        put(x - uy, y + ux, INK); put(x + uy, y - ux, INK)
    for k in range(-BUTT * 2, int(length * 2)):
        t = k / 2
        put(hilt[0] + ux * t, hilt[1] + uy * t, WOOD_HI if int(t) % 5 == 0 else WOOD)
    head0 = length - 7
    for k in range(0, 18):                                      # the leaf-shaped head
        t = head0 + k / 2
        half = 1.8 * math.sin(math.pi * min(1, k / 18 * 1.1)) + 0.3
        for jj in range(-4, 5):
            j = jj / 2
            if abs(j) > half: continue
            c = HEAD_HI if j < -0.4 else HEAD_LO if j > 0.6 else HEAD
            put(hilt[0] + ux * t - uy * j, hilt[1] + uy * t + ux * j, c)
    for j in (-1.5, -0.5, 0.5, 1.5):                            # gold collar under the head
        put(hilt[0] + ux * (head0 - 1) - uy * j, hilt[1] + uy * (head0 - 1) + ux * j, GOLD)
    return out


def build():
    for src in sorted((SPR / "abel_sword").glob("abel_sword_*.png")):
        if src.stem.endswith("execution"): continue              # the execution keeps the sword (a finisher)
        man = json.loads(src.with_suffix(".json").read_text())
        im = Image.open(src).convert("RGBA"); cw = man["cell_width"]
        out = Image.new("RGBA", im.size, (0, 0, 0, 0))
        for i in range(im.width // cw):
            out.alpha_composite(spear_cell(im.crop((i * cw, 0, (i + 1) * cw, im.height))), (i * cw, 0))
        name = src.name.replace("abel_sword_", "abel_spear_").replace("_sword", "_spear")
        dst = SPR / "abel_spear" / name
        dst.parent.mkdir(parents=True, exist_ok=True); out.save(dst)
        anims = {k.replace("sword", "spear"): v for k, v in man["animations"].items()}
        man.update(entity="abel_spear", sheet=dst.name, animations=anims, variant_of=str(src.relative_to(SPR)))
        dst.with_suffix(".json").write_text(json.dumps(man, indent=2, sort_keys=True) + "\n")
        print(dst.relative_to(ROOT))


if __name__ == "__main__":
    build()
    print(write_index(SPR).relative_to(ROOT))
