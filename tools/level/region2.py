"""Region 2: the cathedral (entered through its portal, off the street grid) and the count's fortress (east of the
Danube Bridge, through the gatehouse that opens when Dietrich falls). Imported by tools/level/istvan.py (one world)."""
from tools.level.builder import Room
from tools.level.undercity import rock

T = 16


def nave():
    r = rock("cathedral_nave", "The Cathedral Nave", 13, -8, 5, 2, 41)
    F = r.H - 2                                   # floor row (32)
    r.carve(1, 3, r.W - 1, F)
    r.backwall(["wall_nave"], 3, F)
    # the portal (back out to Cathedral Square) and where you arrive
    r.mark("entry", 5, F - 1, name="portal")
    r.door(2, F - 5, 7, F, "cathedral_square", "nave_door")
    # aisles: two galleries (triforium) and a clerestory walk, reached by ladders
    r.platform(10, 50, 22, "balcony")
    r.platform(60, 100, 22, "balcony")
    r.platform(30, 80, 14, "balcony")
    r.ladder(12, 23, F)
    r.ladder(98, 23, F)
    r.ladder(32, 15, 22)
    r.prop("rose_window", 55, 11, 88)
    r.prop("chandelier", 40, 3, -64)
    r.prop("chandelier", 90, 3, -64)
    r.prop("statue_saint", 20, F - 1, 56)
    r.prop("statue_saint", 106, F - 1, 56)
    r.prop("organ", 146, F - 1, 150)
    for x in (24, 46, 68, 88):
        r.mark("decor", x, F - 1, item="lamp")
    r.mark("lore", 16, F - 1, lore="nave_requiem")
    r.mark("lore", 64, 21, lore="choir_score")
    r.mark("checkpoint", 104, F - 1, "nave_altar")
    r.mark("checkpoint", 54, F - 1, "aisle_altar")
    r.mark("enemy", 30, F - 1, enemy="ironChoir")
    r.mark("enemy", 74, F - 1, enemy="ironChoir")
    r.mark("enemy", 40, 21, enemy="inquisitor")
    r.mark("enemy", 82, 21, enemy="inquisitor")
    r.mark("enemy", 55, 17, enemy="fairy")
    # The chancel: Dietrich's stage. His Grand Marionette hangs above the altar rail.
    r.mark("boss", 128, F - 1, boss="dietrich", arenaLeft=112 * T, arenaRight=142 * T, defeatFlag="dietrich_defeated",
           intro="dietrich_intro", outro="dietrich_outro")
    # behind the organ: the way into the bell tower
    r.carve(r.W - 1, F - 5, r.W, F)
    r.mark("item", 78, 13, item="tea3")                          # end of the clerestory walk
    return r


def bell_tower():
    r = rock("bell_tower", "The Bell Tower", 18, -8, 1, 2, 42)
    F = r.H - 2
    r.carve(0, F - 5, 1, F)                       # from the nave
    r.carve(1, 4, r.W - 1, F)
    r.backwall(["wall_belltower"], 4, F)
    for y, (x0, x1) in ((26, (4, 20)), (20, (10, 26)), (14, (4, 20)), (8, (10, 26))):
        r.platform(x0, x1, y)
    r.ladder(6, 27, F)
    r.ladder(24, 21, 26)
    r.ladder(6, 15, 20)
    r.ladder(24, 9, 14)
    r.prop("bell", 15, 4, -72)
    r.mark("checkpoint", 15, 7, "tower_altar")
    r.mark("lore", 20, 7, lore="bell_ringer")
    r.mark("enemy", 15, 16, enemy="bat")
    r.mark("enemy", 12, 10, enemy="fairy")
    r.mark("item", 24, 7, item="heart1")                         # the top of the tower
    return r


def castle_gate():
    r = Room("castle_gate", "The Castle Gate", 24, 0, 3, 2, seed=43)
    D = 25                                        # the bridge deck level
    r.wall(0, D, r.W, r.H)
    r.fill("terrain", 0, D, 40, D + 1, "cobble")
    r.wall(0, 0, 1, D)
    r.carve(0, D - 5, 1, D)                       # from the bridge gatehouse
    r.stairs(40, D, 6)
    r.wall(46, D - 6, r.W, D)                     # the rampart terrace
    r.fill("terrain", 46, D - 6, r.W, D - 5, "cobble")
    r.wall(r.W - 1, 0, r.W, D - 6)
    r.carve(r.W - 1, D - 11, r.W, D - 6)          # into the great hall
    r.wall(60, 4, 66, D - 6)                      # a gate tower with a way over it
    r.carve(60, D - 11, 66, D - 6)
    r.platform(54, 60, D - 12)
    r.platform(66, 72, D - 12)
    r.backwall(["wall_fortress"], 4, D - 6, 46, r.W - 1)
    r.prop("banner_bat", 52, 5, -80)
    r.prop("banner_bat", 80, 5, -80)
    r.mark("checkpoint", 10, D - 1, "castle_altar")
    r.mark("lore", 20, D - 1, lore="castle_gate")
    r.mark("enemy", 30, D - 1, enemy="ironChoir")
    r.mark("enemy", 36, D - 1, enemy="methuselah")
    r.mark("enemy", 54, D - 7, enemy="inquisitor")
    r.mark("enemy", 78, D - 7, enemy="deathHunter")
    r.mark("enemy", 70, D - 15, enemy="bat")
    r.mark("item", 70, D - 13, item="heart2")                    # over the gate tower
    return r


def great_hall():
    r = rock("great_hall", "The Great Hall", 27, 0, 3, 2, 44)
    F = 19                                        # hall floor row (matches the castle gate's rampart)
    r.carve(0, F - 5, 1, F)
    r.carve(1, 4, r.W - 1, F)
    r.carve(r.W - 1, F - 5, r.W, F)
    r.backwall(["wall_fortress"], 4, F)
    r.platform(18, 40, 12, "balcony")
    r.platform(50, 72, 12, "balcony")
    r.ladder(20, 13, F)
    r.ladder(70, 13, F)
    r.prop("chandelier", 30, 4, -56)
    r.prop("chandelier", 60, 4, -56)
    r.prop("banner_bat", 10, 4, -72)
    r.prop("banner_bat", 46, 4, -72)
    r.prop("throne", 80, F - 1, 72)
    r.mark("lore", 76, F - 1, lore="gyula_portrait")
    r.mark("checkpoint", 86, F - 1, "hall_altar")
    r.mark("checkpoint", 6, F - 1, "hall_door_altar")
    r.mark("enemy", 28, F - 1, enemy="deathHunter")
    r.mark("enemy", 56, F - 1, enemy="ironChoir")
    r.mark("enemy", 42, F - 1, enemy="methuselah")
    r.mark("enemy", 30, 11, enemy="inquisitor")
    r.mark("enemy", 60, 8, enemy="fairy")
    r.mark("item", 70, 11, item="chalice2")                      # end of the east balcony
    return r


def star_chamber():
    r = rock("star_chamber", "The Star of Sorrow", 30, 0, 2, 2, 45)
    F = 19
    r.carve(0, F - 5, 1, F)
    r.carve(1, 2, r.W - 1, F)
    r.backwall(["wall_starchamber"], 2, F)
    r.prop("machine_core", 8, F - 1, 140)
    r.prop("machine_core", 52, F - 1, 140)
    r.mark("lore", 6, F - 1, lore="star_of_sorrow")
    r.mark("boss", 32, F - 1, boss="gyula", arenaLeft=15 * T, arenaRight=45 * T, defeatFlag="gyula_defeated",
           intro="gyula_intro", outro="gyula_outro")
    return r


def rooms():
    return [nave(), bell_tower(), castle_gate(), great_hall(), star_chamber()]
