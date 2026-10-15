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
| 7 | Progression | in progress: holy-water flasks ✅, map ✅, altars/checkpoints ✅, pause ✅, save/load ✅, Crusnik form + leap gate + chain lash ✅, parry ✅, dialogue box ✅, **first boss: the Marchesa ✅**; left: boss rematch polish, more dialogue/cutscenes |

| 8 | Mini bosses from the series (owner, 2026-10-15) | planned: 3 mini bosses (plan below), each with a cutscene tied to the plot and a permanent reward (strength, health, healing, blood); Abel's **first Crusnik transformation** happens in one of these fights; victory cards in **Latin** |
| 9 | Creatures and villains in the maps | in progress: **fairies** ✅ (hover, scream rings), **bats** ✅ (swoop), **bone-rats** ✅ placed through the sewers, crypts, ossuary, tunnels, stair and cellars (+ bats in the sewer shaft and cathedral square); left: Iron Choir soldiers, Inquisition hunters, puppeted Methuselah |
| 10 | Cutscenes and story | planned: code-animated manga-panel cutscenes — opening, one per mini boss, the Marchesa, the final battle (Dietrich / Gyula Kádár), and a **post-credits teaser for the next arc**; original dialogue |
| 11 | Audio | planned: **voices** for cutscene lines, **copyright-free gothic music** (per region, boss themes), SFX; audio unlock on first touch. Blocked: the sandbox network denies free-music sites (see Blockers) |
| 12 | Region 2 + final battle | planned: the cathedral and the count's fortress, Dietrich's Grand Marionette, Gyula Kádár and the Star of Sorrow, the 80% Crusnik moment, ending |
| 14 | Start-menu progress bar | planned (owner): the title screen's Continue shows how far the save has gone (percent and bar) |
| 13 | Full recorded playthrough | planned (owner): a bot plays the finished game start to end and the run is recorded as a video |

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

## Done (latest) — the Crusnik awakens
- **How it works:** read the *Forbidden page* in the Forgotten Reliquary (behind the Ossuary lever) → banner "THE CRUSNIK STIRS" and the blue bar under your health appears, already full. The bar fills from hits (+8) and kills (+20) and **glows** when full: press **ABIL** to transform (crimson flash; you can't be hurt during the change).
- **As the Crusnik (40%, wingless):** ATK = scythe (×1.5 damage), ABIL = **chain lash** (reaches about 6 tiles, drawn as a spiked chain), DODGE = **slide** (owner request), a much higher **leap** (122 px vs 64), faster run. The bar drains (~14 s); at zero he becomes the priest again. The blood drain finisher refills it.
- **Ability gate:** the Chapel of Bones' way to the Marchesa's Ballroom is a doorway on a 6-tile wall of bones: only the Crusnik leap reaches it. A lore stone hints at it.
- **New art (Higgsfield, 8 credits, about 48 left):** Crusnik idle, run, walk, leap, fall, land, scythe, chain lash, slide, climb, transformation; 80% winged flight poses (fly, hover, dive) for cutscenes and scripted moments.
- Known art gap: the Crusnik climb frames still show the ladder the art was drawn on (it sits over the real ladder at about the same width); fix on the next art pass.
- Verified: 138/138 tests (meter, transform, scythe/lash/slide, drain back to priest, leap height vs the wall, every Crusnik state has art); bot run: priest can't climb the wall → ABIL → Crusnik → scythe, lash, slide → leap → Ballroom, still transformed.

## Done (latest) — the Marchesa (first boss) and PARRY
- **PARRY** (new button left of JUMP; keys O/B; gamepad LB): a short guard. Catch a blade in the window → steel flash, the attacker reels; press ATK straight after for the riposte. Thralls and Death Hunters reel too, which opens the revolver finisher. Mistimed parries leave Abel open for a moment.
- **The Marchesa of the Catacombs** (the Ballroom, reached by the Crusnik leap from the Chapel of Bones). Built on the structure of Crisanta's fight in Blasphemous (research W5), with original art and story:
  - Walk into the middle of the ballroom: curtains of crimson string drop on both sides, the camera locks, her name and health bar appear at the bottom. She hangs limp in her strings, then drops.
  - **Phase 1 (strings):** two-slash combo, the second a long lunge across the floor (parry it or be far away); **plummet**: her strings yank her up, she hovers over you and dives blade-first; the impact sends crimson shockwaves both ways along the floor (jump them, they can't be parried).
  - **Phase 2 (half health):** the strings snap (she's briefly untouchable), she's faster, and adds a **vanish → reappear at the far edge (glowing) → charge across**: jump over it or parry it.
  - Parried, she reels and takes double damage. Her blade glows amber before every slash.
  - When she falls: her last words in a dialogue box (tap to advance; original lines that point at the puppeteer), "REQUIESCAT IN PACE", the west gate opens, the game saves.
- Art: two pose sheets (4 credits, about 44 left): stance, walk, slash, lunge, reel, hanging, leap, dive, impact, charge, death. Strings are drawn in code (they snap in phase 2). A faint crimson aura keeps her readable in the dark ballroom.
- Verified: 150/150 tests (brain: intro, combo + lunge distance, plummet + shockwaves, parry stagger + double damage, phase 2 vanish/charge to the far edge, a 2-minute random fight never stuck; parry state and combat hook). Bot runs: a 40-second fight saw every state including phase 2 (the bot lost, as it should); a low-health run went through death → dialogue → flag → arena opened, no errors.

## Done (latest) — creatures in the maps
- **Fairies** (original): pale child-like things with insect wings that hover at a distance, glow amber, then **scream a ring of sound** — dodge through it or stay out of reach (it can't be parried). Ossuary, Long Stair, Drowned Crypt. (Art gap: most of the violet wing membrane was lost against the magenta background; the wings read as thin white lines.)
- **Bats**: bob near their perch, swoop at you (they only hurt while swooping). Sewer Shaft, Hunter's Crypt, Water Tunnels, Long Stair, Drowned Crypt, Cellars, Cathedral Square.
- **Bone-rats**: small, fast, weak biters. Crypt, Ossuary, Tunnels, Cellars.
- Bats and rats are drawn in code (no credits); the fairy cost 2 credits (about 40 left). Kills fill the Crusnik blood bar too.
- Verified: 153/153 tests (bat swoop, fairy ring hits once, give-up and return home, falling when killed); browser: creatures spawn, a bone-rat bit Abel, no errors.

## In progress
- the Crusnik form + leap gate, then the Marchesa boss.

## Blockers
- **Music downloads blocked:** archive.org search now works, but its files are served from `*.archive.org` storage hosts (e.g. dn711007.ca.archive.org, ia800300.us.archive.org), which are still denied. Add `*.archive.org` (or `.archive.org`) to Allowed domains. Tracks are already chosen (see docs/audio-plan.md). Other sites (opengameart.org, incompetech.com, freepd.com, pixabay.com, freesound.org) are still denied. To allow them: in the session's cloud environment menu (title bar) → Edit → Network access → add those domains under Allowed domains (keep "Allow package managers" ticked). Steps: https://code.claude.com/docs/en/cloud-environments#network-access. Until then the audio system is built and waits for the tracks. Higgsfield: about 44 credits left.

## Owner must test (on phone) — creatures
1. Sewer Shaft / Hunter's Crypt: bats drop from their perch and swoop; hit them out of the air. Bone-rats scuttle and bite.
2. Ossuary / Drowned Crypt: fairies hover out of reach, flash amber and scream a pale ring: roll through it.
3. Tell me: too many? too annoying? do the fairies look right?

## Owner must test (on phone) — PARRY and the Marchesa
1. Find PARRY (left of JUMP). Near a thrall, tap it just as the amber claw comes: steel flash, it reels with the red diamond → ATK for the revolver finisher.
2. The Ballroom: leap up from the Chapel of Bones as the Crusnik (or keep the blood bar for the fight). Walk to the middle: curtains drop, the boss bar appears.
3. Phase 1: parry her slashes (the amber glow is your cue; the second one lunges far). When she's pulled up, move away and jump the red shockwaves.
4. Phase 2: when she vanishes, watch the edges: she glows red, then charges: jump over or parry.
5. Beat her: read her last words (tap), then the west gate is open. Die instead: you return to the chapel altar and can try again.
6. Tell me: too hard/easy? parry window too tight? is she easy to see? does it feel like Crisanta?

## Owner must test (on phone) — the Crusnik
1. Get to the Forgotten Reliquary (Ossuary: top floor west ladder → lever → bottom-floor gate) and stand at the page. The banner appears and the blue bar shows, glowing.
2. Press ABIL: crimson flash, Abel becomes the Crusnik. Try ATK (scythe), ABIL (chain lash: hits from far away), DODGE (slide), JUMP (very high).
3. Watch the blue bar drain; when empty he turns back. Fight thralls to fill it again (it glows when ready).
4. Chapel of Bones: as the priest, the wall by the west door can't be climbed; as the Crusnik, leap to the doorway → the Ballroom.
5. Tell me: is the form too short or too long? lash too strong? leap fun?

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
- After your boss feedback: the first cutscene (Abel arrives in Istvan, code-animated manga panels) and Region 2.
