# STATUS

Last updated: 2026-10-16 (night)

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

| 8 | Mini bosses from the series (owner, 2026-10-15) | **done:** Sister Paula (Water Tunnels → +1 flask), Isaak Kämpfer the Magus (Forgotten Reliquary → **Abel's first Crusnik transformation**), Brother Petros (Count's Cellars → +25 health); the Marchesa now gives +15% damage; **Latin victory cards** |
| 9 | Creatures and villains in the maps | **done:** fairies (code-drawn flapping wings), bats, bone-rats, **Iron Choir** (shield: hit from behind or parry), **Inquisition hunters** (crossbow bolts; knocked out, not killed); Death Hunters are the puppeted Methuselah |
| 10 | Cutscenes and story | **done:** 18 scenes — opening, every fight's intro/outro, first transformation, Dietrich unmasked, the 80% wings, ending, credits, **teaser for the next arc** (the Empire) |
| 11 | Audio | **done (original music):** 18 original procedural pieces (organ, choir, strings, harpsichord, bells): one per area, one per fight, cutscene moods; procedural SFX; **26 voiced lines** (Landon = Abel, Gideon = narrator, Elodie = Marchesa, Isla = Esther, Vlad = Gyula, Julian = Dietrich, Desmond = the Magus, Knox = Petros, Vera = Paula, Helena = Caterina, Sterling = envoy); Sound on/off in pause. Recorded public-domain music still blocked (see Blockers); it drops in via `src/data/music.json` |
| 12 | Region 2 + final battle | **done:** Cathedral Nave + Bell Tower (portal opens after Petros), Castle Gate, Great Hall, Star of Sorrow chamber (bridge gate opens after Dietrich); bosses Dietrich (Grand Marionette → Dietrich) and Gyula (final, 80% wings phase) |
| 14 | Start-menu progress bar | **done:** Continue shows a percentage and a gold bar (fights 70%, map 20%, lore 10%) |
| 15 | Owner fixes 2026-10-16 | **done:** Midas3007 in the credits; see-through building fronts + cathedral ledge guides; New game really restarts; sewer-shaft hole fixed (grate + ladder); spikes/water send you to the last altar; blood meter from the first mini boss, filled only by Methuselah (new low-born Methuselah enemy; Death Hunters give less) |
| 17 | Owner round 2026-10-16 (b) | **done:** the sword (The Atoner's Blade: combo, air, low, sword execution finisher); fast travel between altars; Options (difficulty, parry assist, shake, flashes, low effects, sound, key rebinding, touch layout editor); 3 save slots; 13 hidden items (reasons to explore) |
| 13 | Full recorded playthrough | **done:** a bot plays the game in 10 chapters (title → teaser), recorded with the game's own music, effects and voices; 15¾ min video sent to the owner; scripts in `tools/playthrough/` |
| 16 | Bestiary and Lore book | **done:** pause → *Bestiary & Lore*: 14 creature/boss pages (portrait, original text, blood, tip) unlocked on first defeat; every lore page you've read |

Older detail (milestones 1–4, sprite pipeline, finishers, title) is in git history (`git show cc792dd:docs/STATUS.md`) and `docs/decisions.md`.

## Owner fixes — the block enemy, the transform, a cheat (2026-10-16, night)
- **"Enemy showing as a block":** that was a Methuselah whose art didn't download on the phone (a dropped request). The game now asks again for any sprite sheet that failed, before the title screen. If one is still missing, the enemy shows another of its own poses instead of a block. Tested by blocking the download once in the browser: the art came through on the retry.
- **Transform (owner rule):** the 40% Crusnik is now available as soon as the blood meter wakes (after Sister Paula). Before, it waited for the Magus fight. The Magus fight still plays its scripted change, and the 80% form stays for the final battle. A meter at 95% or more now counts as full (a 98% bar looks full on a phone), and ABIL transforms in mid-air too. Note: the Chapel of Bones doorway that needs the Crusnik leap, and so the Marchesa, can now be reached before the Magus.
- **Cheat:** enter ↑ ↓ ← → ATK DODGE (on the stick and buttons) to turn it on; the same moves turn it off. While on: no damage, holy water never runs out, the blood meter stays full and ABIL takes the **80% winged form**. It isn't saved: closing the game turns it off.
- Verified: 219/219 tests. The bot entered the code, got 80% wings from ABIL, then turned the cheat off.

## Fix — the unseen attacker on Castle Hill Street (2026-10-16, night)
- The owner was hit by something they couldn't see. It was a low-level Methuselah patrolling inside the ground floor of the house on the street's middle terrace. The painted house front hid it, and it walked out of the doorway to attack.
- Fix, for every room: a building's front now fades (the same see-through as walking inside) whenever an enemy inside it is within 14 tiles of Abel. Two new altars that stood inside houses (Old Town Lane, Castle Hill) were moved out onto the open street. Verified with a screenshot, plus a unit test and 215/215 tests.

## Done (latest) — ledge grab, more altars, smoother motion (2026-10-16, night)
- **Ledge grab:** jump at a wall whose top is just out of reach and keep pushing toward it: Abel catches the edge and hangs. JUMP or stick up pulls him up; keep pushing toward the wall and he pulls up on his own; stick down or away lets go. The Crusnik can do it too. Reach is data (`src/data/player.json`, `ledge*`). The priest still can't reach the Crusnik-leap wall in the Chapel of Bones (a test checks it). For now the pose reuses the ladder-climb art.
- **Altars:** 14 new ones, so there's one about every 80–110 tiles of walking, plus one just before every boss: Paula (Water Tunnels), Kämpfer (Ossuary, by the Reliquary gate), the Marchesa (Ballroom), Petros (Cellars), Dietrich (Nave, as before) and Gyula (Great Hall, as before). All of them are fast-travel stops under the same rules. 21 altars in total.
- **Smoother motion and less flicker:** physics now runs at 240 steps a second instead of 60. Before, Abel moved 2 px one frame and 4 px the next while running, which made him and the scenery judder. Now each frame's step is even. The bot found no one-frame animation flips while running through 4 town rooms.
- Verified: 214/214 tests, type-check, build. The bot saw a ledge grab and pull-up in Bellmakers' Alley. Bot boss runs still win: Paula and Kämpfer, no errors.

## Done (earlier) — the sword, travel, options, slots, hidden items (2026-10-16)
- **The Atoner's Blade:** a sword hidden at the far end of the Hunter's Crypt. It changes base Abel's moves:
  - a three-cut combo, an air slash and a low slash;
  - a new finisher, the sword execution (raise the blade, drive it through; heals a little).
  - The bare hands and the revolver finisher stay. Switch weapons in the pause menu (Weapon: Sword / Fists).
  - New sprite sheet made with the last Higgsfield credits. Weapons are now data (`src/data/weapons.json`), so another weapon is a data entry plus sprites.
- **Hidden items** (reasons to explore), 13 in all:
  - the sword;
  - 4 Sacred Hearts (+10 health each);
  - 2 Silver Chalices (+1 flask each);
  - 6 Tins of Tea (all six: one more flask and harder blows).
  - They sit on roofs, high ledges, a pillar over spikes, and the ends of side passages. Some need the Crusnik's leap, so you come back later.
  - The map marks rooms you've visited that still hide something (gold ◆). The Codex has an Items tab. The title-screen progress counts items.
- **Fast travel:** stand at an altar you've prayed at and push up (a "travel ▲" hint shows). It works once the boss beyond that area is beaten:
  - the market altars after Sister Paula;
  - the Chapel of Bones after Petros;
  - the nave and bell tower after Dietrich;
  - the fortress altars after Gyula.
- **Options** (pause → Options), saved on the phone:
  - difficulty: Story (half damage taken), Normal, Hard (×1.5);
  - parry assist (a wider parry window), screen shake on/off, flashes on/off;
  - low effects (no shake, no sparks);
  - sound;
  - keys: tap an action, press its new key;
  - touch layout: drag any button or the stick, Smaller / Bigger, Reset, Done.
- **Three save slots** on the title screen. Each shows its progress and where you are; an empty slot starts a new game; erasing asks twice. Your old save is slot I.
- Verified: 201/201 tests, build, bot runs:
  - the sword pickup and every sword animation, including the execution;
  - fast travel from the fountain to the Chapel of Bones;
  - Options: difficulty, low effects, rebinding Attack to Q, moving and resizing ATK (saved, and the new layout used in play);
  - slot II new game while slot I keeps its save.

## Done (earlier) — Codex and the recorded playthrough (2026-10-16)
- **Bestiary & Lore book** in the pause menu. The Bestiary has a page for every creature and boss (14): animated portrait, an original description, how much blood it gives, and a fighting tip. Pages unlock the first time you beat that kind. The Lore book collects every lore stone you've read. Locked pages show as "? ? ?".
- **Recorded playthrough:** ten chapters, played by a bot and recorded with the game's own audio:
  1. The title (with progress bar), a new game, the voiced opening and the streets.
  2. Down the sewer grate.
  3. Sister Paula.
  4. The priest's moves (combo, crouch and air attacks, roll, parry, holy water, revolver finisher), Methuselah blood filling the meter, and the Codex.
  5. The Magus and the first transformation.
  6. The Crusnik's moves (transform, scythe, chain lash, high leap, slide, blood drain).
  7. The Marchesa.
  8. Brother Petros.
  9. The cathedral portal, the nave and Dietrich.
  10. Gyula, the 80% wings, the ending, credits and teaser.
- Honest notes on the run: each chapter starts in its own room with the story so far (not one unbroken walk), and bosses start part-way down so fights fit the film.
- Verified: 186/186 tests, build, every chapter's bot run ended in victory (flags checked), no page errors.

## Done (latest) — audio, voices, owner fixes (2026-10-16)
- **Music:** every area, every fight and each cutscene mood has its own original piece, composed in code (no samples, no downloads): title *Nocturne for the Atoner*, streets, undercity, ballroom waltz, cathedral choir, fortress, the Star; six boss themes; sad, tense, awakening, dawn and teaser pieces. Crossfades between them. A real recording replaces any piece by adding a `file` in `src/data/music.json`.
- **Sound effects:** swings, hits, hurt, parry clang, deaths, revolver, crossbow bolts, healing, prayer bell, transformation, doors, victory card, menu taps. **Sound on/off** in the pause menu (saved).
- **Voices:** 26 key cutscene lines voiced (opening, every mini boss, the awakening, the 80% wings, the ending, the teaser). Music ducks under speech.
- **Credits:** "Created and directed by Midas3007".
- **Rooftops:** painted house fronts turn see-through while you stand on their balconies or roofs; the cathedral front shows gold lines on every ledge (faint from the street, bright when you're up on it).
- **Fixed:** Return to title → New game started you where you'd left off (Phaser kept the old start data). A new game now always begins at the station.
- **Fixed:** the sewer-shaft hole. The grate dropped you under a one-tile ceiling. The shaft is now open to the grate, the cramped ledges are gone, an iron grate covers the hole in Market Square, and a ladder runs from it down to the crypt ledge (push down on the grate to go below, up to come back).
- **Spikes and water** send you back to the last altar you prayed at (your damage stays), not to the nearest ledge.
- **Blood meter:** appears after Sister Paula (first mini boss) and fills **only with Methuselah blood**: the new **low-born Methuselah** (red frock coat, claws; 9 placed across the town, undercity and fortress) give the most, **Death Hunters** (reanimated) less, the Marchesa and Gyula a little per hit; humans, puppets and beasts none. Transforming still first happens in the Kämpfer fight. The Crusnik can drain Methuselah.
- Verified: 183/183 tests, build, bot runs (grate ladder down and back up; spikes → altar with damage kept; Methuselah spawn, attack and sprites; music changes per room). Higgsfield: about 2.25 credits left.

## Done (earlier)
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

## Done (latest) — mini bosses, cutscenes, relics
- **Three mini bosses from the series**, each a duel with its own moves, two phases, parryable blades (amber glow) and unparryable attacks (red glow — dodge or jump):
  - **Sister Paula** (Inquisition), Water Tunnels: twin-blade combo with a long lunge, a dash, a leaping strike; phase 2 she blinks behind you. Reward **Lacrima** (+1 flask) — *MISERERE NOBIS*.
  - **Isaak Fernand von Kämpfer, the Magus** (Rosenkreuz), Forgotten Reliquary (behind the Ossuary lever): shadow-flame bolts and volleys (jump or roll), a cane-flame sweep (parry it), teleports, summons bats. At 60% he breaks Abel and **the first Crusnik transformation** plays as a cutscene (Esther almost sees); you finish the fight as the Crusnik. Reward: the Crusnik — *DIES IRAE*.
  - **Brother Petros** (Inquisition), the Count's Cellars: slow lance thrusts (parry), a red-glowing charge from the arena edge (jump it), a slam with floor shockwaves. Reward **Cor Leonis** (+25 health) — *DOMINUS VOBISCUM*.
  - The Marchesa now grants **Sanguis** (+15% damage) — *REQUIESCAT IN PACE*.
- **Cutscenes** as moving manga panels (bordered panels slide onto a black page, painted backgrounds drift, sprites posed inside, typed dialogue, SKIP): the opening (Abel arrives in Istvan), an intro and outro for all four fights, and the first transformation. They tie the plot together: the vanished people were *led* away by a man with a violin → the Magus serves "a friend who plays the strings" → the Marchesa names the golden-haired puppeteer → Petros hunts Abel as a monster while violin music plays over the cathedral (Region 2). Original lines throughout.
- New characters for the story: **Esther** and **Dietrich** (cutscene sprites).
- **Start-menu progress bar**: Continue shows how far the save has gone.
- Art this stage: fairy, three mini bosses, Esther, Dietrich (12 credits; about 30 left).
- Verified: 166/166 tests (each mini boss fights 2 minutes without getting stuck, uses its moves, changes phase and goes down; parry rules; every cutscene's sprites, backgrounds and lines exist; every boss's scenes are written; progress maths), 92 sprite sheets valid, build passes. Bot runs: all three mini bosses from intro scene → fight → (Kämpfer's transformation scene) → outro → relic flag, no errors.
- **Moved:** the Crusnik is no longer unlocked by reading the Forgotten Reliquary page; that page is now foreshadowing and the form wakes in the Kämpfer fight beside it.

## Done (latest) — Region 2, the final battle, the ending
- **Art gaps fixed:** the Crusnik climbs without a drawn ladder (new climb frames) and has his own guard, hurt, crouch and kneel poses; fairies have translucent wings drawn in code that flap.
- **New enemies:** the **Iron Choir** (marionette soldiers with shields: blows from the front are turned aside — hit them from behind, or parry their halberd and finish them) and **Inquisition hunters** (keep their distance and fire crossbow bolts; beaten, they're knocked out, not killed).
- **Region 2** (5 new rooms, 22 in all):
  - **Cathedral Square's portal** opens once Brother Petros is beaten (stand at it, press up). **The Cathedral Nave**: galleries, ladders, the rose window, the organ, an altar; Iron Choir, hunters, fairies. **The Bell Tower** behind the organ: a climb to an altar and the bell-ringer's log.
  - **Boss: Dietrich von Lohengrin.** Phase 1 his **Grand Marionette** of bells and organ pipes (slams with shockwaves — red, jump them; sweeps — amber, parry; falling silver threads marked on the floor). At half health the puppet collapses and **Dietrich** fights himself: thread volleys, snares, fairies, blinking cuts. He escapes. *SIC TRANSIT GLORIA MUNDI* (+damage, +health) and the bridge gate opens.
  - **The Castle Gate → The Great Hall → The Star of Sorrow**, east across the Danube Bridge.
  - **Final boss: Gyula Kádár.** Rapier combos, a dash, and the Star of Sorrow — columns of light marked on the floor, then striking (move!). At half health the **80% Crusnik** scene: wings; you finish the fight with a far higher leap and harder blows. *CONSUMMATUM EST*.
- **The ending** (dawn, Esther and the "angel with black wings"), **credits**, and the **teaser for the next arc** (an envoy of the Empire asks Rome for "the Atoner"), then back to the title. Title subtitle is now *The Star of Sorrow*.
- 12 more credits of art (climb fix, Iron Choir, hunter, Grand Marionette, Gyula, Caterina + envoy, cathedral/fortress walls and props); about 14 left for voices.
- Verified: 171/171 tests (Dietrich and Gyula fight 2 minutes without getting stuck, the Star beam marks then strikes once, Dietrich changes body at phase 2, all 22 rooms connect — doors included), 123 sprite sheets valid, build passes. Bot runs: Dietrich (both phases + scenes) → relic; Gyula (wings scene) → ending → credits → teaser → title, no errors.

## In progress
- Nothing open. Waiting on your phone feedback.

## Blockers
- **Music downloads blocked:** archive.org search now works, but its files are served from `*.archive.org` storage hosts (e.g. dn711007.ca.archive.org, ia800300.us.archive.org), which are still denied. Add `*.archive.org` (or `.archive.org`) to Allowed domains. Tracks are already chosen (see docs/audio-plan.md). Other sites (opengameart.org, incompetech.com, freepd.com, pixabay.com, freesound.org) are still denied. To allow them: in the session's cloud environment menu (title bar) → Edit → Network access → add those domains under Allowed domains (keep "Allow package managers" ticked). Steps: https://code.claude.com/docs/en/cloud-environments#network-access. Until then the game plays its own original pieces. Higgsfield: about 2 credits left (enough for one more image).

## Owner must test (on phone) — ledges, altars, smoothness
1. Find a wall about 4 tiles high (for example on the rooftops in Bellmakers' Alley) and jump at it while holding toward it. Expected: if your jump falls short, Abel grabs the edge, hangs, then pulls up.
2. While hanging, let go of the stick. Expected: he keeps hanging. JUMP pulls him up; stick down drops him.
3. Chapel of Bones: try to reach the high doorway as the priest. Expected: it still can't be grabbed. As the Crusnik it works.
4. Walk from Istvan Station to the Castle Gate. Expected: an altar every short stretch. Pray at each one.
5. Before each boss (Paula, Kämpfer, the Marchesa, Petros), check that an altar sits just outside the arena. Die once, and you should come back right there.
6. Run left and right in the town. Expected: Abel and the backgrounds slide evenly, with no stutter or flicker. Tell me anywhere that still flickers, with the room name.

## Owner must test (on phone) — sword, travel, options, slots
1. Title: three slots. Your old game is slot I. Start a new game in slot II and check slot I is untouched.
2. Hunter's Crypt (west from the sewer ledge), far east end: the sword. Try the combo, a jump slash, a low slash, and the finisher on a staggered enemy. Pause → Weapon switches back to fists.
3. Pause → Options: try Story difficulty, parry assist, Low effects, then Touch layout: drag ATK somewhere comfortable, make it bigger, Done. Does it stay after a reload?
4. Open the map: gold ◆ on rooms that still hide something. Look on roofs and high ledges.
5. After beating Sister Paula, pray at both market altars, then stand at one and push up: travel.

## Owner must test (on phone) — sound, voices and your fixes
1. Tap the title: organ music starts. Walk into the undercity, the ballroom, the cathedral: the music changes. Each boss fight has its own theme.
2. New game: the opening is voiced (Abel = Landon, the orders read by Gideon). Pause → Sound: off silences everything and stays off after a reload.
3. Pause → Return to title → New game (tap twice): you start at the station.
4. Market Square: stand on the grate, push down → climb into the sewer; climb back up the same ladder. No more getting stuck.
5. Walk into spikes or water: you go back to your last altar with your damage kept.
6. Climb onto a house balcony or the cathedral: the front fades and the cathedral shows gold ledge lines.
7. Before Sister Paula there's no blood bar. After her, killing Methuselah (red coats) fills it fast, Death Hunters slowly, other enemies not at all.
8. Credits: your name.

## Owner must test (on phone) — Region 2 and the ending
1. After beating Petros: Cathedral Square, stand at the portal, push the stick up → the nave.
2. Iron Choir: hitting its shield does little — get behind it or parry its halberd. Hunters shoot bolts from the galleries; they end up knocked out on the floor.
3. The chancel: Dietrich's Grand Marionette, then Dietrich himself. Win → the bridge gate is open.
4. East over the bridge: Castle Gate, Great Hall (altar by the far door), the Star of Sorrow: Gyula. Watch the floor marks for the light columns. At half health — wings.
5. Win → ending, credits (tap to speed up), teaser, title.
6. Tell me: too hard/easy? does the ending land? anything confusing about where to go?

## Owner must test (on phone) — mini bosses and cutscenes
1. New game: the opening scene plays (tap to advance, SKIP top-right).
2. Water Tunnels, middle stretch: Sister Paula. Parry her amber slashes, jump her leap, dodge her dash. Win → her outro, then *MISERERE NOBIS* and a 4th flask vial.
3. Ossuary lever → Forgotten Reliquary: the Magus. Roll through his violet bolts, parry the cane sweep. At about half health the transformation scene plays and you fight on as the Crusnik. Win → *DIES IRAE*.
4. Ballroom (Crusnik leap from the Chapel of Bones): the Marchesa now has an intro and an outro scene.
5. Count's Cellars (west of the ballroom): Brother Petros. Jump his red charge and the floor shockwaves; parry the thrusts. Win → *DOMINUS VOBISCUM*, more health.
6. Title screen: Continue now shows a percentage and a bar.
7. Tell me: are the scenes too long? do the characters look right? which fight is too hard or too easy?

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
- Your feedback on the playthrough and the phone tests decides the next round (difficulty, art, more of the Empire arc).
- When the slice is finished: a bot plays the whole game start to end and the run is recorded as a video for the owner (owner request).
- Optional (owner's call): redraw characters taller (about 56 px, Blasphemous scale) for real detail; costs Higgsfield credits and changes his size against doors.
- After your boss feedback: the first cutscene (Abel arrives in Istvan, code-animated manga panels) and Region 2.
