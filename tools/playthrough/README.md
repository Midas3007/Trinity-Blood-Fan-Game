# Recorded bot playthrough (M13)

A bot plays the game chapter by chapter in headless Chromium and records the game canvas and the game's own audio
(test hooks in `src/main.ts`, only active with `?test`). Each chapter starts in its room with the story flags so far
(`?test&room=…&flags=…`); bosses start part-way down (`bossHp`) so the film stays around 15 minutes.

1. `npm run build && npx vite preview --port 4173 --strictPort` (in another shell)
2. `cd tools/playthrough && node chapters.cjs c01 c02 c02s c03 c04 c04s c05 c06 c07 c08 c08t c09 c10` (Act I), then
   `node chapters.cjs e01 e02 e03 e04 e05 e06 e07 e08` (Act II, the Empire) (Playwright from `/opt/node-tools`).
   Record in small batches: a container restart stops a long run.
3. `for c in c01 … e08; do python3 -I mux.py out $c; done && python3 -I assemble.py` → `out/playthrough.mp4` (both arcs, act cards).
4. The 1-minute montage: `python3 -I montage2.py` → `out/trinity_blood_montage_both_arcs.mp4`. Dialogue shots are whole lines:
   `lines.py <chapter>` lists where lines start and end (its times run about 0.5 s early), and `peek.py <chapter> t…` shows
   frames to check them. Shots start as a line begins typing and end just before the page turns.

The output folder is git-ignored (large video files).
