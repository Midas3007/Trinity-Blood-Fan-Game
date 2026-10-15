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
    def __init__(self, rid, title, gx, gy, sw, sh, seed=1):
        self.id, self.title, self.gx, self.gy = rid, title, gx, gy
        self.W, self.H = sw * SW, sh * SH
        self.L = {name: [[None] * self.W for _ in range(self.H)] for name in ("terrain", "back", "facade")}
        self.markers = []
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

    def building(self, x, w, gy, floors, fh=6, doors=("left",), balconies=(), roof_overhang=1, chimneys=1, lit=0.5,
                 upper_doors=()):
        """A house: brick side walls, plank floors with a half-landing (jump 64 px), flat roof, facade over the inside.
        doors: 'left'/'right' ground-floor openings; balconies: floor numbers (1 = first floor) with an outside balcony
        and an opening on the right wall; upper_doors: (floor, side) openings without balcony."""
        top = gy - floors * fh  # roof row
        x1 = x + w - 1
        # interior back wall and facade
        for f in range(floors):
            fy0, fy1 = gy - (f + 1) * fh + 1, gy - f * fh
            self.fill("back", x + 1, fy0, x1, fy1, "wallpaper")
            for wx in range(x + 3, x1 - 1, 5):
                self.put("back", wx, fy0 + 1, "back_window")
            self.fill("facade", x + 1, fy0, x1, fy1, "plaster")
            for wx in range(x + 2, x1 - 1, 4):
                self.put("facade", wx, fy0 + 1, "window_lit" if self.rng.random() < lit else "window_dark")
                self.put("facade", wx, fy0 + 2, "plaster_dark")
            if f > 0:  # floor planks with beams below
                fy = gy - f * fh
                self.platform(x + 1, x1, fy)
                self.fill("back", x + 1, fy + 1, x1, fy + 2, "beam")
            # half landing to reach the floor above (alternating sides)
            if f < floors - 1:
                ly = gy - f * fh - 3
                lx = x + 2 if f % 2 == 0 else x1 - 6
                self.platform(lx, lx + 4, ly)
        self.fill("facade", x + 1, top + 1, x1, top + 2, "cornice")
        # walls and roof
        self.wall(x, top, x + 1, gy, "brick")
        self.wall(x1, top, x1 + 1, gy, "brick")
        self.wall(x - roof_overhang, top, x1 + 1 + roof_overhang, top + 1, "roof")
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

    def alley_back(self, x0, x1, y0, y1):
        self.fill("back", x0, y0, x1, y1, "alley_wall")

    # --- markers ---
    def mark(self, kind, x, y, name="", **props):
        """x, y in tiles: (x, y) is the tile the thing stands ON TOP of minus one, i.e. feet at the top of row y+1."""
        self.markers.append((kind, x * T + T // 2, (y + 1) * T, name, props))

    # --- output ---
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
                               {"name": "gridX", "type": "int", "value": self.gx}, {"name": "gridY", "type": "int", "value": self.gy}]}


def write(rooms, out):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.tmj"): old.unlink()
    for r in rooms:
        (out / f"{r.id}.tmj").write_text(json.dumps(r.tmj(), separators=(",", ":")) + "\n")
    print("wrote", len(rooms), "rooms")
