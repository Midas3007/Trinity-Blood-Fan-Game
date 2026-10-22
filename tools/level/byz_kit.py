"""Byzantine building kit, derived from the approved Istvan kit (no new AI art): the painted houses re-coloured to
sandstone, whitewash and blue tile, their roofs replaced by painted domes with gold finials; the painted rooms re-coloured
blue and gold. Writes art/source/approved/kit/{house_byz_*,room_byz_*}.png; tools/level/kit.py bakes them to the
Requiem 48 palette like the originals. Usage: python3 -I tools/level/byz_kit.py
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
KIT = ROOT / "art/source/approved/kit"
WALL_SHARE = 0.78  # as tools/level/kit.py: the top 22% of a front is roof


def grade(img: Image.Image, matrix, lift=(0, 0, 0)) -> Image.Image:
    """Colour grade: rgb' = M @ rgb + lift (alpha kept)."""
    a = np.asarray(img.convert("RGBA")).astype(np.float32)
    rgb = a[..., :3] @ np.array(matrix, np.float32).T + np.array(lift, np.float32)
    a[..., :3] = np.clip(rgb, 0, 255)
    return Image.fromarray(a.astype(np.uint8), "RGBA")


SAND = [[0.95, 0.25, 0.05], [0.18, 0.80, 0.05], [0.05, 0.20, 0.55]]           # warm sandstone
WHITE = [[0.75, 0.25, 0.20], [0.30, 0.70, 0.20], [0.30, 0.30, 0.60]]          # whitewash (greyed, cooler)
TILE = [[0.40, 0.25, 0.10], [0.20, 0.65, 0.25], [0.15, 0.40, 0.75]]          # blue tile
INTERIOR = [[0.55, 0.20, 0.10], [0.15, 0.60, 0.25], [0.20, 0.35, 0.80]]      # lamp-blue rooms


def dome(w: int, h: int, body=(46, 84, 110), light=(150, 200, 214), rib=(214, 176, 92)) -> Image.Image:
    """A painted dome on a drum, lit from the upper left, with gold ribs and a finial."""
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    drum_h = int(h * 0.22)
    cx, base = w // 2, h - drum_h
    rx, ry = int(w * 0.42), int(h * 0.62)
    # the drum, with small arched windows
    d.rectangle([cx - rx, base, cx + rx, h], fill=(180, 160, 128, 255))
    for i in range(-3, 4):
        wx = cx + i * rx // 4
        d.rectangle([wx - w // 60, base + drum_h // 4, wx + w // 60, h - drum_h // 5], fill=(40, 32, 30, 255))
        d.ellipse([wx - w // 60, base + drum_h // 4 - w // 60, wx + w // 60, base + drum_h // 4 + w // 60], fill=(40, 32, 30, 255))
    d.rectangle([cx - rx - w // 40, base - h // 60, cx + rx + w // 40, base + h // 80], fill=(200, 180, 140, 255))  # cornice
    # the dome: horizontal bands shaded by height, lighter toward the upper left
    for y in range(base - ry, base):
        t = (base - y) / ry
        half = int(rx * np.sqrt(max(0.0, 1 - t * t)))
        for x in range(cx - half, cx + half):
            u = (x - (cx - half * 0.35)) / max(1, half)
            shade = max(0.0, min(1.0, 0.85 - 0.6 * abs(u) + 0.3 * t))
            col = tuple(int(body[k] + (light[k] - body[k]) * shade) for k in range(3))
            im.putpixel((x, y), col + (255,))
    # gold ribs, curving with the dome
    for k in range(-3, 4):
        pts = []
        for j in range(0, ry, 3):
            y = base - j
            t = j / ry
            half = rx * np.sqrt(max(0.0, 1 - t * t))
            pts.append((cx + k / 4 * half, y))
        d.line(pts, fill=rib + (255,), width=max(1, w // 120))
    # finial: a gold spike and orb
    top = base - ry
    d.line([(cx, top), (cx, top - h * 0.18)], fill=rib + (255,), width=max(2, w // 70))
    d.ellipse([cx - w // 40, top - h * 0.12, cx + w // 40, top - h * 0.12 + w // 20], fill=rib + (255,))
    return im.filter(ImageFilter.SMOOTH)


def byz_house(src: str, out: str, matrix, lift=(0, 0, 0), dome_body=(46, 84, 110)) -> None:
    img = grade(Image.open(KIT / f"{src}.png"), matrix, lift)
    w, h = img.size
    roof_h = int(h * (1 - WALL_SHARE))
    a = np.asarray(img).copy()
    a[:roof_h, :, 3] = 0                                  # the old roof goes
    img = Image.fromarray(a, "RGBA")
    dm = dome(w, roof_h + int(h * 0.02), body=dome_body)
    img.alpha_composite(dm, (0, 0))
    img.save(KIT / f"{out}.png")


def byz_arcade(out: str) -> None:
    """The Roman arcade painting without its flooded floor (the lower quarter), warmed to sandstone."""
    img = Image.open(KIT / "wall_roman.png").convert("RGBA")
    w, h = img.size
    dry = img.crop((0, 0, w, int(h * 0.74))).resize((w, h), Image.Resampling.LANCZOS)
    grade(dry, SAND, (12, 6, 0)).save(KIT / f"{out}.png")


def byz_room(src: str, out: str) -> None:
    grade(Image.open(KIT / f"{src}.png"), INTERIOR, (6, 4, 14)).save(KIT / f"{out}.png")


if __name__ == "__main__":
    byz_house("house_ochre", "house_byz_sand", SAND, (10, 4, 0), dome_body=(40, 78, 100))
    byz_house("house_rose", "house_byz_white", WHITE, (30, 30, 34), dome_body=(52, 96, 122))
    byz_house("house_blue", "house_byz_tile", TILE, (0, 6, 14), dome_body=(120, 92, 40))
    byz_house("house_gothic", "house_byz_stone", SAND, (4, 2, 0), dome_body=(36, 70, 90))
    byz_arcade("wall_byz_arcade")
    for src in ("room_poor", "room_stair", "room_tavern"):
        byz_room(src, src.replace("room_", "room_byz_"))
    print("byzantine kit written")
