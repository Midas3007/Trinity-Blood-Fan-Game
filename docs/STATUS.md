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
| 7 | Progression | in progress: holy-water flasks ✅, map ✅, altars/checkpoints ✅, pause ✅, save/load ✅; left: Crusnik form + leap ability gate, chain lash, dialogue, Marchesa boss |

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

## Done (latest, cont.)
- **Save/load:** autosaves on every room change, prayer and Return to title. Title shows **Continue** (resumes at your last altar, fully healed, levers and map kept) and **New game** (tap twice to erase). Corrupt or cut-off saves fall back to the previous one. Verified: 125/125 tests (round-trip, v1 migration, corrupt/future saves, full storage), browser: continue → right room, flags and altar; new game → station, save erased.

- **Sprite texture pass (owner request):** every sprite sheet now goes through a texture stage (`tools/spritegen/texture.py`): violet cloth shadows with local contrast so coat folds and seams show, a light dither like the room art, and a rim light from the upper left for volume. No credits used. Verified: 28/28 pipeline tests, 29 sheets valid, build passes. Limit: at 40 px tall there is only so much room for detail; a bigger jump needs taller sprites (see Next step).

## Done (latest, owner bug reports)
- **Pause menu buttons fixed:** Resume / Return to title did nothing once the camera had scrolled (their tap areas stayed where the room began). Rebuilt as gothic plaques (gold double border, studs, crimson press) on a framed panel; the title's Continue / New game use the same buttons. Browser-checked in a scrolled room: Resume closes, Return to title goes to the title.
- **Map shows only altars you have prayed at** (gold cross); unused altars stay hidden. Browser-checked: none before praying, one after.
- **Locked out of Hunter's Crypt fixed:** the crypt's door in the Sewer Shaft sat on a ledge reachable only by precise platform jumps. Added a ladder from the shaft floor (east of the spikes) up to a wider ledge. Bot run: floor → ladder → ledge → crypt → back.

## In progress
- the Crusnik form + leap gate, then the Marchesa boss.

## Blockers
- None. Higgsfield: about 56 credits left.

## Owner must test (on phone) — sprite texture
1. Look at Abel standing and running in a lit street and in the crypt: the coat should show folds, a lighter edge on one side and a darker one on the other, not one flat grey.
2. Same for the thrall and the Death Hunter. Tell me: better, too noisy, or still too plain?

## Owner must test (on phone) — saving
1. Play, walk through a few rooms, pull a lever. Close the app completely and reopen: title shows Continue / New game.
2. Continue → you are at the last altar you prayed at (or the station), the lever is still pulled, the map remembers rooms.
3. New game → tap once (it asks again), tap again → fresh start.

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
- When the slice is finished: a bot plays the whole game start to end and the run is recorded as a video for the owner (owner request).
- Optional (owner's call): redraw characters taller (about 56 px, Blasphemous scale) for real detail; costs Higgsfield credits and changes his size against doors.
- Crusnik 40% form + leap ability that opens a blocked path, then the Marchesa boss in her ballroom.
