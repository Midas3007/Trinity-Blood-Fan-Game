Read CLAUDE.md first and follow it for the whole project. Then read docs/lore/trinity-blood-bible.md, docs/lore/owner-storyline.md and docs/references/reference-sources.md.

Context: I'm on my phone using Claude Code on the web. I've attached two zips:
1. `trinity-metroidvania-kit.zip` (this kit: CLAUDE.md, lore, reference sources, doc templates)
2. A zip of files I extracted from my own copy of Blasphemous (Android). It is private reference material.

Work in order and stop after each phase to report briefly.

PHASE 0: Safety and setup
1. Put CLAUDE.md, FIRST_PROMPT.md and docs/ from the kit in the repo root. Copy `docs/templates/*` into `docs/` (STATUS.md, reference-findings.md, feel-spec.md, asset-manifest.md, creative-direction.md) and keep the templates folder.
2. Create `reference/` and unzip the Blasphemous files into it, into a fresh empty directory, never modifying the originals. Add `reference/` to `.gitignore` BEFORE any commit. Confirm with `git status` that nothing from `reference/` is tracked.
3. List what the Blasphemous zip contains (file types, sizes, folder structure). Tell me what is useful for gameplay analysis and what is not.

PHASE 1: Foundation (Milestone 1 only)
4. Scaffold Phaser 3 + TypeScript (strict) + Vite + vite-plugin-pwa using the structure in CLAUDE.md Part 7.
5. Add a boot scene, a menu scene with the fan-made notice, and a play scene with a test floor, a placeholder player rectangle that runs and jumps, multitouch on-screen controls (stick plus Attack, Jump, Dodge, Ability, Heal), and a debug overlay (fps, player state).
6. Add Vitest and a first unit test. Build, type-check, run tests, fix errors. Commit.
7. Tell me how to connect the repo to Vercel for preview deploys (or do it if you have access), and give me a numbered phone test checklist.

PHASE 2: Reference analysis (separate from game code)
8. Read the current README of https://github.com/morluto/rea. If it can run in this sandbox, set it up and verify it with its own diagnostic command. If not, say exactly why and what I would need to do instead. Do not invent commands.
9. Identify the engine (expected Unity/IL2CPP) from the files in `reference/` and which tools would be needed. Do not extract or reuse proprietary assets.
10. Start `docs/reference-findings.md` with only evidence-backed findings. Prepare `docs/feel-spec.md` for me to fill in from playing.

PHASE 3: Story and direction (no art generation yet)
11. Read my storyline in docs/lore/owner-storyline.md. If it is still a template, ask me for the story beats.
12. Draft `docs/creative-direction.md` (the 12 sections in the template) using the story bible and my storyline, and present it for my approval.

Do NOT build combat, enemies, levels or art yet. When done, update docs/STATUS.md and ask me what to do next.
