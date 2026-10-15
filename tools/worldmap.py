"""Draws the world map plan (docs/level/region1-map.png) from the room grid below. Usage: python3 -I tools/worldmap.py"""
from PIL import Image, ImageDraw, ImageFont

CW, CH = 120, 68           # one screen-sized cell (30x17 tiles) on the map
PAD = 40
AREA = {"street": (70, 64, 92), "under": (40, 46, 66), "deep": (60, 30, 40), "cathedral": (96, 80, 50), "secret": (40, 70, 60)}
# id, title, x, y, w, h (cells), area
ROOMS = [
    ("station", "Istvan Station\n(start)", 0, 1, 2, 1, "street"),
    ("old_town", "Old Town Lane", 2, 1, 2, 1, "street"),
    ("rooftops", "Rooftops", 2, 0, 2, 1, "street"),
    ("square", "Market Square\n(hub, altar)", 4, 0, 2, 2, "street"),
    ("cathedral_square", "Cathedral Square\n(great doors)", 6, 0, 2, 1, "cathedral"),
    ("tavern", "Resistance\nTavern (altar)", 6, 1, 1, 1, "street"),
    ("bridge", "Danube Bridge", 7, 1, 3, 1, "street"),
    ("sewer_shaft", "Sewer\nShaft", 4, 2, 1, 2, "under"),
    ("crypt", "Hunter's Crypt", 2, 2, 2, 1, "under"),
    ("water_tunnels", "Water Tunnels", 5, 2, 2, 1, "under"),
    ("pumping", "Pumping Station\n(lever puzzle)", 7, 2, 2, 1, "under"),
    ("ossuary", "The Ossuary (3 levels)", 1, 3, 3, 1, "under"),
    ("reliquary", "Reliquary\n(secret)", 0, 3, 1, 1, "secret"),
    ("long_stair", "Long\nStair", 5, 3, 1, 2, "deep"),
    ("drowned", "Drowned Crypt", 6, 3, 3, 1, "deep"),
    ("chapel", "Chapel of\nBones (altar)", 4, 4, 1, 1, "deep"),
    ("ballroom", "Marchesa's Ballroom\n(BOSS 1)", 2, 4, 2, 1, "deep"),
    ("cellars", "Count's Cellars\n(after boss)", 6, 4, 2, 1, "deep"),
]
# Connections: (a, b, kind) kind: open | lever (shortcut opened from one side) | slide | leap (Crusnik leap, later) | story | oneway
LINKS = [
    ("station", "old_town", "open"), ("old_town", "square", "open"), ("old_town", "rooftops", "open"), ("rooftops", "square", "leap"),
    ("square", "cathedral_square", "open"), ("square", "tavern", "open"), ("tavern", "bridge", "open"), ("cathedral_square", "bridge", "leap"),
    ("square", "sewer_shaft", "oneway"), ("sewer_shaft", "water_tunnels", "open"), ("water_tunnels", "pumping", "open"),
    ("pumping", "bridge", "lever"), ("sewer_shaft", "ossuary", "open"), ("ossuary", "crypt", "open"), ("crypt", "old_town", "lever"),
    ("ossuary", "reliquary", "slide"), ("water_tunnels", "long_stair", "open"), ("long_stair", "drowned", "open"),
    ("long_stair", "chapel", "open"), ("chapel", "ballroom", "open"), ("ballroom", "cellars", "story"), ("drowned", "cellars", "leap"),
]
COL = {"open": (200, 190, 210), "lever": (217, 150, 58), "slide": (127, 182, 214), "leap": (212, 40, 62), "story": (240, 240, 240), "oneway": (150, 200, 120)}

def main():
    W = 10 * CW + PAD * 2; H = 5 * CH + PAD * 2 + 90
    im = Image.new("RGB", (W, H), (11, 10, 16)); d = ImageDraw.Draw(im)
    font = ImageFont.load_default()
    pos = {}
    for rid, title, x, y, w, h, area in ROOMS:
        x0, y0 = PAD + x * CW, PAD + y * CH
        d.rectangle([x0 + 2, y0 + 2, x0 + w * CW - 2, y0 + h * CH - 2], fill=AREA[area], outline=(140, 130, 150))
        d.multiline_text((x0 + 6, y0 + 6), title, fill=(230, 225, 235), font=font, spacing=2)
        pos[rid] = (x0 + w * CW / 2, y0 + h * CH / 2)
    for a, b, k in LINKS:
        (ax, ay), (bx, by) = pos[a], pos[b]
        d.line([ax, ay, bx, by], fill=COL[k], width=3 if k != "open" else 1)
    d.text((PAD, 8), "Region 1 — Istvan by night (plan). Surface streets above, undercity below, deep catacombs at the bottom.", fill=(230, 225, 235), font=font)
    ly = PAD + 5 * CH + 14
    for i, (k, c) in enumerate(COL.items()):
        lx = PAD + i * 160
        d.line([lx, ly + 6, lx + 30, ly + 6], fill=c, width=3)
        label = {"open": "open path", "lever": "shortcut (lever, one side)", "slide": "slide-only gap", "leap": "needs Crusnik leap (later)", "story": "opens after boss", "oneway": "one-way drop"}[k]
        d.text((lx + 36, ly), label, fill=(200, 195, 210), font=font)
    im = im.resize((W * 2, H * 2), Image.NEAREST)
    im.save("docs/level/region1-map.png")

if __name__ == "__main__":
    main()
