# Sprite Pipeline Spec — [PROJECT NAME]

A 2D metroidvania in the vein of *Blasphemous*: Spanish-Baroque religious horror, deliberate combat, parry-and-punish, heavy pixel art.

This document covers the full asset pipeline: AI generation of source art → code-based pixel conversion → engine-ready sprite sheets.

---

## 0. Scope and IP boundary

**Reference target, not copy target.** The project borrows structure and feel from *Blasphemous*: metroidvania map gating, deliberate combat, parry windows, grotesque religious imagery. It does **not** reproduce its characters, enemy designs, logos, UI, or art assets.

All character and weapon designs are original, drawn from the same public-domain source material Blasphemous itself drew from:

- Semana Santa penitential processions (capirotes, nazareno robes, candle processions)
- Goya's *Black Paintings* and *Los Caprichos*
- Andalusian Baroque church architecture, gilt retablos, polychrome wood saints
- Spanish Catholic martyrdom iconography (arrows, wounds, thorns, reliquaries)
- Medieval *memento mori* and danse macabre imagery

**Rule for every generation prompt:** never name *Blasphemous*, *The Penitent One*, Cvstodia, or any of its characters in a prompt. Describe the iconography directly instead. If a design comes out recognizably like a Blasphemous character, regenerate it.

---

## 1. Resolution and canvas spec

Lock these before generating anything. Everything downstream depends on them.

| Setting | Value | Rationale |
|---|---|---|
| Internal render resolution | **640 × 360** | Integer-scales cleanly: ×3 = 1920×1080, ×4 = 2560×1440, ×6 = 3840×2160 |
| Player sprite height | **56–64 px** | ~1/6 screen height, matches the genre's readability |
| Player frame cell | **96 × 96 px** | Oversized cell so weapon swings and cape flare never clip |
| Standard enemy cell | **96 × 96 px** | Same cell for pipeline uniformity |
| Large enemy / miniboss cell | **192 × 192 px** | |
| Boss cell | **384 × 384 px** | Sized per boss; power-of-two preferred |
| Weapon icon (UI) | **32 × 32 px** | |
| Item / relic icon | **24 × 24 px** | |
| Pivot | **bottom-center of cell** (48, 96) for 96×96 | Ground contact point; consistent across every frame |
| Pixel scale | 1 art px = 1 game px, nearest-neighbour upscale only | No bilinear filtering anywhere |

**Non-negotiable:** every frame of a given entity uses the same cell size and the same pivot. Movement comes from the character's position *inside* the cell, never from cropping frames differently.

---

## 2. Palette

A single master palette locks visual unity across all assets regardless of which AI model generated the source.

### 2.1 Palette design

- **Size: 48 colours total**, split into ramps
- Build it once, commit it as `assets/palette/master.hex` (one `RRGGBB` per line) and `assets/palette/master.png` (48×1 px swatch strip)

Suggested ramp structure (adjust to taste, keep the counts):

| Ramp | Colours | Use |
|---|---|---|
| Bone / cloth whites | 5 | Robes, bone, candle wax |
| Deep crimsons | 5 | Blood, velvet, cardinal cloth |
| Golds / brass | 5 | Gilt, reliquaries, trim |
| Cold stone greys | 6 | Architecture, armour |
| Earth browns | 5 | Leather, wood, dirt |
| Sickly greens | 4 | Corruption, rot, poison |
| Deep violets | 4 | Shadow, mysticism, night |
| Flesh tones | 5 | Exposed skin, wounds |
| Near-blacks | 4 | Outlines, deep shadow |
| Highlight accents | 5 | Fire, divine light, magic |

- **Outline colour:** a dedicated near-black with a slight violet bias (e.g. `#1A1420`) — pure black reads flat
- Reserve 2–3 slots for palette-swap gameplay signals (enemy enraged state, invulnerability flash)

### 2.2 Palette rules

- Every shipped sprite uses only master palette colours, enforced by the pipeline's `--validate` pass
- Shading: max 4 steps per material (base, shadow, highlight, deep shadow). More steps reads as "downscaled photo"
- No gradients, no anti-aliased edges, no semi-transparent pixels except in deliberate VFX

---

## 3. Phase 1 — AI generation (Gemini / ChatGPT)

### 3.1 Which model for what

| Task | Model | Why |
|---|---|---|
| Character turnaround / design exploration | **Gemini (Nano Banana Pro)** | Best multi-reference character consistency; holds one design across angles |
| Pose variants from a locked design | **Gemini** | Edit-in-place without redrawing; accepts the turnaround as reference |
| Weapon / item orthographic sheets | Either; Gemini preferred | Consistency matters less per-item, but palette consistency does |
| Concept / mood exploration | ChatGPT acceptable | Style drift doesn't matter at concept stage |

**Do not** use ChatGPT for pose sets that need to match an existing design — it drifts.

### 3.2 Universal generation rules

Every prompt must include these constraints. They exist so the conversion pipeline has clean input:

```
TECHNICAL CONSTRAINTS (include in every prompt):
- Flat, even, diffuse lighting. No dramatic rim light, no lens flare, no bloom.
- Solid pure magenta background (#FF00FF), completely uniform, no gradient, no shadow cast on background.
- Character fully within frame with 10% margin on all sides. No cropping.
- No ground shadow, no cast shadow on the background.
- Sharp hard edges. No motion blur, no depth of field, no soft focus.
- No text, no watermark, no signature, no border, no frame.
- Limited colour palette, high contrast, strong readable silhouette.
- Full body visible, feet included, standing on an implied flat ground line.
- Square aspect ratio, maximum available resolution.
```

Magenta background is chosen because it almost never appears in the art itself, making alpha extraction trivial.

### 3.3 Character design prompt — step 1, the turnaround

Generate this **first**. Everything else references it.

```
A character design turnaround sheet for a 2D side-scrolling action game.

CHARACTER:
[Describe your protagonist. Example scaffold — replace with your own design:]
A gaunt penitent wanderer. Tall conical hood of coarse undyed linen, frayed at
the hem, with two narrow eye slits and no visible face beneath — only darkness.
Heavy layered robes in bone-white and ash grey, torn at the knees, dragging
slightly at the back. A thick leather belt hung with small iron bells and a
rolled parchment. Bare feet, dirt-stained. The posture is stooped but
purposeful, carrying great weight. Rope bound around the forearms. A dark red
sash knotted at the waist, the only strong colour.

ART DIRECTION:
Spanish Baroque religious horror. Semana Santa penitential procession imagery.
Goya's Black Paintings. Grim, solemn, weathered. Gold leaf and dried blood.
Grotesque devotion. Hand-painted illustration, not 3D render, not photograph.

LAYOUT:
Four full-body views in a single horizontal row, evenly spaced, identical scale,
identical height, feet aligned on a single ground line:
1. Front view, facing viewer, neutral idle stance
2. Three-quarter view, turned 45 degrees to the viewer's right
3. Side profile, facing viewer's right, perfectly orthographic
4. Back view

[+ TECHNICAL CONSTRAINTS block from 3.2]
```

**Iterate until the design is right before moving on.** Every later asset inherits this. Save the approved turnaround as `assets/source/reference/protagonist_turnaround.png`.

### 3.4 Character pose prompt — step 2, the pose set

Feed the approved turnaround as a reference image. Generate poses in small batches (3–5 per request), not all at once.

```
[ATTACH: protagonist_turnaround.png]

Using the attached character turnaround as the exact reference, generate the
same character in the following poses. The character's design must be
IDENTICAL to the reference in every detail — hood shape, robe layering, belt
fittings, colour, proportions. Only the pose changes.

All poses in SIDE PROFILE facing the viewer's right, orthographic, identical
scale to the reference, feet on a common ground line.

POSES:
1. [pose description]
2. [pose description]
3. [pose description]

[+ TECHNICAL CONSTRAINTS block from 3.2]
```

### 3.5 Required pose list — player character

Group these by animation. Generate **key poses only** — the pipeline and hand-tweening fill the in-betweens. Generating every frame with AI guarantees drift.

| Animation | Key poses to generate | Target final frames |
|---|---|---|
| Idle | 2 (neutral, slight breath-out with cloth settled) | 6–8 (interpolated) |
| Walk | 4 (contact, down, passing, up) | 8 |
| Run | 4 (contact, down, passing, up — lower, longer stride) | 8 |
| Jump — rise | 2 (launch crouch, ascending tuck) | 3 |
| Jump — apex | 1 | 2 |
| Jump — fall | 2 (descending, robes trailing up) | 3 |
| Land | 2 (impact crouch, recover) | 4 |
| Attack 1 (horizontal slash) | 3 (windup, strike extended, follow-through) | 6 |
| Attack 2 (combo upward) | 3 | 6 |
| Attack 3 (combo heavy downward) | 3 | 7 |
| Air attack | 2 | 5 |
| Up-thrust attack | 2 | 5 |
| Down-thrust attack | 2 | 5 |
| Parry — ready | 1 | 2 |
| Parry — success flash | 2 (deflect pose, riposte wind) | 4 |
| Riposte / execution | 3 | 8 |
| Dodge roll | 3 (tuck, mid-roll, recover) | 7 |
| Hurt / stagger | 2 | 3 |
| Death | 4 (hit, collapse to knees, fall forward, still) | 10 |
| Ledge grab | 1 | 2 |
| Ledge climb | 3 | 6 |
| Crouch | 1 | 2 |
| Wall slide | 1 | 2 |
| Prayer / spell cast | 3 (kneel, invoke arms raised, release) | 9 |
| Item use / drink | 2 | 5 |
| Bench rest (save point) | 2 | 4 |
| Door / gate open | 2 | 5 |
| Fast travel / teleport | 3 | 8 |

**Total key poses to generate: ~60.** Expect to generate 3–5× that and cull.

### 3.6 Weapon prompt

Weapons are generated separately as orthographic sheets, then either composited onto the character or drawn into the attack poses directly. Decide which **before** generating — mixing approaches causes misalignment.

- **Recommended: draw weapons into the character attack poses.** Simpler rig, better art, no pivot-matching problems. Generate weapon sheets only for UI icons and the pickup/display art.
- Separate weapon layers only if you plan runtime weapon swapping with shared animations.

```
An orthographic item sheet of fantasy weapons for a 2D action game, arranged in
a single horizontal row, evenly spaced, each weapon in perfect side profile,
blade/head pointing to the viewer's right, handle to the left, all on a common
horizontal axis.

ART DIRECTION:
Spanish Baroque religious horror. Weapons as objects of devotion and penance —
gilt filigree, inlaid reliquary compartments, engraved Latin-looking script,
thorned grips, dried blood in the engraving. Weathered, heavy, functional but
sacred. Hand-painted illustration, not 3D render.

WEAPONS:
1. [weapon description]
2. [weapon description]
3. [weapon description]

[+ TECHNICAL CONSTRAINTS block from 3.2]
```

### 3.7 Source asset handling

- Generate at the **highest resolution available** — the pipeline downscales, and you cannot recover detail you never had
- Save every generation, including rejects, in `assets/source/raw/` with the prompt text in a sidecar `.txt`
- Approved sources move to `assets/source/approved/`
- Never edit in place; the pipeline must be re-runnable from source at any time

---

## 4. Phase 2 — Claude Code builds the pixel conversion pipeline

This is the part Claude Code implements. A Python CLI tool, deterministic, re-runnable, version-controlled.

### 4.1 Stack

- Python 3.11+
- `Pillow` (image I/O and resampling)
- `numpy` (pixel array operations)
- `scikit-image` (optional, for edge detection and morphology)
- `click` or `typer` (CLI)
- `pytest` (tests — the pipeline is deterministic, so golden-image tests are viable)

No ML dependencies. This is a deterministic filter chain.

### 4.2 Pipeline stages

Implement each as a separate, independently testable module. Order matters.

**Stage 1 — `ingest.py`**
- Load source PNG/JPG
- Validate: minimum resolution, square-ish aspect, magenta background present
- Log a warning and continue on soft failures; hard-fail on missing file or unreadable format

**Stage 2 — `alpha.py` — background removal**
- Chroma-key the magenta background with a configurable tolerance (default: Euclidean distance < 40 in RGB)
- **Critical:** threshold alpha to binary (0 or 255) **before** any downscaling. Semi-transparent AI edge pixels become mud when averaged
- Despeckle: remove isolated alpha islands below N pixels (default 4) via connected-component labelling
- Fill interior holes smaller than N pixels
- Erode the alpha mask by 1px to kill magenta fringing, then optionally dilate back

**Stage 3 — `crop.py` — normalize**
- Find the tight bounding box of non-transparent pixels
- Detect the ground line (lowest non-transparent row)
- Record the character's bounding box and ground contact point in metadata
- Do **not** crop to the bounding box — crop to the configured cell size with the pivot at bottom-center

**Stage 4 — `downscale.py`**
- Compute scale factor from source height → target sprite height
- Two selectable methods, configurable per asset:
  - `area`: box/area averaging then palette quantization. Better for organic, detailed subjects
  - `nearest`: pure nearest-neighbour. Harsher, better for already-blocky source
- Default to `area` with a pre-sharpen pass (unsharp mask, radius 1, amount 0.8) to preserve edges through the averaging
- Never use bilinear or bicubic as the final step

**Stage 5 — `quantize.py` — palette mapping**
- Load the master palette from `assets/palette/master.hex`
- Map every pixel to its nearest palette colour
- Distance metric: **CIEDE2000 in Lab space**, not naive RGB Euclidean — RGB distance produces visibly wrong colour choices in shadows
- Optional ordered dithering (Bayer 4×4) behind a `--dither` flag, off by default. Floyd–Steinberg is available but produces noisy results at small sprite sizes
- Output: indexed-colour PNG where possible

**Stage 6 — `outline.py`**
- Detect the alpha boundary
- Draw a 1px outline in the dedicated outline colour
- Configurable mode:
  - `uniform`: same outline colour everywhere
  - `selective`: outline only on the silhouette's outer edge, not internal shape boundaries
  - `none`
- Optionally darken the outline where it meets shadow-side pixels (pseudo-rim shading)

**Stage 7 — `cleanup.py`**
- Remove orphan pixels (single pixels whose 8-neighbours are all a different colour) — the main cause of "noisy" converted art
- Straighten jagged diagonals: detect and correct single-pixel staircase irregularities
- Enforce a minimum feature size (configurable, default 2px) — features smaller than this get merged or removed

**Stage 8 — `pack.py` — sprite sheet assembly**
- Group frames by animation name
- Pack into a uniform grid: configurable columns, uniform cell size, consistent pivot
- Pad the sheet to power-of-two dimensions if `--pot` is set
- 1px transparent gutter between cells is optional — prefer no gutter with nearest-neighbour sampling, add gutters only if you hit bleeding

**Stage 9 — `manifest.py` — metadata export**

Emit a JSON manifest alongside each sheet. This is what the engine reads.

```json
{
  "sheet": "player_attack1.png",
  "cell_width": 96,
  "cell_height": 96,
  "pivot_x": 48,
  "pivot_y": 96,
  "columns": 6,
  "animations": {
    "attack1": {
      "frames": [0, 1, 2, 3, 4, 5],
      "durations_ms": [60, 50, 50, 80, 100, 120],
      "loop": false,
      "events": [
        { "frame": 2, "type": "hitbox_on" },
        { "frame": 4, "type": "hitbox_off" },
        { "frame": 0, "type": "sfx", "id": "swing_heavy" }
      ],
      "hitboxes": [
        { "frame": 2, "x": 48, "y": 48, "w": 40, "h": 24 },
        { "frame": 3, "x": 56, "y": 44, "w": 48, "h": 28 }
      ],
      "hurtbox": { "x": 38, "y": 36, "w": 20, "h": 56 },
      "cancel_window": [4, 5]
    }
  },
  "palette": "master.hex",
  "source_hash": "sha256:...",
  "generated": "2026-10-15T10:44:00Z"
}
```

**Stage 10 — `validate.py`**
- Assert every pixel is either fully transparent or an exact master-palette colour
- Assert all cells are the configured size
- Assert pivot consistency across frames of an animation
- Assert no frame's content touches the cell edge (clipping check)
- Report a per-sheet colour histogram so off-palette drift is visible
- Exit non-zero on failure so CI catches it

### 4.3 CLI surface

```bash
# Single asset
spritegen convert \
  --input assets/source/approved/protagonist_attack1_f2.png \
  --output assets/sprites/player/ \
  --cell 96x96 \
  --sprite-height 60 \
  --palette assets/palette/master.hex \
  --method area \
  --outline selective

# Batch via config
spritegen build --config pipeline.yaml

# Re-run everything from source
spritegen build --all --clean

# Validate shipped assets
spritegen validate assets/sprites/ --palette assets/palette/master.hex

# Preview grid: same input at multiple sizes/methods, side by side
spritegen preview --input X.png --heights 48,56,64,80 --methods area,nearest
```

### 4.4 Config file

`pipeline.yaml` drives batch builds. Per-entity overrides on top of global defaults:

```yaml
defaults:
  palette: assets/palette/master.hex
  method: area
  outline: selective
  dither: false
  min_feature: 2

entities:
  player:
    cell: [96, 96]
    sprite_height: 60
    source_dir: assets/source/approved/player/
    output_dir: assets/sprites/player/
    animations:
      idle:   { loop: true,  durations_ms: 140 }
      walk:   { loop: true,  durations_ms: 90 }
      attack1:{ loop: false, durations_ms: [60,50,50,80,100,120] }

  enemy_thurifer:
    cell: [96, 96]
    sprite_height: 52
    source_dir: assets/source/approved/enemies/thurifer/
    output_dir: assets/sprites/enemies/thurifer/

  boss_the_gilded_choir:
    cell: [384, 384]
    sprite_height: 300
    source_dir: assets/source/approved/bosses/gilded_choir/
    output_dir: assets/sprites/bosses/gilded_choir/
```

### 4.5 The preview tool is the most important deliverable

Build `spritegen preview` **first**. It renders one source image through many parameter combinations into a single contact sheet. You cannot tune downscale method, outline mode, or sprite height by reasoning about it — you have to look. This tool is what makes the rest tunable.

---

## 5. Directory structure

```
assets/
  palette/
    master.hex
    master.png
  source/
    raw/                      # every generation, including rejects
      player/
      enemies/
      weapons/
    approved/                 # culled, chosen sources — pipeline input
      player/
      enemies/
      bosses/
      weapons/
    reference/                # turnarounds, style anchors
  sprites/                    # pipeline output — git-tracked, never hand-edited
    player/
      player_idle.png
      player_idle.json
      player_attack1.png
      player_attack1.json
    enemies/
    bosses/
    weapons/
    vfx/
    ui/
  tiles/
  overrides/                  # hand-pixelled fixes, applied after pipeline
tools/
  spritegen/
    __init__.py
    ingest.py
    alpha.py
    crop.py
    downscale.py
    quantize.py
    outline.py
    cleanup.py
    pack.py
    manifest.py
    validate.py
    preview.py
    cli.py
  tests/
    golden/                   # reference outputs for regression tests
pipeline.yaml
```

**The overrides layer matters.** The pipeline gets you ~85% of the way. Hand-fixing in Aseprite is expected. But hand-edits must live in `assets/overrides/` and be re-applied by the pipeline, or the next re-run destroys them. Implement override application as the final pipeline stage: if `overrides/player/player_idle.png` exists, it replaces the generated output (or composites over it, if you want per-frame granularity).

---

## 6. Naming convention

```
{entity}_{animation}[_{variant}].png
{entity}_{animation}[_{variant}].json

player_idle.png
player_attack1.png
player_attack1_charged.png
enemy_thurifer_walk.png
boss_gilded_choir_phase2_slam.png
weapon_censer_icon.png
vfx_parry_spark.png
```

All lowercase, underscores only, no spaces, no hyphens, no version numbers in filenames (git handles versioning).

---

## 7. Things not to miss

These are the parts that get forgotten until they block you.

### 7.1 Combat data is art data
Frame timing, hitbox rectangles, hurtbox rectangles, i-frame windows, cancel windows, and parry windows are authored **against specific frames**. They belong in the manifest JSON next to the sheet, not scattered in engine code. If art changes, the data must change with it. Build the manifest schema before you build much art.

### 7.2 VFX sprites are a separate, large asset class
Budget for them explicitly. At minimum: hit sparks (light/heavy/parry), blood, dust puffs (land, run, dodge), weapon trails, candle/torch flame loops, ambient dust motes, screen-edge vignette pulses, death dissolve, heal glow, spell effects per ability, boss telegraph flashes. These generate poorly with AI — most are better hand-pixelled or generated procedurally in code.

### 7.3 Tilesets and environment
Entirely different pipeline from characters. Tiles need **seamless edges** and a 47-tile (or 16-tile) autotile set per material. AI generation is weak at seamless tiling; expect to hand-author these or use a dedicated tile tool. Plan: stone wall, stone floor, cathedral interior, crypt, exterior cliff, bone/ossuary, flesh/corruption, water, platform edges. Plus parallax background layers at 3–4 depths per biome.

### 7.4 Palette-swap states
Gameplay needs visual states that reuse the same sprites: enemy enraged, enemy stunned, player invulnerable (flash), player poisoned, player buffed. Implement as **shader palette swaps at runtime**, not duplicate sheets. Reserve palette indices for this and document which indices swap to what.

### 7.5 Normal maps / lighting
If the game uses dynamic lighting (torches, spell glow), sprites need normal maps. Decide **now** — retrofitting normals across hundreds of frames is brutal. Options: skip dynamic lighting entirely (simplest, very period-appropriate); generate normals procedurally from the sprite's alpha and luminance; or hand-author for hero assets only.

### 7.6 UI and typography
Menu frames, health/fervour bars, item slots, map screen, dialogue boxes, prayer/relic icons. Plus a **pixel font** — either licensed or custom. Pixel fonts at 640×360 internal resolution need to be designed at that resolution, not downscaled from a TTF.

### 7.7 Animation in-betweening
The AI gives you key poses. Something has to produce the in-between frames. Three options, pick one: hand-draw them in Aseprite (best quality, slow); generate them with an interpolation pass in the pipeline (fast, mediocre for large pose deltas); or generate more key poses with AI and accept fewer in-betweens (risks drift). Realistically: a mix, hand-drawing for the player and bosses, interpolating for common enemies.

### 7.8 Engine import settings
Whatever engine you use, lock these: **point/nearest filtering**, no mipmaps, no texture compression (or lossless only), no sprite atlas auto-packing that rewrites your pivots, pixel-per-unit matching your cell size, and camera pixel-snapping. One wrong filter setting makes all of the above work look blurry.

- **Godot:** project-wide `rendering/textures/canvas_textures/default_texture_filter = Nearest`, viewport stretch mode `viewport`, stretch aspect `keep`
- **Unity:** per-sprite Filter Mode `Point`, Compression `None`, Pixels Per Unit = cell size, Pixel Perfect Camera component

### 7.9 Determinism and CI
The pipeline must be reproducible: same source + same config = byte-identical output. Seed anything random. Add a CI job running `spritegen validate` so off-palette or misaligned assets never merge.

### 7.10 Audio hooks
Animation manifests should carry sound event markers (footstep frames, swing frames, impact frames). Authoring them alongside the animation is far easier than retrofitting.

### 7.11 Metroidvania structure data
Not art, but adjacent and easy to defer too long: room graph, ability gates (which ability unlocks which barrier), map reveal data, save/bench points, fast-travel network. Define the gating graph early — it determines which abilities you need animations for.

### 7.12 Legal hygiene
Keep `assets/source/raw/` with prompt sidecars as your provenance record. Check the current terms of service for each generation tool regarding commercial use of outputs — they change. Keep that check dated in the repo.

---

## 8. Build order

1. Lock resolution, cell sizes, pivot convention (Section 1)
2. Build the master palette (Section 2)
3. Build `spritegen preview` — the parameter-tuning tool (4.5)
4. Generate one character turnaround, approve the design (3.3)
5. Generate ~6 poses for one animation (idle or walk)
6. Run them through preview, tune downscale/outline/palette parameters until the output looks like intentional pixel art
7. **Only then** build out the rest of the pipeline stages and generate the full pose set
8. Manifest schema and combat data authoring
9. Engine import and a playable movement test with real sprites
10. Scale to enemies, then bosses, then environment

Step 6 is the gate. If a single walk cycle doesn't look right coming out of the pipeline, 600 frames of it won't either.

---

## 9. Immediate tasks for Claude Code

1. Scaffold `tools/spritegen/` with the module structure in 4.2 and a `typer` CLI
2. Implement `preview.py` first, plus the minimum of `ingest`, `alpha`, `downscale`, `quantize` needed to feed it
3. Implement `palette.py` helper: load `.hex`, build a Lab-space lookup table, CIEDE2000 nearest-match with caching
4. Write golden-image tests for `alpha` and `quantize` using small synthetic inputs
5. Create `pipeline.yaml` with the structure in 4.4 and a `player` entity stub
6. Generate a starter 48-colour master palette matching the ramp structure in 2.1, output both `.hex` and a swatch `.png`
