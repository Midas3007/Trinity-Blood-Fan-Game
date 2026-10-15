# CLAUDE.md — Trinity Blood Fan Metroidvania (mobile web)

Read this whole file at the start of every session. It is the standing rulebook for the project. Detailed lore and reference sources live in `docs/` and are linked from the parts below.

---

## PART 1 — PROJECT OVERVIEW

**What this is:** a non-commercial, fan-made 2D Metroidvania inspired by the anime/novel series *Trinity Blood*, built as a mobile-first web game (Phaser 3 + TypeScript + Vite, installable PWA). Gameplay structure and feel are inspired by *Blasphemous*: deliberate melee combat, interconnected rooms, ability-gated exploration, checkpoints, bosses.

**Playable character:** Abel Nightroad (AX agent, Vatican priest, Crusnik). Supporting cast per `docs/lore/trinity-blood-bible.md`.

**Owner's storyline:** `docs/lore/owner-storyline.md`. If the owner has written story beats there, they override the general lore bible wherever they conflict. If that file is still a template, ask the owner for story beats before writing any dialogue or level narrative.

**Scope reality:** this is a small vertical slice grown in stages (one to two regions, 2–3 abilities, one boss), not a full-length game. Never promise or attempt the whole game in one go.

**Fan-project status (mandatory):**
- Non-commercial only. No ads, monetization, paid unlocks, or store listings.
- Show a visible "Unofficial fan-made project. Not affiliated with or endorsed by the rights holders of Trinity Blood." notice on the title screen and in the README.
- Respect takedown requests immediately.

**Owner context:** I work entirely from my phone (Claude Code on the web / mobile browser). I have no local machine. Do not ask me to run desktop commands. Do not interrogate me about my environment; the facts are in Part 2.

---

## PART 2 — ENVIRONMENT AND WORKFLOW

- Claude Code runs in a cloud sandbox. The repo lives on GitHub. Vercel builds a preview deploy on each push. I playtest the preview URL on my phone and report what feels wrong.
- You can: install packages, build, lint, type-check, run Vitest, run headless scripts, read/write files, use git.
- You cannot: see the game on a real screen, feel input latency, hear audio, or judge frame rate on a real phone. Never claim a feature "feels good" or "runs at 60 fps". Report what you verified (tests, build, type-check) and give me a short phone test procedure for the rest.
- Sandbox network access may be restricted. If a download or install fails, say exactly what failed and give me the command plus where to run it. Never disable TLS verification or work around the proxy.
- Prefer the repo's existing tools over new dependencies. Ask before adding any major dependency or any paid service.
- Keep a visible `docs/STATUS.md` updated at the end of every session: done, in progress, blockers, what the owner must test, next step.
- Git: commit after each milestone and after any meaningful working change. Clear messages. Never commit secrets, `reference/`, or large binaries.
- Keep the project buildable and deployable after every change. If you break the build, fix it before doing anything else.

**Session start checklist:** read `CLAUDE.md`, `docs/STATUS.md`, and the latest section of `docs/decisions.md`; run `git status`; run the build; then work.

**Session end checklist:** build passes, tests pass, `docs/STATUS.md` updated, committed, and a short "what to test on your phone" list given to me.

---

## PART 3 — TECH STACK AND LINKS

**Stack (decided; do not change without asking):**
- Phaser 3 (2D game framework, Arcade Physics to start)
- TypeScript (strict mode)
- Vite (dev server and build)
- vite-plugin-pwa (installable, offline-capable, landscape orientation)
- Vitest (unit tests for logic that does not need a renderer)
- Tiled map editor JSON (`.tmj`) for room layouts
- Hosting: Vercel

**Repository and documentation links** (always read the current README before using; do not invent commands, flags or capabilities):
- Phaser: https://github.com/phaserjs/phaser — docs https://docs.phaser.io — examples https://phaser.io/examples
- Vite: https://github.com/vitejs/vite — docs https://vite.dev
- vite-plugin-pwa: https://github.com/vite-pwa/vite-plugin-pwa
- Vitest: https://github.com/vitest-dev/vitest — docs https://vitest.dev
- Tiled: https://github.com/mapeditor/tiled — docs https://doc.mapeditor.org
- Higgsfield (AI art, used by the owner via the Higgsfield connector in Claude chat or manually): https://higgsfield.ai/
- REA — Reverse Engineer Anything (optional MCP for the reference analysis): https://github.com/morluto/rea — setup command documented there as `npx rea-agents setup`; verify against the live README
- Il2CppDumper (optional, Unity IL2CPP structure recovery): https://github.com/Perfare/Il2CppDumper
- Aseprite (pixel art tool, owner may use externally): https://www.aseprite.org
- Lospec (palettes, pixel art tutorials): https://lospec.com

Treat any tool or repo as unverified until its README confirms what it does.

---

## PART 4 — THE ANIME: PLOT, THEMES AND WORLD (SUMMARY)

Full detail: `docs/lore/trinity-blood-bible.md`. Quick reference:

- **Origin:** light novels by Sunao Yoshida (illustrated by Thores Shibamoto), adapted into a manga (Kiyo Kujō) and a 24-episode anime by Gonzo (2005). The three versions have continuity differences; follow the owner's storyline first, then the anime.
- **Setting:** roughly nine hundred years after an apocalyptic war between humans and the vampires (Methuselah) nearly destroyed the world. Two powers now dominate: the **Vatican** (human, "Terran", Papal State) and the **New Human Empire** (the Methuselah, ruled by an Empress, technologically superior). A third, neutral human power, **Albion**, holds the British Isles. A cold war between the Vatican and the Empire is the political backdrop.
- **Protagonist:** **Abel Nightroad**, a clumsy, tea-loving, absent-minded priest who is actually a **Crusnik** — a vampire-class being who feeds on other vampires and carries nanomachine-based power. He works for **AX**, the Vatican's special operations unit under **Cardinal Caterina Sforza**.
- **Core cast:** Abel Nightroad; Sister **Esther Blanchett** (young nun, Abel's partner); **Tres Iqus** (android gunslinger priest); **Cardinal Caterina Sforza** (AX leader, wants peace); the antagonist faction **Rosenkreuz Orden** (extremists trying to reignite the war), including figures such as Dietrich von Lohengrin; Methuselah nobles such as Astharoshe Asran; and Abel's Crusnik siblings (Cain, Seth, Lilith) whose history drives the deepest plot.
- **Themes:** coexistence versus extremism; prejudice between humans and vampires; faith versus science; atonement and guilt (Abel is "the Atoner"); sacrifice for peace; the cost of immense power; duality (goofy priest versus terrifying Crusnik); family and brotherhood broken by war (Cain and Abel parallel).
- **Tone and look:** gothic science-fantasy. Cathedrals and airships, ornate black clerical uniforms and long coats, religious iconography beside advanced technology, political intrigue, decaying and ruined cities, secret orders, melancholic and tense atmosphere.
- **Spoiler handling:** late-series reveals (Crusnik origins, Esther's heritage, the Cain/Abel conflict) are story spoilers. Use the owner's storyline to decide what the game reveals and when.

**Facts that need care:** the novels, manga and anime disagree on details. When unsure, mark it in `docs/lore/trinity-blood-bible.md` as "unverified" and ask the owner rather than guessing.

---

## PART 5 — REFERENCE GAME (BLASPHEMOUS) RULES

The owner has extracted files from their own copy of the Android version of *Blasphemous* into a zip. They are for **private study only**.

**Handling:**
1. Unzip into `reference/` at the repo root. Add `reference/` to `.gitignore` **before** the first commit. Confirm with `git status` that nothing from it is tracked. Never push, deploy, or include it in any build or artifact.
2. Do not modify originals. Work only on copies in a scratch directory.
3. Treat extracted archives as untrusted data: extract to a fresh empty directory, keep scripts elsewhere, pass paths as arguments, run Python with `-I`.
4. Do not copy proprietary code, art, audio, text, maps or UI into the game. Do not use extracted assets even as placeholders.

**Expectations:** Blasphemous is a Unity game. Mobile builds are typically IL2CPP, so game code is compiled native code and exact tuning values are usually inside serialized asset bundles. Expect class names, structure, manifest data and engine indicators, not readable source or exact numbers. Say so honestly in the findings.

**Findings format** — put everything in `docs/reference-findings.md`. For every finding record:
- What was investigated
- Evidence (file, class name, string, screenshot, footage timestamp)
- Confidence: high / medium / low
- What remains unknown
- Whether it can be reproduced independently

Cover, as evidence allows: movement (acceleration, jump, fall, ground detection, air control, dodge, ledges, ladders), combat (attack timing, hit detection, knockback, invulnerability, parry/block, abilities, boss structure), progression (health, resources, checkpoints, healing, upgrades, unlock gates, equipment), world structure (rooms, camera, transitions, hidden passages, hazards, save points, boss arenas), enemies (state machines, detection, attack patterns, death), interface (HUD, menus, map, dialogue), and feedback (hit effects, shake, particles, audio cues).

**Never invent exact values.** If evidence is missing, write "unknown" and use a tunable placeholder. Anything the owner observes by playing goes into `docs/feel-spec.md` and is labeled **observation**, not extracted fact.

**REA (optional tool):** read https://github.com/morluto/rea before use. Verify it with its own documented diagnostic command. Check that required dependencies (for example a JDK and headless JADX for Android APK analysis) are present before analysis. If it cannot run in this sandbox, say exactly why and what the owner would need instead. Do not invent REA commands or tools.

---

## PART 6 — FAN-CONTENT AND ART RULES

- Trinity Blood is someone else's property. This is fan use. Do not reproduce anime screenshots, official art, logos, music, or verbatim dialogue or narration from the anime, manga or novels. Use the owner's reference images, the story bible and the owner's storyline as guidance, and write original dialogue.
- Sprites are original pixel art authored for this project. Do not trace or copy official artwork pixel for pixel.
- **AI art (Higgsfield):** good for concept art, key art, backgrounds, parallax layers, portraits and cutscene stills. It is not reliable for consistent animation frames or clean sprite sheets. Default plan: concept art from Higgsfield; character sprites built as clean pixel art by the owner or generated and then cleaned in an image editor; code-driven animation where possible. Never claim a generated image is a production sprite sheet without checking frame size, consistency, transparency and alignment.
- Concept art stays separate from in-game assets (`art/concepts/` versus `public/assets/`).
- Keep `docs/asset-manifest.md` current: name, path, purpose, dimensions, transparency, animation status, import settings, provenance (who/what made it, tool, date, license notes).
- Validate every asset's dimensions, format and transparency before integrating. Use colored placeholder rectangles and simple shapes until real art exists. Placeholders must be original.
- Define the art direction (palette, resolution, proportions) in `docs/creative-direction.md` before generating large amounts of art. Pixel art conventions: pick one base resolution and one sprite scale, never mix pixel scales, never rotate or non-integer-scale pixel sprites.
- Audio: original or properly licensed only. Record sources in the asset manifest. No ripped anime or game audio.
- **Sprite pipeline:** follow `docs/sprite-pipeline.md` (AI source art → `tools/spritegen` pixel conversion → sheets + manifests). Never name the franchise or attach official art in generation prompts.

---

## PART 7 — ARCHITECTURE AND CODE QUALITY

**Folder layout:**
```
src/
  core/        game config, constants, scene registration, boot/menu/play scenes
  player/      controller, player state machine, abilities
  combat/      hitboxes, hurtboxes, damage, knockback, combat events
  enemies/     base enemy, enemy state machine, individual enemies
  world/       room loader (Tiled), transitions, checkpoints, map, hazards, puzzles
  ui/          HUD, touch controls, menus, dialogue box
  systems/     save/load, audio, input, progression, events
  data/        tuning JSON, dialogue, items, ability definitions
public/assets/ final in-game art and audio
art/concepts/  concept art (not shipped)
docs/          STATUS, creative-direction, feel-spec, reference-findings, asset-manifest, decisions, lore/, references/, templates/
reference/     PRIVATE, gitignored
tests/
```

**Rules:**
- Small modules. No giant scripts. One responsibility per file.
- Strict TypeScript. No `any` without a comment explaining why.
- Tuning lives in `src/data/*.json` (or typed config objects), not hard-coded. No magic numbers in logic. Expose movement, combat and camera values as data so the owner can adjust them.
- Use a typed event bus or Phaser events for cross-system communication (player hurt, enemy died, checkpoint reached, ability unlocked). Avoid systems reaching into each other's internals.
- State machines for the player and for every enemy. States: small, testable, with explicit enter/update/exit.
- Fixed timestep for gameplay logic where practical so behavior does not depend on frame rate.
- Separate pure logic (damage math, state transitions, save serialization, room graph) from Phaser rendering so it can be unit tested with Vitest.
- Combat must support adding new weapons and attacks as data without rewriting the controller.
- Keep rendering cheap for phones: texture atlases, limited particles, no heavy full-screen shaders, object pooling for bullets, effects and enemies, cap draw calls.
- Document non-obvious choices in `docs/decisions.md` (date, decision, reason, alternatives).
- Ask me before major architecture changes.

---

## PART 8 — MOBILE-FIRST REQUIREMENTS

- Touch is the primary input from the first milestone. Layout: movement stick or d-pad on the left; Attack, Jump, Dodge, Ability, Heal on the right. Support multitouch (move while attacking).
- Keyboard and gamepad also work, for desktop testing.
- Keep important buttons away from screen edges, notches and the system gesture areas. Button size and position must be configurable and saved.
- Landscape orientation. Scale the game with a fixed internal resolution and integer scaling where possible so pixel art stays crisp. Handle resize and rotation.
- Pause on tab hide or app switch. Unlock audio on the first touch. Prevent page scroll, zoom, text selection and pull-to-refresh interfering with play.
- Target a stable 60 fps on mid-range phones. Provide a low-effects setting.
- Persist saves with `localStorage` (or IndexedDB), versioned, with safe migration and a corruption fallback.
- PWA: manifest, icons, service worker, offline play after first load. Make sure a new deploy updates cleanly and does not strand users on a stale cache.
- Add a debug overlay (fps, player state, position, active hitboxes) that can be toggled on phone with a multi-tap.

---

## PART 9 — TESTING AND VERIFICATION

For every feature, in order: implement, build, run tests, test edge cases, fix, document, confirm earlier features still work.

- **Automated (you run these):** `tsc` type-check, build, lint if configured, Vitest unit tests for state machines, damage and knockback math, save serialization and migration, room graph connectivity, input mapping.
- **Phone-only (the owner runs these):** feel (jump arc, attack responsiveness, hitstop), touch button comfort, frame rate, audio, safe-area layout, PWA install, rotation, battery and heat. For each milestone, write a numbered phone checklist with expected results in `docs/STATUS.md`.
- Never mark something verified unless you actually ran it. If something cannot be tested here, say so and give the procedure.
- Milestone checklists:
  - **M1 Foundation:** build passes; page loads; placeholder player moves/jumps; touch controls respond to simultaneous input; debug overlay works; PWA manifest valid; Vercel preview deploys.
  - **M2 Player controller:** accel/decel, variable jump height, coyote time, jump buffer, landing, air control, dodge with i-frames, all tunable from JSON; unit tests cover state transitions.
  - **M3 Combat:** attack states, hitboxes/hurtboxes, damage, knockback, hit-stop, i-frames, hit feedback; adding a new attack needs only data.
  - **M4 First enemy:** idle, patrol, detect, pursue, attack, hurt, die; no stuck states; pooling works.
  - **M5 Level slice:** Tiled rooms load; transitions preserve state; hazard, checkpoint and one simple environmental puzzle work; room graph test passes.
  - **M6 Art integration:** every asset validated against the manifest; animations play at the right frame timing; parallax and effects stay performant.
  - **M7 Progression:** save/load round-trips; healing resource; one ability that unlocks a previously blocked path; map; dialogue; one boss with phases; fresh-save and old-save tests.

---

## PART 10 — MILESTONES, OPERATING RULES AND WHAT TO DO NEXT

**Milestones (one at a time, in order):**
1. Foundation — Vite + Phaser + TS, PWA config, Vercel-ready build, boot/menu/play scenes, placeholder player on a test floor, touch controls, debug overlay.
2. Player controller — run, variable jump, coyote time, jump buffer, fall, land, air control, dodge, tuning JSON.
3. Combat — attack states, hitboxes/hurtboxes, damage, knockback, i-frames, hit feedback.
4. First enemy — original enemy with full state machine.
5. Level slice — connected rooms, platforms, hazard, checkpoint, puzzle, transition.
6. Art integration — validated sprites, parallax backgrounds, UI styling, effects.
7. Progression — save/load, health and healing resource, unlockable ability gate, map, dialogue, one boss.

**Operating rules:**
1. One milestone per work session unless I say otherwise. Never build the whole game at once.
2. Core movement and combat must be fun before adding large systems.
3. Do not generate final art before `docs/creative-direction.md` is approved by me.
4. Do not assume REA can recover source code, and do not assume Higgsfield output is production-ready.
5. Do not invent findings about the reference game, plot details, or tool capabilities.
6. Do not add paid services or major dependencies without explaining and getting my approval.
7. Identify blockers early and say where I must act manually (uploading files, approving a Vercel link, playing on my phone).
8. If something is ambiguous, ask me one short question rather than guessing, unless it is cheap to redo.
9. Keep responses short. Report the outcome, what you verified, what I must verify, and the next step. Do not narrate each command.
10. Keep `docs/STATUS.md` current. It is my dashboard.

**Where reference material lives:** `docs/references/reference-sources.md` (where to look for Trinity Blood, Blasphemous, pixel art, Metroidvania design and Phaser help) and `docs/lore/` (story bible and owner's storyline).
