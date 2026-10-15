# Reference Findings (Blasphemous, private study)

Only evidence-backed findings. No numbers have been invented. Nothing from `reference/` is copied into the game.

## Method and limits (2026-10-14)

- **Source:** `reference/blasphemous-android/` (owner's extract, 12 files). No Unity data files are present: no `data.unity3d`, `globalgamemanagers`, scenes, `sharedassets*`, `resources.assets` or asset bundles. So there are **no images, sprites, animations, levels, audio banks or serialized tuning values** to inspect.
- **Technique used:** read the plain-text string table of `global-metadata.dat` (`strings -n 4`, ~142k strings). This recovers **names** of namespaces, types, methods and fields. It does **not** reliably show which class owns a given name, field types, default values, or logic.
- **Not done:** decompiling `libil2cpp.so`. That needs a native analysis engine (REA → Ghidra) plus IL2CPP symbol recovery (Il2CppDumper/Cpp2IL). See "Tooling status" below.
- **Conclusion for design:** names tell us *which mechanics exist*. How they *feel* (speeds, timings, windows) must come from the owner's play observations in `docs/feel-spec.md`.

## Engine and package overview

| Finding | Evidence | Confidence |
|---|---|---|
| Engine is Unity **2022.3.62f2** | Version string ×5 in `lib/arm64-v8a/libunity.so` | high |
| Scripting backend is **IL2CPP** (C# compiled to native ARM64) | `libil2cpp.so` + `Data/Managed/Metadata/global-metadata.dat`; no `Managed/*.dll` | high |
| IL2CPP metadata **version 31** | Header bytes `AF 1B B1 FA 1F 00 00 00` (magic + 31) | high |
| Android package `com.thegamekitchen.blasphemousmobile`; Unity activity; Google Play Games; Play Asset Delivery pack `UnityDataAssetPack` | Strings in binary `AndroidManifest.xml` | high |
| Audio middleware: **FMOD Studio** | `libfmod*.so`, `libfmodstudio*.so`; `FMODUnity` namespace | high |
| Input library: **Rewired** (749 name hits) | `Rewired.*` names | high |
| Tweening: **DOTween** | `DG.Tweening` namespace; many `DO*` methods (`DOShakePosition`, `DOJump`) | high |
| Visual scripting: **PlayMaker** (`HutongGames`, `Tools.Playmaker2.Action|LifeAdd`, `|Fade`, `|ShowUI`) and **NodeCanvas** (95 hits) | namespaces | high (present) / low (what they drive) |
| Localization: **I2 Localization**; editor tooling: **Odin (Sirenix)** | `I2.Loc`, `Sirenix` | high |
| The extract appears **modified** (`libAPKVISION.so` contains `A64HookFunction`; `libstub.so` references `np/dcc/protect/EntryPoint`; manifest requests `INSTALL_PACKAGES`) | strings in those files | medium — not a clean store build; never run it |

## Findings

Format per CLAUDE.md Part 5. "Names" below are exact strings from `global-metadata.dat`.

### F1 — Player code is split into small components by responsibility
- **Area:** architecture / movement / combat
- **Investigated:** namespaces under the player character ("Penitent").
- **Evidence:** `Gameplay.GameControllers.Penitent.{Abilities, Animator, Attack, Audio, Damage, Effects, InputSystem, Movement, Prayers, Sensor, Spawn, States}`; types `PenitentController`, `PenitentAttack`, `PenitentJump`, `PenitentDamageArea`, `PenitentShieldSystem`, `PenitentSpawner`.
- **Confidence:** high (structure exists).
- **Unknown:** how components talk to each other.
- **Reproducible independently?** yes — our `src/player`, `src/combat`, `src/systems` split already matches this idea.

### F2 — Player states are driven by Animator state behaviours
- **Area:** movement / combat
- **Evidence:** `JumpBehaviour`, `FallingBehaviour`, `LandingBehaviour`, `HardLandingBehaviour`, `DashBehaviour`, `DashSubStateBehaviour`, `AirDashBehaviour`, `CrouchState`, `CrouchSubStateBehaviour`, `AttackBehaviour`, `AirAttackBehaviour`, `AirUpwardAttackBehaviour`, `CrouchAttackBehaviour`, `ChargedAttackBehaviour`, `LungeAttackBehaviour`, `ParryBehaviour`, `HurtSubStateBehaviour`, `AirHurtBehaviour`, `CliffLedeSubStateBehaviour`, `GuardToIdleBehaviour`. Names ending in `StateBehaviour`/`SubStateBehaviour` follow Unity's `StateMachineBehaviour` convention.
- **Confidence:** high that these states exist; medium that the Animator drives transitions.
- **Unknown:** transition rules, durations, cancel windows.
- **Reproducible?** yes — as our own data-driven state machine (Milestones 2–3). Candidate state list: idle, run, crouch, jump, fall, land, hard-land, dash, attack (ground/air/up/crouch/charged/lunge), parry, hurt (ground/air), ledge-hang/climb, ladder.

### F3 — Jump has coyote time ("ghost jump"), a fall-jump tolerance and variable height
- **Area:** movement
- **Evidence:** `GhostJumpDelay`, `CanGhostJump`, `FallingJumpTolerance`, `CutJumpSpeedLimit`, `CancelJump`, `IsJumpButtonHold`, `JumpSpeed`, `MaxSpeedBeforeFalling`, `HardLandingBehaviour`.
- **Confidence:** medium (names strongly suggest the mechanics; owners of fields unconfirmed).
- **Unknown:** all values.
- **Reproducible?** yes — standard techniques; planned for Milestone 2 with tunable placeholders.

### F4 — Dash/dodge with cooldown, invulnerability and a back-dash
- **Area:** movement / combat
- **Evidence:** `Dash`, `DashDistance`, `DashCooldown`, `DashCooldownBase`, `DashCooldownUpgrade`, `SetDashInvulnerable`, `BackDashDistance`, `BackDashTime`, `AirDashBehaviour`, `CrouchAfterDash`, `DashAttack`, `Effects.Player.{Dash, GhostTrail}`.
- **Confidence:** medium.
- **Unknown:** distance, duration, i-frame window, whether air dash is player-usable or upgrade-gated.
- **Reproducible?** yes.

### F5 — Ledge grab/climb and ladders are separate traversal systems
- **Area:** movement / world
- **Evidence:** `CliffLede`, `CliffLedeGrabSideAllowed`, `ClimbCliffLede`, `ClimbCliffLedeBehaviour`, `Environment.CliffGrabbers`, `CliffGrabActivator`, `ClimbLadder`, `ActionableLadder`, `CanClimbLadder`, `CanJumpFromLadder`, `ClimbingSpeed`, `Tools.Level.Layout|LadderLayout`.
- **Confidence:** high (exists).
- **Unknown:** grab detection rules, timings.
- **Reproducible?** yes (later milestone; not in M2 scope unless the owner asks).

### F6 — Combat: attack areas, combos, parry window, guard slide, charged and lunge attacks
- **Area:** combat
- **Evidence:** `AttackArea`, `AttackAreaOffset`, `AttackAreaSize`, `DamageArea`, `PenitentDamageArea`, `Combo`, `ComboAttack`, `ComboHitUp`, `ComboHitDown`, `ComboFinisherJump`, `CancelCombo`, `CheckParryWindow`, `CloseParryWindow`, `CheckParryCounter`, `GotParry`, `Guard`, `GuardSlide`, `GuardSlideImpact`, `ChargedAttackBehaviour`, `LungeAttackBehaviour`.
- **Confidence:** medium.
- **Unknown:** frame data, damage formulas, parry window length.
- **Reproducible?** yes — hitbox/hurtbox rectangles defined as data (Milestone 3).

### F7 — Damage response: invulnerability after hit, push-back/throwback, slow motion
- **Area:** combat / feedback
- **Evidence:** `InvulnerabilityLapse`, `SetInvulnerabilityCoroutine`, `SetPlayerInvulnerable`, `PushBackEventKey`, `ThrowbackDirByOwnerPosition`, `DoSlowMotion`, `SlowMotionStart`, `StopSlowMotion`.
- **Confidence:** medium. No name found containing `HitStop`/`FreezeFrame`; hit-pause may be implemented as slow motion — **unverified**.
- **Unknown:** durations, knockback distances.
- **Reproducible?** yes.

### F8 — Feedback: camera shake presets, hit effects, particles
- **Area:** feedback
- **Evidence:** `CameraShakeManager`, `ConstantShakePreset`, `ComboCameraShake`, `ChargedAttackCameraShake`, `HeavyStepCameraShake`, `Effects.Player.{Dust, Sparks, Flash, HardLandingEffect, Healing, Sprint, DistortionWave, Recolor}`, `PushBackSpark`, `ThrowbackDust`, `Effects.NPCs.BloodDecals`.
- **Confidence:** high (exists).
- **Unknown:** strengths and durations.
- **Reproducible?** yes — named shake presets in our data files is a good pattern to copy as an *idea*.

### F9 — Progression: checkpoints, flask healing, a spendable resource, equipment
- **Area:** progression
- **Evidence:** `PrieDieu` (checkpoint shrine), `UsePrieDieu`, `RespawnDeadEnemies`, `OnEnemiesRespawn`, `Flask`, `FlaskRefill`, `FlaskHealthUpgrade`, `EmptyFlask`, `CurrentHealingLapse`, `Fervour`, `ConsumeFervour`, `FervourRefill`, `Framework.Inventory|{Prayer, Relic, RosaryBead, Sword, QuestItem}`, `Gameplay.GameControllers.Penitent.Prayers`.
- **Confidence:** high (exists); medium that resting at a checkpoint respawns enemies and refills flasks (names suggest it).
- **Unknown:** costs, amounts, timing.
- **Reproducible?** yes, as *our own* systems with Trinity Blood flavour (e.g. a different checkpoint and healing fiction). Do not reuse Blasphemous names or item fiction.

### F10 — World: traps, abyss, elevators, breakable walls, teleports
- **Area:** world
- **Evidence:** `AbyssTrap`, `AbyssTrapDamage`, `BasicTrap`, `CauldronTrap`, `BreakableWall`, `Environment.{Breakable, DamageObject, Elevator, AreaEffects}`, `Tools.Level|{Teleport, Region, Interactable, IActionable}`, `PenitentOnElevator`.
- **Confidence:** high (exists).
- **Unknown:** room/scene structure and transitions (scene data not in extract).
- **Reproducible?** yes (Milestone 5).

### F11 — Mobile touch UI has dedicated buttons and remapping
- **Area:** interface
- **Evidence:** `Tools.UI|{TouchPrayerButton, TouchInventory, TouchInteractButton, CustomJoystickSnap, VirtualUI}`, `TouchJoystick`, `TouchJoystickAngleIndicator`, `TouchJoystickRadialIndicator`, `TouchJoystickRemapper`, `TouchRemapManager`, `TouchFlaskButton`, `TouchRangeAttackButton`, `TouchHiddenButton`.
- **Confidence:** high (exists).
- **Unknown:** layout and sizes.
- **Reproducible?** yes — supports our plan: joystick with direction indicator, separate heal button, context "interact" button, and a remap screen (CLAUDE.md Part 8 requires saved layouts).

### F12 — Enemies and bosses: per-enemy behaviours plus balance tables
- **Area:** enemies
- **Evidence:** `Gameplay.GameControllers.Enemies` (238 namespace strings), `Gameplay.GameControllers.Bosses` (67), `Gameplay.GameControllers.Entities.StateMachine`, `EnemyBehaviour`, `GenericEnemyAttackBehaviour`, `ExplodingEnemy{Spawn, Walk, ChargeExplosion, Explosion, Hurt, Vanish}Behaviour`, `Framework.EditorScripts.{EnemiesBalance, BossesBalance}`, `EnemyHealthBar`, NodeCanvas `BehaviourTree`.
- **Confidence:** high (exists); low on which tool drives which enemy.
- **Unknown:** detection ranges, patterns, numbers.
- **Reproducible?** yes — per-enemy state machines + a balance data file (Milestone 4).

## Tooling status

| Tool | Status here | What's needed |
|---|---|---|
| REA 6.5.0 CLI | **Runs** (`npx -y rea-agents@6.5.0 doctor --provider ghidra --json`: node 22.22.0 healthy) | — |
| REA native analysis (Ghidra provider) | **Not available**: doctor reports `GHIDRA_INSTALL_DIR is not set`; downloading Ghidra from GitHub releases is **blocked (HTTP 403)** by this environment's network policy | Owner allows `github.com` (and `objects.githubusercontent.com`) under Network access, or uploads a Ghidra 12.1.x zip. JDK 21 is already installed. |
| REA Android/JADX | Not applicable: needs the full APK (classes.dex), which is not in the extract; also needs a caller-supplied `jadx-headless-mcp 0.7.1` JAR | Full APK + JAR |
| IL2CPP symbol recovery (Il2CppDumper / Cpp2IL) | Not installed; needs .NET runtime (missing) and a tool that supports **metadata v31** — check the current README before use | Network access + approval |
| Plain `strings` / `objdump` | Used for this report | — |

**Honest expectation even with all tools:** decompiling `libil2cpp.so` gives unnamed native pseudocode unless symbols are recovered; with recovery it gives method signatures and control flow, but **tuning values live in serialized scene/prefab data that is not in this extract**. More tooling would refine *structure*, not give feel numbers.

---

## Web research pass — 2026-10-15 (public reviews, wikis, player discussion; not extracted data)

| # | Investigated | Evidence | Confidence | Unknown | Reproducible here |
|---|---|---|---|---|---|
| W1 | World structure | Reviews: the world is interconnected; early areas can be tackled in a chosen order; shortcuts (elevators, portals) lead back to the hub town (Albero) and gradually tie the map together. One review finds areas feel isolated from each other. ([metroidvaniareview](https://metroidvaniareview.com/blasphemous/), [gamerguides](https://gamerguides.com/blasphemous/review), [keengamer](https://www.keengamer.com/articles/reviews/ps4-reviews/bloody-hack-and-slash-blasphemous-cuts-in-review-ps4/)) | medium | exact shortcut count/placement | yes: hub (Market Square) + lever shortcuts + later fast travel between altars |
| W2 | Checkpoints | Prie Dieu restores health and Bile Flasks ([fextralife progress route](https://blasphemous.wiki.fextralife.com/Game+Progress+Route)) | high | spacing between them | done: altars restore health and holy water |
| W3 | Build systems | Rosary Beads = passive perks in limited slots, extra slots from Knots of Rosary Rope; Prayers spend Fervour; Relics give traversal/perception abilities; Guilt Fragment holds currency after death ([fextralife beads](https://blasphemous.wiki.fextralife.com/Rosary+Beads), [fandom](https://blasphemous.fandom.com/wiki/Category:Rosary_Beads)) | medium | numbers | yes, as our own equivalents (see design note) |
| W4 | Combat | Parry is central (an early enemy works as the parry tutorial and enables a riposte); players criticise inconsistent telegraphing and slow parry startup ([wiki.gg](https://blasphemous.wiki.gg/wiki/Enraged_Wheel_Pilgrim), [Steam discussion](https://steamcommunity.com/app/2114740/discussions/0/3816291905691230859)) | medium (anecdotal) | frame data | yes: keep every wind-up readable (we already tint amber); consider a parry |

**Design implications for us (proposals):**
1. Keep Market Square as the hub; every new area opens a shortcut back to it.
2. Later: fast travel between prayed-at altars (M7+).
3. Our equivalents of the build systems, original and in-setting: **holy medals** (passive perks in limited slots), **Crusnik meter** (our Fervour) spent on Crusnik abilities, **relics** for traversal.
4. Combat: consider a **parry** (Abel deflects with his revolver, opening a riposte/finisher); keep telegraphs consistent (amber wind-up on every attack).
