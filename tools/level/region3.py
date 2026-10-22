"""Region 3: the Empire arc (owner, 2026-10-22). For now only its finale: the Imperial Spire, where Abel fights Cain,
first on the roof, then in the sky. Its city rooms come later; until then the way in is a sealed door in the Star of
Sorrow chamber ('arc2_open', which the cheat opens). Imported by tools/level/istvan.py (one world)."""
from tools.level.builder import Room

F = 47  # roof floor row


def spire():
    r = Room("imperial_spire", "The Imperial Spire", 33, -6, 2, 3, seed=51, sky="aloft")  # above the clouds
    r.ground(F, top="stone")
    r.wall(0, 0, 1, F)
    r.wall(r.W - 1, 0, r.W, F)
    for x in (1, r.W - 4):                                  # the spire's last pinnacles
        r.wall(x, F - 6, x + 3, F, "gothic_stone")
    r.mark("entry", 6, F - 1, name="arrive", facing=1)
    r.door(4, F - 5, 8, F, "star_chamber", "spire_door")
    r.mark("checkpoint", 9, F - 1, "spire_altar")           # just before Cain
    r.mark("lore", 13, F - 1, lore="spire_inscription")
    # The finale: the whole roof is the arena; at half health both brothers rise into the sky above it.
    r.mark("boss", 42, F - 1, boss="cain", arenaLeft=16 * 16, arenaRight=56 * 16, defeatFlag="cain_defeated",
           intro="cain_intro", outro="cain_outro")
    return r


def rooms():
    return [spire()]
