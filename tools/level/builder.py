"""Room builder: assemble town rooms from parts (ground, buildings with floors, roofs, balconies, alleys) on a tile grid,
then write a Tiled .tmj with tile layers (terrain / back / facade) and a markers object layer.
Rooms sit on a world grid of screens (30x17 tiles); leaving through an open edge enters the neighbouring room."""
import json, random
from pathlib import Path

SW, SH, T = 30, 17, 16
ROOT = Path(__file__).resolve().parents[2]
TILES = json.loads((ROOT / "src/data/tiles.json").read_text())["tiles"]
GID = {t["name"]: t["gid"] for t in TILES}


class Room:
    def __init__(self, rid, title, gx, gy, sw, sh, seed=1, sky=True):
        self.id, self.title, self.gx, self.gy, self.sky = rid, title, gx, gy, sky
        self.W, self.H = sw * SW, sh * SH
        self.L = {name: [[None] * self.W for _ in range(self.H)] for name in ("terrain", "back", "facade")}
        self.markers = []
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

    def ladder(self, x, y0, y1):
        """Ladder in column x from row y0 down to row y1-1 (put it just under the floor it leads up to)."""
        self.fill("terrain", x, y0, x + 1, y1, "ladder")

    def stairs(self, x, y, n, dir=1, depth=None):
        """Stone stair rising n steps of one tile from ground row y, going right (dir=1) or left."""
        for i in range(n):
            cx = x + i * dir
            self.fill("terrain", cx, y - i - 1, cx + 1, y if depth is None else y - i - 1 + depth, "step")

    def building(self, x, w, gy, floors, fh=6, doors=("left",), balconies=(), roof_overhang=1, chimneys=1, lit=0.5,
                 upper_doors=(), climb="landing", hatch=True, plaster=None):
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
        # walls and roof
        self.wall(x, top, x + 1, gy, "brick")
        self.wall(x1, top, x1 + 1, gy, "brick")
        self.wall(x - roof_overhang, top, x1 + 1 + roof_overhang, top + 1, "roof")
        if hatch:  # trapdoor in the roof above the top-floor ladder
            hx = x + 2 if (floors - 1) % 2 == 0 else x1 - 2
            self.put("terrain", hx, top, "plank")
        for c in range(chimneys):
            cx = x + 2 + c * max(3, (w - 4) // max(1, chimneys))
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
        while x < x1:
            w = self.rng.randint(5, 9)
            h = self.rng.randint(hmin, hmax)
            top = gy - h
            for cx in range(x, min(x + w, x1)):
                for y in range(top, gy):
                    if self.L["back"][y][cx] is None:
                        win = (cx - x) % 3 == 1 and (gy - y) % 3 == 2 and y < gy - 1
                        name = "back_house"
                        if win:
                            name = "back_house_window" if self.rng.random() < 0.35 else "back_house_dark"
                        self.put("back", cx, y, name)
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

    # --- markers ---
    def mark(self, kind, x, y, name="", **props):
        """x, y in tiles: (x, y) is the tile the thing stands ON TOP of minus one, i.e. feet at the top of row y+1."""
        self.markers.append((kind, x * T + T // 2, (y + 1) * T, name, props))

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
        layers = [{"id": i + 1, "name": n, "type": "tilelayer", "width": self.W, "height": self.H, "x": 0, "y": 0,
                   "opacity": 1, "visible": True, "data": data(n)} for i, n in enumerate(("back", "terrain", "facade"))]
        layers.append({"id": 4, "name": "markers", "type": "objectgroup", "draworder": "topdown", "opacity": 1, "visible": True,
                       "x": 0, "y": 0, "objects": objs})
        return {"type": "map", "version": "1.10", "tiledversion": "1.10.2", "orientation": "orthogonal", "renderorder": "right-down",
                "infinite": False, "width": self.W, "height": self.H, "tilewidth": T, "tileheight": T, "nextlayerid": 5,
                "nextobjectid": oid + 1,
                "tilesets": [{"firstgid": 1, "name": "istvan", "image": "../../../public/assets/tiles/istvan.png", "tilewidth": T,
                              "tileheight": T, "tilecount": len(TILES), "columns": len(TILES), "imagewidth": T * len(TILES), "imageheight": T}],
                "layers": layers,
                "properties": [{"name": "title", "type": "string", "value": self.title},
                               {"name": "gridX", "type": "int", "value": self.gx}, {"name": "gridY", "type": "int", "value": self.gy},
                               {"name": "sky", "type": "string", "value": "open" if self.sky else "none"},
                               {"name": "horizon", "type": "int", "value": self.horizon * T}]}


def write(rooms, out):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.tmj"): old.unlink()
    for r in rooms:
        (out / f"{r.id}.tmj").write_text(json.dumps(r.tmj(), separators=(",", ":")) + "\n")
    print("wrote", len(rooms), "rooms")
