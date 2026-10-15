# STATUS

Last updated: 2026-10-15

## Milestone tracker (CLAUDE.md Part 10)
| # | Milestone | State |
|---|---|---|
| 1 | Foundation | done |
| 2 | Player controller | done (+ roll, slide, crouch, ladders, stairs, walk/run) |
| 3 | Combat | done (+ finishers: revolver, blood drain logic) |
| 4 | First enemy | done (thrall + Death Hunter) |
| 5 | Level slice | done: Istvan Old Town + Undercity, edge transitions, spikes/water, altars, lever-gate puzzles, room-graph test — **phone test pending** |
| 6 | Art integration | in progress: Abel full set (incl. walk, climb, pray, drink), thrall, Death Hunter, title, HUD portrait, shaded tileset, altar + dove, cathedral front, painted house fronts/interiors/props, underground walls; left: NPCs, VFX, more enemies, cathedral interior |
| 7 | Progression | in progress: holy-water flasks ✅, map ✅, altars/checkpoints ✅, pause ✅; left: save/load, Crusnik form + leap ability gate, chain lash, dialogue, Marchesa boss |

Older detail (milestones 1–4, sprite pipeline, finishers, title) is in git history (`git show cc792dd:docs/STATUS.md`) and `docs/decisions.md`.

## Done (latest)
- **The Undercity (9 new rooms; 17 rooms in all, most several screens wide):** Hunter's Crypt, The Ossuary (3 levels), Forgotten Reliquary (secret), Water Tunnels, The Long Stair, The Drowned Crypt, Chapel of Bones (altar), The Marchesa's Ballroom (sealed until the boss), the Count's Cellars. Painted underground walls (crypt, ossuary, roman sewer, ballroom), coffins, bones, cages, saint statues, chandelier. 4 new lore texts.
- **Shortcut:** a lever in Hunter's Crypt opens the well grate in Bellmakers' Alley; climb the well ladder straight up into the town.
- **Puzzle:** the Ossuary reliquary gate; its lever sits on a high ledge reached by a ladder.
- **Fixes found by playing it with a bot:**
  - Climbing up through a room edge dropped Abel off the ladder.
  - Abel didn't snap to the middle of a ladder, so he snagged on stone in 1-tile shafts.
  - The crypt spike pit was a pixel too wide to jump; it is now 3 tiles.
- Verified here: type-check, build, 111/111 tests, all 11 underground/edge rooms load with no errors and spawn on solid ground; bot runs: crypt spikes → lever → well → alley; ossuary ladders → lever → gate flag.

## In progress
- Milestone 7: save/load next, then the Crusnik form + leap gate, then the Marchesa boss.

## Blockers
- None. Higgsfield: about 56 credits left.

## Owner must test (on phone) — the Undercity
1. Market Square → drop into the sewer grate → Sewer Shaft. West door → Hunter's Crypt; east door at the bottom → Water Tunnels.
2. Hunter's Crypt: jump the spike pit, hit the lever by the well. Climb the ladder up → you come out of the well in Bellmakers' Alley standing on the grate.
3. Ossuary: drop through the hole in the floor, climb the ladders. On the top floor, west end: ladder up to the ledge, hit the lever → the gate on the bottom floor opens to the Forgotten Reliquary.
4. Water Tunnels → The Long Stair (go down) → Chapel of Bones (pray at the altar: dove appears) → the Marchesa's Ballroom door stays shut for now.
5. Tell me: too dark? too samey between rooms? jumps fair?

## Owner must test (on phone) — the town (kept)
1. Station → Old Town Lane → Bellmakers' Alley → Market Square → Cathedral Square → Castle Hill Street → Bridge.
2. Enter a house, climb to the roof through the hatch, jump roof to roof, drop to the street.
3. Ladders: up, down, stop half-way (climbing pose, no floating). MAP and PAUSE buttons top-right.
4. Pray at an altar: kneel, light beam, dove over his head, health and flasks refilled.

## Next step
- Milestone 7: versioned save/load (localStorage), then Crusnik 40% form + leap ability that opens a blocked path, then the Marchesa boss in her ballroom.
