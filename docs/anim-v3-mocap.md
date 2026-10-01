# Animation v3: real motion in the app

Date: 2026-10-01. Status: built and tested, **not deployed** (the PM reviews and deploys). Supersedes the pilot notes in `docs/anim-v3-mocap-pilot.md` (kept for the history).

With Me → Animation → Human body (the default), every clip below now plays **real motion capture**; every other clip plays the v2 motion on the same body, as before. Nothing changes for the Classic skeleton.

## 1. The clips

| App clip | Take (time in the take) | Frames | fps | Licence | What was edited |
|---|---|---|---|---|---|
| `bodyweight_squat` | HDM05 squat3Reps tr 012, 2.05-4.15 s (2nd rep) | 114 | 30 | CC BY-SA 3.0 | Retimed to the v2 tempo (3.8 s); now ends standing still (the pilot cut mid-rise); heels pinned flat all cycle; relaxed hands |
| `jumping_jack` | HDM05 jumpingJack3Reps tr 012, 1.73-2.90 s | 35 | 30 | CC BY-SA 3.0 | Cut at the top of a hop (the pilot cut at a landing: a fall joined straight to a rise) |
| `marching_in_place` **new** | HDM05 walkOnPlace bd 002, 0.83-2.29 s (legs, trunk, head) + mm 011, 0.71-1.98 s (arms) | 38 | 30 | CC BY-SA 3.0 | Knees to hip height (bd) with a real arm swing (mm; bd's arms hardly move), matched step for step, right knee up = left arm forward; arms kept clear of the lifted thigh |
| `breath_paced_walk` **new** | HDM05 walkOnPlace mm 011, 0.71-1.98 s | 82 | 30 | CC BY-SA 3.0 | Two steps from mid-walk, played twice per cycle (4 steps = the v2 clip's 4 counts), 1.34 s per two steps |
| `vrikshasana` | CMU 113_29, 0.3-18.3 s; arms from CMU 144_30 at 3.9 s | 436 | 20 | CMU | As the pilot; the arm composite is now carried by IK (no forearm wringing at the hand-over) and the prayer hands are built (both sides) |
| `sn_prayer` | CMU 144_30, 3.30-4.01 s | 100 | 20 | CMU | Prayer hands built; the performer's stoop eased (stand tall) |
| `sn_raised_arms` | CMU 144_30, 4.02-5.56 s | 100 | 20 | CMU | — |
| `sn_forward_fold` | CMU 144_30, 5.52-8.00 s | 150 | 30 | CMU | **Fixed**: palms now reach the floor beside / just ahead of the feet (the take stops ~10 cm short), the knees bending a little more |
| `sn_dog` | CMU 144_30, 13.95-16.05 s | 100 | 20 | CMU | Starts from the take's upward dog; in the flow it blends in from the app's cobra |
| `sn_lunge_in_r` | CMU 113_28, 8.5-11.0 s, then 18.75 s | 100 | 20 | CMU | **Fixed**: head brought from 66° extension to a gentle look up (≤ 18°); palms flat beside the front foot (the take: fingertips) |
| `sn_lunge_in_l` | CMU 113_28, 25.0-27.2 s, then 33.5 s | 100 | 20 | CMU | As above, and the back knee lowered to the floor (the take hovers it 3-6 cm up) |
| `sn_rise` | CMU 144_30, 20.45-21.3 s, then 23.12 s | 100 | 20 | CMU | Passes through a short half lift (hands slide up to the knees) before the arms sweep up; the chair pose is cut |
| `sn_stand` | CMU 144_30, 23.12-24.06 s | 100 | 20 | CMU | — |

13 clip ids × 2 bodies = 26 files, **585 KB** in total (8-78 KB each; `vrikshasana` 78 KB, the rest ≤ 30 KB; ~293 KB per body).

### Left out (the clip stays on the v2 motion)

| Clip | Why |
|---|---|
| `surya_namaskar` (whole round) | 144_30 is the Ashtanga jump-back round (no lunges, no knees-chest-chin). The app's flow plays the `sn_*` steps, real motion where a step has it. |
| `sn_cobra`, `cobra_stretch` | 144_30 has an upward dog (straight arms, thighs up), not a low cobra with the hips down. |
| `split_squat` | Pilot weakness confirmed: 144_17 is a forward lunge (bent legs and a forward lean at the top, a reaching arm, a 4x slowed descent). No real split-squat take. |
| `taichi_commencement` | Built (CMU 12_04 with an added sink and palms turned down), then dropped: the performer draws the hands in to the chest, elbows out, before pressing down; not the cue. The builder stays in `mocap_clips.py`. |
| `trikonasana` | 113_29 goes to the full pose (hand at the ankle / floor); the app teaches the hand on the shin. |
| `virabhadrasana_2` | 113_29 only has the arms-out wide stance, not Warrior II. |
| `arm_circles` | HDM05 rotateArms are fast windmills with a knee bounce, not small circles out to the sides. |
| `plank` | The app's plank is on the forearms. |
| `reverse_lunge`, `high_knees`, `standing_hamstring_stretch`, `hip_flexor_stretch`, `leg_swings`, `squat_jump`, `box_squat`, `deep_squat_hold` | Wrong variant in the takes (forward lunges; jogging; no step; hands down; kicks; small hops; full sit; arms forward). |
| `sn_lunge_r/l`, `sn_plank(_l)`, `sn_knees_chest`, `sn_fold_in_l/r` | No take of these transitions. |

The same list is in `assets/v3/mocap/index.json` (`excluded`) and on the review page.

## 2. Surya Namaskar jerkiness: what it was, and the numbers

Measured with `assets/v3/pipeline/mocap_jerk.py` on the encoded clips (exactly what the player shows), and with a stage-by-stage run of the pipeline. A **pop** is a joint (hands, elbows, knees, feet, head, chest, pelvis) leaving its smooth path (a 5-frame quadratic fit) by more than 0.9 cm in one frame.

Causes found (in order of size):
1. **Knee and elbow flicks in the clean-up IK** (foot lock, hand lock, floor lift): near a straight leg or arm, two-bone IK is infinitely sensitive (a millimetre of hip sway moves the knee by centimetres), and the contact weights switched on and off within 3 frames. Fixed with **soft IK** (the reach eases into full extension), contact weights eased **inside** each contact (a foot is let go before it moves fast), the bend direction biased by the bone's own forward axis, and every clean-up correction **low-passed** as a rotation (`smooth_fix`, 3.5 Hz) before it is applied.
2. **Forearm / hand spins**: the source thumb marker often lies almost along the hand, so the hand's twist flipped; the upper arm's twist also spun half a turn wherever the elbow was straight (the solver cannot see it). Fixed: the forearm twist from the hand segment, unwrapped; the upper-arm / thigh twist taken from the elbow / knee bend where it is bent and carried smoothly across straight spells; prayer and floor hands are built rather than measured.
3. **Joins**: the hold after each arrival was a separate time warp (a speed jump) and cross-fades blended world rotations (a hand could swing the long way round). Now one monotone warp per step, cross-fades in each bone's local rotation, loops closed by spreading the seam error over the whole cycle (velocity stays continuous), the jack cut at a hop top.
4. **Contacts that popped**: the floor lift switched legs on/off per frame; a stepping foot dragged through the floor (113_28); fingers went up to 13 cm through the floor while palms landed. Now eased, a swinging foot clears the floor, fingers turn flat / lift.

| Clip | Pops before (f / m) | after (f / m) | Worst pop cm before → after (f) | Peak bone ang. accel. deg/s² before → after (f) |
|---|---|---|---|---|
| surya_namaskar (round) | 59 / 74 | left out | 7.5 | 70 198 |
| sn_dog | 15 / 20 | 0 / 0 | 4.25 → 0.34 | 57 805 → 4 659 |
| sn_lunge_in_r | 16 / 18 | 0 / 0 | 5.96 → 0.45 | 15 687 → 7 034 |
| sn_lunge_in_l | 11 / 18 | 0 / 0 | 4.31 → 0.61 | 16 280 → 5 257 |
| sn_forward_fold | 0 / 0 | 0 / 0 | 0.59 → 0.63 (palms now reach the floor) | 58 839 → 11 349 |
| sn_prayer, raised_arms, rise, stand | 0 | 0 | ≤ 0.54 → ≤ 0.53 | rise 32 292 → 1 096; prayer 10 642 → 1 249 |
| sn_cobra | 8 / 9 | left out | 7.5 | 33 522 |
| vrikshasana | 23 / 26 | 0 / 0 | 6.61 → 0.43 | 107 028 → 6 486 |
| bodyweight_squat | 1 / 2 | 0 / 0 | 1.10 → 0.27 | 15 085 → 4 913 |
| jumping_jack | 12 / 13 | 0 / 0 | 2.70 → 0.49 | 31 589 → 10 361 |
| marching_in_place (new) | — | 2 / 0 | 0.92 | 12 836 |
| breath_paced_walk (new) | — | 0 / 0 | 0.38 | 6 133 |

(The 2 marching pops for the female body are 0.92 cm at the loop seam's knee, just over the 0.9 cm line.)

**Step boundaries in the flow.** The app plays a flow as one clip per step and blends from the last pose. A blend into, out of or between real-motion steps is now done in the rig (each bone's local rotation and the pelvis eased from the last pose), with: feet and hands that rest on the floor in both poses kept on it (a straight path, a small lift if they move: a step), the knee / elbow bending the way it did at both ends (never flipping side mid-blend), the IK eased out over the last quarter, each bone's quaternion kept in one hemisphere, and the pose blended from continuing its own motion for ~0.15 s (a step that starts while the last is still moving does not stop dead). Measured over a whole round in the browser (largest acceleration of trunk, head, arms, legs, cm per frame² at 30 fps, while each step blends in): every blend is within the step clip's own acceleration (e.g. fold_in_r 1.9 vs the clip's 4.3; stand 0.6 vs 0.4; the worst was 8.6 vs 4.3 before the hand planting). Two performers (144 and 113) meet at dog → lunge_in and lunge_in → fold_in (v2): both blend inside the clips' own acceleration.

Found on the way (fixed): the v2 bridge twisted the front thigh of a low lunge half a turn (kneecap facing the floor) because v2's femur frame turns over when the hip flexes past 90°; `retarget.js` now takes the kneecap's side from the knee's bend where they disagree. Found, **not fixed** (v2 motion, out of scope): `sn_lunge_r` / `sn_lunge_l` (v2) have a foot that jumps ~18 cm in one frame as it steps back (shown and clip alike, so it is in the v2 clip itself, not in a blend). Worth a look by whoever owns the v2 clips: it is a likely part of the "few jerky parts" in a full round.

## 3. How the app plays it

Files: `js/anim/v3/mocap.js` (fetch, decode, sampler, FK; new), `js/anim/v3/mocap-index.js` (the ids + licences; written by the pipeline), `js/anim/v3/body-player.js` (plays either motion), `js/anim/skeleton.js` (loads it), `js/anim/v3/stage.js` (no bands without a v2 skeleton), `js/anim/v3/retarget.js` (lunge thigh fix), `sw.js`, `deploy.py`, `js/ui/me.js` (credits).

- **Choice.** `createSkeletonPlayer` with figure 'human' → `loadV3(id, sex)` now also calls `ensureMotion(id, sex)`: if `MOCAP_CLIPS` has the id, the clip file is fetched and decoded once per body and session (never rejects). `createBodyPlayer.setAnim` then plays the real clip if it is decoded, else the v2 bridge. `opts.mocap: false` forces the v2 motion (the review page's "Current"). `player.motion` says 'mocap' / 'bridge'.
- **Fallback.** A failed fetch or decode marks the clip failed for the session and the v2 motion plays: no error, no blank (tested).
- **Same contract.** play / pause / seek / setAnim / destroy / setPace / setTrail / setBreath / renderer / ready / look / stats are unchanged. Looks and muscles: the stage is the same, so solid / x-ray, the exercise's muscles and `showsMuscles` / `bodyLook` work as before. Pace (counts) and timed holds (fit) use the real clip's period with the v2 clip's `counts` (the real clips are cut to the v2 tempo and count). One-sided moves: the clips contain both sides (tree: right then left, as v2). The camera, floor and props come from the v2 clip; a clip in a shared frame (the Surya Namaskar steps) keeps the shared camera (framed 8 % wider for every step of that frame, real or not, so the camera never jumps between steps); a clip of its own is framed around both motions. The real clip is placed where the v2 clip's first pose has its feet, so a flow step starts where the last one ended.
- **Trail and breath ring.** The trail is sampled from the real clip on the body (the v2 clip's trail point names); the breath ring follows the v2 clip's breath at the same point of the cycle. The diamond push-up's detail inset is not drawn for real clips (none has one).
- **Thumbnails** (size < 160) use the same shared renderer and 2D canvases; **lost-context recovery** (the LOSS_* logic in skeleton.js) is unchanged: the rebuilt player finds the decoded clip in memory.
- **Lazy.** No extra bytes on first load: `skeleton.js` imports nothing new; `mocap.js` and `mocap-index.js` (~9 KB together) come with `body-player.js` (lazy, precached in SHELL like the other v3 modules). A flow step prefetches the other real clips of its shared frame (all the Surya Namaskar steps) so the next step never waits.
- **Offline.** `sw.js` keeps clip files in their own cache, `kitaeru-mocap-<MOCAP_ID>`, cache-first, filled the first time each clip is shown; `deploy.py` writes `MOCAP_ID` (a hash of every clip, like `ASSETS_ID`), so an app update does not re-download clips unless a clip changed. Not precached: ~293 KB per body, and most people see only a few clips of one body.

## 4. Review page

`anim-review.html`, Figure **Real motion vs current** (or Show → **Real-motion clips**): every clip with real motion shows real (left) and current (right) on one clock (play, pause, scrub), with its take, notes and clean-up numbers. **Surya Namaskar** now plays the **whole flow as the app does** (24 steps, one breath each, blending), real motion where a step has it vs the current animation throughout; the step strip links to each step card. Excluded clips say why. The Human body / Both figures show the current animation (`mocap: false`). `js/anim/v3/mocap-player.js` (the pilot's review-only player) is gone.

`anim-v3.html?phases=id,id&n=8&body=f&look=solid` shows each clip from its own camera at n points of its cycle (real motion; `&mocap=0` the v2 motion); `assets/v3/pipeline/mocap_sheets.py` turns that into PNG contact sheets (and cropped `.z.png`).

## 5. Rebuild and QA

```
python assets/v3/pipeline/mocap_clips.py <cmu dir> <HDM05_cut_amc dir> --cache <dir>     # both bodies, ~1 min each
python assets/v3/pipeline/mocap_jerk.py [ids] --body f|m                                  # pops, accelerations, seams
python assets/v3/pipeline/mocap_sheets.py http://localhost:8771 <out> <ids> --look solid --body m
```
Takes: CMU 144_30, 113_28, 113_29 (+ asf) from mocap.cs.cmu.edu; HDM05 cut library classes squat3Reps, jumpingJack3Reps, walkOnPlace4StepsRStart (unpacked from `HDM05_cut_amc.zip`). The local copies are in `C:\Users\hirak\KitaeruTools\mocap\` (cmu, hdm05/cut).

QA per clip (both bodies, in `index.json`): lowest sole 0.2 cm everywhere (planted feet on the floor, not floating or sunk; 0.6 cm in `sn_lunge_in_r` f); lowest flesh ≥ −0.4 cm (the lowered back knee resting on the mat); palms on the floor at 0.9-1.1 cm (the palm's centre: hand and first finger joints at the floor, never under it; the player lays the fingers flat when a palm is down); foot slide p95 0-9 cm/s for standing clips (the higher numbers, 20-30 cm/s, are feet lifting and landing in the walks, marches and jacks, and the stepping foot in the lunges). Contact sheets of every clip, both bodies, were checked by eye (knees, feet, hands, heads, arms).

Tests (`tests/planner.test.html`, headless Chrome): **149,513 passed, 0 failed** (149,492 before + 21 new: manifest and licences, not precached / own cache, no static import at first load, every clip decodes on both bodies with the app clip's cycle, real motion chosen, `mocap: false`, no clip → v2, a flow real → real → v2 → v2 → real blending without NaN or a pop, count kept, trail and breath ring, timed hold, solid look, destroy, thumbnails real and v2 sharing one renderer, a failed file falling back silently).

## 6. Open points

- The CMU acknowledgement and the HDM05 attribution are now in Me → About → Motion credits; the four HDM05-derived files are CC BY-SA 3.0 (see `assets/v3/LICENSES.md`).
- `sn_rise` includes the performer's short half lift (hands to the knees) before the arms rise; the cue does not mention it.
- `sn_prayer` keeps a little of the performer's forward lean (the stoop is eased to 40 %).
- The marching clip combines two HDM05 performers (legs bd, arms mm); the arms are swung back where they would brush the lifted thigh.
- The v2 `sn_lunge_r/l` foot jump (section 2) is the likeliest remaining jerk in a full round.
