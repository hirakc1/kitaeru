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
    category: 'strength',          // 'strength' | 'core' | 'mobility' | 'conditioning' | 'skill' | 'warmup'
    mode: 'reps',                  // 'reps' | 'hold' (hold = seconds)
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
- `warmup`: arm_circles, leg_swings, hip_circles, scapular_push_up, inchworm

`level` is only meaningful for progression families (everything except mobility, warmup and conditioning, where it is just a difficulty order).

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
Since animation v2 (batch 1), `createSkeletonPlayer` renders the Direction A anatomical plate (`js/anim/v2/plate.js`) for every id that has a clip in `js/anim/v2/clips.js`, and falls back to the v1 player otherwise. `setAnim` swaps the renderer in place. Additions (non-breaking): `seek(t)`, a `renderer` getter (`'v2'` | `'v1'` | `'ph'` while v2 loads) and `ready`, `createV1Player` (the old player), `isV2(id)` and `loadV2(id)`.
v2 is lazy: at start the app loads only `js/anim/v2/ids.js` (which ids have clips, and in which group file). The renderer (`core.js`, `anatomy.js`, `plate.js`, `clips/lib.js`) and the exercise's clip group (`clips/push|pull|legs|trunk.js`) are imported the first time a v2 exercise is shown; a blank placeholder holds the space meanwhile, and if the import fails the player falls back to v1. `sw.js` precaches all of these for offline use. New clips go in a group file and must be listed in `ids.js` (the compare page flags any mismatch).
Stepping (for conditioning and v1.2 flows): legs `{ mode: 'ik', foot: 'step' }` are placed per key by sided channels `footX` (heel x), `footZ` (heel lateral offset), `footLift`, `footTurn` (toe-out) and `footPitch` (+ heel strike about the heel, − toe-off about the ball; a rear heel also peels automatically so a leg never overstretches). A foot whose channels are equal across a phase's keys is planted and cannot slide. `clip.stepBalance` moves the root so the centre of mass sits over the feet that are down, split by the keyed axial `weight` (share on the right foot). `clip.travel` is the net displacement per cycle; the camera follows the pelvis so the loop wraps. The `swing()` helper in `clips/flow.js` builds lift-off / travel / set-down keys. Pilots: `taichi_cloud_hands` (side-steps), `taichi_brush_knee` (forward bow-stance steps). `clips/flow.js` is not precached yet; add it to `sw.js` when v1.2 ships these ids. `?anim=v1` in the URL forces v1 for A/B review. Players under 160 px use a thumbnail level of detail.
Animation extras (v2 only; v1 ignores them): options `breath` (a breathing ring synced to the clip) and `trail` (the path of the moving joint), both default `false`, plus `setBreath(on)` / `setTrail(on)`. The app turns `breath` on for `mode: 'hold'` exercises in the workout player and the library detail sheet, and `trail` on in the library detail sheet only (never mid-workout, never on thumbnails). Both follow `settings.animBreath` / `settings.animTrail` (Me → Animation extras, default on). Unilateral clips alternate sides every cycle (with a short fade at the switch), except the side plank, which stays on the left forearm facing the camera. `anim-v2-compare.html` shows v1 vs A (and QA checks) for every clip.

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
  goals: ['strength','flexibility'],     // any of: strength, muscle, endurance, flexibility, skill, health
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
  blocks: [ { kind: 'warmup'|'skill'|'main'|'conditioning'|'mobility'|'cooldown', title: 'Warm-up',
    items: [ { exerciseId, family, sets: 3, reps: [6,10] | null, holdSec: [20,30] | null, perSide: false, restSec: 90, rir: 2, notes: '' } ] } ] }
SessionLog = { id, date: 'YYYY-MM-DD', weekIndex, sessionId, durationMin, feel: 1..5 (overall effort),
  items: [ { exerciseId, family, sets: [ { reps?: number, sec?: number, done: true } ], rating: 'easy'|'good'|'hard' } ] }
```

## Quick workout (v1.1) — `js/engine/planner.js`

This is a one-off session. The user can start one with no setup at all, or with a profile.

```js
export function generateQuickSession(request, profile /* or null */, levels /* or null */, library) // -> Session (id 'Q')
request = {
  minutes: 20,                    // 5..90
  goal: 'strength',               // optional: strength | muscle | endurance | flexibility | skill | health (default 'health')
  focus: 'upper',                 // optional: full | upper | lower | core | push | pull | legs | mobility (default 'full')
  muscles: ['glutes','hamstrings'], // optional: specific muscle ids (from tapping the body map); overrides focus when present
  equipment: [], space: 'medium', lowImpact: false, // used when profile is null; profile values win otherwise
  date: 'YYYY-MM-DD'              // seed for deterministic variety (same request same day → same session)
}
```
- If there's no profile or levels, assume experience 'some', no injuries, no baseline, and levels from `initialLevels` of a default profile.
- Honour the profile's injuries, equipment and levels when present.
- A 'Q' session log counts toward the day streak and the weekly target, like any session. applySessionLog progresses the families it trained.
- The session's `name` is descriptive, e.g. "20-min Lower body · Strength" or "15-min Glutes & hamstrings".

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
