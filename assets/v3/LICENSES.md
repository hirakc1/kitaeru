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

## Code: three.js example modules (`js/vendor/three-examples/`)

- `loaders/GLTFLoader.js`, `utils/BufferGeometryUtils.js` and `controls/OrbitControls.js` from three.js r170. Source: https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/
- Licence: MIT, Copyright 2010-2024 three.js authors. Full text in `js/vendor/three-examples/LICENSE.txt` (a copy of `js/vendor/three.LICENSE.txt`).
- The only change is that the bare `'three'` import is rewritten to the vendored path. Each file's header says so.

## Our own code

`js/anim/v3/*` and `assets/v3/pipeline/*` were written for Kitaeru. The bone shapes in `js/anim/v3/bones.js` reuse Kitaeru's own `js/anim/v2/anatomy.js`.
