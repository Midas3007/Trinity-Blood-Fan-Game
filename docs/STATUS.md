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
- **Higgsfield:** 33.75 of 104 credits used (70.25 left). Round 3 combined round 1's tails and round 2's hair; darker coat and lankier build applied in the pipeline (gamma 1.5, squeeze 0.88) instead of more credits.
- Previously: Abel design round 1 (2 variants) and round 2 (1 image, brief rewritten from the owner's reference notes). Round 2 matches the costume and reads well at 40 px; face reads older and proportions aren't lanky enough.

- **Abel's priest form is fully animated:** idle, run, jump, fall, hard landing, the three combo hits (wind-up + strike, timed to `attacks.json`), roll (tucked ball → kneeling recovery, 380 ms like the dodge), slide and crouch. Hurt and air attack borrow a frozen frame. 4 pose sheets (one redone) cost 10 credits.
  - Fixed: the sprite trailed the body by one frame (visible at roll/slide speed); it now draws after physics.
  - Verified: 82/82 game tests, 23/23 pipeline tests, 12 sheets validate, build passes; headless browser shows the right animation for every state with no errors.
  - Known art gaps: idle frame 2 slightly narrower (small flicker), only 4 run frames, final kick reads weak, slide hair touches the underside of the test beam by ~1 px.

- **Thrall has real sprites:** idle, shambling walk (faster when chasing), claw (arms-raised wind-up tinted amber, then the swipe; art timing tested against `thrall_claw`), hurt, collapse that fades out. Pale hooded penitent in a tattered robe; the red string is still drawn in code. Player and enemy now share one sprite view (`src/systems/sprites/SpriteView.ts`); enemies also draw after physics.
- **Crusnik Abel design (turnaround):** wild silver hair, red eyes, big black wings, white sash, crimson spine scythe. Made taller per owner (50 px vs 40 px priest). Poses come with the Crusnik ability (Milestone 7).
- **Death Hunters** added to the cast from owner references (hooded masked axe-wielders; see creative direction §6).
- Fixed: `sprites:approve` now reads each entity's height and folder from `pipeline.yaml` (it used 40 px for everything).
- Verified: 85/85 tests, 18 sheets validate, build passes; headless browser: thrall went patrol → alert → pursue → claw → hurt → collapse with the matching animation each time, no errors.

- **Finishers (owner request):** enemies **stagger** once their health drops to half (thralls: after the first two combo hits). A blinking red diamond appears over them. Tap **ATK** in front of a staggered enemy → Abel draws his revolver and **executes it point-blank** (muzzle flash, tracer, big freeze and shake). He can't be hurt during it. Finishing the combo instead still kills normally. A stagger wears off after 2.2 s and only happens once per enemy.
  - **Blood drain** (Crusnik form, Methuselah only): heals 20 and gives ×1.5 damage for 12 s. Logic and tests are done; it becomes playable when the Crusnik form and a Methuselah enemy exist.
  - All numbers in `src/data/finishers.json` and `enemies.json` (`staggerBelowFraction`, `staggerMs`, `drainable`).
- **Crusnik Abel redesigned** per owner: taller and gaunter (54 px vs 40 px priest), more Gothic, very pale grey-ivory skin (darker than his white hair), ragged wings.
- Verified: 98/98 tests (finisher choice, strike timing, hold/release, strength buff, stagger recovery, player finisher state, art timing vs data), 19 sheets validate, build passes; headless browser: two hits staggered a thrall (18 HP), ATK played the revolver finisher (invulnerable), the shot killed it, back to idle, no errors.

- **Title screen:** painted key art (priest Abel, revolver raised, giant gothic cross, red background) converted to our palette at 480×270 (`npm run`-free: `python3 -m tools.spritegen keyart`). Title "TRINITY BLOOD — Requiem for Rome" and the fan notice drawn in code on top.
- **Crusnik weapon corrected** (owner): one scythe in one hand, a long spiked chain from it to the other hand. Planned Crusnik ranged attack: **scythe-chain lash** (creative direction §4).
- **Cutscenes: decided** — animated in code with the game's sprites (owner choice), no AI stills.
- Verified: 98/98 tests, 24/24 pipeline tests, 19 sheets valid, build passes; title screen screenshot checked, no errors.

- **Death Hunter enemy** (reanimated Methuselah, first drainable enemy): masked, hooded, axe. Fast chaser (105 px/s), 70 HP, heavy telegraphed axe chop (amber wind-up, 25 damage), staggers at 40% health for the revolver finisher (and later the blood drain). Placed in the test room past the thrall (x 740). Same behaviour code as the thrall, all values in `enemies.json`; the puppet string is now per enemy (`puppetString`).
- Verified: 99/99 tests (incl. chop art timing vs data), 24 sheets valid, build passes; headless browser: hunter chased and chopped with the right animations, no errors.

- **Stale-app fix:** the installed app now checks for a new deploy whenever it comes back to the foreground and every minute (it used to only check when fully restarted). The build id now shows only in the debug overlay (triple-tap top-left), not on the title screen.

- **Crouch-under-beam bug fixed:** the crouch art (24 px) was taller than the low body (15 px) and the beam gap (18 px), so Abel's head drew inside the beam. Low body is now 22 px, the beam gap 24 px, and the roll body 26 px (rolling still can't pass under). Browser-checked: clear space above his head while sliding under.
- **Crusnik 40% (no wings)** made from the 80% art by erasing the wings in code (`erase` + `keep_largest` pipeline options) — zero credits. 80% (winged) stays for scripted moments.
- **Cutscene plan recorded** (creative direction §13): code-animated manga panels, script by Claude, plot from an arc in both manga and anime (candidate: Istvan arc, to confirm), original dialogue. **Sword** noted for later content (§14).

- **Main plot:** Istvan arc adaptation approved (outline in `docs/lore/owner-storyline.md`, details marked *verify*). Dialogue will be original, in character.

## In progress
- Nothing blocked.
- Rest of the cast (next credit rounds, see `docs/sprite-pipeline.md`): Crusnik Abel, thrall, Methuselah, ghoul, fairy, Iron Choir, Marchesa, Dietrich, backgrounds.

## Blockers
- None.

## Owner must test (on phone) — crouch fix
1. Slide under the beam and stop/crawl under it: Abel's head should no longer go into the beam.
2. Rolling (DODGE without stick down) still can't get under it.

## Owner must test (on phone) — Death Hunter
1. Past the thrall (keep walking right) a masked hooded figure with an axe waits. It notices you from further away and runs at you fast.
2. It raises the axe overhead (amber) then chops hard (25 damage). Roll through or back off on the amber.
3. Hit it until it reels (diamond) → ATK for the revolver finisher.
4. Tell me: too fast? too much damage? enough warning?

## Owner must test (on phone) — title screen
1. Open the game: painted red title with Abel and the cross; title text readable on the left; fan notice at the bottom.
2. Tap → game starts as before.

## Owner must test (on phone) — revolver finisher
1. Hit a thrall twice (ATK, ATK) and stop. It reels and a red diamond blinks above it.
2. Step up to it, facing it, and tap ATK → Abel draws, aims down and fires; flash, freeze, it collapses.
3. Try hitting it three times instead → the third hit kills it normally.
4. Wait about 2 s without finishing → it recovers and fights again (and won't stagger a second time).
5. Tell me: is the finisher too slow (0.9 s), is the range comfortable, should stagger happen sooner/later?

## Owner must test (on phone) — thrall sprites (done)
1. Walk right past the dummies (slide under the beam). The thrall is a pale hooded figure that sways as it walks.
2. Get noticed → "!" then it shambles toward you faster.
3. Stand still → it raises both arms and glows amber, then swipes low. Dodge on the amber.
4. Kill it → it crumples to the ground and fades; a new one appears after ~4 s.
5. Tell me if the amber wind-up is still easy to read with the real art.

## Owner must test (on phone) — Abel's sprites (done)
1. Stand still → Abel breathes (2-frame idle). Run left and right → he faces the way he runs.
2. Jump → rising pose, then falling pose; drop from the highest ledge → crouched landing.
3. ATK three times → three different strikes.
4. DODGE → he tucks into a ball, then kneels and stands. Stick down → crouch pose. Stick down + DODGE → feet-first slide under the beam.
5. Tell me anything that pops, flickers, slides off his feet, or is hard to read at phone size.

## Owner must test (on phone) — new controls (done, kept for reference)
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
- Death Hunter pose sheet (~2 credits) and a first Methuselah enemy (drainable) — makes the blood drain matter.
- Then Milestone 5: level slice — connected rooms from Tiled, room transitions that keep state, a hazard, checkpoints, one simple puzzle, and a room-graph test.
