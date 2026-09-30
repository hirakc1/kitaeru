# Animation v3 pilot ("Option B"): a real human body driven by real human motion

Phase 1: prove the pipeline before anyone films. Status as of 2026-09-30: **the pipeline works end to end.**

- **Prototype:** `anim-v3-pilot.html`
- **Player:** `js/anim/v3/`
- **Assets and Python pipeline:** `assets/v3/`
- **Licences:** `assets/v3/LICENSES.md`
- **Scope:** nothing in the app itself was changed. `sw.js` does not cache any of this yet.

## 1. Summary

| Question | Answer |
|---|---|
| **Body** | Quaternius *Universal Base Characters* (free Standard version), **CC0**. 65-joint humanoid rig, about 12.6k triangles. Packed to a **414 KB GLB (246 KB gzipped)**. Male and female are both packed. |
| **Test motion** | CMU mocap subject 13, trial 29 (jumping jacks, side twists, bend over, squats), "free for all uses". Retargeted offline in Python. **Pipeline test only**. |
| **Looks** | (a) see-through body + skeleton, (b) solid stylised figure (the Taisō look), (c) see-through + highlighted muscle groups. All three work, and switch live. |
| **Recommendation** | **(b) solid for the Morning Taisō.** (c) for the Library's anatomy view. (a) as a toggle inside (c). |
| **Speed** (4× CPU throttle, same measure as the v2 player) | **v3 2.6–4.0 ms a frame vs v2 20 ms.** v3 uses 2–4 draw calls vs v2's 128. |
| **Load** | fetch 40–100 ms, parse 20–40 ms, skeleton build 35–140 ms, first frame (shader compile) 100–330 ms |
| **Video to motion** | Primary: **FreeMoCap** (MediaPipe BlazePose, CC BY 4.0 weights) with two phones filming at once, front and side. Fallback: **Epic's free MetaHuman markerless mocap** if the PC has an RTX-class GPU. Avoid everything built on SMPL, and every free cloud tier that is "non-commercial". |
| **Next for the founder** | Pick the body and the outfit. Find a performer and get a signed release. Check the PC's GPU. Print a ChArUco board. Film using §9. |

## 2. The model

### Candidates evaluated

| Candidate | Licence | Verdict |
|---|---|---|
| **Quaternius Universal Base Characters** (Standard, free) | CC0 1.0 ([pack page](https://quaternius.com/packs/universalbasecharacters.html); licence file in the zip) | **Chosen.** Rigged (UE-style skeleton: pelvis, 3 spine, neck, head, clavicles, full fingers, ball of the foot). glTF included. Clean topology, about 13k triangles. Male and female. The free version has only the "Superhero" proportions; "Regular" and "Teen" are in the paid Source version. Downloaded via itch.io's free path, no account. |
| MakeHuman 1.x export | Exports are CC0 when made with an official, unmodified MakeHuman ([licence](http://www.makehumancommunity.org/content/license.html)). Not in server/library mode, not scripted mass export. | **Best future option for realistic, adjustable proportions** (age, weight, muscle), with a "game engine" rig. Needs MakeHuman installed on a PC (desktop app, a few hundred MB). **Not installed here**, as instructed. Would slot into the same `pack_model.py` step after a glTF export. |
| Blender Studio *Human Base Meshes* | CC0 ([Blender docs](https://developer.blender.org/docs/features/asset_system/asset_bundles/human_base_meshes/)) | Realistic, but **not rigged**. Needs Blender plus rigging work. Blender is not installed. |
| three.js example humans (Xbot, Soldier, Michelle) | From Mixamo. Adobe allows use inside a project but **not redistributing the raw character or animation files** ([Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html)). A PWA serves the raw GLB publicly. | Rejected. |
| Khronos CesiumMan | CC BY 4.0, © Cesium | Allowed with attribution, but cartoonish, with a baked walk rig. Rejected on looks. |
| SMPL / SMPL-X bodies | Non-commercial research licence | Rejected. |

**Proportions.** The chosen body is athletic ("superhero"). If the founder wants an everyday body, there are two routes:

- Buy the Source version. It is not free; check the price on the pack page.
- Export from MakeHuman (free, CC0).

Either one drops into the same pipeline.

### What `pack_model.py` does (Python, numpy, Pillow)

- Keeps only the body mesh and the skin.
- Drops the eyes, eyebrows, colour textures and extra UV/colour sets.
- Stores weights as normalised uint8.
- Adds a custom `_REGION` vertex attribute: muscle-group id, highlight intensity and a garment mask.
- Embeds a 512 px garment-mask PNG, so the solid look's shorts and top have crisp edges.

**Result:** `body_m.glb` is 414 KB (7,281 vertices, 12,566 triangles). `body_f.glb` is 423 KB. Target was ≤ 1.5 MB, so there is headroom. It could shrink to about 250 KB with KHR_mesh_quantization, which GLTFLoader supports.

**Modesty.** The source "clothing" is underwear painted into the texture. The pilot shows it as sumi-ink garments. For the app we should repaint the mask as sportswear: T-shirt or tank top, and knee-length shorts. That is about half a day's work with any paint program on the 512 px mask (UV layout from `pack_model.py`), or with a few extra rules in `pack_model.py`.

## 3. Test motion and retargeting

**Source:** CMU mocap, trial `13_29`: 38 s at 120 fps.

- Terms: "free for all uses", and "may include in commercially-sold products, but may not resell this data directly".
- Recorded in LICENSES.md.
- It is used **only to test the pipeline**. Taisō motion will come from our own performer.

**Retargeting.** This is done offline in Python, deliberately *from landmarks*. The source is reduced to the 23 points that phone pose estimators output:

- nose and ears;
- shoulders, elbows, wrists, hand and thumb;
- hips, knees, ankles, heels and toes.

So the CMU test exercises exactly the code path that the filmed Taisō will use. The three.js BVH loader and SkeletonUtils were not needed, which keeps `js/vendor` small.

**Pipeline scripts** (in `assets/v3/pipeline/`):

| Script | Does |
|---|---|
| `cmu_to_landmarks.py` | ASF/AMC forward kinematics → landmark JSON (test only) |
| `mediapipe_to_landmarks.py` | FreeMoCap / MediaPipe 33-point output (.npy or .csv) → the same landmark JSON. Smoke-tested on synthetic data, **not yet on real footage**. |
| `landmarks_to_clip.py` | Clean-up + retarget + encode. See below. |
| `pack_model.py` | Model packing (§2) |
| `check_clip.py` | QA: replays the clip on the rig. Reports limb-direction error, foot slide and floor penetration. |
| `bench_cdp.py` | Headless-Chrome benchmark with CDP CPU throttling (§5) |
| `build_pilot.py` | Rebuilds every pilot asset from the downloaded sources |

**`landmarks_to_clip.py` stages:**

1. Zero-phase Butterworth low-pass at 6 Hz, then resample to 30 fps.
2. Bone-length normalisation (median length for each segment).
3. Face +Z and centre the start.
4. **Foot-lock in landmark space.** Contact is detected from height and speed. Planted feet are pinned, and knees are re-solved with two-bone IK, blended in and out over 3 frames.
5. **Direction-matching retarget.** For each bone: `G = B(now) · B(rest)ᵀ · G_rest`. `B` is an orthonormal basis built from the bone's own direction plus a twist reference (bend plane, foot forward, thumb, ear line). Elbows and knees are solved as hinges. The spine is slerped between pelvis and chest. The wrist follows the forearm 75 %, because estimated wrists are noisy.
6. **Second foot-lock on the target rig.** Our legs are not the performer's length, so this removes the remaining skating.
7. Encode (§7).

**QA on 13_29** (`check_clip.py`):

- Upper-limb directions match the landmarks to within 0.1°.
- Lower-limb directions match to 0.5–1.9° median (≤ 6.5° p95), after foot-lock IK.
- Planted-foot slide falls from 12 cm/s (raw) to 5.7 cm/s after the landmark lock, and to **1.7–1.9 cm/s (p95) after the rig lock**.
- The lowest toe dips 1.8 cm into the floor once.
- The whole 38 s clip retargets in about 10 s.

**One clip per body.** The male and female rigs differ by up to 8° in rest orientation (neck and head). So each body gets its own clip file. The retarget is automatic, so this costs nothing but disk. The alternative is to do the retarget step in the browser at load time: the same maths in about 150 lines of JS, and no second file.

## 4. Renderer prototype (`js/anim/v3/player.js`, `anim-v3-pilot.html`)

**Stack:**

- Vendored three.js r170 (existing).
- Plus `GLTFLoader`, `BufferGeometryUtils` and `OrbitControls` from r170's examples, in `js/vendor/three-examples/`. MIT, with a header, and the `'three'` import rewritten to the vendored path.
- The animation plays through a standard `AnimationMixer`: slerped keyframes, `timeScale` for speed, `setTime` for scrubbing.

**The three looks:**

- **(a) See-through.**
  - A fresnel "glass" body: a custom skinned ShaderMaterial, drawn after a depth-only pre-pass, so only the nearest skin layer shows.
  - The skeleton inside uses **v2's bone shapes** (`anatomy.js`: long-bone profiles, skull, pelvis, vertebrae, hands, feet), plus procedural ribs.
  - The bones are placed on the rig's bind pose and merged into **one rigidly skinned mesh**, so the whole skeleton is one draw call and follows the mocap for free.
- **(b) Solid, stylised.**
  - Washi-clay body with sumi garments, in Kitaeru's palette.
  - Wrapped key light, hemisphere fill and a warm rim, all in a light custom shader (no PBR, no shadow maps).
  - A blob shadow under the pelvis.
  - Dark mode swaps the tints.
- **(c) Muscles.**
  - Look (a) plus muscle groups tinted vermilion (primary) or gold (secondary). Tapping a chip cycles primary → secondary → off.
  - 12 groups: quads, hamstrings, glutes, calves, core, chest, upper back, lats, shoulders, biceps, triceps, forearms.
  - They come from `_REGION`, baked once in Python from rest-pose position, normal and skin weights. **Cost at runtime: zero.**
  - Limits: these are soft painted zones, not anatomical muscle shapes. Borders follow triangles; small muscles (rotator cuff, adductors, obliques vs rectus) are not separated.
  - **Doing it properly** would take an artist-painted region texture in the model's UV space: one 256–512 px ID map. That is 1–2 days in Krita or Blender, with the shader unchanged except for sampling the texture. Muscles that bulge would need separate muscle meshes or blend shapes, which is much more work and not needed.

**Controls on the page:**

- Orbit and pinch-zoom (OrbitControls).
- Play/pause, a timeline scrubber, and speed from 0.25× to 1.25×.
- Look switch, skeleton toggle, and Front / ¾ / Side / Back views.
- Male/female switch.
- A 5-second benchmark, and "Compare with v2 player".

It works at 375 px wide with no horizontal scroll, and it respects `prefers-reduced-motion` (starts paused).

## 5. Performance

**How it was measured:** `pipeline/bench_cdp.py`.

- Headless Chrome 153 on the dev PC (Intel UHD 630 through ANGLE/D3D11), 420×900 viewport at DPR 2.
- CDP `Emulation.setCPUThrottlingRate`.
- **Frame** = CPU time for the animation update plus the render call. This is the same thing the v2 player's `stats()` measures.
- v2 was measured on the same page with `jumping_jack`, after v3 was destroyed.

| CPU throttle | v3 solid | v3 see-through | v3 muscles | **v2 three.js player** |
|---|---|---|---|---|
| 1× | 0.5 ms (p95 1.1) | 0.5 ms (1.1) | 0.5 ms (1.0) | 3.2 ms (9.2) |
| **4×** | **2.6 ms (5.2)** | **4.0 ms (6.1)** | **3.3 ms (5.2)** | **20.1 ms (39.0)** |
| 6× | 5.9 ms (11.6) | 5.2 ms (10.7) | 6.5 ms (11.2) | 28.0 ms (46.8) |
| Draw calls / triangles | 2 / 12.6k | 4 / 40.9k | 4 / 40.9k | 128 / 37.1k |

**Why v3 is 5–7× cheaper on the CPU:**

- v2 rebuilds its muscle tubes and recomputes their normals every frame.
- v2 issues 128 draw calls and uses a soft shadow map.
- v3 is GPU skinning, 2–4 draw calls and no shadow map.

GPU time was not isolated here. At about 41k triangles with a trivial shader, it is well inside a mid-range Android GPU's budget. Confirm on a real phone with the pilot page's benchmark button.

**Load and first frame** (1× / 4×):

| Stage | 1× | 4× |
|---|---|---|
| Model fetch (local server) | 40–100 ms | — |
| GLB parse | 20–30 ms | 30–40 ms |
| Skeleton build | 35 ms | 90–140 ms |
| First frame (cold shader compile) | 310–330 ms | about 100 ms (warm shader cache) |
| Total, from start to first frame | about 0.5 s | about 0.4–0.7 s |

**Download sizes:**

| Item | Raw | Gzip |
|---|---|---|
| Model `body_m.glb` | 414 KB | 246 KB |
| Test clip (38 s, 30 fps) | 189 KB | 128 KB |
| **Model + this clip** | **603 KB** | **374 KB** |
| v3 JS (player, bones, kclip, GLTFLoader, BufferGeometryUtils, OrbitControls, plus v2's anatomy/core for bone shapes) | 264 KB | 71 KB |
| v2 JS for comparison (player, core, anatomy, all clips) | 340 KB | 116 KB |

`three.module.min.js` is shared by both (675 KB raw, 169 KB gzip).

**Clip size for the Taisō:**

- The clip rate is about 5 KB/s raw at 30 fps.
- The whole 3-minute routine as continuous clips would be about 0.9 MB raw.
- **Plan instead:** store one clean cycle per move (2–5 s), loop it, and drop to 20 fps. That gives about 13 × 10–15 KB ≈ **150–200 KB for all 13 moves**, plus the model.

## 6. Video to motion: recommendation

This section comes from a separate research pass; the sources are linked.

### The licence trap

Most of the best open-source models output **SMPL/SMPL-X** bodies, and SMPL's licence is non-commercial research only ([SMPL model licence](https://smpl.is.tue.mpg.de/modellicense.html)). That rules out GVHMR, WHAM, TRAM, 4D-Humans, HybrIK, VIBE, SMPLer-X, PromptHMR and EasyMocap. GVHMR's own code is also "educational, research and non-profit" only. **Do not use them**, even though the quality is excellent.

### Free online tiers

Most are **non-commercial** on the free plan:

- DeepMotion (60 s/month)
- Plask (15 s/day, and a broad licence to your content)
- QuickMagic
- Cascadeur

Radical shut down in July 2026. Rokoko Vision's free tier (30 s/month, FBX) appears to allow commercial use, but its terms page could not be read (HTTP 403), and 30 s/month is too little for 13 moves. Autodesk Flow Studio's free tier (about 30 s of mocap a month) is unverified. Cloud tools also mean uploading the performer's footage, so avoid them.

### Primary: FreeMoCap with MediaPipe BlazePose

- **Licence.** Code AGPL (the licence covers the tool, not our output). BlazePose weights CC BY 4.0. No SMPL.
- **Setup.** Runs on a CPU and installs with `pip` on Windows, under Python 3.10–3.12 (install it in its own environment; this PC has 3.14).
- **Why two phones.** With **two phones filming at once** (front and side), FreeMoCap triangulates, which fixes single-camera depth errors: twists, side bends, and arms in front of the body.
- **What it needs:**
  - a printed **ChArUco board** for a one-off calibration clip;
  - a **clap** at the start of each take to sync the phones.
- **What it outputs:** 33 points per frame, in 3D.
- **What happens next:** `mediapipe_to_landmarks.py` → `landmarks_to_clip.py`, the same path the CMU test proved.
- **Hands.** Hands get only wrist, index, pinky and thumb points. Finger poses will be set per move (open palm, relaxed, fist), not captured.

### Fallback: Epic's MetaHuman markerless mocap plugin

- Free on Fab, and commercial use is allowed.
- It solves body **and fingers** from one camera, all processed locally.
- It needs Unreal Engine 5.8 and a strong NVIDIA GPU (recommended: RTX 3070 class, 32 GB RAM).
- Export FBX from UE, then run it through our landmark or retarget step. That needs a small FBX-to-landmarks exporter inside UE, or a BVH export.

### If the PC has no suitable GPU

Keep FreeMoCap; it runs on a CPU. Only as a last resort, take a single-camera MediaPipe run per view and pick the better view per move.

### Expected clean-up, and where it happens in our pipeline

| Artefact | Fix | Where |
|---|---|---|
| Jitter | Zero-phase low-pass (6 Hz default; about 4 Hz for slow moves, 8 Hz for hops) | `landmarks_to_clip.py --cutoff` |
| Limbs changing length | Median bone lengths | automatic |
| Foot sliding | Contact detection + pin + two-bone IK, twice (landmarks, then rig) | automatic. Check with `check_clip.py`. |
| Drifting root | `--inplace` removes slow horizontal drift (Taisō moves stay on the spot) | flag |
| Depth flips in twists or side bends | Two-camera triangulation. Otherwise spot-fix the frames: cut them and re-interpolate. | FreeMoCap / manual |
| Hands and fingers | Fixed finger pose per move (the rig has full finger bones) | small per-move table (to build) |
| Loop seams | Cut one clean cycle; cross-fade the last 5 frames into the first | to build (about half a day) |

## 7. Recommended pipeline, end to end

```
phones (front + side, 1080p60, tripod)        one ChArUco calibration clip per session
   │  clap, still 3 s, one move, still 3 s        │
   ▼                                              ▼
FreeMoCap (PC, CPU)  ── sync, calibrate, triangulate, MediaPipe BlazePose ──►  body_3d_xyz.npy (33 pts/frame)
   ▼
mediapipe_to_landmarks.py   → move.landmarks.json   (23 named points, metres, Y-up)
   ▼
landmarks_to_clip.py        → smooth → bone lengths → face +Z → foot-lock → retarget to the rig → foot-lock on rig
   │                          (per body: body_m / body_f)
   ▼
[to build] loop_cut.py      → pick one clean cycle, cross-fade the seam, 20 fps
   ▼
move.kclip.json             ~ 5 KB/s at 30 fps: int16 quaternions (x,y,z; w rebuilt) + root translation, base64 in JSON
   ▼
check_clip.py (numbers) + anim-v3-pilot.html (eyes)   → commit
   ▼
js/anim/v3/player.js        GLTFLoader + AnimationMixer, look 'solid' for the Taisō
```

**What the `.kclip.json` holds:**

- `fps`, `frames`, `bones` (20 driven bones), `root`;
- `q`: base64 `Int16Array`, frames × bones × 3, scale `qScale`;
- `t`: pelvis local translation as int16, in 0.1 mm;
- `source` and `cleanup` provenance.

`kclip.js` turns it into a `THREE.AnimationClip`.

## 8. Effort

### Once the pipeline is running, per clip (one Taisō move)

| Step | Time |
|---|---|
| Filming (per move, both phones) | 3–5 min, including retakes |
| Transfer, trim to one take, FreeMoCap processing | 10–15 min (CPU processing time depends on the PC) |
| `mediapipe_to_landmarks` + `landmarks_to_clip` + `check_clip` | about 2 min |
| Review in the pilot page. Tweak the cutoff, in-place and finger pose; cut the loop. | 15–30 min |
| **Total** | **about 30–60 min per move**. The 13 Taisō moves are about 1.5–2 days, including one filming session of about 1.5 h. |

### One-off engineering still to do

| Task | Estimate |
|---|---|
| FreeMoCap install and first real-footage run (check axes, fix the converter) | 0.5–1 day |
| Loop-cut tool + finger-pose table | 1 day |
| App integration: lazy-load the v3 player for Taisō moves; `sw.js` runtime caching of the GLB and clips (about 0.4 MB + about 0.2 MB); fallback to the v2 plate when WebGL is missing; reduced-motion handling; theme hooks | 2–3 days |
| Sportswear garment mask | 0.5 day |
| Optional: KHR_mesh_quantization, and in-browser retarget so one clip serves both bodies | 1 day |

## 9. Filming guide (for the performer)

**Morning Taisō pilot: how to film. Thank you for helping!**

We turn your movement into a 3D animation. Your face and body are never shown in the app, only the motion. The footage stays private.

**You need**
- **Two phones**, if possible. One films you from the front and one from your side, both at the same time. One phone also works: film everything from the front, then everything again from the side.
- A tripod for each phone, or prop the phone firmly on books or a shelf. It must not move during a take.
- A printed calibration board (we'll send the file; print it A3 if you can, stuck flat on card).
- Earphones for the music or count, so only your movements are recorded, not the audio.

**Camera set-up**
- Hold the phone **sideways (landscape)**. Use 1080p at **60 fps** if the phone has it, otherwise 30 fps. Use the normal 1× lens: no zoom, no ultra-wide, no beauty filters.
- Put the phone at **about waist height (about 1 m)**, level and not tilted, **3–4 m away** from you.
- **Front phone:** straight in front of you. **Side phone:** at your left, at a right angle to the front phone, the same distance and height.
- Your **whole body must be in frame for every move, with space around you**: above your hands when your arms are up, and floor visible below your feet. Do a quick test with your arms stretched up and out, and with a hop.
- Tap and hold on yourself to lock focus and exposure. Switch on airplane mode. Check battery and storage.

**You and the room**
- **Clothes:** fitted, plain, one colour, contrasting with the wall. Shorts or leggings so your knees show. Short or fitted sleeves. Nothing loose or flowing. No logos with people on them.
- **Feet:** barefoot, or socks that contrast with the floor. Tie long hair back. No hat, watch or bracelets.
- **Light:** bright and even from the front or side. **No window behind you.** Switch the room lights on.
- **Background:** a plain wall. No mirrors, TV or posters of people, and **nobody else in view**.
- **Floor:** flat and non-slippery. Mark your spot with tape so you start in the same place every time.

**At the start of the session (once)**
1. **Calibration:** start both phones. Slowly move the printed board around the space where you'll stand, tilting it, for about 20 seconds. Both phones must see it.
2. **Reference:** stand still facing the front phone for 5 seconds with your arms relaxed. Then hold your arms straight out to the sides (a "T") for 5 seconds.

**For each of the 13 moves: a separate take**
1. Start both phones.
2. **Clap once**, clearly.
3. **Stand still for 3 seconds.**
4. Do the move **at the official pace, with the full count**.
5. **Stand still for 3 seconds.**
6. Stop both phones.

Say the move number out loud at the start, or show it on a sheet of paper, so we can label the files.

**The 13 moves**, in order (about 3 minutes in all):

1. Stretch up
2. Arm swing and knee bend
3. Arm circles
4. Chest opener
5. Side bend (both sides)
6. Forward and back bend
7. Trunk twist
8. Arms up and down
9. Diagonal bend and open (both sides)
10. Trunk circle (both ways)
11. Hops (four hops, then open and close)
12. Arm swing and knee bend again
13. Deep breath

If it's comfortable, add **14. Heel raises** (the no-hop option).

**One phone only?** Film all 13 moves from the front, then move the phone to your left side and film all 13 again. Keep the same spot and the same distance.

**Please don't**
- Follow along to a video on a screen in the room.
- Film with the NHK radio audio playing out loud.

**Afterwards:** send the original video files. Don't use a chat app, because it compresses them; use a USB cable or a shared drive link from the founder.

## 10. Risks

- **Licence traps.** SMPL-based tools, "free" tiers that are non-commercial, and Mixamo assets all look free and are not. Everything in the pipeline above is CC0, CC BY, MIT, Apache or AGPL (the last only for the tool). Keep `assets/v3/LICENSES.md` up to date.
- **Source of motion.** Taisō motion must come only from our own performer. **Never** from NHK or other videos, and not even as a reference played in the room during filming. Keep the raw footage private.
- **Capture quality** from phones is below optical mocap:
  - depth errors in twists and side bends (mitigated by two views);
  - no fingers;
  - some jitter.

  Budget the clean-up time in §8. If a move stays poor, keep v2's keyframed version for that move.
- **The body's look.** The free body is athletic ("superhero") and wears underwear. Fix: a sportswear mask (0.5 day), or a MakeHuman or paid-Source body. Decide before filming, although the choice does not affect filming.
- **Performance on low-end phones.**
  - The first frame compiles shaders (about 0.1–0.3 s on desktop; expect 0.3–1 s on a slow phone). Show the v2 still or a poster until it is ready.
  - WebGL can fail on very old devices, so keep the v2 SVG plate as the fallback.
- **Offline.** The GLB and clips must be added to the service worker's cache. Otherwise the Taisō animation will not work offline.
- **Two bodies = two clip sets**, until retargeting moves into the browser.
- **The performer.** Get a signed release covering capture, processing and use of the derived motion in the app (the footage itself is never published), and deletion of the footage after the project.

## 11. What the founder needs to decide or do

1. **Body:**
   - male, female, or both (the user picks, or it alternates);
   - keep the athletic free body, or go for everyday proportions (MakeHuman, free; or the paid Quaternius Source).
2. **Outfit:** approve "sportswear" (top + knee-length shorts, in sumi) for the solid Taisō look.
3. **Look:** confirm **solid (b) for the Taisō**, and muscles (c) for the anatomy view.
4. **Performer:**
   - recruit someone who knows the Taisō well;
   - get a signed release (we can draft one);
   - book about 1.5 h with 2 phones, 2 tripods (or books), a printed ChArUco board and a plain room.
5. **PC check:**
   - run `nvidia-smi` in a terminal (it reports the NVIDIA GPU, if there is one) and tell us the result. That decides whether the MetaHuman fallback is possible.
   - **OK the installs:**
     - Python 3.12 + FreeMoCap in its own environment (a few GB);
     - UE 5.8 (tens of GB), only if we need the fallback.
6. **Budget:** none needed. Everything is free. The paid Source body is optional.
7. **Next build step, once the footage exists:** we process move 1 end to end, and the founder reviews it in the pilot page before we do the other 12.

## Files

**Pilot page**
- `anim-v3-pilot.html`. Query options:
  - `?look=solid|xray|muscle`
  - `&body=m|f`
  - `&v2cmp`, which opens the v2 comparison
  - `&v2=<clip id>`

**Player**
- `js/anim/v3/player.js`: the player
- `js/anim/v3/bones.js`: skeleton from the v2 shapes
- `js/anim/v3/kclip.js`: clip decoder

**Vendored three.js modules**
- `js/vendor/three-examples/`: GLTFLoader, BufferGeometryUtils, OrbitControls (r170, MIT)

**Assets**
- `assets/v3/body_m.glb`, `assets/v3/body_f.glb`
- `assets/v3/clips/cmu_13_29.{m,f}.kclip.json`
- `assets/v3/LICENSES.md`
- `assets/v3/Quaternius-UBC-License_Standard.txt`

**Python pipeline:** `assets/v3/pipeline/*.py`. Python 3 + numpy, scipy and Pillow; `bench_cdp.py` also needs `websockets` and Chrome.

To rebuild the pilot assets:

```
python assets/v3/pipeline/build_pilot.py <folder with the Quaternius gltf/bin/png> <folder with CMU 13.asf, 13_29.amc>
```

---

# Phase 2 (2026-09-30): the human body in the app, driven by the v2 motion

Built, **not deployed**. Screenshots are in `docs/anim-v3/`. The review page is `anim-v3.html`: pick any clip, compare it with v2, and use `?sheet=` for contact sheets. The bench page is `anim-bench.html`.

## Bodies
- **Source:** MakeHuman CC0 assets (base mesh, macro targets, game-engine rig and weights), read from MPFB2 v2.0.17's data folder by our own numpy code. Nothing was installed; the downloads sit in `C:\Users\hirak\KitaeruTools\`. Provenance is in `assets/v3/LICENSES.md`.
- **Proportions:** MakeHuman's adult defaults. The female body is 1.59 m, the male 1.73 m.
- **Clothes:** a vermilion T-shirt, plus sumi 7/8 leggings (female) or above-the-knee shorts (male), with painted sumi hair. The see-through look shows the clothes as a faint tint.
- **Files:** `assets/v3/human_{f,m}.glb`, 485 KB each (about 235 KB gzipped). 13.5k vertices, 27k triangles, 53 bones.
- **Build:** `pipeline/build_body.py`, with `mh_body.py`.
- The Quaternius bodies are no longer used by the app. They are kept only for the phase-1 pilot page.

## The bridge: a runtime retarget (`js/anim/v3/retarget.js`)
Every frame, v2's `poseAt()` builds its skeleton: world frames for the pelvis, the vertebrae, the head, the limbs, the hands and the feet. The retarget turns that skeleton into bone rotations for the body. We chose this over an offline bake because:

- **Correctness:**
  - Flows, step blends (`blendPose`, which rebuilds the pose from blended channels, so feet step rather than slide), swap-side mirroring, pace/fit and flow-step clip overrides are all computed at runtime by v2.
  - A bake could only cross-fade finished rotations.
  - Planted contacts are re-solved on the body with two-bone IK to v2's own contact points.
- **Size:** it adds 0 bytes per clip. A bake would be about 5 KB/s × 159 clips × 2 bodies (several MB).
- **Offline:** nothing extra to cache per clip.
- **Speed:** 0.1 ms per pose at 1× CPU (measured).
- **Captured motion later:** a `.kclip` can replace one clip at a time. It needs a MakeHuman name map in `landmarks_to_clip.py` (about half a day).

**Method:**

| Part | How it is posed |
|---|---|
| Spine, head | v2's rotation relative to its neutral stance |
| Clavicles | v2's clavicle swing |
| Arms, legs | IK, then basis matching (bone direction + v2's anterior axis). The forearm takes 60 % of the pronation. |
| Free arms | Keep v2's arm shape (scaled to this body) |
| Planted limbs | Go to v2's contact point (scaled by leg length). When the body's proportions can't reach, the root moves towards the contact. |
| Hands | Finger curls from v2's hand shape |
| Flesh on the floor | A few hundred skin probes are skinned on the CPU, and the body is lifted so the flesh (which v2 doesn't have) rests on the floor |

**QA:** `js/anim/v3/qa.js`, on both bodies and all 159 clips. It checks for no NaNs, planted flat feet within 1.2 cm and planted palms within 1.5 cm. The limits are:

- kneeling knees sink up to 3.8 cm;
- prone toes, and seated feet in Makkō-hō, up to 3.5 cm.

There is no opaque floor, so this reads as contact.

## Looks
- **Solid** (the tradition flag `bodyLook: 'solid'`, set on `radio_taiso`): washi-clay skin with sportswear. No skeleton, no muscles.
- **See-through:** fresnel glass with muscles, primary in vermilion and secondary in gold. The skeleton can be switched on in Me → Animation → Skeleton inside.
- **Views:** each clip's v2 camera (az/el). Drag sideways to look around; the view drifts back.
- **Carried over from v2:** the travel-following camera with a floor grid, the breath ring, the motion trail (on this body's joints), props (box, tube, ring, band, bar), and the diamond push-up's hand inset (a second camera, clipped above the hands).

## Muscles
- **What changed:** the 19 app muscle ids are painted on the body. Each vertex has two slots, so borders overlap softly.
  - **Limbs:** cylindrical patches per limb bone (position along the bone × angle around it). For example, biceps = anterior mid upper arm, triceps = posterior; front/side/rear delts by angle; quads / adductors / hamstrings; calves.
  - **Torso:** height × width × front/back patches placed from each body's own joints (abs, obliques, chest, lats, upper back, traps, lower back, glutes, hip flexors).
- **Left to do:** they are still painted zones, not muscle shapes. Small muscles, and exact borders (for example, pec vs front delt), would need an artist-painted ID map: 1–2 days in Blender. Muscles don't bulge.

## App integration
- **Where:** `createSkeletonPlayer` (skeleton.js) picks v3 for every v2 clip when Me → Animation → Figure is "Human body" (the default).
- **Settings:** Figure: Human body / Classic skeleton; Body: Female / Male (defaults to the profile's sex, female when unspecified); Skeleton inside.
- **Loading:** lazy, with nothing static in `app.js`, `base.js` or `skeleton.js`. three.js, v3, the clip group and the chosen body load on the first animation.
- **Fallback:** no WebGL2, a load error, or a lost context → the v2 plate for the rest of the session.
- **Thumbnails** (players under 160 px) are 2D canvases painted by one shared WebGL renderer: static thumbnails once, playing ones at 12 fps.
- **Offline:** `sw.js` SHELL_FILES now lists three.js, the 6 v3 modules and both bodies. VERSION is unchanged.

## Performance (headless Chrome 153, Intel UHD 630, 420×900 at DPR 2; `pipeline/bench_app.py`)

"Frame" is the player's own CPU time per frame. For the plate this excludes SVG style/paint, so v2 is understated.

| Case | 1× v2 plate | 1× v3 body | 4× v2 plate | 4× v3 body |
|---|---|---|---|---|
| Workout player, jumping jack | 3.5 ms | 1.1 ms | 23.5 ms (p95 36) | **9.2 ms (p95 12)** |
| Workout player, Tai Chi cloud hands | 3.5 | 2.7 | 22.1 (p95 40) | **8.7 (p95 12)** |
| Workout player, Taisō (solid) | – | 2.7 | – | 9.5 |
| Library, 24 static thumbnails (total paint) | 56 ms | 91 ms | 324 ms | 390 ms |
| Plan list, 8 playing 64 px thumbnails | 30 fps | 30 fps | **10 fps**, 35/70 long frames | **30 fps**, 2/146 long frames |

- **Workout player:** v3 is about 2.5× cheaper than v2.
- **Static thumbnails:** v3 costs about 20 % more than v2 (each paint reads back from the GPU), about 16 ms per thumbnail at 4×. This happens once, when a list opens.
- **Playing thumbnails:** v3 stays smooth where v2 drops frames.
- **GPU side:** the see-through look is 2 passes of 27k triangles; the skeleton adds 15k. It was not isolated here, so check it on a real phone.

**Added download** (first animation, once):

| Item | Raw | Gzip |
|---|---|---|
| three.js | 692 KB | 171 KB |
| v3 JS | 80 KB | 30 KB |
| One body | 485 KB | about 235 KB, if Pages gzips .glb |
| **Total** | **about 1.25 MB** | **about 0.44 MB** |

The shell precache now also includes the second body. Because install re-fetches the whole shell, every update re-downloads about 1.7 MB raw.
