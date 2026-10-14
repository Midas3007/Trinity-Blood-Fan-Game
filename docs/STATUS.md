# STATUS

Last updated: 2026-10-14

## Done
- Phase 0: kit docs in repo; Blasphemous extract in `reference/` (gitignored, 0 files tracked).
- **Milestone 1 (Foundation) code:** Phaser 3.90 + TypeScript (strict) + Vite 8 + vite-plugin-pwa + Vitest.
  - Boot → Menu (title, fan-made notice, "Tap to begin") → Play scene.
  - Test room (floor + 4 ledges, wider than the screen, camera follows).
  - Placeholder player rectangle: run, jump, fall (simple state machine).
  - Multitouch controls: stick + ATK / JUMP / DODGE / ABIL / HEAL. Keyboard and gamepad also work.
  - Debug overlay: fps, player state, position, held inputs, hitbox outlines.
  - PWA: manifest (landscape, fullscreen), icons, service worker with auto-update.
- Verified here: type-check passes, build passes, 16/16 unit tests pass. Headless Chromium smoke test (phone-sized landscape, touch emulation): no console errors; stick + ATK + JUMP held at once all registered; player ran and jumped; debug overlay toggled by triple-tap; manifest served; service worker registered.

- Vercel project `trinity-blood-fan-game` (team midart) linked to this GitHub repo. First deploy READY; manifest served from it. Every push to a branch builds a preview automatically.
  - Play URL: https://trinity-blood-fan-game.vercel.app (production branch is currently `ccr-eae0b083-hu39a3`).

- Owner phone test of Milestone 1: **passed** (all checks).
- **Phase 2 (reference analysis):** `docs/reference-findings.md` written (engine facts + 12 evidence-backed findings from names in `global-metadata.dat`). `docs/feel-spec.md` expanded into a fill-in sheet linked to those findings, with current placeholder values.
  - REA 6.5.0 CLI runs here; its doctor shows the Ghidra engine missing. Ghidra download from GitHub is blocked by the environment network policy.
  - The extract contains no images, levels or tuning data, so no feel numbers can come from it.

- **Phase 3 (story and direction):** owner delegated the story choices; proposed storyline written to `docs/lore/owner-storyline.md` ("Requiem for Rome", Dietrich as main villain, 2 regions, 2 bosses) and full draft of `docs/creative-direction.md` (12 sections, ability mapping, 16-colour palette, sprite sizes).

## In progress
- Waiting for owner approval of `docs/creative-direction.md` (no art until approved).

## Blockers
- Optional: deeper binary analysis needs `github.com` allowed in the environment's Network access (to fetch Ghidra) — low value, see findings "Tooling status".

## Owner must test (on phone)
Open https://trinity-blood-fan-game.vercel.app in your phone browser, landscape. If Vercel asks you to log in, use your Vercel account.
1. Hold the phone in portrait → a "Rotate your phone" message shows. Rotate to landscape → the title screen shows with the fan-made notice at the bottom.
2. Tap anywhere → the test room loads (fullscreen on Android; iOS Safari stays in the browser, that's expected).
3. Push the left stick right/left → the pale rectangle runs; the knob follows your thumb.
4. Tap JUMP → it jumps; it cannot jump again in mid-air.
5. Hold the stick AND press ATK or JUMP with the other thumb → both work at once (button turns brighter while held).
6. Hold stick + ATK, then also tap JUMP (three fingers) → still runs and jumps.
7. Triple-tap the top-left corner quickly → debug text (fps, state, pos, input) and coloured hitbox outlines appear. Triple-tap again → they disappear. Note the fps number.
8. Swipe/pinch on the game → the page must not scroll, zoom, or pull-to-refresh.
9. Switch to another app and back → nothing stays "stuck pressed".
10. Browser menu → "Add to Home screen"/"Install app" → launch from the icon → opens landscape, full screen, with the cross-and-moon icon.
11. Turn on airplane mode, reopen the installed app → it still loads.
12. Report: are the buttons comfortable size/position? Anything hidden by the notch or rounded corners?

## Next step
- Owner: fill in `docs/feel-spec.md` from playing Blasphemous (any time before Milestone 2).
- Owner approves/changes creative direction.
- Then Milestone 2: player controller (variable jump, coyote time, jump buffer, dodge with i-frames, tuning JSON).
