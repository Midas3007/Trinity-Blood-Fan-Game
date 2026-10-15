# Trinity Blood — Fan Metroidvania (mobile web)

> **Unofficial fan-made project. Not affiliated with or endorsed by the rights holders of Trinity Blood.**
> Non-commercial. Gameplay inspired by *Blasphemous*; also not affiliated with its rights holders.

A small 2D Metroidvania vertical slice built with Phaser 3 + TypeScript + Vite as an installable PWA, played in landscape on a phone.

## Status
See [`docs/STATUS.md`](docs/STATUS.md).

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check + production build (`dist/`) |
| `npm test` | Vitest unit tests |
| `npm run typecheck` | TypeScript only |
| `npm run icons` | Regenerate PWA icons (Python + Pillow) |

## Controls
- **Touch:** stick on the left (push **up = jump**, **down = crouch**); ATK, JUMP, DODGE, ABIL, HEAL on the right. DODGE = roll; **down + DODGE = slide** (fits under low gaps). Triple-tap the top-left corner for the debug overlay.
- **Keyboard:** arrows/WASD move (up also jumps, down crouches); Space/K/Z jump; J/X attack; L/Shift/C dodge (with down = slide); I/V ability; H/F heal; backtick = debug.
- **Gamepad:** left stick/d-pad; A jump, X attack, B dodge, Y ability, RB heal.

## Project rules
`CLAUDE.md` is the rulebook. Lore lives in `docs/lore/`. `reference/` is private and gitignored.
