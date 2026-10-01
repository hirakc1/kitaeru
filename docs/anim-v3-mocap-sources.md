# Animation v3: real motion-capture sources for the exercise clips

Research date: 2026-10-01. Scope: which of the 159 v2 clip ids (`js/anim/v2/ids.js`) can be driven by **real human motion capture taken from existing free datasets**, without filming anyone, under licences that allow a free public PWA to serve the derived per-clip JSON publicly, with commercial use not ruled out.

Nothing in the app was changed. Scratch downloads, used only to check content and formats, are in `C:\Users\hirak\KitaeruTools\mocap\` (a plain folder; nothing installed).

## 1. Summary

| Question | Answer |
|---|---|
| **Usable sources** | **CMU** (free for all uses), **HDM05** (CC BY-SA 3.0), **UI-PRMD** (ODC PDDL, public domain), **100STYLE** (CC BY 4.0), **ACCAD** (CC BY 3.0). The Kyokushin karate set (CC0), AddBiomechanics (CC BY 4.0) and OpenCap (Apache 2.0) are also allowed, but add almost nothing for our list. |
| **Rejected** | SFU, Bandai Namco, LaFAN1, KIT, AMASS, HumanML3D, Motion-X, Fit3D, MoYo, UMONS-TAICHI, BONES-SEED (non-commercial, no-derivatives, no redistribution, or SMPL-only). Rokoko and Truebones forbid redistribution. Mixamo is a **grey area, not recommended** (see §2.2). |
| **Coverage of the 159 clips** | **13 exact + 32 close = 45 clips (28 %)** have a real take we can use. A further **17 candidates** are likely but need someone to watch the take first. Best case is **62 clips (39 %)**. **84 clips have no usable take** and stay hand-keyed. |
| **Morning Taisō (13)** | Excluded. `assets/v3/LICENSES.md` says Taisō motion must come only from our own performer. Seven Taisō steps do have generic matches (listed in §3) if the founder ever relaxes that rule. |
| **Strongest areas** | Surya Namaskar and standing yoga (CMU subjects 144, 111 and 113), squats, jumping jacks, arm circles, marching and high knees, lunges, and the tai chi commencement. |
| **Weakest areas** | Push-up variants, pull and row work, dips, core floor work, glute bridges, seated stretches (Makkō-hō), Baduanjin, rotation and anti-rotation drills. Nobody has published these under an open licence. |
| **Code needed** | **None for CMU and HDM05.** `cmu_to_landmarks.py` ran unchanged on HDM05 (same Vicon ASF/AMC dialect, same bone names). UI-PRMD is plain text (numpy). 100STYLE and ACCAD need a small BVH reader (about 80 lines of numpy). A C3D reader is only needed for the karate set (low value). |
| **Top recommendation** | Phase 1: CMU + HDM05 through the existing pipeline. That covers about 35 of the 45 clips with zero new code. Phase 2: UI-PRMD (squat and lunge family, wall angel, leg swings). Phase 3: a BVH reader for 100STYLE (high knees, march, the paced walk). Fill the rest by hand-keying, or film our own performer as planned for the Taisō. |
| **Founder actions** | (1) Decide whether HDM05's **ShareAlike** is acceptable: every clip derived from HDM05 must itself be published CC BY-SA 3.0. (2) Say **no to Mixamo** unless Adobe confirms in writing. (3) Confirm the Taisō rule stays. (4) Optional: watch about 10 short CMU takes to confirm the "candidate" rows (§3). No accounts are needed for any recommended source. |

## 2. Licence survey

Verdict key: **Allowed** = OK for a free public PWA that serves the derived joint-rotation JSON, with commercial use later. **Reject** = fails one of those conditions.

### 2.1 Table

| Source | Licence / terms (verbatim, under 15 words) | URL | Verdict |
|---|---|---|---|
| **CMU Graphics Lab Motion Capture Database** | "This dataset of motions is free for all uses." Also: "you may not resell this data directly, even in converted form." FAQ: "may be copied, modified, or redistributed without permission." | http://mocap.cs.cmu.edu/ and http://mocap.cs.cmu.edu/faqs.php | **Allowed.** Serving free derived clips is fine. Selling the clips themselves, for example as a paid download pack, is not. Selling an app that contains them is explicitly fine ("commercially-sold products"). Acknowledgement requested. Note: "Please don't crawl this database!" Fetch the files we need by hand or use the bundled zip. |
| **HDM05** (MPI / Uni Bonn) | "licensed under a Creative Commons Attribution-ShareAlike 3.0 Unported License". The intro also says it aims "to supply free motion capture data for research purposes". | https://resources.mpi-inf.mpg.de/HDM05/ (returns 403 to scripts; the page and the cuts zip are in the Wayback Machine, snapshot 2025-07-18). The licence is also listed at https://www.re3data.org/repository/r3d100011968 | **Allowed, with ShareAlike.** Commercial use is OK under CC BY-SA. Every clip JSON derived from HDM05 must be published CC BY-SA 3.0 with attribution. The app code is not a derivative of the data, so it is unaffected. Keep HDM05 clips as separate files and do not blend them with other sources inside one clip unless that clip is also BY-SA. The "research purposes" line states an aim, not a licence term, but an email to HDM05 to confirm would remove all doubt. |
| **UI-PRMD** (Univ. of Idaho rehab movements) | "released under the Open Data Commons Public Domain Dedication and License (PDDL) v1.0" | http://webpages.uidaho.edu/ui-prmd/ (403 to scripts; read via the Wayback copy). Paper: https://www.mdpi.com/2306-5729/3/1/2 | **Allowed** (public domain; attribution is courtesy only). |
| **100STYLE** (Ian Mason) | "licensed under a Creative Commons Attribution 4.0 International License." | https://www.ianxmason.com/100style/ and https://zenodo.org/records/8127870 | **Allowed** with attribution. |
| **ACCAD Open Motion Project** (Ohio State) | "licensed under a Creative Commons Attribution 3.0 Unported License" | https://accad.osu.edu/research/motion-lab/mocap-system-and-data | **Allowed** with attribution ("ACCAD/The Ohio State University"). Little exercise content. |
| Kyokushin karate mocap (Sci. Data 2021) | figshare licence field: "CC0" | https://springernature.figshare.com/articles/dataset/Multimodal_dataset_of_37_Kyokushin_karate_athletes_/12315629 | Allowed, but kicks and punches only, in a 9.9 GB zip. Not worth it. |
| AddBiomechanics | "available for free under a Creative Commons BY 4.0 license" | https://addbiomechanics.org/download_data.html | Allowed, but it is mostly gait, many trials have no arm markers, and the `.b3d` format needs nimblephysics. Skip. |
| OpenCap lab validation data | Downloads listed under an "Apache 2.0 Use Agreement" | https://simtk.org/projects/opencap | Allowed. Squats, sit-to-stand and drop jumps only, all of which CMU/HDM05/UI-PRMD already cover. Skip. |
| **Mixamo** (Adobe) | FAQ: "use both characters and animations royalty free for personal, commercial, and non-profit projects". Former FAQ text (reposted on Adobe's forum by a community member): "Any type of free distribution of character or animation raw files" is not allowed. | https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html (403 to scripts; read via the Wayback snapshot of 2026-01-05) and https://community.adobe.com/questions-696/mixamo-faq-licensing-royalties-ownership-eula-and-tos-589400 | **Grey: not recommended.** See §2.2. |
| SFU Motion Capture Database | "The data cannot be used for commercial products or resale" | https://mocap.cs.sfu.ca/ | **Reject** (non-commercial). |
| Bandai Namco Research Motion dataset | "CC BY-NC 4.0" (both datasets) | https://github.com/BandaiNamcoResearchInc/Bandai-Namco-Research-Motiondataset | **Reject** (non-commercial). |
| Ubisoft LaFAN1 | "Attribution-NonCommercial-NoDerivatives 4.0 International Public License" | https://github.com/ubisoft/ubisoft-laforge-animation-dataset | **Reject** (non-commercial and no-derivatives). |
| KIT Whole-Body Human Motion Database | No licence is stated on the site. The FAQ says downloads require an account. AMASS redistributes KIT under its non-commercial licence. | https://motion-database.humanoids.kit.edu/faq/ | **Reject** (unclear terms; account needed). Its content is mostly locomotion and manipulation anyway. The KIT Motion-Language download page states no licence either. |
| AMASS | "Any other use, in particular any use for commercial purposes, is prohibited." Also SMPL-based. | https://amass.is.tue.mpg.de/license.html | **Reject.** |
| HumanML3D | Built from AMASS: "we are not allowed to distribute the data directly" | https://github.com/EricGuo5513/HumanML3D | **Reject** (inherits AMASS; SMPL). |
| Motion-X | "request authorization to use Motion-X for non-commercial purposes" | https://github.com/IDEA-Research/Motion-X | **Reject.** |
| Fit3D (37 fitness exercises, IMAR) | "Any other use, in particular any use for commercial purposes, is prohibited." | https://fit3d.imar.ro/legal | **Reject.** This is the dataset that would have covered most of our list. A commercial licence could be asked for, but it is not free. |
| MoYo (MPI yoga mocap) | MPI-style non-commercial licence (same family as AMASS; SMPL-X). Not fetched directly. | https://amass.is.tue.mpg.de/license.html (MPI template) | **Reject.** |
| AIST++ | Annotations are CC BY 4.0 (Google), per the download page | https://google.github.io/aistplusplus_dataset/download.html | Licence OK. Content is street dance only, and the keypoints are COCO-17 (no feet or hands); the rotations are SMPL. **Useless for us.** |
| UMONS-TAICHI | "CC BY-NC-SA 4.0" | https://github.com/numediart/UMONS-TAICHI | **Reject** (non-commercial). A pity: 13 Taijiquan techniques. |
| BONES-SEED | Forbids uploading "to a public repository on ... GitHub" | https://bones.studio/info/seed-license | **Reject.** |
| Rokoko free / Motion Library | EULA 3.4: "END-USER may not reproduce, distribute, sublicense, rent, lease or lend any Motion Asset." Free packs need an email sign-up. | Quoted by Rokoko staff at https://discussions.unity.com/threads/released-rokokos-motion-library.566497/ ; free pack: https://www.rokoko.com/resources/download-263-rokoko-motion-capture-assets | **Reject** (same raw-file problem as Mixamo, an account is needed, and the free packs hold no fitness content). |
| Truebones free packs | "Re-Distribution or ReSale of Truebones in .FBX, .BVH or i-Motion formats is strictly prohibited" | https://truebones.gumroad.com/p/reminder-truebones-terms-of-use-and-service (seen in search results) | **Reject.** Also a provenance concern: public allegations that some motions were taken from a commercial game (https://forums.unrealengine.com/t/news-exposed-truebones-owner-caught-stealing-re-selling-fortnite-animation/218693). |

### 2.2 Mixamo, precisely

- Use inside a finished product (games, films, apps) is royalty-free, including commercial use, and attribution is not required.
- What is forbidden is distributing the **raw character or animation files**: as asset packs, templates, or "any type of free distribution".
- Our case is the hard one. Kitaeru is a public GitHub repo served from GitHub Pages, and each clip would be a standalone JSON of joint rotations at a predictable URL, also visible in the repo.
  - Converting the format does not obviously change "raw animation file" into "incorporated in a project".
  - A game ships its animations inside a build. We would publish them one per file in public source control.
  - That is close to free redistribution.
- There is no Adobe statement on converted data or open-source web apps. The forum answers come from community members, not Adobe staff.
- The founder's own Adobe ID does not change any of this. It would be needed only to download.
- `docs/anim-v3-pilot.md` already rejected Mixamo characters for the same reason.
- **Recommendation:** do not use Mixamo. If it is ever wanted, get written confirmation from Adobe first, citing this exact case: public repo, per-clip JSON, free app.
- The exercise animations Mixamo reportedly has (push-up, burpee, plank and others) were not verified here, because browsing needs an Adobe login.

## 3. Coverage map (all 159 clip ids)

**Ratings**
- **E** = exact: the movement is the same and needs only trimming.
- **C** = close: usable after trimming, mirroring, retiming, holding a pose, or stitching two takes.
- **?** = candidate: the description or a quick pose check suggests a match, but someone must watch it before committing.
- **N** = no usable take in the allowed sources.

**Source codes**
- `CMU s_t` = CMU subject_trial.
- `HDM class` = HDM05 cut class; `HDM xx 03-08` = full take by actor xx, part-scene 3-8.
- `UI mNN` = UI-PRMD movement.
- `100S style ID` = 100STYLE, style, "idling" (in-place) take.
- `ACCAD` = ACCAD Open Motion.

Takes marked † were downloaded and checked numerically: landmark heights, knee angles and arm elevation over time, using `tools/describe.py` in the scratch folder.

### push (14)

| id | Rating | Best take(s) and notes |
|---|---|---|
| push_up | C | HDM bk 03-08 (script: "3 push-ups"), HDM dg 03-09. Full takes, so they need cutting. dg's file notes "flipping markers during push-ups". Floor work, so check hand and foot contact. |
| knee_push_up | N | |
| scapular_push_up | N | |
| wall_push_up | N | |
| incline_push_up | N | |
| decline_push_up | N | |
| diamond_push_up | N | |
| archer_push_up | N | |
| pseudo_planche_push_up | N | |
| pike_push_up | N | |
| elevated_pike_push_up | N | |
| bench_dip | N | |
| bar_dip | N | |
| ring_dip | N | |

### pull (11)

| id | Rating | Best take(s) and notes |
|---|---|---|
| pull_up | ? | CMU 01_12 "playground - climb, pull up". The pull-up sits inside climbing on playground bars. Early subject, lower quality. |
| dead_hang | ? | CMU 01_03, 43_02, 43_03 (hang and swing on a bar). Would need a still segment. |
| chin_up, scapular_pull, negative_pull_up, band_assisted_pull_up, archer_pull_up, inverted_row, table_row, archer_row, band_row | N | |

### legs (9)

| id | Rating | Best take(s) and notes |
|---|---|---|
| bodyweight_squat | **E** | HDM squat1Reps / squat3Reps (65 takes, 5 actors). UI m01 deep squat (10 subjects x 10 reps). CMU 13_29†, 13_30, 14_06, 14_14, 22_14. |
| box_squat | C | HDM sitDownChair + standUpSitChair (20 + 20 takes). UI m05 sit-to-stand. CMU 13_01–03 (high stool). The seat height differs from a box. |
| split_squat | C | UI m03 inline lunge: a static split stance, 10 subjects. |
| bulgarian_split_squat | N | |
| calf_raise | ? | 100S Tiptoe ID; CMU 13_10 / 14_07 "reach for, tiptoe". |
| single_leg_calf_raise, glute_bridge, single_leg_glute_bridge, hip_thrust | N | |

### trunk (3)

| id | Rating | Best take(s) and notes |
|---|---|---|
| plank | C | CMU 144_30† passes through plank, about 1 s (hold the frame). Also the push-up start pose in HDM bk 03-08. |
| side_plank, superman | N | |

### abs (12)

| id | Rating | Best take(s) and notes |
|---|---|---|
| wall_handstand_push_up | ? | CMU 88_02† "handstands, vertical pushups". The numbers suggest it is done from a raised platform; no wall. |
| dead_bug | ? | HDM bk 03-08, step 1: "moving arms and legs together in the air (while lying on floor)". Exact form unknown. |
| wall_handstand | C | CMU 88_02†, 89_05; HDM bd 06-01 take 02 "Handstand". Free handstands, no wall. |
| freestanding_handstand | C | Same takes as wall_handstand. |
| lying_leg_raise, hollow_body_hold, hanging_knee_raise, hanging_leg_raise, l_sit, side_plank_hip_dip, bird_dog, crow_pose | N | |

### cond (7)

| id | Rating | Best take(s) and notes |
|---|---|---|
| marching_in_place | **E** | HDM walkOnPlace2/4Steps (60 takes). 100S March ID. CMU 138_01–10 marching (travelling). |
| high_knees | **E** | 100S HighKnees ID. HDM jogOnPlace / runOnPlace (close). |
| jumping_jack | **E** | HDM jumpingJack1Reps/3Reps† (65 takes). CMU 13_29†, 13_30, 13_31, 14_06, 14_20, 22_15, 22_16, 86_05. |
| squat_jump | C | HDM bk 03-08, step 4: "5 jumps (from the floor up to the air with stretched arms)". HDM hopBothLegs. CMU 13_39–42 "jump". |
| bear_crawl | ? | ACCAD Male 1, Male 2 and Female 1 "Crawl forward"; CMU 111_03, 133_01. Probably a hands-and-knees crawl, not a bear crawl. |
| mountain_climber, burpee | N | |

### mob (17)

| id | Rating | Best take(s) and notes |
|---|---|---|
| cobra_stretch | C | CMU 144_30† (upward-dog segment, about 2 s per round). |
| deep_squat_hold | C | UI m01 deep squat (hold the bottom); HDM squat. |
| hip_flexor_stretch | C | CMU 113_28†, 111_41† (low lunge, pelvis about 0.33 m off the floor, both sides). |
| standing_hamstring_stretch | C | CMU 13_29† / 14_20 "bend over"; CMU 111_41† (wide-leg forward fold). |
| arm_circles | **E** | HDM rotateArms{Both,L,R}{Forward,Backward}{1,3}Reps†: 12 classes, about 190 takes. |
| leg_swings | C | HDM kickLFront / kickRFront (kicks, so slower them down); UI m06 standing active straight leg raise. |
| hip_circles | ? | CMU 42_01† "stretch - rotate head, shoulders, arms, legs" (9 s); 100S WiggleHips ID. |
| worlds_greatest_stretch | ? | CMU 113_28† / 111_41†: lunge with hands down. No thoracic rotation seen. |
| cat_cow, wrist_prep, childs_pose, pigeon_stretch, calf_stretch, doorway_chest_stretch, shoulder_dislocate, pancake_stretch, inchworm | N | CMU 144_30 goes fold to plank by a jump back, not a walk-out, so it is not an inchworm. |

### moments (4)

| id | Rating | Best take(s) and notes |
|---|---|---|
| standing_hip_flexor_stretch | C | UI m03 inline lunge (hold); CMU 144_17†. |
| wall_angel | C | UI m07 standing shoulder abduction / m10 scaption. No wall, but the same arm path. |
| seated_calf_raise | N | |
| paced_breathing | N | Seated stillness; not worth mocap. |

### strength (8)

| id | Rating | Best take(s) and notes |
|---|---|---|
| reverse_lunge | C | CMU 144_11, 144_12, 144_17†, 144_18 (shallow forward lunges, about 105–120° front knee); 100S Lunge (walking); UI m03. These are forward or static lunges; do not play them backwards. |
| cossack_squat | C | UI m04 side lunge (10 subjects). |
| prone_ytw, superman_pull, pistol_squat, shrimp_squat, single_leg_rdl, nordic_curl_negative | N | |

### rot (14)

| id | Rating | Best take(s) and notes |
|---|---|---|
| bodyweight_woodchop | ? | CMU 79_01 "chopping wood" (an axe chop, overhead to down, not diagonal). |
| open_book, thread_the_needle, seated_trunk_rotation, rotational_lunge, band_woodchop, standing_windmill, bird_dog_row, half_kneeling_pallof_hold, plank_shoulder_tap, pallof_press, pallof_press_overhead, side_plank_reach_through, thoracic_opener | N | CMU "side twists" (13_29†) are standing twists only. |

### trad (3)

| id | Rating | Best take(s) and notes |
|---|---|---|
| dand | C | HDM dg 03-09, step 3: "3 Indian push-ups". Right movement, but with marker flips. Needs cleaning or a careful pick. |
| baithak | C | HDM squat / CMU squats. No heel rise or arm swing, so those would be layered on. |
| horse_stance | ? | ACCAD Male 2 "Martial Arts Stances" (15 C3D files, contents unlisted); CMU 12_04† (tai chi, low wide stance at times). |

### taiso (13): excluded by the house rule (own performer only)

For the record only:

| Taisō step | Rating | Possible take |
|---|---|---|
| rt_stretch_up | C | CMU 14_20 "reach up" |
| rt_arm_circles | C | HDM rotateArms |
| rt_forward_back_bend | C | CMU 13_29 bend over |
| rt_trunk_twist | C | CMU 13_29 side twists |
| rt_arms_up_down | C | UI m07 |
| rt_deep_breath | C | UI m07 |
| rt_two_foot_hops | E | HDM hopBothLegs |
| rt_arm_swing_knee_bend, rt_chest_opener, rt_side_bend, rt_diagonal_bend, rt_trunk_circle, rt_heel_raise | N | |

### taichi (7)

| id | Rating | Best take(s) and notes |
|---|---|---|
| taichi_commencement | C | CMU 12_04†, 0–25 s: the arms rise to shoulder height, lower, then the body sinks. This is the opening. |
| taichi_part_horse_mane, taichi_white_crane, taichi_brush_knee, taichi_cloud_hands | ? | Probably inside CMU 12_04† (148 s of continuous tai chi with weight shifts and bow stances). The form is not documented, so someone must watch it and segment it. |
| taichi_closing | ? | CMU 12_04†, last 10 s (arms rise and settle). |
| taichi_golden_rooster | ? | CMU 49_18–20 "balance on one leg, outstretched arms" (a dancer, not tai chi). |

### baduanjin (10)

| id | Rating | Notes |
|---|---|---|
| All 10 | N | No open Baduanjin mocap was found. The research datasets (IMU, 54 subjects) are not published under a licence. |

### stances (3)

| id | Rating | Best take(s) and notes |
|---|---|---|
| breath_paced_walk | **E** | CMU 07_04, 07_05 "slow walk"; 100S Neutral FW. |
| bow_stance | ? | CMU 12_04† bow-stance moments; ACCAD Male 2 stances. |
| zhan_zhuang | N | A static hold; hand-keyed with an idle sway is fine. |

### yoga (20)

The app's Surya Namaskar is the step-back lunge variant. CMU 144_30–32 is the **jump-back** variant (no lunges). The lunges come from CMU 111/113 (step forward from downward dog into a low lunge).

| id | Rating | Best take(s) and notes |
|---|---|---|
| surya_namaskar | C | Stitch CMU 144_30† (2 rounds; 144_31 and 144_32 are repeats) with lunges from 113_28† / 111_41†. Two performers, so the joins need care. |
| sn_prayer | **E** | CMU 144_30† (0–1 s, 24–25 s) |
| sn_raised_arms | **E** | CMU 144_30† (2 s, 26 s) |
| sn_forward_fold | **E** | CMU 144_30† (7–9 s) |
| sn_lunge_r | C | CMU 113_28† / 111_41† |
| sn_lunge_l | C | CMU 113_28† / 111_41† (other side) |
| sn_plank | C | CMU 144_30† (11 s) |
| sn_plank_l | C | CMU 144_30† (11 s) |
| sn_knees_chest | C | CMU 144_30† (12 s): a low chaturanga-like lowering, not knees-chest-chin. |
| sn_cobra | C | CMU 144_30† (13–14 s, upward dog) |
| sn_dog | **E** | CMU 144_30† (15–16 s), 111_41† (3–9 s), 113_28† |
| sn_lunge_in_r | C | CMU 113_28† / 111_41† (dog → lunge) |
| sn_lunge_in_l | C | CMU 113_28† / 111_41† (other side) |
| sn_fold_in_l | C | CMU 144_30† (17–18 s) |
| sn_fold_in_r | C | CMU 144_30† (17–18 s) |
| sn_rise | **E** | CMU 144_30† (19–23 s) |
| sn_stand | **E** | CMU 144_30† (24 s) |
| vrikshasana | C | CMU 113_29†, 111_39†: tree pose with the foot high on the thigh, both sides, held about 8 s. The arms go out to the side, not overhead. |
| virabhadrasana_2 | C | CMU 113_29†, 111_39†: wide stance with arms out (about 1 m), but a shallow knee bend. Deepen it with IK. |
| trikonasana | **E** | CMU 113_29†, 111_39†: wide stance, trunk tilted about 80°, one arm vertical and one hand at the shin or floor. Both sides. |

### makko (4)

| id | Rating | Notes |
|---|---|---|
| makko_1 to makko_4 | N | Seated floor stretches; none found. |

### Totals

| Rating | Count | Clips |
|---|---|---|
| E | 13 | bodyweight_squat, marching_in_place, high_knees, jumping_jack, arm_circles, breath_paced_walk, sn_prayer, sn_raised_arms, sn_forward_fold, sn_dog, sn_rise, sn_stand, trikonasana |
| C | 32 | push_up, box_squat, split_squat, plank, wall_handstand, freestanding_handstand, squat_jump, cobra_stretch, deep_squat_hold, hip_flexor_stretch, standing_hamstring_stretch, leg_swings, standing_hip_flexor_stretch, wall_angel, reverse_lunge, cossack_squat, dand, baithak, taichi_commencement, surya_namaskar, sn_lunge_r, sn_lunge_l, sn_plank, sn_plank_l, sn_knees_chest, sn_cobra, sn_lunge_in_r, sn_lunge_in_l, sn_fold_in_l, sn_fold_in_r, vrikshasana, virabhadrasana_2 |
| ? | 17 | pull_up, dead_hang, calf_raise, wall_handstand_push_up, dead_bug, bear_crawl, hip_circles, worlds_greatest_stretch, bodyweight_woodchop, horse_stance, taichi_part_horse_mane, taichi_white_crane, taichi_brush_knee, taichi_cloud_hands, taichi_closing, taichi_golden_rooster, bow_stance |
| Taisō (excluded) | 13 | rt_* (7 would have generic matches) |
| N | 84 | everything else |

**By source:**
- CMU alone gives about 25 of the E+C clips (all the yoga, the tai chi opening, lunges, the hamstring stretch, handstands).
- HDM05 gives about 10 more (arm circles, marching, squat jump, push-up, dand, box squat, leg swings), and better squat and jumping-jack takes.
- UI-PRMD gives about 6 (split squat, cossack, deep squat hold, wall angel, standing hip-flexor stretch, leg swings).
- 100STYLE improves high knees, marching and the slow walk.

## 4. Formats and our pipeline

| Source | Format | Readable today? | Work needed |
|---|---|---|---|
| CMU | ASF/AMC, 120 fps (BVH conversions by cgspeed also exist, same terms) | **Yes.** `cmu_to_landmarks.py` ran on 144_30, 144_17, 111_38–41, 113_28/29, 12_04, 42_01 and 88_02 without change. | None. |
| HDM05 | ASF/AMC and C3D, 120 fps. The "cuts" zip (`HDM05_cut_amc.zip`, 152 MB, 3,129 files) is already split into about 100 classes. | **Yes.** Its ASF is the same Vicon BodyBuilder dialect (`length 0.45`, same bone names `lhipjoint`, `lfemur` and so on). `cmu_to_landmarks.py` ran unchanged on jumpingJack and rotateArms takes, and the output was checked as plausible. | None. The live site returns 403 to scripts; the Wayback Machine copy (2025-07-18) downloads fine, and a browser probably works too. |
| UI-PRMD | Plain-text matrices: Vicon 39-joint **positions** (mm) and YXZ Euler **angles**, full and per-rep "Segmented Movements" files, about 100 Hz | Not yet | Easy: `numpy.loadtxt`, then pick the joints that map to our 23 landmarks (joint order is in the paper). Positions feed `landmarks_to_clip.py` directly. The data set also contains deliberately **incorrect** repetitions; use only the correct set. |
| 100STYLE | BVH (XSens, 28 bones, 60 fps), 1.5 GB zip | Not yet | A small numpy BVH reader (parse the HIERARCHY offsets and channel orders, FK on the MOTION lines; about 80 lines) plus a joint-name → landmark map. There are no finger or thumb joints, so synthesise the `hand` and `thumb` landmarks from the forearm direction. |
| ACCAD | BVH, C3D, AMC | Not yet (the BVH reader above covers it) | Same BVH reader. |
| Kyokushin, Plug-in Gait C3D | C3D | No | A C3D reader (about 100 lines of numpy) plus a marker → landmark map. Not worth it for kicks and punches. |
| AddBiomechanics | `.b3d` | No | Needs nimblephysics (an install). Skip. |

A BVH reader is the only new code worth writing, and only once phase 3 starts. Nothing needs installing.

## 5. Recommendation

1. **Phase 1: CMU + HDM05, no new code.** Run the existing `cmu_to_landmarks.py` → `landmarks_to_clip.py` → `check_clip.py` on the takes listed in §3. That is about 35 clips: the Surya Namaskar positions, tree, triangle, Warrior II, dog, cobra, squat, jumping jack, arm circles, marching, squat jump, push-up, dand, baithak, box squat, lunges, the hamstring and hip-flexor stretches, handstands, and the tai chi commencement.
   - Record each take in `assets/v3/LICENSES.md`.
   - Mark HDM05-derived clips **CC BY-SA 3.0**.
   - Add the CMU acknowledgement and the HDM05 attribution to the app credits.
2. **Phase 2: UI-PRMD** (one numpy text loader): split squat, cossack squat, deep squat hold, wall angel, standing hip-flexor stretch, better leg swings. About 6 clips, public domain.
3. **Phase 3: 100STYLE** (BVH reader): high knees, marching in place, breath-paced walk. Mostly upgrades of clips HDM05/CMU already cover, so this phase is optional.
4. **Watch the 17 candidates** before committing; most can be judged in minutes. CMU's site has a short preview for every trial. The highest value is CMU 12_04 for four more tai chi forms.
5. **Stays hand-keyed: about 84 clips.**
   - Every push-up variant except the basic one, plus dips.
   - All pull, row and hang work.
   - Floor core work: dead bug (unless HDM05 fits), leg raises, hollow body, bird dog, side plank, superman.
   - Glute bridges and hip thrust; single-leg strength (pistol, shrimp, single-leg RDL, Nordic).
   - All rotation and anti-rotation drills (Pallof, open book, thread the needle).
   - Seated work: Makkō-hō, seated calf raise, paced breathing.
   - Baduanjin; mountain climber, burpee, inchworm; the remaining stretches (cat-cow, child's pose, pigeon, calf, doorway, shoulder dislocate, pancake, wrist prep).
   - The Taisō, which comes from our own performer per the house rule.

   Filming our own performer with FreeMoCap (the existing plan in `anim-v3-pilot.md`) remains the only route to real motion for these.

   There is a partial route for push-up, squat and a few others without filming: run `mediapipe_to_landmarks.py` on openly licensed video, for example the CC BY 4.0 multi-view fitness video set at https://data.mendeley.com/datasets/kgbb3yn47p/3. Quality is below marker mocap, and each video's licence and performer consent must be checked. It was not evaluated in depth.

## 6. Pitfalls

- **Hands and fingers.** CMU and HDM05 have one hand segment plus a crude thumb. 100STYLE and UI-PRMD have no fingers at all. Keep the v3 rig's fingers in a fixed relaxed pose, or key them per clip (fists for dand, flat palms for plank and dog, prayer hands).
- **Floor work.** Marker occlusion when lying or in a plank causes flips and gaps. HDM dg 03-09 is documented with "flipping markers"; the CMU floor sections of 144_30 looked clean in the numbers but must be checked visually. Expect hand–floor penetration and sliding; the pipeline's foot-lock does not lock hands yet. A hand-lock pass, the same as the foot-lock with hand landmarks, would help plank, dog, cobra and push-up.
- **Foot sliding.** The pipeline's two-stage foot-lock handles optical data well (1.7–1.9 cm/s p95 on CMU 13_29). XSens inertial data (100STYLE) also drifts at the root, so apply foot-lock more aggressively.
- **Skeleton-fit artefacts.** HDM05's BodyBuilder fits show knees about 135–145° when the actor stands straight (their documentation warns of "knees bent backwards" and angled elbows). CMU shows similar but milder bend. Consider clamping knee extension towards 175° when standing.
- **Retarget scale.** Performers range from about 1.55 to 1.9 m, and subjects 111/113 were pregnant or post-pregnancy, which explains the wider stances. The landmark route normalises bone lengths, but a wide stance stays wide. The rig foot-lock fixes contact, not style.
- **Left/right.** Mirror by reflecting landmarks across the sagittal plane and swapping L/R names before retargeting. Most yoga takes already have both sides.
- **Tempo and looping.** App clips have prescribed tempos (`tempo.secPerRep`). Mocap reps must be time-warped and trimmed to a seamless cycle (pick start and end frames with matching pose and velocity, then cross-fade).
- **Stitching performers.** Surya Namaskar from two subjects (144 + 113) needs pose-matched cut points. Each segment is a separate step clip in the app already (`sn_*`), which helps.
- **Low-numbered CMU subjects** are older captures; CMU itself advises starting with higher-numbered subjects.
- **Licence hygiene.**
  - Never combine HDM05 data into a non-BY-SA clip.
  - Keep a per-clip source line, as the existing LICENSES.md already does.
  - Do not sell clip packs (CMU forbids reselling "even in converted form").

## 7. Files used for checking (scratch, not in the repo)

- `C:\Users\hirak\KitaeruTools\mocap\cmu-index.txt`: the full CMU trial list with descriptions (from github.com/una-dinosauria/cmu-mocap).
- `C:\Users\hirak\KitaeruTools\mocap\cmu\`: the 11 CMU trials checked (†) and their landmark JSON.
- `C:\Users\hirak\KitaeruTools\mocap\hdm05\HDM05_cut_amc.zip`: the HDM05 cut library (Wayback copy), plus test conversions.
- `C:\Users\hirak\KitaeruTools\mocap\tools\describe.py`: prints a per-second pose summary (pelvis and head height, trunk tilt, knee angles, stance width, hand height, arm elevation) for a landmark JSON.
- `C:\Users\hirak\KitaeruTools\mocap\pages\`: saved licence pages (CMU, HDM05, ACCAD, Rokoko EULA, HDM05 documentation PDF).
