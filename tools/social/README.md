# Social kit tools

- `map.py` — full-world map poster (`map_full.png`, `map_instagram_4x5.png`) from a JSON dump of the rooms
  (`rooms`, `solids`, `oneways`, `ladders`, `checkpoints`, `boss`, `items` per room; dump them from `src/world/rooms` in a scratch Vitest file).
  `python3 -I tools/social/map.py rooms.json outdir`
- `cards.py` — key art (16:9, 4:5), a 2x2 collage and a 5-slide carousel from `public/assets/ui/title.png` and in-game stills.
  `python3 -I tools/social/cards.py public/assets/ui/title.png shotsdir outdir`
- In-game stills: `tools/playthrough/stills.cjs` with `VW=1920 VH=1080` against `npx vite preview --port 4173` (uses `?test&trailer`, which hides the HUD).

Outputs are not committed (binaries). Every image carries the fan-project notice.
