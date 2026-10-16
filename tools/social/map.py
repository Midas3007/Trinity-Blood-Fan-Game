"""Full-world map poster from the dumped room data (rooms.json). Usage: python3 -I map.py <rooms.json> <outdir>"""
import json, sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

rooms = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
F = "/usr/share/fonts/truetype/"
def font(name, size): return ImageFont.truetype(F + name, size)
TITLE = font("freefont/FreeSerifBold.ttf", 120)
SUB = font("freefont/FreeSerifItalic.ttf", 44)
NAME = font("freefont/FreeSerifBold.ttf", 30)
BOSS = font("freefont/FreeSerifBoldItalic.ttf", 30)
SMALL = font("freefont/FreeSerif.ttf", 30)
TINY = font("freefont/FreeSerifItalic.ttf", 26)

REGION = {
    "town": ["istvan_station", "old_town_lane", "clock_alley", "market_square", "cathedral_square", "hill_street", "danube_bridge"],
    "under": ["hunters_crypt", "sewer_shaft", "ossuary", "forgotten_reliquary", "water_tunnels", "long_stair", "drowned_crypt",
              "chapel_of_bones", "marchesa_ballroom", "count_cellars"],
    "cathedral": ["cathedral_nave", "bell_tower"],
    "fortress": ["castle_gate", "great_hall", "star_chamber"],
}
COL = {  # fill, rock, outline
    "town": ((44, 34, 62), (98, 84, 120), (196, 180, 214)),
    "under": ((24, 34, 40), (70, 92, 98), (150, 186, 190)),
    "cathedral": ((54, 18, 28), (128, 64, 76), (226, 160, 168)),
    "fortress": ((48, 36, 22), (116, 92, 58), (226, 200, 140)),
}
region_of = {rid: k for k, ids in REGION.items() for rid in ids}
BOSSES = {"paula": "Sister Paula", "kampfer": "The Magus", "marchesa": "The Marchesa", "petros": "Brother Petros",
          "dietrich": "Dietrich", "gyula": "Gyula"}

# The cathedral sits far above the street grid (entered through its portal): bring it down just above the town.
by = {r["id"]: r for r in rooms}
lift = -by["cathedral_nave"]["oy"] - by["cathedral_nave"]["h"] - 16 * 12
for r in rooms:
    if r["oy"] < 0: r["oy"] += lift

S = 0.24  # world px -> poster px
minx = min(r["ox"] for r in rooms); miny = min(r["oy"] for r in rooms)
maxx = max(r["ox"] + r["w"] for r in rooms); maxy = max(r["oy"] + r["h"] for r in rooms)
M, HEAD, FOOT = 90, 300, 230
W = int((maxx - minx) * S) + 2 * M
H = int((maxy - miny) * S) + HEAD + FOOT
def P(x, y): return (M + (x - minx) * S, HEAD + (y - miny) * S)

img = Image.new("RGB", (W, H), (12, 10, 16))
# faint vignette + parchment glow behind the map
glow = Image.new("L", (W, H), 0); gd = ImageDraw.Draw(glow)
gd.ellipse([W * 0.08, H * 0.12, W * 0.92, H * 0.98], fill=70)
glow = glow.filter(ImageFilter.GaussianBlur(160))
img = Image.composite(Image.new("RGB", (W, H), (40, 26, 44)), img, glow)
d = ImageDraw.Draw(img, "RGBA")

# rooms
for r in rooms:
    fill, rock, line = COL[region_of[r["id"]]]
    x0, y0 = P(r["ox"], r["oy"]); x1, y1 = P(r["ox"] + r["w"], r["oy"] + r["h"])
    d.rectangle([x0, y0, x1, y1], fill=fill)
    for s in r["solids"]:
        a = P(r["ox"] + s["x"], r["oy"] + s["y"]); b = P(r["ox"] + s["x"] + s["w"], r["oy"] + s["y"] + s["h"])
        d.rectangle([a[0], a[1], b[0] - 1, b[1] - 1], fill=rock)
    for s in r["oneways"]:
        a = P(r["ox"] + s["x"], r["oy"] + s["y"]); b = P(r["ox"] + s["x"] + s["w"], r["oy"] + s["y"])
        d.line([a, b], fill=rock + (255,), width=2)
    for l in r["ladders"]:
        a = P(r["ox"] + l["x"] + l["w"] / 2, r["oy"] + l["y"]); b = P(r["ox"] + l["x"] + l["w"] / 2, r["oy"] + l["y"] + l["h"])
        d.line([a, b], fill=(176, 140, 84, 255), width=2)
    d.rectangle([x0, y0, x1, y1], outline=line, width=3)

# cathedral link: the portal in Cathedral Square to the nave
cs, nv = by["cathedral_square"], by["cathedral_nave"]
a = P(cs["ox"] + 69 * 16 + 8, cs["oy"] + 20 * 16); b = P(nv["ox"] + 5 * 16, nv["oy"] + nv["h"])
n = 22
for i in range(n):
    if i % 2: continue
    t0, t1 = i / n, (i + 1) / n
    d.line([(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0), (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1)],
           fill=(226, 160, 168, 220), width=3)

def cross(x, y, s=11, c=(240, 206, 110)):
    d.rectangle([x - s * 0.22, y - s, x + s * 0.22, y + s * 0.9], fill=c)
    d.rectangle([x - s * 0.6, y - s * 0.55, x + s * 0.6, y - s * 0.15], fill=c)

def diamond(x, y, s=9, c=(150, 220, 236)):
    d.polygon([(x, y - s), (x + s, y), (x, y + s), (x - s, y)], fill=c, outline=(20, 20, 30))

def boss_mark(x, y, s=16):
    d.ellipse([x - s, y - s, x + s, y + s], fill=(170, 24, 46), outline=(255, 214, 214), width=3)
    d.polygon([(x - s * 0.6, y + s * 0.15), (x - s * 0.6, y - s * 0.5), (x - s * 0.3, y - s * 0.15), (x, y - s * 0.6),
               (x + s * 0.3, y - s * 0.15), (x + s * 0.6, y - s * 0.5), (x + s * 0.6, y + s * 0.15)], fill=(255, 226, 150))

def label(x, y, text, f, fill, anchor="la"):
    d.text((x, y), text, font=f, fill=fill, anchor=anchor, stroke_width=4, stroke_fill=(10, 8, 14))

for r in rooms:
    _, _, line = COL[region_of[r["id"]]]
    x0, y0 = P(r["ox"], r["oy"])
    for c in r["checkpoints"]:
        cross(*P(r["ox"] + c["x"], r["oy"] + c["y"] - 10))
    for it in r["items"]:
        diamond(*P(r["ox"] + it["x"], r["oy"] + it["y"] - 8))
    if r["boss"]:
        bx, byy = P(r["ox"] + r["boss"]["x"], r["oy"] + r["boss"]["y"] - 24)
        boss_mark(bx, byy)
        label(bx, byy + 24, BOSSES.get(r["boss"]["id"], r["boss"]["id"]), BOSS, (255, 190, 196), "ma")
for r in rooms:
    x0, y0 = P(r["ox"], r["oy"]); x1, _ = P(r["ox"] + r["w"], r["oy"])
    t = r["title"]
    f = NAME
    while d.textlength(t, font=f) > (x1 - x0) - 16 and f.size > 18: f = font("freefont/FreeSerifBold.ttf", f.size - 2)
    label(x0 + 9, y0 + 7, t, f, (246, 238, 230))
st = by["istvan_station"]; sx, sy = P(st["ox"] + 10 * 16, st["oy"] + 30 * 16)
d.polygon([(sx, sy - 22), (sx + 14, sy), (sx - 14, sy)], fill=(140, 214, 140), outline=(10, 30, 10))
label(sx + 18, sy - 30, "Start", SMALL, (180, 236, 180))

# region captions
def region_caption(ids, text):
    xs = [P(by[i]["ox"], 0)[0] for i in ids] + [P(by[i]["ox"] + by[i]["w"], 0)[0] for i in ids]
    ys = [P(0, by[i]["oy"])[1] for i in ids]
    label(min(xs) - 16, min(ys) + 4, text, TINY, (226, 170, 178), "ra")
region_caption(REGION["cathedral"], "THE CATHEDRAL  ·  through the portal")

# header
label(W / 2, 70, "ISTVAN BY NIGHT", TITLE, (240, 226, 214), "ma")
label(W / 2, 205, "The complete map  ·  a Trinity Blood fan Metroidvania", SUB, (214, 170, 176), "ma")

# legend
ly = H - FOOT + 70
items = [("cross", "Altar  (rest, save, fast travel)"), ("boss", "Boss"), ("diamond", "Hidden relic"), ("ladder", "Ladder")]
x = M + 40
for kind, text in items:
    if kind == "cross": cross(x, ly + 4, 16)
    elif kind == "boss": boss_mark(x, ly + 4, 18)
    elif kind == "diamond": diamond(x, ly + 4, 14)
    else: d.line([(x, ly - 16), (x, ly + 22)], fill=(176, 140, 84), width=5)
    label(x + 34, ly - 14, text, SMALL, (226, 218, 230))
    x += 70 + d.textlength(text, font=SMALL) + 60
x += 40
for k, text in (("town", "The Old Town"), ("under", "The Undercity"), ("cathedral", "The Cathedral"), ("fortress", "The Count's Fortress")):
    fill, rock, line = COL[k]
    d.rectangle([x, ly - 14, x + 44, ly + 20], fill=fill, outline=line, width=3)
    label(x + 56, ly - 14, text, SMALL, (226, 218, 230))
    x += 56 + d.textlength(text, font=SMALL) + 60
label(W / 2, H - 52, "Unofficial fan-made project. Not affiliated with or endorsed by the rights holders of Trinity Blood.  ·  by Midas3007",
      TINY, (140, 130, 150), "ma")
img.save(f"{OUT}/map_full.png", optimize=True)
print("map", img.size)

# 4:5 version for Instagram: west and east halves, split at a clean room boundary (x = 600 tiles), stacked.
split = M + (600 * 16 - minx) * S
town_top = P(0, 0)[1]; town_bot = P(0, 34 * 16)[1]
west = img.crop((M - 12, HEAD - 12, int(split) + 6, int(P(0, maxy)[1]) + 46))
east = img.crop((int(split) - 6, int(town_top) - 12, W - M + 12, int(town_bot) + 50))
CW, CH = 1080, 1350
canvas = Image.new("RGB", (CW, CH), (12, 10, 16))
dc = ImageDraw.Draw(canvas)
T2 = font("freefont/FreeSerifBold.ttf", 64); S2 = font("freefont/FreeSerifItalic.ttf", 28); N2 = font("freefont/FreeSerifItalic.ttf", 18)
L2 = font("freefont/FreeSerif.ttf", 22)
dc.text((CW / 2, 50), "ISTVAN BY NIGHT", font=T2, fill=(240, 226, 214), anchor="ma")
dc.text((CW / 2, 128), "The complete map", font=S2, fill=(214, 170, 176), anchor="ma")
sc = (CW - 40) / west.width
y = 190
for part, cap in ((west, "West: the Old Town, the Cathedral and the Undercity"), (east, "East: the bridge and the Count's fortress")):
    pr = part.resize((int(part.width * sc), int(part.height * sc)), Image.LANCZOS)
    canvas.paste(pr, ((CW - pr.width) // 2, y))
    y += pr.height + 8
    dc.text((CW / 2, y), cap, font=N2, fill=(190, 178, 200), anchor="ma")
    y += 56
# legend (drawn at this size)
d2 = ImageDraw.Draw(canvas)
def cross2(x, yy, s=9, c=(240, 206, 110)):
    d2.rectangle([x - s * 0.22, yy - s, x + s * 0.22, yy + s * 0.9], fill=c); d2.rectangle([x - s * 0.6, yy - s * 0.55, x + s * 0.6, yy - s * 0.15], fill=c)
rows = [[("cross", "Altar: rest, save, fast travel"), ("boss", "Boss"), ("diamond", "Hidden relic")],
        [("town", "Old Town"), ("under", "Undercity"), ("cathedral", "Cathedral"), ("fortress", "Fortress")]]
for row in rows:
    widths = [40 + d2.textlength(t, font=L2) for _, t in row]
    x = (CW - (sum(widths) + 40 * (len(row) - 1))) / 2
    for (k, t), wd in zip(row, widths):
        if k == "cross": cross2(x + 10, y + 12)
        elif k == "boss": d2.ellipse([x, y + 2, x + 22, y + 24], fill=(170, 24, 46), outline=(255, 214, 214), width=2)
        elif k == "diamond": d2.polygon([(x + 10, y + 2), (x + 20, y + 13), (x + 10, y + 24), (x, y + 13)], fill=(150, 220, 236))
        else:
            fill, rock, line = COL[k]; d2.rectangle([x, y + 2, x + 26, y + 24], fill=fill, outline=line, width=2)
        d2.text((x + 36, y + 1), t, font=L2, fill=(226, 218, 230))
        x += wd + 40
    y += 42
block = canvas.crop((0, 170, CW, y + 10))
canvas.paste((12, 10, 16), (0, 0, CW, CH))
top = (CH - 60 - block.height - 170) // 2 + 170
canvas.paste(block, (0, top))
dc.text((CW / 2, top - 150), "ISTVAN BY NIGHT", font=T2, fill=(240, 226, 214), anchor="ma")
dc.text((CW / 2, top - 72), "The complete map", font=S2, fill=(214, 170, 176), anchor="ma")
dc.text((CW / 2, 50 + (top - 190) // 2), "ISTVAN BY NIGHT", font=T2, fill=(240, 226, 214), anchor="ma") if False else None
dc.text((CW / 2, CH - 44), "Unofficial fan-made project. Not affiliated with or endorsed by the rights holders of Trinity Blood.", font=N2, fill=(140, 130, 150), anchor="ma")
canvas.save(f"{OUT}/map_instagram_4x5.png", optimize=True)
print("ig", canvas.size, "used height", y)
