# STATUS

Last updated: 2026-10-14

## Done
- Phases 0–3 and Milestones 1–2 (see git history and `docs/decisions.md`). Creative direction approved.
- **Milestone 3 — Combat (code complete):**
  - ATK on the ground: 3-hit combo (press again during a swing to continue). Third hit is a heavier lunge that launches the target, with a stronger hit pause and screen shake. Recovery can be cancelled into a dodge.
  - ATK in the air: air attack (keeps steering).
  - Hits: damage, knockback away from the player, white flash, impact sparks, short hit pause (freeze) per attack.
  - Getting hurt: knocked back and up, 320 ms without control, 1 s invulnerability with blinking. Dodge invulnerability also protects. Death = respawn at the start with full health.
  - Health bar (top-left). Debug overlay adds HP and outlines the active attack hitbox in red.
  - Test room: two grey training dummies (punching bags, respawn after being destroyed) and one **red dummy that hurts on touch**.
  - All attacks in `src/data/attacks.json`; adding an attack is a data change (tested). Effects can be turned down in `src/data/effects.json`.
- Verified here: type-check, build, **49/49 unit tests** (attack data validation, phases, combo chaining, once-per-swing hits, mirrored hitboxes, damage/knockback, hit pause, event bus, attack/air-attack/dodge-cancel/hurt states). Headless browser: no errors; the 3-hit combo hit a dummy (health bar dropped, dummy pushed back); touching the red dummy cost health and knocked the player back.

## In progress
- Waiting for the owner's phone test of Milestones 2 and 3.

## Blockers
- None.

## Owner must test (on phone)
Open https://trinity-blood-fan-game.vercel.app (reopen the page/app to get the update). Triple-tap the top-left corner for debug text and hitbox outlines.
1. Walk to the first grey dummy and tap ATK once → one swing; the dummy flashes white, sparks fly, it is pushed back, and its small red bar shrinks. You should feel a tiny freeze on impact.
2. Tap ATK three times in rhythm → three swings; the third steps forward, knocks the dummy up and away, and shakes the screen.
3. Keep hitting until a dummy disappears → it comes back after about 1.5 s.
4. Tap ATK then DODGE quickly after the swing → the swing ends early and you slide.
5. Jump and tap ATK → air attack; landing ends it.
6. Walk into the **red** dummy → you lose some health (top-left bar), get knocked back, blink for about a second, and can't be hurt again while blinking. DODGE through it → no damage while see-through.
7. Lose all health on the red dummy → you reappear at the start with full health.
8. Tell me in plain words: are attacks too slow or too fast? Is the hit freeze noticeable, too strong, or too weak? Is the knockback when hurt too much?

## Next step
- Owner phone test → tune `src/data/attacks.json` / `player.json`.
- Then Milestone 4: first enemy (original design) with idle, patrol, detect, pursue, attack, hurt, die; object pooling.
