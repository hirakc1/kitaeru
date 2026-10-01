# Animation v3: real-motion pilot (5 clips)

Date: 2026-10-01. Status: built, **not deployed**, review page only. Nothing in the app, `sw.js` or the planner changed.

## How to view

1. From the project root: `python -m http.server 8771`
2. Open `http://localhost:8771/anim-review.html`
3. Show menu: **Real-motion pilot clips** (this also sets Figure to **Real motion vs current (pilot)**), or pick that Figure yourself and use the **Real-motion pilot** chip row at the top of the list.
4. Each pilot card shows **Real motion (pilot)** on the left and **Current** on the right. Play/pause and the scrubber drive both from one clock (same phase of the cycle). Female/Male switch works for both.
5. Under the players: the take used, notes, the clean-up numbers, and three buttons (Real motion looks better / About the same / Current looks better). These go into **Export notes** under "Real-motion pilot".
6. Surya Namaskar: the card compares a whole round; below it a **step-by-step strip** (green = real motion, amber = close, faded = no take) links to each step card (`sn_*`), where real and current steps play side by side. Non-pilot clips in this Figure show the current body with a short note.

Credit line is on the page (CMU acknowledgement + HDM05 CC BY-SA 3.0).

## Which take feeds each clip

| App clip | Source (times in the take) | Retimed to | Notes |
|---|---|---|---|
| `bodyweight_squat` | HDM05 squat3Reps, actor tr, take 012, 2.05-3.97 s (2nd rep) | 3.8 s (v2: 0.5 top, 2.0 down, 0.3 bottom, 1.0 up), loop | Deep squat, heels down, arms held forward the whole rep (the performer's style; v2 lets them hang at the top). **CC BY-SA 3.0.** |
| `split_squat` (not reverse_lunge) | CMU 144_17 "Lunges", 6.585-7.56 s, right foot forward; left side = mirror | 7.6 s (3.8 per side), side change dips through the paper like v2 | 144_17 is *forward* lunges. Only the part with both feet planted is used, which is a split-squat rep; the step in/out is cut. Not used for `reverse_lunge` (the step direction is opposite). Honest limits: the "top" is the moment the front foot lands, so the legs are still bent and the trunk leans forward a little; the right arm reaches forward as a counter-balance; the 0.45 s natural descent is slowed about 4x to the app's 2 s. |
| `jumping_jack` | HDM05 jumpingJack3Reps, actor tr, take 012, 1.45-2.61 s (one jack) | 1.16 s (natural speed was 1.16 s), loop | Real airborne jack, arms over head. **CC BY-SA 3.0.** |
| `vrikshasana` | CMU 113_29, 0.3-18.3 s (right foot up, then left), arms from CMU 144_30 at 3.9 s | 21.8 s (10.9 per side), loop | Foot placed high on the inner thigh with a hand and a real sideways lean, then a natural balance sway. The take holds the arms out to the sides, so the **arms are a composite**: 144_30's palms-together pose (another performer), held relative to this performer's chest, blended in after she is upright again and out before the foot comes down. |
| `surya_namaskar` (whole round) | CMU 144_30, 3.35-21.3 s + 23.1-24.06 s (the chair pose is cut) | 31 s, one round | **A different variant**: Ashtanga-style jump back to plank, low push-up, upward dog, dog, jump forward, half lift. Shown for judging motion quality, not the sequence. |
| `sn_prayer` | 144_30, 3.30-4.01 s | 5 s (arrival 2.0) | Exact. |
| `sn_raised_arms` | 144_30, 4.02-5.56 s | 5 s | Hands sweep down and out first (swan arms); the back arches only slightly. |
| `sn_forward_fold` | 144_30, 5.52-8.0 s | 5 s | Palms stay ~10 cm off the floor by the shins (cue: palms beside the feet). |
| `sn_cobra` | 144_30, 11.95-13.95 s | 5 s | **Close**: an upward dog (straight arms) from a low push-up, not a low cobra from knees-chest-chin. |
| `sn_dog` | 144_30, 13.95-16.1 s | 5 s | Exact. |
| `sn_lunge_in_r` | CMU 113_28, 8.5-11.0 s, blended into 18.75 s | 5 s | Different performer. The back-knee lowering is a blend between two frames of the take. The head tips back quite far (cue: look up gently). |
| `sn_lunge_in_l` | CMU 113_28, 25.0-27.2 s, blended into 33.5 s | 5 s | As above, other side. |
| `sn_rise` | 144_30, 20.45-21.3 s, blended into 23.12 s | 5 s | The take bends into a chair pose there; cut. |
| `sn_stand` | 144_30, 23.12-24.06 s | 5 s | Exact. |

**No take (still current animation):** `sn_lunge_r`, `sn_lunge_l` (step back from the fold into a lunge), `sn_plank`, `sn_plank_l` (only a jump-back plank exists), `sn_knees_chest` (144_30 lowers in one line), `sn_fold_in_l`, `sn_fold_in_r` (no step forward from a lunge into the fold). So a full app-order Surya Namaskar from mocap is **not possible** with these takes: 9 of the 16 step clips have real motion.

Why HDM05 for squat and jack: CMU 13_29 (the CMU squat/jack take) is not in the downloaded set, and fetching it needed a download I did not make without your explicit go-ahead. HDM05 was already downloaded, has heels-down squats (actor tr) and clean jacks, and the founder accepted its ShareAlike terms. Swapping in CMU 13_29 later is a one-line change in `mocap_pilot.py`.

## Pipeline (new: `assets/v3/pipeline/mocap.py`, `mocap_pilot.py`, `mocap_preview.py`)

The old scripts (`cmu_to_landmarks.py`, `landmarks_to_clip.py`, `check_clip.py`) target the Quaternius rig (other bone names, leaf bones) and only use 23 landmarks; they are untouched. The new retarget reads the ASF/AMC skeleton directly (reusing `cmu_to_landmarks.parse_asf/parse_amc`) and drives the MakeHuman game-engine rig in `human_f.glb` / `human_m.glb` (identity rest rotations, so world rotation = pose):

1. Vectorised forward kinematics, 6 Hz zero-phase low-pass, resampled to 60 fps, facing +Z.
2. Scaled by leg length. **Knee correction**: the source skeleton fits stand with 28-43 deg of knee flexion (CMU 113: 37-43, HDM05 tr: 28-30, CMU 144: 1-18). Flexion is remapped so the take's standing flexion becomes 4 deg while deep flexion (squat, lunge) is unchanged; each planted leg's hip rises to suit.
3. Trunk, neck, head, clavicles and feet: rotation relative to a quiet standing frame of the same take (performer's standing posture = body's rest). Arms: bone direction + the humerus's own twist axis; elbow hinge; 60 % of pronation in the forearm. Legs: two-bone IK from this body's hip along the source hip-to-ankle vector.
4. Edit: time windows, monotone-cubic time warp to the app tempo, cross-fades, loop seam cross-fade, mirror.
5. Clean-up on the body: foot lock (ball of the foot pinned, flat feet laid flat, floor clamp from the skinned sole), hand lock (palms pinned flat on the floor; where this body's shorter trunk and arms cannot reach, the body moves up to 12 cm towards the hands and the palm spot moves nearer), prayer palms closed, flesh-on-floor lift, finger shapes (relaxed / palm / prayer) as a small schedule in the clip.
6. Encode: kclip v2 (`rig: makehuman-ge`), int16 quaternions for the 20 driven bones + pelvis position, finger shapes as metadata. 20-30 fps. All 28 files total 0.92 MB raw (8-110 KB each).

Rebuild: `python assets/v3/pipeline/mocap_pilot.py <dir with 144.asf, 144_17/144_30.amc, 113.asf, 113_28/29.amc> <HDM05_cut_amc dir>` (about 50 s per body). `--sheets <dir>` writes contact sheets.

Player: `js/anim/v3/mocap-player.js` (`createMocapPlayer`), a sibling of `body-player.js`. It reuses `stage.js` (looks, muscles, skeleton inside, contact shadow, floor mat, theme updates), frames with the v2 clip's camera like `body-player.js`, has play/pause/seek(0..1)/destroy, and a shared-renderer thumbnail path for sizes under 160 px. It is only imported dynamically by `anim-review.html`; nothing in the app imports it and `sw.js` is unchanged.

## QA numbers (female / male)

Foot slide = p95 horizontal speed of a sole point while it is within 1 cm of the floor. Sole/flesh = lowest point (negative = below the floor). Seam = rotation jump across the loop vs the clip's own p95 frame-to-frame step.

| Clip | Foot slide cm/s | Lowest sole cm | Lowest flesh cm | Loop seam | Hands |
|---|---|---|---|---|---|
| bodyweight_squat | 1.1 / 9.7 | 0.4 | 7.6 / 8.0 | 1.3 deg (typical step 6-8), pelvis 0.2 cm | — |
| split_squat | 2.3 / 2.6 | 0.4 | 4.6 / 4.1 | side change and wrap dip through the paper (as v2) | — |
| jumping_jack | n/a (contacts under 4 frames) / 22.6 | 0.4 | 10-11 | 2.9 deg (typical 20.7), pelvis 0.3 cm | — |
| vrikshasana | 3.2 / 3.9 | 0.2 | 11 | 0.5 deg (typical 16), pelvis 0.0-0.1 cm | — |
| surya_namaskar round | 6.5 / 7.6 | 0.2 | -1.2 / -0.1 | restart dips | palms moved ≤16 cm, unreachable ≤1.7 / 3.2 cm |
| sn_prayer, raised_arms, forward_fold, rise, stand | 0.0-0.2 | 0.4-0.9 | 8.4-8.9 | restart dips | — |
| sn_cobra | 5.1 / 6.0 | 0.4 | -1.2 / -0.2 | | on floor |
| sn_dog | 10.5 / 21.1 | 0.4 | 1.5 | | palms moved ≤16.5 cm, unreachable ≤1.8 cm |
| sn_lunge_in_r | 48.8 / 49.3 | 0.4 | 0.4 / 0.6 | | palm 0.5 cm into the floor; unreachable ≤3.5 cm |
| sn_lunge_in_l | 8.2 / 9.8 | 0.4 | 1.6 / 1.8 | | unreachable ≤4.3 cm |

Reading them: the high numbers are short events, not continuous skating. Squat (m): the heel touches/leaves the floor for 1-2 frames at the bottom. Jack (m): landing frames. `sn_lunge_in_r`: the back foot's toes pivot and shift about 10 cm over 0.4 s while the front foot steps through (the source foot also moves ~6 cm). Flesh 1 cm below the floor in cobra/upward dog is the thighs (no opaque floor; reads as contact).

## What looks good, what does not (from rendered contact sheets of both bodies)

Good: squat (deep, heels down, natural weight shift), jumping jack (real flight and arm swing), downward dog (deep, heels toward the floor; the current dog is shallow), upward dog, forward fold, prayer/arms-up/stand transitions, tree balance sway and the real hand-assisted foot placement.

Weaker:
- **Split squat**: the cut forward lunge gives a top position with bent legs and a forward lean, a reaching right arm, and a slowed-down feel. The weakest of the five; a real split-squat take (UI-PRMD m03, or filming) would be better.
- **Tree**: the arms are a composite (see above); the lifted thigh is nearly horizontal with the foot at the groin (the full pose, quite high).
- **Floor work with hands**: this body's trunk is shorter relative to its legs than the CMU performers', so palms on the floor needed the body shifted towards the hands (up to 7.6 cm) and/or the palm spot moved (up to 16 cm); 2-4 cm of reach is still missing at a few frames (elbows straight, palm just above the mat).
- **Lunges (113_28)**: head thrown back; different performer from the rest of the Surya Namaskar.
- Hands have no captured fingers (shapes are set: relaxed, flat palm, prayer).

## Files

Added: `assets/v3/mocap/*.kclip.json` (14 clips x 2 bodies) and `assets/v3/mocap/index.json`; `assets/v3/pipeline/mocap.py`, `mocap_pilot.py`, `mocap_preview.py`; `js/anim/v3/mocap-player.js`; this doc.
Changed: `anim-review.html` (pilot Figure, filter, chips, side-by-side synced players, steps strip, pilot verdict in the export, credit line); `assets/v3/LICENSES.md` (pilot section: every take, terms, CMU acknowledgement, HDM05 CC BY-SA 3.0).
Not changed: app code, `sw.js`, planner. `tests/planner.test.html`: 149492 passed, 0 failed.
