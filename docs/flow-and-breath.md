# Kitaeru: Flow and Breath (v1.3 content spec)

Owner: Research (movement anthropology and exercise science). Consumers: Content (`js/data/exercises.js`, `js/data/traditions.js`), Animation (`js/anim/v2/*`), Engine (`js/engine/planner.js`) and the independent fact-check pass. Last reviewed: 2026-09-29.

This is the research spec for the v1.3 "Flow and breath" batch in `world-movement.md` §7. It is a research document only: nothing here is in the app yet, and **nothing here is verified**. Every item below has `verified: null`. A separate fact-check pass sets `verified` once the `CONTRACTS.md` bar is met, using the checklist in §7.

**How to read the evidence grades** (the same scale as `world-movement.md`)

| Grade | Meaning |
|---|---|
| **A** | Several meta-analyses of RCTs agree, with at least moderate certainty. Specific claims allowed. |
| **B** | At least one good RCT, or a meta-analysis with low certainty. Hedged copy ("may improve"). |
| **C** | Small or low-quality trials, or indirect evidence from similar exercise. Copy describes what the move trains, not outcomes. |
| **D** | Historical and practice-based only. No health outcomes in the copy. |

Conventions: **[practice]** marks rules that follow practitioner consensus, not trials. **[adaptation]** marks a change Kitaeru makes to the tradition (it must carry `adaptation: true` or be disclosed in the description). **[unconfirmed]** marks anything I could not confirm in two sources. Muscle, equipment and injury ids are the contract ids. "Source A/B/…" labels refer to the source list at the end of each section and to §8.

---

## 0. Summary

1. **The Morning Taisō and Baduanjin "remaining singles" already exist as data and animation.** All 13 Radio Taisō steps and all 8 Baduanjin pieces were built for the v1.2 flows, and 15 of them carry `flowOnly: true`. "Shipping the remaining singles" therefore means **promoting** them: writing standalone dosage, planner fit and copy, not new animation. That makes them cheap, and it is why the batch is larger than 15 items.
2. **The official seated Radio Taisō No. 1 exists** (Japan Post Insurance publishes an illustrated sheet; NHK sells a seated DVD; the national federation confirms seated movements are part of the programme). Its steps are the same 13 names, done upper-body-only in a chair, and **the hops become shoulder shakes**. This is the most useful new item for 75+ users and for Desk reset.
3. **For the Sun Salutation, I recommend the Sivananda 12-position sequence** (Swami Vishnudevananda, 1960). It is published by the school itself, it is the sequence already sketched in `world-movement.md` §2.5, and it has no inversions. It has one **breath retention** (position 5), which Kitaeru must replace with a normal breath and disclose as an adaptation. The older Aundh "Ten-Point" method is unsuitable as our variant: it holds the breath through most positions and makes medical claims (tuberculosis, liver, spleen).
4. **The Common Yoga Protocol of India's Ministry of AYUSH is an excellent official source** for tree pose and triangle pose, including hold times (10–30 s) and cautions. Warrior II is not in it; B.K.S. Iyengar's *Light on Yoga* is its primary source.
5. **Makkō-hō should be one flow of four steps, not four singles.** The official association (公益社団法人真向法協会) presents the four as one short routine of about 3 minutes, done in order, and asks that its illustrations and text are not reused without permission. The fourth stretch needs an adaptation for knees and backs.
6. **The Systema breath walk is the most weakly sourced item.** Its one detailed source is Vladimir Vasiliev's book *Let Every Breath*. Vasiliev's own site was unreachable during this research. I recommend keeping it, but only the no-hold "pyramid" walk, and the fact-checker must find a second source before it ships.
7. **Evidence is modest across the board.** Only the tradition-level claims reach B (Radio Taisō, Baduanjin, yoga for balance in older adults). Every new single move is C or D: copy should say what it trains.

---

## 1. Summary table

"Sources" counts the independent sources that support the *form* of the move (official or primary first). Wikipedia is counted only where it supports a name or history. "New anim" = new clips the animator must build.

| # | id | Name | Tradition | Mode | Evidence (move) | Sources (form) | New anim | Open questions |
|---|---|---|---|---|---|---|---|---|
| 1 | `rt_arm_swing_knee_bend` | Arm swing and knee bend | radio_taiso | reps | C (tradition B) | 3 (Kampo, NHK, Federation) | 0 | – |
| 2 | `rt_arm_circles` | Arm circles | radio_taiso | reps | C | 2 (Kampo, NHK) | 0 | Twin of `arm_circles`; circle direction order |
| 3 | `rt_chest_opener` | Chest opener | radio_taiso | reps | C | 2 | 0 | – |
| 4 | `rt_forward_back_bend` | Forward and back bend | radio_taiso | reps | C | 2 | 0 | Morning back rule |
| 5 | `rt_arms_up_down` | Arms up and down | radio_taiso | reps | C | 2 | 0 | – |
| 6 | `rt_diagonal_bend` | Diagonal bend and chest opener | radio_taiso | reps | C | 2 | 0 | – |
| 7 | `rt_trunk_circle` | Trunk circle | radio_taiso | reps | C | 2 | 0 | Keep out of auto-plans? |
| 8 | `rt_deep_breath` | Deep breath | radio_taiso | reps | C | 2 | 0 | Breath blocks: this or `paced_breathing` |
| 9 | `radio_taiso_1_seated` | Morning Taisō, seated | radio_taiso | flow (13) | C | 1 official + 2 confirming it exists | 13 seated clips | Separate flow vs variant; step reps |
| 10 | `baduanjin_separate_heaven_earth` | Separating heaven and earth | baduanjin | reps | C (tradition B) | 3 (sport.gov.cn, Heshan, CHQA) | 0 | – |
| 11 | `baduanjin_sway_head_tail` | Swaying the head and tail | baduanjin | reps | C | 3 | 0 | Keep out of auto-plans |
| 12 | `baduanjin_touch_toes` | Two hands hold the feet | baduanjin | reps | C | 3 | 0 | Morning and after-meal exclusions |
| 13 | `baduanjin_clench_fists` | Punching with angry eyes | baduanjin | reps | C | 3 | 0 | – |
| 14 | `baduanjin_heel_bounce` | Bouncing on the toes | baduanjin | reps | C | 3 | 0 | Bone-health flag absent |
| 15 | `zhan_zhuang` | Standing post | zhan_zhuang (new card) | hold | C | 2 (Chinese Medical Qigong Society; Lam Kam Chuen) | 1 | New card or merge; category |
| 16 | `bow_stance` | Bow stance | horse_stance (card widened) | hold (per side) | C | 2 (university wushu course; wushu teaching refs) | 1 | Card rename |
| 17 | `surya_namaskar` | Sun Salutation | yoga | flow (12) | C | 2 pages from one school + book (unread) | 8 step clips | Breath-hold adaptation; second independent source |
| 18 | `vrikshasana` | Tree pose | yoga | hold (per side) | C | 2 (AYUSH CYP, Kerala Tourism) | 1 | – |
| 19 | `virabhadrasana_2` | Warrior II | yoga | hold (per side) | C | 2 (Iyengar *Light on Yoga*; a second teaching source is weak) | 1 | Second official source |
| 20 | `trikonasana` | Triangle pose | yoga | hold (per side) | C | 2 (AYUSH CYP, Iyengar) | 1 | Which of the two forms |
| 21 | `makko_ho` | Makkō-hō | makko_ho | flow (4) | D | 2 (Makkō-hō Association, Sasakawa Sports Foundation) | 4 step clips | Rights; step-4 adaptation |
| 22 | `systema_breath_walk` | Breath-paced walk | systema | hold (timed) | D | 1 detailed (Vasiliev 2006) + 1 on principles | 1 | **Second source needed** |

**22 items, not 15.** 13 are promotions of animated, already-verified flow steps (items 1–8, 10–14), so the real new work is 9 items and about 31 new clips (§6). I dropped nothing from the roadmap list. Two flow-only steps stay flow-only (§2.1). The rest of the `rotation` and `anti_rotation` families and "Tradition of the week" are also in the v1.3 roadmap but outside this brief.

---

## 2. Morning Taisō (Radio Taisō No. 1)

All items here use `tradition: 'radio_taiso'`, the shared `RT` spread in `exercises.js` (`attribution: RADIO_TAISO_ATTRIBUTION`, `cultural: 'attributed'`), user-facing name "Morning Taisō", and **no music ever**. The attribution line stays exactly: "the Radio Taisō No. 1 movements (NHK / Japan Post Insurance). Kitaeru is not affiliated with them."

### 2.1 What is already shipped, and what to promote

| id | Today | v1.3 proposal | Why |
|---|---|---|---|
| `rt_stretch_up`, `rt_side_bend`, `rt_trunk_twist` | standalone | unchanged | shipped in v1.2 |
| `rt_arm_swing_knee_bend`, `rt_arm_circles`, `rt_chest_opener`, `rt_forward_back_bend`, `rt_arms_up_down`, `rt_diagonal_bend`, `rt_trunk_circle`, `rt_deep_breath` | `flowOnly` | **promote** (drop `flowOnly`) | each is a useful warm-up, mobility or breath drill on its own |
| `rt_two_foot_hops` | `flowOnly` | **keep flow-only** | high impact, 14 s long, and `jumping_jack` / `squat_jump` already cover it as a single; as a single it adds little and brings an impact risk to the Morning moment |
| `rt_heel_raise` | `flowOnly`, `adaptation` | **keep flow-only** | Kitaeru's own swap, not part of the tradition; `calf_raise` covers it as a single |

The promoted steps keep their existing clips, native names, cues and `verified` notes. Promotion changes their *use*, so the fact-checker must re-check only the new standalone fields below (dose, description wording, planner fit), not the movement.

**Common sources (form):** A = Kampo illustrated guide, No. 1 standing (official); B = NHK No. 1 and 2 illustrated sheet (official); C = National Radio Taiso Federation FAQ (official); D = Kampo seated guide (official; used here to cross-check cues). Research: Osuka et al. 2024 (§8).

**Common evidence.** Grade **B at tradition level only**: a 12-week RCT (n = 226, pre-frail and frail older adults, Radio Taisō plus a nutrition programme versus nutrition alone) improved up-and-go, 2-minute step-in-place and exercise self-efficacy but not the primary outcome, mental quality of life (Osuka et al. 2024). That trial tested the whole routine, so **a single step is grade C**: its copy describes what it moves, never the trial result. Recommendation: set `evidence: 'C'` on promoted singles (the flow and the card keep B).

**Common dosage logic.** In the routine, each step lasts 10–20 s at about one count per second. As a standalone warm-up or mobility drill that is too short to matter, so the default is **2 rounds of the standard count** (20–40 s), which matches the existing warm-up drills (`arm_circles`, `hip_circles`). This is a Kitaeru choice **[practice]**.

#### 2.1.1 `rt_arm_swing_knee_bend`: Arm swing and knee bend
- **Native name.** 腕を振って脚を曲げ伸ばす運動 *ude o futte ashi o magenobasu undō* (A, B, D).
- **Category / family / planes / posture.** warmup / `warmup` / sagittal + frontal / standing.
- **Mode.** reps: 8 per round (standard), 2 rounds.
- **Description.** Arms cross in front and swing out to the sides while the knees bend and straighten and the heels lift and lower in time. It opens the routine as a pulse-raiser and closes it as a wind-down.
- **Cues.** "Arms cross, then swing out" · "Bend your knees and lift your heels in time with the swing" · "Stay light and springy". Kampo's own tip: time the heel raise with the arm swing (A).
- **Breath.** natural.
- **Regressions / progressions.** Easier: smaller knee bend, heels down. Relates to `marching_in_place` (pulse) and `calf_raise`.
- **Injuries.** `knee` (small bend only). Low impact. Fine at any age.
- **Planner.** Warm-up (Raise), Morning, Desk reset, After a meal (easy pace), Before sport (Raise).
- **Animation.** Existing clip. No change.
- **Fact-check.** Standalone dose (8 × 2) is Kitaeru's; heel-raise timing per Kampo tip.

#### 2.1.2 `rt_arm_circles`: Arm circles
- **Native name.** 腕を回す運動 *ude o mawasu undō* (A, B, D).
- **Category / family / planes / posture.** warmup / `warmup` / frontal / standing.
- **Mode.** reps: 4 each way per round (standard), 2 rounds. **The standard alternates: one circle one way, then one the other way, 4 times** (NHK: 腕の外まわし (1, 2), 腕の内まわし (3, 4), 4呼間×4回; the Kampo seated sheet's "4回繰り返す" bracket spans both directions), not 4 one way then 4 the other (fact-check 2026-09-29).
- **Description.** Loose, big arm circles from the shoulders, using the swing (Kampo: relax the arms and shoulders and use centrifugal force, A), one way then the other.
- **Cues.** "Arms loose" · "Big circles from the shoulders" · "Then the other way".
- **Breath.** natural.
- **Relations.** **Near-twin of the generic `arm_circles`.** Add `['arm_circles', 'rt_arm_circles']` to `SAME_DRILL` in `planner.js` so both never appear in one session.
- **Injuries.** `shoulder`. Low impact.
- **Planner.** Warm-up, Morning, Desk reset, Before sport (Mobilise).
- **Open point.** The existing cue says "outwards, then inwards". The Kampo seated sheet describes the first circle as 体の外側から内側へ ("from the outside of the body to the inside"), then the reverse. In English "outwards" and "inwards" are ambiguous for a circle. **The fact-checker should confirm the first direction against the Kampo video and reword the cue unambiguously** (e.g. "arms cross in front on the way up" or "arms sweep out to the sides on the way up"). **Resolved (fact-check 2026-09-29), from the illustrations, not the video:** the first circle goes **out and up the sides, the arms cross overhead, then come down in front**; the second goes up in front and down the sides. Evidence: the Kampo seated sheet (D) draws the first circle with the arrowheads at the top pointing inwards, captioned 腕を体の外側から内側へ大きく回す; NHK (B) figure 1 draws the arms rising along the sides to cross overhead; the Federation FAQ (C, 2013-04-14) explains that the call 外から内に names the arms moving out to the sides of the body first. Suggested cue: "Arms sweep out and up the sides, cross overhead, and come down in front; then circle back the other way".

#### 2.1.3 `rt_chest_opener`: Chest opener
- **Native name.** 胸を反らす運動 *mune o sorasu undō* (A, B, D).
- **Category / family / planes / posture.** warmup / `warmup` / sagittal + frontal / standing.
- **Mode.** reps: 4 per round, 2 rounds.
- **Description.** Arms swing out and up on a diagonal as the chest lifts and opens, then swing down.
- **Cues.** "Swing your arms out and up" · "Lift and open your chest" · "Don't tip your head too far back" (Kampo tip, A: deep breath, face not turned up too far).
- **Breath.** in as the arms rise and the chest opens, out as they swing down (D: 息を吸いながら…胸を反らせる, 息を吐きながら腕を振り下ろす).
- **Injuries.** `lower_back` (keep the arch in the upper back), `neck` (gaze only slightly up). Low impact.
- **Relations.** `doorway_chest_stretch`, `thoracic_opener`.
- **Planner.** Warm-up, Morning, Desk reset (a good counter to sitting), Low-energy day.
- **Fact-check.** Breath direction per D; head-position cue per A.

#### 2.1.4 `rt_forward_back_bend`: Forward and back bend
- **Native name.** 体を前後に曲げる運動 *karada o zengo ni mageru undō* (A, B, D).
- **Category / family / planes / posture.** mobility / `warmup` / sagittal / standing.
- **Mode.** reps: 2 cycles per round (standard), 1–2 rounds.
- **Description.** Easy forward bounces with the hands towards the floor, then hands on the hips and a gentle lean back. Kampo: relax the neck and shoulders and let the upper body's weight give the bounce (A).
- **Cues.** "Let your upper body hang and bounce lightly" · "Hands on your hips, lean back gently" · "Knees soft; stay in a comfortable range".
- **Breath.** out on the forward bend, in on the rise **[practice]**.
- **Injuries.** `lower_back` (flows already drop the bounce range for this). Suspected osteoporosis: avoid bouncing flexion (`world-movement.md` §4.6.7).
- **Planner.** Warm-up (not the first move), Before sport (Mobilise). **Morning moment: not in the first 5 minutes** (the early-morning lumbar flexion rule, `moments.md` §1.1). Not After a meal (deep fold).
- **Fact-check.** Bounce per A; the breath direction is [practice], not from A or B.

#### 2.1.5 `rt_arms_up_down`: Arms up and down
- **Native name.** 腕を上下に伸ばす運動 *ude o jōge ni nobasu undō* (A, B, D).
- **Category / family / planes / posture.** warmup / `warmup` / frontal / standing.
- **Mode.** reps: 4 per round, 2 rounds.
- **Description.** Brisk, crisp arm extensions: hands to the shoulders, straight up, back to the shoulders, then down (standing version: the heels rise as the arms go up). Kampo suggests counting aloud to make the moves more forceful and quick (A).
- **Cues.** "Hands to your shoulders, elbows in" · "Punch straight up, then back" · "Quick and crisp".
- **Breath.** natural.
- **Injuries.** `shoulder`. Low impact.
- **Planner.** Warm-up, Morning, Energy boost (easy part), Desk reset.
- **Fact-check.** Hand path per D (手先を肩に添え, 腕を素早く上に伸ばす, 手先を肩に戻す).

#### 2.1.6 `rt_diagonal_bend`: Diagonal bend and chest opener
- **Native name.** 体を斜め下に曲げ胸を反らす運動 *karada o naname shita ni mage mune o sorasu undō* (A, B, D).
- **Category / family / planes / posture.** mobility / `warmup` / sagittal + transverse / standing.
- **Mode.** reps: 2 per side per round, 1–2 rounds (`unilateral: true`).
- **Description.** Bend down diagonally towards one foot with small bounces, then rise and open the arms and chest with a big breath in. Kampo: straighten the elbows and breathe in deeply as the chest opens (A).
- **Cues.** "Bend down towards one foot" · "Rise, arms wide, big breath in" · "Other side".
- **Breath.** out on the bend **[practice]**, in as the chest opens (A). (fact-check 2026-09-29: A and D state only the in-breath as the chest opens.)
- **Injuries.** `lower_back`. Low impact.
- **Planner.** Warm-up (after the easier drills), Before sport (Mobilise). Not early Morning, not After a meal.

#### 2.1.7 `rt_trunk_circle`: Trunk circle
- **Native name.** 体を回す運動 *karada o mawasu undō* (A, B, D).
- **Category / family / planes / posture.** mobility / `warmup` / all three / standing.
- **Mode.** reps: 2 each way per round, 1 round.
- **Description.** With the arms long, the upper body draws a big, slow circle from the hips, one way then the other. Kampo: circling with straight elbows loosens the whole trunk (A).
- **Cues.** "Feet apart, arms long" · "Draw a big, slow circle from your hips" · "Keep it smooth; shrink it if anything pinches".
- **Breath.** natural.
- **Injuries.** `lower_back` (already excluded in `lower_back` plans, `world-movement.md` §4.6.5); caution for suspected osteoporosis (loaded flexion plus rotation). Low impact.
- **Planner.** Warm-up and Before sport only, for users without back flags. **Recommendation: never auto-plan it in Morning, After a meal or Wind down**; allow it in Library pools and as a swap.
- **Fact-check.** Arm position per A.

#### 2.1.8 `rt_deep_breath`: Deep breath
- **Native name.** 深呼吸 *shinkokyū* (A, B, D).
- **Category / family / planes / posture.** breath / `breath` / frontal / standing (a seated form appears in item 9).
- **Mode.** reps: 4–6 slow breaths (about 30–60 s). In breath blocks, repeat to 60–90 s.
- **Description.** Breathe in deeply as the arms rise from the front to overhead; breathe out slowly as they lower out to the sides. Kampo: focus on the deep breath, not on the arm movement (A). Kampo describes the close as bringing the body slowly back to its resting state (D: 体をゆっくりと平常の状態に戻す) (fact-check 2026-09-29: this is on the Kampo seated sheet, not in the Federation FAQ).
- **Cues.** "Breathe in as your arms rise" · "Breathe out slowly as they lower to the sides" · "Never hold your breath".
- **Breath.** in: arms rise; out: arms lower. Target about 4–5 s in and 5–6 s out **[practice]**, so it sits close to `paced_breathing`.
- **Evidence.** **C** for the move. Slow breathing (Zaccaro's inclusion bar is under 10 breaths per minute (fact-check 2026-09-29), not specifically 6) is associated with higher heart-rate variability and lower anxiety (Zaccaro et al. 2018, systematic review of 15 studies in healthy people), but that is indirect for this drill. Copy: "a slow, full breath to finish", no outcome claim.
- **Injuries.** none; `shoulder` users can keep the arms below shoulder height. Stop if dizzy.
- **Planner.** Cool-down close, Wind down, After sport, Low-energy day (as `moments.md` §2 already plans). **Open decision for the founder:** breath blocks currently use only the generic `paced_breathing`; `rt_deep_breath` could be offered when the tradition is visible, or as a Swap. Consider `['rt_stretch_up', 'rt_deep_breath']` as a `SAME_DRILL` pair: they share the same arm path.

### 2.2 `radio_taiso_1_seated`: Morning Taisō, seated

- **English name.** Morning Taisō, seated. **Native name:** none (`nativeName: null`, as for `radio_taiso_1`). The Kampo sheet title ラジオ体操第1・座位 contains the Radio Taisō name, which may only appear in `RADIO_TAISO_ATTRIBUTION`.
- **Tradition / category / family.** radio_taiso / flow / `flow_sequence`; `posture: 'seated'`; `equipment: ['bench']` (any sturdy chair); `space: 'small'`; impact low.
- **What the sources say.** Japan Post Insurance publishes an official illustrated seated sheet (D, and its PDF) with the same 13 movement names in the same order. NHK Enterprises sells an NHK TV Taisō DVD, "座ってもできる 立ってもできる ラジオ体操", which includes No. 1 seated (E). The Federation says Radio Taisō is based on standing, and that seated movements were later added (C). Tokyo Shimbun ran a 2025 series, "座ってラジオ体操" (F, paywalled; used only to confirm the series exists).
- **Sequence (order per D).** Reps are from the Kampo seated sheet text where it gives them; "?" marks counts I could not read unambiguously in the extracted text. **[unconfirmed: all step reps]** – the fact-checker should confirm them from the PDF images and the Federation's seated video. **(fact-check 2026-09-29): every count below was read from the rendered PDF images (the "N回繰り返す" brackets); the "?" entries are resolved. The Federation's seated video was not viewed.**

| # | Step (move id proposal) | Seated form (D) | Reps (D) | Breath |
|---|---|---|---|---|
| 1 | `rts_stretch_up` | Arms rise from the front, overhead, spine long; lower | 2 | in up, out down (D) |
| 2 | `rts_arm_swing` | Arms cross in front, swing out to the sides and back; elbows not above the shoulders (D tip); legs still | 8 | natural |
| 3 | `rts_arm_circles` | Big loose circles, first from the outside in (腕を体の外側から内側へ大きく回す), then the reverse (反対回し) | 4 × (one each way) (fact-check 2026-09-29) | natural |
| 4 | `rts_chest_opener` | Arms swing out, rise on a diagonal as the chest lifts; swing down | 4 | in up, out down (D) |
| 5 | `rts_side_bend` | One arm rises from the side; slow single side bend; rise | alternate, 4 in all | natural |
| 6 | `rts_forward_back_bend` | One slow forward bend, rise; look up and lean back lightly; return | 2 | out forward **[practice]** |
| 7 | `rts_trunk_twist` | Twist left and right as if drawing an elbow back; then arm reaches up on a diagonal and the trunk spirals; the neck turns with the arms (D tip) | once to the left, then the same to the right (反対側も同様に; no repeat bracket) (fact-check 2026-09-29) | natural |
| 8 | `rts_arms_up_down` | Hands to the shoulders, arms up quickly, back to the shoulders, hands to the knees | 2 (fact-check 2026-09-29) | natural |
| 9 | `rts_diagonal_bend` | One slow bend down to the left, rise, big breath in and open the chest | 2 per side | in as the chest opens (D) |
| 10 | `rts_trunk_circle` | Arms draw a big circle as the trunk circles | 2 each way | natural |
| 11 | `rts_shoulder_shake` (replaces the hops) | Relax the shoulders and arms and lightly shake the shoulders 8 times (肩や腕の力を抜いて8回軽く肩をゆする) | 8 × 2 | natural |
| 12 | `rts_arm_swing` (repeat of 2, slower) | Slow, to bring the pulse back down (D tip) | 8 (fact-check 2026-09-29) | natural |
| 13 | `rts_deep_breath` | Arms rise from the front as you breathe in; lower out to the sides as you breathe out | 4 (fact-check 2026-09-29) | in up, out down (D) |

- **Schema recommendation.** A **separate flow item** rather than a `variants.seated` on `radio_taiso_1`. Moments filter by `posture` per exercise (Desk reset, On the road, 75+), which a variant cannot express, and the seated steps are real, different clips. Steps are `flowOnly`. Same count (about 1 count per second), same total (about 3 minutes).
- **Cues (flow).** "Sit tall near the front of a sturdy chair, feet flat" **[practice; the sheet's own chair set-up could not be read]** (fact-check 2026-09-29: the Kampo seated sheet has no chair set-up text at all; the cue is Kitaeru's) · "Big, relaxed arm movements" · "Skip or shrink anything that pinches".
- **Dosage.** One pass, about 3 minutes, as the standing flow. Osuka's pilot used 3–5 minute bouts, 1–4 times a day, for the standing routine (Osuka 2023).
- **Evidence.** **C.** The seated version has not been trialled; evidence is indirect from the standing routine (Osuka 2024, B).
- **Injuries.** Union of steps: `shoulder` (2, 3, 5, 8), `lower_back` (6, 9, 10), `neck` (7: the sheet asks the neck to turn with the arms; cap the range). No impact, no knee load.
- **Age / low impact.** The default for age ≥ 75, and for `experience: new` with age ≥ 65 in the first 2 weeks (`world-movement.md` §4.6.2 **[practice]**). Works with `lowImpact` by construction.
- **Relations.** `radio_taiso_1` (standing), `seated_trunk_rotation`, `seated_calf_raise`, `paced_breathing`.
- **Animation.** 13 seated clips, `clip.frame: 'rt'`-style shared camera but a seated frame ("rts"). **Front view** (the arm work is frontal) with a chair prop; the pelvis is fixed on the seat and the legs are static (feet flat, knees at 90°). Reuse the upper-body channels of the standing `taiso.js` clips where possible (stretch up, arm circles, arms up and down, chest opener). What's hard: the seated forward bend and diagonal bend need hip flexion from a seated pelvis without the figure sliding off the chair; the trunk circle needs `yawChest` plus lateral lean on a fixed pelvis; the shoulder shake is a small fast vertical scapular oscillation (the rig needs a shoulder-elevation channel, or fake it with `traps`-style clavicle lift).
- **Fact-check.** (1) Order and names against D and the PDF; (2) every step's rep count against the PDF images; (3) the step 11 replacement (shoulder shakes) against D and the NHK seated demonstration; (4) that NHK or the Federation also describes the seated form (independent second source for form, not only existence); (5) chair set-up wording.

**Sources for §2:**
- A. Japan Post Insurance (Kampo): 【図解】ラジオ体操第一・立位. https://www.jp-life.japanpost.jp/radio/instruction/radio_first.html (official)
- B. NHK: ラジオ体操第1・第2 illustrated sheet. https://www.nhk.or.jp/program/radio-taisou/pdf/radio.pdf (official; already in `SRC.nhk`)
- C. NPO National Radio Taiso Federation (全国ラジオ体操連盟): practice FAQ. https://www.radio-exercises.org/archives/category/faq/faq-cate02 (official)
- D. Japan Post Insurance (Kampo): ＜図解＞ラジオ体操第一・座位. https://www.jp-life.japanpost.jp/radio/instruction/radio_first_zai.html and the sheet https://www.jp-life.japanpost.jp/radio/instruction/folder3/radio_dai1_zai.pdf (official)
- E. NHK Enterprises: NHKテレビ体操 座ってもできる 立ってもできる ラジオ体操 (DVD listing). https://www.nhk-ep.com/products/detail/h14426AA (official; confirms a seated No. 1 exists)
- F. Tokyo Shimbun: ＜自分らしく続ける！座ってラジオ体操＞第1（11）両脚で跳ぶ運動, 6 July 2025. https://www.tokyo-np.co.jp/article/418309 (reference; paywalled, existence only)
- G. Japan Post Insurance: music and usage rules. https://www.jp-life.japanpost.jp/radio/abt_csr_rdo_cr.html (official; rights)
- Research: Osuka et al. 2024, J Epidemiol 34(10). https://www.jstage.jst.go.jp/article/jea/34/10/34_JE20230317/_article/-char/en ; Osuka et al. 2023, Geriatr Gerontol Int 23:32–37. https://onlinelibrary.wiley.com/doi/10.1111/ggi.14511 ; Zaccaro et al. 2018. https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2018.00353/full

---

## 3. Baduanjin: the remaining five pieces

All use the existing `BDJ` spread (`tradition: 'baduanjin'`, attribution "Health Qigong Baduanjin (Chinese Health Qigong Association, 2003)", `cultural: 'attributed'`). The three shipped singles are `baduanjin_hold_up_sky`, `baduanjin_draw_bow` and `baduanjin_look_back`. The five below are `flowOnly` today, with clips, native names and verified notes. Promotion completes the "full 8-piece" set of singles.

**Common sources (form):** A = General Administration of Sport, Health Qigong Management Center, 健身气功·八段锦 pages (`SRC.bdA`, `SRC.bdOfficial2`; official); B = Heshan Municipal Health Bureau guide (`SRC.bdB`; official); C = Chinese Health Qigong Association (中国健身气功协会), practitioner article "学练健身气功·八段锦体悟", 7 Nov 2023. https://chqa.org.cn/html/108767-71195.html (official site; a practitioner's commentary, so use for cues, not for the standard). Names/history: Wikipedia (`SRC.bdC`).

**Common evidence.** Tradition grade **B** (Zou et al. 2017, meta-analysis of 19 RCTs: quality of life, sleep, balance, handgrip, trunk flexibility, blood pressure). Trials tested the whole routine, so **single pieces are C**.

**Common dosage.** The standard does each piece 6 times (3 each side for the two-sided pieces), and the last piece 7 times (B: "一左一右为一次, 共做三次"; "七颠"). As a single: **one standard set** (6, or 7 for the heel bounce), 1–2 sets, at the flow's tempo. This keeps singles faithful to the standard.

#### 3.1 `baduanjin_separate_heaven_earth`: Separating heaven and earth
- **Native name.** 调理脾胃须单举 *tiáo lǐ pí wèi xū dān jǔ* (trad. 調理脾胃須單舉) (A, B; already verified).
- **Category / family / planes / posture.** mobility / `flow_qigong` / frontal / standing.
- **Mode.** reps: 6 alternating (3 per side), 1–2 sets.
- **Description.** One palm presses up overhead while the other presses down beside the hip; the arms lengthen against each other, then change. In Qigong the name says it is traditionally said to "regulate the spleen and stomach"; say so only as the tradition's explanation.
- **Cues.** "One hand presses up, one presses down" · "Push through the heels of the hands" (B: 力在掌根) · "Change sides slowly with your breath".
- **Breath.** in as the hands separate, out as they return **[practice; the standard's breath timing is not stated in B]**.
- **Injuries.** `shoulder`. Low impact.
- **Relations.** `rt_side_bend`, `baduanjin_hold_up_sky`.
- **Planner.** Cool-down, Desk reset, After a meal, Wind down, Morning.

#### 3.2 `baduanjin_sway_head_tail`: Swaying the head and tail
- **Native name.** 摇头摆尾去心火 *yáo tóu bǎi wěi qù xīn huǒ* (trad. 搖頭擺尾去心火) (A, B).
- **Category / family / planes / posture.** mobility / `flow_qigong` / frontal + transverse / standing.
- **Mode.** reps: 6 alternating (3 per side), 1 set.
- **Description.** From a horse stance with hands on the thighs, the trunk leans to one side and circles low and across, so the head and tailbone draw opposing arcs. B: keep the neck and the tailbone lengthening away from each other, slow and continuous. C: the sway comes from the hips; moving the knees instead can hurt them.
- **Cues.** "Hands on your thighs, knees soft" · "Lean and circle from your hips, not your knees" · "Keep your neck relaxed and the circle small".
- **Breath.** natural, slow.
- **Injuries.** `neck`, `knee`, `lower_back` (all three exclude it). Low impact.
- **Planner.** **Tradition pools and Library only; never auto-planned** in moments or plans (it carries three injury flags and the most complex coordination of the eight). Swappable with other `flow_qigong` pieces.
- **Fact-check.** The hip-not-knee cue is from C, a practitioner's article on the CHQA site, not the 2003 standard text.

#### 3.3 `baduanjin_touch_toes`: Two hands hold the feet
- **Native name.** 两手攀足固肾腰 *liǎng shǒu pān zú gù shèn yāo* (trad. 兩手攀足固腎腰) (A, B).
- **Category / family / planes / posture.** mobility / `flow_qigong` / sagittal / standing.
- **Mode.** reps: 6, 1 set.
- **Description.** The hands slide down the back and the backs of the legs as the body folds forward, then the arms lead the rise. The standard keeps the knees straight (B: 两膝挺直); Kitaeru softens them (already disclosed in the description) **[adaptation]**. C: extend the arms and lengthen the waist on the way up, rising with a straight back; don't round the back or hunch the shoulders as you rise (C: 伸臂长引腰…直背起身，忌拱背凸肩起身) (fact-check 2026-09-29: "compress the spine" was not C's wording).
- **Cues.** "Slide your hands down your back and legs" · "Fold with soft knees" · "Reach long with your arms as you rise".
- **Breath.** out as you fold, in as you rise **[practice]**.
- **Injuries.** `lower_back`. Suspected osteoporosis: avoid (loaded end-range flexion). Low impact.
- **Planner.** Cool-down, After sport, Wind down. **Excluded** from Morning (early lumbar flexion, `moments.md` §1.1) and After a meal (deep fold).

#### 3.4 `baduanjin_clench_fists`: Punching with angry eyes
- **Native name.** 攒拳怒目增气力 *cuán quán nù mù zēng qì lì* (trad. 攢拳怒目增氣力) (A, B; tone of 攒 cuán already verified).
- **Category / family / planes / posture.** strength / `flow_qigong` / sagittal (small transverse wrist turn) / standing.
- **Mode.** reps: 6 alternating (3 per side), 1–2 sets.
- **Description.** In a horse stance with fists at the waist, one fist punches slowly forward to shoulder height, the arm rotating so the thumb side is up (B: 拳眼向上); the eyes widen and look ahead; the hand opens, circles, grips again and returns to the waist.
- **Cues.** "Horse stance, fists at your waist" · "Punch slowly to shoulder height, thumb side up" · "Open, circle the hand, grip and draw it back".
- **Breath.** out on the punch, in on the return **[practice]**.
- **Injuries.** `knee` (horse stance; use the high stance for knee flags, as the flow does). `wrist` minor. Low impact.
- **Relations.** `horse_stance` (same base), `zhan_zhuang`.
- **Planner.** Before sport (Activate), balance or legs filler in tradition pools, After a meal (high stance).

#### 3.5 `baduanjin_heel_bounce`: Bouncing on the toes
- **Native name.** 背后七颠百病消 *bèi hòu qī diān bǎi bìng xiāo* (trad. 背後七顛百病消) (A, B). The name literally promises that "a hundred illnesses disappear": **never** translate that as a claim; the English name stays "Bouncing on the toes".
- **Category / family / planes / posture.** warmup / `flow_qigong` / sagittal / standing.
- **Mode.** reps: 7 (fixed, as the standard), 1 set.
- **Description.** Rise onto the balls of the feet with the head lifting, pause, then drop the heels so they lightly jolt the floor (B: 两脚跟下落，轻震地面).
- **Cues.** "Rise onto the balls of your feet, head lifting" · "Pause, then let your heels drop softly".
- **Breath.** in as you rise, out as you drop **[practice]**.
- **Injuries.** `ankle`. The heel drop is a small impact: for `lowImpact`, after a big meal and for osteoporosis, **lower the heels slowly with no jolt** **[adaptation]** (`world-movement.md` §4.6.7).
- **Relations.** `calf_raise`, `rt_heel_raise`.
- **Planner.** Cool-down close, Wind down (slow lowering), Morning.

**Fact-check (all five):** promotion changes no movement; check the new standalone reps (one standard set), the "never auto-plan" rule for 3.2, and that no copy turns a couplet name into a health claim.

---

## 4. Chinese stances

### 4.1 `zhan_zhuang`: Standing post

- **English name.** Standing post. **aka** Standing like a tree, Hugging a tree, Standing meditation.
- **Native name.** 站桩 *zhàn zhuāng* (trad. 站樁) — Chinese Medical Qigong Society (站桩功) and Wikipedia. Posture name for the arm form: 三圆式 *sān yuán shì* ("three-circle stance"), with 抱球式 "holding a ball" and 环抱式 "hugging (a tree)" as the two arm heights (A).
- **Tradition.** Propose a **new small card `zhan_zhuang`**. It belongs to several Chinese internal arts and medical Qigong, not to Baduanjin, and it is not a martial "stance" in the horse-stance sense. It was popularised in the 20th century by Wang Xiangzhai (王芗斋, 1885–1963), founder of Yiquan (意拳) **[dates unconfirmed in a second source]** (fact-check 2026-09-29: 1885–1963 and the Yiquan role confirmed in en and zh Wikipedia and Sogou/Baidu Baike (reference sources; history only)).
- **Category / family / planes / posture.** breath (as `world-movement.md` §2.3) / `stance`, level 0.5 (below `horse_stance`) / sagittal / standing. **Open question:** the Library's Breath chip and the moments' breath blocks are "paced breathing only"; if `breath` would pull it into those blocks, use `category: 'strength'` with `breath: { pattern: 'slow' }`.
- **Mode.** hold.
- **Description.** Stand with the feet parallel about shoulder-width apart and the knees slightly bent. Raise the arms in front of the chest into a rounded shape, as if hugging a large tree or holding a big ball, palms facing you, fingers apart and gently curved. Stay still, relaxed but not slack, and breathe slowly.
- **Cues.** "Feet shoulder-width, knees soft" · "Arms rounded at chest height, as if hugging a tree" · "Shoulders down; relaxed, not slack" · "Breathe slowly; never hold your breath".
- **Form detail (A).** Feet parallel, shoulder-width or slightly wider; knees slightly bent; in the ball-holding form the palms and fingertips face each other at chest height; in the tree-hugging form the palms face the body about two *chi* (roughly 60 cm) in front of the chest; high, middle and low stance heights. Relax the whole body "while keeping the posture" (松而不懈) (A, practice literature).
  - **Corrections (fact-check 2026-09-29).** (1) In A's 三圆式 the toes turn slightly **in** (两足尖内扣, the "foot circle", 足圆), not parallel; A's parallel-feet wording belongs to the 自然式. Lyu 2021's Table 1 (source E) also has "toes slightly point inside". Parallel feet in Kitaeru would be a disclosed **[adaptation]**. (2) A separates 抱球式 and 环抱式 by **how much the arms bend** (屈曲较小 / 屈曲较大), not by height; both are at chest height (高度与胸相平). (3) 松而不懈 appears in A's 少林剑指站桩 section, not the 三圆式 text. (4) Stance heights in A: high = knees slightly bent; middle = knee angle about 130°; low = about 90°.
- **Breath.** natural at first, gradually slower and lower (abdominal) (A). Kitaeru: natural, slow; the breath ring on.
- **Dosage and reasoning.** Medical Qigong practice starts at 15 minutes, building to 60, 2–3 times a day (A); that is a clinical practice dose, not a fitness prescription. Kitaeru default: **30–60 s at a high stance**, 1–3 sets; progress to 2–3 min, then to a medium stance, up to 5 min **[practice]**. Progress depth before duration, as for the horse stance (`world-movement.md` §1.3).
- **Regressions / progressions.** Easier: arms lower (hands at the belly) or by the sides (A: 自然式); higher stance. Harder: medium, then low stance; longer holds. Leads to `horse_stance` (deeper, wider). Relations: `taichi_commencement`, `baduanjin_ready`.
- **Injuries.** `knee` (high stance only); `shoulder` (hands lower). Blood pressure: the sustained arm hold is isometric; **never hold the breath** (as the horse-stance card). Stop if dizzy, and sit down.
- **Evidence.** **C (indirect).** An RCT in 144 anxious college students compared three-circle zhan zhuang with and without abdominal breath regulation, 5 times a week for 8 weeks, with no non-practice control arm (Lyu et al. 2021, Medicine; I could read only the abstract, which describes the design, not the results), so it cannot show an effect of the practice itself. (fact-check 2026-09-29: the paper is a **published protocol**, written in the future tense, with two practising arms and no non-practice control; it reports no results.) Two Parkinson's trials are protocols only. Indirect support: isometric holds lower resting blood pressure (Edwards et al. 2023), but zhan zhuang's arm-and-knee hold is much lighter than a wall squat. Copy: "a still, standing hold that trains patient legs, relaxed shoulders and slow breathing".
- **Cultural note.** In Yiquan and medical Qigong it is also practised as a standing meditation for cultivating *qi*. Say "in Chinese tradition it is also a standing meditation"; make no *qi* claim as fact.
- **Animation.** Front view (the rounded arms read best from the front; three-quarter is also good). Static pose with the breath ring, a **subtle sway** (§2.2.9) and a tiny rise and fall of the chest. Hard: rounded arms need forearm pronation so the palms face the chest, and elbows slightly lower than the wrists; hand shape relaxed open palm (`handShape: 1`), fingers apart. Stance levels via `stanceLevels`.
- **Sources.**
  - A. China Medical Qigong Society (中国医学气功学会): 站桩功, 20 Nov 2015. http://www.cmqg.cn/Home/Details/1573bded-fac8-4b55-b53c-a2f479de4e28 (official society; primary for form)
  - B. Lam Kam Chuen, *The Way of Energy* (Gaia Books, 1991), on zhan zhuang ("standing like a tree") **[not read in this research: cite only after the fact-checker confirms the page]**
  - C. Wikipedia: Zhan zhuang. https://en.wikipedia.org/wiki/Zhan_zhuang (name and romanisation only)
  - D. Baidu Baike: 浑圆桩. https://baike.baidu.com/item/%E6%B5%91%E5%9C%86%E6%A1%A9/3205279 (name, Wang Xiangzhai attribution; reference)
  - E. (added, fact-check 2026-09-29) Lyu J et al. 2021, Medicine 100(24), Table 1 "Composition of three circle standing qigong" (Beijing University of Chinese Medicine): feet apart, toes slightly in, arms hold a circle, hands hold a circle, slow abdominal breath. https://pmc.ncbi.nlm.nih.gov/articles/PMC8213330/ (academic; independent second source for the form, brief)
  - Research: Lyu J et al. 2021, Medicine (RCT protocol/report, PMID 34128894). https://pmc.ncbi.nlm.nih.gov/articles/PMC8213330/ ; Edwards et al. 2023, BJSM. https://pubmed.ncbi.nlm.nih.gov/37491419/
- **Fact-check.** 站桩 characters and tones in 2 sources; the arm heights and distances in A; Wang Xiangzhai's dates and the Yiquan attribution; a second *form* source independent of A (B, or a Yiquan association); that Lyu 2021 had no non-practice control.

### 4.2 `bow_stance`: Bow stance

- **English name.** Bow stance. **aka** Forward stance, Mountain-climbing stance (登山步).
- **Native name.** 弓步 *gōngbù* (same in traditional characters) — Guangzhou College of Technology and Business wushu course (A) and Wikipedia: Wushu stances (C).
- **Tradition.** Group under the existing `horse_stance` tradition, and **widen that card** from "Horse stance" to the family of basic wushu stances (步型 *bùxíng*): see §5.5. Bow stance is one of the five basic stances of contemporary wushu (A lists 弓步、马步、仆步、虚步、歇步).
- **Category / family / planes / posture.** strength / `stance`, level 0.8 / sagittal / standing. `unilateral: true`.
- **Mode.** hold, per side.
- **Description.** Take a long step forward. Bend the front knee to a half squat with the knee over the ankle and foot, the front foot pointing forward with the toes slightly in. Straighten the back leg, back foot angled forward, **both heels flat**. Trunk upright and facing forward, fists at the waist.
- **Form detail (A).** Front foot a big step forward, toes slightly turned in; knee bent to a half squat, knee vertically above the toes; back leg straight, toes angled forward; both feet flat. Teaching sources add: thigh near horizontal in the full form; "front leg bent like a bow, back leg straight like an arrow" (B).
- **Kitaeru form.** A **high bow stance** by default: a shorter step and the front thigh well above horizontal, like the bow stance of the Tai Chi forms already in the app **[adaptation: depth]**. Hips square to the front.
- **Cues.** "Long step forward, both heels down" · "Front knee over your ankle, back leg long" · "Hips and chest face forward; fists at your waist" · "Breathe slowly".
- **Breath.** slow, natural; never hold.
- **Dosage and reasoning.** 20–30 s per side, 2–3 rounds, at a high stance; progress to 45–60 s, then lower **[practice]**. Matches the isometric-hold logic of `horse_stance` and the 20–30 s holds used elsewhere in the app.
- **Regressions / progressions.** Easier: shorter stance, a hand on a wall or chair (`wall` optional). Harder: lower (thigh towards horizontal), longer. Relations: `split_squat` (dynamic cousin), `hip_flexor_stretch`/`standing_hip_flexor_stretch` (the back leg's hip flexors are stretched), `taichi_part_horse_mane` and `taichi_brush_knee` (which step into it), `virabhadrasana_2` (a turned-out relative).
- **Injuries.** `knee` (high stance; knee must track over the foot), `ankle` (back heel down). Low impact.
- **Evidence.** **C (indirect)**, as the horse stance: isometric leg holds (Edwards 2023); no trials of 弓步 itself. Copy: "builds strong legs and a steady base".
- **Animation.** Side view (sagittal), or three-quarter to match the Tai Chi frame. Hard: back foot turned out about 45° with the heel down (`footTurn`), back knee straight, pelvis square (a little `yawPelvis` if three-quarter); weight about 70/30 front (C). Slight breath ring; subtle sway.
- **Sources.**
  - A. Guangzhou College of Technology and Business: university wushu course plan, basic stances (弓步). https://www.gzgs.edu.cn/__local/7/D6/39/AB29C045F11DC31F11D99E4EC9C_E7669F1F_27A40B.pdf (already `SRC.horseGzgs`; university teaching; primary for form)
  - B. Wushu teaching references on 弓步, e.g. Jiaoyubao: 武术基本功步型的教学. https://hudong.jiaoyubao.cn/xxjy/389323.html and Baidu Baike: 弓步. https://baike.baidu.com/item/%E5%BC%93%E6%AD%A5/9911581 (reference; weaker)
  - C. Wikipedia: Wushu stances. https://en.wikipedia.org/wiki/Wushu_stances (name only)
  - D. (added, fact-check 2026-09-29) Zhengzhou municipal standard DB4101/T 73—2023 《少林武术基本动作要求》 (Zhengzhou Market Supervision Administration, issued 2023-10-20), §5.3 步型, §5.3.1 弓步: 两脚前后站立，前腿屈膝半蹲，脚尖微内扣，后腿蹬直，脚尖斜向前方. https://www.shaolinkungfu.edu.cn/ueditor/php/upload/file/20231229/1703820828137111.pdf (official local standard; the stronger second form source; replaces B)
  - Note (fact-check 2026-09-29): the "about 70/30 front" weighting in the Animation line comes only from Wikipedia (C), which is not a form source; treat it as an animation choice. "Fists at the waist" and "trunk upright" are in neither A nor D: they are Kitaeru's presentation.
- **Fact-check.** 弓步 gōngbù in 2 sources; form per A; a stronger second form source (e.g. a Chinese Wushu Association or university textbook) because B is weak; that "high bow stance" is disclosed as Kitaeru's depth.

---

## 5. Yoga

**Tradition id:** `yoga` (new card, §6). **Cultural rules (§5 of `world-movement.md`):** no chanting, no mantras, no *bīja* sounds, no prāṇāyāma or chakra claims. Sūrya Namaskār gets the neutral name "Sun Salutation" and an optional note that many practise it as devotion to Sūrya, the sun. Attribution per item.

**Tradition evidence.** **B:** in adults aged 60+, yoga had a small effect on balance (Hedges' g 0.40, 6 trials, 307 people) and a medium effect on mobility (g 0.50, 3 trials) (Youkhana et al. 2016). Effects on falls are unproven. Single poses are **C**.

### 5.1 `surya_namaskar`: Sun Salutation

- **English name.** Sun Salutation. **aka** Surya Namaskar.
- **Native name.** सूर्यनमस्कार *sūryanamaskāra* (Wikipedia gives this form; `world-movement.md` §2.5 wrote सूर्य नमस्कार with a space; both occur). The romanisation also appears in the Aundh title ("Surya Namaskars") and on Sivananda pages. **[Devanagari confirmed in one source only]** (fact-check 2026-09-29: now confirmed in a second source: The Art of Living's Hindi page uses both सूर्य नमस्कार and सूर्यनमस्कार; either spelling is attested.)
- **Variant chosen: the Sivananda 12-position sequence**, as taught by Swami Vishnudevananda (Sivananda Yoga Vedanta Centres), published in his *Complete Illustrated Book of Yoga* (1960). **Why this one:** it is published by the school itself (A, B); it is the sequence already sketched in `world-movement.md` §2.5; it has no inversions and no neck-loaded poses; and it is widely taught. Rejected: the **Aundh "Ten-Point" method** (the Rajah of Aundh, English edition J. M. Dent 1938), which holds the breath through most positions and ties positions to medical claims (C); the **Ashtanga A/B** sequences (jump-throughs and chaturanga: too hard for a default); and the **Bihar School / AYUSH 12-step** variant, whose official booklet (D) returned HTTP 403 during this research and could not be read.
- **Attribution.** "Sun Salutation in the Sivananda tradition (Swami Vishnudevananda, 1960). Popularised by the Rajah of Aundh in the 1920s–30s."
- **Category / family / planes / posture.** flow / `flow_sequence` / sagittal / standing to floor and back (`space: 'small'`, a mat).
- **Mode.** flow, 12 positions per half-round; **one round = two halves** (right leg leads, then left) (A).
- **Sequence (A, B).** Kitaeru's own step ids; the Sivananda pages give no Sanskrit name per position, so the steps have **no native names** (do not borrow the Bihar-school names).

| # | Position (A) | Step id (anim) | Breath (A) | Kitaeru |
|---|---|---|---|---|
| 1 | Stand tall, feet together, palms together at the chest | `sn_prayer` (new) | out | – |
| 2 | Arms stretch up and back; arch back from the waist, hips forward | `sn_raised_arms` (new) | in | small arch only |
| 3 | Fold forward, palms flat beside the feet, fingertips in line with the toes | `sn_forward_fold` (new) | out | knees bent as needed |
| 4 | Step the right (then left) leg back, knee down; arch and look up | `sn_low_lunge` (new) | in | – |
| 5 | Step the other leg back to a plank, weight on hands and toes | `plank` (reuse) | **retain** | **breathe normally; no hold** **[adaptation]** |
| 6 | Lower knees, then chest, then forehead; hips stay up | `sn_knees_chest` (new) | out | – |
| 7 | Lower the hips, point the toes, lift the chest into a backbend (cobra); look up | `cobra_stretch` (reuse or a flow copy) | in | low cobra, elbows bent |
| 8 | Curl the toes under, lift the hips to an inverted V; heels and head towards the floor | `sn_downward_dog` (new) | out | heels needn't touch |
| 9 | Step the right (then left) foot between the hands, other knee down; look up | `sn_low_lunge` (mirrored) | in | hand may help the foot forward |
| 10 | Bring the back foot forward; fold | `sn_forward_fold` | out | – |
| 11 | Rise with the arms forward, up and back; arch | `sn_raised_arms` | in | – |
| 12 | Stand, arms by the sides | `sn_prayer` / `sn_stand` | out | – |

- **Cues (flow).** "One breath for each position" · "Hands stay where they land until you stand" · "Bend your knees in the folds and lunges as much as you need" · "Keep every backbend small and comfortable".
- **Breath.** as the table, with position 5 changed to a normal breath. **The Sivananda breath retention in position 5 is not taught** (`world-movement.md` §4.6.8: never a breath hold) **[adaptation]**; disclose: "Some traditions hold the breath in the plank; Kitaeru keeps breathing."
- **Dosage and reasoning.** Sivananda: start with 4 rounds and build up to 12 (B). Each position is about one breath, so one round (24 positions) is about 1.5–2.5 min at 4–6 s per breath (`world-movement.md` §4.3). Kitaeru: **2 rounds** (about 4 min) to start, progressing to 4 rounds (about 8 min) **[practice]**. Progression stages: slower tempo → more rounds → knee-down plank to full plank.
- **Regressions / progressions.** Easier: knees down in the plank; "half salutation" (positions 1–3 and 10–12 only, standing) **[adaptation]**; bent knees in the folds. Harder: more rounds, slower. **No chair version is sourced** (`world-movement.md` §4.6.6 asks for one); do not invent one without a source. Relations: `plank`, `cobra_stretch`, `inchworm`, `standing_hamstring_stretch`, `hip_flexor_stretch`, `childs_pose`, `dand` (a related wrestler's arc).
- **Injuries.** Union: `wrist` (plank, dog), `shoulder` (plank, dog), `lower_back` (cobra, arch, folds), `neck` (look-ups; keep the gaze level). The flow drops no steps, so **exclude it for `wrist` and `lower_back`** (`world-movement.md` §4.6.6). Low impact. Blood pressure / glaucoma: the head-down fold and dog are commonly cautioned **[practice; unconfirmed in a primary source]**. 65+: offer the half salutation.
- **Evidence.** **C.** A 2026 systematic review found 14 small, heterogeneous studies of Sūryanamaskār with mixed risk of bias and synthesised them only narratively (Choudhary et al. 2026). Copy: "a flowing sequence that moves your whole body with your breath", no outcome claim.
- **Cultural note.** Traditionally performed facing the rising sun, and in some traditions each position has a mantra to Sūrya (A, E). Kitaeru teaches the movements only. Card note optional: "Many people practise it as a salutation to the sun."
- **Animation.** Side view (sagittal), one shared frame ("sn"), anchor switching from feet → hands+feet → feet. **Hard parts:** (1) the step back and step forward between the hands (foot travel under the body with the hands planted: reuse the `release`/`plantX` and step channels from the inchworm and bear crawl); (2) knees-chest-forehead (position 6: hips high while chest and chin touch the floor; weight on knees, chest, hands); (3) the cobra transition sliding forward; (4) the dog with heels lifting. Mirror for the second half (`side: 'both'`). Breath ring on every step. Tempo: steady, 4–6 s per position, no pauses.
- **Sources.**
  - A. Sivananda Yoga Vedanta Centres (India): The Sun Salutation. https://sivanandayoga.org/teachings/the-sun-salutation/ (school; primary for this variant)
  - B. Sivananda Yoga Vedanta Centre Canada: Sun Salutation (Surya Namaskar), 12 steps. https://sivanandacanada.org/teachings/the-sun-salutation/ (same organisation as A, **not independent**)
  - C. Rajah of Aundh (Bhawanrao Pant Pratinidhi), *The Ten-Point Way to Health: Surya Namaskars*, ed. Louise Morgan (J. M. Dent, London, first published 1938) (primary for history; rejected as a variant)
  - D. Ministry of AYUSH: Surya Namaskar booklet. https://yoga.ayush.gov.in/ministryofayush/SuryaNamaskar.pdf (official; **HTTP 403, not read**)
  - E. Wikipedia: Sun Salutation. https://en.wikipedia.org/wiki/Sun_Salutation (names and history only)
  - F. Swami Vishnudevananda, *The Complete Illustrated Book of Yoga* (1960) **[not read; the fact-checker should confirm the 12 positions and position 5's breath against it]** (fact-check 2026-09-29: not read by the checker either)
  - G. (added, fact-check 2026-09-29) Department of Tourism, Government of Kerala: Surya Namaskar. https://www.keralatourism.org/yoga/popular-asanas/surya-namaskar (official state body; **independent of Sivananda**). Same 12 positions and breath pattern: exhale (1), inhale (2), exhale (3), inhale with the right leg back (4), **hold the breath** in the plank (5), exhale with knees, chest and **forehead** to the floor (6), inhale (7), exhale into the inverted V (8), inhale with the right foot forward (9), exhale (10), inhale (11), exhale (12).
  - Note (fact-check 2026-09-29): A writes "the left (or right) leg" in position 4; G steps the right leg back first. Either order is sourced.
  - Note (fact-check 2026-09-29) on C's date: both dates are right for different books. The Rajah's own *Surya Namaskars – For Health, Efficiency & Longevity* was first published in 1928 (Wikipedia: Bhawanrao Shriniwasrao Pant Pratinidhi; Indica Yoga's review of the book); *The Ten-Point Way to Health*, edited by Louise Morgan, is the 1938 J. M. Dent edition (Wikipedia; Wellcome Collection). The Rajah wrote that his method was "in fundamentals the age-old method", practised by his father for 55 years (Wellcome Collection).
  - Note (fact-check 2026-09-29): the claim that the Aundh method ties positions to tuberculosis, liver and spleen claims was **not checked**; it is used only to reject that variant and must not reach the copy.
  - Research: Choudhary et al. 2026, Healthcare 14(13):1924. https://www.mdpi.com/2227-9032/14/13/1924 ; Youkhana et al. 2016, Age Ageing. https://pubmed.ncbi.nlm.nih.gov/26707903/
- **Fact-check.** (1) the 12 positions and breath per position against A and an **independent** second source (F, or D if it loads); (2) position 6 is knees-chest-**forehead** in A (the old §2.5 sketch said "chin"); (3) Devanagari in a second source; (4) the Aundh book's date: its English edition's imprint says first published 1938, while Wikipedia and `world-movement.md` §1.7 say 1928 (possibly a Marathi original; **unconfirmed**); (5) the breath-hold adaptation is disclosed.

### 5.2 `vrikshasana`: Tree pose

- **Native name.** वृक्षासन *vṛkṣāsana* — Common Yoga Protocol (A) gives Vṛkṣāsana; Wikipedia (D) gives the Devanagari.
- **Attribution.** "Tree pose, from yoga āsana; one of the few standing poses recorded in medieval hatha yoga" (D, history only).
- **Category / family / planes / posture.** `category: 'balance'`. Family is an open decision: `stance` (a legs ladder) fits a one-leg pose badly, `skill_balance` is the arm-balance ladder, and `taichi_golden_rooster` sits in the tradition-specific `flow_taichi`. **Proposal: a small generic family `balance_hold`** (`progression: false`), or `mobility` with `category: 'balance'`. **Founder/Engine decision** (§9.6). Planes frontal (hip external rotation); standing; `unilateral: true`.
- **Mode.** hold, per side.
- **Description.** Stand with the feet close together and fix your gaze on a point ahead. Bend one knee and place that foot on the inside of the standing thigh (A, B). Join the palms at the chest, and then, if steady, raise them overhead (A, B) (fact-check 2026-09-29: A raises the arms straight overhead and joins the palms there, with the heel of the bent leg at the perineum, i.e. high on the inner thigh; the palms-at-the-chest first step is from B and The Art of Living). Breathe normally, then lower the arms and the leg and change sides.
- **Kitaeru form.** Levels **[adaptation]**: (1) toes on the floor, heel against the ankle; (2) sole on the inner calf; (3) sole on the inner thigh (the full pose). **Never press the foot on the side of the knee** **[practice; widely taught; no primary source found]**. Hands at the chest by default.
- **Cues.** "Gaze at one still point" · "Press the foot and the leg into each other" · "Stand tall; hands at your chest, or overhead if steady" · "A wall or chair nearby".
- **Breath.** natural (A: breathe normally).
- **Dosage and reasoning.** A: hold 10–30 s per side; Iyengar-style classes use longer holds. Kitaeru: **15–30 s per side, 2 rounds**, which also meets the single-leg balance dose used in the balance block **[practice]**.
- **Regressions / progressions.** As the three foot levels; then arms overhead; then a softened gaze (never eyes closed for 65+, `world-movement.md` §4.4). Relations: `taichi_golden_rooster` (sister hold), `single_leg_calf_raise`, `single_leg_rdl`.
- **Injuries.** `ankle`, `knee` (standing leg; and the bent knee in hip external rotation), `hip`. A: avoid with **arthritis** and **vertigo**; map vertigo to "use a wall; skip if dizzy". Low impact.
- **Evidence.** **C** for the pose. Balance-challenging exercise prevents falls in older adults (Sherrington 2019, grade A for exercise programmes), and yoga improved balance in 60+ (Youkhana 2016, B), but the pose itself has not been trialled. Copy: "trains one-leg balance and steady ankles".
- **Animation.** Front view. Hard: the bent leg's hip external rotation (thigh out to the side, knee pointing out) needs thigh yaw or foreshortening; the foot must sit on the standing leg (contact constraint). **Subtle balance sway** (§2.2.9), not a freeze. Arms: palms together at the chest, optionally overhead.
- **Sources.**
  - A. Ministry of AYUSH, *Common Yoga Protocol* (4th revised edn, May 2019, MDNIY), Vṛkṣāsana pp. 15–16. https://www.mea.gov.in/images/pdf/common-yoga-protocol-english.pdf (official)
  - B. Department of Tourism, Government of Kerala: Vrikshasana – the tree pose. https://www.keralatourism.org/yoga/standing-postures/vrikshasana (official state body; reference)
  - C. B.K.S. Iyengar, *Light on Yoga* (1966), Vṛkṣāsana (not in the illustrated edition I could search; **unread**)
  - D. Wikipedia: Tree pose. https://en.wikipedia.org/wiki/Tree_pose (name and history)
- **Fact-check.** Name in A and D; foot placement and hold times in A; the "not on the knee" cue needs a source or stays [practice]; the family decision.

### 5.3 `virabhadrasana_2`: Warrior II

- **Native name.** वीरभद्रासन II *vīrabhadrāsana II* — Iyengar (A) gives "Virabhadrasana II"; Wikipedia (C) gives the Devanagari. **[Devanagari confirmed in one source]** (fact-check 2026-09-29: वीरभद्रासन now confirmed in a second source, The Art of Living's Hindi pages. The same page describes Warrior II (front foot 90°, front knee in line with the heel and not past the ankle, arms at shoulder height) and is an independent second form source. The checker could **not** read *Light on Yoga*; its 4–4½ ft, 20–30 s and palms-down details remain unconfirmed by the checker.)
- **Attribution.** "Warrior II, from modern yoga (B.K.S. Iyengar, *Light on Yoga*, 1966)". **History note:** the name commemorates Vīrabhadra of Hindu myth, and the pose is not recorded in hatha yoga before the 20th century; it resembles poses in Niels Bukh's early-20th-century gymnastics (C, history only). A good, honest "roots" story (`world-movement.md` §5.1.5).
- **Category / family / planes / posture.** strength / `stance` (level 1.5, after `horse_stance`; a one-sided wide stance) / frontal / standing; `unilateral: true`; `space: 'medium'`.
- **Mode.** hold, per side.
- **Description (A).** Step the feet wide apart (Iyengar: 4–4½ ft, from a jump; Kitaeru steps, no jump). Raise the arms to shoulder height, palms down. Turn the front foot out 90° and the back foot slightly in. Bend the front knee until the thigh is parallel to the floor with the shin vertical, the knee over the heel and not beyond the ankle. Stretch the arms out as though pulled from both ends; turn the head and look over the front hand. The back leg stays straight and strong.
- **Kitaeru form.** A **shallower front knee** by default (thigh above parallel) **[adaptation: depth]**; step, don't jump.
- **Cues.** "Feet wide; front foot turns out, back foot turns in a little" · "Bend the front knee over the ankle; back leg straight" · "Arms long at shoulder height; look over your front hand".
- **Breath.** slow and even (A: deep breathing).
- **Dosage and reasoning.** A: 20–30 s per side. Kitaeru: **20–30 s per side, 2 rounds**; progress depth, then time (to 45 s) **[practice]**.
- **Regressions / progressions.** Easier: shorter stance, less knee bend, hands on the hips. Harder: thigh to parallel; longer holds. Relations: `bow_stance`, `horse_stance`, `cossack_squat`, `split_squat`, `trikonasana` (same foot set-up).
- **Injuries.** `knee` (front knee over the ankle, tracking the second toe), `shoulder` (arms can rest on the hips), `hip`. Low impact.
- **Evidence.** **C.** Copy: "builds strong legs and open hips".
- **Animation.** **Front view** (as `world-movement.md` §2.5). Hard: front foot turned 90° (the foot seen in profile from the front, `footTurn`), front knee bending sideways in the picture plane, head turned to the side (`neckYaw` about 70–90°). Weight about even.
- **Sources.**
  - A. B.K.S. Iyengar, *Light on Yoga* (George Allen & Unwin 1966; HarperCollins/Thorsons editions), Virabhadrasana II, technique steps 1–9 (primary). Read in an illustrated edition; **cite the book, not an online scan** (the online copies I found are unlikely to be authorised).
  - B. Yoga Journal: Warrior II pose. https://www.yogajournal.com/poses/warrior-ii-pose/ (reference; redirected to a login during research, **unread**) — or another Iyengar-lineage teaching page (the fact-checker should find one).
  - C. Wikipedia: Virabhadrasana. https://en.wikipedia.org/wiki/Virabhadrasana (name and history only)
- **Fact-check.** Form against A (knee over heel, thigh parallel, 20–30 s); **find a second independent form source** (B is unread); Devanagari; the Niels Bukh note is history-only and must be framed as "has been suggested".

### 5.4 `trikonasana`: Triangle pose

- **Native name.** त्रिकोणासन *trikoṇāsana* — Common Yoga Protocol (A: Trikoṇāsana) and Wikipedia (C: उत्थित त्रिकोणासन *utthita trikoṇāsana*, "extended triangle"). Use `aka: ['Extended triangle', 'Utthita trikonasana']`.
- **Attribution.** "Triangle pose, from yoga āsana."
- **Category / family / planes / posture.** mobility / `mobility` / frontal / standing; `unilateral: true`; `space: 'medium'`.
- **Mode.** hold, per side.
- **Two published forms.** A (AYUSH): feet about 3 ft apart, arms to shoulder height, turn the right foot out, bend sideways and place the right fingers behind the right foot, left arm in line above, gaze at the top hand; 10–30 s; "if one cannot touch the feet, one can reach for the knees instead". B (Iyengar): feet 3–3½ ft apart, right foot out 90°, left foot slightly in, both knees straight, right palm near the right ankle (or on the floor), left arm up in line, back of legs, chest and hips in one plane; 30–60 s. **Recommendation: A's form with A's regression**, hand on the shin by default **[adaptation: hand height]**.
- **Description.** Stand with the feet wide and the arms out at shoulder height. Turn the front foot out. Breathe out and hinge sideways over the front leg, reaching the lower hand down the shin as far as is comfortable, the top arm reaching up in line with it. Look up towards the top hand, or ahead if the neck prefers. Breathe in to come up.
- **Cues.** "Feet wide; front foot turns out" · "Tilt sideways from the hip; lower hand on your shin" · "Top arm reaches up in line; chest faces forward" · "Both legs long, knees soft, never locked".
- **Breath.** out as you tilt, in to rise; normal breathing in the hold (A, B).
- **Dosage and reasoning.** A: 10–30 s; B: 30–60 s. Kitaeru: **20–30 s per side, 2 rounds** (the app's flexibility rule, holds of 10–30 s, about 60 s per muscle; Garber 2011).
- **Regressions / progressions.** Easier: hand on the thigh or knee (A), or a hand on a chair seat. Harder: hand lower to the ankle, longer holds. Relations: `standing_windmill` (the dynamic relative), `rt_side_bend`, `standing_hamstring_stretch`, `virabhadrasana_2`.
- **Injuries.** `lower_back` (A: avoid with slipped disc, sciatica, and after abdominal surgery; don't overdo the lateral stretch), `neck` (look ahead instead of up), `hip`, `knee` (don't lock). Low impact.
- **Evidence.** **C.** Copy: "stretches the sides of your trunk and the backs of your legs".
- **Animation.** **Front view**. Hard: pure lateral trunk flexion over the front leg with the pelvis tilting too; front foot turned out; arms in one vertical line; `neckYaw` up to face the top hand. The lower hand's contact on the shin (`grip: 'world'` placement as in the windmill).
- **Sources.**
  - A. Ministry of AYUSH, *Common Yoga Protocol* (2019), Trikoṇāsana p. 18. https://www.mea.gov.in/images/pdf/common-yoga-protocol-english.pdf (official)
  - B. B.K.S. Iyengar, *Light on Yoga* (1966), Utthita Trikonasana (primary; cite the book)
  - C. Wikipedia: Trikonasana. https://en.wikipedia.org/wiki/Trikonasana (name only)
  - D. Department of Tourism, Government of Kerala: Trikonasana. https://www.keralatourism.org/yoga/standing-postures/trikonasana (reference; lists it with a 30 s hold)
- **Fact-check.** Form, holds and cautions in A; B's differences recorded; name in A and C.

---

## 6. Makkō-hō and Systema

### 6.1 `makko_ho`: Makkō-hō (four stretches)

- **English name.** Makkō-hō. **aka** Makko-ho exercises, Makkoho.
- **Native name.** 真向法 *makkōhō* (まっこうほう) (fact-check 2026-09-29: reading and 長井津 ながい わたる confirmed in the Sasakawa Sports Foundation dictionary and Kotobank) — the association's site (A) and the Kotobank dictionary entry (Kyodo News glossary and Britannica Japan) (C). Steps: 第一体操 *dai-ichi taisō* … 第四体操 *dai-yon taisō* ("first exercise" … "fourth exercise") (A).
- **Tradition.** New card `makko_ho`. Created in 1933 (昭和8年) by **Nagai Wataru (長井津)** (A, C). Nagai, born at Shōmangyō-ji temple (勝鬘寺) in Fukui, had a stroke (脳溢血) at 42. While reading the *Śrīmālā Sūtra* (勝鬘経) he noticed the disciples' full seated bows, and he practised that bowing movement until his stiff hips moved freely again: this was the prototype of Makkō-hō (A). The association was authorised as an incorporated association by the Ministry of Education in 1969 (昭和44年) and is today a public-interest incorporated association (公益社団法人真向法協会) (A). Nagai's birth and death years (often given as 1889–1963) are **unconfirmed**: only an unofficial blog gives them, and it notes a discrepancy. The claim in `world-movement.md` §1.5 that some aikidō schools use it as a warm-up is **unconfirmed**; leave it out. (fact-check 2026-09-29: 1889–1963 is also given by WEB秘伝 (BAB Japan) and ja.wikipedia 長井津 (born October 1889), but the Wikipedia article cites only WEB秘伝, so this is one reference source, not two; the National Diet Library lists a 1964 memorial biography, 『真向一途：亡父・長井津の生涯』, consistent with death by 1964. Still not in an official source: keep the dates off the card. For aikidō, one dojo (合心館 Aishinkan, Kyoto/Osaka) states that Makkō-hō is part of its aiki taisō warm-up and reports, as hearsay, that Ueshiba Morihei adopted it after meeting Nagai in 1959; one dojo is not enough for "some aikidō schools".) (fact-check 2026-09-29: the association says Nagai practised the bow for about three years before his hips became supple; 1933 is the founding and start of teaching (A; Kotobank/Kyodo: 1933年から普及活動が始まった).)
- **One flow or singles?** **One flow.** The association presents the four as one routine done in order, about 3 minutes in all (A, B), and each step is a short repeated movement, not a long hold. Steps 1–3 could later be promoted as singles (seated butterfly fold, seated forward fold, straddle fold), but the flow comes first.
- **Category / family / planes / posture.** flow / `flow_sequence` / sagittal (with hip external rotation and abduction) / floor (`posture: 'floor'`), `space: 'small'`.
- **Sequence (A; B confirms the four shapes).**

| # | Step (id, `flowOnly`) | Position and action | Reps (A) | Stress |
|---|---|---|---|---|
| 1 | `makko_1` 第一体操 | Sit with the soles together, knees out, soles turned upwards (A: "the baby's sitting"); fold forward from the hips and come back up | 10 | `hip`, `lower_back` |
| 2 | `makko_2` 第二体操 | Sit with the legs straight together, ankles flexed so the toes point up (A: ankles at a sharp angle, Achilles stretched); fold forward and come back up | 10 | `lower_back` (hamstrings) |
| 3 | `makko_3` 第三体操 | Sit with the legs wide apart, ankles flexed, heels pressing; lengthen the lower back and fold forward; come back up | 10 | `hip`, `lower_back` |
| 4 | `makko_4` 第四体操 | Kneel and sit between the heels, feet hip-width apart and flat on the floor (割座 *wariza*, わりざ; the term is a descriptive gloss, not A's wording) (fact-check 2026-09-29: reading corrected from *warīza*); lean back and lie down, breathing slowly and deeply | about 1 min | `knee`, `ankle`, `lower_back` |

- **Breath (A, "four cautions").** Breathe out slowly as you fold (as the muscles lengthen) and in as you rise: one breath, one movement. **No bouncing or forcing:** "pleasantly tender" is enough. (fact-check 2026-09-29: A's cautions are "never force it" (決して無理をしない) and "fold in big, slow movements" (大きくゆったり倒し); "no bouncing" is Kitaeru's reading of these, and the phrase "pleasantly tender" was not found in A.) Keep the back long as you fold, and always come all the way back up (A). The 2 s out / 1 s in rhythm on Japanese Wikipedia is **unconfirmed** (Wikipedia is not a form source).
- **Cues (flow).** "Breathe out as you fold, in as you come up" · "Fold from your hips with a long back, no bouncing" · "Only as far as feels pleasantly stretchy" · "Come all the way back up each time".
- **Dosage and reasoning.** A: 10 repetitions of steps 1–3 and about 1 minute of step 4; about 3 minutes in all (A, B). This is also close to the flexibility dose in `research.md` (about 60 s per muscle group), spread over repeated folds. Traditionally done on waking or before bed (C, Wikipedia (ja)). Kitaeru: one pass, 3–4 min.
- **Step 4 adaptation (required) [adaptation].** The association itself warns that people with back pain should not force the lean back, and should go gradually (A). Kitaeru default for step 4: **lean back onto the hands, or the elbows, not all the way down**; for `knee` or `ankle` flags, **replace step 4 with a supported kneeling sit or skip it**. The "one-leg version" in `world-movement.md` §1.5 is not in the association's material I found; if used, it must be labelled Kitaeru's. With step 4 skipped the flow keeps 3 of 4 steps, within the "a third dropped" rule.
- **Regressions / progressions.** Easier: sit on a folded blanket (raises the hips) **[practice]**; bend the knees in step 2; smaller straddle in step 3. Harder: slower tempo, more of step 4 over weeks. Relations: `pancake_stretch` (like step 3), `standing_hamstring_stretch` (step 2), `pigeon_stretch`, `childs_pose`, `hip_flexor_stretch`.
- **Injuries.** Union: `lower_back`, `hip`, `knee`, `ankle`. `knee` or `ankle` → skip step 4. Suspected osteoporosis: avoid deep loaded flexion (steps 1–3 in small range). Not after a meal (floor folds). Morning moment: the association recommends waking or bedtime, but Kitaeru's early-morning lumbar-flexion rule (`moments.md` §1.1) says **not in the first hour after waking for users with back pain**. Conflict flagged in §9.
- **Evidence.** **D.** I found no trials of Makkō-hō (Europe PMC search, Sep 2026). General static stretching improves range of motion over weeks (Garber 2011), which is indirect. Copy must not repeat the association's claimed effects (e.g. circulation, posture correction): describe it as "four seated stretches for the hips, legs and back".
- **Cultural note.** Its origin is Buddhist bowing, but Makkō-hō itself is a secular health routine; the association says it was not constructed as physiology or physical education (A). Credit Nagai Wataru and the association by name.
- **Rights note.** The association's page asks that its **illustrations and text are not used without permission** (＊イラスト、文章等の無断使用はご遠慮下さい) (A). Kitaeru must write its own descriptions (as above) and draw its own figures. See §9.
- **Animation.** Four floor clips in one shared frame ("mk"). Steps 1–3 read best in **side view** for the fold, but step 1's knees-out and step 3's straddle are invisible in pure side view: use **three-quarter** for 1 and 3. Hard: hip external rotation with soles together (step 1: thighs splayed, feet together), a wide straddle (step 3: legs in a V seen at an angle), ankles dorsiflexed in 2 and 3, and step 4's knees fully bent with the hips between the heels (deep knee flexion; the thighs must not pass through the calves) and a slow recline onto the elbows. Breath ring on; fold on the exhale.
- **Sources.**
  - A. 公益社団法人真向法協会 (Makkō-hō Association): 真向法体操 (the four exercises) https://makkoho.or.jp/shiru__about3 ; 四つの注意点 (four cautions) https://makkoho.or.jp/shiru__about2 ; 真向法の由来 (origin) https://makkoho.or.jp/shiru__history ; 沿革と活動 (history) https://makkoho.or.jp/activity (official)
  - B. Sasakawa Sports Foundation, sports dictionary: 真向法. https://www.ssf.or.jp/knowledge/dictionary/makkoho.html (independent reference)
  - C. Kotobank: 真向法 (Kyodo News glossary; Britannica International Encyclopedia). https://kotobank.jp/word/%E7%9C%9F%E5%90%91%E6%B3%95-163241 (reference; 1933 date)
  - D. Wikipedia (ja): 真向法. https://ja.wikipedia.org/wiki/%E7%9C%9F%E5%90%91%E6%B3%95 (name and history only; cites 真向法協会『決定版 真向法』, 農山漁村文化協会, 2004, ISBN 978-4540041846)
  - Research: Garber et al. 2011, ACSM position stand. https://pubmed.ncbi.nlm.nih.gov/21694556/
- **Fact-check.** 真向法 reading and 1933 date in A and C; Nagai's name reading わたる (A); the step descriptions and reps in A; the breath rule in A; the step-4 caution in A; that no trial exists; Nagai's life dates remain unconfirmed and must not appear on the card.

### 6.2 `systema_breath_walk`: Breath-paced walk

- **English name.** Breath-paced walk. **aka** Systema breathing walk, Step breathing.
- **Native name.** **None for the drill.** The Russian label "дыхание в шагах" in `world-movement.md` §2.7 is **unconfirmed**: I found no Russian-language source that names the drill; drop it. The tradition's name is Система *Sistema* (Wikipedia, names only).
- **Tradition.** New card `systema`, credited to the lineage the drill comes from: **Mikhail Ryabko and Vladimir Vasiliev** (Systema HQ, Toronto). Wikipedia notes that several unrelated Russian "systemas" exist, so **name the lineage**, do not say "Russian martial arts" in general (`world-movement.md` §5.1.5).
- **Category / family / planes / posture.** breath / `breath` / sagittal / standing. Walking in place by default (`space: 'small'`); walking a circle if there is room (A).
- **Mode.** hold (timed), like `paced_breathing`; the step count per breath is the level.
- **Description (A).** Walk relaxed with a normal posture. Breathe in for one step and out for one step, keeping each breath exactly on the steps. Then make one smooth, continuous in-breath over two steps and one out-breath over two steps, and keep adding a step a few circles at a time, up to about 7 or 8 steps per breath. Then come back down the same way to one step in, one step out (A calls this a "pyramid"). In through the nose, out through the mouth (A's first principle; B).
- **What we leave out.** A's harder variations add **breath holds** between phases (e.g. "inhale, hold, exhale"). They are **excluded**, as are Systema's other breath-hold drills (e.g. a lying breath-hold drill that Vasiliev himself says may over-excite the nervous system). This matches Systema's own principle "keep breathing, without interruption or breath holding" (B) and `world-movement.md` §1.17. (fact-check 2026-09-29: B's principle ends "…unless doing a special breath hold training", and B states that its seven principles are taken from A, so B is **not independent** of A.)
- **Cues.** "Walk tall and loose, on the spot or in a circle" · "In through your nose, out through your mouth" · "Stretch each breath evenly over the same number of steps" · "Never hold your breath; step down a level if you feel short of air or dizzy".
- **Breath.** in for N steps, out for N steps (N = 1 → peak → 1). Walking at about 1.5–2 steps per second, N = 6 is roughly 6–8 breaths per minute, close to the slow-breathing range (Zaccaro 2018) **[calculation, not from A]**.
- **Dosage and reasoning.** One pyramid 1 → 6 → 1 with 3–4 breaths at each level is about 3–5 minutes **[practice]**. Beginners peak at N = 4. Progress the peak by one step when easy; A allows 7–8 or more.
- **Regressions / progressions.** Easier: seated marching (heels lift) with the same counts; lower peak. Harder: a higher peak; a slow jog (A) is a **later** option and not for `lowImpact`. Relations: `paced_breathing`, `marching_in_place`, `rt_deep_breath`.
- **Injuries.** None of the joint ids. Stop if dizzy (breathing too deeply can cause light-headedness). Excluded: holds (all users), pregnancy-specific caution **[practice]**. Low impact.
- **Evidence.** **D** for the drill; Systema's breathing has not been trialled. Slow breathing in general is associated with higher HRV and lower anxiety (Zaccaro 2018, systematic review, B), but that is indirect. Copy: "trains you to keep your breath calm and even while you move". **No** healing claims (the source book carries many; none may be repeated).
- **Cultural note.** The source book frames Systema breathing within Russian Orthodox Christian practice and tells healing stories. Kitaeru teaches the walking drill only, with no religious or healing framing.
- **Animation.** Reuse `marching_in_place` (front or side view) with the **breath ring** synced to N steps per phase, plus a small step counter ("in 3 · out 3"). Tempo must lock the step rate so each phase is a whole number of steps. The ring timing changes per level: the player needs per-level breath markers (the `breath` phase markers in `CONTRACTS.md` flows).
- **Sources.**
  - A. Vladimir Vasiliev with Scott Meredith, *Let Every Breath… Secrets of the Russian Breath Masters* (Russian Martial Art, 2006), ch. 7 "Hit the Road!", Walking; ch. 3 "The Seven Principles". Publisher page: https://systemavasiliev.com/store/product/let-every-breath-book/ (primary). **Cite the book, not the archive.org copy**, which is unlikely to be authorised.
  - B. Systema Sydney (Justin Ho, principal instructor): The Seven Principles of Systema Breathing. http://systemasydneytrainingresources.blogspot.com/2013/06/the-seven-principles-of-systema.html (school; supports the principles and no holds, **not the walking drill**)
  - C. Russian Martial Art (Vasiliev's official site): article 120 on the breathing walk. https://www.russianmartialart.com/article_info.php?articles_id=120 and "Gearshift breathing – the road test", article 16. https://www.russianmartialart.com/article_info.php?articles_id=16 (official; **connection refused during research, unread**; same organisation as A)
  - D. Wikipedia: Systema. https://en.wikipedia.org/wiki/Systema (name and the "several schools" note only)
  - Research: Zaccaro et al. 2018. https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2018.00353/full
- **Fact-check result (2026-09-29).** No second source independent of Vasiliev's organisation was found for the walking pyramid. Checked: russianmartialart.com (connection refused/reset; same organisation), FightClub Toronto (an RMA-HQ-sanctioned school; one step in, one step out, then 10/20/30 steps; affiliate, not independent), Systema Sydney (principles copied from A), USAdojo (a republished Vasiliev article on a lying breath-hold drill), a church workshop outline (no step counts), Russian-language searches (nothing on the drill). Independent health sources do describe step-paced breathing while walking: Asthma + Lung UK ("breathe in for one step and then take either one or two steps as you breathe out"; "two steps in, two steps out") and a University Hospitals Plymouth NHS Trust leaflet; the American Lung Association gives in through the nose, out through the mouth for pursed-lip breathing. These support a **generic** breath-paced walk, not a Systema drill.
- **Fact-check.** **The weakest item.** It needs an independent second source for the walking drill itself (another Systema school's published material, or a second Vasiliev/Ryabko text such as the "Systema Breathing" DVD notes); confirm A's step counts and the nose-in, mouth-out rule; confirm no Russian name is used.

---

## 7. Culture card drafts

Format as the shipped cards (`traditions.js`): 2–3 sentences, no "ancient secrets" framing, native name first, tradition's explanations framed as the tradition's, claims no stronger than the grade, a Sources line and never "Reviewed by". `verified: null` on every new card.

### 7.1 Yoga āsana (`yoga`, new)

- **name** "Yoga" · **nativeName** { text: 'योग', romanised: 'yoga', lang: 'sa' } **[check lang tag and whether to show Devanagari for the tradition name]** · **region** South Asia · **countries** ['IN'] · **era** "Āsana practice mostly 20th century; Sun Salutation popularised 1920s–30s".
- **card:** "Yoga is a South Asian philosophy and spiritual path, of which physical postures, *āsana*, are one part. Most of today's standing poses and flowing sequences took shape in the 20th century, and the Sun Salutation was popularised by the Rajah of Aundh, who wrote that it was already a household practice. In trials, yoga modestly improved balance and mobility in adults over 60. Kitaeru teaches the postures only: no chanting or breath-holding."
- **principles:** 'Link each movement to a breath' · 'Steady and comfortable' · 'Never force a pose' · 'Keep breathing: no breath holds'.
- **trains:** { strength: 1, mobility: 3, balance: 2, breath: 2, coordination: 1 }.
- **evidence:** [{ grade: 'B', claim: 'May modestly improve balance and mobility in adults over 60', cite: 'Youkhana et al. 2016, Age Ageing (meta-analysis)', url: 'https://pubmed.ncbi.nlm.nih.gov/26707903/' }].
- **safety:** 'Bend your knees in forward folds' · 'Keep backbends small' · 'Use a wall or chair for one-leg poses' · 'Plank and dog load the wrists'.
- **attribution:** "Yoga āsana; Sun Salutation in the Sivananda tradition". **sensitivity:** 'attributed'.
- **sources:** Ministry of AYUSH Common Yoga Protocol (official); Sivananda Yoga Vedanta Centres (school); Iyengar, *Light on Yoga* (reference); Wikipedia: Sun Salutation (reference); Youkhana 2016 (research).
- **learnMore:** Ministry of AYUSH Common Yoga Protocol (official, free).
- **families:** ['flow_sequence', 'stance', 'mobility'] · **since** '1.3'.
- **Note on the "household practice" line.** The Aundh book says the method is "age-old" and was his father's practice for 55 years (C in §5.1). "Household practice" follows `world-movement.md` §5.4 and Wikipedia; the fact-checker should confirm the wording or soften it to "an older practice". (fact-check 2026-09-29: "household" is not supported; Wikipedia says "a commonplace Marathi tradition" and the book, as quoted by the Wellcome Collection, says "the age-old method". Use: "…popularised by the Rajah of Aundh, who wrote that it was an age-old practice.")

### 7.2 Makkō-hō (`makko_ho`, new)

- **name** "Makkō-hō" · **nativeName** { text: '真向法', romanised: 'makkōhō', lang: 'ja' } · **region** East Asia · **countries** ['JP'] · **era** "1933–".
- **Card timing (fact-check 2026-09-29).** The association dates the method to 1933, but Nagai's stroke (at 42) and his years of bowing practice came before that. Suggested first sentence: "After a stroke at 42, Nagai Wataru practised the deep bow he had read about in a Buddhist sutra until his stiff hips moved freely again, and in 1933 he began teaching it."
- **card:** "In 1933 Nagai Wataru, recovering from a stroke, began practising the deep seated bow he had read about in a Buddhist sutra, until his stiff hips moved freely again. From it came Makkō-hō, four simple seated stretches done in about three minutes with a slow out-breath on every fold. It is still taught across Japan by the Makkō-hō Association."
- **principles:** 'Breathe out as you fold' · 'No bouncing, no forcing' · 'Keep your back long' · 'Come all the way back up'.
- **trains:** { strength: 0, mobility: 3, balance: 0, breath: 1, coordination: 0 }.
- **evidence:** [] (grade D: no outcome line). If the UI needs a line: { grade: 'D', claim: 'Not yet studied in trials; the stretches work the hips, legs and lower back' }.
- **safety:** 'Skip the fourth stretch if your knees or ankles complain' · 'Lean back only as far as is comfortable' · 'Not straight after a meal'.
- **attribution:** "Makkō-hō, created by Nagai Wataru (1933); taught by the Makkō-hō Association". **sensitivity:** 'attributed'.
- **sources:** makkoho.or.jp (official, 3 pages); Sasakawa Sports Foundation dictionary (reference); Kotobank (reference).
- **learnMore:** Makkō-hō Association (classes across Japan): https://makkoho.or.jp/ · **families:** ['flow_sequence'] · **since** '1.3'.

### 7.3 Systema (`systema`, new)

- **name** "Systema" · **nativeName** { text: 'Система', romanised: 'sistema', lang: 'ru' } · **region** Europe · **countries** ['RU'] · **era** "1990s–".
- **card:** "Systema is a modern Russian martial art, taught internationally since the 1990s by Mikhail Ryabko and Vladimir Vasiliev. It puts calm, continuous breathing at the centre of every movement. Kitaeru borrows one of its simplest drills: walking with your breath paced to your steps, without ever holding it."
- **principles:** 'In through the nose, out through the mouth' · 'Keep breathing: never hold your breath' · 'Stay relaxed' · 'Let the breath lead the movement'.
- **trains:** { strength: 0, mobility: 0, balance: 0, breath: 3, coordination: 1 }.
- **evidence:** [{ grade: 'C', claim: 'Indirect: slow breathing is linked to a calmer heart rhythm; this drill itself has not been studied', cite: 'Zaccaro et al. 2018 (systematic review)', url: 'https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2018.00353/full' }].
- **safety:** 'Step down a level if you feel dizzy or short of air' · 'No breath holds'.
- **attribution:** "Systema breathing, as taught by Mikhail Ryabko and Vladimir Vasiliev". **sensitivity:** 'attributed'.
- **sources:** Vasiliev & Meredith 2006 (primary); Systema Sydney (school); Wikipedia: Systema (reference); Zaccaro 2018 (research).
- **learnMore:** [] (no neutral governing body; don't link a shop) · **families:** ['breath'] · **since** '1.3'.

### 7.4 Standing post (`zhan_zhuang`, new)

- **name** "Standing post" · **nativeName** { text: '站桩', romanised: 'zhàn zhuāng', lang: 'zh-Hans', alt: [{ text: '站樁', lang: 'zh-Hant' }] } · **region** East Asia · **countries** ['CN'] · **era** "Popularised in the 20th century".
- **card:** "In Chinese internal martial arts and Qigong, students often begin by simply standing still, arms rounded as if hugging a tree. Zhan zhuang, 'standing like a post', was popularised in the 20th century by Wang Xiangzhai, the founder of Yiquan, and is also practised as a standing meditation. It trains patient legs, relaxed shoulders and slow, easy breathing."
- **principles:** 'Stand still and relaxed, not slack' · 'Knees soft, shoulders down' · 'Breathe slowly; never hold your breath' · 'Lower the stance over months'.
- **trains:** { strength: 1, mobility: 0, balance: 1, breath: 2, coordination: 0 }.
- **evidence:** [{ grade: 'C', claim: 'Indirect: still, isometric holds lowered resting blood pressure in trials; standing post itself has not been properly trialled', cite: 'Edwards et al. 2023, BJSM', url: 'https://pubmed.ncbi.nlm.nih.gov/37491419/' }].
- **safety:** 'Start high, knees only slightly bent' · 'Lower your arms if your shoulders tire' · 'Sit down if you feel dizzy'.
- **attribution:** "Standing practice of Chinese internal arts and Qigong (zhàn zhuāng)". **sensitivity:** 'attributed'.
- **sources:** China Medical Qigong Society (official); Wikipedia: Zhan zhuang (reference); Edwards 2023 (research).
- **families:** ['stance'] · **since** '1.3'.
- **Alternative (founder's choice):** fold zhan zhuang into the widened stance card below and skip this card.

### 7.5 Updates to shipped cards

- **Horse stance → "Stances" (`horse_stance` id kept).** The id is referenced by verified content, so keep it and change the display: **name** "Martial-arts stances" · **nativeName** { text: '步型', romanised: 'bùxíng', lang: 'zh-Hans' } **[check: 步型 is the wushu term for stance types (A in §4.2 uses it); confirm in a second source]**. **card:** "Chinese martial artists begin with a handful of basic stances: the wide, square horse stance and the long, lunging bow stance among them. Holding them builds strong, patient legs and a steady centre, and teaches you to breathe calmly under effort." Keep the evidence, safety and sources; add the university wushu course as the bow-stance source. Re-verification needed for the changed card copy only.
- **Morning Taisō (`radio_taiso`).** Add one sentence: "There is also an official seated version for anyone who prefers a chair." Add source D (Kampo seated guide) to `sources`. Nothing else changes.
- **Baduanjin (`baduanjin`).** No change needed. Optional safety line: "Lower your heels slowly at the end if you avoid impact or have fragile bones." (for the heel bounce).

---

## 8. Planner integration notes

Blocks and moments as in `CONTRACTS.md` and `moments.md`. ✓ = fits, ★ = a strong default, – = keep out. Only visible, animated items are ever used (the accuracy and animation gates).

### 8.1 Items by block

| id | Warm-up | Cool-down | Mobility / flex | Balance block | Flow / light day | Main | Breath |
|---|---|---|---|---|---|---|---|
| `rt_arm_swing_knee_bend` | ★ (Raise) | ✓ (slow) | – | – | – | – | – |
| `rt_arm_circles` | ✓ (twin of `arm_circles`) | – | – | – | – | – | – |
| `rt_chest_opener` | ✓ | ✓ | ✓ | – | – | – | – |
| `rt_forward_back_bend` | ✓ (not first) | – | ✓ | – | – | – | – |
| `rt_arms_up_down` | ✓ | – | – | – | – | – | – |
| `rt_diagonal_bend` | ✓ | – | ✓ | – | – | – | – |
| `rt_trunk_circle` | ✓ (no back flags) | – | – | – | – | – | – |
| `rt_deep_breath` | – | ★ (close) | – | – | – | – | ✓ (founder decision) |
| `radio_taiso_1_seated` | ★ for 75+ / seated | – | – | – | ✓ (short light day) | – | – |
| Baduanjin ×5 | ✓ (heaven-earth, fists) | ★ | ✓ | – | via `baduanjin_sequence` | ✓ fists (tradition pool) | – |
| `zhan_zhuang` | – | ★ (close, 1–2 min) | – | ✓ (support note) | ✓ | – | ✓ |
| `bow_stance` | – | – | – | ✓ | – | ✓ `stance` slot (legs) | – |
| `surya_namaskar` | ✓ (1 round) | – | ★ (flexibility) | – | ★ (2–4 rounds) | – | – |
| `vrikshasana` | – | – | – | ★ | ✓ | – | – |
| `virabhadrasana_2` | – | – | ✓ | – | ✓ | ✓ `stance` slot | – |
| `trikonasana` | – | ✓ | ★ | – | ✓ | – | – |
| `makko_ho` | – | ★ | ★ | – | ✓ | – | – |
| `systema_breath_walk` | ✓ (easy pulse) | ✓ | – | – | ✓ | – | ★ |

### 8.2 Quick goals and foci

- **`flexibility`:** `surya_namaskar`, `makko_ho`, `trikonasana`, `virabhadrasana_2`, Baduanjin singles, `rt_diagonal_bend`, `rt_forward_back_bend`. At 15+ min, prefer a whole flow (`makko_ho` + 1–2 rounds of `surya_namaskar`).
- **`health`:** Morning Taisō (standing or seated), Baduanjin cool-down, `zhan_zhuang`, `systema_breath_walk`, `rt_deep_breath`.
- **`balance` (goal and block):** `vrikshasana` (second to `taichi_golden_rooster`), `bow_stance`, `zhan_zhuang` (high stance). The balance block's generic fallback (when Tai Chi is hidden) can use `vrikshasana` if yoga is visible.
- **`strength` / `muscle`:** `bow_stance`, `virabhadrasana_2` as `stance` family members (legs pattern, low priority `stance: 9` in `PRI`); `baduanjin_clench_fists` only in tradition pools.
- **Focus `flow`:** `surya_namaskar`, `makko_ho`, `radio_taiso_1_seated` join `availableFlows`. **Focus `balance`:** as above. **Focus `rotation`:** `rt_trunk_circle`, `rt_diagonal_bend` via `planes: ['transverse']`.

### 8.3 Moments

| Moment | Use | Keep out |
|---|---|---|
| Morning wake-up | Standing or seated Morning Taisō first; `rt_arms_up_down`, `rt_chest_opener`, `rt_arm_swing_knee_bend`; `baduanjin_separate_heaven_earth`; `vrikshasana` (15+ min, balance) | `rt_forward_back_bend`, `rt_diagonal_bend` and `baduanjin_touch_toes` in the first 5 min; `makko_ho` for back-pain users; `rt_trunk_circle` |
| Desk reset | **`radio_taiso_1_seated`** (★ at 5 min); `rt_chest_opener`, `rt_arms_up_down`, `baduanjin_separate_heaven_earth`; `zhan_zhuang` (1 min) | floor items (`makko_ho`, `surya_namaskar`), `rt_trunk_circle` |
| Energy boost | `rt_arm_swing_knee_bend`, `rt_arms_up_down` (easy parts); `systema_breath_walk` at a low peak is **not** a burst | long holds |
| After a meal | seated or standing Morning Taisō (no hops); `baduanjin_separate_heaven_earth`, `baduanjin_clench_fists` (high stance); `systema_breath_walk` | `makko_ho`, `surya_namaskar`, `baduanjin_touch_toes`, heel drop with a jolt |
| Before sport | `rt_*` Raise/Mobilise items; `bow_stance` (short, Activate); `virabhadrasana_2` (short) | `makko_ho`, `zhan_zhuang`, long holds, breath work |
| After sport | `makko_ho` ★, `trikonasana`, Baduanjin singles, `rt_deep_breath` close | – |
| Wind down | `makko_ho` ★, `zhan_zhuang` close ★ (`moments.md` §1.8 already names it), `systema_breath_walk` (slow, low peak), `baduanjin_heel_bounce` (slow lowering), `rt_deep_breath` | `surya_namaskar` at pace; `rt_*` brisk items |
| On the road | seated Morning Taisō, `vrikshasana`, `zhan_zhuang`, `systema_breath_walk` (small space) | – |
| Low-energy day | `systema_breath_walk` or `rt_deep_breath` first and last; `makko_ho`; seated Taisō | `bow_stance`, `virabhadrasana_2` |

### 8.4 Planner rules to add

1. **Age ≥ 75**, or `experience: new` with age ≥ 65 for 2 weeks → `radio_taiso_1_seated` replaces `radio_taiso_1` in Morning Taisō and warm-ups **[practice]**.
2. **Never auto-planned** (Library, tradition pools and swaps only): `baduanjin_sway_head_tail`, `rt_trunk_circle` (except in Before sport / warm-up for users with no back flags).
3. **`wrist` or `lower_back`** → no `surya_namaskar` (no sourced chair version exists).
4. **`knee` or `ankle`** → `makko_ho` skips step 4 (3 of 4 steps kept).
5. **`lowImpact`, after a meal, bone-health flag** → `baduanjin_heel_bounce` with a slow lowering.
6. **Breath holds:** `surya_namaskar` position 5 and all Systema hold variations never appear.
7. **`SAME_DRILL`** additions: `['arm_circles', 'rt_arm_circles']`; consider `['rt_stretch_up', 'rt_deep_breath']`.
8. **Stance ladder:** `zhan_zhuang` 0.5 → `bow_stance` 0.8 → `horse_stance` 1 → `virabhadrasana_2` 1.5 (fractional levels allowed). `stanceLevels` on all four.

---

## 9. Open questions and risks for the founder

1. **Batch size.** 22 items instead of about 15, because 13 are promotions with no new animation. Accept all 22, or ship the promotions first (a cheap v1.3a) and the 9 new items later?
2. **Seated Taisō shape.** A separate flow (`radio_taiso_1_seated`, recommended, so moments can filter by posture) or a `seated` variant of `radio_taiso_1`? The step reps are unconfirmed until the fact-checker reads the sheet's images.
3. **`rt_two_foot_hops` and `rt_heel_raise`** stay flow-only. Agree?
4. **Sun Salutation variant.** Sivananda 12-position, with the position-5 breath retention replaced by a normal breath (disclosed). Agree? Its two readable sources are from one organisation; the fact-checker needs an independent one (Vishnudevananda's 1960 book, or the AYUSH booklet if it loads).
5. **No chair Sun Salutation.** `world-movement.md` §4.6.6 asks for one, but I found no reputable source. Leave wrist and back users without it, or source one later?
6. **Where do one-leg and stance poses live?** `vrikshasana` has no natural family: a new generic `balance_hold` family, or `mobility` with `category: 'balance'`? And should `zhan_zhuang` be `category: 'breath'` (it might then be pulled into paced-breathing blocks) or `strength`?
7. **Cards.** Four new cards (yoga, Makkō-hō, Systema, standing post) or three (fold standing post into a widened "Martial-arts stances" card)? The widened stance card changes verified copy and needs re-verification.
8. **`rt_deep_breath` in breath blocks.** Offer it when Morning Taisō is visible, or keep breath blocks generic (`paced_breathing`) as today?
9. **Makkō-hō rights and courtesy.** The association asks that its illustrations and text are not used without permission. Kitaeru's own wording and figures should be fine, since movements are not protected like text; but naming the association and its method in a free app is a courtesy question. **Suggest a short, free courtesy email to the association** (no paid review), and **check whether 真向法 is a registered trademark** (J-PlatPat) before using the name in marketing.
10. **Makkō-hō timing conflict.** The association suggests practising on waking; Kitaeru's morning rule avoids early lumbar flexion for back-pain users. Proposed: allow it in the Morning moment only for users without back flags, and never in the first 5 minutes.
11. **Radio Taisō rights (unchanged).** The music is copyrighted by Japan Post Insurance (and, for No. 2's broadcast rights, NHK) and must never be used; usage rules forbid arrangements and background use (G in §2). **The trademark status of ラジオ体操 is still unconfirmed**: I found only copyright rules. Check J-PlatPat before any marketing use; the name stays confined to `RADIO_TAISO_ATTRIBUTION`.
12. **Systema.** The only detailed source is a commercial book, and "Systema" names several unrelated schools. Credit Ryabko and Vasiliev explicitly. Whether "Systema" is a registered mark in any market is **unconfirmed**; the drill can be taught under the generic name "Breath-paced walk" with Systema on the card only. If no second source is found, **drop the item or ship it as a generic breath drill without the tradition**.
13. **Religious framing.** Sun Salutation (Sūrya), Warrior II (Vīrabhadra, a Hindu myth), Makkō-hō (Buddhist bowing) and Systema (Orthodox Christian framing in its source) all have religious roots. The drafts mention origins neutrally and teach movements only. Confirm the optional devotion note on the Sun Salutation.
14. **Corrections to `world-movement.md`** found during this research: §1.5 Nagai's dates and the aikidō claim are unconfirmed; §1.7 the Aundh book date (1928 vs the English edition 1938); §2.4/§2.5 Sun Salutation position 6 is knees-chest-forehead in the Sivananda source; §2.7 the Russian drill name is unconfirmed; §1.4 the seated version's hop replacement is shoulder shakes. These are research-doc fixes for whoever owns that file; I did not edit it.
15. **Efficacy transfer (unchanged).** All the B-grade results come from supervised classes and whole routines; single moves in an app are C at best.

---

## 10. Fact-check checklist

For each item, the checker ticks every line, records what was fixed in `verified.notes`, and sets `verified` only when the `CONTRACTS.md` bar is met (2+ independent sources per move, one official or primary; native names in 2+ sources; claims within the grade).

**All Morning Taisō promotions (items 1–8)**
- [ ] Movement, native name and cues unchanged from the verified v1.2 data.
- [ ] Standalone doses (2 rounds of the standard count; `rt_deep_breath` 4–6 breaths) are labelled as Kitaeru's.
- [ ] `rt_arm_circles`: first circle direction against Kampo (A/D) and the video; cue reworded unambiguously; `SAME_DRILL` pair added.
- [ ] `rt_chest_opener` and `rt_diagonal_bend`: breath direction per Kampo.
- [ ] `rt_forward_back_bend`: breath direction is marked [practice].
- [ ] Single moves carry grade C and no copy cites Osuka as the move's own result.

**`radio_taiso_1_seated`**
- [ ] 13 names and order against the Kampo seated page and PDF.
- [ ] Each step's reps against the PDF images; the "?" entries resolved.
- [ ] Step 11 = shoulder shakes (8 × 2), confirmed in a second source (NHK seated demonstration or Federation video).
- [ ] A second, independent source for the seated *form* (not just its existence).
- [ ] No native name; Radio Taisō name only in the attribution string; no music.

**Baduanjin promotions (items 10–14)**
- [ ] Standard reps (6; heel bounce 7) against sport.gov.cn and Heshan.
- [ ] Knee softening in `touch_toes` and slow heel lowering disclosed as Kitaeru's.
- [ ] `sway_head_tail` hip-not-knee cue attributed to the CHQA practitioner article.
- [ ] No couplet name translated as a health claim.

**`zhan_zhuang`**
- [ ] 站桩 / 站樁 zhàn zhuāng in 2 sources; 三圆式 terms.
- [ ] Arm height and distance against the China Medical Qigong Society page.
- [ ] A second independent form source (Lam Kam Chuen or a Yiquan body).
- [ ] Wang Xiangzhai's dates and Yiquan role in 2 sources.
- [ ] Lyu 2021 has no non-practice control (so no effect claim).

**`bow_stance`**
- [ ] 弓步 gōngbù in 2 sources; form per the Guangzhou wushu course.
- [ ] A stronger second form source than the teaching blogs.
- [ ] "High bow stance" disclosed as Kitaeru's depth.

**`surya_namaskar`**
- [ ] 12 positions and per-position breath against Sivananda (A) **and** an independent source.
- [ ] Position 6 = knees, chest, forehead; hips up.
- [ ] Position 5 retention replaced and disclosed.
- [ ] सूर्यनमस्कार in a second source; spacing decided.
- [ ] Aundh book date (1928 vs 1938) resolved or both dropped from copy.
- [ ] No mantra, no chanting, no health claim beyond C.

**`vrikshasana`, `virabhadrasana_2`, `trikonasana`**
- [ ] Names (Devanagari + IAST) in 2 sources each (Warrior II's Devanagari currently in one).
- [ ] Tree: foot placement, 10–30 s hold and arthritis/vertigo caution per the Common Yoga Protocol; "not on the knee" sourced or marked [practice].
- [ ] Warrior II: form and 20–30 s per Iyengar; a second independent form source found; the Niels Bukh note framed as "has been suggested".
- [ ] Triangle: CYP form and cautions (slipped disc, sciatica, abdominal surgery); Iyengar differences noted.
- [ ] Yoga card: the Youkhana claim hedged ("may modestly improve"); "household practice" wording confirmed or softened.

**`makko_ho`**
- [ ] 真向法 まっこうほう; 長井津 わたる; 1933 (昭和8年) in 2 sources.
- [ ] The four steps, 10 reps and about 1 minute for step 4 per makkoho.or.jp.
- [ ] Breath rule (out on the fold) per the association's four cautions.
- [ ] Step-4 back-pain caution per the association; Kitaeru's step-4 adaptation disclosed.
- [ ] No Nagai life dates, no aikidō claim, no association health claims on the card.
- [ ] No text or illustration copied from the association's site.

**`systema_breath_walk`**
- [ ] A second, independent source for the walking drill itself.
- [ ] Step pyramid and nose-in, mouth-out per Vasiliev & Meredith 2006.
- [ ] No breath-hold variations; no Russian drill name; no healing claims.
- [ ] Lineage credited (Ryabko, Vasiliev).

**All new cards**
- [ ] Native names in 2 sources; claims within grade; "Sources" line present; no "Reviewed by"; `verified: null` until checked.
