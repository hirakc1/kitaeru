# assets/v3: sources and licences

Everything in this folder is either our own work or comes from the sources below. Record every new asset here before it is committed.

## App bodies: `human_f.glb`, `human_m.glb` (anim v3 phase 2: what the app ships)

**Source**
- The MakeHuman base mesh (`3dobjs/base.obj`, HM08), the macro targets (`targets/macrodetails/*`), the "game engine" rig (`rigs/standard/rig.game_engine.json`) with its skin weights (`weights.game_engine.json`), and the vertex-group table (`mesh_metadata/basemesh_vertex_groups.json`).
- Taken from the data folder of **MPFB2 v2.0.17**, the MakeHuman plugin for Blender: https://github.com/makehumancommunity/mpfb2/archive/refs/tags/v2.0.17.zip (downloaded 2026-09-30, 44.6 MB).
- Also downloaded for reference but **not used**: the MakeHuman system asset pack (clothes, skins, hair): http://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip (281 MB; every asset is marked "CC0" in its `packs/makehuman_system_assets.json`).
- Both are kept outside the repo, in `C:\Users\hirak\KitaeruTools\`. This is a plain folder: **nothing was installed**. There is no Blender, no MakeHuman program, no installer and no registry change. Delete the folder to remove them.

**Licence: CC0 1.0 Universal**
- MPFB2's `LICENSE.md`, section C: the bundled assets ("the base mesh and proxies, targets and modifiers, textures, clothes, rigs, poses and expressions, JSON data with mesh information") "have been released under CC0 1.0 Universal". The full text is `LICENSE.ASSETS.md` in the same archive.
- `base.obj` itself says it "was explicitly released as CC0 in september 2020". The weights file's own `license` field says "CC0".
- Section D: the MakeHuman team makes no claim over output, whether it is made through the UI or through a script. We did not run any MPFB code (it is GPL-3). Our own code, `pipeline/mh_body.py` and `pipeline/build_body.py`, reads the CC0 data with numpy.
- Attribution is not required. We credit "MakeHuman (CC0)" anyway.

**Our changes** (`python pipeline/build_body.py <mpfb2>/src/mpfb/data assets/v3`)
- **Shape:** athletic (founder, 2026-10-01). Age 25, the three race targets at 1/3 each, average height. Female: muscle 0.9, weight 0.38, ideal proportions. Male: muscle 1.0, weight 0.4, ideal proportions. Both add MakeHuman's own CC0 detail targets: wider shoulders, a narrower waist, toned stomach, and more muscle on the lats, chest, arms and legs (female at 80%). Heights are 1.60 m and 1.73 m. `build_body.py ... everyday` rebuilds the earlier everyday bodies (MakeHuman defaults).
- **Mesh:** kept the body and the two low-poly helper eyes. Dropped every other helper, the UVs and the normals (rebuilt at load).
- **Rig:** the 53 game-engine joints, placed from MakeHuman's joint helpers, with identity rest rotations. Skin weights are the top 4, in uint8. Positions are int16 in 0.1 mm (KHR_mesh_quantization).
- **Clothes:** sportswear and hair painted as vertex masks. A T-shirt on both bodies; 7/8 leggings on the female body and above-the-knee shorts on the male. The garments sit a few mm off the skin and are smoothed over the chest and crotch.
- **Muscle regions:** the app's 19 muscle ids, painted from the rig's weights and the joint positions.

## Pilot bodies: `body_m.glb`, `body_f.glb` (phase 1 pilot page only; not used by the app)

**Source**
- Quaternius, *Universal Base Characters*, free "Standard" version.
- Files used: `Superhero_Male_FullBody.gltf` and `Superhero_Female_FullBody.gltf` (folder `Base Characters/Godot - UE`), plus `T_Superhero_Male_Ligh.png` and `T_Superhero_Female_Light_BaseColor.png` (folder `Base Characters/Textures`). The textures were used only to derive the garment mask.
- Pages: https://quaternius.com/packs/universalbasecharacters.html and https://quaternius.itch.io/universal-base-characters
- Downloaded 2026-09-30 through itch.io's free "no thanks, just take me to the downloads" path. No account was used.
- File: `Universal Base Characters[Standard].zip`, 122 MB.

**Licence: CC0 1.0 Universal (public domain dedication)**
- Licence text: https://creativecommons.org/publicdomain/zero/1.0/
- The licence file shipped in the zip is copied verbatim to `Quaternius-UBC-License_Standard.txt`. It says:

  > License: CC0 1.0 Universal (CC0 1.0) Public Domain Dedication https://creativecommons.org/publicdomain/zero/1.0/ … Models by @Quaternius

- The site says: "Free to use in personal, educational and commercial projects. (CC0 License)".
- Attribution is not required. We credit "Quaternius" anyway, on the pilot page and in the app's credits.

**Our changes** (made by `pipeline/pack_model.py`)
- Kept only the body mesh and its 65-joint skin. Dropped the eyes, eyebrows, textures and extra UV/colour sets.
- Re-quantised the skin weights.
- Added a `_REGION` vertex attribute (muscle-group id and intensity, garment mask).
- Added a 512 px garment-mask PNG, derived from the base-colour texture.

## Test motion: `clips/cmu_13_29.{m,f}.kclip.json` (pipeline test only; not for the shipped app)

**Source**
- CMU Graphics Lab Motion Capture Database, subject 13, trial 29: "jumping jacks, side twists, bend over, squats".
- Files: http://mocap.cs.cmu.edu/subjects/13/13.asf and http://mocap.cs.cmu.edu/subjects/13/13_29.amc. Downloaded 2026-09-30.

**Terms**, from http://mocap.cs.cmu.edu/ and http://mocap.cs.cmu.edu/faqs.php:
- "This dataset of motions is free for all uses."
- "You may include this data in commercially-sold products, but you may not resell this data directly, even in converted form."
- FAQ: "The motion capture data may be copied, modified, or redistributed without permission."
- Requested acknowledgement: "The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217."

**Our changes**
- Converted to landmarks (`pipeline/cmu_to_landmarks.py`).
- Low-pass filtered, feet locked, and retargeted to the Quaternius rig (`pipeline/landmarks_to_clip.py`).

**Taisō rule:** Taisō motion must come only from our own performer's footage. It must never come from NHK's or anyone else's video.

## Real motion: `mocap/*.kclip.json` (played by the app with the human body; also on `anim-review.html`)

Made by `pipeline/mocap_clips.py` (with `pipeline/mocap.py`). Every clip's own `source`, `licence` and `credit` fields repeat what is below, and `mocap/index.json` lists each clip's takes and time windows. The app's list of clips is `js/anim/v3/mocap-index.js` (it names each clip's data licence).

### CMU Graphics Lab Motion Capture Database (the Surya Namaskar steps and the tree pose)

| Take | File | Used for |
|---|---|---|
| 144_30 sun salutation | http://mocap.cs.cmu.edu/subjects/144/144_30.amc (+ 144.asf) | `sn_prayer` (3.30-4.01 s), `sn_raised_arms` (4.02-5.56 s), `sn_forward_fold` (5.52-8.00 s), `sn_dog` (13.95-16.05 s), `sn_rise` (20.45-21.3 s, then 23.12 s), `sn_stand` (23.12-24.06 s); the palms-together arms in `vrikshasana` (3.9 s) |
| 113_28 "Yoga" | http://mocap.cs.cmu.edu/subjects/113/113_28.amc (+ 113.asf) | `sn_lunge_in_r` (8.5-11.0 s, then 18.75 s), `sn_lunge_in_l` (25.0-27.2 s, then 33.5 s) |
| 113_29 "Yoga" | http://mocap.cs.cmu.edu/subjects/113/113_29.amc (+ 113.asf) | `vrikshasana` (0.3-18.3 s: legs, trunk, head) |

Also downloaded and checked, but not used in any clip: 144_17 "Lunges" (the pilot's split squat: dropped), 12_04 "tai chi" (the commencement: built, then left out), 111_13 "March", 13_29, 14_20, 14_06 (checked for marching, squats and stretches). Files were downloaded 2026-10-01 into `KitaeruTools/mocap/cmu` (outside the repo), one by one from the CMU site.

**Terms** (http://mocap.cs.cmu.edu/ and http://mocap.cs.cmu.edu/faqs.php):
- "This dataset of motions is free for all uses."
- "You may include this data in commercially-sold products, but you may not resell this data directly, even in converted form."
- Requested acknowledgement, shown on the review page (and owed in the app's credits): "The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217."

### HDM05: these clips are CC BY-SA 3.0

| Take | File (HDM05 "cut" library, `HDM05_cut_amc.zip`) | Used for |
|---|---|---|
| squat3Reps, actor tr, take 012 | `squat3Reps/HDM_tr_squat3Reps_012_120.amc` (+ `HDM_tr.asf`) | `bodyweight_squat` (2.05-4.15 s, the second rep) |
| jumpingJack3Reps, actor tr, take 012 | `jumpingJack3Reps/HDM_tr_jumpingJack3Reps_012_120.amc` (+ `HDM_tr.asf`) | `jumping_jack` (1.73-2.90 s, one jack, top of a hop to the next) |
| walkOnPlace4StepsRStart, actor bd, take 002 | `walkOnPlace4StepsRStart/HDM_bd_walkOnPlace4StepsRStart_002_120.amc` (+ `HDM_bd.asf`) | `marching_in_place` (0.83-2.29 s: legs, trunk, head) |
| walkOnPlace4StepsRStart, actor mm, take 011 | `walkOnPlace4StepsRStart/HDM_mm_walkOnPlace4StepsRStart_011_120.amc` (+ `HDM_mm.asf`) | `breath_paced_walk` (0.71-1.98 s); the arms of `marching_in_place` |

Also checked, not used: rotateArms (too big and fast for the app's arm circles), walkOnPlace actor bk 004 (the head tips back), jogOnPlace, kick, hopBothLegs, sitDownChair / standUpSitChair, squat1Reps.

- Source: https://resources.mpi-inf.mpg.de/HDM05/ (zip fetched via the Wayback Machine snapshot of 2025-07-18).
- Licence: "licensed under a Creative Commons Attribution-ShareAlike 3.0 Unported License" (https://creativecommons.org/licenses/by-sa/3.0/).
- Attribution: M. Müller, T. Röder, M. Clausen, B. Eberhardt, B. Krüger, A. Weber: *Documentation Mocap Database HDM05*. Technical report CG-2007-2, Universität Bonn, 2007.
- **ShareAlike:** `mocap/bodyweight_squat`, `mocap/jumping_jack`, `mocap/marching_in_place` and `mocap/breath_paced_walk` (`.f` and `.m` `.kclip.json`) are adaptations of HDM05 and are themselves licensed CC BY-SA 3.0, with the attribution above. They are kept as separate files and contain no CMU data (the marching clip combines two HDM05 actors, both CC BY-SA 3.0). Nothing else in the repo is affected: the player code is not a derivative of the data.

**Our changes (all clips):** forward kinematics, a 6 Hz low-pass, knee-extension correction of the source skeleton fit, retargeting to the MakeHuman body, trimming and time-warping to the app's tempo, cross-fades and loop seams, compositing (`vrikshasana` arms from 144_30; `marching_in_place` arms from actor mm), foot, hand and finger contact clean-up (low-passed), floor contact, built prayer hands, an eased stoop (`sn_prayer`), a gentler head (`sn_lunge_in_*`), the back knee lowered to the floor (`sn_lunge_in_l`), palms brought to the floor (`sn_forward_fold`, `sn_lunge_in_*`), relaxed hands (HDM05 clips), finger shapes. See `docs/anim-v3-mocap.md`.

## Code: three.js example modules (`js/vendor/three-examples/`)

- `loaders/GLTFLoader.js`, `utils/BufferGeometryUtils.js` and `controls/OrbitControls.js` from three.js r170. Source: https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/
- Licence: MIT, Copyright 2010-2024 three.js authors. Full text in `js/vendor/three-examples/LICENSE.txt` (a copy of `js/vendor/three.LICENSE.txt`).
- The only change is that the bare `'three'` import is rewritten to the vendored path. Each file's header says so.

## Our own code

`js/anim/v3/*` and `assets/v3/pipeline/*` were written for Kitaeru. The bone shapes in `js/anim/v3/bones.js` reuse Kitaeru's own `js/anim/v2/anatomy.js`.
