# Decisions

## 2026-10-14 — Milestone 1 foundation

| Decision | Reason | Alternatives considered |
|---|---|---|
| Phaser **3.90.0** (pinned), not Phaser 4 | CLAUDE.md fixes the stack on Phaser 3; 3.90 is the last 3.x release. | Phaser 4.x (newer, but a stack change needs owner approval). |
| TypeScript 5.9.3, Vite 8, vite-plugin-pwa 2.0, Vitest 5 (all pinned) | Current releases that are compatible with each other; TS 5.x kept over 6/7 for stability. | TS 6/7. |
| Internal resolution **480×270** (16:9), `Scale.FIT`, `pixelArt: true` | Fits most phone landscape screens; 270 lines suits pixel art. FIT gives non-integer scale on most phones; integer scaling will be revisited in Milestone 6 when real pixel art arrives. | 384×216, 640×360; integer-zoom scaling now. |
| Arcade Physics with `fixedStep` at 60 steps/s | Physics independent of display refresh rate (e.g. 90/120 Hz phones). | Custom fixed-timestep loop. |
| Input = per-source frames (touch, keyboard, gamepad) merged each frame into one `ActionState` | Gameplay code never knows which device is used; merge logic is pure and unit-tested. | Phaser input calls directly in player code. |
| Touch: fixed stick (left 42% of screen, below top 35%) + 5 buttons; layout in `src/data/controls.json` | Simple and predictable for M1. Top-left corner stays free for the debug triple-tap. Saved per-device layout editing is deferred. | Floating stick that recentres on touch (consider after phone tests). |
| PWA `registerType: 'autoUpdate'`, `cleanupOutdatedCaches`, `vercel.json` no-cache headers on `sw.js` and `index.html` | New deploys replace the old service worker without leaving players on a stale cache. | Prompt-to-update UI. |
| Debug overlay toggled by triple-tap in the top-left 48×48 px, or backtick key | Works on phone without extra buttons. | Dedicated on-screen button. |

## 2026-10-14 — Story and creative direction approved

| Decision | Reason | Alternatives considered |
|---|---|---|
| Story "Requiem for Rome": original side story during the anime, Dietrich as villain, 2 regions + hub | Owner delegated; easiest to build (one city, one villain idea explains all enemies), no retelling of episodes | Retelling an anime arc (harder, copyright-sensitive) |
| Music: real-world gothic/sacred classical music | Owner request | Fully original score |
| Only public-domain compositions **with** public-domain/CC recordings, or our own renders from PD scores | A recording carries its own copyright even when the piece is old | — |
