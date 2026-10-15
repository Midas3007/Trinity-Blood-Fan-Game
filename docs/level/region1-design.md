# Region 1 — Istvan by night (level design plan)

Map: `docs/level/region1-map.png` (drawn by `tools/worldmap.py`). Replaces the 13 corridor rooms of 2026-10-15, which the owner rejected as generic and bland.

## Principles (what was missing)
1. **One connected world on a grid.** Each room occupies whole screen cells (30×17 tiles). An opening in a room's edge automatically connects to the neighbouring room on the grid, so the map is always consistent and the in-game map (M7) comes for free.
2. **Loops and shortcuts, not a line.** Two loops through the hub (Square → Sewer → Water Tunnels → Pumping Station → Bridge → Tavern → Square; Square → Sewer → Ossuary → Crypt → well → Old Town → Square). Shortcuts open from the far side with levers.
3. **Verticality.** Surface streets and rooftops above, undercity in the middle, deep catacombs at the bottom. Shafts, multi-level rooms, one-way drops.
4. **Ability gates for backtracking.** Slide-only gaps from the start; **Crusnik leap** (after boss 1) opens the rooftops route, the cathedral-square ledge and the drowned crypt's upper exit.
5. **Every room has a shape and a focal point** that art can dress: a landmark in the background, a silhouette you remember.
6. **Rooms are drawn as tile grids** (ASCII in the generator → Tiled tile layer), not rectangles, so art tiles, decorations and parallax layers can be laid on top.

## Look and feel (from the source — verify details)
Istvan is a gothic Central-European city on a great river, recently freed from a Methuselah count; tense, poor, watched. Night streets with gas lamps, tall narrow houses with balconies, wet cobbles, posters and curfew notices, the cathedral's spires over everything, the count's castle on the hill across the bridge, airships' lights in the sky (verify). The resistance meets in a tavern cellar. Below: Roman-era water tunnels, ossuaries, a ballroom the old count's household used, now strung with red cord.

## Rooms
| Room | Shape | Focal point / set dressing | Gameplay |
|---|---|---|---|
| Istvan Station (start) | long platform, train behind | steam, arrival board, Abel's luggage | movement tutorial, first lore (sealed orders) |
| Old Town Lane | street + balconies + well | gas lamps, shuttered houses, curfew posters | first thralls; climb balconies to rooftops; well (shortcut down to crypt, opened from below) |
| Rooftops | chimneys, gaps, slopes | cathedral spires and moon behind | Death Hunter on the roofs; leap gap to the square later; secret lore |
| Market Square (hub) | two screens tall: square + fountain + upper galleries | statue of the old count, toppled; fountain shrine (altar) | hub; sewer grate (one-way drop) |
| Cathedral Square | wide steps to great doors | cathedral facade fills the background | doors locked (Region 2); Esther glimpsed in the bell tower (cutscene later) |
| Resistance Tavern | small interior, cellar | candles, maps on tables, rifles | safe room, altar, resistance NPCs (later) |
| Danube Bridge | three screens, broken spans | river below, castle on the hill | gaps into the river (hazard); Death Hunter; far end leads to the castle (Region 2, story gate) |
| Sewer Shaft | vertical, two screens | dripping grates, rusted ladders | drop from the square; branches west (ossuary) and east (water tunnels) |
| Hunter's Crypt | low vault | stone coffins, axe marks | Death Hunter; lever opens the well up to Old Town |
| Water Tunnels | long channel with walkways | Roman arches, running water | thralls; branch down to the Long Stair |
| Pumping Station | machinery, two floors | great wheels and pistons | two-lever puzzle; shortcut up to the bridge |
| The Ossuary | three floors connected by ledges | walls of skulls, chandeliers of bone | several thralls; slide gap to the Reliquary |
| Reliquary (secret) | small, low | reliquary shrine | forbidden page about the Crusnik |
| Long Stair | vertical, two screens | spiral steps around a pit | climb/descend; links tunnels, drowned crypt, chapel |
| Drowned Crypt | three screens, flooded floors | sunken tombs | spike pits, Death Hunter; upper exit needs leap |
| Chapel of Bones | small | bone altar | altar before the boss |
| Marchesa's Ballroom | two screens, high ceiling | chandelier, red strings, mirrors | **Boss 1** (M7) |
| Count's Cellars | two screens | wine vaults, the count's crest | opens after the boss; route toward Region 2 |

## Build plan
1. Generator v2: rooms as ASCII tile grids with a legend (solid, one-way platform, spikes, ladder later), placed on the world grid; exits computed from edge openings; Tiled tile layer + object layer output.
2. Loader: tile layer → merged solid rectangles (fast collision), one-way platforms.
3. Build the 18 rooms above; room-graph tests (grid adjacency, reachability with and without leap).
4. Map screen and Crusnik leap come with Milestone 7.
