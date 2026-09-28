# Kitaeru (鍛える) — Build Contracts

Kitaeru is a free calisthenics PWA. It has **no build step and no dependencies**: vanilla ES modules only.
It must run offline and be served statically (`python -m http.server` from the project root).
All user data stays in `localStorage`. There is no backend.

Every module must match the interfaces below exactly. Other team members build against them in parallel.

## File ownership

| File | Owner | Purpose |
|---|---|---|
| `docs/research.md` | Research | Evidence-based programming rules with citations |
| `js/data/muscles.js` | Content | Muscle ids, names, regions |
| `js/data/exercises.js` | Content | Exercise library |
| `js/data/traditions.js` | Content | Movement traditions (culture cards), the accuracy gate, the Radio Taisō attribution string |
| `js/anim/skeleton.js` | Animation | Skeletal FK renderer (SVG) + muscle overlay |
| `js/anim/poses.js` | Animation | Keyframes per animation id |
| `js/anim/bodymap.js` | Animation | Front/back anatomical body map SVG with highlighted muscles |
| `js/engine/planner.js` | Engine | Plan generation, progression, streaks |
| `js/store.js`, `js/app.js`, `js/ui/*.js`, `css/app.css`, `index.html`, `sw.js`, `manifest.webmanifest`, `icons/*` | UI | App shell, screens, persistence |

## Muscle ids (fixed — use exactly these)

`chest, front_delts, side_delts, rear_delts, triceps, biceps, forearms, traps, upper_back, lats, lower_back, abs, obliques, glutes, hip_flexors, quads, hamstrings, adductors, calves`

`js/data/muscles.js`:
```js
export const MUSCLES = { chest: { name: 'Chest', view: 'front' }, ... } // view: 'front' | 'back' | 'both'
export const MUSCLE_IDS = Object.keys(MUSCLES);
```

## Equipment ids

`pullup_bar, dip_bars, rings, parallettes, resistance_band, bench, table, wall`
(`bench` means any sturdy chair, bench or box. `table` means a sturdy table you can row under. Floor and bodyweight are always available.)

v1.2 adds `club` (substitute: a 0.5–1 L water bottle held by the neck), `stick` (a broom handle, rolled towel or wooden spoon) and `hand_weights` (two water bottles). No v1.2 exercise uses them yet. Names and substitutes: `EQUIPMENT` in `js/data/exercises.js`.

## Injury / contraindication ids

`wrist, elbow, shoulder, neck, lower_back, hip, knee, ankle`

## Exercise schema (`js/data/exercises.js`)

```js
export const EXERCISES = [
  {
    id: 'push_up',                 // snake_case, unique; also the animation id unless `anim` is set
    name: 'Push-up',
    family: 'push_horizontal',     // see families below
    level: 4,                      // order within its family (1 = easiest). Unique within a family.
    category: 'strength',          // 'strength' | 'core' | 'mobility' | 'conditioning' | 'skill' | 'warmup' | (v1.2) 'balance' | 'breath' | 'flow'
    mode: 'reps',                  // 'reps' | 'hold' (hold = seconds) | (v1.2) 'flow' (a sequence, see below)
    unilateral: false,             // true => prescribed per side
    muscles: { primary: ['chest','triceps'], secondary: ['front_delts','abs'] },
    equipment: [],                 // ALL items required (empty = none needed)
    space: 'small',                // 'small' (a yoga mat) | 'medium' (can lie down and swing arms/legs) | 'large' (jumping, crawling several metres)
    impact: 'low',                 // 'low' | 'high' (jumping/plyometric)
    stress: ['wrist','shoulder'],  // joints loaded meaningfully: excluded if user reports that injury
    difficulty: 3,                 // 1-10 global difficulty
    anim: 'push_up',               // animation id in poses.js (defaults to id)
    cues: ['Hands under shoulders', 'Body in one straight line', 'Chest to fist height'],
    description: 'One or two sentences.',
    easier: 'knee_push_up',        // optional id overrides; otherwise derived from family/level
    harder: 'decline_push_up',
  },
];
export const FAMILIES = { push_horizontal: { name: 'Horizontal push', pattern: 'push' }, ... };
export const byId = Object.fromEntries(EXERCISES.map(e => [e.id, e]));
```

### Families and exercise ids (easiest to hardest; authoritative list)

- `push_horizontal`: wall_push_up, incline_push_up, knee_push_up, push_up, decline_push_up, diamond_push_up, archer_push_up, pseudo_planche_push_up
- `push_vertical`: pike_push_up, elevated_pike_push_up, wall_handstand_push_up
- `dip`: bench_dip, bar_dip, ring_dip
- `pull_vertical`: dead_hang, scapular_pull, negative_pull_up, band_assisted_pull_up, chin_up, pull_up, archer_pull_up
- `pull_horizontal`: band_row, table_row, inverted_row, archer_row
- `pull_noequip`: prone_ytw, superman_pull (no-equipment back work, used when there is no bar, table or band)
- `squat`: box_squat, bodyweight_squat, split_squat, reverse_lunge, bulgarian_split_squat, cossack_squat, shrimp_squat, pistol_squat
- `hinge`: glute_bridge, single_leg_glute_bridge, hip_thrust, single_leg_rdl, nordic_curl_negative
- `calves`: calf_raise, single_leg_calf_raise
- `core_anterior`: dead_bug, plank, hollow_body_hold, lying_leg_raise, hanging_knee_raise, hanging_leg_raise, l_sit
- `core_lateral`: side_plank, side_plank_hip_dip
- `core_posterior`: bird_dog, superman
- `conditioning`: marching_in_place, jumping_jack, mountain_climber, bear_crawl, high_knees, squat_jump, burpee
- `skill_balance`: crow_pose, wall_handstand, freestanding_handstand
- `mobility`: cat_cow, worlds_greatest_stretch, deep_squat_hold, hip_flexor_stretch, standing_hamstring_stretch, pigeon_stretch, childs_pose, cobra_stretch, calf_stretch, shoulder_dislocate, thoracic_opener, wrist_prep, pancake_stretch, doorway_chest_stretch
- `warmup`: arm_circles, leg_swings, hip_circles, scapular_push_up, inchworm (+ v1.2 tradition items rt_stretch_up, rt_side_bend and flow-only steps)

v1.2 families (world-movement.md §3.3; generic, visible without verification unless noted):
- `rotation` (pattern `core`): open_book, thread_the_needle, seated_trunk_rotation, *rt_trunk_twist* (tradition), bodyweight_woodchop, rotational_lunge, band_woodchop, standing_windmill
- `anti_rotation` (pattern `core`): bird_dog_row, half_kneeling_pallof_hold, plank_shoulder_tap (the no-band fallback), pallof_press, pallof_press_overhead, side_plank_reach_through
- `stance` (pattern `legs`): *horse_stance*
- `flow_taichi`, `flow_qigong`, `flow_sequence`, `breath` (pattern `flow` / `breath`, `progression: false`: not ladders)
- Tradition items inside existing families: *dand* in `push_horizontal` (level 4.5), *baithak* in `conditioning` (level 3.5)

`level` is only meaningful for progression families (everything except mobility, warmup, conditioning and the flow/breath families, where it is just a difficulty order). Levels may be fractional (4.5) to slot an item between rungs.

## Animation API

`js/anim/poses.js`:
```js
export const ANIMS = {
  push_up: { view: 'side', anchor: 'hands', duration: 2400, loop: true, frames: [ { t: 0, pose: {...} }, { t: 0.5, pose: {...} }, { t: 1, pose: {...} } ] },
  ...
}; // one entry for EVERY exercise id above
```
The Animation owner defines the pose format internally (joint angles and FK).

`js/anim/skeleton.js`:
```js
export function createSkeletonPlayer(container, animId, { primary = [], secondary = [], size = 280, playing = true } = {})
// Renders an SVG into container. Returns { play(), pause(), setAnim(animId, primary, secondary), destroy() }.
// Highlights primary muscles (accent, gently pulsing) and secondary muscles (softer tint) as shapes on the skeleton.
```

`js/anim/bodymap.js`:
```js
export function renderBodyMap(container, { primary = [], secondary = [], size = 160 } = {}) // front + back silhouettes side by side
export function bodyMapSVG({ primary, secondary, size }) // returns an SVG string
```

Colours come from CSS custom properties so they theme correctly: `--muscle-primary`, `--muscle-secondary`, `--bone`, `--joint`, `--ink-muted`.

## Profile (input to planner, saved by store)

```js
{
  name: 'Hiro',                          // optional
  goals: ['strength','flexibility'],     // any of: strength, muscle, endurance, flexibility, skill, health, (v1.2) balance
  primaryGoal: 'strength',
  daysPerWeek: 3,                        // 2..6
  minutesPerSession: 30,                 // 10..90
  preferredDays: [1,3,5],                // 0=Sun..6=Sat, length === daysPerWeek
  age: 38, sex: 'male',                  // 'male' | 'female' | 'unspecified'
  heightCm: 178, weightKg: 80, units: 'metric', // 'metric' | 'imperial' (display only; store metric)
  experience: 'some',                    // 'new' | 'some' | 'regular' | 'advanced'
  baseline: { pushUps: 12, pullUps: 0, squats: 25, plankSec: 45 }, // each nullable (unknown)
  injuries: ['wrist'],
  equipment: ['pullup_bar','wall'],
  space: 'medium',                       // 'small' | 'medium' | 'large'
  lowImpact: false                       // user preference; planner may also force it (age/BMI/injury)
}
```

## Planner API (`js/engine/planner.js`)

Pure functions with no DOM and no storage.

```js
export function initialLevels(profile, library)                  // -> { [family]: exerciseId } starting progression per family
export function generateWeek(profile, levels, library, weekIndex) // -> Week (deterministic)
export function applySessionLog(levels, profile, sessionLog, library, history) // -> { levels, changes: [{family, from, to, reason}] }
export function computeStreak(logs, profile, today = new Date())  // -> { current, best, weekly: { current, best }, freezeAvailable }
export function explainPlan(profile, week)                        // -> string[] human-readable "why this plan" bullets
export function estimateMinutes(session, library)                 // -> number
```

Types:
```js
Week = { weekIndex, phase: 'build' | 'deload', sessions: Session[], days: { [dow]: sessionId | null } }
Session = { id: 'A', name: 'Full body A', focus: ['push','pull','legs'], estMinutes: 32,
  blocks: [ { kind: 'warmup'|'skill'|'main'|'conditioning'|'mobility'|'cooldown'|'balance'|'flow', title: 'Warm-up',
    items: [ { exerciseId, family, sets: 3, reps: [6,10] | null, holdSec: [20,30] | null, perSide: false, restSec: 90, rir: 2, notes: '',
               flow?: FlowRx } ] } ],
  light?: true,                    // v1.2: a light day (mobility / flow / skill); counts like any session for streaks
  options?: SessionOption[] }      // v1.2: optional swaps the UI may offer; not included in blocks or estMinutes
SessionLog = { id, date: 'YYYY-MM-DD', weekIndex, sessionId, durationMin, feel: 1..5 (overall effort),
  items: [ { exerciseId, family, sets: [ { reps?: number, sec?: number, done: true } ], rating: 'easy'|'good'|'hard' } ] }
```
`levels` may also carry `flowStages: { [flowId]: { stage, easy } }` (v1.2 flow progression). Every other key stays `family -> exerciseId`.

## Quick workout (v1.1) — `js/engine/planner.js`

This is a one-off session. The user can start one with no setup at all, or with a profile.

```js
export function generateQuickSession(request, profile /* or null */, levels /* or null */, library) // -> Session (id 'Q')
request = {
  minutes: 20,                    // 5..90
  goal: 'strength',               // optional: strength | muscle | endurance | flexibility | skill | health | balance (default 'health')
  focus: 'upper',                 // optional: full | upper | lower | core | push | pull | legs | mobility | (v1.2) flow | balance | rotation (default 'full')
  muscles: ['glutes','hamstrings'], // optional: specific muscle ids (from tapping the body map); overrides focus when present
  equipment: [], space: 'medium', lowImpact: false, // used when profile is null; profile values win otherwise
  date: 'YYYY-MM-DD'              // seed for deterministic variety (same request same day → same session)
}
```
- If there's no profile or levels, assume experience 'some', no injuries, no baseline, and levels from `initialLevels` of a default profile.
- Honour the profile's injuries, equipment and levels when present.
- A 'Q' session log counts toward the day streak and the weekly target, like any session. applySessionLog progresses the families it trained.
- The session's `name` is descriptive, e.g. "20-min Lower body · Strength" or "15-min Glutes & hamstrings".

## v1.2 world movement (streams A and B)

Research: `docs/world-movement.md` (§3 rotation, §4 programming, §5 cultural rules, §6 schema). Plan: `docs/v1.2-plan.md`.

### Exercise fields (all optional; existing exercises are unchanged)

```js
{
  tradition: 'tai_chi',              // key into TRADITIONS; omitted = generic calisthenics (never gated)
  origin: { region: 'East Asia', countries: ['CN'] },
  nativeName: { text: '云手', romanised: 'yún shǒu', lang: 'zh-Hans', alt: [{ text: '雲手', lang: 'zh-Hant' }] }, // show FIRST (§5.1.2)
  aka: ['Wave hands like clouds'],   // search aliases
  planes: ['frontal', 'transverse'], // 'sagittal' | 'frontal' | 'transverse'
  breath: { pattern: 'natural' } | { in: 'arms rise', out: 'arms lower' },
  tempo: { secPerRep: 8 } | { countsPerSec: 2 },
  evidence: 'A' | 'B' | 'C' | 'D',   // world-movement.md grades; copy must not claim more
  attribution: 'Simplified 24-form (1956), Yang style', // must be shown for cultural: 'attributed'
  cultural: 'open' | 'attributed' | 'restricted',
  stanceLevels: ['high', 'medium', 'low'],
  sources: [{ label, url, kind: 'official' | 'reference' | 'research' }],
  verified: null | { date: 'YYYY-MM-DD', notes },  // set ONLY by the separate fact-check pass
  flowOnly: true,                    // a step used inside a flow; never shown, planned or swapped on its own (promoted in v1.3)
  adaptation: true,                  // Kitaeru's own substitute, not part of the tradition (e.g. rt_heel_raise); say so in the UI
}
```
`review` / `reviewedBy` are retired (no paid reviewers): accuracy is gated by sources instead.

### Flows (`mode: 'flow'`)

```js
{ id: 'baduanjin_sequence', mode: 'flow', family: 'flow_sequence', category: 'flow', anim: 'baduanjin_hold_up_sky', // anim = first step (fallback)
  sequence: [ { move: 'baduanjin_hold_up_sky', reps: 6, cue, breath? },            // move = exercise id
              { move: 'baduanjin_draw_bow', reps: 6, side: 'alternate' },          // 'alternate' = total reps alternating; 'both' = reps per side
              { move: null, anim: 'baduanjin_ready', sec: 10, cue } ,             // inline pause / transition
              { move: 'rt_stretch_up', reps: 2, sec: 10 } ],                       // sec = fixed length (count-based flows)
  variants: { short: { repsScale: 4/6 }, lowImpact: { replace: { rt_two_foot_hops: 'rt_heel_raise' } } },
  progression: { stages: [ { variant, stance, support: 'chair'|'free'|'soft_gaze', tempoScale } ] } | null,
  estSec }                                                                          // computed at load when omitted
```
- At load, a flow's `muscles`, `stress` and `impact` become the union of its steps, and each step gets a copy of its move's `stress` and `impact`.
- Helpers in `exercises.js`: `flowSeconds(ex, { variant, skip, tempoScale })` and `flowSteps(flowId, item.flow)`. The second returns the resolved steps for a player, as `[{ ...step, move, exercise, reps, sec }]`.
- A log item for a flow is `{ exerciseId, family, sets: [{ sec, done, completedSteps? }], rating, pain? }`.

### Traditions (`js/data/traditions.js`)

`TRADITIONS[id] = { name, nativeName, region, countries, era, card, principles, trains, evidence: [{ grade, claim, cite, url }], safety, attribution, sensitivity, sources, verified, learnMore, families, since }`. The v1.2 entries are `radio_taiso` (user-facing name "Morning Taisō"), `tai_chi`, `baduanjin`, `pehlwani`, and `rotation`. `rotation` is `{ kind: 'explainer', gate: false }`: an explainer card, not a tradition.

- Cards show a **"Sources"** line. They never say "Reviewed by".
- **Radio Taisō naming:** the name appears only in `RADIO_TAISO_ATTRIBUTION`, used as `attribution` on the tradition and its items. Blank that one string to remove it. Ids (`radio_taiso_1`, `rt_*`) are internal. Source citations still name their own pages. The music is never used.
- `EXCLUDED_TRADITIONS` lists the world-movement.md §5.3 exclusions (haka, hula, rituals, charkh, headstands…). They are never visible, not even in preview.

### Accuracy gate (hard requirement)

An exercise with a `tradition` is **invisible** unless its tradition's `verified` **and** its own `verified` are set. It doesn't appear in `EXERCISES`, `byId`, `FAMILIES`, plans, Quick, swaps (`isAvailable`) or Morning Taisō. An unknown tradition id fails closed. Generic items with no `tradition`, such as the rotation and anti-rotation families, are never gated.
- Dev override: `?preview=traditions` in the URL. Tests use `setTraditionPreview(on)`.
- `ALL_EXERCISES` / `ALL_BY_ID` / `ALL_FAMILIES` include hidden items. Use them only to resolve flow steps, and never to list or plan.
- The planner applies the same gate in its own availability rule, so passing `ALL_EXERCISES` plans exactly what passing `EXERCISES` would.

### Animation gate (`js/data/animated.js`)

An exercise is only listed in the library, planned, offered in Quick or offered as a swap when it **has an animation**: a v1 pose in `js/anim/poses.js` or a v2 clip. Otherwise it would render as a standing-figure fallback. The rule applies to generic items too (the rotation and anti-rotation families stay hidden until their clips exist). `?preview=traditions` turns it off so development can see everything.
```js
export function hasAnimation(animId)            // v1 pose, or an id added with registerAnimationIds
export function exerciseAnimated(ex, ALL_BY_ID)  // its `anim` (default id); a flow needs every step and every variant replacement
export function registerAnimationIds(ids)       // plug in the anim v2 list: import { V2_IDS } from '../anim/v2/ids.js'; registerAnimationIds(V2_IDS);
export function clearRegisteredAnimationIds()   // tests only
```
`isVisible` (and so `EXERCISES`, `byId`, `FAMILIES`) and the planner's availability rule both apply it, alongside the accuracy gate. It never bypasses the accuracy gate.

**Minimum bar for setting `verified`.** The fact-check is done by a different agent from the one who wrote the content; content is never self-verified.
1. Each move has at least **2 independent sources**. At least one must be **official or primary** where one exists. Examples:
   - Baduanjin: the Chinese Health Qigong Association / General Administration of Sport standard.
   - Radio Taisō No. 1 movement order: the Japan Post Insurance (Kampo) illustrated guide.
   - Tai Chi: established 24-form references.
   - Dand and baithak: reputable references (e.g. Alter, *The Wrestler's Body*).
2. Each **native name** (script and romanisation) is checked against at least 2 sources.
3. **No claim goes beyond the evidence grade.** A: specific claims are allowed. B: hedged ("may improve"). C: describe what it trains. D: no health outcomes. A tradition's own explanations are framed as the tradition's ("traditionally said to…").
4. `verified = { date, notes }` records who checked it and what they fixed.

### Planner additions (`js/engine/planner.js`)

- **Goal `balance`.** It isn't a loading goal: loading falls back to the next goal, or to health. As primary goal it adds a light flow day (days ≥ 3).
- **Balance block** (`kind: 'balance'`, world-movement.md §4.6.1). It runs on ≥ 2 hard sessions a week (3 when balance is the primary goal) for age ≥ 55 or the `balance` goal, and lasts 5–10 min (3 min minimum under 25-min sessions; none under 15 min). Content is Tai Chi (`taichi_short_flow` + `taichi_golden_rooster`) when visible, otherwise generic single-leg and anti-rotation work with a support note. It replaces the in-main balance item in that session.
- **Rotation / anti-rotation** are progression families (`PROGRESSION_FAMILIES`), with `initialLevels` entries.
  - One rotation drill at levels 1–3 in every warm-up.
  - Full body C's essential core slot is anti-rotation.
  - Optional anti-rotation slots in B, C, lower, pull and legs; rotation level ≥ 4 in A, upper and push.
- **Flows as items.** `holdSec: [estSec, estSec]` (one pass) plus `flow: FlowRx`:
  `FlowRx = { variant, stage, stance, support, tempoScale, skip: [moveId], replace: { moveId: moveId }, estSec }`.
  - Light days: a `kind: 'flow'` block. Tai Chi comes first for 55+ or the balance goal, otherwise Baduanjin. The session is named "Flow & mobility" and has `light: true`.
  - Baduanjin (short) is the actual cool-down when it fits and the primary goal is health, flexibility or balance, or the user is 55+. Otherwise it's an option.
- **Options:** `SessionOption = { id: 'morning_taiso' | 'baduanjin_cooldown', replaces: 'warmup' | 'cooldown', title, block }`. These appear only when the tradition is visible.
- **Injury rules** (world-movement.md §3.3, §4.6):
  - `lower_back`: rotation levels ≤ 2 and anti-rotation ≤ 4; no dand. Flows drop `rt_trunk_circle`, `baduanjin_touch_toes` and `baduanjin_sway_head_tail`.
  - `neck`: no `baduanjin_look_back`. Flows drop the neck pieces and cap the head-turn range.
  - `knee`: no baithak; horse stance at a high stance only; every stance flow at a high stance.
  - `wrist`: no dand and no plank_shoulder_tap.
  - Low impact: the Morning Taisō hops become heel raises.
  - 75+, or new to exercise at 65+: no standing Morning Taisō (the seated version is v1.3).
  - 65+: never a soft-gaze stage.
  - A flow with more than a third of its moves dropped is unavailable.
- **Quick foci** `flow`, `balance` and `rotation`. When no flow is visible, `flow` falls back to a mobility session with rotation openers; `availableFlows(profile, library)` lets the UI hide it.
- **Flow progression** (`applySessionLog`, world-movement.md §4.4). Two `easy` ratings in a row unlock the next stage (stance, support, tempo, or the full version); `hard` keeps the stage; pain above 3 steps back. The stage is stored in `levels.flowStages`, and changes are reported as `{ family, from: flowId, to: flowId, flow: true, fromStage, toStage, up, reason }`.
- **Morning Taisō:** `generateMorningTaiso(profile|null, levels|null, library)` returns a session with `id: 'T'` (`MORNING_TAISO_SESSION_ID`), or `null` when hidden or unsuitable. A `'T'` log **keeps the day streak alive but never counts toward the weekly target**. It also doesn't hide a training gap for re-entry, and doesn't make the user a non-first-timer.

## Store (`js/store.js`)

The key is `kitaeru.v1` in localStorage:
```js
{ version: 1, profile, levels, plan: { startDate: 'YYYY-MM-DD' }, logs: SessionLog[], bodyweights: [{date, kg}], settings: { units, sound: true, theme: 'auto' } }
```
The current week index is `floor((today - startDate) / 7 days)`.

## Design language

The style is Japanese minimal: sumi ink, washi paper and a vermilion seal accent. Use the brand mark 鍛える.
- Light: bg `#F5F1E8` (washi), surface `#FFFDF7`, ink `#1C1B19`, muted `#6B665C`, line `#E3DCCB`, accent `#C8372D` (shu vermilion), accent-2 `#D9A441` (kin gold), ok `#3F7D58`
- Dark: bg `#121110`, surface `#1C1A18`, ink `#EFEAE0`, muted `#A39D90`, line `#2E2B27`, accent `#E0503F`, accent-2 `#E3B45A`
- Type: system UI sans for body. Headings can use `"Noto Serif JP", Georgia, serif` from Google Fonts, with the system serif as fallback when offline.
- The layout is mobile-first (360px+) with a bottom tab bar: Today · Plan · Progress · Library · Me. Tap targets must be at least 44px.
