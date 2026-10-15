"""Region 1, area 1: Istvan Old Town by night. Usage: python3 -I -m tools.level.istvan  (writes src/data/rooms/)
Town rooms are 2 screens tall: rooftops above, street at row GY. Rooms connect where their edges are open."""
from tools.level.builder import Room, write

GY = 31  # street surface row in 34-row town rooms


def station():
    r = Room("istvan_station", "Istvan Station", 0, 0, 3, 2, seed=11)
    r.ground(GY)
    r.edges(left=True, right=False, ground=0)        # world's west end: closed all the way up
    r.wall(0, 0, 90, 1, "stone")                       # station hall ceiling over the start? no: only left edge closed
    r.fill("terrain", 1, 0, 90, 1, None)
    hall_top = r.building(8, 30, GY, floors=2, fh=7, doors=("left", "right"), chimneys=0, lit=0.8)
    r.building(42, 8, GY, floors=4, fh=6, doors=("left",), chimneys=0, lit=0.3)     # clock tower
    r.building(64, 14, GY, floors=2, fh=6, doors=("right",), balconies=(1,), lit=0.5)
    r.alley_back(52, 62, GY - 8, GY)
    r.mark("entry", 4, GY - 1, "start", facing=1)
    r.mark("lore", 12, GY - 1, lore="ax_orders")
    r.mark("dummy", 24, GY - 1, maxHealth=60, contactDamage=0)
    r.mark("dummy", 30, GY - 1, maxHealth=60, contactDamage=0)
    r.mark("label", 22, GY - 9, text="Welcome to Istvan. Climb inside the houses; jump between roofs.")
    r.mark("enemy", 70, GY - 1, enemy="thrall")
    return r


def old_town():
    r = Room("old_town_lane", "Old Town Lane", 3, 0, 4, 2, seed=12)
    r.ground(GY)
    r.edges(left=True, right=True, ground=GY)
    r.building(4, 14, GY, floors=3, doors=("left", "right"), balconies=(2,), lit=0.4)
    r.alley_back(18, 24, GY - 10, GY)
    r.building(24, 18, GY, floors=4, doors=("left",), balconies=(1, 3), chimneys=2, lit=0.5)
    r.building(48, 12, GY, floors=2, doors=("right",), lit=0.6)
    r.alley_back(60, 66, GY - 6, GY)
    r.building(66, 16, GY, floors=3, doors=("left", "right"), upper_doors=((2, "left"),), lit=0.3)
    r.building(88, 22, GY, floors=4, doors=("left",), balconies=(2,), chimneys=2, lit=0.5)
    r.mark("lore", 20, GY - 1, lore="worshipper_note")
    r.mark("lore", 62, GY - 1, lore="star_graffiti")
    r.mark("enemy", 36, GY - 1, enemy="thrall")
    r.mark("enemy", 56, GY - 1, enemy="thrall")
    r.mark("enemy", 96, GY - 1 - 12, enemy="thrall")           # on the 2nd floor of the last house
    r.mark("enemy", 74, GY - 1 - 18, enemy="deathHunter")      # on a roof
    return r


def square():
    r = Room("market_square", "Market Square", 7, 0, 4, 2, seed=13)
    r.ground(GY)
    r.edges(left=True, right=True, ground=GY)
    r.building(2, 22, GY, floors=3, doors=("right",), balconies=(1, 2), chimneys=2, lit=0.4)     # gallery houses
    r.building(28, 16, GY, floors=2, doors=("left", "right"), lit=0.9)                          # the tavern
    # toppled statue of the old count and the fountain shrine
    r.wall(52, GY - 2, 58, GY, "stone")
    r.wall(54, GY - 4, 56, GY - 2, "stone")
    r.wall(76, GY - 1, 86, GY, "stone")
    # sewer grate: a hole in the square's paving down into the shaft below
    r.fill("terrain", 64, GY, 68, r.H, None)
    r.building(96, 20, GY, floors=4, doors=("left",), balconies=(2,), chimneys=1, lit=0.3)
    r.mark("checkpoint", 81, GY - 2, "fountain_altar")
    r.mark("lore", 55, GY - 3, lore="hall_plaque")
    r.mark("lore", 46, GY - 1, lore="resistance_chalk")
    r.mark("checkpoint", 36, GY - 1, "tavern_altar")
    r.mark("lore", 40, GY - 1 - 6, lore="music_score")
    r.mark("label", 66, GY - 4, text="a sewer grate, wide open...")
    r.mark("enemy", 90, GY - 1, enemy="thrall")
    r.mark("enemy", 104, GY - 1 - 12, enemy="thrall")
    r.mark("enemy", 12, GY - 1 - 18 - 1, enemy="deathHunter")
    return r


def cathedral_square():
    r = Room("cathedral_square", "Cathedral Square", 11, 0, 3, 2, seed=14)
    r.ground(GY)
    r.edges(left=False, right=True, ground=0)
    # broad steps up to the great doors
    for i, x in enumerate(range(30, 54, 6)):
        r.wall(x, GY - 2 * (i + 1), 66, GY - 2 * i, "stone")
    r.building(62, 26, GY - 8, floors=4, fh=6, doors=(), chimneys=0, lit=0.2)
    r.wall(72, 0, 76, GY - 8 - 24, "chimney")                    # the bell tower rising out of frame
    r.fill("facade", 66, GY - 11, 70, GY - 8, "door")             # the great doors (locked)
    r.mark("lore", 64, GY - 9, lore="cathedral_sealed")
    r.mark("lore", 14, GY - 1, lore="esther_prayer")
    r.mark("enemy", 22, GY - 1, enemy="thrall")
    return r


def sewer_shaft():
    r = Room("sewer_shaft", "Sewer Shaft", 9, 2, 1, 2, seed=15)
    r.wall(0, 0, 4, r.H)
    r.wall(8, 0, r.W, r.H)
    r.fill("terrain", 8, 2, 26, r.H - 2, None)       # open shaft body
    r.wall(0, r.H - 2, r.W, r.H)
    r.wall(26, 0, r.W, r.H)
    # zig-zag planks back up to the grate
    for i, y in enumerate(range(r.H - 6, 1, -4)):
        x0 = 10 if i % 2 == 0 else 16
        r.platform(x0, x0 + 8, y)
    r.platform(4, 10, 2)
    r.fill("terrain", 12, r.H - 3, 20, r.H - 2, "spikes")
    r.mark("lore", 22, r.H - 3, lore="hunter_warning")
    r.mark("label", 16, r.H - 6, text="(the undercity continues in the next build)")
    return r


if __name__ == "__main__":
    write([station(), old_town(), square(), cathedral_square(), sewer_shaft()], "src/data/rooms")
