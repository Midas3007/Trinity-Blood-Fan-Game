"""Region 3 (the Empire arc), stage 2: Byzantium's docks and bazaar (docs/lore/act2-plan.md, chapters 1-2).
The city sits high above a sea of cloud ('aloft' sky). Reached from Istvan Station's airship berth after Act 1.
Imported by tools/level/istvan.py (one world). Rooms walk into each other through open edges at the street row."""
from tools.level.builder import Room

FRONTS = ["house_byz_sand", "house_byz_tile", "house_byz_white", "house_byz_stone"]
ROOMS = [["room_byz_poor", "room_byz_stair", "room_byz_tavern"], ["room_byz_stair", "room_byz_poor"]]


def house(r, x, w, gy, floors, front, **k):
    """A Byzantine house: the Istvan building kit with domed, re-coloured fronts and blue-gold rooms (tools/level/byz_kit.py)."""
    k.setdefault("chimneys", 0)
    return r.building(x, w, gy, floors, facade=front, interiors=ROOMS[len(r.images) % 2], **k)


GY = 31          # street row in the docks, quay, market and the foot of the spice stairs (as Istvan's streets)
ARCADE_GY = 26   # the arcade's own street row (its room sits one screen higher: world row 9)


def lamps(r, x0, x1, gy, every=12):
    for x in range(x0, x1, every):
        r.mark("decor", x, gy - 1, item="bluelamp")


def docks():
    r = Room("empire_docks", "The Imperial Docks", 40, 0, 3, 2, seed=61, sky="byzantium")
    r.ground(GY, top="stone")
    r.wall(0, 0, 1, GY)                                         # the cliff's edge: the airship berth
    r.wall(0, GY, r.W, r.H)
    r.door(2, GY - 5, 6, GY, "istvan_station", "berth")
    r.mark("entry", 4, GY - 1, name="airship", facing=1)
    r.mark("scene", 10, GY - 1, scene="empire_arrival")
    for x in (2, 5):
        r.mark("decor", x, GY - 7, item="chain", h=40)          # mooring chains
    r.backwall(["wall_nave"], GY - 12, GY, 22, 46)              # the dock chapel
    for x in (22, 45):
        r.prop("column", x, GY - 1, 160)
    r.mark("checkpoint", 34, GY - 1, "dock_altar")
    r.mark("lore", 28, GY - 1, lore="letter_docks")
    # The customs house: the harbour gate's winch is on its roof (the way on).
    top = house(r, 52, 14, GY, 3, "house_byz_stone", doors=("left", "right"), balconies=(2,), climb="ladder", lit=0.6)
    r.mark("lever", 58, top - 1, flag="harbour_gate")
    r.mark("label", 58, top - 5, text="the harbour gate's winch")
    house(r, 74, 12, GY, 2, "house_byz_sand", doors=("left", "right"), lit=0.4)
    lamps(r, 8, 52, GY, 14)
    for x, it in ((14, "crate"), (16, "crate"), (48, "barrel"), (70, "urn"), (88, "crate")):
        r.mark("decor", x, GY - 1, item=it)
    r.mark("enemy", 58, GY - 1, enemy="imperialGuard")
    r.mark("enemy", 60, GY - 13, enemy="zealot")              # the customs house's top floor
    r.mark("enemy", 80, GY - 1, enemy="imperialGuard")
    r.mark("enemy", 66, GY - 22, enemy="bat")
    r.backstreet(8, r.W, GY, domes=True)
    return r


def quay():
    r = Room("empire_quay", "The Harbour Wall", 43, 0, 3, 2, seed=62, sky="byzantium")
    r.ground(GY, top="stone")
    r.wall(0, GY, r.W, r.H)
    r.wall(r.W - 1, 0, r.W, 1)                                  # matches the market's corner
    house(r, 14, 10, GY, 2, "house_byz_tile", doors=("left", "right"), lit=0.5)
    r.gate(5, GY - 6, 7, GY, "harbour_gate")                    # opened by the winch on the customs house roof
    r.wall(5, 0, 7, GY - 6, "gothic_stone")
    r.mark("label", 3, GY - 8, text="the harbour gate is shut")
    r.stairs(26, GY, 4)
    r.wall(30, GY - 4, 62, GY, "stone")                          # the harbour wall's terrace
    # A grate down into the old aqueduct (press down at the ladder).
    r.carve(10, GY, 13, r.H)
    r.platform(10, 13, GY, "plank")
    r.ladder(11, GY + 1, r.H)
    r.mark("label", 11, GY - 4, text="a grate over the old aqueduct")
    r.stairs(65, GY, 4, dir=-1)
    # A stone storehouse barred with iron (the phase-step's first secret, for the way back).
    r.wall(72, GY - 5, 82, GY, "stone")
    r.carve(72, GY - 3, 81, GY)
    r.grille(72, GY - 3, 73, GY)
    r.mark("item", 77, GY - 1, item="heart5")
    r.mark("label", 77, GY - 7, text="iron bars... something glints inside")
    house(r, 34, 14, GY - 4, 3, "house_byz_white", doors=("left", "right"), balconies=(1,), climb="ladder", lit=0.5)
    r.prop("column", 31, GY - 5, 120)
    r.prop("column", 60, GY - 5, 120)
    r.mark("checkpoint", 54, GY - 5, "quay_altar")
    lamps(r, 4, 26, GY, 11)
    lamps(r, 66, 72, GY, 11)
    r.mark("enemy", 56, GY - 5, enemy="zealot")
    r.mark("enemy", 40, GY - 11, enemy="zealot")
    r.mark("enemy", 18, GY - 1, enemy="imperialGuard")
    r.mark("enemy", 86, GY - 1, enemy="imperialGuard")
    r.backstreet(1, r.W, GY, domes=True)
    return r


def market():
    r = Room("bazaar_lamps", "The Lamp Market", 46, 0, 4, 2, seed=63, sky="byzantium")
    r.ground(GY, top="cobble")
    r.wall(0, GY, r.W, r.H)
    # Market stalls: canopies you can stand on.
    house(r, 38, 14, GY, 3, "house_byz_sand", doors=("left", "right"), balconies=(2,), climb="ladder", lit=0.6)
    house(r, 68, 16, GY, 3, "house_byz_tile", doors=("left", "right"), balconies=(1,), lit=0.5)
    house(r, 86, 14, GY, 2, "house_byz_stone", doors=("left", "right"), balconies=(1,), lit=0.4)
    for x0, x1 in ((8, 18), (26, 34), (56, 64)):
        r.platform(x0, x1, GY - 5, "plank")
        r.mark("decor", (x0 + x1) // 2, GY - 6, item="awning", h=(x1 - x0) * 16)
        r.mark("decor", x0 + 2, GY - 1, item="urn")
        r.mark("decor", x1 - 2, GY - 1, item="crate")
    for x in (22, 54, 86, 100):
        r.mark("decor", x, GY - 9, item="rug")
    r.wall(0, 0, 1, 1)                                          # the rooftops' end walls meet the sky here
    r.wall(r.W - 1, 0, r.W, 1)
    # A lamp tower with a ladder up to the rooftops, and a trapdoor down to the silk warehouse.
    r.wall(104, 6, 110, GY, "gothic_stone")
    r.ladder(110, 0, GY)
    r.carve(3, GY, 6, r.H)
    r.platform(3, 6, GY, "plank")
    r.ladder(4, GY + 1, r.H)
    lamps(r, 4, 120, GY, 10)
    r.mark("checkpoint", 20, GY - 1, "market_altar")
    r.mark("scene", 26, GY - 1, scene="ion_meeting")
    r.mark("lore", 116, GY - 1, lore="letter_market")
    r.mark("enemy", 46, GY - 1, enemy="zealot")
    r.mark("enemy", 60, GY - 6, enemy="zealot")
    r.mark("enemy", 76, GY - 7, enemy="imperialGuard")          # the tiled house's first floor
    r.mark("enemy", 92, GY - 1, enemy="imperialGuard")
    r.mark("enemy", 44, GY - 13, enemy="zealot")
    r.backstreet(1, r.W, GY, domes=True)
    r.mark("enemy", 40, GY - 12, enemy="bat")
    r.mark("enemy", 90, GY - 12, enemy="bat")
    return r


def spice_stairs():
    r = Room("bazaar_stairs", "The Spice Stairs", 50, 0, 2, 2, seed=64, sky="byzantium")
    r.ground(GY, top="cobble")
    r.wall(0, GY, r.W, r.H)
    r.wall(38, 9, r.W, GY)                                       # the upper street, one screen up (the arcade)
    r.fill("terrain", 38, 9, r.W, 10, "cobble")
    r.wall(r.W - 1, 0, r.W, 4)                                  # the arcade's wall above its street
    r.wall(0, 0, 1, 1)                                          # matches the market's corner
    for x0, x1, y in ((12, 20, GY - 4), (24, 32, GY - 8), (12, 20, GY - 12), (24, 32, GY - 16), (30, 36, 12)):
        r.platform(x0, x1, y, "plank")
        r.mark("decor", (x0 + x1) // 2, y - 1, item="urn")
    # A spice cellar cut into the upper street's wall, behind bars.
    r.carve(38, GY - 4, 48, GY)
    r.grille(38, GY - 4, 40, GY)
    r.mark("lore", 44, GY - 1, lore="spice_cache")
    r.mark("checkpoint", 50, 8, "stairs_altar")
    for x in (4, 30):
        r.mark("decor", x, GY - 1, item="bluelamp")
    r.mark("enemy", 28, GY - 9, enemy="zealot")
    r.mark("enemy", 20, 10, enemy="bat")
    return r


def arcade():
    r = Room("bazaar_arcade", "The Grand Arcade", 52, -1, 4, 2, seed=65, sky="byzantium")
    r.ground(ARCADE_GY, top="cobble")
    r.wall(0, ARCADE_GY, r.W, r.H)
    r.wall(0, 0, 1, ARCADE_GY - 5)                              # only the street from the spice stairs comes in
    r.backwall(["wall_byz_arcade"], ARCADE_GY - 12, ARCADE_GY, 0, 92)
    for x in range(6, 92, 14):
        r.prop("column", x, ARCADE_GY - 1, 190)
    r.mark("scene", 22, ARCADE_GY - 1, scene="bazaar_murder")
    for x, w in ((36, 12), (64, 10)):
        r.mark("decor", x, ARCADE_GY - 1, item="awning", h=w * 16)
    # The burning stall where the nanomachines first carry Abel through iron.
    r.mark("decor", 84, ARCADE_GY - 1, item="fire", h=40)
    r.mark("scene", 80, ARCADE_GY - 1, scene="phase_step", unlocks="ability:dash")
    r.wall(92, 0, 94, ARCADE_GY - 7, "gothic_stone")            # the arcade's end: an arch, barred below
    r.grille(92, ARCADE_GY - 7, 94, ARCADE_GY)
    house(r, 98, 16, ARCADE_GY, 3, "house_byz_white", doors=("left",), climb="ladder", lit=0.7)
    r.mark("checkpoint", 103, ARCADE_GY - 1, "arcade_altar")    # inside the house beyond the bars
    r.mark("lore", 109, ARCADE_GY - 1, lore="letter_arcade")
    r.wall(r.W - 1, 0, r.W, ARCADE_GY - 5)                     # the street goes on east, to the barracks
    lamps(r, 2, 92, ARCADE_GY, 13)
    r.mark("enemy", 44, ARCADE_GY - 1, enemy="imperialGuard")
    r.mark("enemy", 56, ARCADE_GY - 1, enemy="zealot")
    r.mark("enemy", 70, ARCADE_GY - 1, enemy="imperialGuard")
    return r


def barracks():
    """Stage 3: the Janissary Barracks. A parade ground under the Empress's banners, where her guard captain waits."""
    r = Room("empire_barracks", "The Janissary Barracks", 56, -1, 3, 2, seed=69, sky="byzantium")
    r.ground(ARCADE_GY, top="stone")
    r.wall(0, ARCADE_GY, r.W, r.H)
    r.wall(0, 0, 1, ARCADE_GY - 5)                              # in from the arcade along the street
    r.wall(r.W - 1, 0, r.W, ARCADE_GY)
    r.backwall(["wall_byz_arcade"], ARCADE_GY - 12, ARCADE_GY, 0, 18)
    r.backstreet(18, r.W, ARCADE_GY, domes=True)
    house(r, 2, 14, ARCADE_GY, 2, "house_byz_stone", doors=("left", "right"), lit=0.5)
    r.mark("checkpoint", 8, ARCADE_GY - 1, "barracks_altar")     # the guardhouse chapel, just before the Captain
    for x in (22, 46, 70):
        r.prop("column", x, ARCADE_GY - 1, 190)
    for x in (30, 40, 56, 62):
        r.mark("decor", x, ARCADE_GY - 1, item="bluelamp")
    r.mark("decor", 34, ARCADE_GY - 1, item="rug")
    r.mark("decor", 58, ARCADE_GY - 1, item="rug")
    # Boss: the Janissary Captain, the Empress's guard. He thinks Abel killed his friend in the arcade.
    r.mark("boss", 60, ARCADE_GY - 1, boss="janissary", arenaLeft=24 * 16, arenaRight=84 * 16,
           defeatFlag="janissary_defeated", intro="janissary_intro", outro="janissary_outro")
    # Beyond the arena: a well shaft down to the cisterns, its lid lifted once the Captain looks the other way.
    r.carve(86, ARCADE_GY, 89, r.H)
    r.gate(86, ARCADE_GY, 89, ARCADE_GY + 1, "janissary_defeated")
    r.ladder(87, ARCADE_GY + 1, r.H)
    r.mark("label", 87, ARCADE_GY - 4, text="a well shaft, down to the cisterns")
    return r


def cisterns():
    """Stage 4: the Cisterns. A forest of drowned columns under the barracks, lit by the outcasts' blue lamps."""
    r = Room("byz_cisterns", "The Cisterns", 56, 1, 3, 1, seed=70, sky=False)
    r.wall(0, 0, r.W, r.H, "stone")
    r.carve(0, 3, r.W - 1, 15)                                  # open to the west (the outcasts' hall)
    r.carve(86, 0, 89, 3)
    r.ladder(87, 0, 15)                                         # down the well shaft from the barracks
    r.backwall(["wall_roman"], 3, 15, 0, r.W - 1)
    for x0 in (16, 38, 60):
        r.fill("terrain", x0, 14, x0 + 3, 15, "water")
    for x in range(8, 84, 9):
        r.prop("column", x, 14, 160)
    for x in (12, 30, 50, 70, 82):
        r.mark("decor", x, 14, item="bluelamp")
    r.mark("scene", 78, 14, scene="cistern_child")              # a child of the outcasts shows the way
    r.mark("checkpoint", 72, 14, "cistern_altar")               # a shrine of candles and blue glass
    r.mark("lore", 26, 14, lore="cistern_prayers")
    r.mark("enemy", 46, 4, enemy="bat")
    return r


def outcasts():
    """The outcasts' hall: poor Methuselah living away from the court. No one fights here."""
    r = Room("byz_outcasts", "The Outcasts' Hall", 53, 1, 3, 1, seed=71, sky=False)
    r.wall(0, 0, r.W, r.H, "stone")
    r.carve(1, 3, r.W, 15)                                      # open to the east (the cisterns)
    r.backwall(["wall_crypt"], 3, 15, 1, r.W)
    for x in (18, 34, 52, 70):
        r.mark("decor", x, 3, item="rug")
        r.mark("decor", x + 4, 14, item="urn")
    for x in (24, 46, 64, 84):
        r.mark("decor", x, 14, item="bluelamp")
    r.mark("decor", 40, 14, item="fire", h=24)                  # a brazier the outcasts share
    r.mark("scene", 44, 14, scene="undercity_ion")
    # Down into the lower cistern, where something with strings has made its nest.
    r.carve(28, 15, 31, r.H)
    r.platform(28, 31, 15, "plank")
    r.ladder(29, 16, r.H)
    r.mark("label", 29, 11, text="a ladder down to the lower cistern")
    # A walled niche behind iron bars: someone's treasure.
    r.wall(1, 9, 9, 15, "stone")
    r.carve(1, 10, 8, 15)
    r.grille(8, 10, 9, 15)
    r.mark("item", 4, 14, item="teapot")
    r.mark("label", 5, 7, text="behind the bars, porcelain")
    return r


def lower_cistern():
    """The lower cistern: the Magus's puppets haunt the dark water."""
    r = Room("byz_lower_cistern", "The Lower Cistern", 53, 2, 3, 1, seed=72, sky=False)
    r.wall(0, 0, r.W, r.H, "stone")
    r.carve(1, 3, r.W - 1, 15)
    r.carve(28, 0, 31, 3)
    r.ladder(29, 0, 15)                                         # up to the outcasts' hall
    r.backwall(["wall_roman"], 3, 15, 1, r.W - 1)
    for x0 in (12, 44, 66):
        r.fill("terrain", x0, 14, x0 + 3, 15, "water")
    for x0, x1, y in ((36, 46, 10), (56, 64, 8), (70, 80, 11)):
        r.platform(x0, x1, y, "stone")
    for x in range(6, 88, 10):
        r.prop("column", x, 14, 160)
    r.mark("item", 60, 7, item="heart6")
    r.mark("lore", 84, 14, lore="cistern_strings")
    r.mark("label", 80, 8, text="the way up to the palace (still being built)")
    r.mark("enemy", 22, 14, enemy="thrall")
    r.mark("enemy", 52, 14, enemy="ironChoir")
    r.mark("enemy", 74, 14, enemy="thrall")
    r.mark("enemy", 40, 4, enemy="bat")
    return r


def rooftops():
    """Above the Lamp Market: roofs and domes, reached by the lamp tower's ladder. Gaps drop back into the market."""
    r = Room("bazaar_rooftops", "The Market Rooftops", 46, -1, 4, 1, seed=66, sky="byzantium")
    for x0, x1, top in ((1, 18, 12), (24, 40, 10), (46, 60, 13), (66, 84, 9), (90, 108, 11), (112, 119, 12)):
        r.wall(x0, top, x1, top + 3, "stone")                  # roofs float over the market's sky (open below)
        r.fill("terrain", x0, top, x1, top + 1, "cobble")
    r.wall(0, 0, 1, r.H)
    r.wall(r.W - 1, 0, r.W, r.H)
    r.ladder(110, 12, r.H)                                      # up from the lamp tower
    for x in (8, 32, 75, 98):
        r.mark("decor", x, {8: 11, 32: 9, 75: 8, 98: 10}[x], item="bluelamp")
    r.mark("item", 6, 11, item="chalice3")                      # the far roof, across the gaps
    r.mark("lore", 72, 8, lore="rooftop_view")
    r.mark("enemy", 78, 8, enemy="zealot")
    r.mark("enemy", 36, 9, enemy="zealot")
    r.mark("enemy", 54, 4, enemy="bat")
    r.mark("enemy", 20, 4, enemy="bat")
    return r


def aqueduct():
    """Under the Harbour Wall: the old aqueduct, water in its channels, a cache behind bars."""
    r = Room("empire_aqueduct", "The Old Aqueduct", 43, 2, 3, 1, seed=67, sky=False)
    r.wall(0, 0, r.W, r.H, "stone")
    r.carve(1, 3, r.W, 15)                                      # open to the east (the silk warehouse)
    r.carve(10, 0, 13, 3)
    r.ladder(11, 0, 15)                                         # up to the harbour grate
    r.backwall(["wall_roman"], 3, 15, 1, r.W)
    for x0 in (20, 44, 66):
        r.fill("terrain", x0, 14, x0 + 3, 15, "water")           # 3 wide: an easy running jump
    for x in (16, 34, 56, 80):
        r.prop("column", x, 14, 160)
    r.wall(1, 9, 8, 15, "stone")                                # a ledge with a barred cache
    r.carve(1, 10, 7, 15)
    r.grille(7, 10, 8, 15)
    r.mark("lore", 4, 14, lore="aqueduct_cache")
    r.mark("enemy", 30, 14, enemy="zealot")
    r.mark("enemy", 60, 8, enemy="bat")
    r.mark("enemy", 74, 14, enemy="imperialGuard")
    return r


def warehouse():
    """Below the Lamp Market: bolts of silk, and a ladder up through a trapdoor into the market."""
    r = Room("bazaar_warehouse", "The Silk Warehouse", 46, 2, 4, 1, seed=68, sky=False)
    r.wall(0, 0, r.W, r.H, "stone")
    r.carve(0, 3, r.W - 1, 15)                                  # open to the west (the aqueduct)
    r.carve(3, 0, 6, 3)
    r.ladder(4, 0, 15)                                          # up to the market trapdoor
    r.backwall(["wall_crypt"], 3, 15, 0, r.W - 1)
    for x0, x1, y in ((14, 24, 10), (34, 46, 8), (58, 70, 10), (82, 96, 7)):
        r.platform(x0, x1, y, "plank")
        r.mark("decor", (x0 + x1) // 2, y - 1, item="crate")
    for x in (28, 52, 76, 104):
        r.mark("decor", x, 3, item="rug")
        r.mark("decor", x + 3, 14, item="urn")
    r.mark("checkpoint", 110, 14, "warehouse_altar")
    r.mark("lore", 88, 6, lore="warehouse_manifest")
    r.mark("enemy", 40, 14, enemy="zealot")
    r.mark("enemy", 64, 14, enemy="imperialGuard")
    r.mark("enemy", 90, 6, enemy="zealot")
    return r


def rooms():
    return [docks(), quay(), market(), spice_stairs(), arcade(), barracks(), cisterns(), outcasts(), lower_cistern(), rooftops(), aqueduct(), warehouse()]
