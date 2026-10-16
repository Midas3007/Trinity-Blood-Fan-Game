"""Region 1, area 2: the undercity and catacombs beneath Istvan. Imported by tools/level/istvan.py (one world).
Underground rooms start as solid rock and are carved out; doorways line up with neighbours on the world grid."""
from tools.level.builder import Room

DOOR = (10, 15)   # doorway rows (local) in one-screen-tall rooms: rows 10..14, floor at row 15


def rock(rid, title, gx, gy, sw, sh, seed):
    r = Room(rid, title, gx, gy, sw, sh, seed=seed, sky=False)
    r.wall(0, 0, r.W, r.H, "stone")
    return r


def door(r, side, y0=DOOR[0], y1=DOOR[1]):
    x = 0 if side == "west" else r.W - 1
    r.carve(x, y0, x + 1, y1)


def crypt():
    r = rock("hunters_crypt", "Hunter's Crypt", 7, 2, 4, 1, 21)
    r.carve(1, 3, r.W - 1, 15)
    door(r, "west"); door(r, "east")
    r.backwall(["wall_crypt"], 3, 15)
    # the well up into Bellmakers' Alley: a shaft with a ladder; the grate above opens from the lever down here
    r.carve(22, 0, 25, 3)
    r.ladder(23, 0, 15)
    r.mark("lever", 27, 14, flag="well_open")
    r.mark("lore", 20, 14, lore="well_rope")
    r.fill("terrain", 53, 14, 56, 15, "spikes")
    r.platform(64, 72, 10)
    r.prop("coffin", 40, 14, 22)
    r.prop("coffin", 46, 14, 22)
    r.prop("statue_saint", 104, 14, 52)
    r.prop("cage", 68, 3, -44)
    r.mark("lore", 12, 14, lore="hunter_warning")
    r.mark("enemy", 34, 14, enemy="thrall")
    r.mark("enemy", 86, 14, enemy="deathHunter")
    r.mark("enemy", 60, 14, enemy="boneRat")
    r.mark("enemy", 96, 14, enemy="boneRat")
    r.mark("enemy", 78, 8, enemy="bat")
    r.mark("item", 116, 14, item="sword")                        # the far end of the crypt
    r.mark("item", 68, 9, item="heart3")                         # the high ledge (a Crusnik leap)
    return r


def ossuary():
    r = rock("ossuary", "The Ossuary", 4, 2, 3, 2, 22)
    r.carve(1, 2, r.W - 1, 15)       # upper level
    r.carve(1, 17, r.W - 1, 24)      # middle level
    r.carve(1, 26, r.W - 1, 32)      # lower level
    door(r, "east")
    r.backwall(["wall_ossuary"], 2, 32)
    # ladders between levels (plank at the top so you climb through)
    r.ladder(17, 16, 24); r.put("terrain", 17, 15, "plank")
    r.ladder(66, 25, 32); r.put("terrain", 66, 24, "plank")
    r.carve(40, 15, 46, 17)          # a hole to drop from the upper level
    # the reliquary: a gate at the lower west end, its lever on a high ledge
    r.carve(0, 26, 1, 32)
    r.gate(1, 26, 3, 32, "reliquary_gate")
    r.platform(3, 9, 6, "balcony")
    r.mark("lever", 5, 5, flag="reliquary_gate")
    r.ladder(8, 7, 15)               # up to the lever ledge
    r.platform(10, 14, 10, "balcony")
    for x in (24, 52, 76):
        r.prop("bones", x, 14, 18)
    r.prop("bones", 30, 23, 16)
    r.prop("statue_saint", 84, 31, 48)
    r.mark("lore", 70, 14, lore="ossuary_epitaph")
    r.mark("enemy", 50, 14, enemy="thrall")
    r.mark("enemy", 34, 23, enemy="thrall")
    r.mark("enemy", 54, 31, enemy="methuselah")
    r.mark("enemy", 34, 12, enemy="fairy")
    r.mark("enemy", 72, 20, enemy="fairy")
    r.mark("enemy", 50, 31, enemy="boneRat")
    r.mark("item", 11, 9, item="tea4")                           # the ledge beside the lever
    return r


def reliquary():
    r = rock("forgotten_reliquary", "Forgotten Reliquary", 3, 3, 1, 1, 23)
    r.carve(2, 8, r.W - 1, 15)
    r.carve(r.W - 1, 9, r.W, 15)     # doorway from the ossuary's lower level
    r.backwall(["wall_crypt"], 8, 15, 2, r.W - 1)
    r.prop("statue_saint", 8, 14, 48)
    r.mark("lore", 18, 14, lore="crusnik_legend")
    # Mini boss 2: the Magus waits by the page. Abel's first Crusnik transformation happens in this fight.
    r.mark("boss", 9, 14, boss="kampfer", arenaLeft=2 * 16, arenaRight=28 * 16, defeatFlag="kampfer_defeated",
           intro="kampfer_intro", outro="kampfer_outro")
    return r


def water_tunnels():
    r = rock("water_tunnels", "The Water Tunnels", 12, 3, 4, 1, 24)
    r.carve(1, 3, r.W - 1, 15)
    door(r, "west"); door(r, "east")
    r.backwall(["wall_roman"], 3, 15)
    for x0 in (30, 70):
        r.fill("terrain", x0, 15, x0 + 4, 16, "water")
    r.platform(48, 56, 10)
    r.prop("column", 20, 14, 64)
    r.prop("column", 96, 14, 64)
    r.mark("enemy", 22, 14, enemy="thrall")
    r.mark("enemy", 86, 14, enemy="methuselah")
    r.mark("enemy", 82, 8, enemy="bat")
    r.mark("enemy", 100, 14, enemy="boneRat")
    # Mini boss 1: Sister Paula holds the flat middle stretch between the two cisterns.
    r.mark("boss", 60, 14, boss="paula", arenaLeft=36 * 16, arenaRight=66 * 16, defeatFlag="paula_defeated",
           intro="paula_intro", outro="paula_outro")
    r.mark("item", 51, 9, item="tea5")                           # the high ledge over the arena
    return r


def long_stair():
    r = rock("long_stair", "The Long Stair", 16, 3, 1, 3, 25)
    r.carve(1, 1, r.W - 1, 49)
    door(r, "west")                                  # from the water tunnels (top)
    r.wall(1, 15, 9, 17)                             # landing
    door(r, "east", 27, 32)                          # to the drowned crypt
    r.wall(21, 32, r.W - 1, 34)
    door(r, "west", 44, 49)                          # to the chapel (bottom)
    r.backwall(["wall_roman", "wall_crypt"], 1, 49)
    for i, y in enumerate(range(19, 49, 4)):
        x0 = 10 if i % 2 == 0 else 16
        r.platform(x0, x0 + 6, y)
    r.prop("cage", 22, 1, -48)
    r.mark("enemy", 13, 22, enemy="methuselah")
    r.mark("enemy", 15, 20, enemy="fairy")
    r.mark("enemy", 12, 36, enemy="bat")
    r.mark("item", 12, 18, item="tea6")                          # off the stair, on the west ledge
    return r


def drowned():
    r = rock("drowned_crypt", "The Drowned Crypt", 17, 4, 3, 2, 26)
    r.carve(1, 2, r.W - 1, 32)
    door(r, "west")
    r.wall(1, 15, 20, 17)                            # upper ledge by the door
    r.fill("terrain", 20, 29, r.W - 1, 32, "water")
    for x0, top in ((26, 27), (40, 25), (54, 23), (66, 25)):
        r.wall(x0, top, x0 + 6, 32)
    r.wall(76, 20, r.W - 1, 32)                      # dry far platform
    r.backwall(["wall_crypt", "wall_ossuary"], 2, 32)
    r.prop("coffin", 82, 19, 22)
    r.prop("statue_saint", 10, 14, 48)
    r.mark("lore", 84, 19, lore="drowned_ledger")
    r.mark("enemy", 80, 19, enemy="deathHunter")
    r.mark("enemy", 20, 10, enemy="fairy")
    r.mark("enemy", 70, 10, enemy="fairy")
    r.mark("enemy", 45, 26, enemy="bat")
    r.mark("item", 56, 22, item="heart4")                        # the tallest pillar over the spikes
    return r


def chapel():
    r = rock("chapel_of_bones", "Chapel of Bones", 15, 5, 1, 1, 27)
    r.carve(1, 3, r.W - 1, 15)
    door(r, "east")
    # Ability gate: the way to the ballroom is a doorway at the top of a sheer wall of bones, 6 tiles (96 px)
    # up. The priest's jump peaks at 64 px; only the Crusnik leap reaches it.
    door(r, "west", 4, 9)
    r.fill("terrain", 1, 9, 5, 15, "stone")
    r.backwall(["wall_ossuary"], 3, 15)
    r.mark("lore", 7, 14, lore="bone_wall")
    r.mark("checkpoint", 15, 14, "chapel_altar")
    r.prop("bones", 5, 14, 16)
    r.prop("bones", 25, 14, 16)
    r.mark("lore", 11, 14, lore="marchesa_portrait")
    return r


def ballroom():
    r = rock("marchesa_ballroom", "The Marchesa's Ballroom", 12, 5, 3, 1, 28)
    r.carve(1, 1, r.W - 1, 15)
    door(r, "east", 4, 9)                              # high doorway from the Chapel of Bones (Crusnik leap)
    r.fill("terrain", r.W - 5, 9, r.W - 1, 15, "stone")  # the landing inside it; drop down into the ballroom
    door(r, "west")
    r.gate(1, 10, 3, 15, "marchesa_defeated")        # opens when she falls (Milestone 7)
    r.backwall(["wall_ballroom"], 1, 15)
    r.platform(8, 18, 9, "balcony")
    r.platform(r.W - 18, r.W - 8, 9, "balcony")
    r.prop("chandelier", 45, 1, -72)
    r.mark("lore", 82, 14, lore="ballroom_invitation")
    # The duel: the middle screen is the arena (walls rise when Abel steps in). Her defeat opens the west gate.
    r.mark("boss", 45, 14, boss="marchesa", arenaLeft=30 * 16, arenaRight=60 * 16, defeatFlag="marchesa_defeated",
           intro="marchesa_intro", outro="marchesa_outro")
    return r


def cellars():
    r = rock("count_cellars", "The Count's Cellars", 9, 5, 3, 1, 29)
    r.carve(1, 3, r.W - 1, 15)
    door(r, "east")
    r.backwall(["wall_crypt"], 3, 15)
    for x in (20, 24, 50, 54):
        r.mark("decor", x, 14, item="barrel")
    r.mark("lore", 10, 14, lore="cellar_crest")
    r.mark("enemy", 30, 14, enemy="boneRat")
    r.mark("enemy", 40, 14, enemy="boneRat")
    # Mini boss 3: Brother Petros, sent to take "the vampire priest" back to Rome in chains.
    r.mark("boss", 66, 14, boss="petros", arenaLeft=50 * 16, arenaRight=80 * 16, defeatFlag="petros_defeated",
           intro="petros_intro", outro="petros_outro")
    return r


def rooms():
    return [crypt(), ossuary(), reliquary(), water_tunnels(), long_stair(), drowned(), chapel(), ballroom(), cellars()]
