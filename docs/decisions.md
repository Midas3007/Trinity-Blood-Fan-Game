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
