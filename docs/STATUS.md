# STATUS

Last updated: 2026-10-14

## Done
- Phase 0–3: kit docs, private reference setup, Milestone 1, reference findings, story + creative direction (**approved**; classical public-domain music allowed).
- Web research for the feel spec: `docs/feel-spec.md` now has a "Researched" column with sources (mostly qualitative; healing numbers found; no movement timings published anywhere).
- **Milestone 2 — Player controller (code complete):**
  - Acceleration/deceleration on the ground, weaker air control.
  - Variable jump height (release early = short hop), heavier fall than rise.
  - Coyote time (100 ms) and jump buffer (110 ms).
  - Hard landing after long falls (≥160 px), 350 ms lock.
  - Dodge: ground slide 240 px/s for 380 ms, invulnerable for the first 260 ms (player turns see-through), 300 ms cooldown.
  - All values in `src/data/player.json`. States: idle, run, jump, fall, dodge, hardLand.
  - Test room: higher ledges on the right for testing hard landings.
  - Debug overlay now also shows velocity and `INV` while invulnerable. A small red mark shows facing.
  - Fixed: very quick taps/key presses could be missed between frames.
- Verified here: type-check, build, **30/30 unit tests** (including simulated coyote/buffer/variable jump/hard landing/dodge cooldown). Headless browser: no errors; dodge shows state `dodge INV` at 240 px/s; tapped jump ≈17 px vs held jump ≈60 px.

## In progress
- Waiting for the owner's phone test of Milestone 2.

## Blockers
- None. (Optional: deeper binary analysis needs `github.com` allowed in Network access.)

## Owner must test (on phone)
Open https://trinity-blood-fan-game.vercel.app (a hard refresh or reopening the app may be needed to get the update). Triple-tap the top-left corner to see the debug text.
1. Push the stick → the rectangle speeds up quickly but not instantly; let go → it slides to a stop within a few pixels.
2. Tap JUMP briefly → small hop. Hold JUMP → about twice the player's height. The fall should feel faster than the rise.
3. Run off the edge of a ledge and press JUMP just after leaving it → it still jumps (coyote time).
4. Press JUMP just before landing → it jumps as soon as it lands (jump buffer).
5. Climb the ledges on the right to the highest one, then drop to the floor → it stops briefly (state `hardLand`) before you can move. Walking or jumping off the two lowest ledges should NOT do this.
6. Tap DODGE → fast slide in the facing direction; the rectangle turns see-through at first (`INV`). Tapping DODGE again right away does nothing until the short cooldown ends. DODGE in the air does nothing.
7. Report feel in plain words: too floaty / too heavy, too slow / too fast, dodge too long / too short. I will change the numbers.

## Next step
- Owner phone test and feel notes → tune `src/data/player.json`.
- Then Milestone 3: combat (attack states, hitboxes/hurtboxes, damage, knockback, hit-stop, i-frames, hit feedback; new attacks as data).
