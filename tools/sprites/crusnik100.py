"""Abel at 100% and Cain, built from the 80% Crusnik sheets (owner, 2026-10-22; no new AI art):

  abel_crusnik100  the 80% look, but no shirt (a bare chest under the open coat), hair standing up, the 80% scythe
                   made double-sided, and the feathered wings turned gothic: bat / dragon / gargoyle wings with finger
                   bones, a scalloped membrane, claws at the tips and a horn at the wrist.
  boss_cain        (see variants.py) gets a grey knight's lance modelled on Brother Petros's: longer, with a long grip.

Per pose: where the body is (kept as drawn) and where the shoulders are (the wing roots). Everything else that is
not the scythe is wing. Usage: python3 -I tools/sprites/crusnik100.py [--debug out.png]
"""
import json, math, sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SPR = ROOT / "public/assets/sprites"
sys.path.insert(0, str(ROOT))
from tools.spritegen.build import write_index  # noqa: E402

def hx(h): return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

REDS = {hx(h) for h in ("2e0811", "4a0f1b", "6a1524", "8e1b2c", "ad2a3a", "d4283e", "e85a5f", "f39a8f")}
INK, DARK, MEM, MEM2, RIM = hx("0b0a10"), hx("0b0a10"), hx("1c1826"), hx("251f30"), hx("6a1524")
BONE, BONE_HI, CLAW = hx("3b3444"), hx("6f6676"), hx("b8b1c4")
SKIN, SKIN_HI, SKIN_LO = hx("dcb39a"), hx("efeaf2"), hx("b8826b")     # pale (owner: more pale)
EYE = hx("d4283e")
ABEL_HAIR = [hx("0b0a10"), hx("14111c"), hx("251f30"), hx("3b3444")]   # black, darkest first (owner)
CAIN_HAIR = [hx("7a4a1e"), hx("9c7a2c"), hx("c4a04a"), hx("e8c86a")]   # blond (owner)

# The head in each pose (cell coords): its box, the face inside it and the eyes; facing 1 = right, 0 = toward us.
# The 80% head is a tiny silver blob; it is repainted as hair and face (owner: "I can't see his face").
HEADS = {
    "hover": [dict(box=(61, 74, 67, 81), face=(62, 77, 66, 81), eyes=[(63, 78), (65, 78)], facing=0)],
    "fly": [dict(box=(74, 83, 81, 91), face=(78, 86, 81, 90), eyes=[(80, 87)], facing=1),
            dict(box=(73, 83, 81, 91), face=(78, 86, 81, 90), eyes=[(80, 87)], facing=1)],
    "dive": [dict(box=(77, 88, 83, 95), face=(80, 91, 83, 95), eyes=[(82, 92)], facing=1)],
}


def paint_head(im, h, hair, dx=0):
    """Repaints the head blob: hair (shaded by the old greys) round a pale face with red eyes."""
    px = im.load(); w, hh = im.size
    x0, y0, x1, y1 = h["box"]; fx0, fy0, fx1, fy1 = h["face"]
    for y in range(y0, y1 + 1):
        for x in range(x0 + dx, x1 + dx + 1):
            if not (0 <= x < w and 0 <= y < hh) or not px[x, y][3]: continue
            r, g, b = px[x, y][:3]
            lum = (r + g + b) / 3
            if fx0 + dx <= x <= fx1 + dx and fy0 <= y <= fy1:
                if lum < 30: continue                               # keep the outline
                px[x, y] = (SKIN_HI if lum > 200 else SKIN if lum > 120 else SKIN_LO) + (255,)
            else:
                px[x, y] = hair[min(3, int(lum / 64))] + (255,)
    for ex, ey in h["eyes"]:
        if 0 <= ex + dx < w: px[ex + dx, ey] = EYE + (255,)


# Per pose and cell: body polygon (cell coords; kept as drawn), shoulders (wing roots), head top (for the hair),
# chest polygon (bared). Read off zoomed frames. Everything outside the body that is not the scythe is wing.
POSES = {
    "hover": [dict(body=[(58, 72), (71, 72), (74, 84), (74, 104), (77, 110), (77, 128), (51, 128), (52, 110), (55, 104), (56, 84)],
                   shoulders=[(57, 86), (72, 86)], head=(64, 74), chest=[(60, 84), (68, 84), (65, 96), (63, 96)])],
    "fly": [dict(body=[(70, 82), (83, 82), (83, 98), (79, 106), (84, 112), (84, 128), (44, 128), (46, 108), (58, 100), (62, 92), (68, 89)],
                 shoulders=[(70, 90)], head=(77, 83), chest=[(73, 91), (79, 91), (77, 100), (74, 100)]),
            dict(body=[(70, 82), (85, 82), (85, 98), (80, 104), (80, 112), (78, 128), (46, 128), (48, 106), (60, 100), (64, 93)],
                 shoulders=[(70, 92)], head=(77, 83), chest=[(73, 92), (80, 92), (78, 101), (75, 101)])],
    "dive": [dict(body=[(70, 86), (87, 86), (87, 100), (82, 112), (82, 128), (46, 128), (48, 110), (62, 100), (64, 90)],
                  shoulders=[(71, 90)], head=(79, 87), chest=[(74, 94), (81, 94), (79, 102), (76, 102)])],
}
FINGERS = 4          # finger bones per wing (the leading arm is extra)
SPREAD = 1.15        # the new wings reach further than the feathered ones
SCALLOP = 0.4       # how deep each panel's trailing edge bows in (share of the panel's length)


def cells(im, cw):
    return [im.crop((i * cw, 0, (i + 1) * cw, im.height)) for i in range(im.width // cw)]


def poly_mask(size, pts):
    m = Image.new("L", size, 0); ImageDraw.Draw(m).polygon(pts, fill=255); return m


def wing_tips(pix, s):
    """Leading tip (the wing's highest point) then finger tips ordered round from it, from the old wing's outline."""
    ang = [math.atan2(y - s[1], x - s[0]) for x, y in pix]
    mx, my = sum(math.cos(a) for a in ang), sum(math.sin(a) for a in ang)
    mean = math.atan2(my, mx)
    rel = [((a - mean + math.pi) % (2 * math.pi)) - math.pi for a in ang]
    lo, hi = min(rel), max(rel)
    tips = []
    for k in range(FINGERS + 1):
        a0 = lo + (hi - lo) * k / (FINGERS + 1); a1 = lo + (hi - lo) * (k + 1) / (FINGERS + 1)
        best = max(((x - s[0]) ** 2 + (y - s[1]) ** 2, (x, y)) for (x, y), r in zip(pix, rel) if a0 <= r <= a1)[1]
        tips.append((s[0] + (best[0] - s[0]) * SPREAD, s[1] + (best[1] - s[1]) * SPREAD))
    if tips[-1][1] < tips[0][1]: tips.reverse()               # lead with the topmost tip
    return tips


def draw_wing(im, s, tips):
    """A gargoyle's wing: an arm from the shoulder to the wrist, fingers fanning from the wrist to the tips, a
    membrane between them bowed in at the trailing edge, claws at the tips and a horn at the wrist."""
    lead = tips[0]
    wrist = (s[0] + (lead[0] - s[0]) * 0.5, s[1] + (lead[1] - s[1]) * 0.5)
    outline = [s, wrist, lead]
    for p, q in zip(tips, tips[1:]):
        mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
        outline.append((mx + (wrist[0] - mx) * SCALLOP, my + (wrist[1] - my) * SCALLOP))
        outline.append(q)
    last = tips[-1]
    outline.append((s[0] + (last[0] - s[0]) * 0.35, s[1] + (last[1] - s[1]) * 0.35))
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    d.polygon(outline, fill=MEM + (255,), outline=INK + (255,))
    inner = [(s[0] + (x - s[0]) * 0.45, s[1] + (y - s[1]) * 0.45) for x, y in outline]
    d.polygon(inner, fill=DARK + (255,))                        # darker near the body
    for p, q in zip(outline[2:], outline[3:]):                  # a crimson rim along the scalloped edge
        d.line([p, q], fill=RIM + (255,), width=1)
    d.line([s, wrist], fill=BONE_HI + (255,), width=2)          # the arm
    d.line([wrist, lead], fill=BONE + (255,), width=1)
    for t in tips[1:]:
        d.line([wrist, t], fill=BONE + (255,), width=1)
    for t in tips:                                              # claws: a hook past each tip
        dx, dy = t[0] - wrist[0], t[1] - wrist[1]; n = math.hypot(dx, dy) or 1
        d.line([t, (t[0] + dx / n * 2, t[1] + dy / n * 2)], fill=BONE_HI + (255,), width=1)
    ox, oy = lead[1] - s[1], -(lead[0] - s[0]); n = math.hypot(ox, oy) or 1   # the wrist horn, pointing up and out
    if oy > 0: ox, oy = -ox, -oy
    d.polygon([(wrist[0] - 1, wrist[1]), (wrist[0] + 1, wrist[1]), (wrist[0] + ox / n * 5, wrist[1] + oy / n * 5)], fill=BONE_HI + (255,), outline=INK + (255,))
    im.alpha_composite(layer)


def double_scythe(im, red):
    """The 80% scythe, made double-sided: its pixels mirrored through the middle of the shaft (a blade at each end)."""
    if not red: return
    n = len(red); cx = sum(x for x, _ in red) / n; cy = sum(y for _, y in red) / n
    sxx = sum((x - cx) ** 2 for x, _ in red); syy = sum((y - cy) ** 2 for _, y in red); sxy = sum((x - cx) * (y - cy) for x, y in red)
    a = 0.5 * math.atan2(2 * sxy, sxx - syy); ux, uy = math.cos(a), math.sin(a)
    proj = [(x - cx) * ux + (y - cy) * uy for x, y in red]
    mid = (min(proj) + max(proj)) / 2
    # the shaft's line through the middle: the perpendicular offset of the pixels near the centre of the extent
    near = [((x - cx) * -uy + (y - cy) * ux) for (x, y), p in zip(red, proj) if abs(p - mid) < 4] or [0]
    off = sorted(near)[len(near) // 2]
    m = (cx + ux * mid - uy * off, cy + uy * mid + ux * off)
    px = im.load(); w, h = im.size
    for x, y in red:
        col = px[x, y]
        rx, ry = round(2 * m[0] - x), round(2 * m[1] - y)
        if 0 <= rx < w and 0 <= ry < h: px[rx, ry] = col


def bare_chest(im, chest):
    """The open coat with no shirt under it: the dark cloth inside the V becomes skin, lit from the left, with the
    sternum, the line under the chest and two rows of stomach muscle in shadow."""
    m = poly_mask(im.size, chest).load(); px = im.load(); w, h = im.size
    xs = [p[0] for p in chest]; ys = [p[1] for p in chest]
    cx = (min(xs) + max(xs)) / 2; top, bot = min(ys), max(ys)
    pec = top + (bot - top) * 0.38
    for y in range(h):
        for x in range(w):
            if not (0 < x < w - 1) or not m[x, y] or not px[x, y][3] or px[x, y][:3] in REDS: continue
            edge = not m[x - 1, y] or not m[x + 1, y]
            if edge: col = INK                                   # the coat's lapels
            elif abs(x - cx) < 0.6 or round(y) == round(pec) or (y > pec + 2 and (y - round(pec)) % 3 == 0): col = SKIN_LO
            elif x < cx: col = SKIN_HI
            else: col = SKIN
            px[x, y] = col + (255,)


def standing_hair(im, h):
    """Black hair standing up in spikes (owner: black, conical, spiky): a fan of cone-shaped spikes off the crown,
    the tallest in the middle, swept back away from where he faces."""
    x0, y0, x1, _ = h["box"]
    back = -1 if h["facing"] == 1 else 0
    cx = (x0 + x1) / 2
    mask = Image.new("L", im.size, 0); d = ImageDraw.Draw(mask)
    d.rectangle([x0, y0, x1, y0 + 2], fill=255)                 # the crown under the spikes
    for k, (deg, length) in enumerate(((-55, 6), (-28, 9), (0, 12), (28, 9), (55, 6))):
        a = math.radians(deg + back * 22)
        bx = cx + (k - 2) * 1.6
        tip = (bx + math.sin(a) * length, y0 + 1 - math.cos(a) * length)
        nx, ny = math.cos(a) * 1.6, math.sin(a) * 1.6
        d.polygon([(bx - nx, y0 + 2 - ny), (bx + nx, y0 + 2 + ny), tip], fill=255)
    mk = mask.load(); px = im.load(); w, hh = im.size
    fx0, fy0, fx1, fy1 = h["face"]
    for y in range(hh):
        for x in range(w):
            if not mk[x, y] or (fx0 <= x <= fx1 and fy0 <= y <= fy1): continue
            lit = 0 < x < w - 1 and not mk[x - 1, y] and y < y0          # lit edge on each spike's left side
            px[x, y] = (ABEL_HAIR[3] if lit else ABEL_HAIR[1]) + (255,)
    for y in range(hh):                                         # crimson rim round the spikes (the 100% glow)
        for x in range(w):
            if mk[x, y] or y >= y0 + 1: continue
            if any(0 <= x + ddx < w and 0 <= y + ddy < hh and mk[x + ddx, y + ddy] for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = RIM + (255,)


def build_cell(cell, cfg, head):
    im = cell.copy(); px = im.load(); w, h = im.size
    body = poly_mask(im.size, cfg["body"]).load()
    red = [(x, y) for y in range(h) for x in range(w) if px[x, y][3] and px[x, y][:3] in REDS]
    redset = set(red)
    wing = [(x, y) for y in range(h) for x in range(w) if px[x, y][3] and not body[x, y] and (x, y) not in redset]
    shoulders = cfg["shoulders"]
    groups = {s: [] for s in shoulders}
    for p in wing:
        s = min(shoulders, key=lambda s: abs(p[0] - s[0]) if len(shoulders) > 1 else 0)
        groups[s].append(p)
    for p in wing: px[p] = (0, 0, 0, 0)                          # the feathered wings go
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    for s, pix in groups.items():
        if len(pix) > 20: draw_wing(out, s, wing_tips(pix, s))   # new wings behind the body
    out.alpha_composite(im)
    double_scythe(out, red)
    bare_chest(out, cfg["chest"])
    paint_head(out, head, ABEL_HAIR)
    standing_hair(out, head)
    return out


def build():
    for pose, cfgs in POSES.items():
        src = SPR / f"abel_crusnik80/abel_crusnik80_{pose}.png"
        sheet = Image.open(src).convert("RGBA"); cw = sheet.height
        out = Image.new("RGBA", sheet.size, (0, 0, 0, 0))
        for i, (c, cfg, head) in enumerate(zip(cells(sheet, cw), cfgs, HEADS[pose])):
            out.alpha_composite(build_cell(c, cfg, head), (i * cw, 0))
        dst = SPR / f"abel_crusnik100/abel_crusnik100_{pose}.png"
        dst.parent.mkdir(parents=True, exist_ok=True); out.save(dst)
        man = json.loads(src.with_suffix(".json").read_text())
        man.update(entity="abel_crusnik100", sheet=dst.name, variant_of=str(src.relative_to(SPR)))
        dst.with_suffix(".json").write_text(json.dumps(man, indent=2, sort_keys=True) + "\n")
        print(dst.relative_to(ROOT))


def debug(out):
    rows = []
    for pose, cfgs in POSES.items():
        src = Image.open(SPR / f"abel_crusnik80/abel_crusnik80_{pose}.png").convert("RGBA")
        for c, cfg, head in zip(cells(src, src.height), cfgs, HEADS[pose]):
            rows += [build_cell(c, cfg, head)]
    W = sum(r.width for r in rows); sheet = Image.new("RGBA", (W, 80), (90, 90, 100, 255)); x = 0
    for r in rows: sheet.alpha_composite(r.crop((0, 48, r.width, 128)), (x, 0)); x += r.width
    sheet = sheet.crop((0, 0, W, 80)).resize((W * 4, 320), Image.NEAREST)
    half = sheet.width // 2
    top, bot = sheet.crop((0, 0, half, 320)), sheet.crop((half, 0, sheet.width, 320))
    both = Image.new("RGBA", (half, 640)); both.paste(top, (0, 0)); both.paste(bot, (0, 320)); both.save(out)


if __name__ == "__main__":
    if "--debug" in sys.argv: debug(sys.argv[sys.argv.index("--debug") + 1])
    else:
        build()
        print(write_index(SPR).relative_to(ROOT))
