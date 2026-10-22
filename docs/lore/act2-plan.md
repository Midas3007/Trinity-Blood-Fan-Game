# Act 2 plan — the Empire arc (owner approved 2026-10-22)

The arc follows the anime's journey to the Empire's capital in outline only. Series names are written from memory and
marked *(verify)* until checked; **every line below is original** (CLAUDE.md Part 6). The finale (Abel vs Cain on the
Imperial Spire) is already built. Built in stages, one per session:

1. **This script** ✅ 2. Docks + Bazaar + the phase-step dash 3. The Janissary Captain 4. The Undercity of Byzantium
5. The Palace and Radu 6. The road to the Spire and the epilogue.

## Premise
The Empress writes to Rome and asks for "the Atoner". Officially: a quiet talk about peace. In truth the Rosenkreuz
Orden means to kill her and leave a Vatican priest's body beside hers, and the war begins again. Behind the Orden,
someone has waited nine hundred years for Abel to come home.

## Cast
| Who | Role | Notes |
|---|---|---|
| **Abel Nightroad** | playable | Crusnik 40% as before; **100%** only on the Spire (scripted). New: **phase-step dash**. |
| **Astharoshe Asran** *(verify)* | ally | Methuselah duchess, an imperial agent; contemptuous of "the Terran priest", then his fiercest ally. Fights at his side in set pieces; optional duel at the docks. |
| **Ion Fortuna** *(verify)* | ally / protected | A young count who believes in peace with the Terrans. Framed for murder in the bazaar. |
| **Radu** *(verify)* | traitor, boss | Ion's closest friend, turned by the Orden; fire-wielder. Tragic: he believes he's saving Ion. |
| **The Magus** | handler | Returns from Act 1; pulls Radu's strings, vanishes before the end. |
| **The Empress** *(verify)* | unseen | Always behind a veil or a screen (owner's spoiler rule). |
| **Cain** | finale | Built. White wings, blond hair, a lance, red blasts. |
| **Esther** | in Rome | Never on screen; Abel's letters to her are the lore stones at the altars. |

## Chapters, rooms and scenes

### 1. The Imperial Docks (2 rooms) — arrival
- **Arrival** (`empire_arrival`): an imperial airship docks under a red sky. Abel trips on the gangplank.
  - Abel: "I'm told the Empire doesn't serve tea to Terrans. I brought my own. Just in case."
  - Astharoshe: "You are the Atoner? Rome sent me a scarecrow."
- **Optional duel: Astharoshe** (`astharoshe_duel`, non-lethal, she yields): a rapier duellist with a parry and lunges.
  Reward: **the Empress's seal** (fast travel between the empire's altars).
- **Altar**: the dock chapel (Abel's first letter to Esther).
- Enemies: imperial guards (shield + spear, recoloured Iron Choir), bats.

### 2. The Grand Bazaar (3 rooms) — the frame-up
- **Ion** (`ion_meeting`): a cheerful young noble buys Abel a cup of tea he can't afford.
  - Ion: "My grandmother says Terrans are cattle. My grandmother has never met one who apologised to a door."
- **The murder** (`bazaar_murder`): a guard captain dies with Ion's dagger in him. The crowd turns.
  - Astharoshe: "Run, both of you. I will find out who held that knife."
- **Ability: the phase-step dash** — in a burning stall Abel lets the nanomachines carry him *through* a grille
  (cutscene `phase_step`). DODGE in the air (or DODGE + up) now dashes; while dashing he passes through **iron grilles**
  and through attacks. Grilles also exist in Istvan (sewers, cellars): new secrets there.
- Rooms: the lamp market (rooftops of awnings), the spice stairs (vertical), the grand arcade.
- Enemies: guards, Rosenkreuz zealots (fire throwers; recoloured Inquisitor), bat swarms.

### 3. The Janissary Captain (boss room) ✅
- **The Janissary Captain** *(original)*: the Empress's guard, honest and deadly; sabre combos, a shield bash, an
  unparryable charge. He believes Abel killed his friend.
  - Intro: "A priest of Rome, in the heart of the Empire, with blood on his sleeve. Draw."
  - Outro (non-lethal): "...You could have killed me. Then you are not the murderer. Go. I will look away."
- Reward: **Fides** (relic: +1 flask).

### 4. The Undercity of Byzantium (3 rooms) — the outcasts ✅
- Old cisterns under the city where poor Methuselah live away from the court. Columns, water, lamps.
- A Methuselah child shows Abel the way (no combat); the Magus's puppets haunt the lower cistern.
- **Ion's trial by the outcasts** (`undercity_ion`): Ion admits his family's cruelty and is forgiven.
- Secret: a tea-set piece behind a grille. Altar: a cistern shrine.

### 5. The Palace (3 rooms) and the laboratory (1 room) ✅
- Gardens of cherry trees under glass; a hall of mirrors; the veiled audience chamber.
- **The audience** (`empress_audience`): the Empress speaks from behind a silk screen. Never shown.
  - Empress: "Father Nightroad. You have not changed at all. That is either a comfort or a warning."
- **Radu's betrayal** (`radu_reveal`): in the laboratory beneath, Radu stands among tanks of grown flame.
  - Radu: "They'll call you a hero for this peace, Ion. I'll make sure you live long enough to be one."
- **Boss: Radu** — phase 1 fire whips and ground flames; phase 2 he burns (a fire body, flame pillars, a flaming dive).
  He falls into the fire he made; Ion reaches for him too late. Reward: **Ignis** (relic: +15% damage).
- The Magus watches from a gallery and leaves. ("A fine performance. Your brother will be so pleased.")

### 6. The Imperial Spire (built) and the epilogue
- The road: a lift from the laboratory to the Spire roof (`spire_ascent`, Astharoshe stays to hold the stairs).
- **Abel vs Cain** (built): ground, then CENTUM in the sky.
- **Epilogue** (`empire_epilogue`): dawn. Ion and Astharoshe see Abel off at the docks; a letter sealed by the Empress.
  - Astharoshe: "If Rome ever tires of you, the Empire has a use for frightening men who apologise to doors."
  - Abel, to the empty sky: "Esther... I'm coming home. I'll pretend I'm only tired."
- Then credits and back to the title.

## How the arc joins the world
- After Act 1's ending, **an airship berth at Istvan Station** opens (`ending` seen): stand there, push up → the docks.
- The airship altar links Istvan and the Empire for fast travel.
- The Spire's sealed door in the Star chamber stays as a shortcut once the arc is finished (and for the cheat).

## New enemies (all recolours / code-drawn, no new AI art)
| Enemy | From | Behaviour |
|---|---|---|
| Imperial guard | Iron Choir (recolour, blue-gold) | shield blocks from the front, spear thrust |
| Rosenkreuz zealot | Inquisitor (recolour, red-black) | throws fire bottles that burn the floor briefly |
| Bat swarm | bats | three bats as one flock |
| Grown flame-beast | thrall (recolour, orange) | slow, explodes in fire when it dies |

## Rewards
Fides (+1 flask), Ignis (+15% damage), the Empress's seal (empire fast travel), two hearts, a chalice, the last tea-set
pieces, and a second priest weapon: **the Byzantine spear** (long thrust, short combo).
