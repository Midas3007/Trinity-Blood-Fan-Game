# Where to Find References

Claude Code: use these when you need to verify a fact or find visual or design guidance. Check the live page before relying on it, and do not copy large passages or any official art into the repo. URLs are listed from general knowledge. If one is dead, say so and search for the current equivalent.

## A. Trinity Blood (story, characters, visuals)

| Need | Where |
|---|---|
| Quick plot and character overview | Wikipedia article "Trinity Blood" and "List of Trinity Blood characters" |
| Detailed fan wiki (characters, locations, tech, Crusnik, factions) | Trinity Blood fan wiki on Fandom (search "Trinity Blood Wiki"; also `trinityblood.fandom.com`) |
| Episode guide and ratings | MyAnimeList (`myanimelist.net`, search "Trinity Blood") |
| Anime review and structure of the anime arcs | Anime News Network (`animenewsnetwork.com`) review of the complete collection |
| Original source material | The light novels by Sunao Yoshida (English release titles include *Rage Against the Moons* volumes and *Reborn on the Mars* volumes) and the manga by Kiyo Kujō |
| Setting trivia (Byzantium, Ottoman influences) | Community reviews on MyAnimeList and TV Tropes-style wikis; treat as interpretation, not canon |
| Visual mood | The owner's reference images (upload to `art/references/trinity-blood/`). Official art is for private inspiration only, never copied into the game |

Continuity differs between novels, manga and anime. Always say which version a fact comes from.

## B. Blasphemous (gameplay reference)

| Need | Where |
|---|---|
| Gameplay footage (movement, combat, bosses, map, rooms) | YouTube full playthroughs and boss fights; use slow playback to measure animation timing |
| Mechanics overview | Blasphemous wiki (Fandom) and the game's Steam and store pages |
| Level design breakdown | Search YouTube and blogs for "Blasphemous level design analysis" or "Blasphemous combat analysis" |
| The owner's extracted files | `reference/` (private, gitignored; see CLAUDE.md Part 5) |
| Numbers (jump height, attack frames) | Measure from footage and put them in `docs/feel-spec.md` as **observations**. Do not guess |

## C. Metroidvania and game design

- Game Maker's Toolkit (YouTube): videos on level design, Metroidvania structure, "juice" and game feel.
- Mark Brown's design breakdowns on movement and ability gating.
- Game Developer (`gamedeveloper.com`) postmortems and design articles on Metroidvania map structure.
- "Game Feel" principles: coyote time, jump buffering, hit-stop, screen shake, anticipation, recovery frames. Search for Celeste and Hollow Knight movement analyses.
- Metroidvania map design: search "Metroidvania map design lock and key", "interconnected map design", "ability gating".

## D. Pixel art

- Lospec (`lospec.com`): palette list and tutorials. Choose a limited palette.
- Pedro Medeiros ("Saint11") pixel art tutorials: animation, shading, effects.
- Pixel Logic (book by Michafrar): fundamentals.
- Aseprite documentation (`aseprite.org`): sprite sheets, tags, export.
- OpenGameArt (`opengameart.org`): only for properly licensed placeholder art; check each license and record it in the asset manifest.

## E. Phaser, Vite, TypeScript

- Phaser docs and API: https://docs.phaser.io
- Phaser examples (physics, input, scale, tilemaps): https://phaser.io/examples
- Phaser Tiled integration: search "Phaser tilemap Tiled JSON load".
- Phaser Discourse forum: https://phaser.discourse.group
- Vite docs: https://vite.dev
- vite-plugin-pwa guide: https://vite-pwa-org.netlify.app
- Vitest docs: https://vitest.dev
- Touch controls in Phaser: search "Phaser virtual joystick pointer multitouch" and check Phaser's input docs for `input.addPointer`.

## F. Audio

- Freesound (`freesound.org`), Kenney (`kenney.nl`), and OpenGameArt: check each license (prefer CC0).
- Gothic ambience: pipe organ, choir pads, bells, stone reverb. Compose or source original/licensed music only.

## G. Higgsfield (art generation)

- https://higgsfield.ai/ — the owner can generate images through the Higgsfield connector in the Claude chat or in the Higgsfield app and upload results into `art/concepts/`.
- Use it for concept art, portraits, backgrounds and key art. Expect to clean or redraw for sprites. Keep prompts and seeds in `docs/asset-manifest.md` for consistency.

## H. Reverse engineering the reference game

- REA: https://github.com/morluto/rea (read the live README first)
- Il2CppDumper: https://github.com/Perfare/Il2CppDumper
- Unity IL2CPP is structure-only for most mobile builds; see CLAUDE.md Part 5.
