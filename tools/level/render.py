"""Renders every room in src/data/rooms at its world-grid position into one image (docs/level/world.png).
Usage: python3 -E -s -m tools.level.render [scale]"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
T, SW, SH = 16, 30, 17


def main(scale=0.25):
    sheet = Image.open(ROOT / "public/assets/tiles/istvan.png").convert("RGBA")
    tiles = [sheet.crop((i * T, 0, (i + 1) * T, T)) for i in range(sheet.width // T)]
    rooms = []
    for f in sorted((ROOT / "src/data/rooms").glob("*.tmj")):
        m = json.loads(f.read_text())
        p = {x["name"]: x["value"] for x in m.get("properties", [])}
        rooms.append((f.stem, m, p))
    gx0 = min(p["gridX"] for _, _, p in rooms); gy0 = min(p["gridY"] for _, _, p in rooms)
    gx1 = max(p["gridX"] + m["width"] // SW for _, m, p in rooms); gy1 = max(p["gridY"] + m["height"] // SH for _, m, p in rooms)
    W, H = (gx1 - gx0) * SW * T, (gy1 - gy0) * SH * T
    world = Image.new("RGBA", (W, H), (11, 10, 16, 255))
    d = ImageDraw.Draw(world)
    for rid, m, p in rooms:
        ox, oy = (p["gridX"] - gx0) * SW * T, (p["gridY"] - gy0) * SH * T
        sky = (36, 27, 46, 255) if p.get("sky", "open") == "open" else (20, 17, 28, 255)
        d.rectangle([ox, oy, ox + m["width"] * T - 1, oy + m["height"] * T - 1], fill=sky)
        for name in ("back", "terrain", "facade"):
            layer = next((l for l in m["layers"] if l["name"] == name), None)
            if not layer: continue
            for i, g in enumerate(layer["data"]):
                if g:
                    world.alpha_composite(tiles[g - 1], (ox + (i % m["width"]) * T, oy + (i // m["width"]) * T))
        for l in m["layers"]:
            for o in l.get("objects", []):
                c = {"enemy": (212, 40, 62), "checkpoint": (232, 200, 106), "lore": (127, 182, 214), "entry": (143, 178, 127)}.get(o.get("type"))
                if c: d.rectangle([ox + o["x"] - 6, oy + o["y"] - 22, ox + o["x"] + 6, oy + o["y"]], fill=c)
        d.rectangle([ox, oy, ox + m["width"] * T - 1, oy + m["height"] * T - 1], outline=(200, 190, 210), width=4)
        d.text((ox + 12, oy + 10), p.get("title", rid), fill=(240, 235, 245))
    out = world.resize((int(W * scale), int(H * scale)), Image.BOX)
    (ROOT / "docs/level").mkdir(parents=True, exist_ok=True)
    out.save(ROOT / "docs/level/world.png")
    print("world", out.size)


if __name__ == "__main__":
    main(float(sys.argv[1]) if len(sys.argv) > 1 else 0.25)
