# Decisions

## 2026-10-14 — Milestone 1 foundation

| Decision | Reason | Alternatives considered |
|---|---|---|
| Phaser **3.90.0** (pinned), not Phaser 4 | CLAUDE.md fixes the stack on Phaser 3; 3.90 is the last 3.x release. | Phaser 4.x (newer, but a stack change needs owner approval). |
| TypeScript 5.9.3, Vite 8, vite-plugin-pwa 2.0, Vitest 5 (all pinned) | Current releases that are compatible with each other; TS 5.x kept over 6/7 for stability. | TS 6/7. |
| Internal resolution **480×270** (16:9), `Scale.FIT`, `pixelArt: true` | Fits most phone landscape screens; 270 lines suits pixel art. FIT gives non-integer scale on most phones; integer scaling will be revisited in Milestone 6 when real pixel art arrives. | 384×216, 640×360; integer-zoom scaling now. |
| Arcade Physics with `fixedStep` at 60 steps/s | Physics independent of display refresh rate (e.g. 90/120 Hz phones). | Custom fixed-timestep loop. |
| Input = per-source frames (touch, keyboard, gamepad) merged each frame into one `ActionState` | Gameplay code never knows which device is used; merge logic is pure and unit-tested. | Phaser input calls directly in player code. |
| Touch: fixed stick (left 42% of screen, below top 35%) + 5 buttons; layout in `src/data/controls.json` | Simple and predictable for M1. Top-left corner stays free for the debug triple-tap. Saved per-device layout editing is deferred. | Floating stick that recentres on touch (consider after phone tests). |
| PWA `registerType: 'autoUpdate'`, `cleanupOutdatedCaches`, `vercel.json` no-cache headers on `sw.js` and `index.html` | New deploys replace the old service worker without leaving players on a stale cache. | Prompt-to-update UI. |
| Debug overlay toggled by triple-tap in the top-left 48×48 px, or backtick key | Works on phone without extra buttons. | Dedicated on-screen button. |

## 2026-10-14 — Story and creative direction approved

| Decision | Reason | Alternatives considered |
|---|---|---|
| Story "Requiem for Rome": original side story during the anime, Dietrich as villain, 2 regions + hub | Owner delegated; easiest to build (one city, one villain idea explains all enemies), no retelling of episodes | Retelling an anime arc (harder, copyright-sensitive) |
| Music: real-world gothic/sacred classical music | Owner request | Fully original score |
| Only public-domain compositions **with** public-domain/CC recordings, or our own renders from PD scores | A recording carries its own copyright even when the piece is old | — |

## 2026-10-14 — Milestone 2 player controller

| Decision | Reason | Alternatives considered |
|---|---|---|
| Movement values are design choices informed by researched behaviour (`docs/feel-spec.md`) | No public source gives the reference game's speeds or timings; the extract has no tuning data | Waiting for owner measurements |
| Velocity-based accel/decel with separate air values; asymmetric gravity applied as a per-body extra on top of world gravity | Simple, tunable, keeps Arcade Physics | Custom integrator |
| Pure `PlayerTimers` (coyote, buffer, dodge cooldown, invulnerability) and states that only touch a `PlayerContext` interface; tests drive them with a small simulated body (`tests/playerSim.ts`) | State logic testable without Phaser | Testing in a headless browser |
| State time tracked by the `StateMachine` and passed to `update` | One place for timing; states stay small | Each state keeps its own timer |
| Dodge is ground-only, keeps full height (no slide-under-gaps yet) | Matches the reference slide; slide-under needs body resizing and level content, deferred | Shrinking the hitbox now |
| Inputs latch presses between frames (keyboard via `key.timeDown`, touch via a tapped set) | A press and release inside one frame was being lost (found in the browser smoke test) | Reading input from events only |
| Frame time clamped to 50 ms for player logic | Avoids huge steps after hitches or tab switches | No clamp |

## 2026-10-14 — Milestone 3 combat

| Decision | Reason | Alternatives considered |
|---|---|---|
| Attacks are data (`src/data/attacks.json`): frame timings, damage, knockback, hit pause, shake, lunge, dodge-cancel, hitbox, `next` for combos; validated at load | "New attacks need only data" (CLAUDE.md Part 7); broken data fails loudly | Hard-coded attack classes |
| Pure `AttackRunner` drives swings and combos; press after startup queues the next step, which starts at recovery | Testable without Phaser; simple, readable combo rule | Animation-event-driven combos (no art yet) |
| One swing hits each target once (`registerHit`) | Prevents multi-hits from long active frames | Per-frame damage |
| Hit-stop pauses physics and skips input reads (presses are kept for the next frame) | Freeze is total and nothing is lost | Time-scaling |
| Feedback (hit-stop, shake, sparks, HUD) subscribes to a typed `EventBus`; combat code only emits events | Systems don't reach into each other (CLAUDE.md Part 7) | Direct calls |
| Sparks use a fixed pool; `src/data/effects.json` can turn shake/sparks off | Phone performance; low-effects mode | Phaser particle emitters |
| Training dummies (grey = punching bag, red = contact damage) stand in for enemies | Something to hit before Milestone 4's enemy AI | Building the first enemy now |
| Player death = respawn at the room spawn with full health | Placeholder until checkpoints (Milestone 5) | Game-over screen |

## 2026-10-15 — Milestone 4 first enemy (string-bound thrall)

| Decision | Reason | Alternatives considered |
|---|---|---|
| Enemy types are data (`src/data/enemies.json`), incl. their attacks in the same format as player attacks; validated at load | Reuse the combat pipeline; new enemy variants without code | Hard-coded per-enemy classes |
| One shared "melee walker" state machine: idle → patrol → alert → pursue → attack, plus hurt and dead; every state exits by time or condition | Covers the thrall and future simple melee enemies; "no stuck states" is tested with a 2-minute randomised run | Behaviour trees (overkill now) |
| Vision = box in front (+ short range behind), height-limited; no wall line-of-sight yet | Simple and readable; rooms are open for now | Raycasts (add with Tiled rooms in M5) |
| Ledge awareness by probing the room's solid rectangles just past the leading foot | Enemies never walk off platforms | Physics raycasts |
| Long, coloured wind-up (480 ms, turns amber) before the claw; super armour only during the claw's active frames | Readable, fair, deliberate combat matching the reference feel | Instant attacks |
| Enemies come from a fixed `Pool` per type, pre-created at room load; dead enemies return to the pool and respawn (test room: 4 s) | No allocation during play (CLAUDE.md Part 7); checkpoints will control respawns in M5 | Create/destroy on demand |
| Combat resolution moved into a pure `CombatSystem` (player attacks, enemy attacks, contact hazards → events) | Scene stays thin; whole hit flow unit-tested with fakes | Keep it in the scene |
| `Damageable.receiveHit` returns whether the hit landed | Invulnerable targets don't trigger hit feedback | Separate pre-check |
| Enemies and the player pass through each other (no body collision) | Matches the reference dodge-through feel; avoids getting pinned | Solid bodies |

## 2026-10-15 — Owner requests: roll + slide, stick up = jump, stick down = crouch

| Decision | Reason | Alternatives considered |
|---|---|---|
| DODGE = **roll** (tucked 20 px body, mostly invulnerable, can't fit under low gaps); **down + DODGE = slide** (15 px body, faster and longer, only 100 ms invulnerable, fits under gaps) | Owner wanted both; gives each a clear job (roll = avoid attacks, slide = traversal) | Separate SLIDE button (more buttons on a phone) |
| Stick pushed up past 65 % counts as holding JUMP (touch); Up/W also jump on keyboard. JUMP button kept | Owner request ("how games are"); 65 % stops accidental jumps when pushing diagonally while running | Any upward push |
| Stick/keys down past 60 % = crouch; crouch attack is a separate data attack (`crouch`) | Owner request; matches the reference's crouch and crouch attack | — |
| Crawling only when a ceiling prevents standing | Players can never get stuck under a low gap after a slide; normal crouch stays planted | Always allow crawling |
| Posture change resizes the real body (not scale), re-syncs it, and resets its previous position | Scaling/resizing let Arcade drag the body 15 px into the floor (found in the browser playtest) | — |

## 2026-10-15 — Sprite pipeline adopted (tailored from the owner's generic spec)

| Decision | Reason | Alternatives considered |
|---|---|---|
| Keep approved 480×270 / Abel ≈40 px / 64×64 cells; scale the spec's other sizes ×0.75 | Creative direction already approved; integer scales to 1080p/4K | Spec's 640×360 / 60 px / 96×96 |
| Gameplay timing stays authoritative in `attacks.json`/`enemies.json`; sprite manifests carry frames/events; a test enforces they agree | Combat data is already tested; avoids two sources of truth drifting | Move combat timing into manifests |
| Python tool using only installed libs (Pillow, numpy, PyYAML, click; unittest) | No new dependencies (CLAUDE.md Part 2) | typer, scikit-image, pytest |
| Higgsfield models: Nano Banana Pro (design/poses), Nano Banana 2.1 (seeded re-rolls), FLUX 3 (multi-ref), AutoSprite (experiment) | Owner's connector; spec's preferred model is available there | Gemini/ChatGPT directly |
| Prompts never name the franchise or attach official art | Keeps designs original (CLAUDE.md Part 6) | — |
| No dynamic lighting / normal maps | Phone performance; lighting painted via palette + additive glow sprites | Phaser Light2D |
| Pending owner: Requiem 48 palette, 96×96 Crusnik cell, build tools now vs M6, credits, GitHub Actions | Changes to approved direction or cost | — |

## 2026-10-15 — Sprite pipeline built; first generation round; owner references

| Decision | Reason | Alternatives considered |
|---|---|---|
| Owner approved all recommendations: Requiem 48, 96×96 Crusnik cell, build tools now, Higgsfield credits in small owner-approved rounds, GitHub Actions CI | Owner reply | — |
| Credit budget: 104 credits; Nano Banana Pro = 2 credits per image at 2K (1K costs the same, so always 2K) | Measured with cost preflight | — |
| Owner's official reference images are read-only notes: never attached to AI tools, never committed | CLAUDE.md Part 6; avoids copying official art | Using them as image references |
| Abel's coat is charcoal with white piping (from the references) | Matches the character and fixes 40 px readability (near-black coat vanished in preview) | Pure black + heavy shadow lift |
| Committed sprite inputs are small approved crops; raw 2K generations are gitignored with job-id sidecars | "Never commit large binaries" (CLAUDE.md Part 2) | Git LFS |

## 2026-10-15 — Real sprites in the game (early art integration)

| Decision | Reason | Alternatives considered |
|---|---|---|
| Owner: "take charge, don't ask for permission, just report" | Owner instruction | — |
| Pipeline writes `public/assets/sprites/index.json`; `BootScene` loads it, then each sheet, and builds Phaser animations from the manifests | No imports from `public/`; adding sheets needs no code change | Hard-coded loader list |
| `PlayerView` draws the sprite at the physics body's feet (origin bottom-centre, whole pixels, mirrored for facing); the Arcade rectangle stays the collision body | Art never changes collision; placeholder fallback if sheets fail to load | Sprite as physics body |
| `src/data/playerAnimations.json` maps states to animations; states without art borrow a frozen frame, low postures show the placeholder | Playable now, filled in as pose sets arrive | Wait for every pose |

## 2026-10-15 — Full priest-form animation set

| Decision | Reason | Alternatives considered |
|---|---|---|
| Attack sheets use `sequence: [0,1,1]` (wind-up, strike, strike held) with durations equal to `attacks.json` startup/active/recovery | One strike drawing per hit is enough at 40 px; timing test keeps art and hitboxes in sync | One frame per phase (more credits) |
| Low-pose sheet regenerated wide (21:9, 5 poses, spaced) after r1 could not be split | 2 credits cheaper than hand-cleaning overlapping figures | Manual masking |
| Per-animation `anchor: centre` for lying poses (slide) | Foot-centre anchor is for upright poses | Hand offsets per frame |
| Player sprite drawn on the scene's POST_UPDATE event | `scene.update` runs before Arcade copies the body position to the game object, so the art trailed by one step (~4 px at roll speed) | Reading `body.center` in update |

## 2026-10-15 — Thrall art, Crusnik design, shared sprite view

| Decision | Reason | Alternatives considered |
|---|---|---|
| Thrall made in one 7-pose sheet (no separate turnaround) | One image keeps the design consistent and costs 2 credits instead of 4+ | Turnaround first, then poses |
| Thrall chase reuses the walk at 1.9× speed (`timeScale` in `enemyAnimations.json`) | Chase speed is ~2× walk speed; no extra art | Separate run frames |
| Wind-up warning stays a code tint (amber) over the art | Keeps the readable telegraph players already learned | Painted glow frames |
| Crusnik form scaled from head-to-toe height (wings excluded) at 50 px | Owner asked for taller; wings would otherwise shrink the body | Same 40 px as priest |
| `approve` reads `sprite_height` and `source_dir` from `pipeline.yaml` | It silently used 40 px and the wrong folder for non-Abel entities | CLI flags each time |
| Death Hunters: owner screenshots are read-only notes; our written description goes in prompts | CLAUDE.md Part 6 | Attaching the screenshots |

## 2026-10-15 — Finishers (revolver execution, blood drain) and Crusnik redesign

| Decision | Reason | Alternatives considered |
|---|---|---|
| Enemies stagger once per life at `staggerBelowFraction` of health (thrall 0.5 = after hits 1–2) for `staggerMs`; ATK in range plays a finisher | Owner asked for a gun finisher; a stagger window makes it a choice, not an automatic kill. Finishing the combo still kills normally | Finisher only on kill; finisher button |
| Finishers are data (`finishers.json`) chosen by form and target: priest → revolver on anything; Crusnik → blood drain on `drainable` (Methuselah) only | Matches the anime (Crusnik feeds on vampires) and the mercy theme for human thralls | Drain everything |
| Blood drain = heal + timed damage multiplier (`StrengthBuff`), applied through `resolveAttack` | "Drinks blood to gain more strength"; multiplier keeps attacks data-driven | Permanent upgrades |
| Player is invulnerable during a finisher; the target is held in its stagger until the strike | No cheap hits during a committed animation; the target can't recover mid-shot | Interruptible finisher |
| Shot feedback: muzzle flash + 1 px tracer (`ShotFlash`), larger hit-stop/shake than combo hits | Readable at phone size, cheap to draw | Particles/smoke sprites |
| Crusnik form at 54 px | Owner asked twice for taller | 50 px |

## 2026-10-15 — Title card, cutscenes, Crusnik weapon

| Decision | Reason | Alternatives considered |
|---|---|---|
| Title/key art: Higgsfield painting → `spritegen keyart` (crop, box downscale to 480×270, Requiem 48 with light dither); text drawn in code | Painted look the owner wanted, but palette-consistent and tiny (94 KB); text stays editable and sharp | Shipping the raw 2K painting |
| Cutscenes animated in code with game sprites (owner choice) | Consistent with gameplay art, no credits, easy to edit | AI stills |
| Crusnik weapon: one scythe + spiked chain to the other hand; adds a ranged chain-lash attack | Owner correction | Two scythes |
| Fixing a detail of an existing design = an edit prompt against that image | A fresh brief with the old image as reference copied the old weapon (r3 wasted 2 credits) | Re-rolling |

## 2026-10-15 — Death Hunter

| Decision | Reason | Alternatives considered |
|---|---|---|
| Death Hunter = the first Methuselah enemy (`drainable: true`), built on the melee-walker states with its own data | Covers the owner's Death Hunters and gives the blood drain a target without new behaviour code | Separate Methuselah noble first |
| Vitest caches transformed test files by content: after adding sprite sheets, the `import.meta.glob` manifest test may need a touch of the test file locally | Found while adding the hunter; CI starts clean so it is unaffected | — |

## 2026-10-15 — PWA update checks

| Decision | Reason | Alternatives considered |
|---|---|---|
| Call `registration.update()` on `visibilitychange` (visible) and every 60 s; autoUpdate then reloads | Owner's installed app kept serving an old build: browsers only look for a new service worker on navigation | Prompting the user to reload |
| Show the build commit id on the title screen | Lets the owner confirm the phone runs the latest deploy | — |

## 2026-10-15 — Crouch body, Crusnik 40%, cutscenes

| Decision | Reason | Alternatives considered |
|---|---|---|
| lowHeight 15→22, rollHeight 20→26, test beam gap 18→24 | Bodies now match the art (crouch 24, roll ball 18–25), so art never draws into ceilings | Shrinking the art |
| Crusnik 40% = 80% art with wings erased in code (polygon on dark-grey pixels + keep largest island) | Owner: 40% has no wings; saves credits | New generation |
| Cutscenes: code-animated manga panels; plot from an arc in both manga and anime; original dialogue | Owner choice; CLAUDE.md forbids verbatim dialogue | AI stills; verbatim excerpts |

## 2026-10-15 — Main plot and dialogue

| Decision | Reason | Alternatives considered |
|---|---|---|
| Main plot adapts the Istvan arc (owner approved) | Exists in both manga and anime: enough source material; owner wants it to look like the source | Original "Requiem for Rome" |
| Dialogue: original lines in character, following the source's beats; no verbatim script | Copying the script risks copyright problems even for a non-commercial fan game; CLAUDE.md Part 6 | Verbatim dialogue (owner offered, deferred to our judgement) |
| Build id moved from the title screen to the debug overlay | Owner request | — |

## 2026-10-15 — Milestone 5: rooms

| Decision | Reason | Alternatives considered |
|---|---|---|
| Rooms are Tiled `.tmj` maps with object layers only (solids, hazards, gates, exits, markers); generated by `tools/mkrooms.py` until art tiles exist | Owner has no desktop to run Tiled; the format stays Tiled-compatible for later hand editing | Hand-written JSON; tile layers now |
| Room graph test (exits resolve, two-way, reachable; gates have a lever or story flag; lore placed) | Catches broken links before the phone does | Manual checks |
| Altars: kneel to pray (full health, checkpoint, room reset); death → last altar; enemies stay dead until room re-entry or prayer | Blasphemous-style rhythm, touch-friendly (no extra button) | Auto-checkpoint on touch |
| Spikes: damage + return to the last ground ≥ 24 px from any spike | Avoids respawn loops at pit edges | Instant death |
| Lore stones show text while you stand at them | No extra button on mobile | Read button |
| Vitest `fsModuleCache: false` | The module cache missed new files in `import.meta.glob` (rooms, sprite manifests) | Touching test files |
| Region 1 = 13 rooms (owner: "a reasonably sized game") | Room generator makes rooms cheap; Region 2 (cathedral, Gyula's fortress) next | 4-room slice |

## 2026-10-15 — World rebuilt as a grid of big rooms

| Decision | Reason | Alternatives considered |
|---|---|---|
| Rooms placed on a world grid of screens; open edges connect to whatever room is there | Blasphemous-style continuous world; the map screen falls out of it; no exit objects to keep in sync | Named exits per door |
| Tile layers back / terrain / facade; facade fades per building interior | Buildings you can enter, as the owner asked, without separate interior rooms | Separate interior rooms |
| Town assembled from parts (`tools/level/builder.py`) | Consistent architecture, fast to iterate; output stays Tiled-compatible | Hand-drawing every tile |
| Tiles and sky/skyline/airships/lamps drawn in code; painted Higgsfield layers optional later | Free, palette-exact, matches the pixel style; AI is weak at tilesets | AI tilesets |
| Ladders: stick up climbs (instead of jumping) when on a ladder; JUMP lets go | Touch-friendly, matches the existing stick-up-to-jump control | Separate climb button |
| Stairs: automatic one-tile step-up while walking | Arcade physics has no slopes | Slopes |
| Time of day (night/dusk/day) as a GameState value the story changes | Owner request | Real-time cycle |

## 2026-10-15 — The Undercity

| Decision | Reason | Alternatives considered |
|---|---|---|
| Undercity rooms carved out of solid rock (`rock()` + `carve`), doors only where rooms join | Underground reads as enclosed; no accidental open edges into neighbours | Open-sided rooms like the town |
| Painted back walls cut into ~13-row bands, props scaled by height | Keeps the cathedral-level detail without stretching art | One stretched image per room |
| Ladders through floors always have a plank (or ledge) on the floor row above the ladder | One rule for "ladder top" makes climbing out reliable | Special cases per room |
| Climbing snaps to the ladder centre and resets Arcade's previous position | Otherwise the snap was undone next step and the body snagged in 1-tile shafts | Wider shafts everywhere |
| Crossing a room edge keeps the feet inside the new room | Climbing up through a floor edge must land on the ladder below the new room's floor | Spawn offset per edge |

## 2026-10-15 — Save/load

| Decision | Reason | Alternatives considered |
|---|---|---|
| One localStorage slot, versioned (v2) with migration from v1, plus a backup of the previous good save | Phones kill tabs; a cut-off write must not lose progress | IndexedDB (overkill for a few hundred bytes) |
| Autosave on every room change, prayer and "Return to title"; a loaded game resumes at the last altar at full health | Blasphemous resumes at the last prie-dieu; saving levers/map on every room means a killed tab loses almost nothing | Save only at altars |
| "New game" over an existing save needs two taps | A stray tap must never wipe progress | Confirm dialog |
