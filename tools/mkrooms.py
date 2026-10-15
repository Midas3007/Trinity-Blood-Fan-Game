"""Usage: python3 -I tools/mkrooms.py src/data/rooms
Generates Region 1 (Istvan undercity and catacombs) as Tiled .tmj maps. Re-run after edits; commit the .tmj files."""
import json, sys
from pathlib import Path
OUT = Path(sys.argv[1]); T = 16

def tmj(title, wt, ht, solids=(), markers=(), exits=(), hazards=(), gates=()):
    oid = [0]
    def obj(kind, x, y, w=None, h=None, name="", **props):
        oid[0] += 1
        o = {"id": oid[0], "name": name, "type": kind, "x": x, "y": y, "rotation": 0, "visible": True}
        if w is None: o.update(point=True, width=0, height=0)
        else: o.update(width=w, height=h)
        if props: o["properties"] = [{"name": k, "type": "int" if isinstance(v, int) else "string", "value": v} for k, v in props.items()]
        return o
    layers = []
    def layer(name, objs):
        layers.append({"id": len(layers) + 1, "name": name, "type": "objectgroup", "draworder": "topdown", "opacity": 1, "visible": True, "x": 0, "y": 0, "objects": objs})
    layer("solids", [obj("", *r) for r in solids])
    layer("hazards", [obj("", x, y, w, h, damage=d) for x, y, w, h, d in hazards])
    layer("gates", [obj("", x, y, w, h, opens=f) for x, y, w, h, f in gates])
    layer("exits", [obj("", x, y, w, h, to=t, entry=e) for x, y, w, h, t, e in exits])
    layer("markers", [obj(m[0], m[1], m[2], name=m[3] if len(m) > 3 else "", **(m[4] if len(m) > 4 else {})) for m in markers])
    return {"type": "map", "version": "1.10", "tiledversion": "1.10.2", "orientation": "orthogonal", "renderorder": "right-down",
            "infinite": False, "width": wt, "height": ht, "tilewidth": T, "tileheight": T, "nextlayerid": len(layers) + 1,
            "nextobjectid": oid[0] + 1, "tilesets": [], "layers": layers,
            "properties": [{"name": "title", "type": "string", "value": title}]}

F = 240                      # floor top for 17-tile rooms
W = lambda t: t * T
floor = lambda wt, y=F: (0, y, W(wt), 32)
def west(to, entry, y=F): return (0, y - 80, 16, 80, to, entry)
def east(wt, to, entry, y=F): return (W(wt) - 16, y - 80, 16, 80, to, entry)
E = lambda x, name, facing=1, y=F: ("entry", x, y, name, {"facing": facing})
enemy = lambda x, kind, y=F: ("enemy", x, y, "", {"enemy": kind})
lore = lambda x, lid, y=F: ("lore", x, y, "", {"lore": lid})
label = lambda x, y, text: ("label", x, y, "", {"text": text})

R = {}
R["undercity_gate"] = tmj("Istvan Undercity — The Water Gate", 60, 17,
  [floor(60), (220, 190, 80, 10), (360, 150, 80, 10), (500, 112, 70, 10), (630, 74, 110, 10), (820, 208, 40, 32), (150, 120, 30, 96)],
  [E(60, "start"), E(W(60) - 40, "east", -1), ("dummy", 300, F, "", {"maxHealth": 60, "contactDamage": 0}), ("dummy", 420, F, "", {"maxHealth": 60, "contactDamage": 0}),
   enemy(685, "thrall", 74), lore(100, "ax_orders"), label(165, 104, "stick down + DODGE = slide under")],
  exits=[east(60, "undercity_hall", "west")])
R["undercity_hall"] = tmj("Istvan Undercity — Flooded Hall", 60, 17,
  [(0, F, 400, 32), (448, F, W(60) - 448, 32), (400, 256, 48, 16), (560, 176, 96, 10)],
  [E(40, "west"), E(W(60) - 40, "east", -1), enemy(300, "thrall"), enemy(760, "thrall"), ("checkpoint", 620, F, "hall_altar"),
   lore(200, "hall_plaque"), label(424, 200, "jump the spikes"), label(620, 214, "altar: stick down to pray")],
  exits=[west("undercity_gate", "east"), east(60, "undercity_crypt", "west")], hazards=[(400, 248, 48, 8, 20)])
R["undercity_crypt"] = tmj("Istvan Undercity — Crypt of the Hunter", 45, 17,
  [floor(45), (0, 0, W(45), 16), (240, 184, 80, 10)],
  [E(40, "west"), E(W(45) - 40, "east", -1), enemy(420, "deathHunter"), ("lever", 600, F, "", {"flag": "crypt_gate"}),
   lore(150, "hunter_warning"), label(600, 196, "strike the lever")],
  exits=[west("undercity_hall", "east"), east(45, "undercity_shrine", "west")], gates=[(640, 16, 16, F - 16, "crypt_gate")])
R["undercity_shrine"] = tmj("Istvan Undercity — Wayside Shrine", 30, 17,
  [floor(30), (0, 0, W(30), 16)],
  [E(40, "west"), E(W(30) - 40, "east", -1), ("checkpoint", 300, F, "shrine_altar"), lore(140, "worshipper_note")],
  exits=[west("undercity_crypt", "east"), east(30, "catacomb_stair", "west")])
# Tall room: climb from the bottom-left to the top-right. A low crawlspace bottom-right hides the reliquary.
SF = 512; SW = 40
R["catacomb_stair"] = tmj("Catacombs — The Long Stair", SW, 34,
  [floor(SW, SF), (120, 464, 64, 10), (220, 416, 64, 10), (120, 368, 64, 10), (220, 320, 64, 10), (320, 272, 64, 10),
   (420, 224, 64, 10), (520, 176, 40, 10), (560, 128, W(SW) - 560, 10), (W(SW) - 64, 344, 64, 144)],
  [E(40, "west", 1, SF), E(W(SW) - 40, "east", -1, 128), E(W(SW) - 110, "reliquary", -1, SF),
   enemy(452, "thrall", 224), lore(300, "star_graffiti", SF), label(W(SW) - 120, 470, "a draught from below...")],
  exits=[west("undercity_shrine", "east", SF), (W(SW) - 16, 48, 16, 80, "ossuary", "west"), (W(SW) - 16, 488, 16, 24, "forgotten_reliquary", "west")])
R["forgotten_reliquary"] = tmj("Catacombs — Forgotten Reliquary (secret)", 20, 17,
  [floor(20), (0, 0, 64, 216), (64, 0, W(20) - 64, 16)],
  [E(80, "west", 1), lore(220, "crusnik_legend")],
  exits=[(0, 216, 16, 24, "catacomb_stair", "reliquary")])
R["ossuary"] = tmj("Catacombs — The Ossuary", 70, 17,
  [floor(70), (400, 190, 64, 10), (640, 170, 80, 10)],
  [E(40, "west"), E(W(70) - 40, "east", -1), enemy(300, "thrall"), enemy(560, "thrall"), enemy(860, "thrall"), lore(180, "ossuary_epitaph")],
  exits=[west("catacomb_stair", "east"), east(70, "flooded_crypt", "west")])
FW = 70
R["flooded_crypt"] = tmj("Catacombs — Drowned Crypt", FW, 17,
  [(0, F, 300, 32), (348, F, 292, 32), (688, F, W(FW) - 688, 32), (300, 256, 48, 16), (640, 256, 48, 16),
   (760, 190, 64, 10), (860, 150, 64, 10), (960, 110, W(FW) - 960, 10)],
  [E(40, "west"), E(W(FW) - 40, "east", -1), E(W(FW) - 40, "east_high", -1, 110), enemy(500, "deathHunter"), lore(120, "resistance_chalk")],
  exits=[west("ossuary", "east"), east(FW, "sewer_passage", "west"), (W(FW) - 16, 30, 16, 80, "resistance_hideout", "west")],
  hazards=[(300, 248, 48, 8, 20), (640, 248, 48, 8, 20)])
R["resistance_hideout"] = tmj("Catacombs — Resistance Hideout", 30, 17,
  [floor(30), (0, 0, W(30), 16)],
  [E(40, "west"), ("checkpoint", 240, F, "hideout_altar"), lore(380, "esther_prayer")],
  exits=[west("flooded_crypt", "east_high")])
SW2 = 80
R["sewer_passage"] = tmj("Catacombs — The Count's Sewer", SW2, 17,
  [floor(SW2), (0, 0, W(SW2), 16), (880, 190, 64, 10), (980, 150, 64, 10), (1080, 110, 64, 10)],
  [E(40, "west"), E(W(SW2) - 40, "east", -1), ("lever", 300, F, "", {"flag": "sewer_gate_a"}), ("lever", 1110, 110, "", {"flag": "sewer_gate_b"}),
   enemy(760, "deathHunter"), enemy(900, "thrall"), lore(180, "music_score"), label(1110, 70, "a second lever")],
  exits=[west("flooded_crypt", "east"), east(SW2, "chapel_of_bones", "west")],
  gates=[(600, 16, 16, F - 16, "sewer_gate_a"), (1200, 16, 16, F - 16, "sewer_gate_b")])
R["chapel_of_bones"] = tmj("Catacombs — Chapel of Bones", 40, 17,
  [floor(40), (0, 0, W(40), 16)],
  [E(40, "west"), E(W(40) - 40, "east", -1), ("checkpoint", 320, F, "chapel_altar"), lore(480, "marchesa_portrait")],
  exits=[west("sewer_passage", "east"), east(40, "marchesa_arena", "west")])
R["marchesa_arena"] = tmj("The Marchesa's Ballroom", 40, 17,
  [floor(40), (0, 0, W(40), 16), (160, 170, 64, 10), (W(40) - 224, 170, 64, 10)],
  [E(40, "west"), E(W(40) - 40, "east", -1), label(W(40) / 2, 120, "Something hangs from the ceiling on red strings. (boss: Milestone 7)")],
  exits=[west("chapel_of_bones", "east"), east(40, "cathedral_steps", "west")],
  gates=[(W(40) - 48, 16, 16, F - 16, "marchesa_defeated")])
R["cathedral_steps"] = tmj("Cathedral Undercroft", 30, 17,
  [floor(30), (0, 0, W(30), 16), (W(30) - 40, 16, 40, F - 16)],
  [E(40, "west"), lore(360, "cathedral_sealed")],
  exits=[west("marchesa_arena", "east")])

OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob("*.tmj"): old.unlink()
for name, data in R.items(): (OUT / f"{name}.tmj").write_text(json.dumps(data, indent=1) + "\n")
print("wrote", len(R))
