# Feel Spec

Two kinds of entries, never mixed up:
- **Researched** — what public sources say about the reference game (2026-10-14 web research; sources at the bottom). Almost all of it is qualitative; no source publishes movement speeds or frame timings.
- **Owner observation** — what you notice while playing (fill in any time; it overrides the design choice).

The **value in game** is a **design choice** made to match the researched behaviour; it is not a measured number from the reference game. All values live in `src/data/player.json`.

## How to measure on your phone (optional)
Record the screen while playing, scrub frame by frame, and use the character's height as a ruler. A rough range is fine.

## Movement

| Parameter | Researched (reference game) | Owner observation | Value in game (design choice) |
|---|---|---|---|
| Run speed | "Weighty" character, deliberate pace [R2][R7] | | 120 px/s (one screen in 4 s) |
| Acceleration / stop | Not published | | full speed in 0.1 s, stop in 0.075 s; weaker in air |
| Jump height | Not published | | ≈64 px ≈ 2.1 player heights |
| Variable jump height | **Yes** — height depends on how long jump is held [R3] | | release cuts upward speed to 40 % |
| Air control | **Yes** — left/right steer in the air [R3] | | yes, reduced (800 vs 1200 px/s²) |
| Rise vs fall | Not published | | falls faster (gravity 1400 down vs 900 up) |
| Coyote time | Exists in code (`GhostJumpDelay`, F3); value not published | | 100 ms (genre-typical 50–150 ms [R9]) |
| Jump buffer | Exists in code (`FallingJumpTolerance`, F3); value not published | | 110 ms |
| Hard landing | Exists (`HardLandingBehaviour`, F2) | | after falling ≥160 px; 350 ms stuck |
| Dodge/slide | Ground slide; brief invulnerability; passes **through enemies**; slides under small gaps; **cannot** avoid magic/projectiles [R1][R3][R4] | | 240 px/s for 380 ms (≈91 px); ground only |
| Dodge invulnerability | "A few invincibility frames" [R7]; some players say it is mostly about passing through wind-ups [R4] | | first 260 ms of the slide |
| Dodge cooldown | Exists (`DashCooldown`, F4) | | 300 ms after a roll or slide ends |
| Roll vs slide (owner request) | Reference has one slide that goes under gaps [R3] | Owner: wants a roll **and** a slide | Roll (DODGE): 380 ms, 240 px/s, invulnerable 260 ms, body 20 px tall. Slide (down + DODGE): 450 ms, 300→140 px/s (≈100 px), invulnerable only 100 ms, body 15 px tall — fits under gaps |
| Crouch | Exists (`CrouchState`, F2) | Owner: stick down = crouch | body 15 px tall, no walking; crawling only when there is no room to stand; low crouch attack (9 dmg) |
| Stick up = jump | — | Owner request | stick pushed up past 65 % = JUMP held (works with variable height) |
| Air boost | "Air impulse": down + attack in the air, up to 2 times per jump [R1][R3] | | not in our game (Abel gets wings instead) |
| Wall cling | Attack toward certain walls while jumping to cling; jump to drop [R3] | | later milestone |
| Ledges / ladders | Exist (F5) | | later milestone |

## Combat (Milestone 3)

| Parameter | Researched | Owner observation | Value in game |
|---|---|---|---|
| Basic combo | 3 hits, third is stronger; becomes 4 after upgrade [R3] | | 3 hits: 10 / 12 / 22 damage; third has a lunge, launch and screen shake |
| Parry | Timed block at the moment of impact; stuns some enemies → counter / execution [R5][R6] | | — |
| Counter damage | ~3× sword damage, invulnerable while it plays [R6] | | — |
| Execution | Finisher on stunned enemies, grants bonus resources [R3] | | — |
| Feel | "Meaty", "demanding and deliberate", "brutal and unforgiving" [R2][R7][R8] | | — |
| Hit pause / shake | Not published; slow-motion and shake presets exist in code (F7, F8) | | hit pause 50–110 ms per attack; shake only on the finisher and when hurt |

## Progression and world (Milestone 5–7)

| Parameter | Researched | Owner observation | Value in game |
|---|---|---|---|
| Healing flasks | Heal 40 HP at level 1, +30 per upgrade, up to 190 at level 6 [R5] | | holy water vials; scale TBD |
| Healing interrupted | Taking damage while drinking cancels the heal and the flask is lost [R5] | | planned |
| Health | Not confirmed; one guide implies ~120–130 base, 250 after 6 upgrades [R5] | | — |
| Checkpoints | Prie Dieu: refills health and flasks, respawn point, **respawns enemies** [R5] | | altars, same behaviour |
| Death | Leaves a "Guilt Fragment" that reduces resource gain until recovered [R5] | | not planned yet |

## Sources (2026-10-14)
- [R1] Blasphemous Wiki (Fandom), Category: Game Mechanics — https://blasphemous.fandom.com/wiki/Category:Game_Mechanics
- [R2] Gamer Guides review — https://gamerguides.com/blasphemous/review ; PC Gamer review — https://pcgamer.com/blasphemous-review
- [R3] Player mechanics document (community) — https://github.com/xuhangc/Blasphemous-Document/blob/main/Mechanics/Player_Mechanics.md
- [R4] Steam community discussions — https://steamcommunity.com/app/774361/discussions/0/1697221160909244094 , https://steamcommunity.com/app/774361/discussions/0/4009846212733902041
- [R5] Bile Flasks (wiki.gg) — https://blasphemous.wiki.gg/wiki/Bile_Flasks ; Wikipedia — https://en.wikipedia.org/wiki/Blasphemous_(video_game)
- [R6] Combat (Fextralife wiki) — https://blasphemous.wiki.fextralife.com/Combat ; PSNProfiles trophy guide — https://psnprofiles.com/guide/9115-blasphemous-trophy-guide
- [R7] Nintendo Life review — https://www.nintendolife.com/reviews/switch-eshop/blasphemous ; Xbox Tavern review — https://xboxtavern.com/blasphemous-review
- [R8] Nintendo World Report review — https://nintendoworldreport.com/review/51743 ; Gamereactor review — https://msn.gamereactor.eu/blasphemous-review/
- [R9] Coyote time and input buffering (general guide) — https://bugnet.io/blog/coyote-time-and-input-buffering-explained ; Celeste & Forgiveness — https://maddymakesgames.com/articles/celeste_and_forgiveness/

Videos could not be watched from here; the owner observation column is the way to add what footage shows.
