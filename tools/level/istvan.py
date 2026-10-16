"""Region 1, area 1: Istvan Old Town by night. Usage: python3 -E -s -m tools.level.istvan  (writes src/data/rooms/)
Town rooms are 2 screens tall: rooftops above, street at row GY. Rooms connect wherever their edges are open."""
from itertools import cycle
from tools.level.builder import Room, write

HOUSES = ["house_ochre", "house_rose", "house_gothic", "house_blue"]
_turn = cycle(range(len(HOUSES)))


def next_houses():
    """The four painted houses, starting at a different one each time, so neighbours differ."""
    i = next(_turn)
    return HOUSES[i:] + HOUSES[:i]
ROOMS = [["room_poor", "room_stair", "room_tavern"], ["room_stair", "room_poor"]]


def house(r, *a, facade=None, interiors=None, **k):
    """A town house with a painted front and painted rooms (from the building kit)."""
    return r.building(*a, facade=facade or next_houses(), interiors=interiors or ROOMS[len(r.images) % 2], **k)

GY = 31   # street surface row in 34-row town rooms
FH = 6    # storey height (tiles)


def street_row(r):
    """Lowest cobble row of the room (its street), for the houses behind it."""
    rows = [y for y in range(r.H) for x in range(0, r.W, 7) if r.L["terrain"][y][x] == "cobble"]
    return max(rows) if rows else GY


def feet(base, floor):
    """Marker row for something standing on `floor` (0 = ground) of a building whose ground is row `base`."""
    return base - floor * FH - 1


def station():
    r = Room("istvan_station", "Istvan Station", 0, 0, 3, 2, seed=11)
    r.ground(GY)
    r.wall(0, 0, 1, r.H)                                       # the world's west end
    r.wall(r.W - 1, GY, r.W, r.H)
    house(r, 6, 32, GY, floors=2, fh=7, doors=("left", "right"), chimneys=0, lit=0.9, climb="ladder", facade="station_hall", interiors=["room_stair"])   # station hall
    house(r, 42, 8, GY, floors=4, doors=("left", "right"), chimneys=0, lit=0.3, climb="ladder", facade="clock_tower", interiors=["room_stair"])                 # clock tower
    r.platform(52, 66, GY - 7, "balcony")                                                                # platform canopy
    for x in (53, 59, 65):
        r.mark("decor", x, GY - 8, item="chain", h=40)
    house(r, 70, 14, GY, floors=3, doors=("left", "right"), balconies=(1, 2), lit=0.5)
    r.street_props(50, 88, GY)
    r.mark("entry", 10, GY - 1, "start", facing=1)
    r.mark("checkpoint", 40, GY - 1, "station_altar")              # altars about every 80-110 tiles (owner)
    r.mark("lore", 14, GY - 1, lore="ax_orders")
    r.mark("dummy", 24, GY - 1, maxHealth=60, contactDamage=0)
    r.mark("dummy", 30, GY - 1, maxHealth=60, contactDamage=0)
    r.mark("label", 22, GY - 10, text="Climb ladders with the stick. Stick down + JUMP drops through wooden floors.")
    r.mark("enemy", 78, GY - 1, enemy="thrall")
    r.mark("enemy", 76, feet(GY, 2), enemy="thrall")
    return r


def old_town():
    r = Room("old_town_lane", "Old Town Lane", 3, 0, 4, 2, seed=12)
    r.ground(GY)
    r.edges(left=True, right=True, ground=GY)
    house(r, 3, 14, GY, floors=3, doors=("left", "right"), balconies=(2,), lit=0.4)
    r.alley_back(17, 22, GY - 12, GY)
    r.mark("decor", 19, GY - 12, item="lantern", h=20)
    house(r, 22, 16, GY, floors=4, doors=("left", "right"), balconies=(1, 3), chimneys=2, lit=0.5, climb="ladder")
    house(r, 41, 12, GY, floors=2, doors=("left", "right"), lit=0.6)
    # raised terrace reached by stone stairs, with a house on it
    r.stairs(55, GY, 4)
    r.wall(59, GY - 4, 77, GY)
    r.fill("terrain", 59, GY - 4, 77, GY - 3, "cobble")
    house(r, 61, 14, GY - 4, floors=3, doors=("left", "right"), lit=0.4, climb="ladder")
    r.stairs(80, GY, 4, dir=-1)
    house(r, 84, 22, GY, floors=4, doors=("left", "right"), balconies=(2,), chimneys=2, lit=0.5)
    r.alley_back(106, 120, GY - 8, GY)
    r.mark("decor", 112, GY - 10, item="lantern", h=28)
    r.mark("decor", 34, feet(GY, 4) - 2, item="banner")
    r.street_props(0, 56, GY)
    r.street_props(84, 120, GY, lamp_offset=24)
    r.mark("lore", 110, GY - 1, lore="star_graffiti")
    r.mark("checkpoint", 46, GY - 1, "lane_altar")
    r.mark("lore", 66, feet(GY - 4, 1), lore="worshipper_note")
    r.mark("enemy", 36, GY - 1, enemy="thrall")
    r.mark("enemy", 68, feet(GY - 4, 0), enemy="thrall")
    r.mark("enemy", 94, feet(GY, 1), enemy="thrall")
    r.mark("enemy", 28, feet(GY, 4), enemy="deathHunter")     # on the tall house's roof
    r.mark("item", 31, feet(GY, 4), item="chalice1")             # on the tall house's roof
    return r


def clock_alley():
    r = Room("clock_alley", "Bellmakers' Alley", 7, 0, 2, 2, seed=16)
    r.ground(GY)
    r.edges(left=True, right=True, ground=GY)
    house(r, 2, 16, GY, floors=4, doors=("left", "right"), balconies=(), chimneys=1, lit=0.3, climb="ladder")
    house(r, 40, 18, GY, floors=4, doors=("left", "right"), chimneys=1, lit=0.6)
    r.alley_back(18, 40, 4, GY)
    # zig-zag balconies up the alley walls
    for i, y in enumerate((GY - 5, GY - 10, GY - 15, GY - 20)):
        x0 = 19 if i % 2 == 0 else 33
        r.platform(x0, x0 + 6, y, "balcony")
        r.mark("decor", x0 + 3, y - 7, item="lantern", h=16)
    r.mark("decor", 29, 2, item="chain", h=120)
    # the old well: a grate in the street over a ladder down to the Hunter's Crypt (opened from below)
    r.carve(22, GY, 25, r.H)
    r.ladder(23, GY + 1, r.H); r.put("terrain", 23, GY, "plank")  # plank over the shaft, like a trapdoor
    r.gate(22, GY, 25, GY + 1, "well_open")
    r.mark("label", 23, GY - 4, text="an old well, grated shut")
    r.mark("checkpoint", 36, GY - 1, "alley_altar")
    r.mark("enemy", 30, GY - 1, enemy="thrall")
    r.mark("enemy", 36, GY - 21, enemy="methuselah")
    r.mark("item", 6, feet(GY, 4), item="tea1")                  # up the bellmaker's ladder, on the roof
    return r


def square():
    r = Room("market_square", "Market Square", 9, 0, 4, 2, seed=13)
    r.ground(GY)
    r.edges(left=True, right=True, ground=GY)
    house(r, 2, 22, GY, floors=3, doors=("left", "right"), balconies=(1, 2), chimneys=2, lit=0.4)        # gallery houses
    house(r, 28, 16, GY, floors=2, doors=("left", "right"), lit=0.9, climb="ladder", facade="tavern", interiors=["room_tavern", "room_poor"])               # the tavern
    r.wall(52, GY - 2, 58, GY, "stone")                     # toppled statue of the old count
    r.wall(54, GY - 4, 56, GY - 2, "stone")
    r.wall(76, GY - 1, 86, GY, "stone")                     # fountain rim
    r.fill("terrain", 64, GY, 68, r.H, None)                # sewer grate, wide open
    r.platform(64, 68, GY)                                  # an iron grate you can stand on; press down at the ladder to go below
    r.ladder(65, GY + 1, r.H)                               # the ladder continues in the sewer shaft
    house(r, 96, 20, GY, floors=4, doors=("left", "right"), balconies=(2,), chimneys=1, lit=0.3)
    for x in (6, 12, 18):
        r.mark("decor", x, feet(GY, 3) - 3, item="banner")
    r.street_props(46, 96, GY, every=10)
    r.mark("checkpoint", 81, GY - 2, "fountain_altar")
    r.mark("lore", 55, GY - 5, lore="hall_plaque")
    r.mark("lore", 47, GY - 1, lore="resistance_chalk")
    r.mark("checkpoint", 34, GY - 1, "tavern_altar")
    r.mark("lore", 40, feet(GY, 1), lore="music_score")
    r.mark("label", 66, GY - 5, text="a sewer grate, wide open...")
    r.mark("enemy", 90, GY - 1, enemy="thrall")
    r.mark("enemy", 104, feet(GY, 2), enemy="methuselah")
    r.mark("enemy", 12, feet(GY, 3), enemy="deathHunter")
    r.mark("item", 34, feet(GY, 2), item="tea2")                 # on the tavern roof
    return r


def cathedral_square():
    r = Room("cathedral_square", "Cathedral Square", 13, 0, 4, 2, seed=14)
    r.ground(GY)
    r.edges(left=True, right=True, ground=GY)
    T = GY - 6                                               # the terrace the cathedral stands on
    r.stairs(34, GY, 6)
    r.wall(40, T, 98, GY)
    r.fill("terrain", 40, T, 98, T + 1, "cobble")
    # The cathedral front: a painted landmark (public/assets/props/cathedral_front.png, 540x403) standing on the
    # terrace, with invisible ledges on its plinths, portal canopies, rose gallery, tower balustrades and belfries.
    CX, IW, IH = 69, 540, 403
    left_px = CX * 16 + 8 - IW // 2
    r.mark("decor", CX, T - 1, item="img:cathedral_front")
    def ledge(ix0, ix1, row):
        r.platform((left_px + ix0) // 16, (left_px + ix1) // 16, row, "ledge")
    for row, spans in ((22, ((30, 70), (470, 510))), (19, ((100, 140), (400, 440))), (16, ((115, 195), (345, 425))),
                       (13, ((205, 335),)), (10, ((100, 210), (330, 440))), (7, ((115, 165), (375, 425)))):
        for a, b in spans:
            ledge(a, b, row)
    r.stairs(104, GY, 6, dir=-1)
    r.street_props(0, 34, GY)
    r.street_props(104, 120, GY, lamp_offset=6)
    for x in (44, 94):
        r.mark("decor", x, T - 1, item="lamp")
    r.mark("lore", 66, T - 1, lore="cathedral_sealed")
    r.mark("checkpoint", 50, T - 1, "square_altar")
    # The portal: sealed until the Inquisition is gone (Brother Petros); then into the nave (Region 2).
    r.door(67, T - 5, 72, T, "cathedral_nave", "portal", requires="petros_defeated")
    r.mark("entry", 69, T - 1, name="nave_door")
    r.mark("lore", 14, GY - 1, lore="esther_prayer")
    r.mark("enemy", 22, GY - 1, enemy="thrall")
    r.mark("enemy", 84, T - 1, enemy="deathHunter")
    r.mark("enemy", 20, 8, enemy="bat")
    return r


def hill_street():
    r = Room("hill_street", "Castle Hill Street", 17, 0, 3, 2, seed=17)
    r.ground(GY)
    r.wall(0, GY, 1, r.H)
    r.stairs(18, GY, 3)
    r.wall(21, GY - 3, r.W, GY)
    r.fill("terrain", 21, GY - 3, r.W, GY - 2, "cobble")
    house(r, 24, 16, GY - 3, floors=3, doors=("left", "right"), balconies=(1,), lit=0.5, climb="ladder")
    r.stairs(44, GY - 3, 3)
    r.wall(47, GY - 6, r.W, GY - 3)
    r.fill("terrain", 47, GY - 6, r.W, GY - 5, "cobble")
    house(r, 52, 14, GY - 6, floors=3, doors=("left", "right"), lit=0.4)
    # puzzle: a portcullis bars the upper street; its lever is on the roof of the house below
    r.wall(46, 0, 48, GY - 9, "gothic_stone")                   # gate tower: no way over the top
    r.gate(46, GY - 9, 48, GY - 6, "hill_gate")
    r.mark("lever", 34, GY - 3 - 18 - 1, flag="hill_gate")
    r.mark("label", 32, GY - 3 - 18 - 5, text="a lever on the roof...")
    r.wall(r.W - 1, GY - 6, r.W, r.H)
    r.street_props(0, 18, GY)
    r.street_props(70, 90, GY - 6, every=10)
    r.mark("enemy", 34, GY - 4, enemy="methuselah")
    r.mark("checkpoint", 28, GY - 4, "hill_altar")
    r.mark("enemy", 78, GY - 7, enemy="deathHunter")
    return r


def bridge():
    r = Room("danube_bridge", "The Danube Bridge", 20, 0, 4, 2, seed=18)
    D = GY - 6                                               # deck surface row
    r.fill("terrain", 0, r.H - 3, r.W, r.H - 1, "water")     # the river (hazard)
    r.wall(0, r.H - 1, r.W, r.H)                             # riverbed
    r.wall(0, D, 1, r.H)
    for x0, x1 in ((0, 36), (40, 72), (76, 112)):
        r.wall(x0, D, x1, D + 2)
        r.fill("terrain", x0, D, x1, D + 1, "cobble")
    for px in (14, 30, 54, 90):                              # piers down into the river
        r.wall(px, D + 2, px + 4, r.H - 3)
    for px in (18, 58, 86):                                  # scaffolding to climb back from the piers
        r.platform(px, px + 4, D + 5)
    r.wall(112, 0, r.W, r.H)                                 # the gatehouse at the far end
    r.carve(112, D - 5, r.W, D)                              # its passage, closed by a portcullis until Dietrich falls
    r.gate(112, D - 5, 114, D, "dietrich_defeated")
    r.street_props(2, 110, D, every=14)
    r.mark("lore", 106, D - 1, lore="castle_gate_barred")
    r.mark("checkpoint", 46, D - 1, "bridge_altar")
    r.mark("enemy", 60, D - 1, enemy="deathHunter")
    r.mark("enemy", 24, D - 1, enemy="thrall")
    r.mark("enemy", 96, D - 1, enemy="methuselah")
    return r


def sewer_shaft():
    r = Room("sewer_shaft", "Sewer Shaft", 11, 2, 1, 2, seed=15, sky=False)
    r.wall(0, 0, r.W, r.H)
    r.fill("terrain", 4, 0, 8, 2, None)                     # the grate opening above
    r.fill("terrain", 3, 2, 26, r.H - 2, None)              # the shaft (open right up to the grate: no low ceiling to get wedged under)
    r.ladder(5, 0, 15)                                      # from the market grate down to the crypt door ledge (and back up)
    r.carve(0, 10, 3, 15)                                   # west, up high: the Hunter's Crypt
    r.platform(3, 14, 15)
    r.ladder(12, 16, r.H - 2)                               # up from the floor (east of the spikes) to the crypt door ledge
    r.carve(26, 27, 30, 32)                                 # east, at the bottom: the Water Tunnels
    for i, y in enumerate(range(r.H - 6, 7, -4)):
        x0 = 6 if i % 2 == 0 else 14
        r.platform(x0, x0 + 8, y)
    r.fill("terrain", 6, r.H - 3, 11, r.H - 2, "spikes")
    r.backwall(["wall_roman"], 3, r.H - 2, 3, 26)
    r.mark("enemy", 18, 10, enemy="bat")
    r.mark("enemy", 10, 22, enemy="bat")
    return r


if __name__ == "__main__":
    from tools.level import undercity
    from tools.level import region2
    rooms = [station(), old_town(), clock_alley(), square(), cathedral_square(), hill_street(), bridge(), sewer_shaft()] + undercity.rooms() + region2.rooms()
    for r in rooms:
        r.horizon = street_row(r)
        if r.sky and r.id not in ("danube_bridge",):
            r.backstreet(1, r.W - 1, r.horizon)
    write(rooms, "src/data/rooms")
    raise SystemExit
    write([station(), old_town(), clock_alley(), square(), cathedral_square(), hill_street(), bridge(), sewer_shaft()], "src/data/rooms")
