"""Small catacomb critters drawn as original pixel art (Requiem palette): the bat and the bone-rat.
Writes sprite sheets + manifests in the sprite pipeline's format, then refreshes the sprite index.
Usage: python3 -E -s -m tools.critters"""
import json
from pathlib import Path

from PIL import Image

from tools.spritegen.build import write_index

H = lambda s: tuple(int(s[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
# key -> colour (Requiem 48 entries)
PAL = {
    "o": H("0b0a10"),  # outline / void
    "d": H("251f30"),  # deep shadow
    "k": H("3b3444"),  # dark grey-violet
    "m": H("5c5464"),  # mid
    "l": H("8a8392"),  # light
    "w": H("ddd7e6"),  # bone white
    "b": H("c9c2d6"),  # bone shade
    "r": H("ad2a3a"),  # red (eyes)
    "R": H("d4283e"),  # bright red
    "p": H("6a1524"),  # wing membrane (dark wine)
    "q": H("4a0f1b"),  # membrane shadow
}

BAT = {
    "fly0": [
        "........................",
        "o......................o",
        "oo....................oo",
        "opo..................opo",
        "oppo.......oo.......oppo",
        "oqppo....ooddoo....oppqo",
        ".oqppoo.odkkkkdo.ooppqo.",
        "..oqpppodkrkkrkdopppqo..",
        "...oqppodkkkkkkdoppqo...",
        "....oqqoodkkkkdooqqo....",
        ".....oo..odkkdo..oo.....",
        ".........o.oo.o.........",
        "........................",
        "........................",
        "........................",
        "........................",
    ],
    "fly1": [
        "........................",
        "........................",
        "........................",
        "...........oo...........",
        ".........ooddoo.........",
        "........odkkkkdo........",
        ".......odkrkkrkdo.......",
        "....ooodkkkkkkkdooo.....",
        "..oopppodkkkkkdopppoo...",
        ".oqppppqodkkkdoqppppqo..",
        "oqppqqoo.odkdo.ooqqppqo.",
        "oqqoo.....ooo.....ooqqo.",
        "ooo...............oooo..",
        "........................",
        "........................",
        "........................",
    ],
    "swoop": [
        "........................",
        "........................",
        "........................",
        "........................",
        "........................",
        "......oooo..............",
        "....oqpppqoo..oo........",
        "...oqppppppoooddoo......",
        "..oqqpppppodkkkkkdoo....",
        "...ooqqqqodkkrkkrkdo....",
        ".....oooodkkkkkkkkdo....",
        ".........ooddkkddoo.....",
        "...........oooooo.......",
        "........................",
        "........................",
        "........................",
    ],
}

RAT = {
    "walk0": [
        "........................",
        "........................",
        "........................",
        "...........ooooo........",
        ".........oowbbbwoo......",
        "..ooo...owbobobobwoooo..",
        ".o...o.owbbbbbbbbwbwwoo.",
        "o.....owbobobobobbwrwwwo",
        ".....owbbbbbbbbbbbwwwoo.",
        "......oowo.ow..owo.oo...",
        ".......wo...wo..wo......",
        "........................",
    ],
    "walk1": [
        "........................",
        "........................",
        "........................",
        "...........ooooo........",
        ".........oowbbbwoo......",
        "...oo...owbobobobwoooo..",
        "..o..o.owbbbbbbbbwbwwoo.",
        ".o....owbobobobobbwrwwwo",
        "o....owbbbbbbbbbbbwwwoo.",
        "......oow..owo..ow..oo..",
        "........wo..wo...wo.....",
        "........................",
    ],
    "bite": [
        "........................",
        "........................",
        "..................oooo..",
        "...........ooooooowwwwo.",
        ".........oowbbbbwwrwwwo.",
        "..ooo...owbobobobwwwo.o.",
        ".o...o.owbbbbbbbbbwwRwwo",
        "o.....owbobobobobbbwooo.",
        ".....owbbbbbbbbbbbwo....",
        "......oowo.ow..owo......",
        ".......wo...wo..wo......",
        "........................",
    ],
}

OUT = Path("public/assets/sprites/enemies")


def sheet(entity: str, frames: dict, anims: dict) -> None:
    # One transparent pixel of margin all round (the validator rejects art touching the cell edge).
    frames = {k: ["." * (len(rows[0]) + 2)] + ["." + r + "." for r in rows] for k, rows in frames.items()}
    names = list(frames)
    h = len(frames[names[0]])
    w = len(frames[names[0]][0])
    for name, rows in frames.items():
        assert len(rows) == h and all(len(r) == w for r in rows), f"{entity}/{name}: ragged pixel map"
    folder = OUT / entity.removeprefix("enemy_")
    folder.mkdir(parents=True, exist_ok=True)
    for anim, (frame_names, durations, loop) in anims.items():
        im = Image.new("RGBA", (w * len(frame_names), h), (0, 0, 0, 0))
        px = im.load()
        for i, fn in enumerate(frame_names):
            for y, row in enumerate(frames[fn]):
                for x, ch in enumerate(row):
                    if ch != ".":
                        px[i * w + x, y] = PAL[ch]
        stem = f"{entity}_{anim}"
        im.save(folder / f"{stem}.png")
        manifest = {
            "animations": {anim: {"durations_ms": durations, "events": [], "frames": list(range(len(frame_names))), "loop": loop}},
            "cell_height": h, "cell_width": w, "columns": len(frame_names), "entity": entity, "palette": "requiem48.hex",
            "pivot_x": w // 2, "pivot_y": h, "sheet": f"{stem}.png", "source_hashes": ["code:tools/critters.py"],
        }
        (folder / f"{stem}.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")


if __name__ == "__main__":
    sheet("enemy_bat", BAT, {"fly": (["fly0", "fly1"], [110, 110], True), "swoop": (["swoop"], [200], False)})
    sheet("enemy_bonerat", RAT, {"walk": (["walk0", "walk1"], [140, 140], True), "bite": (["bite"], [200], False)})
    print(write_index())
