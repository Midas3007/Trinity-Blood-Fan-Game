"""Draws the Istvan town tileset as original pixel art, palette-locked to Requiem 48.
Writes public/assets/tiles/istvan.png (16x16 tiles in one row) and src/data/tiles.json (names, kinds, layer).
Usage: python3 -I tools/tileset.py"""
import json, random
from pathlib import Path
from PIL import Image

T = 16
H = lambda s: tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
C = {k: H(v) for k, v in dict(
    void="0b0a10", k1="14111c", k2="1c1826", k3="251f30", k4="2e2836", g1="3b3444", g2="4a4252", g3="5c5464", g4="6f6676",
    g5="8a8392", g6="a59fb0", p1="180f20", p2="241b2e", p3="32263e", p4="41324f", r1="2e0811", r2="4a0f1b", r3="6a1524",
    r4="8e1b2c", b1="3d2512", b2="5a3618", b3="7a4a1e", b4="a86b2a", o1="d9963a", y1="9c7a2c", y2="c4a04a", y3="e8c86a",
    y4="f6e3a3", u1="2f4a63", u2="4f7c9e", u3="7fb6d6").items()}

def tile(fill=None):
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0) if fill is None else C[fill] + (255,))
    return im, im.load()

def rect(px, x0, y0, x1, y1, c):
    for y in range(y0, y1):
        for x in range(x0, x1):
            px[x, y] = C[c] + (255,)

def speckle(px, rng, cols, n, x0=0, y0=0, x1=T, y1=T):
    for _ in range(n):
        px[rng.randrange(x0, x1), rng.randrange(y0, y1)] = C[rng.choice(cols)] + (255,)

def bricks(px, rng, base, mortar, light, dark, bw=8, bh=4):
    rect(px, 0, 0, T, T, mortar)
    for row in range(T // bh):
        off = (bw // 2) * (row % 2)
        for col in range(-1, T // bw + 1):
            x0 = col * bw + off
            for y in range(row * bh, row * bh + bh - 1):
                for x in range(x0, x0 + bw - 1):
                    if 0 <= x < T:
                        px[x, y] = C[base] + (255,)
            if 0 <= x0 < T: px[x0, row * bh] = C[light] + (255,)
            if 0 <= x0 + bw - 2 < T: px[x0 + bw - 2, row * bh + bh - 2] = C[dark] + (255,)

TILES = []  # (name, kind, layer, image)
def add(name, kind, layer, im): TILES.append((name, kind, layer, im))

rng = random.Random(7)
# --- terrain (collision) ---
im, px = tile("g2"); rect(px, 0, 0, T, 3, "g4"); rect(px, 0, 3, T, 4, "k3")
for x in range(0, T, 5): rect(px, x, 4, x + 1, T, "g1")
speckle(px, rng, ["g3", "g1"], 14, 0, 4); add("cobble", "solid", "terrain", im)
im, px = tile("g1"); bricks(px, rng, "g1", "k3", "g2", "k4", 8, 8); add("stone", "solid", "terrain", im)
im, px = tile(); bricks(px, rng, "r2", "k3", "r3", "r1"); add("brick", "solid", "terrain", im)
im, px = tile(); rect(px, 0, 0, T, 4, "b3"); rect(px, 0, 0, T, 1, "b4"); rect(px, 0, 3, T, 4, "b1")
for x in (3, 11): px[x, 1] = C["b1"] + (255,)
add("plank", "oneway", "terrain", im)
im, px = tile("k4")
for y in range(0, T, 4):
    rect(px, 0, y, T, y + 3, "g2"); rect(px, 0, y, T, y + 1, "g3")
add("roof", "solid", "terrain", im)
im, px = tile(); rect(px, 0, 0, T, 2, "k1")
for x in range(0, T, 4): rect(px, x, 1, x + 1, 3, "g4")
rect(px, 0, 3, T, 4, "k3"); add("balcony", "oneway", "terrain", im)
im, px = tile()
for i in range(0, T, 4):
    for y in range(8, T):
        w = (y - 8) // 3
        rect(px, i + 2 - w // 2 if w else i + 2, y, i + 2 + max(1, w), y + 1, "g5" if y < 11 else "g3")
add("spikes", "spike", "terrain", im)
im, px = tile("k3"); bricks(px, rng, "k4", "k2", "g1", "k2"); add("chimney", "solid", "terrain", im)
im, px = tile(); rect(px, 3, 0, 5, T, "b2"); rect(px, 11, 0, 13, T, "b2")
for y in (2, 7, 12): rect(px, 3, y, 13, y + 2, "b3"); px[4, y] = C["b4"] + (255,)
add("ladder", "ladder", "terrain", im)
im, px = tile("g2"); rect(px, 0, 0, T, 2, "g5"); rect(px, 0, 2, T, 3, "g3"); speckle(px, rng, ["g1", "g3"], 8, 0, 3); rect(px, 0, 15, T, 16, "k3")
add("step", "solid", "terrain", im)
im, px = tile("u1"); rect(px, 0, 0, T, 2, "u2"); speckle(px, rng, ["u2", "k3"], 12, 0, 2); px[5, 0] = C["u3"] + (255,); px[11, 1] = C["u3"] + (255,)
add("water", "spike", "terrain", im)
im, px = tile("k4"); speckle(px, rng, ["k3", "g1"], 10); rect(px, 0, 0, T, 1, "k3"); add("back_house", "none", "back", im)
im, px = tile("k4"); rect(px, 4, 3, 12, 13, "k1"); rect(px, 5, 4, 11, 12, "b2"); rect(px, 7, 4, 9, 12, "k1"); rect(px, 5, 4, 7, 7, "b4")
add("back_house_window", "none", "back", im)
im, px = tile("k4"); rect(px, 4, 3, 12, 13, "k1"); rect(px, 5, 4, 11, 12, "k2"); rect(px, 7, 4, 9, 12, "k1")
add("back_house_dark", "none", "back", im)
im, px = tile()
for y in range(T):
    for x in range(T):
        if x >= T - 1 - y: px[x, y] = C["k4"] + (255,)
add("back_roof_r", "none", "back", im)
im, px = tile()
for y in range(T):
    for x in range(T):
        if x <= y: px[x, y] = C["k4"] + (255,)
add("back_roof_l", "none", "back", im)
for nm, base, spk in (("plaster_ochre", "y1", ["b4", "y2"]), ("plaster_rose", "b3", ["b4", "r3"]), ("plaster_blue", "u1", ["u2", "k4"])):
    im, px = tile(base); speckle(px, rng, spk, 10); add(nm, "none", "facade", im)
im, px = tile("g4"); bricks(px, rng, "g4", "g2", "g5", "g3", 16, 8); add("gothic_stone", "solid", "terrain", im)
im, px = tile("g4"); bricks(px, rng, "g4", "g2", "g5", "g3", 16, 8); add("gothic_face", "none", "facade", im)
im, px = tile("g4")
for y in range(T):
    half = max(1, min(5, y // 2 + 1))
    rect(px, 8 - half, y, 8 + half, y + 1, "k1")
    if y > 3: rect(px, 9 - half, y, 7 + half, y + 1, "r3" if (y // 3) % 2 else "u1")
add("lancet_top", "none", "facade", im)
im, px = tile("g4"); rect(px, 3, 0, 13, T, "k1"); rect(px, 4, 0, 12, T, "r3"); rect(px, 7, 0, 9, T, "k1"); rect(px, 4, 6, 12, 7, "k1"); rect(px, 4, 3, 7, 5, "y2"); rect(px, 9, 10, 12, 12, "u2")
add("lancet_mid", "none", "facade", im)
im, px = tile("g4")
for y in range(T):
    for x in range(T):
        dx, dy = x - 7.5, y - 7.5; d2 = dx * dx + dy * dy
        if d2 < 56: px[x, y] = C["k1"] + (255,)
        if d2 < 42: px[x, y] = C["r4" if (abs(dx) < 1 or abs(dy) < 1 or abs(abs(dx) - abs(dy)) < 1) else ("u2" if d2 > 16 else "y2")] + (255,)
add("rose", "none", "facade", im)
# --- back (interiors, drawn behind) ---
im, px = tile("p2")
for x in range(0, T, 4): rect(px, x, 0, x + 1, T, "p3")
speckle(px, rng, ["p1"], 6); add("wallpaper", "none", "back", im)
im, px = tile("p2"); rect(px, 3, 2, 13, 14, "k2"); rect(px, 4, 3, 12, 13, "u1"); rect(px, 7, 3, 9, 13, "k2"); rect(px, 4, 7, 12, 8, "k2")
px[5, 4] = C["u3"] + (255,); add("back_window", "none", "back", im)
im, px = tile("b1"); rect(px, 0, 0, T, 2, "b2"); rect(px, 0, 14, T, T, "k3"); add("beam", "none", "back", im)
im, px = tile("k3"); bricks(px, rng, "k4", "k2", "g1", "k1"); add("alley_wall", "none", "back", im)
# --- facade (front, fades when you go inside) ---
im, px = tile("g3"); speckle(px, rng, ["g4", "g2"], 10); add("plaster", "none", "facade", im)
im, px = tile("g3"); rect(px, 3, 2, 13, 15, "k1"); rect(px, 4, 3, 12, 14, "y2"); rect(px, 7, 3, 9, 14, "k1"); rect(px, 4, 8, 12, 9, "k1")
rect(px, 4, 3, 7, 7, "y3"); rect(px, 2, 14, 14, 16, "g5"); add("window_lit", "none", "facade", im)
im, px = tile("g3"); rect(px, 3, 2, 13, 15, "k1"); rect(px, 4, 3, 12, 14, "k3"); rect(px, 7, 3, 9, 14, "k1"); rect(px, 2, 14, 14, 16, "g5")
add("window_dark", "none", "facade", im)
im, px = tile("g3"); rect(px, 2, 0, 14, T, "b1"); rect(px, 3, 0, 13, T, "b2"); rect(px, 8, 0, 9, T, "b1"); px[11, 8] = C["y2"] + (255,)
add("door", "none", "facade", im)
im, px = tile("g3"); rect(px, 0, 0, T, 4, "g5"); rect(px, 0, 4, T, 5, "g1"); rect(px, 0, 12, T, 16, "g2"); add("cornice", "none", "facade", im)
im, px = tile("g2"); rect(px, 0, 0, T, 1, "g4"); add("plaster_dark", "none", "facade", im)

def main():
    root = Path(__file__).resolve().parent.parent
    sheet = Image.new("RGBA", (T * len(TILES), T), (0, 0, 0, 0))
    for i, (_, _, _, im) in enumerate(TILES): sheet.alpha_composite(im, (i * T, 0))
    (root / "public/assets/tiles").mkdir(parents=True, exist_ok=True)
    sheet.save(root / "public/assets/tiles/istvan.png")
    meta = {"_note": "Generated by tools/tileset.py. gid = index + 1 (0 = empty). kind: solid | oneway | spike | none.",
            "image": "assets/tiles/istvan.png", "tileSize": T,
            "tiles": [{"gid": i + 1, "name": n, "kind": k, "layer": l} for i, (n, k, l, _) in enumerate(TILES)]}
    (root / "src/data/tiles.json").write_text(json.dumps(meta, indent=1) + "\n")
    print(len(TILES), "tiles")

if __name__ == "__main__":
    main()
