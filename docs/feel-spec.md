# Feel Spec (owner observations from playing)

Everything here is an **observation**, not an extracted fact. Fill in what you notice while playing the reference game. Claude Code turns these into tunable values in `src/data/`.

"Mechanic exists?" links to `docs/reference-findings.md` (names found in the game files; no values were found).

## How to measure on your phone
- Record the screen while playing, then scrub frame by frame (most phone gallery editors allow this). Count frames or note seconds.
- Use the character's own height as the ruler for distances ("jump ≈ 1.5 character heights").
- Screen widths per second for speed: time how long running across one screen takes.
- "Rough" is fine — write a range if unsure.

## Movement

| Parameter | Mechanic exists? | Observation | Placeholder value in game now |
|---|---|---|---|
| Run speed (screen widths per second) | F2 | | 110 px/s (≈0.23 screen/s) |
| Time to reach full speed | | | instant |
| Time to stop | | | instant |
| Jump height (player heights) | F3 | | ≈2.0 (330 px/s up, gravity 900) |
| Jump rise time / fall time | | | ≈0.37 s rise |
| Can jump height be varied by holding? | F3 `CutJumpSpeedLimit` | | no (M2) |
| Air control (none / little / full) | | | full |
| Coyote time (forgiving ledge jump)? | F3 `GhostJumpDelay` | | none (M2) |
| Jump pressed just before landing still jumps? | F3 `FallingJumpTolerance` | | no (M2) |
| Hard landing after long fall? How long stuck? | F2 `HardLandingBehaviour` | | none |
| Dodge/dash distance (player widths) and duration | F4 | | none (M2) |
| Dodge invulnerable? Whole dodge or part? | F4 `SetDashInvulnerable` | | — |
| Dodge cooldown | F4 `DashCooldown` | | — |
| Back-step/back-dash? | F4 `BackDashDistance` | | — |
| Ledge grab: automatic or button? | F5 | | — |
| Ladders: climb speed, can jump off? | F5 | | — |

## Combat

| Parameter | Mechanic exists? | Observation | Placeholder |
|---|---|---|---|
| Attack: startup / active / recovery (feel) | F6 | | — |
| Combo length, can it be cancelled into dodge? | F6 `CancelCombo` | | — |
| Attack movement lock? | | | — |
| Up / down / air / crouch attacks? | F2 | | — |
| Charged attack: hold time | F6 | | — |
| Parry: window length (frames), what happens on success | F6 `CheckParryWindow` | | — |
| Knockback distance on hit (player) | F7 | | — |
| Player invulnerability after hit (seconds, flashing?) | F7 `InvulnerabilityLapse` | | — |
| Hit pause / slow motion on hits (which hits?) | F7 `DoSlowMotion` | | — |
| Screen shake strength (light/medium/heavy) and on what | F8 | | — |

## Progression and world

| Parameter | Mechanic exists? | Observation | Placeholder |
|---|---|---|---|
| Healing: time to drink, can you move, cost | F9 `Flask` | | — |
| Number of heals at start | F9 | | — |
| Checkpoint: refills heals? respawns enemies? | F9 `RespawnDeadEnemies` | | — |
| Spell/prayer resource: how gained, how spent | F9 `Fervour` | | — |
| Camera: lead ahead of player? smoothing? vertical follow | | | follow, no lead |
| Room transitions: fade, slide, instant? | F10 | | — |
| Death: what is lost, where you return | | | — |
