"""Room builder: assemble town rooms from parts (ground, buildings with floors, roofs, balconies, alleys) on a tile grid,
then write a Tiled .tmj with tile layers (terrain / back / facade) and a markers object layer.
Rooms sit on a world grid of screens (30x17 tiles); leaving through an open edge enters the neighbouring room."""
import json, random
from pathlib import Path

KIT = None  # loaded on first use: painted facades / interiors (tools/level/kit.py)

SW, SH, T = 30, 17, 16
ROOT = Path(__file__).resolve().parents[2]
TILES = json.loads((ROOT / "src/data/tiles.json").read_text())["tiles"]
GID = {t["name"]: t["gid"] for t in TILES}


class Room:
    def __init__(self, rid, title, gx, gy, sw, sh, seed=1, sky=True):
        self.id, self.title, self.gx, self.gy, self.sky = rid, title, gx, gy, sky
        self.W, self.H = sw * SW, sh * SH
        self.L = {name: [[None] * self.W for _ in range(self.H)] for name in ("terrain", "back", "facade", "shade")}
        self.markers = []
        self.gates = []  # (x0, y0, x1, y1, flag) in tiles
        self.exits = []  # (x0, y0, x1, y1, to, entry, requires) in tiles: doors (stand there, press up)
        self.images = []  # painted art placed in the room: dicts written as 'image' markers
        self.horizon = self.H  # street row (tiles); skylines stand on it
        self.rng = random.Random(seed)

    # --- painting helpers ---
    def put(self, layer, x, y, name):
        if 0 <= x < self.W and 0 <= y < self.H:
            self.L[layer][y][x] = name

    def fill(self, layer, x0, y0, x1, y1, name):
        for y in range(y0, y1):
            for x in range(x0, x1):
                self.put(layer, x, y, name)

    def ground(self, gy, x0=0, x1=None, top="cobble"):
        x1 = self.W if x1 is None else x1
        self.fill("terrain", x0, gy, x1, gy + 1, top)
        self.fill("terrain", x0, gy + 1, x1, self.H, "stone")

    def wall(self, x0, y0, x1, y1, name="stone"):
        self.fill("terrain", x0, y0, x1, y1, name)

    def edges(self, left=True, right=True, bottom=True, ground=None):
        """Close the room's sides below `ground` (open sky above for rooftop crossings), or fully."""
        top = 0 if ground is None else ground
        if left: self.wall(0, top, 1, self.H)
        if right: self.wall(self.W - 1, top, self.W, self.H)
        if bottom: self.wall(0, self.H - 1, self.W, self.H)

    def platform(self, x0, x1, y, name="plank"):
        self.fill("terrain", x0, y, x1, y + 1, name)

    def carve(self, x0, y0, x1, y1):
        """Open up space (caves, tunnels, doorways) in solid rock."""
        self.fill("terrain", x0, y0, x1, y1, None)

    def _kit(self):
        global KIT
        if KIT is None:
            from tools.level import kit as KIT
        return KIT

    def backwall(self, names, y0, y1, x0=0, x1=None):
        """Painted back wall (repeating panels) behind rows y0..y1-1."""
        x1 = self.W if x1 is None else x1
        # tall walls repeat in bands so the painting keeps its scale
        bands = max(1, round((y1 - y0) / 13))
        edges = [y0 + round(i * (y1 - y0) / bands) for i in range(bands + 1)]
        for i in range(bands):
            key = f"{self.id}_w{len(self.images)}"
            names_i = names[i % len(names):] + names[:i % len(names)]
            self.images.append(self._kit().interior(key, names_i, x0 * T, edges[i + 1] * T, (x1 - x0) * T, (edges[i + 1] - edges[i]) * T))

    def prop(self, name, x, y, h_px):
        """Painted prop standing with its bottom centre at tile x, on top of row y+1 (hanging props: give the row
        they hang from and a negative height to hang down)."""
        key = f"{self.id}_p{len(self.images)}"
        hang = h_px < 0
        im = self._kit().prop(key, name, abs(h_px))
        px = x * T + T // 2 - im["w"] // 2
        py = (y + 1) * T if not hang else y * T + abs(h_px)
        im.update({"x": px, "y": py})
        self.images.append(im)

    def ladder(self, x, y0, y1):
        """Ladder in column x from row y0 down to row y1-1 (put it just under the floor it leads up to)."""
        self.fill("terrain", x, y0, x + 1, y1, "ladder")

    def stairs(self, x, y, n, dir=1, depth=None):
        """Stone stair rising n steps of one tile from ground row y, going right (dir=1) or left."""
        for i in range(n):
            cx = x + i * dir
            self.fill("terrain", cx, y - i - 1, cx + 1, y if depth is None else y - i - 1 + depth, "step")

    def building(self, x, w, gy, floors, fh=6, doors=("left", "right"), balconies=(), roof_overhang=1, chimneys=1, lit=0.5,
                 upper_doors=(), climb="landing", hatch=True, plaster=None, facade=None, interiors=None):
        """A house: brick side walls, plank floors with a half-landing (jump 64 px), flat roof, facade over the inside.
        doors: 'left'/'right' ground-floor openings; balconies: floor numbers (1 = first floor) with an outside balcony
        and an opening on the right wall; upper_doors: (floor, side) openings without balcony."""
        top = gy - floors * fh  # roof row
        x1 = x + w - 1
        plaster = plaster or self.rng.choice(["plaster", "plaster", "plaster_ochre", "plaster_rose", "plaster_blue"])
        # the whole front and back wall first (no gaps at floor lines), then details
        self.fill("back", x + 1, top + 1, x1, gy, "wallpaper")
        self.fill("facade", x + 1, top + 1, x1, gy, plaster)
        # interior back wall and facade
        for f in range(floors):
            fy0, fy1 = gy - (f + 1) * fh + 1, gy - f * fh
            self.fill("back", x + 1, fy0, x1, fy1, "wallpaper")
            for wx in range(x + 3, x1 - 1, 5):
                self.put("back", wx, fy0 + 1, "back_window")
            for wx in range(x + 2, x1 - 1, 4):
                self.put("facade", wx, fy0 + 1, "window_lit" if self.rng.random() < lit else "window_dark")
                self.put("facade", wx, fy0 + 2, "plaster_dark")
            if f > 0:  # floor planks with beams below
                fy = gy - f * fh
                self.platform(x + 1, x1, fy)
                self.fill("back", x + 1, fy + 1, x1, fy + 2, "beam")
            # way up to the floor above: a half landing or a ladder (alternating sides)
            if f < floors - 1 or hatch:
                side_left = f % 2 == 0
                if climb == "ladder" or f == floors - 1:
                    lx = x + 2 if side_left else x1 - 2
                    self.ladder(lx, gy - (f + 1) * fh + 1, gy - f * fh)
                else:
                    ly = gy - f * fh - 3
                    lx = x + 2 if side_left else x1 - 6
                    self.platform(lx, lx + 4, ly)
        self.fill("facade", x + 1, top + 1, x1, top + 2, "cornice")
        # painted front (covers the whole house front, fades when you are inside) and painted rooms per floor
        global KIT
        if facade or interiors:
            if KIT is None:
                from tools.level import kit as KIT
        if facade:
            key = f"{self.id}_f{len(self.images)}"
            self.images.append(KIT.facade(key, facade, x * T, gy * T, w * T, (gy - top + 1) * T, self.L, x, x1, top, gy))
        if interiors:
            for f in range(floors):
                fy0, fy1 = gy - (f + 1) * fh + 1, gy - f * fh
                key = f"{self.id}_i{len(self.images)}"
                names = interiors[f % len(interiors):] + interiors[:f % len(interiors)]
                self.images.append(KIT.interior(key, names, (x + 1) * T, fy1 * T, (x1 - x - 1) * T, (fy1 - fy0) * T))
        # walls and roof
        self.wall(x, top, x + 1, gy, "brick")
        self.wall(x1, top, x1 + 1, gy, "brick")
        self.wall(x - roof_overhang, top, x1 + 1 + roof_overhang, top + 1, "roof")
        if hatch:  # trapdoor in the roof above the top-floor ladder
            hx = x + 2 if (floors - 1) % 2 == 0 else x1 - 2
            for dx in (-1, 0, 1):  # three tiles wide so the head clears the roof
                self.put("terrain", hx + dx, top, "plank")
        hatch_x = (x + 2 if (floors - 1) % 2 == 0 else x1 - 2) if hatch else None
        for c in range(chimneys):
            cx = x1 - 3 - c * max(3, (w - 4) // max(1, chimneys))
            if hatch_x is not None and abs(cx - hatch_x) < 4:
                continue  # never above the roof hatch
            self.wall(cx, top - 2, cx + 2, top, "chimney")
        # doors (3 tiles high) on the ground floor
        for side in doors:
            dx = x if side == "left" else x1
            self.fill("terrain", dx, gy - 3, dx + 1, gy, None)
            self.fill("facade", dx, gy - 3, dx + 1, gy, "door")
        for f, side in upper_doors:
            dx = x if side == "left" else x1
            fy = gy - f * fh
            self.fill("terrain", dx, fy - 3, dx + 1, fy, None)
        for f in balconies:
            fy = gy - f * fh
            self.fill("terrain", x1, fy - 3, x1 + 1, fy, None)
            self.platform(x1 + 1, x1 + 5, fy, "balcony")
        return top

    def street_props(self, x0, x1, gy, every=12, lamp_offset=4):
        """Gas lamps along a street, with the odd crate or barrel."""
        for x in range(x0 + lamp_offset, x1, every):
            self.mark("decor", x, gy - 1, item="lamp")
            if self.rng.random() < 0.4:
                self.mark("decor", x + 3, gy - 1, item=self.rng.choice(["crate", "barrel"]))

    def backstreet(self, x0, x1, gy, hmin=6, hmax=13):
        """A continuous row of houses behind the street (background only), with gabled tops and dim windows.
        Fills only cells still empty in the back layer, so buildings in front keep their own interiors."""
        x = x0
        tone = 0
        while x < x1:
            w = self.rng.randint(5, 9)
            h = self.rng.randint(hmin, hmax)
            top = gy - h
            tone ^= 1

            for cx in range(x, min(x + w, x1)):
                for y in range(top, gy):
                    if self.L["back"][y][cx] is None:
                        win = (cx - x) % 3 == 1 and (gy - y) % 3 == 2 and y < gy - 1
                        name = "back_house_b" if tone else "back_house"
                        if y == top:
                            name = "back_cornice"
                        elif win:
                            lit = self.rng.random() < 0.35
                            name = ("back_house_b_window" if tone else "back_house_window") if lit else "back_house_dark"
                        self.put("back", cx, y, name)
            # chimney
            cx = x + self.rng.randint(1, max(1, w - 2))
            if w >= 6 and cx < x1 and self.rng.random() < 0.6:
                for y in range(max(0, top - (w + 1) // 2 - 2), top):
                    if self.L["back"][y][cx] is None:
                        self.put("back", cx, y, "back_house")
            # gable
            for i in range((w + 1) // 2):
                for cx, nm in ((x + i, "back_roof_r"), (x + w - 1 - i, "back_roof_l")):
                    if x0 <= cx < x1 and self.L["back"][top - 1 - i][cx] is None:
                        self.put("back", cx, top - 1 - i, nm)
                for cx in range(x + i + 1, x + w - 1 - i):
                    if x0 <= cx < x1 and self.L["back"][top - 1 - i][cx] is None:
                        self.put("back", cx, top - 1 - i, "back_house")
            x += w

    def alley_back(self, x0, x1, y0, y1):
        self.fill("back", x0, y0, x1, y1, "alley_wall")

    def gate(self, x0, y0, x1, y1, flag):
        """A portcullis (solid until a lever sets `flag`). Tiles x0..x1-1, y0..y1-1."""
        self.gates.append((x0, y0, x1, y1, flag))

    def door(self, x0, y0, x1, y1, to, entry, requires=""):
        """A doorway into another room (not on the street grid, e.g. inside the cathedral): stand in it and press up.
        `requires` = a flag that must be set first (the door is sealed until then)."""
        self.exits.append((x0, y0, x1, y1, to, entry, requires))

    # --- markers ---
    def mark(self, kind, x, y, name="", **props):
        """x, y in tiles: (x, y) is the tile the thing stands ON TOP of minus one, i.e. feet at the top of row y+1."""
        self.markers.append((kind, x * T + T // 2, (y + 1) * T, name, props))

    def compute_shade(self):
        """Ambient-occlusion style shadows: darker just under anything solid or one-way above (eaves, floors,
        balconies, roofs), and in the cell next to a wall. Only on cells something is drawn in (not open sky)."""
        kinds = {t["name"]: t["kind"] for t in TILES}
        blocks = lambda x, y: 0 <= x < self.W and 0 <= y < self.H and kinds.get(self.L["terrain"][y][x]) in ("solid", "oneway")
        for y in range(self.H):
            for x in range(self.W):
                if blocks(x, y) or not (self.L["back"][y][x] or self.L["facade"][y][x]):
                    continue
                level = 0
                for d in (1, 2, 3):
                    if blocks(x, y - d):
                        level = 4 - d
                        break
                if blocks(x - 1, y) or blocks(x + 1, y):
                    level = min(3, level + 1)
                if level:
                    self.L["shade"][y][x] = f"shade{level}"

    # --- output ---
    def cathedral(self, x, w, gy, h, towers=(), rose_at=None):
        """A gothic church front: pale ashlar walls, buttresses, lancet windows, a rose window and towers.
        Not enterable (a backdrop you climb on); towers are solid with ledges."""
        top = gy - h
        self.fill("facade", x, top, x + w, gy, "gothic_face")
        self.wall(x, top, x + w, top + 1, "gothic_stone")                     # roof walk
        for bx in range(x, x + w, 6):                                           # buttresses (climbable ledges)
            self.wall(bx, top + 1, bx + 1, gy, "gothic_stone")
            for ly in range(gy - 5, top + 1, -5):
                self.platform(bx - 1, bx + 2, ly, "balcony")
        for wx in range(x + 3, x + w - 2, 6):
            self.put("facade", wx, top + 3, "lancet_top")
            for y in range(top + 4, top + 8):
                self.put("facade", wx, y, "lancet_mid")
        if rose_at is not None:
            self.put("facade", rose_at, top + 4, "rose")
        for tx, tw, th in towers:
            self.wall(tx, gy - th, tx + tw, gy - h, "gothic_stone")
            self.fill("terrain", tx + 1, gy - th + 2, tx + tw - 1, gy - h, None)
            self.fill("facade", tx + 1, gy - th + 2, tx + tw - 1, gy - h, "gothic_face")
            for y in range(gy - th + 4, gy - h, 4):
                self.put("facade", tx + tw // 2, y, "lancet_mid")
            self.platform(tx, tx + tw, gy - th, "balcony")
        return top

    def tmj(self):
        def data(layer):
            return [GID[c] if c else 0 for row in self.L[layer] for c in row]
        oid = 0
        objs = []
        for kind, px, py, name, props in self.markers:
            oid += 1
            o = {"id": oid, "name": name, "type": kind, "x": px, "y": py, "point": True, "width": 0, "height": 0, "rotation": 0, "visible": True}
            if props:
                o["properties"] = [{"name": k, "type": "int" if isinstance(v, int) else "string", "value": v} for k, v in props.items()]
            objs.append(o)
        self.compute_shade()
        layers = [{"id": i + 1, "name": n, "type": "tilelayer", "width": self.W, "height": self.H, "x": 0, "y": 0,
                   "opacity": 1, "visible": True, "data": data(n)} for i, n in enumerate(("back", "terrain", "facade", "shade"))]
        gobjs = []
        for x0, y0, x1, y1, flag in self.gates:
            oid += 1
            gobjs.append({"id": oid, "name": "", "type": "", "x": x0 * T, "y": y0 * T, "width": (x1 - x0) * T, "height": (y1 - y0) * T,
                          "rotation": 0, "visible": True, "properties": [{"name": "opens", "type": "string", "value": flag}]})
        layers.append({"id": 6, "name": "gates", "type": "objectgroup", "draworder": "topdown", "opacity": 1, "visible": True,
                       "x": 0, "y": 0, "objects": gobjs})
        eobjs = []
        for x0, y0, x1, y1, to, entry, requires in self.exits:
            oid += 1
            props = [{"name": "to", "type": "string", "value": to}, {"name": "entry", "type": "string", "value": entry},
                     {"name": "door", "type": "bool", "value": True}]
            if requires:
                props.append({"name": "requires", "type": "string", "value": requires})
            eobjs.append({"id": oid, "name": "", "type": "", "x": x0 * T, "y": y0 * T, "width": (x1 - x0) * T, "height": (y1 - y0) * T,
                          "rotation": 0, "visible": True, "properties": props})
        layers.append({"id": 7, "name": "exits", "type": "objectgroup", "draworder": "topdown", "opacity": 1, "visible": True,
                       "x": 0, "y": 0, "objects": eobjs})
        for im in self.images:
            oid += 1
            objs.append({"id": oid, "name": im["key"], "type": "image", "x": im["x"], "y": im["y"], "point": True, "width": 0, "height": 0,
                         "rotation": 0, "visible": True, "properties": [
                             {"name": "key", "type": "string", "value": im["key"]}, {"name": "w", "type": "int", "value": im["w"]},
                             {"name": "h", "type": "int", "value": im["h"]}, {"name": "layer", "type": "string", "value": im["layer"]}]})
        layers.append({"id": 5, "name": "markers", "type": "objectgroup", "draworder": "topdown", "opacity": 1, "visible": True,
                       "x": 0, "y": 0, "objects": objs})
        return {"type": "map", "version": "1.10", "tiledversion": "1.10.2", "orientation": "orthogonal", "renderorder": "right-down",
                "infinite": False, "width": self.W, "height": self.H, "tilewidth": T, "tileheight": T, "nextlayerid": 7,
                "nextobjectid": oid + 1,
                "tilesets": [{"firstgid": 1, "name": "istvan", "image": "../../../public/assets/tiles/istvan.png", "tilewidth": T,
                              "tileheight": T, "tilecount": len(TILES), "columns": len(TILES), "imagewidth": T * len(TILES), "imageheight": T}],
                "layers": layers,
                "properties": [{"name": "title", "type": "string", "value": self.title},
                               {"name": "gridX", "type": "int", "value": self.gx}, {"name": "gridY", "type": "int", "value": self.gy},
                               {"name": "sky", "type": "string", "value": self.sky if isinstance(self.sky, str) else ("open" if self.sky else "none")},
                               {"name": "horizon", "type": "int", "value": self.horizon * T}]}


def write(rooms, out):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.tmj"): old.unlink()
    for r in rooms:
        (out / f"{r.id}.tmj").write_text(json.dumps(r.tmj(), separators=(",", ":")) + "\n")
    print("wrote", len(rooms), "rooms")
