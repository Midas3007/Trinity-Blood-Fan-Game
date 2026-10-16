# Recorded bot playthrough (M13)

A bot plays the game chapter by chapter in headless Chromium and records the game canvas and the game's own audio
(test hooks in `src/main.ts`, only active with `?test`). Each chapter starts in its room with the story flags so far
(`?test&room=…&flags=…`); bosses start part-way down (`bossHp`) so the film stays around 15 minutes.

1. `npm run build && npx vite preview --port 4173 --strictPort` (in another shell)
2. `cd tools/playthrough && node chapters.cjs c01 c02 c03 c04 c05 c06 c07 c08 c09 c10` (Playwright from `/opt/node-tools`)
3. `for c in c01 … c10; do python3 -I mux.py out $c; done && python3 -I assemble.py` → `out/playthrough.mp4`

The output folder is git-ignored (large video files).
