# Sprite Pipeline — Trinity Blood: Requiem for Rome

Adapted on 2026-10-15 from the owner's generic `SPRITE_PIPELINE_SPEC.md` to this project's approved creative direction (`docs/creative-direction.md`), engine (Phaser 3, 480×270), rules (`CLAUDE.md` Parts 5–8) and tools (Higgsfield connector).

The pipeline has three stages: **AI source art** (Higgsfield) → **deterministic pixel conversion** (`tools/spritegen`, Python) → **engine-ready sheets + manifests** (`public/assets/sprites/`).

> **Status:** the items marked **[owner decision]** in §10 must be confirmed before building. Nothing has been generated yet; generation spends Higgsfield credits and only starts on the owner's go-ahead.

---

## 0. Scope and IP boundary (fan project)

Two properties are involved and both are off-limits to copy:
- **Trinity Blood** (characters, story): fan use only. **Never copy official art.** Sprites are original pixel art drawn to *our own written design* (creative-direction §5), not traced from anime frames (`CLAUDE.md` Part 6).
- **Blasphemous** (gameplay reference): structure and feel only. No characters, enemy designs, UI, logos or assets; nothing from `reference/` ever becomes art (`CLAUDE.md` Part 5).

**Prompt rules (every generation):**
1. Never write "Trinity Blood", "Abel Nightroad", "Crusnik", "Gonzo", "Blasphemous", "Penitent One" or any official character name in a prompt. Describe the design in our own words (templates in §3). Naming the franchise pulls the model toward official artwork.
2. Never attach official art, anime screenshots or game screenshots as image references. The only image references allowed are **our own approved outputs** (turnarounds, previous poses).
3. If an output looks like a recognisable official drawing or a Blasphemous design, reject it and regenerate.

**Public-domain visual sources we draw from instead:** Roman catacomb frescoes and ossuaries (e.g. the Capuchin Crypt style of bone decoration), Baroque Roman churches and gilt altarpieces, Gothic cathedrals and stained glass, Byzantine domes and mosaics, Caravaggio-style chiaroscuro (for mood only — sources are lit flat), *memento mori* and *danse macabre* imagery, clockwork automata and marionette theatre (for Dietrich's puppets).

---

## 1. Resolution and canvas (locked by the approved creative direction)

The generic spec proposed 640×360 and a 60 px hero. **We keep the approved values**; all other sizes are scaled to match (×0.75).

| Setting | Value | Notes |
|---|---|---|
| Internal resolution | **480 × 270** | Already in the game. Integer scales: ×4 = 1920×1080, ×8 = 3840×2160. |
| Abel (priest form) height | **≈40 px** | Approved. ~1/6.75 of screen height. |
| Abel priest cell | **64 × 64** | Approved. Room for coat tails and melee swings. |
| Abel Crusnik cell | **96 × 96** **[owner decision]** | Scythe arcs and wings don't fit in 64. Treated as a separate entity `abel_crusnik` so each entity keeps one cell size. |
| Common enemy cell | **64 × 64** | Thrall ≈30 px tall (matches its hitbox). |
| Large enemy / miniboss | **128 × 128** | e.g. Iron Choir halberdier. |
| Bosses | **sized per boss, power of two** | Marchesa 128×128; Grand Marionette 256×256. |
| Tiles | **16 × 16** | Approved. |
| UI weapon/ability icon | **24 × 24** | (spec 32 × 0.75) |
| Item icon (holy water, relics) | **16 × 16** | (spec 24 × 0.75, rounded to tile size) |
| Pivot | **bottom-centre**: (32, 64) in a 64 cell, (48, 96) in 96 | Ground contact; identical on every frame. |
| Pixel scale | 1 art px = 1 game px | Nearest-neighbour only; no rotation or non-integer scaling of sprites (`CLAUDE.md` Part 6). |

**Non-negotiable:** every frame of an entity uses the same cell and pivot. Motion comes from the character's position inside the cell, never from cropping frames differently.

**How sprites meet our physics:** the Arcade body stays a simple box (player 14×30, low/roll postures 15/20 high). Sprites are drawn with origin (0.5, 1) at the body's feet. Art never changes collision; posture changes come from `src/player/playerStates.ts` (`postureFor`).

---

## 2. Palette

### 2.1 From "Requiem 16" to "Requiem 48" **[owner decision]**

The approved palette is **Requiem 16** (creative-direction §9). Converting painted AI art into only 16 colours gives harsh, posterised shading. Proposal: **Requiem 48** keeps all 16 approved colours as anchors and adds in-between ramp steps, grouped like the generic spec but themed for this project:

| Ramp | Count | Use | Approved anchors kept |
|---|---|---|---|
| Near-blacks / outline | 4 | outline `#0b0a10`, deep shadow | `#0b0a10`, `#1c1826` |
| Stone greys (cool) | 6 | catacomb stone, armour, Iron Choir | `#2e2836`, `#4a4252`, `#6f6676` |
| Bone / marble whites | 5 | bone, skulls, marble, candle wax, Abel's skin & hair | `#c9c2d6`, `#efeaf2` |
| Coat black-violets | 4 | Abel's coat, cassocks, night shadow | `#241b2e` |
| Blood crimsons | 5 | blood, cardinal cloth, puppet strings | `#4a0f1b`, `#8e1b2c` |
| Crusnik reds | 3 | Crusnik eyes, scythe, rage tint | `#d4283e` |
| Candle ambers / browns | 5 | candlelight, wood, leather | `#7a4a1e`, `#d9963a` |
| Vatican golds | 4 | gilt, reliquaries, Vatican trim | `#e8c86a` |
| Crusnik / tech pale blues | 4 | Crusnik energy, nanomachine glow, moonlight | `#7fb6d6` |
| Decay greens | 3 | nanomachine/lab decay, rot | `#5f8a5a` |
| Flesh tones | 3 | thralls, wounds | — |
| Reserved swap/FX slots | 2 | hit flash, enraged/stunned signals | — |

Files: `art/palette/requiem48.hex` (one `RRGGBB` per line) and `art/palette/requiem48.png` (48×1 swatch). If the owner prefers to stay at 16, the pipeline works the same with `requiem16.hex`. The 16 is just stricter.

### 2.2 Palette rules
- Every shipped sprite uses only palette colours (enforced by `spritegen validate`).
- At most 4 shading steps per material. No gradients, no anti-aliased edges, no semi-transparent pixels except deliberate VFX.
- Outline: `#0b0a10` (already our "void", slight violet bias). Selective outline: dark outside edge, lighter inner lines (approved art direction).

---

## 3. Phase 1 — AI source art (Higgsfield)

### 3.1 Which model for what

Checked against the connected Higgsfield account on 2026-10-15:

| Task | Model on Higgsfield | Why |
|---|---|---|
| Abel turnaround, pose sets from a locked design | **Nano Banana Pro** (`nano_banana_pro`) | The spec's recommended model; image references; up to 4K |
| Re-rolls that must be reproducible | **Nano Banana 2.1** (`nano_banana_2_1`) | Accepts a **seed**, so an output can be regenerated for provenance |
| Multi-reference consistency checks (up to 10 refs) | **FLUX 3** (`flux_3_image`) | Alternative if Nano Banana drifts |
| Concept / mood art (backgrounds, key art, portraits) | Any; Nano Banana Pro preferred | Drift doesn't matter at concept stage. Goes to `art/concepts/`, never shipped directly |
| **Experiment only:** in-betweens for common enemies | **AutoSprite** (`autosprite`) | Turns one character image into a sprite-sheet animation. Must pass through `spritegen` + palette validation like any source; never shipped raw |

### 3.2 Technical constraints (append to every prompt)

```
TECHNICAL CONSTRAINTS:
- Flat, even, diffuse lighting. No rim light, no lens flare, no bloom, no glow.
- Solid pure magenta background (#FF00FF), completely uniform, no gradient, no shadow on the background.
- Character fully in frame with 10% margin on all sides. No cropping. Feet visible.
- No ground shadow, no cast shadow.
- Sharp hard edges. No motion blur, no depth of field.
- No text, watermark, signature, border or frame.
- Limited colour palette, high contrast, strong readable silhouette.
- Standing on an implied flat ground line. Square aspect ratio, maximum resolution.
```

Lighting in the *game* (cool moonlight key, warm candle pools, Crusnik rim light) is added by palette choice and code, **not** baked into sources.

### 3.3 Step 1 — Abel turnaround (generate first)

```
A character design turnaround sheet for a 2D side-scrolling action game.

CHARACTER:
A very tall, thin, slightly stooped young priest, about nine heads tall, long legs.
Long black priest's coat over a black cassock, white clerical collar, small plain
cross on a cord. Round wire-rimmed glasses. Long silver hair tied back in a loose
tail. Pale skin, cold pale-blue eyes, gentle tired expression. The coat's long tails
flare behind him. Plain old-fashioned revolver holstered at the hip. Worn black
boots. Overall shape: tall thin vertical silhouette with flaring coat tails.

ART DIRECTION:
Gothic Baroque Rome at night. Solemn, melancholic religious horror. Dark clerical
clothing, bone and marble, dried blood, gilt details. Hand-painted illustration,
not a 3D render, not a photograph, not anime screenshot style.

LAYOUT:
Four full-body views in one horizontal row, evenly spaced, identical scale and
height, feet on one ground line:
1. Front view, neutral idle stance
2. Three-quarter view, turned 45° to the viewer's right
3. Side profile facing the viewer's right, orthographic
4. Back view

[TECHNICAL CONSTRAINTS]
```

Iterate until approved by the owner. Save as `art/source/reference/abel_priest_turnaround.png`.

**Crusnik form turnaround** (after the priest form is approved, using it as the only reference): same design, upright posture, long silver hair loose and wild, glowing red eyes, large black feathered wings, a long white sash flowing from the waist, and a huge crimson organic scythe: segmented like a spine or centipede, lined with small hooked spikes, with red spiked tendrils coiling around the arms. Save as `abel_crusnik_turnaround.png`.

### 3.4 Step 2 — pose sets

Attach the approved turnaround. Generate 3–5 poses per request:

```
[ATTACH: abel_priest_turnaround.png]

Using the attached turnaround as the exact reference, draw the same character in
the poses below. The design must be IDENTICAL — coat shape and length, collar,
glasses, hair, colours, proportions. Only the pose changes.

All poses in SIDE PROFILE facing the viewer's right, orthographic, identical scale
to the reference, feet on a common ground line.

POSES:
1. ...
2. ...
3. ...

[TECHNICAL CONSTRAINTS]
```

### 3.5 Pose list — tailored to our moveset

Key poses only; in-betweens come from hand-pixelling or interpolation (§7.7). Frame counts are lower than the generic spec because our sprites are 40 px, not 60.

**Abel — priest form (`abel`, 64×64)**

| Animation | Game state | Key poses | Target frames |
|---|---|---|---|
| Idle | `idle` | 2 | 6 |
| Run | `run` | 4 (contact, down, passing, up) | 8 |
| Jump rise / apex / fall | `jump`, `fall` | 2 / 1 / 2 | 3 / 2 / 3 |
| Land / hard land | landing, `hardLand` | 2 / 2 | 3 / 5 |
| Crouch / crawl | `crouch` | 1 / 2 | 2 / 4 |
| Roll | `dodge` | 3 (tuck, mid, recover) | 6 |
| Slide | `slide` | 2 (drop, slide) | 4 |
| Attack 1 / 2 / 3 (coat-sweep and strikes) | `attack` (`priest1`–`priest3`) | 3 each | 5 / 5 / 7 |
| Air attack | `airAttack` | 2 | 4 |
| Crouch attack | `crouchAttack` | 2 | 4 |
| Revolver shot (planned) | ABIL tap | 2 (aim, recoil) | 4 |
| Hurt | `hurt` | 2 | 3 |
| Death | (death) | 4 | 8 |
| Drink holy water (planned) | HEAL | 2 | 5 |
| Kneel at altar (planned) | checkpoint | 2 | 4 |
| Crusnik activation (planned) | transform | 3 | 8 |

**Abel — Crusnik form (`abel_crusnik`, 96×96, planned):** idle, run, scythe combo ×3, air scythe, wings double jump, glide, phase-step dash, blood drain finisher, revert. ~25 key poses.

**Full cast to cover (owner request, 2026-10-15).** Order follows the build plan (Region 1 first). Descriptions are ours, written for prompts; official names never go in prompts.

| # | Entity | Cell | What it is (our words) | Key art needed | Credit budget |
|---|---|---|---|---|---|
| 1 | `abel` priest form | 64 | **Locked 2026-10-15:** round 3 turnaround (`art/source/approved/abel/reference/`) + pipeline gamma 1.5, squeeze 0.88 | turnaround ✅ + ~45 key poses | 6 spent + ~20 |
| 2 | `abel_crusnik` | 96 | Wild loose silver hair, red eyes, big black feathered wings, white sash, crimson segmented spiked scythe and tendrils | turnaround + ~25 poses (wings spread/folded, scythe combo, glide, phase-step, drain) | ~14 |
| — | Crusnik lightning, aura | VFX | Pale crackling lightning on activation and wing beats | **code-drawn** (procedural bolts), no credits | 0 |
| 3 | `enemy_thrall` | 64 | String-bound worshipper (Region 1 common enemy) | turnaround + ~15 poses | ~6 |
| 4 | `enemy_methuselah` | 64 | Pale, elegant vampire noble in dark aristocratic clothes, sharp features, fangs; fast duelist | turnaround + ~15 poses | ~6 |
| 5 | `enemy_ghoul` | 64 | Night creature: a reanimated Methuselah, emaciated, torn finery, clawed hands, hunched crawl | turnaround + ~12 poses | ~6 |
| 6 | `enemy_fairy` | 32–64 | Small pale child-like creature with thin translucent wings, hovering; attacks with an ultrasonic scream (expanding sound rings, **code-drawn**) | turnaround + ~8 poses (hover, dive, scream, hurt, fall) | ~4 |
| 7 | `enemy_iron_choir` | 128 | Marionette soldier in plate armour (creative direction §6) | turnaround + ~12 poses | ~6 |
| 8 | `boss_marchesa` | 128 | Methuselah noblewoman hung from red strings (boss 1) | turnaround + ~20 poses | ~8 |
| 9 | `villain_dietrich` | 64 / 256 rig | Auburn-haired puppeteer in a black piped military coat, red armband, red strings (main villain; NPC + boss 2 with the Grand Marionette) | turnaround + ~15 poses; marionette ~10 | ~12 |
| 10 | Other villains (later regions) | — | Rosenkreuz operatives, chosen with the owner when Region 2+ is planned | — | reserve |
| — | Backgrounds / parallax / key art | — | Catacombs, Drowned Quarter, opera house | concepts only, repainted to the palette | ~8 |
|   | **Total** |   |   |   | **≈ 98** (all remaining credits) |

**Credit rules:** 2 credits per Nano Banana Pro image at 2K (1K costs the same, so always 2K for designs). Pose sheets put 4–6 poses on one image. For small enemies, test **Nano Banana 2.1 at 1K (1.5 credits)**, which is enough detail for a 30 px sprite. Every round is shown to the owner before the next is spent. If a round fails, fix the prompt, never blind re-rolls.

**Not in our moveset (skip for now):** walk (we only run), parry/riposte, ledge grab/climb, wall slide, door open, fast travel. Add them only if the game gains those abilities.

**Enemies and bosses (from creative-direction §6–7):** thrall (idle, walk, alert, claw wind-up, claw, hurt, collapse); Iron Choir soldier; puppeted Methuselah; bats/bone-rats; the Marchesa (128); the Grand Marionette (256).

Total for the Region 1 slice: ~45 key poses for priest Abel, ~15 for the thrall, ~20 for the Marchesa. Expect to generate 3–5× that and cull.

### 3.6 Weapons
Weapons are **drawn into the attack poses** (the spec's recommended route). Separate item sheets only for UI icons: revolver, scythe, holy water vial, relics.

### 3.7 Source handling and provenance
- Every generation, including rejects, goes to `art/source/raw/<entity>/` with a sidecar `.txt`: prompt, model, seed (if any), date, Higgsfield job id.
- Approved sources are copied to `art/source/approved/<entity>/<animation>/` (never edited in place).
- `docs/asset-manifest.md` gets a row for every shipped sheet: tool, date, licence notes, owner approval.

---

## 4. Phase 2 — `tools/spritegen` (Claude Code builds this)

### 4.1 Stack (tailored to what is already installed)
- Python 3.13 (present), **Pillow** (present, already used by `scripts/make-icons.py`), **numpy** (present), **PyYAML** (present), **click** for the CLI (present; replaces typer).
- Connected components and morphology are written with numpy rather than scikit-image (not installed). CIEDE2000 is implemented directly in numpy.
- Tests use Python's built-in `unittest` (pytest is not installed). Golden images are tiny synthetic PNGs.
- Pinned in `tools/spritegen/requirements.txt`. Dev-only; never shipped.
- No ML dependencies. Deterministic: same source + config = byte-identical output. Run Python with `-I` (`CLAUDE.md` Part 5).

### 4.2 Stages (one module each, independently tested)
1. **`ingest`**: load PNG/JPG; check minimum resolution, near-square aspect, magenta background present. Soft issues warn; missing or unreadable files fail.
2. **`alpha`**: chroma-key magenta (RGB distance < 40, configurable). **Threshold to binary before any downscale.** Remove specks under 4 px, fill holes under 4 px, erode 1 px against magenta fringe (optional dilate back).
3. **`crop`**: tight bounding box, detect the ground line (lowest opaque row), record both. Place into the configured cell with the pivot at bottom-centre (no tight cropping).
4. **`downscale`**: scale from source height to target sprite height (e.g. 40 px). `area` (default, with unsharp mask radius 1, amount 0.8) or `nearest`. Never bilinear/bicubic as the last step.
5. **`quantize`**: map to the palette with **CIEDE2000 in Lab**; optional Bayer 4×4 dither (`--dither`, off by default). Indexed PNG output.
6. **`outline`**: 1 px outline in `#0b0a10`; modes `selective` (default, approved), `uniform`, `none`.
7. **`cleanup`**: remove orphan pixels, fix single-pixel staircase jaggies, enforce a minimum feature size of 2 px.
8. **`overrides`**: if `art/overrides/<entity>/<file>.png` exists, it replaces or composites over the generated frame. Hand-fixes in Aseprite live here so re-runs never destroy them.
9. **`pack`**: uniform grid per animation, same cell and pivot; optional power-of-two padding; no gutters unless bleeding appears.
10. **`manifest`**: JSON next to each sheet (§4.5).
11. **`validate`**: only transparent or exact palette pixels; correct cell sizes; consistent pivot; no content touching cell edges; per-sheet colour histogram; non-zero exit on failure.
12. **`preview`**: **built first.** One source rendered through many heights/methods/outline modes into a contact sheet, because these parameters can only be tuned by looking.

### 4.3 CLI
```bash
npm run sprites:palette                       # write art/palette/requiem48.hex, requiem16.hex, swatch
npm run sprites:preview -- --input <raw.png> --figure 2 --open-px 2 --gammas 1.0,0.7
npm run sprites:approve -- --input <raw.png> --entity abel --animation idle --figures 0,1 --open-px 2
npm run sprites:build                         # every entity/animation with approved sources
npm run sprites:validate                      # palette, alpha, cells, pivots, clipping
npm run sprites:test                          # pipeline unit tests (unittest)
```
These run `python3 -E -s -m tools.spritegen …` from the repo root. `-I` can't be used because it hides the repo's own `tools` package; `-E -s` still ignores environment variables and user site-packages. The tool never executes anything from source images.

**Implemented differences from the plan (2026-10-15):**
- `approve` (new) keys, splits and shrinks a raw sheet to 8× sprite size, so the committed inputs are ~30 KB each. Raw 2K files are gitignored; the sidecar `.txt` keeps the Higgsfield job ids.
- `tone.gamma` (new, per entity) lifts near-black sources before quantizing. Abel's coat needed 0.7.
- `alpha --open-px` removes thin drawn ground lines that AI models sometimes add.
- Cleanup runs before the outline, so the outline wraps the cleaned shape. Staircase straightening is not implemented yet; hand fixes go in `art/overrides/`.

### 4.4 Config (`tools/spritegen/pipeline.yaml`)
```yaml
defaults:
  palette: art/palette/requiem48.hex
  method: area
  outline: selective
  dither: false
  min_feature: 2

entities:
  abel:
    cell: [64, 64]
    sprite_height: 40
    source_dir: art/source/approved/abel/
    output_dir: public/assets/sprites/abel/
    animations:
      idle:    { loop: true,  durations_ms: 150 }
      run:     { loop: true,  durations_ms: 90 }
      priest1: { loop: false, attack: priest1 }   # timings come from src/data/attacks.json
  abel_crusnik:
    cell: [96, 96]
    sprite_height: 42
    source_dir: art/source/approved/abel_crusnik/
    output_dir: public/assets/sprites/abel_crusnik/
  enemy_thrall:
    cell: [64, 64]
    sprite_height: 30
    source_dir: art/source/approved/enemies/thrall/
    output_dir: public/assets/sprites/enemies/thrall/
  boss_marchesa:
    cell: [128, 128]
    sprite_height: 96
    source_dir: art/source/approved/bosses/marchesa/
    output_dir: public/assets/sprites/bosses/marchesa/
```

### 4.5 Manifest — linked to our existing combat data

The generic spec puts combat timing in the sprite manifest. **We already have tested, data-driven combat** (`src/data/attacks.json`, `src/data/enemies.json`), so:
- **Gameplay rules stay authoritative in `attacks.json` / `enemies.json`:** damage, knockback, hit pause, startup/active/recovery ms and hitbox.
- **The manifest holds art timing and events:** frames, per-frame durations, loop flag, `hitbox_on`/`hitbox_off` frames, sound and footstep markers, optional per-frame hitbox drawn by the artist.
- **A Vitest check ties them together:** for every attack animation, the time until `hitbox_on` must equal `startupMs` (±1 frame), the `hitbox_on`→`hitbox_off` span must equal `activeMs` (±1 frame), and the manifest hitbox (cell pixels, pivot-relative) must match `attacks.json`'s hitbox, converted from body-centre coordinates (body centre = pivot − 15 px for a 30 px body). If art and data disagree, the build fails instead of the game drifting.

```json
{
  "sheet": "abel_priest1.png",
  "entity": "abel",
  "cell_width": 64, "cell_height": 64,
  "pivot_x": 32, "pivot_y": 64,
  "columns": 5,
  "animations": {
    "priest1": {
      "attack": "priest1",
      "frames": [0, 1, 2, 3, 4],
      "durations_ms": [60, 50, 80, 110, 110],
      "loop": false,
      "events": [
        { "frame": 0, "type": "sfx", "id": "coat_swish" },
        { "frame": 2, "type": "hitbox_on" },
        { "frame": 3, "type": "hitbox_off" }
      ],
      "hitboxes": [{ "frame": 2, "x": 37, "y": 39, "w": 24, "h": 16 }]
    }
  },
  "palette": "requiem48.hex",
  "source_hash": "sha256:…",
  "generated": "…"
}
```
(The durations above line up with `priest1` = 110 ms startup + 80 ms active + 220 ms recovery, and the hitbox is `priest1`'s box moved to cell pixels: body centre (32, 49), box centre 17 px forward and 2 px up = (49, 47), so top-left (37, 39).)

---

## 5. Directory structure (fitted to the repo)

```
art/                         # NOT shipped (CLAUDE.md Part 6)
  palette/      requiem16.hex, requiem48.hex, requiem48.png
  source/
    raw/        <entity>/…   every generation + prompt sidecars (provenance)
    approved/   <entity>/<animation>/…   pipeline input
    reference/  turnarounds, style anchors (ours only — never official art)
  overrides/    <entity>/…   hand-pixelled fixes, re-applied every build
  concepts/     Higgsfield concept art (already planned)
public/assets/sprites/       # pipeline output — shipped, tracked, never hand-edited
  abel/ abel_crusnik/ enemies/ bosses/ vfx/ ui/
public/assets/tiles/
tools/spritegen/             # Python package + tests/golden/ + pipeline.yaml + requirements.txt
```

Size budget: the PWA precaches everything in `public/` (current limit 4 MB per file in `vite.config.ts`). Keep sheets per animation, not one giant atlas, and watch the total for phone download size.

---

## 6. Naming

`{entity}_{animation}[_{variant}].png` + `.json`. Lowercase, underscores only, no versions in names.
Examples: `abel_idle.png`, `abel_priest3.png`, `abel_crusnik_scythe1.png`, `enemy_thrall_claw.png`, `boss_marchesa_phase2_lunge.png`, `ui_icon_holy_water.png`, `vfx_spark_heavy.png`. Animation names match our state and attack ids wherever possible (`priest1`, `crouch`, `air`).

---

## 7. Things not to miss (tailored)

1. **Combat data is art data:** handled by the manifest ↔ `attacks.json` consistency test (§4.5). Build that test before mass-producing attack frames.
2. **VFX:** mostly code-driven, already started (pooled impact sparks). Still needed: blood, dust (land/run/roll/slide), coat trails, candle flame loops, string glow, Crusnik activation burst, heal glow, boss telegraph flashes, collapse dissolve. Hand-pixel or procedural, not AI.
3. **Tiles:** 16×16, authored for **Tiled terrain sets** (blob/47 or 16-tile Wang). Region 1: catacomb stone wall/floor, ossuary bone walls, crypt chapel interior, flooded crypt water, platform edges. Region 2: ruined street, aqueduct, opera house interior, deep water. Hand-authored; AI only for concept and parallax backgrounds (max 3 layers on phones, per the approved direction).
4. **State colours without duplicate sheets:** hit flash and invulnerability via Phaser tint (`setTintFill`, already used as white flash on placeholders); enraged/stunned via tint. A true index palette-swap shader only if tinting proves insufficient. The 2 reserved palette slots are documented in `requiem48.hex` comments.
5. **Lighting / normal maps: decision: no dynamic lighting.** Phones are the target (`CLAUDE.md` Part 8), and Phaser's Light2D costs draw calls. Lighting is painted into palette choices; candle and Crusnik glows are additive sprites. No normal maps needed.
6. **UI and typography:** gothic stone panels with gold trim (approved). A pixel font designed for 270 px height, **SIL OFL** licensed (to be chosen and recorded in the asset manifest). No downscaled TTFs.
7. **In-betweening:** hand-pixel Abel and the bosses (key poses → in-betweens in Aseprite by the owner, or by Claude as code-assisted interpolation for review). Common enemies: pipeline interpolation, or the AutoSprite experiment. Everything still passes `validate`.
8. **Phaser import settings (mostly already set):** `pixelArt: true` and `roundPixels: true` (done). Load with `this.load.spritesheet(key, url, { frameWidth, frameHeight })`. Origin (0.5, 1). No mipmaps, no lossy compression, no atlas tool that moves pivots. Revisit integer scaling in Milestone 6 (currently `Scale.FIT`, noted in `docs/decisions.md`).
9. **Determinism and CI:** byte-identical rebuilds (golden tests). Proposed GitHub Actions job running `npm test`, `npm run build` and `sprites:validate` on every push **[owner decision: GitHub Actions minutes]**. Vercel already builds every push.
10. **Audio hooks:** footstep, coat-swish, swing and impact markers in manifests (§4.5). They feed the planned audio system with public-domain classical music + CC0 SFX.
11. **Metroidvania data:** room graph, ability gates (wings → upper ossuaries; phase-step → iron grilles), altars and map reveal are **Milestone 5–7**. The gate list decides which Crusnik animations are needed first.
12. **Legal hygiene:** keep raw outputs + prompt sidecars. Record a **dated check of Higgsfield's current terms** for this non-commercial fan use in `docs/asset-manifest.md` before the first shipped sprite.

---

## 8. Build order (fitted to our milestones)

The approved milestone order puts art in **Milestone 6**. The pipeline *tools* don't touch game code, so they can be built earlier without breaking the "one milestone at a time" rule **[owner decision]**:

1. ✅ Resolution, cells, pivot (this document, §1). Crusnik cell **[owner decision]**.
2. Palette: Requiem 48 (or keep 16) **[owner decision]** → `requiem48.hex` + swatch.
3. `spritegen preview` + the minimum stages it needs (ingest, alpha, crop, downscale, quantize, outline).
4. Generate Abel's priest turnaround on Higgsfield (Nano Banana Pro) → **owner approves the design**.
5. Generate ~6 idle/run key poses.
6. Tune in `preview` until the 40 px output reads as intentional pixel art. **Gate: if one run cycle doesn't look right, nothing else proceeds.**
7. Remaining stages, overrides, manifest + the `attacks.json` consistency test.
8. Milestone 6: Phaser loading, animation playback tied to player states, a playable test with real sprites.
9. Thrall → the Marchesa → Region 1 tiles and parallax → Crusnik form → Region 2.

---

## 9. Immediate tasks for Claude Code (after the owner's decisions)

1. Scaffold `tools/spritegen/` (click CLI, `unittest`, `requirements.txt` pinned to installed versions).
2. `palette.py`: load `.hex`, Lab conversion, CIEDE2000 nearest match with caching. Generate `requiem48.hex` + swatch from §2.1.
3. `preview.py` plus ingest/alpha/crop/downscale/quantize/outline, with golden tests on synthetic inputs.
4. `pipeline.yaml` with the `abel` and `enemy_thrall` entities.
5. npm scripts `sprites:*`; add `art/` and `tools/` notes to the README.
6. Prepare the Higgsfield turnaround prompt for the owner to approve **before** spending credits.

---

## 10. Owner decisions needed

| # | Decision | Recommendation |
|---|---|---|
| 1 | Palette: keep **Requiem 16** or extend to **Requiem 48** (16 approved colours kept as anchors) | 48: smoother conversion of painted sources |
| 2 | Crusnik form in a **96×96** cell as a separate entity | Yes |
| 3 | When to build the pipeline tools: **now, alongside Milestone 5**, or wait for Milestone 6 | Now: tools only, no game-code changes |
| 4 | Higgsfield credits: OK to generate Abel's turnaround (a few Nano Banana Pro images), with you approving each round | Yes, small batches |
| 5 | Add a GitHub Actions check (tests + build + sprite validation) | Yes, if Actions minutes are fine for this repo |
