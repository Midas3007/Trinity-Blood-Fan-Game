# Asset Manifest

| Name | Path | Purpose | Dimensions | Transparency | Animation status | Import settings | Provenance / license |
|---|---|---|---|---|---|---|---|
| _example_player_idle_ | `public/assets/player/idle.png` | Abel idle sprite sheet | 64x64 x 6 frames | yes | planned | nearest filter, no smoothing | original, drawn by owner, 2026-10 |
| Thrall placeholder | (code: `src/enemies/Enemy.ts`) | First enemy, region 1 | 16×30 rectangle + 1 px string | n/a | none (code tint for wind-up, collapse by scale) | — | original placeholder shapes, 2026-10-15 |
| abel_reference / abel_idle / abel_run | `public/assets/sprites/abel/` | Abel priest form: reference views, idle (2 frames), run (4 frames) | 64×64 cells, bottom-centre pivot | yes (binary) | idle + run playing in game | Phaser spritesheet from `index.json`; nearest filter (`pixelArt: true`) | Higgsfield Nano Banana Pro (jobs d2348a6e, 004f2d9e), converted by `tools/spritegen` (Requiem 48, gamma 1.5, squeeze 0.88), 2026-10-15. Generated from our own written description; no official art used as input. Non-commercial fan use. |
