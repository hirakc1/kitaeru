# Kitaeru: Evidence-Based Programming Rulebook

Owner: Research. Consumer: `js/engine/planner.js`. Last reviewed: 2026-09-27.

This document turns every field of the Profile (see `CONTRACTS.md`) into numeric rules. The rules follow published evidence where it exists. Where it does not, they follow conservative practitioner consensus, and those rules are marked **[practice]**. Every number here is a default that the planner may tune. The final section is the checklist to code from.

---

## 0. Key evidence in one screen

| Finding | Source |
|---|---|
| The largest gain comes from going from no resistance training to *any*. Train all major muscle groups **≥2×/week**. Failure training, periodisation complexity and equipment type do not consistently change outcomes for the average adult. | ACSM Position Stand, Phillips et al. 2026, MSSE 58(4), [acsm.org](https://acsm.org/resistance-training-guidelines-update-2026/) |
| Strength: heavy loads (~≥80% 1RM, i.e. roughly ≤8 reps near failure), **2–3 sets**, ≥2×/week. Hypertrophy: **≥10 sets/muscle/week**, loads **30–100% 1RM** if effort is high. Near-failure ≈ **2–3 RIR** is enough. | ACSM 2026 (summary: [moveyourbonespt.com](https://www.moveyourbonespt.com/blog/2026-acsm-resistance-training-guidelines)) |
| Hypertrophy is the same with low loads (≤60% 1RM, i.e. ~15–30+ reps) and high loads when sets go near failure. 1RM strength favours heavy loads. | Schoenfeld et al. 2017, JSCR, [pubmed 28834797](https://pubmed.ncbi.nlm.nih.gov/28834797/); Schoenfeld et al. 2021, Sports 9(2):32, [mdpi](https://www.mdpi.com/2075-4663/9/2/32) |
| There is a dose–response between weekly sets and hypertrophy, with diminishing returns. The per-session plateau is ~2 direct sets/muscle for strength and ~11 fractional sets for hypertrophy. | Schoenfeld, Ogborn & Krieger 2017, [pubmed 27433992](https://pubmed.ncbi.nlm.nih.gov/27433992/); Pelland et al. 2025, Sports Med, [pubmed 41343037](https://pubmed.ncbi.nlm.nih.gov/41343037/) |
| With volume equated, frequency barely matters. **≥2×/week** is still a good default. | Schoenfeld et al. 2016, [springer](https://link.springer.com/article/10.1007/s40279-016-0543-8); Schoenfeld et al. 2019, [pubmed 30558493](https://pubmed.ncbi.nlm.nih.gov/30558493/) |
| Training to failure gives only a trivial extra hypertrophy benefit (ES 0.19). | Refalo et al. 2023, Sports Med, [springer](https://link.springer.com/article/10.1007/s40279-023-01946-6) |
| Rest >60 s gives a small hypertrophy benefit. No difference was detected beyond ~90 s. | Singer et al. 2024, Front Sports Act Living, [PMC11349676](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11349676/) |
| RIR-based RPE (RPE 10 = 0 RIR) is valid for autoregulation. Novices estimate RIR less accurately. | Zourdos et al. 2016, [pubmed 26049792](https://pubmed.ncbi.nlm.nih.gov/26049792/); Helms et al. 2016, SCJ, [PMC4961270](https://pmc.ncbi.nlm.nih.gov/articles/PMC4961270/) |
| Progressive push-up training (a variation ladder) matched bench press for strength and muscle thickness over 4 weeks. | Kotarsky et al. 2018, JSCR 32(3):651, [pubmed 29466268](https://pubmed.ncbi.nlm.nih.gov/29466268/) |
| Push-ups loaded to match bench press muscle activity gave similar strength gains. Low-load push-ups and bench press gave similar hypertrophy. | Calatayud et al. 2015, JSCR, [pubmed 24983847](https://pubmed.ncbi.nlm.nih.gov/24983847/); Kikuchi & Nakazato 2017, [PMC5812864](https://pmc.ncbi.nlm.nih.gov/articles/PMC5812864/) |
| Flexibility: ≥2–3 d/wk, holds of **10–30 s**, **2–4 reps**, **~60 s total per muscle**. Neuromotor/balance training: 2–3 d/wk. | ACSM, Garber et al. 2011, [pubmed 21694556](https://pubmed.ncbi.nlm.nih.gov/21694556/) |
| Static stretching of **<60 s per muscle** before exercise costs only ~1% performance. **≥60 s** costs ~4.6%. | Behm et al. 2016, APNM 41(1):1, [cdnsciencepub](https://cdnsciencepub.com/doi/10.1139/apnm-2015-0235) |
| Adults: muscle strengthening on ≥2 d/wk. Adults 65+: multicomponent balance and strength training on **≥3 d/wk**. | WHO 2020, Bull et al., [PMC7719906](https://pmc.ncbi.nlm.nih.gov/articles/PMC7719906/) |
| Exercise cuts falls by 21%. The largest effects come from programmes that challenge balance at ~**3 h/week**, ongoing. | Sherrington et al. 2017, BJSM, [pubmed 27707740](https://pubmed.ncbi.nlm.nih.gov/27707740/) |
| Older adults: 2–3×/wk, 2–3 sets per major muscle group, ~2 min rest. Beginners can start with 1 set. Include power (fast concentric) and balance. | Fragala et al. 2019, NSCA, [JSCR 33(8)](https://journals.lww.com/nsca-jscr/fulltext/2019/08000/resistance_training_for_older_adults__position.1.aspx) |
| Youth resistance training is safe and effective when supervised and technique-first. | Lloyd et al. 2014, BJSM, [pubmed 24055781](https://pubmed.ncbi.nlm.nih.gov/24055781/) |
| The sexes show similar relative hypertrophy and strength adaptation to the same programme. | Roberts et al. 2020, JSCR, [journals.lww.com](https://journals.lww.com/nsca-jscr/fulltext/2020/05000/sex_differences_in_resistance_training__a.30.aspx) |
| Deload consensus: reduce volume (sets and reps) and effort (more RIR), keep frequency. Typical deload is ~1 week every **5.6 ± 2.3 weeks**. | Bell et al. 2023 (Delphi), [springer](https://link.springer.com/article/10.1186/s40798-023-00633-0); Bell et al. 2024 survey, [PMC10948666](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10948666/) |
| Strength is largely kept for **≤3–4 weeks** of detraining. Size is lost faster after that, and retraining ("muscle memory") is quicker. | Detraining systematic review 2022, [mdpi](https://www.mdpi.com/2813-0413/1/1/1); Blocquiaux et al. 2020, [pubmed 32017951](https://pubmed.ncbi.nlm.nih.gov/32017951/) |
| Pain-monitoring model: training with pain **≤5/10** is acceptable if it settles by the next morning and does not rise week to week. | Silbernagel et al. 2007, AJSM, [sagepub](https://journals.sagepub.com/doi/abs/10.1177/0363546506298279) |
| Habit automaticity plateaued at a median of **66 days** (range 18–254). **Missing one opportunity did not materially affect** habit formation. | Lally et al. 2010, EJSP, [wiley](https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674) |
| Intact logged streaks raise later engagement and broken ones lower it. The drop is **attenuated when a streak can be repaired**. | Silverman & Barasch 2023, J Consumer Research 49(6), [oup](https://academic.oup.com/jcr/article-abstract/49/6/1095/6623414) |
| Push-up capacity is inversely associated with 10-year CVD events in middle-aged men (>40 vs <10 push-ups). This is a useful health marker to track. | Yang et al. 2019, JAMA Netw Open, [ACC summary](https://www.acc.org/latest-in-cardiology/journal-scans/2019/02/22/10/46/association-between-push-up-exercise-capacity) |
| Practitioner reference: r/bodyweightfitness Recommended Routine. Uses 3 sets of 5–8, moves on at 3×8, ~90 s rest, paired push/pull supersets and a mandatory row. | [RR wiki](https://www.reddit.com/r/bodyweightfitness/wiki/kb/recommended_routine/) **[practice]** |

---

## 1. Goals → prescription

### 1.1 Base prescription per goal (main-block strength exercises)

| Goal | Reps (or hold) | Sets/exercise | Rest (s) | Target RIR | Weekly sets / muscle (fractional) | Sessions/muscle/wk | Notes |
|---|---|---|---|---|---|---|---|
| strength | **4–8** reps; holds 10–20 s | 3–5 | 120–180 | 1–2 | 6–12 | ≥2 | Pick the progression at which 8 reps is near-max. That is the bodyweight equivalent of ≥80% 1RM (ACSM 2026). Hardest movement goes first in the session. |
| muscle | **6–20** reps (valid up to **30** if RIR ≤2); holds 30–60 s | 3–4 | 60–120 (≥60) | 1–2 (0 allowed on last set, `experience ≥ regular` only) | **10–20** | ≥2 | Load range 30–100% 1RM works if sets end near failure (Schoenfeld 2017, ACSM 2026). |
| endurance | **15–30** reps; holds 30–60 s | 2–3 | 30–60 | 2–3 | 6–12 | 2–3 | Circuits allowed. Add a conditioning block. |
| flexibility | stretch holds **20–30 s** (30–60 s if age ≥65) × **2–4** reps, ≈60 s total per muscle | — | 10–15 between reps | mild tension, never pain | stretch each target area on ≥3 d/wk (daily is best) | ≥2–3 (ideal 5–7) | Garber 2011. Long static holds go after training (Behm 2016). |
| skill | holds **5–30 s** or 3–5 quality reps; practice total 5–10 min | 3–6 | 60–120 | **≥3** (never to failure) | n/a (practice minutes) | ≥3 | Goes at the session start when fresh **[practice]**. |
| health | **8–15** reps; holds 20–40 s | 1–3 (first 2 weeks: 1–2) | 60–90 | 2–3 | **4–10** | ≥2 (WHO) | All major patterns ≥2×/wk. Balance for age ≥55. 5–10 min of conditioning. |

Rep ranges are what the user aims for on the current progression. When the user outgrows the range, the family advances (§8). There is no external load, so **exercise difficulty (family level) is the intensity dial**.

### 1.2 Muscle-set accounting
- Per logged or planned set: each `primary` muscle = **1.0** set and each `secondary` muscle = **0.5** set. This is the fractional counting used by Pelland 2025.
- Weekly target per muscle = the blended target (§1.3). The large muscles checked are `chest, upper_back, lats, quads, glutes, hamstrings, front_delts, triceps, abs`.
- Hard cap: **≤10 fractional sets per muscle per session**. Above this, per-session returns flatten (Pelland 2025). **[practice]** for the exact cap.

### 1.3 Blending multiple goals
1. Weights: if there is one goal, `w = 1.0`. Otherwise `w[primaryGoal] = 0.6` and each other goal gets `0.4 / (n − 1)`.
2. Split the goals into **loading goals** `{strength, muscle, endurance, health}` and **add-on goals** `{flexibility, skill}`.
3. **Rep range, rest and RIR** for main exercises come from the loading goal with the highest weight. If the primary goal is an add-on, use the highest-weighted loading goal. If there is none, use `health`.
4. If both `strength` and `muscle` have `w ≥ 0.2`, apply the concurrent rule: in each session, the **first exercise of each movement pattern** uses the strength range (4–8, 120–180 s) and later exercises use the muscle range (8–20, 60–120 s). With ≥4 days per week you can instead alternate strength days and muscle days (daily undulation). Either way works; the evidence favours neither.
5. **Weekly sets per muscle** = Σ `w_g × mid(target_g)` over the loading goals, then clamped to [4, 20]. Example: strength 0.6 and muscle 0.4 gives 0.6×9 + 0.4×15 = 11.4 → 11 sets.
6. Add-on goals add blocks. They do not change rep ranges.
   - flexibility `w ≥ 0.2` → a mobility block of ≥5 min every session, with 2–4 stretches × 2–3 reps × 20–30 s. If flexibility is primary → the mobility block is ≥30% of the session, and the app also suggests a daily 5-min routine.
   - skill `w ≥ 0.2` → a skill block of 5–10 min at the start of ≥3 sessions per week (every session when `daysPerWeek ≤ 3`).
   - endurance `w ≥ 0.2` → a conditioning block of `round(w × 25%)` of the session, minimum 3 min.
   - health present → guarantee push, pull, legs and core ≥2×/wk. Add balance for age ≥55. Add ≥3 min of conditioning if `minutesPerSession ≥ 20`.
7. `explainPlan` should always add: "For full health benefit, also aim for 150–300 min/week of moderate aerobic activity such as brisk walking" (WHO 2020).

---

## 2. Time budget → structure

### 2.1 Split selection (daysPerWeek × minutesPerSession)

| days | minutes < 25 | 25–44 | ≥ 45 |
|---|---|---|---|
| 2 | Full body A/B | Full body A/B | Full body A/B |
| 3 | Full body A/B/A → B/A/B (alternating weeks) | Full body A/B/C | Full body A/B/C |
| 4 | Full body A/B ×2 | Upper/Lower ×2 | Upper/Lower ×2 |
| 5 | Full body A/B/C + 2 **light** days (mobility, skill, balance, easy conditioning) | Upper/Lower/Full + Upper/Lower | Upper/Lower + Push/Pull/Legs (U, L, Push, Pull, Legs) |
| 6 | Full body A/B/C + 3 light days | Upper/Lower ×3 | Push/Pull/Legs ×2 |

Overrides:
- `experience = 'new'`, or `age ≥ 65`, or BMI ≥ 35 → **full body only**, with **max 3 hard days**. Extra days are light days. Light days count for streaks.
- Each muscle group must be hit ≥2×/week. For 2 days, both sessions are full body.
- Place hard sessions for the same muscle ≥48 h apart (≥72 h if age ≥65) **[practice]**. Put light days between hard days wherever `preferredDays` allows.
- Every session that contains a push family must contain a **horizontal pull** (see §7).

Session templates (patterns only; the planner picks the family level):
- **Full body A**: push_horizontal, pull_horizontal, squat, hinge, core_anterior (+ calves or core_lateral if time).
- **Full body B**: push_vertical or dip, pull_vertical (or a second pull_horizontal), squat (unilateral), hinge, core_lateral/core_posterior.
- **Full body C**: push_horizontal (a different variant is fine), pull_vertical, hinge, squat, core_anterior.
- **Upper**: push_horizontal, pull_horizontal, push_vertical/dip, pull_vertical, core.
- **Lower**: squat, hinge, squat (unilateral), calves, core_posterior/lateral.
- **Push / Pull / Legs**: Push = h-push, v-push, dip, core. Pull = v-pull, h-pull, h-pull or pull_noequip, core. Legs = squat, hinge, unilateral squat, calves.

### 2.2 Time allocation per session (minutes)

| minutesPerSession | Warm-up | Skill* | Main | Conditioning* | Mobility/cool-down | Main exercises | Sets/exercise | Format |
|---|---|---|---|---|---|---|---|---|
| 10–14 | 2 | 0 | 7–9 | 0 | 1–2 | 3 (push, pull, legs) | 2 rounds | Circuit |
| 15–19 | 3 | 0 | 9–12 | 0–2 | 2 | 3–4 | 2–3 rounds | Circuit or 2 supersets |
| 20–29 | 3 | 0–3 | 12–17 | 0–3 | 2–3 | 4 | 2–3 | Antagonist supersets |
| 30–44 | 5 | 0–5 | 18–26 | 0–5 | 3–5 | 4–6 | 3 | Supersets |
| 45–59 | 6 | 5 | 25–32 | 0–6 | 5 | 5–7 | 3–4 | Supersets or straight sets |
| 60–74 | 8 | 5–8 | 32–40 | 0–8 | 6–8 | 6–8 | 3–4 | Straight sets |
| 75–90 | 10 | 8–10 | 40–50 | 0–10 | 8–10 | 7–9 | 3–5 | Straight sets |

\*A skill block is included only if a skill goal is present. A conditioning block is included only if endurance or health is present (sized as in §1.3). If a block is skipped, its minutes go to Main.
Modifiers: the warm-up minimum comes from the age table (§4) and may exceed this table. Take it from Main. If flexibility is primary, Mobility is at least 30% of the session.

### 2.3 Time estimation (`estimateMinutes`)

| Component | Seconds |
|---|---|
| Rep, standard tempo (≈1 s up, 2 s down) | **3** |
| Rep, strength-range or hard progression (level ≥ family max − 1) | 4 |
| Rep, negative / eccentric-only (`negative_*`, `nordic_curl_negative`) | 6 |
| Rep, conditioning (jacks, high knees, climbers) | 1 |
| Unilateral (`perSide` / `unilateral`) | × 2 per set + 5 s switch |
| Hold | `holdSec` (+ ×2 if per side) |
| Set setup/overhead | 10 |
| Transition between exercises | 20 (circuit) / 30 (straight sets) |
| Warm-up and mobility items | use the block minutes directly |

`setSec = reps_mid × secPerRep (× 2 if unilateral) + 10`
- **Straight sets:** `itemSec = sets × setSec + (sets − 1) × restSec + 30`.
- **Superset (A1/A2, antagonists or unrelated patterns):** perform A1, rest `r`, then A2, rest `r`, and repeat. Use `r = max(30, restSec / 2)`. The effective rest before repeating the same exercise is `setSec_other + 2r`, and it must be **≥ 60 s** (≥90 s for strength) (Singer 2024). `pairSec = sets × (setSec_A1 + setSec_A2 + 2r) − r + 30`.
- **Circuit:** 3–5 exercises, 15–20 s transition, **60–90 s** between rounds. `roundSec = Σ setSec + (n − 1) × 15 + roundRest`.

Fitting algorithm:
1. `mainBudgetSec = mainMinutes × 60`.
2. Start from the goal-prescribed sets. Order exercise slots by priority: `push_h, pull_h, squat, hinge, pull_v, push_v/dip, core_ant, core_lat/post, calves`.
3. Add slots while the estimate is ≤ budget.
4. If still over budget: first convert to supersets (if minutes < 45). Then reduce sets to a minimum of 2 (1 for health in weeks 1–2 or age ≥65 in weeks 1–2). Then drop the lowest-priority slot. **Never drop a pull_horizontal or pull_noequip slot while a push slot remains.**
5. Rest may be cut to the minima below but no lower: strength 90 s, muscle 60 s, endurance/health 30 s. If the time still does not fit, use supersets instead of shorter rest.
6. The result must be within ±10% of `minutesPerSession`. `estMinutes` is rounded.

Recommended superset pairings: push_h + pull_h; push_v/dip + pull_v; squat + core_anterior; hinge + push_v; unilateral squat + core_lateral. **Do not pair two grip-intensive pulls, or two exercises that stress the same injured joint.**

---

## 3. Starting level

### 3.1 Principle
Start at the hardest family level at which the user can do the **bottom of the prescribed rep range with ≥2 RIR** on all sets. Starting too easy costs 1–2 sessions, because fast-track progression (§8.4) corrects it. Starting too hard costs form, soreness and adherence. **When uncertain, round down one level.**

### 3.2 Baseline tests → level (use when the value is not null)
Tests: max consecutive strict reps with good form (full push-ups from the floor, dead-hang pull-ups, bodyweight squats to parallel) and a forearm plank in seconds.

| Family | Mapping from baseline (exercise ids are from CONTRACTS) |
|---|---|
| push_horizontal (`pushUps`) | 0 → `incline_push_up` · 1–5 → `knee_push_up` · 6–15 → `push_up` · 16–25 → `decline_push_up` · 26–35 → `diamond_push_up` · ≥36 → `archer_push_up` · `pseudo_planche_push_up` only if `advanced` and ≥40 |
| push_vertical (`pushUps`) | <8 → do not schedule yet (use a second push_h slot) · 8–24 → `pike_push_up` · 25–39 and experience ≥ `regular` → `elevated_pike_push_up` · ≥40, `advanced`, has `wall` → `wall_handstand_push_up` |
| dip (`pushUps`) | <6 → skip · 6–19 → `bench_dip` (needs `bench`) · ≥20 with `dip_bars` → `bar_dip` · `advanced` with `rings` and ≥30 → `ring_dip` |
| pull_vertical (`pullUps`, needs `pullup_bar` or `rings`) | 0 → `dead_hang` if `new`, else `scapular_pull` (use `negative_pull_up` if pushUps ≥ 15) · 1–2 → `negative_pull_up` (or `band_assisted_pull_up` if `resistance_band`) · 3–5 → `chin_up` · 6–11 → `pull_up` · ≥12 and `advanced` → `archer_pull_up` |
| pull_horizontal (`pullUps`, by available equipment) | 0 → `table_row` (`band_row` if only a band) · 1–7 → `table_row`, or `inverted_row` if the bar/rings can be set low · ≥8 → `inverted_row` · ≥12 and `advanced` → `archer_row` |
| squat (`squats`) | 0–9 → `box_squat` · 10–29 → `bodyweight_squat` · 30–49 → `split_squat` · 50–74 → `reverse_lunge` · ≥75 → `bulgarian_split_squat` (needs `bench`) · `cossack_squat`+ only if experience ≥ `regular` |
| hinge (`squats` as proxy) | <20 → `glute_bridge` · 20–49 → `single_leg_glute_bridge` · ≥50 → `hip_thrust` (needs `bench`), else `single_leg_rdl` · `nordic_curl_negative` only if `advanced` |
| calves | `squats` <30 → `calf_raise` · ≥30 → `single_leg_calf_raise` |
| core_anterior (`plankSec`) | <20 → `dead_bug` · 20–44 → `plank` · 45–89 → `hollow_body_hold` · ≥90 → `lying_leg_raise` · `hanging_knee_raise` only if a bar is available and pullUps ≥ 3 |
| core_lateral (`plankSec`) | <60 → `side_plank` · ≥60 → `side_plank_hip_dip` |
| core_posterior | `new` → `bird_dog` · otherwise `superman` (lower_back injury → always `bird_dog`) |
| skill_balance | pushUps ≥10 and no wrist injury → `crow_pose` · pushUps ≥20, experience ≥ `some`, has `wall`, no wrist/shoulder/neck injury, age <65 → `wall_handstand` · `freestanding_handstand` only if `advanced` |

If the mapped exercise needs equipment the user lacks, step down the family until the requirements are met. If no level qualifies, use the fallback chain in §7.

### 3.3 Priors when baseline is missing (null)

Default level by `experience` (per family, index into the family list):

| Family | new | some | regular | advanced |
|---|---|---|---|---|
| push_horizontal | incline_push_up | knee_push_up | push_up | decline_push_up |
| pull_vertical | dead_hang | scapular_pull | negative_pull_up | chin_up |
| pull_horizontal | table_row/band_row | table_row | inverted_row* | inverted_row* |
| squat | box_squat | bodyweight_squat | split_squat | reverse_lunge |
| hinge | glute_bridge | glute_bridge | single_leg_glute_bridge | hip_thrust/single_leg_rdl |
| core_anterior | dead_bug | plank | plank | hollow_body_hold |
| push_vertical / dip | skip | skip / bench_dip | pike_push_up / bench_dip | pike_push_up / bar_dip* |

\* if the equipment is available.

Adjustments applied **only when that family's baseline is null**, cumulative, with a floor of level 1:
- **Age 55–64:** −1 level on push_horizontal, squat and pull_vertical. **Age ≥65:** −1 on all families, and push_horizontal starts no higher than `incline_push_up` (`wall_push_up` if `new`).
- **Sex:** on average, women show lower *absolute upper-body* strength and full-push-up capacity than men, but **similar relative adaptation to training** (Roberts 2020). So for `sex = 'female'` with `pushUps` or `pullUps` unknown and experience `new` or `some`, apply −1 level to push_horizontal and pull_vertical only. `unspecified` → apply the same conservative −1 (being too easy is self-correcting). **No sex adjustment to lower body, core, rep ranges, sets, rest, RIR, volume, progression or deloads. Programming principles are identical across sexes.**
- BMI ≥30 caps (§5) and injury exclusions (§6) are applied after these adjustments.
- **Never infer a baseline from sex or age when the user has entered one.** A measured baseline always overrides priors.

### 3.4 Calibration
In weeks 0–1, the first exposure to each family is a calibration. Allow fast-track jumps of up to **+2 levels** (§8.4). `explainPlan` should say that "the first two weeks calibrate your levels".

---

## 4. Age bands

| Rule | <18 | 18–39 | 40–54 | 55–64 | 65+ |
|---|---|---|---|---|---|
| Warm-up minimum (min) | 5 | 3–5 (per §2.2) | 5 | 7 | 8–10 |
| RIR floor (never prescribe lower) | **3** | 0–1 (muscle, last set, `regular+` only), else 1 | 1 | 2 | 2–3 |
| Max hard days/week | 3 (4 if `regular+`) | 6 | 5 | 4 | 3 (+ light days) |
| Min hours between hard sessions, same muscle | 48 | 48 | 48 | 48–72 | 72 |
| Deload cadence (§9) | 3+1 | 4+1 | 4+1 | 3+1 | 3+1 |
| Max fractional sets/muscle/week | 12 | 20 | 18 | 14 | 12 |
| Impact (jumps) | allowed; ≤60 foot contacts per session **[practice]** | allowed | allowed unless BMI ≥30 or knee/ankle/hip injury; ≤60 contacts | default `lowImpact = true` (user may override) | **forced low impact** |
| Balance work | optional | optional | 1 item on ≥2 sessions/wk | ≥2 min in **every** session | ≥3 min in every session; multicomponent ≥3 d/wk (WHO 2020) |
| Mobility block minimum | 2 min | per §2.2 | 3 min | 5 min | 5 min |
| Power emphasis | technique first | — | — | "lift fast, lower slowly" cue on box squat, incline push-up and bridges | same, at RIR ≥3 (Fragala 2019) |
| Volume start | 1–2 sets in weeks 0–1 | per goal | per goal | per goal | **1–2 sets in weeks 0–1**, then 2–3 (Fragala 2019) |
| Excluded by default | max-effort testing to failure; `freestanding_handstand` if <16 | — | — | `pistol_squat`, `shrimp_squat`, `nordic_curl_negative` unless `advanced` | all `impact: 'high'`; `wall_handstand`, `freestanding_handstand`, `wall_handstand_push_up`, `pistol_squat`, `shrimp_squat`, `nordic_curl_negative`, `burpee`, `squat_jump`; `dead_hang` capped at 20 s |

Notes:
- **<18:** resistance training is safe and beneficial for youth when technique comes first and it is supervised (Lloyd 2014). The app should **require age ≥13**. For ages 13–17, show "train with a parent, coach or PE teacher's awareness". Never prescribe to failure. Emphasise movement quality and variety.
- **Balance items** available in the current library: single-leg stance during `calf_raise` (hands near a wall), `single_leg_rdl` (hand support allowed), `split_squat`, `bird_dog`, and `crow_pose` for younger users. For 55+, the planner should add a note "stand near a wall or sturdy chair for support". Suggest to the Content owner a `single_leg_stand` / `tandem_stance` exercise in `warmup` or `mobility` (see §12).
- **65+ floor transfers:** group floor exercises together to minimise getting up and down. Add the note "use a chair to get up and down if needed". Prefer standing or supported alternatives (`wall_push_up`, `box_squat`) at the start.

---

## 5. Height and weight (BMI)

`BMI = weightKg / (heightCm / 100)²`. **BMI is a crude proxy.** It cannot tell muscle from fat, and it misclassifies muscular and older people. The rules below are conservative starting defaults, not judgements. They relax automatically once the user shows capacity.

| BMI | Rules |
|---|---|
| < 17 | Show "Consider checking with a doctor or dietitian". Goals default to strength/muscle. Conditioning ≤5 min. No extra-volume bias. |
| 17–18.4 | Conditioning ≤5 min. No other change. |
| 18.5–29.9 | No change. |
| **30–34.9** | `lowImpact = true` (user may re-enable impact after 8 weeks of consistent training, or immediately if `experience ≥ regular`). push_horizontal start capped at `knee_push_up` (use `incline_push_up` if pushUps is null or <5). pull_vertical starts at `dead_hang`/`scapular_pull`/`negative_pull_up` (no full pull-ups until 3×5 negatives with 5 s control). squat capped at `box_squat` → `bodyweight_squat` → `split_squat` (with hand support); **exclude** `shrimp_squat`, `pistol_squat`, `cossack_squat` and `deep_squat_hold` at start. Conditioning = `marching_in_place`, `bear_crawl` (if no wrist injury) and low-impact circuits. |
| **≥ 35** | Everything above, plus: push_horizontal starts at `wall_push_up`/`incline_push_up`. Shorter work bouts (conditioning intervals 20–30 s on, ≥30 s off). Limit floor-transfer count (group floor work). Show "Please check with your doctor before starting" (PAR-Q style, §11). |

**Relax BMI rules** when any of these is true: `experience = 'advanced'`, or `pushUps ≥ 20` and `squats ≥ 40`, or the user has since progressed past the cap through normal progression (caps apply only to the *starting* level, not to earned levels). Background: each 1 kg of weight loss reduces knee load by ~4 kg per step in adults with knee osteoarthritis (Messier et al. 2005, Arthritis Rheum, [pubmed 15986358](https://pubmed.ncbi.nlm.nih.gov/15986358/)). That is why knee-friendly squatting and low impact are the defaults for higher body mass.

---

## 6. Injuries

### 6.1 General rules (all injuries)
1. Exclude every exercise whose `stress` includes the injury, **except** the listed "allowed with modification" items. Those appear with a note.
2. **Never leave a movement pattern empty** (push, pull, legs, core). If exclusion empties a family, use the substitute given below.
3. **Pain rule** (adapted for unsupervised use from Silbernagel 2007): during exercise, discomfort up to **3/10** is OK. It must return to baseline **by the next morning**, and must not trend upward week to week. If pain goes above 3/10, is sharp, or lasts into the next day → stop that exercise and regress one level next time. If that happens twice → exclude it and suggest seeing a professional. (Silbernagel allowed ≤5/10 under clinical supervision. We use 3/10 because there is no supervisor.)
4. The injured area never gets training to failure. RIR ≥3 on exercises near the injured joint.
5. Always show: "Kitaeru can't diagnose injuries. If pain is severe, getting worse, or you have any warning sign below, stop and see a doctor or physiotherapist."
6. Injury flags also count toward the 3+1 deload cadence (§9).

### 6.2 Per-injury table

| Injury | Exclude / regress | Allowed with modification | Substitute if a family empties | Add (prehab/mobility, 1–2 items, pain-free) | Red flags → see a professional |
|---|---|---|---|---|---|
| **wrist** | floor push-ups on flat palms, `pike_push_up`+, all handstand/`crow_pose`, `bear_crawl`, `mountain_climber`, `burpee`, `l_sit`, `pseudo_planche_push_up` | push-ups on `parallettes` or fists (neutral wrist) if pain-free; plank on forearms | push_h → `wall_push_up`/`incline_push_up` on fists/parallettes; skill → none | `wrist_prep` (gentle, pain-free range), grip via `dead_hang` if tolerated | swelling or snuffbox pain after a fall (possible scaphoid fracture); numbness or tingling in fingers; night pain; visible deformity |
| **elbow** | all `dip` family, `diamond_push_up`, `archer_*`, `pseudo_planche_push_up`, `ring_*` | pulls with neutral/chin-up grip; **−30% pulling sets** for 2 weeks; 3 s lowering | dip → extra push_h at a lower level; pull_v → `pull_horizontal` | slow-tempo `band_row`; forearm isometrics (note) | locking or catching; numbness in ring/little finger; significant swelling; pain that is getting worse week to week |
| **shoulder** | `dip` family, `push_vertical` family, all handstands, `archer_*`, `pseudo_planche_push_up`, `shoulder_dislocate` (full range), `dead_hang` > 20 s | push-ups within a pain-free depth (stop at parallel); rows at any level | push_v/dip → extra `pull_horizontal` + `prone_ytw`; pull_v → `scapular_pull` only if pain-free, else pull_h | `prone_ytw`, `scapular_push_up`, band external rotation (note); keep weekly **pull:push sets ≥ 1.5:1** **[practice]** | cannot lift the arm; weakness after a fall; night pain; pain spreading down the arm with neck pain; a feeling of dislocation |
| **neck** | all handstands, `pike_push_up`+, `wall_handstand_push_up`, `crow_pose`, `hollow_body_hold`, `lying_leg_raise`/`hanging_*` (neck flexion strain) | `dead_bug` with head resting on the floor; `superman` with chin tucked and gaze down | core_ant → `dead_bug`/`plank`; skill → none | `thoracic_opener`, `cat_cow`, chin-tuck note | numbness, tingling or weakness in the arms; dizziness, visual change or severe headache; any trauma; loss of balance or coordination |
| **lower_back** | `superman`, `superman_pull` (repeated loaded extension), `lying_leg_raise`, `hanging_leg_raise`, `l_sit`, `nordic_curl_negative`, `burpee`, `squat_jump`, `pancake_stretch`, `bulgarian_split_squat` (until pain-free) | `glute_bridge`, `hip_thrust`, `single_leg_rdl` (bodyweight, hand support) | core → `bird_dog`, `side_plank`, `dead_bug` (the "big 3" idea, McGill **[practice]**) | `cat_cow`, `bird_dog`, walking suggestion | numbness in the saddle/groin area or changes in bladder/bowel control (**urgent**); progressive leg weakness; pain below the knee with numbness; fever, unexplained weight loss or night pain; after trauma |
| **hip** | `pistol_squat`, `shrimp_squat`, `cossack_squat`, `deep_squat_hold`, `pigeon_stretch`, `pancake_stretch`, `lying_leg_raise`, `hanging_leg_raise`, `l_sit` | `box_squat` to a pain-free depth; `split_squat` with a short stance | squat → `box_squat` (higher box); hinge → `glute_bridge` | `glute_bridge`, `side_plank`, `hip_circles` (small, pain-free) | inability to bear weight; groin pain with a limp; pain after a fall (**especially age ≥65**, possible fracture); locking or giving way; night pain |
| **knee** | all `impact: 'high'`, `pistol_squat`, `shrimp_squat`, `cossack_squat`, `bulgarian_split_squat`, `deep_squat_hold`, `reverse_lunge` (until pain-free), `nordic_curl_negative` | `box_squat` to pain-free depth; `split_squat` partial range; knee pain ≤3/10 is OK in patellofemoral-type pain | squat → `box_squat`; legs volume shifts to `hinge` (bridges, hip thrust) and calves | `glute_bridge`, `side_plank` (hip abductors), `calf_raise` | swelling within hours of an injury; locking, catching or giving way; inability to bear weight; a hot, red joint; calf pain with swelling (possible DVT) |
| **ankle** | all `impact: 'high'`, `high_knees`, `single_leg_calf_raise`, `pistol_squat`, `shrimp_squat`, `cossack_squat` | `calf_raise` on both legs with hand support; single-leg balance near a wall once walking is pain-free (reduces re-sprain; Hupperets et al. 2009, BMJ, [pubmed 19589822](https://pubmed.ncbi.nlm.nih.gov/19589822/)) | conditioning → `marching_in_place` or upper-body circuits | `calf_stretch`, `calf_raise`, ankle circles (note) | cannot take 4 steps; bone tenderness at the ankle bones (Ottawa rules); major swelling or bruising; repeated giving way |

---

## 7. Equipment and space fallbacks

**Horizontal pulling is mandatory.** Every session that contains a push slot must contain at least one horizontal pull (or `pull_noequip`) slot. Weekly **horizontal pull sets ≥ horizontal push sets**, and total **pull sets ≥ total push sets**. The Recommended Routine requires rows for the same reason: pressing-dominant bodyweight training otherwise unbalances the shoulder girdle (rear delts, mid/lower traps) **[practice]**. This slot may never be dropped for time (§2.3 step 4).

| Need | Fallback chain (first available wins) |
|---|---|
| Horizontal pull | `rings`/low bar → `inverted_row` (→ `archer_row`) · `table` → `table_row` · `resistance_band` → `band_row` · nothing → `prone_ytw` + `superman_pull` (`pull_noequip`) |
| Vertical pull | `pullup_bar`/`rings` → pull_vertical family (+`band_assisted_pull_up` if `resistance_band`) · none → **extra horizontal pull set** plus `prone_ytw` (the Y trains lower traps and overhead scapular control) |
| Dip | `dip_bars`/`rings` → `bar_dip`/`ring_dip` · `bench` → `bench_dip` · none → push_h variant one level lower (e.g. `diamond_push_up` → `push_up`) |
| Vertical push | `pike_push_up` needs only floor · elevated needs `bench` · HSPU needs `wall` · none → `pike_push_up` |
| Hinge | `bench` → `hip_thrust` · otherwise `glute_bridge` → `single_leg_glute_bridge` → `single_leg_rdl` |
| Bulgarian split squat | needs `bench`; else `reverse_lunge` |
| Core anterior hanging | needs `pullup_bar`; else `lying_leg_raise` |
| Skill | `wall` → `wall_handstand`; else `crow_pose` |

Space filter: `small` → exclude `space ∈ {medium, large}` (e.g. `bear_crawl`, `inchworm` if marked medium). `medium` → exclude `large`. Conditioning in small spaces uses `marching_in_place`, `jumping_jack` (if impact is allowed), `mountain_climber`, `high_knees` and `burpee`.

Impact filter: if `lowImpact` is forced (age ≥65, BMI ≥30, knee/ankle/hip injury, pregnancy answered in the pre-screen) or chosen, exclude `impact: 'high'`. Low-impact conditioning = `marching_in_place`, `mountain_climber` (slow, if no wrist injury), `bear_crawl` and bodyweight-squat or step-back-lunge circuits.

---

## 8. Progression algorithm (double progression)

Definitions per exercise item in a log: `lo, hi` = the prescribed range (reps or seconds). `sets[]` = logged values. `rating` ∈ easy/good/hard. An **exposure** = one logged session containing that family (build weeks only).

### 8.1 Within-level progression (the "reps" step)
- Next target per set = `min(hi, last logged value + 1 rep)` for reps, or `+ 2–5 s` for holds (5 s if `holdSec hi ≥ 30`, else 2 s). The UI shows "Beat last time: 7, 7, 6".
- If `rating = 'hard'` and all sets are ≥ `lo` → **hold** the target. No increase.

### 8.2 Advance to the next level (the "exercise" step)
Advance family `f` by +1 level when **all** of these hold:
1. Every set ≥ `hi` in **2 consecutive exposures**.
2. `rating ≠ 'hard'` in both.
3. Session `feel ≤ 4` in the later one.
4. Not a deload or re-entry week.
5. The next level is allowed (equipment, injury, age, BMI filters).

On advance: start the new exercise at a target of `lo` on each set. Keep the set count. Record `{family, from, to, reason: 'Hit top of range (x–y) on all sets twice'}`.

### 8.3 Regress one level
Regress when **any** of these occurs:
- Any set < `lo` in **2 consecutive exposures**.
- `rating = 'hard'` in **2 consecutive exposures**.
- Best set < `lo − 3` reps (or < 50% of `lo` seconds) in a single exposure.
- The user reports pain (see §12 contract suggestion). **Immediate** regression.

The floor is level 1. At level 1 instead: reduce the range to `[max(1, lo − 3), hi − 3]` and add a note. Record a reason string.

### 8.4 Fast-track (anti-sandbagging and calibration)
- `rating = 'easy'` and every set ≥ `hi + 3` → advance **immediately** (1 exposure).
- Weeks 0–1 only: every set ≥ `hi + 6` → advance **+2 levels**.

### 8.5 Sets progression (the volume step)
- At the start of each new build block (after a deload): `+1 set` on main exercises when all of these hold: the previous block had no regressions, fewer than 25% of item ratings were `hard`, the mean `feel` was ≤3.5, and the goal's set cap (§1.1) and age cap (§4) are not exceeded.
- If a family is at its **top level** and the progression criteria are met: extend the range to `hi + 5` (e.g. 8 → 13 reps), then add a set, then prescribe a tempo note "3-s lowering, 1-s pause" and reset to `lo`. Do not add a new family automatically.

### 8.6 Hold progressions
| Family | Hold range | Advance when | Cap before forcing level-up |
|---|---|---|---|
| core_anterior / core_lateral | 20–45 s (strength 15–30 s) | all sets ≥ `hi` for 2 exposures | **60 s**. Longer planks add little, so advance the level instead **[practice]**. |
| `dead_hang` | 10–30 s (65+: cap 20 s) | 3 × 30 s | → `scapular_pull` |
| skill (`crow_pose`, `wall_handstand`) | 5–20 s / 15–45 s | total accumulated ≥ 60 s at `hi` quality for 2 exposures | `freestanding_handstand` requires `advanced` |
| mobility stretches | 20–30 s (65+: 30–60 s) | n/a (no progression) | — |

### 8.7 Special cases
- `negative_pull_up`: reps = controlled 3–5 s lowerings. Advance at 3 × 5 with ≥5 s. The next level is `band_assisted_pull_up` if a band is available, else `chin_up`.
- `chin_up` → `pull_up` at 3 × 8.
- Unilateral: reps are per side. The weaker side decides.
- Families not listed in the session do not change level.
- Deload, re-entry and calibration logs are recorded but **never trigger an advance** (except calibration fast-track) and never trigger volume increases. Pain regression still applies.

### 8.8 Early (reactive) deload trigger
If there are ≥2 regressions in the same week, or `feel = 5` in 2 consecutive sessions, or ≥50% of items were rated `hard` in the last 3 sessions → the next week is a deload, and the cadence counter resets.

---

## 9. Periodisation and deloads

### 9.1 Cadence
`cycleLen = 4` (3 build + 1 deload) if age ≥55, age <18, any injury flagged, or BMI ≥35. Otherwise `cycleLen = 5` (4 build + 1 deload). The literature norm is ~1 deload per 5.6 ± 2.3 weeks (Bell 2024). **Exception:** for `experience = 'new'`, skip the first scheduled deload, so the first deload lands at week 8 or 10. Novices recover quickly at low volume **[practice]**.

`phase(weekIndex) = ((weekIndex − blockStart + 1) % cycleLen === 0) ? 'deload' : 'build'`

### 9.2 RIR ramp inside a build block
| Build week in block | RIR target |
|---|---|
| 1 | goal RIR + 1 (e.g. 3) |
| 2 | goal RIR + 0.5 → round up |
| 3+ | goal RIR (never below the age floor) |

### 9.3 What changes in a deload week
| Variable | Deload rule |
|---|---|
| Sets | × **0.5** (round, minimum 1) |
| Reps / hold | lower half of range; stop at **RIR 4** |
| Exercises / levels | **unchanged**. No progression evaluation. |
| Frequency | **unchanged** (same days, so the streak stays intact) |
| Rest | unchanged |
| Skill and mobility blocks | unchanged (mobility may be +50%) |
| Conditioning | × 0.5, low impact |
| Session length | naturally ~60–70% |
| Copy | "Deload week: lighter on purpose. This is when you adapt." |

### 9.4 Missed sessions and gaps
Let `gap` = days since the last logged session.

| gap (days) | Action |
|---|---|
| ≤ 10 | Continue as planned. Missed sessions are **not** made up by doubling. |
| 11–21 | Re-entry week 1: sets × 0.75, RIR + 1, levels unchanged. |
| 22–42 | Re-entry: week 1 = deload volume (× 0.5), week 2 = × 0.75. Levels −1 on families at level ≥3. |
| 43–90 | 2 re-entry weeks (× 0.5, × 0.75). Levels −1 on all families (−2 if age ≥65). |
| > 90 | Prompt a baseline re-test, rerun `initialLevels`, then 2 re-entry weeks. |

After re-entry, restart the cycle (`blockStart = current weekIndex`). Evidence: strength is well kept for ≤3–4 weeks. Losses grow after 4+ weeks, but retraining recovers them faster than first-time gains.

---

## 10. Streaks and adherence

### 10.1 Evidence
- Habits take a **median of 66 days** (18–254) to reach automaticity. A **single missed opportunity did not materially affect** the process (Lally 2010). So streak design must forgive single misses.
- Visible intact streaks increase continued behaviour. Seeing a *broken* streak reduces it, and the effect is **smaller when the streak can be "repaired"** (Silverman & Barasch 2023). So streak freezes and repair are evidence-aligned.
- Rigid daily streaks invite the "what-the-hell"/abstinence-violation reaction (dropping out after one slip) and create pressure to train on planned rest days. For a strength app, **daily streaks that reward training every day directly conflict with recovery** (§2.1 48 h rule). Gamification raises activity modestly in trials, but the benefit depends on design. Keep the primary streak **weekly**.
- ACSM 2026: adherence ("the programme you'll stick with") matters more than optimisation. So streaks target consistency, not volume.

### 10.2 Streak design (implement in `computeStreak`)
1. **Primary: weekly streak** (`weekly.current`, `weekly.best`). A week (Mon–Sun, or the plan's 7-day window from `startDate`) is **kept** if completed sessions ≥ `weeklyTarget`.
   `weeklyTarget = daysPerWeek` for days ≤ 3. For days ≥ 4 it is `max(2, daysPerWeek − 1)`, allowing one miss. **Never below 2**, the WHO minimum for muscle strengthening.
   Deload and re-entry weeks count with the same target.
2. **Secondary: day streak** (`current`, `best`) counts **consecutive scheduled training days that were completed**.
   - **Planned rest days never break the streak and never add to it.** They are skipped when walking back through the calendar.
   - A session logged within **±1 day** of its scheduled day counts for that day (flex).
   - A missed scheduled day breaks the streak **unless a freeze is available**. The freeze is auto-applied and the UI shows a freeze marker on that day.
3. **No reward for overtraining:** at most **1 counted session per calendar day**. Sessions beyond `daysPerWeek` in a week are logged and shown but add **nothing** to either streak. Never prompt "train today to keep your streak" on a rest day. Instead say "Rest day: recovery is part of the plan."
4. **Freezes:** earn **1 freeze per 2 consecutive kept weeks**, with a **maximum of 2 banked**. `freezeAvailable = banked > 0`. A freeze covers one missed scheduled day or rescues one missed week. Offer an explicit "I'm ill/injured" pause (up to 14 days) that freezes the streak without spending freezes. Illness is an external cause, and those are least demotivating (Silverman & Barasch).
5. **Repair:** if the weekly streak breaks, show "Complete this week to restore your streak" once (repair within 7 days), rather than resetting to zero with fanfare.
6. Also show a non-streak **consistency metric**: sessions completed / planned over the last 8 weeks (%). This stays meaningful after a break.

---

## 11. Safety copy

### 11.1 Disclaimer (show at onboarding and in the Me tab)
> Kitaeru gives general fitness guidance, not medical advice. Exercise has some risk. Start easy, keep good form, and stop if you feel chest pain, faintness, severe breathlessness or sharp pain. If you have a medical condition, are pregnant, are recovering from injury or surgery, or are unsure whether exercise is safe for you, talk to a doctor or qualified professional first. Mild muscle soreness for 1–3 days is normal. Joint pain that lasts into the next day is not: ease off that exercise.

### 11.2 Pre-screen (paraphrased from the PAR-Q+ general health questions; [eparmedx.com](https://eparmedx.com/))
Ask yes/no:
1. Has a doctor ever said you have a heart condition **or** high blood pressure?
2. Do you get chest pain at rest, during daily activities, or during physical activity?
3. In the past 12 months, have you lost balance because of dizziness, or lost consciousness? (Answer no if the dizziness was only from over-breathing during hard exercise.)
4. Have you been diagnosed with another chronic medical condition (other than heart disease or high blood pressure)?
5. Are you currently taking prescribed medication for a chronic medical condition?
6. Do you currently have (or have you had in the past 12 months) a bone, joint or soft-tissue problem that could be made worse by being more active?
7. Has a doctor said you should only do medically supervised physical activity?

Plus "delay" checks: Are you currently unwell (cold, fever, infection)? Are you pregnant? Has your health recently changed?

| Result | App behaviour |
|---|---|
| All no | "You're cleared to start gently." Proceed. |
| Q1, Q2, Q3 or Q7 yes | **Strong advice:** "Please speak to a doctor before starting." The user may continue after acknowledging. Force `lowImpact`, RIR floor 3, full body ≤3 hard days. |
| Q4, Q5 or Q6 yes | "Consider checking with a doctor or physiotherapist, especially before hard sessions." Q6 → prompt to fill `injuries`. RIR floor +1 for 4 weeks. |
| Unwell | "Wait until you're better." Offer the illness pause (§10.2.4). |
| Pregnant | "Check with your midwife or doctor. Many people can keep training, but some exercises need changes." Force `lowImpact`. After ~16 weeks, exclude prolonged lying on the back (`dead_bug`, `glute_bridge` → note) and all `core_anterior` beyond `plank` **[practice]**. Exclude inversions. |
| Age ≥65 **and** new to exercise, or BMI ≥35 | "It's a good idea to check with your doctor first." (not blocking) |

Always-on stop signs (show in the Today tab help): chest pain or pressure, unusual breathlessness, dizziness or fainting, palpitations, sudden severe headache, or sharp joint pain → stop and seek medical advice.

---

## 12. Contract notes for other owners (non-blocking suggestions)

1. **Pain field:** `SessionLog.items[].pain?: 0–10` (optional) enables §6.1 and §8.3 exactly. Without it, treat `rating = 'hard'` combined with a free-text note as a proxy.
2. **Block start after gaps:** `weekIndex = floor((today − startDate)/7)` cannot express re-entry or the reset deload cycle. Suggest `plan.blockStart` (weekIndex) in store, or have the planner derive it from the logs.
3. **Balance exercises:** add `single_leg_stand` / `tandem_stance` (mode `hold`, low impact, small space) to support the 55+/65+ rules.
4. The `pull_horizontal` equipment tags should allow `inverted_row` with `rings` or a low bar (and `table_row` with `table`).

---

## 13. Planner implementation checklist

Profile derivation
1. IF `age < 13` THEN refuse the plan and show "Kitaeru is for ages 13+". IF 13–17 THEN apply the <18 column of §4.
2. Compute `bmi`. IF bmi ≥ 30 OR age ≥ 65 OR injuries ∩ {knee, ankle, hip} ≠ ∅ OR a pregnancy/Q1–3/Q7 flag THEN `effectiveLowImpact = true`, ELSE `effectiveLowImpact = profile.lowImpact`. (Age 55–64: default true, the user may override.)
3. IF BMI relax conditions (§5) are met THEN skip the BMI start caps.
4. Goal weights: one goal → 1.0. Otherwise primary 0.6 and the rest share 0.4 equally.
5. `loadingGoal` = highest-weight goal in {strength, muscle, endurance, health}, with `health` as the fallback. Take reps, rest and RIR from §1.1.
6. IF w(strength) ≥ 0.2 AND w(muscle) ≥ 0.2 THEN the first exercise per pattern uses the strength range and later ones use the muscle range.
7. `weeklySetTarget = clamp(Σ w_g·mid_g, 4, 20)`, then clamp to the age cap in §4.

Library filtering (per exercise, before level selection)
8. EXCLUDE IF `exercise.equipment ⊄ profile.equipment`.
9. EXCLUDE IF space rank exceeds `profile.space` (small < medium < large).
10. EXCLUDE IF `effectiveLowImpact` AND `impact === 'high'`.
11. EXCLUDE IF `exercise.stress ∩ injuries ≠ ∅`, unless listed as allowed-with-modification in §6.2 (then attach its note).
12. EXCLUDE the age-band and BMI exclusions in §4 and §5.
13. IF a required pattern's family is now empty THEN use the §6.2 substitute or the §7 fallback chain. **Never leave push, pull, legs or core empty.**

Initial levels (`initialLevels`)
14. For each family: IF baseline is present THEN use the §3.2 mapping. ELSE use the §3.3 experience table, then the age/sex adjustments (null baselines only).
15. Apply the BMI start caps. Step down until the exercise passes the filters. Floor at level 1.
16. Mark weeks 0–1 as calibration.

Week structure (`generateWeek`)
17. Choose the split from §2.1. IF `new` OR age ≥ 65 OR BMI ≥ 35 THEN full body with max 3 hard days, and the other days are light.
18. Cap hard days at the §4 age limit. Convert the excess to light days (mobility, skill, balance, easy conditioning, ≤ minutesPerSession).
19. Map sessions onto `preferredDays`, keeping ≥48 h (≥72 h at 65+) between hard sessions that hit the same muscles. Put light days between hard ones.
20. `phase` per §9.1. IF deload THEN apply §9.3. IF re-entry THEN apply §9.4 multipliers.
21. Allocate block minutes per §2.2. Raise the warm-up to the age minimum. Add skill/conditioning/mobility per §1.3 weights. Flexibility primary → mobility ≥30%.
22. Fill main slots by priority (§2.3). IF minutes < 45 THEN use supersets (push_h + pull_h, push_v/dip + pull_v, squat + core). IF minutes < 20 THEN use a circuit.
23. EVERY session with a push slot MUST include pull_horizontal (or pull_noequip). Weekly pull_h sets ≥ push_h sets. Total pull ≥ total push. Shoulder injury → pull:push ≥ 1.5.
24. Each major muscle must be hit ≥ 2×/week. Check fractional sets (primary 1.0, secondary 0.5) against the target (±20%). Keep ≤ 10 fractional sets per muscle per session.
25. Age ≥ 55 → ≥ 2 min of balance per session. Age ≥ 65 → ≥ 3 min, and ≥ 3 sessions/week include balance and strength (light days count).
26. Weeks 0–1 with age ≥ 65 or goal health-only → 1–2 sets per exercise.
27. RIR per item = max(goal RIR + build-week ramp, age floor, injury-adjacent 3, pre-screen floor).
28. Rest per item from the goal. Minima: strength 90, muscle 60, endurance/health 30. IF the time budget is exceeded THEN use supersets before cutting rest.
29. `estMinutes` via §2.3. It must be within ±10% of `minutesPerSession`. Otherwise drop sets (min 2) and then low-priority slots (never pull_h).
30. Deterministic: same inputs → same week. Rotate variant choice by `weekIndex % n` only among allowed alternatives.

Progression (`applySessionLog`)
31. Skip the level evaluation IF the log's week is deload or re-entry (except pain → regress).
32. IF all sets ≥ hi in 2 consecutive exposures AND neither rating is hard AND feel ≤ 4 THEN advance +1 (to the next allowed level) and set the target to lo.
33. IF rating easy AND all sets ≥ hi + 3 THEN advance +1 now. IF calibration week AND all sets ≥ hi + 6 THEN +2.
34. IF any set < lo in 2 consecutive exposures, OR rating hard in 2 consecutive exposures, OR best set < lo − 3 (holds < 50% lo), OR pain > 3 THEN regress −1. At level 1, lower the range by 3.
35. ELSE the within-level target is +1 rep per set (holds +2–5 s), capped at hi. A 'hard' rating holds the target.
36. Top-level family meeting criteria → extend hi by 5, then +1 set, then a tempo note.
37. At a new block start: +1 set on main lifts IF no regressions, < 25% hard ratings and mean feel ≤ 3.5, within the goal and age caps.
38. Reactive deload IF ≥ 2 regressions in a week OR feel 5 twice in a row OR ≥ 50% hard over the last 3 sessions.
39. Gaps per §9.4 (thresholds 10/21/42/90 days). Reset `blockStart` after re-entry.

Streaks (`computeStreak`)
40. `weeklyTarget = daysPerWeek ≤ 3 ? daysPerWeek : max(2, daysPerWeek − 1)`. Weekly streak = consecutive weeks with sessions ≥ weeklyTarget. The current in-progress week does not break it.
41. Day streak = consecutive **scheduled** days completed (±1-day flex). Rest days are skipped (neutral). Max 1 counted session per day. Extra sessions add 0.
42. A missed scheduled day or week → consume a freeze if `banked > 0`. Earn 1 per 2 kept weeks, max 2. `freezeAvailable = banked > 0`. An illness pause (≤ 14 d) freezes without cost.
43. Never message "keep your streak" on a planned rest day.

Explanations (`explainPlan`)
44. Emit one bullet per applied rule category, e.g.: split reason, goal blend, age/BMI/injury adjustments, the mandatory row, the deload phase, calibration weeks, and the WHO aerobic reminder (150–300 min/week).

Safety
45. Show the §11 disclaimer at onboarding. Run the pre-screen before the first plan, and apply the §11.2 behaviour table. Show the stop-signs help permanently.
