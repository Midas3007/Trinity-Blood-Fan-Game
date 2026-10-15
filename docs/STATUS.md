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

- **Owner phone test of Milestones 2–4: all good.** Owner requests added:
  - **Stick up = jump** (hold up for a high jump, flick for a hop; JUMP button still works). **Stick down = crouch.** Keyboard: Up/W jump, Down/S crouch.
  - **Roll** (DODGE): tucked roll, mostly invulnerable, passes through enemies. **Slide** (stick down + DODGE): faster and longer, very low, briefly invulnerable, fits under low gaps. A slide that ends under something lets you crawl out.
  - **Crouch attack** (ATK while crouched).
  - Test room: a low hanging beam near the start that you can only get past by sliding.
  - Verified: 72/72 unit tests; browser playtest with simulated touch (see `docs/playtest-2026-10-15.md`). Fixed a bug where crouching dropped the player through the floor.

- **Sprite pipeline spec tailored to the project:** `docs/sprite-pipeline.md` (original kept in `docs/references/sprite-pipeline-spec-original.md`). `CLAUDE.md` Part 6 now points to it. Five owner decisions listed in its §10.

- **Sprite pipeline built** (`tools/spritegen`, `npm run sprites:*`): palette Requiem 48 (`art/palette/`), preview contact sheets, approve → build → validate, 18 Python unit tests, Vitest check that sprite timing matches `attacks.json`, GitHub Actions CI (`.github/workflows/ci.yml`).
- **Higgsfield:** 8 of 104 credits used (96 left). Round 3 combined round 1's tails and round 2's hair; darker coat and lankier build applied in the pipeline (gamma 1.5, squeeze 0.88) instead of more credits.
- Previously: Abel design round 1 (2 variants) and round 2 (1 image, brief rewritten from the owner's reference notes). Round 2 matches the costume and reads well at 40 px; face reads older and proportions aren't lanky enough.

- **Abel's real sprites are in the game:** idle and run animate; he faces left/right; jump/fall/attack/hurt borrow a frozen frame until their poses exist; crouch, slide and roll still show the placeholder rectangle (their bodies are shorter). Verified in the browser; 78/78 tests.

## In progress
- Waiting for the owner's phone test of Milestones 2–4 (feel and comfort can't be judged here).

## Blockers
- None.

## Owner must test (on phone) — new controls
1. Push the stick **up** → jump; hold it up for a higher jump. Running with the stick slightly up should NOT jump.
2. Push the stick **down** → crouch (shorter rectangle). Tap ATK while crouched → low attack.
3. Tap DODGE → roll (shorter, see-through). Hold the stick down and tap DODGE → slide (even lower, longer).
4. Walk right from the start → a hanging beam blocks you. Walking or rolling won't get you past; **slide** under it.
5. Tell me if up-to-jump triggers by accident while running, or if crouch triggers when you don't want it.

## Owner must test (on phone) — Milestones 2–4 (done, kept for reference)
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
- Owner: confirm round 3 + pipeline settings as Abel's locked design; clarify which 'fairies' are meant.
- Then: generate idle + run key poses (~4 credits), tune in preview, build the first real sprite sheets.
- Owner: answer the 5 sprite-pipeline decisions (`docs/sprite-pipeline.md` §10).
- Owner phone test → tune `src/data/enemies.json`, `attacks.json`, `player.json`.
- Then Milestone 5: level slice — connected rooms from Tiled, room transitions that keep state, a hazard, checkpoints (altars that refill health and respawn enemies), one simple puzzle, and a room-graph test.
