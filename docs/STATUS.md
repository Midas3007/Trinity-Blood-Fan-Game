# STATUS

Last updated: 2026-10-15

## Done
- Phases 0–3 and Milestones 1–3 (see git history and `docs/decisions.md`). Creative direction approved.
- **Milestone 4 — First enemy: the string-bound thrall (code complete):**
  - Original enemy from the approved creative direction: a pale puppeted worshipper with a red string rising from its head.
  - Behaviour: **idle → patrol** (short walks around its post, turns at ledges) → **alert** when it sees you in front of it ("!" mark, short pause) → **pursue** → **attack** (a slow wind-up where it turns amber, then a lunging claw for 15 damage) → cooldown → pursue again. It **gives up** if you get far away or stay out of reach, and stops if you die.
  - **Hurt:** flashes, gets knocked back and staggers briefly — except during the claw itself (it keeps swinging). **Death:** the string disappears and the body collapses and fades.
  - **Pooling:** enemies are created once when the room loads and reused; killed thralls return to the pool and respawn at their post after 4 s (test-room rule; checkpoints decide this later).
  - Test room: one thrall on the floor (right of the grey dummies), one on the highest ledge. Debug view also outlines enemy attack hitboxes.
  - All numbers in `src/data/enemies.json`.
- Verified here: type-check, build, **66/66 unit tests** (pool reuse, enemy data validation, vision, ledge detection, every behaviour transition, cooldown, give-up, a 2-minute randomised "never stuck" run, and the combat system with fakes). Headless browser: no errors; the thrall noticed the player, chased, wound up (amber), hit the player (100 → 85 HP with knockback and invulnerability), died to three combos, and respawned after about 4 s.

- **Automated playtest of the live build** (simulated touch on a phone-sized screen): see `docs/playtest-2026-10-15.md`. Everything measured matched the data except the hit freeze, which was not taking effect — **fixed** (physics now pauses the moment a hit lands). Added a read-only `?test` hook for these playtests.

## In progress
- Waiting for the owner's phone test of Milestones 2–4 (feel and comfort can't be judged here).

## Blockers
- None.

## Owner must test (on phone)
Open https://trinity-blood-fan-game.vercel.app (reopen the page/app to get the update). Triple-tap the top-left corner for debug text and hitbox outlines.
1. Walk right past the grey dummies. The thrall (pale, with a red string above it) is pacing near its spot.
2. Approach it from the front → a "!" appears, it pauses, then walks toward you.
3. Stand still near it → it turns **amber** for about half a second, then claws you (you lose health and get knocked back). Watch for the amber as your cue.
4. DODGE through it during the amber wind-up → no damage.
5. Hit it with the ATK combo → it flashes, staggers and is pushed back. It has 40 HP (about one and a half full combos).
6. Kill it → its string vanishes and it collapses. About 4 s later a new one appears at its post.
7. Run far away from a chasing thrall → it stops and goes back to pacing.
8. The thrall on the highest ledge should pace without ever falling off.
9. Tell me in plain words: is the wind-up too long or too short? Is it too fast or too slow when chasing? Too much health?

## Next step
- Owner phone test → tune `src/data/enemies.json`, `attacks.json`, `player.json`.
- Then Milestone 5: level slice — connected rooms from Tiled, room transitions that keep state, a hazard, checkpoints (altars that refill health and respawn enemies), one simple puzzle, and a room-graph test.
