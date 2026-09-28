# Kitaeru: Moments Blueprint

Owner: Research (exercise science). Consumers: Engine (`js/engine/planner.js`, `generateQuickSession`), UI (`js/ui/quick.js`) and Content (`js/data/exercises.js`). Last reviewed: 2026-09-28.

Quick workout currently lets people "Train for" **a goal** or **a body area**. This document adds a third choice, **a moment**: a short session shaped by the time of day or what someone is about to do, or has just done. It covers nine moments. For each it gives the evidence, the session structure, the durations, what to include and avoid, safety notes and the exact Kitaeru ids to use. It then sets out the planner rules, the UI wording and the copy.

**How to read the evidence grades** (the same scale as `world-movement.md`)

| Grade | Meaning |
|---|---|
| **A** | Several meta-analyses of RCTs agree, with at least moderate certainty. Safe to make a specific claim in the app. |
| **B** | At least one good RCT, or a meta-analysis with low certainty. Use hedged copy ("may", "can help"). |
| **C** | Small or low-quality trials, or indirect evidence from similar exercise. Copy describes what the session trains, not outcomes. |
| **D** | Practice-based only. Copy must not claim health outcomes. |

Rule for copy: every outcome claim carries its grade in this document, and the in-app wording follows that grade. Traditional explanations stay the tradition's own (`world-movement.md` §5). **[practice]** marks rules that follow practitioner consensus, not trials.

---

## 0. Summary

1. **Nine moments, not ten.** Keep: Morning wake-up, Desk reset, Energy boost, After a meal, Before sport, After sport, Wind down, On the road, and Low-energy day. **Drop "Before a meal" as its own moment** and fold it into *After a meal* and *Energy boost* (§1.5). **Drop "With kids or family"** for now (§1.11).
2. **After a meal beats before a meal.** A meta-analysis of 8 crossover RCTs found that exercise after eating lowered the post-meal glucose rise, while exercise before eating did not. The sooner after the meal, the better ([Engeroff et al. 2023](https://pubmed.ncbi.nlm.nih.gov/36715875/)). Ten minutes of walking after each meal beat one 30-minute daily walk in type 2 diabetes ([Reynolds et al. 2016](https://pubmed.ncbi.nlm.nih.gov/27747394/)). Grade **B** (small trials at high risk of bias, acute outcomes only).
3. **Before sport has the strongest evidence of any moment (A).** Structured neuromuscular warm-ups such as FIFA 11+ cut football injuries by 39% ([Thorborg et al. 2017](https://pubmed.ncbi.nlm.nih.gov/28087568/)). Stretching alone does not prevent injuries, but strength and balance work does ([Lauersen et al. 2014](https://pubmed.ncbi.nlm.nih.gov/24100287/)).
4. **After sport has the weakest (C), and the copy must say so.** Active cool-downs do little for most recovery markers ([Van Hooren & Peake 2018](https://pubmed.ncbi.nlm.nih.gov/29663142/)), and stretching does not meaningfully reduce soreness ([Herbert et al. 2011, Cochrane](https://pubmed.ncbi.nlm.nih.gov/21735398/)). The honest pitch is "settle down and work on flexibility", not "recover faster".
5. **Evening exercise does not generally harm sleep (B).** The risk is *vigorous* exercise ending within about an hour of bed ([Stutz et al. 2019](https://pubmed.ncbi.nlm.nih.gov/30374942/)). Hard sessions ending 4 or more hours before sleep showed no link with sleep at all ([Leota et al. 2025](https://pubmed.ncbi.nlm.nih.gov/40234380/)). Wind down is gentle by design, so it can be done any time.
6. **Desk reset is well supported (B).** Short, frequent walking or simple standing resistance breaks (half-squats, calf raises) lower post-meal glucose and insulin compared with unbroken sitting ([Buffey et al. 2022](https://pubmed.ncbi.nlm.nih.gov/35147898/); [Dempsey et al. 2016](https://pubmed.ncbi.nlm.nih.gov/27208318/)). Every move in that protocol is already in the library.
7. **The traditions fit naturally.** Morning Taisō (`radio_taiso_1`) is the morning moment's 5-minute core. Tai Chi and Baduanjin are the backbone of Wind down, Low-energy day and After a meal (standing, slow, no floor). The planner uses them only when they are visible (`isVisible`).
8. **Mostly short.** Moments live at 5–20 minutes. Only On the road and Before sport go to 20 or longer, and Before sport should rarely exceed 20.

---

## 1. Survey of moments

Each entry gives the purpose, the evidence (graded), the structure and intensity, the durations, what to include and avoid, safety notes, the Kitaeru ids that fit and the traditions that fit. Durations use the Quick workout chips (5, 10, 15, 20, 30…). ✓ = offer, ★ = default, – = hide.

Intensity uses the talk test and RIR from `research.md`. "Easy" = full sentences, RPE 2–3/10. "Moderate" = short sentences, RPE 4–6. "Brisk burst" = a few words at a time, RPE 7–8, for 20–60 s only.

### 1.1 Morning wake-up (朝)

- **Purpose.** Loosen up after sleep, raise body temperature and alertness, and start the day with a small win. It is the natural home of Morning Taisō.
- **Evidence: C overall.**
  - Radio Taisō, done as 3–5 min bouts, improved agility, dynamic balance and aerobic endurance in frail older adults over 12 weeks, with about 94% adherence **(B for that group)** ([Osuka et al. 2024](https://www.jstage.jst.go.jp/article/jea/34/10/34_JE20230317/_article/-char/en)). There is no trial of a morning slot versus another time.
  - **The spine is stiffer in the early morning.** Discs are more hydrated after a night lying down. Adams et al. estimated that forward bending puts about 300% more bending stress on the lumbar discs in the early morning than later in the day (lab and cadaver study) ([Adams et al. 1987](https://pubmed.ncbi.nlm.nih.gov/3589804/)). In an 18-month RCT of 85 people with chronic low back pain, avoiding lumbar flexion in the early morning cut pain intensity (point estimate 33%) ([Snook et al. 1998](https://pubmed.ncbi.nlm.nih.gov/9854759/)). **B** for "avoid deep or loaded forward bending in the first hour after waking", in people with back pain. For everyone else it is a sensible default **[practice]**.
  - **Fasted exercise.** Eating first helps *prolonged* aerobic performance but not shorter sessions ([Aird et al. 2018](https://pubmed.ncbi.nlm.nih.gov/29315892/)). A 5–20 min bodyweight session before breakfast is fine for most people **(B)**.
  - Circadian: morning exercise (around 07:00) advanced the body clock in a lab study ([Youngstedt et al. 2019](https://pubmed.ncbi.nlm.nih.gov/30784068/)). This is relevant to On the road (§1.9) but is not a claim for daily use **(C)**.
- **Structure and intensity.** Raise (1 min) → mobilise every plane, standing first → optional light strength (1–2 sets, RIR ≥3) → optional balance hold. Build from easy to moderate. No bursts in the first 5 minutes.
- **Durations.** 5 ✓ · 10 ★ · 15 ✓ · 20 ✓ · 30+ –.
- **Include.** Standing, whole-body mobility through all three planes, trunk side bends and twists, arm circles, hip circles, a squat pattern, an easy push. At 5 min: `radio_taiso_1` plus one extra item if visible; otherwise a standing mobility sequence.
- **Avoid.** Deep or sustained forward folds and loaded spinal flexion in the first part of the session: `standing_hamstring_stretch`, `pancake_stretch`, `childs_pose`, `baduanjin_touch_toes`, `lying_leg_raise`, `hollow_body_hold`. Also avoid maximal efforts and high-impact work before 5 minutes of warm-up. No long static holds.
- **Safety.** People who use insulin or sulfonylureas can go low when exercising before breakfast. They should follow their diabetes team's advice **[practice]**. Morning dizziness when standing up quickly is common. Start with standing arm work, not a burst. Hydrate.
- **Kitaeru ids.** `marching_in_place`, `arm_circles`, `hip_circles`, `leg_swings`, `cat_cow` (mid-range only), `thoracic_opener`, `open_book`, `worlds_greatest_stretch`, `rt_stretch_up`, `rt_side_bend`, `rt_trunk_twist`. Strength (optional, 10+ min): `box_squat`/`bodyweight_squat`, `wall_push_up`/`incline_push_up`, `glute_bridge`, `bird_dog`, `calf_raise`. Balance (15+ min): `taichi_golden_rooster`.
- **Traditions.** **Morning Taisō (`radio_taiso_1`) first** whenever it is visible and suitable (the lowImpact variant replaces the hops). Tai Chi `taichi_commencement` and `taichi_cloud_hands` fit the mobilise phase. Baduanjin `baduanjin_hold_up_sky` fits. `baduanjin_sequence` is too long for a morning 10.

### 1.2 Desk reset (伸)

- **Purpose.** Break up long sitting, open the front of the hips and chest, move the upper back, and wake up the legs and glutes.
- **Evidence: B.**
  - A meta-analysis of 7 crossover RCTs found that interrupting sitting with light walking lowered post-meal glucose (Δ −0.72) and insulin (Δ −0.83) compared with continuous sitting. Standing breaks helped less (glucose Δ −0.31). Neither changed blood pressure ([Buffey et al. 2022](https://pubmed.ncbi.nlm.nih.gov/35147898/)).
  - 2-minute light or moderate walking bouts every 20 minutes lowered glucose and insulin responses in adults with overweight or obesity ([Dunstan et al. 2012](https://pubmed.ncbi.nlm.nih.gov/22374636/)).
  - 3-minute bouts of **simple resistance activities every 30 minutes** (half-squats, calf raises, glute squeezes and knee raises) worked as well as walking for glucose and insulin, and better for triglycerides, in adults with type 2 diabetes ([Dempsey et al. 2016](https://pubmed.ncbi.nlm.nih.gov/27208318/)). This protocol maps directly onto our library.
  - Neck pain: workplace neck and shoulder strengthening reduced neck pain in office workers who already had symptoms (SMD 0.59, moderate quality), but not in the general office population ([Chen et al. 2018](https://pubmed.ncbi.nlm.nih.gov/29088401/)). **B** for symptomatic users only.
  - "Tight hip flexors from sitting" is a common idea with weak direct evidence **(D)**. Copy may say the stretch "opens the front of the hip". It must not say it fixes posture or back pain.
- **Structure and intensity.** Standing only. Pulse (marching) → legs and glutes (Dempsey pattern) → chest, upper-back and trunk openers → back to marching. Easy to moderate, no sweat. Office clothes.
- **Durations.** 5 ★ · 10 ✓ · 15 ✓ · 20+ –. The trials used 2–3 minutes every 20–30 minutes. Copy should say "little and often beats one long break" **(B)**.
- **Include.** `marching_in_place`, `box_squat` (to the desk chair) or `bodyweight_squat` in half range, `calf_raise`, `wall_push_up`, `doorway_chest_stretch`, `seated_trunk_rotation` (chair), `rt_stretch_up`, `rt_side_bend`, `rt_trunk_twist`, `arm_circles`, `hip_circles`, `leg_swings`, `single_leg_rdl` (hand on the desk).
- **Avoid.** Floor work (`prone_ytw`, `glute_bridge`, `cat_cow`, `thoracic_opener`, planks), anything that needs `medium` or `large` space, sweaty conditioning, and jumps (colleagues and neighbours below). `hip_flexor_stretch` is kneeling, so leave it out until a standing variant exists (§6).
- **Safety.** Stop if a stretch causes pins and needles down the arm. For persistent neck or arm symptoms, use the `research.md` §6.2 red flags.
- **Traditions.** `taichi_cloud_hands`, `taichi_commencement`, `baduanjin_hold_up_sky` and `baduanjin_look_back` (neck range small; excluded for `neck`). All are standing and quiet. A 5-minute desk reset can be `radio_taiso_1` with the lowImpact variant (no hops).

### 1.3 Energy boost (昼): midday "exercise snack"

- **Purpose.** Lift energy and alertness in the afternoon dip, or fit a small dose of vigorous effort into a busy day. It also absorbs the "before a meal" idea (§1.5).
- **Evidence: C for acute energy, B for fitness from snacks.**
  - 10 minutes of low-to-moderate stair walking raised vigour more than 50 mg of caffeine in 18 sleep-deprived young women ([Randolph & O'Connor 2017](https://pubmed.ncbi.nlm.nih.gov/28302573/)). This is a small single study **(C)**.
  - Regular exercise increases feelings of energy (δ 0.37) in a meta-analysis, **but** the effect disappeared in trials with a placebo control ([Puetz et al. 2006](https://pubmed.ncbi.nlm.nih.gov/17073524/)). This is an honest **C** for "more energy".
  - Three brief vigorous stair climbs a day, 3 days a week for 6 weeks, modestly raised VO₂peak in sedentary young adults ([Jenkins et al. 2019](https://pubmed.ncbi.nlm.nih.gov/30649897/)) **(B, small)**.
  - In 25,241 non-exercisers, about 3 bouts a day of 1–2 min of vigorous everyday activity were associated with 38–40% lower all-cause mortality ([Stamatakis et al. 2022](https://pubmed.ncbi.nlm.nih.gov/36482104/)). This is observational **(C)**. Never state it as cause and effect.
  - Before a meal: 6 × 1 min intense intervals 30 min before meals improved 24-hour glucose in 9 people with insulin resistance ([Francois et al. 2014](https://pubmed.ncbi.nlm.nih.gov/24817675/)) **(C)**.
- **Structure and intensity.** 1 min easy raise → 2–4 **brisk bursts** of 20–60 s (RPE 7–8), with 30–60 s of easy movement between → 1 min of standing openers. Intensity comes from speed and range, not difficulty: family level at or below the user's current level.
- **Durations.** 5 ★ · 10 ✓ · 15+ –.
- **Include.** Bursts: `high_knees`, `jumping_jack`, `squat_jump` (impact allowed), or low impact: fast `marching_in_place`, fast `bodyweight_squat`, `baithak` (when visible), `mountain_climber` (no wrist injury). Easy parts: `arm_circles`, `hip_circles`, `rt_stretch_up`, `rt_trunk_twist`.
- **Avoid.** Long holds, floor-heavy sequences, strength sets to near failure, and bursts longer than 60 s.
- **Safety.** Pre-screen Q1–Q3 or Q7 "yes", age ≥65, or BMI ≥35 → no brisk bursts. Use moderate marching and squats instead (`research.md` §11.2). If lowImpact, no jumps.
- **Traditions.** `radio_taiso_1` is itself a brisk 3-minute routine and suits a 5-minute snack. Pehlwani `baithak` suits the bursts.

### 1.4 After a meal (食)

- **Purpose.** Easy movement soon after eating, to help blunt the rise in blood sugar and to feel less sluggish.
- **Evidence: B for acute glucose.**
  - **Timing.** In a meta-analysis of 8 crossover RCTs (116 people, 47 with type 2 diabetes; high risk of bias), exercise after the meal reduced the glucose rise compared with no exercise (SMD 0.55) and compared with the same exercise before the meal (SMD 0.47). Exercise before the meal did not differ from no exercise. A shorter gap between meal and exercise gave a bigger effect ([Engeroff et al. 2023](https://pubmed.ncbi.nlm.nih.gov/36715875/)). A narrative review reached the same conclusion: moderate exercise "initiated shortly after meals" ([Bellini et al. 2024](https://pubmed.ncbi.nlm.nih.gov/38674861/)).
  - **Duration.** 10 min of walking after each main meal lowered the post-meal glucose area by about 12% more than one 30-minute daily walk, with the biggest effect after the evening meal ([Reynolds et al. 2016](https://pubmed.ncbi.nlm.nih.gov/27747394/)). Even 2–5 min bouts help (Buffey 2022, Dunstan 2012, §1.2).
  - **Type.** Standing bodyweight moves (half-squats, calf raises, knee raises) worked as well as walking ([Dempsey et al. 2016](https://pubmed.ncbi.nlm.nih.gov/27208318/)). Sustained seated calf raises ("soleus push-ups") cut the post-meal glucose rise by about 52% in one lab study ([Hamilton et al. 2022](https://pubmed.ncbi.nlm.nih.gov/36034224/)). That is a single study, and the authors intend to patent their method, so it gets **C** and no specific figure in the copy.
  - **Honest caveats.** The effects are acute, and the strongest data are from people with overweight, prediabetes or type 2 diabetes. For lean, healthy people the benefit is smaller and its long-term meaning is unknown. **No claim about weight loss or preventing diabetes.**
- **Structure and intensity.** Start within about 30 min of finishing the meal, and sooner is better **(B)**. Keep it continuous, standing, easy to moderate (talk test), rhythmic and whole-leg. There is no warm-up block: the session *is* the warm-up intensity. Close with 1 min of standing openers.
- **Durations.** 5 ✓ · 10 ★ · 15 ✓ · 20 ✓ · 30+ –.
- **Include.** `marching_in_place` (the backbone, in 60–90 s blocks), `calf_raise`, `bodyweight_squat`/`box_squat` in half range, `hip_circles`, `arm_circles`, `rt_stretch_up`, `rt_side_bend`, `leg_swings`, `single_leg_calf_raise` (hand on a wall).
- **Avoid.**
  - Lying flat or face down after a big meal (`glute_bridge`, `dead_bug`, `prone_ytw`, `superman`, `cobra_stretch`, planks, `childs_pose`), because it can bring on reflux **[practice]**.
  - Deep forward folds and inversions.
  - Jumps and brisk bursts: bouncing on a full stomach causes cramps and discomfort **[practice]**.
  - Anything to near failure.
  - The hops in `radio_taiso_1`: always use the lowImpact variant here.
- **Safety.** People who take glucose-lowering medication should keep their usual monitoring. The session supports, and does not replace, their care plan. Add the copy "A walk works just as well", because it does **(B)**, and the app should not compete with walking.
- **Traditions.** This is ideal for Tai Chi: `taichi_short_flow` (about 2.5 min, repeat 2–3×), `taichi_cloud_hands`, `taichi_part_horse_mane` and `taichi_brush_knee` give continuous standing leg work at an easy-to-moderate effort. Baduanjin: `baduanjin_hold_up_sky` and `baduanjin_draw_bow` (standing, no forward fold). Leave out `baduanjin_touch_toes` and, after big meals, the heel drop in `baduanjin_heel_bounce`. `radio_taiso_1` (lowImpact variant) fits.

### 1.5 Before a meal: merged, not a moment

- **Why merge.** The founder's idea was "before a major meal". The best acute evidence says the benefit to that meal comes from moving **after** it (Engeroff 2023, §1.4): pre-meal exercise did not change that meal's glucose response. The one positive pre-meal trial used intense intervals in 9 people with insulin resistance and measured 24-hour glucose (Francois 2014), which is **C**.
- **Recommendation.** Offer **After a meal** as the moment. If someone wants to move before lunch, *Energy boost* already is a pre-meal "exercise snack". Its info line can say "Good before lunch, too", with no glucose claim. If the founder wants the words "before a meal" visible, use the chip label "Around a meal" with a sub-choice defaulting to *after*. That adds UI complexity for a C-grade option, so it is not recommended.

### 1.6 Before sport (備)

- **Purpose.** Prepare body and mind for a match, run, climb or class, and lower injury risk.
- **Evidence: A for injury prevention (structured neuromuscular warm-up), B for performance.**
  - FIFA 11+ reduced overall football injuries by 39% (IRR 0.61, 4 cluster RCTs). The older FIFA 11 did not ([Thorborg et al. 2017](https://pubmed.ncbi.nlm.nih.gov/28087568/)). In 1,892 girls aged 13–17, the 11+ lowered overall, overuse and severe injuries ([Soligard et al. 2008](https://pubmed.ncbi.nlm.nih.gov/19066253/)).
  - Across 25 RCTs (26,610 participants), **stretching did not prevent injuries** (RR 0.96), but strength training (RR 0.32) and proprioception or balance training (RR 0.55) did ([Lauersen et al. 2014](https://pubmed.ncbi.nlm.nih.gov/24100287/)).
  - Warming up improved performance in 79% of the outcomes measured across 32 studies ([Fradkin et al. 2010](https://pubmed.ncbi.nlm.nih.gov/19996770/)) **(B)**.
  - **Static stretching dose.** Less than 60 s per muscle group cost about 1.1% performance, while 60 s or more cost about 4.6%. Dynamic stretching gave +1.3%. Short static stretching followed by dynamic activity has "inconsequential" effects on performance ([Behm et al. 2016](https://pubmed.ncbi.nlm.nih.gov/26642915/)) **(B)**.
  - Structure: **RAMP** (Raise, Activate, Mobilise, Potentiate), the UKSCA-recommended framework ([Jeffreys, Human Kinetics](https://us.humankinetics.com/blogs/strength-conditioning-fitness/the-ramp-system)) **[practice]**.
- **Structure and intensity.** Raise 2–3 min (easy → moderate) → Activate 2–5 min (glutes, trunk, single-leg control, 1 set of 6–10, RIR ≥3) → Mobilise 2–4 min (dynamic, sport-specific ranges) → Potentiate 1–2 min (3–5 fast reps or 2 × 10 s bursts, only if impact allowed). Rising intensity, **never to fatigue**. It should end ≤10 min before play **[practice]**.
- **Durations.** 5 ✓ (the bare minimum: Raise + Mobilise) · 10 ✓ · 15 ★ · 20 ✓ (about the length of FIFA 11+) · 30+ –.
- **Include.**
  - Raise: `marching_in_place`, `jumping_jack`, `high_knees`.
  - Activate: `glute_bridge`, `single_leg_glute_bridge`, `bird_dog`, `split_squat`, `reverse_lunge`, `side_plank`, `plank_shoulder_tap`, `calf_raise`, `single_leg_rdl` (balance), `nordic_curl_negative` (advanced only, and never as a first exposure before a match).
  - Mobilise: `leg_swings`, `hip_circles`, `arm_circles`, `worlds_greatest_stretch`, `inchworm`, `open_book`, `rt_trunk_twist`, `rotational_lunge`.
  - Potentiate: `squat_jump`, `high_knees` (short).
- **Avoid.** Static holds over 30 s per muscle, or more than one hold per muscle **(B)**. Long flows, breath work, strength sets near failure and burpee finishers.
- **Safety.** Use the normal injury and lowImpact filters. For 65+, skip Potentiate and extend Raise. New or advanced moves the user has never tried should not appear right before sport **[practice]**: take levels at or below the current level.
- **Traditions.** `radio_taiso_1` is itself a warm-up and suits the 5-minute version (Raise + Mobilise). `taichi_golden_rooster` suits balance. `baduanjin_draw_bow` suits activation. Slow flows (Tai Chi short flow, Baduanjin) are not specific enough.
- **Future.** An optional sport type ("running and field sports" or "throwing, racket and climbing") would bias Activate and Mobilise towards the lower or upper body (§7).

### 1.7 After sport (整)

- **Purpose.** Let heart rate and breathing settle, move gently, and use the warm tissue for flexibility work.
- **Evidence: C for recovery benefits; A for the null result on soreness.**
  - Active cool-downs are "largely ineffective" for same-day or next-day performance and most recovery markers. They do not prevent injuries, and they do not blunt long-term adaptation. They may speed the recovery of blood lactate and of the cardiovascular and respiratory systems ([Van Hooren & Peake 2018](https://pubmed.ncbi.nlm.nih.gov/29663142/), narrative review).
  - Stretching before or after exercise does not produce clinically important reductions in muscle soreness (about 1 point on a 100-point scale; 12 studies) ([Herbert et al. 2011, Cochrane](https://pubmed.ncbi.nlm.nih.gov/21735398/)).
  - Where flexibility *is* the aim, longer holds fit here because there is no performance cost afterwards. Use holds of 10–30 s (30–60 s at 65+) and about 60 s per muscle ([Garber et al. 2011, ACSM](https://pubmed.ncbi.nlm.nih.gov/21694556/)) **(B for gains over weeks, not from one session)**.
- **Structure and intensity.** 2–3 min of easy, tapering movement → stretches for the muscles the sport used (30–60 s holds) → 1 min of slow breathing. Very easy.
- **Durations.** 5 ✓ · 10 ★ · 15 ✓ · 20+ –.
- **Include.** `marching_in_place` (slow), `hip_flexor_stretch`, `standing_hamstring_stretch`, `calf_stretch`, `pigeon_stretch`, `childs_pose`, `doorway_chest_stretch`, `thread_the_needle`, `open_book`, `cat_cow`, `deep_squat_hold`, `worlds_greatest_stretch`.
- **Avoid.** Any strength or conditioning work, and "finishers". Never promise less soreness or faster recovery.
- **Safety.** Stop and seek help for chest pain, faintness or unusual breathlessness after exertion (`research.md` §11). Sit or lie down to stretch if light-headed. Long static stretches on an acutely strained muscle are out: use the pain rule.
- **Traditions.** `baduanjin_sequence` (short version, about 7 min at 15 min) or 3–4 Baduanjin singles, then `taichi_commencement` as a settling close (`world-movement.md` §4.1 already names Baduanjin as the cool-down flow). Breath: `rt_deep_breath` once it is promoted from `flowOnly` (§6).

### 1.8 Wind down (静): evening, before bed

- **Purpose.** A calm, slow session that fits the evening: easy mobility, slow flows and breathing.
- **Evidence: B.**
  - A meta-analysis of 23 studies found that evening exercise did not harm sleep overall ("rather the opposite"). However, sleep onset, total sleep time and sleep efficiency "might be impaired after vigorous exercise ending ≤1 h before bedtime" ([Stutz et al. 2019](https://pubmed.ncbi.nlm.nih.gov/30374942/)).
  - High-intensity exercise ending 2–4 h before bed did not disrupt sleep in good sleepers (15 studies). Ending 0.5–4 h before bed slightly reduced REM sleep (−2.3%) ([Frimpong et al. 2021](https://pubmed.ncbi.nlm.nih.gov/34416428/)).
  - In 14,689 wearable users (4.08 million nights), later and harder exercise was associated with later sleep onset, shorter and poorer sleep, and a higher night-time heart rate. Bouts ending ≥4 h before sleep showed no association, whatever the strain ([Leota et al. 2025](https://pubmed.ncbi.nlm.nih.gov/40234380/); observational).
  - Over weeks, mind-body practice improves self-reported sleep quality: yoga, qigong and Tai Chi in older adults with sleep disturbance (network meta-analysis of 45 RCTs; [Wang et al. 2026](https://pubmed.ncbi.nlm.nih.gov/42576331/)); Baduanjin in adults aged 60+ (18 RCTs; [Zhao et al. 2026](https://pubmed.ncbi.nlm.nih.gov/42639391/)). Regular resistance training also improves sleep quality ([Kovacevic et al. 2018](https://pubmed.ncbi.nlm.nih.gov/28919335/)). These are **B for regular practice**, not for tonight.
  - Five minutes a day of exhale-focused breathing (cyclic sighing) improved mood and lowered respiratory rate more than mindfulness meditation over a month ([Balban et al. 2023](https://pubmed.ncbi.nlm.nih.gov/36630953/)) **(B, one RCT)**.
- **Structure and intensity.** Slow, standing flow → floor mobility (holds 30–60 s) → 1–3 min of paced breathing with a longer exhale (inhale about 4 s, exhale about 6 s; **no breath holds**). Easy throughout (RPE ≤3). No block that raises the heart rate.
- **Durations.** 5 ✓ · 10 ★ · 15 ✓ · 20 ✓ · 30+ –.
- **Include.** `cat_cow`, `childs_pose`, `thread_the_needle`, `open_book`, `thoracic_opener`, `hip_flexor_stretch`, `pigeon_stretch`, `standing_hamstring_stretch`, `calf_stretch`, `deep_squat_hold` (no knee injury).
- **Avoid.**
  - All `conditioning`, all `impact: 'high'` moves, all strength families, and `radio_taiso_1` (brisk, with hops).
  - Any burst, skill work and holds that make people strain (`plank`, `hollow_body_hold`).
  - Bright screens are not our topic, but the player should use the dark theme by default in this moment **[practice]**.
- **Safety.** Breath work is paced only: never retention (as in `world-movement.md` §1.17). Get up slowly from the floor. For people with insomnia, the app is not a treatment: copy must not promise better sleep tonight.
- **Traditions.** The **core of this moment**: `baduanjin_sequence` (short version) or Baduanjin singles (`baduanjin_hold_up_sky`, `baduanjin_look_back`), `taichi_short_flow`, `taichi_cloud_hands`, and `taichi_commencement` as the close. `zhan_zhuang` (v1.3) is a natural finisher.
- **Engine note (optional).** When a *goal* workout is generated after about 20:00 local time and contains conditioning, the preview may add one hedged line: "Hard efforts close to bedtime may delay sleep for some people. Finishing an hour or more before bed is a good rule." **(B)**. This is a hint only; it changes nothing.

### 1.9 On the road (旅): travel or a hotel room

- **Purpose.** A full-body session with no kit, in a small space, quietly (thin walls, people below). It also serves as a leg-and-hip reset after a long flight or drive.
- **Evidence: C.**
  - There are no trials of "hotel workouts". The session reuses the normal programming, which rests on bodyweight evidence such as push-up progressions matching the bench press ([Kotarsky et al. 2018](https://pubmed.ncbi.nlm.nih.gov/29466268/)) (see `research.md`).
  - Jet lag: moderate exercise shifts the body clock. In a lab study, exercise at about 07:00 and 13:00–16:00 advanced it, and exercise at 19:00–22:00 delayed it ([Youngstedt et al. 2019](https://pubmed.ncbi.nlm.nih.gov/30784068/)). Light is the stronger cue. So the copy can say "moving at your destination's morning or early afternoon may help you adjust after flying east" **(C)**, but no stronger.
- **Structure and intensity.** Normal Quick full-body structure (`research.md` §2.2) with forced `lowImpact`, `space: 'small'` and no equipment except `wall`, `bench` (the bed edge or a chair) and a `table` (desk). For a 10-min session after travel, bias towards legs and hips (calf raises, hip opener, marching).
- **Durations.** 5 – · 10 ✓ · 15 ✓ · 20 ★ · 30 ✓ · 45 ✓.
- **Include.** Push: `push_up` family at the user's level, `incline_push_up` (bed or desk edge). Pull: `table_row` (only if a sturdy desk; otherwise skip), `prone_ytw`, `superman_pull`. Legs: `split_squat`, `reverse_lunge`, `bulgarian_split_squat` (bed edge), `single_leg_rdl`, `glute_bridge`, `calf_raise`. Core: `plank`, `side_plank`, `bird_dog`, `dead_bug`. Mobility: `hip_flexor_stretch`, `calf_stretch`, `worlds_greatest_stretch`.
- **Avoid.** Jumps (`impact: 'high'`), `bear_crawl` and `burpee`; `dead_hang` and anything needing a bar or rings; door-frame hanging of any kind (unsafe).
- **Safety.** After a long flight, calf pain with swelling, or chest pain and breathlessness, needs urgent care (a possible DVT or PE; see `research.md` §6.2 knee row). Check that the bed edge or chair is stable before step-ups or split squats. Hydrate.
- **Traditions.** `taichi_short_flow` and Baduanjin singles need little space and are quiet; they are a good jet-lagged morning option. `horse_stance`, `dand` and `baithak` are no-kit strength (the `dand` needs `small` space and no wrist injury).

### 1.10 Low-energy day (息): tired, stressed or low

- **Purpose.** Something kind for a day when a normal session feels like too much: breath first, gentle movement, a little strength if it feels right. It keeps the habit alive without asking much.
- **Evidence: B for a small, short-term calming effect.**
  - One bout of exercise reduces state anxiety a little (Hedges' g 0.16; 36 RCTs) ([Ensari et al. 2015](https://pubmed.ncbi.nlm.nih.gov/25899389/)).
  - Five minutes of exhale-focused breathing improved mood and lowered respiratory rate ([Balban et al. 2023](https://pubmed.ncbi.nlm.nih.gov/36630953/)). Slow breathing is linked with higher heart-rate variability and lower anxiety ([Zaccaro et al. 2018](https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2018.00353/full)).
  - Habit research: missing one opportunity barely affects habit formation ([Lally et al. 2010](https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674)). A minimum session protects the routine **(practice framing)**.
- **Structure and intensity.** 1–2 min of breathing (longer exhale) → 3–10 min of slow flow or easy mobility → optional light strength (1 set each, RIR ≥4, levels one below current) → 1 min of breathing. The user can stop after any block, and that still counts.
- **Durations.** 5 ★ · 10 ✓ · 15 ✓ · 20 ✓ · 30+ –.
- **Include.** `marching_in_place` (easy), `cat_cow`, `open_book`, `childs_pose`, `hip_circles`, `arm_circles`, `rt_stretch_up`, `rt_side_bend`. Light strength (15+ min): `wall_push_up`/`incline_push_up`, `box_squat`, `glute_bridge`, `bird_dog`.
- **Avoid.** Bursts, near-failure sets, new or harder progressions, and anything that could feel like failing.
- **Safety.** Exercise is not a treatment for depression or anxiety disorders in this app. Show a gentle, permanent line: "If you've felt low or on edge most days for a couple of weeks, it's worth talking to your doctor." For illness (fever, infection), the `research.md` §10.2 illness pause is the right tool, not this moment.
- **Traditions.** `taichi_short_flow`, `taichi_cloud_hands`, `baduanjin_sequence` (short) and `baduanjin_hold_up_sky`. Morning Taisō is *not* a fit here (it is brisk).
- **Difference from Wind down.** It is for the daytime, allows light strength and says nothing about sleep. If the list must shrink, merge the two into one "Calm" moment (§7).

### 1.11 With kids or family: dropped for now

- **Evidence: C.** Family-based programmes raise children's activity a little (SMD 0.41, falling to 0.29 without an outlier; most studies weak or moderate quality) ([Brown et al. 2016](https://pubmed.ncbi.nlm.nih.gov/26756281/)). There is no evidence for any *session format*. For children, WHO asks for about 60 min a day of mostly aerobic play ([Bull et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7719906/)).
- **Why drop.** Kitaeru requires age ≥13 (`research.md` §4), and the planner cannot adapt load, cues or safety for young children. A "with kids" mode would imply that we programme for under-13s. **Recommendation:** leave it out of v1 of moments. Revisit as a separate, content-led feature (games, animal walks, partner moves), reviewed by a PE teacher, with the parent as the user.

---

## 2. Moments at a glance

| Moment | Kanji | Purpose (one line) | Grade | Minutes (★ default) | Intensity | Tradition core |
|---|---|---|---|---|---|---|
| Morning wake-up | 朝 | Loosen up and wake up | C (Taisō B) | 5 · **10** · 15 · 20 | easy → moderate | `radio_taiso_1` |
| Desk reset | 伸 | Break up sitting, open hips and chest | B | **5** · 10 · 15 | easy–moderate, standing | Taisō singles, cloud hands |
| Energy boost | 昼 | A quick lift: short brisk bursts | C (fitness B) | **5** · 10 | bursts RPE 7–8 | `radio_taiso_1`, `baithak` |
| After a meal | 食 | Easy movement soon after eating | B | 5 · **10** · 15 · 20 | easy–moderate, standing | `taichi_short_flow` |
| Before sport | 備 | Warm up and lower injury risk | A (injury), B (performance) | 5 · 10 · **15** · 20 | rising, never fatiguing | `radio_taiso_1` (5 min) |
| After sport | 整 | Settle down and stretch | C (soreness null: A) | 5 · **10** · 15 | very easy | `baduanjin_sequence` short |
| Wind down | 静 | Slow, calm, breath-led evening | B | 5 · **10** · 15 · 20 | easy | Baduanjin, Tai Chi |
| On the road | 旅 | No-kit, quiet, small-space full body | C | 10 · 15 · **20** · 30 · 45 | normal quick session, low impact | Tai Chi flow |
| Low-energy day | 息 | Gentle, breath-first, keeps the habit | B (small) | **5** · 10 · 15 · 20 | easy, RIR ≥4 | Tai Chi, Baduanjin |

---

## 3. Planner integration

### 3.1 Request shape

Add an optional `moment` to the Quick request:

```js
request = { minutes, moment?, goal?, focus?, muscles?, equipment?, space?, lowImpact?, date }
// moment ∈ 'morning' | 'desk' | 'energy' | 'after_meal' | 'before_sport' | 'after_sport' | 'wind_down' | 'travel' | 'low_energy'
```

Precedence: `moment` > `muscles` > `focus`. A moment ignores `goal`: it uses `health` for loading rules. Add `moment` to the seed hash so Shuffle and date variety still work. The session name is `${minutes}-min ${MOMENT_LABEL[moment]}` (for example "10-min Morning wake-up").

### 3.2 A config table, not new code paths

Each moment is data read by `generateQuickSession`, in the style of `ROTATION_MOBILITY`:

```js
const MOMENTS = {
  morning:      { minutes: [5,10,15,20], def: 10, tpl: 'flow',  flowFirst: ['radio_taiso_1'], pool: MORNING_POOL,
                  strengthFrom: 10, balanceFrom: 15, exclude: EARLY_FLEXION, cond: 0, holdCap: 30, levelCap: 0 },
  desk:         { minutes: [5,10,15],    def: 5,  tpl: 'flow',  posture: 'standing', space: 'small', pool: DESK_POOL, cond: 0, noImpact: true, holdCap: 30 },
  energy:       { minutes: [5,10],       def: 5,  tpl: 'snack', bursts: [2,4], burstSec: [20,60], pool: ENERGY_POOL, levelCap: 0, gateVigorous: true },
  after_meal:   { minutes: [5,10,15,20], def: 10, tpl: 'flow',  posture: 'standing', noImpact: true, noWarm: true, pool: MEAL_POOL,
                  flowFirst: ['taichi_short_flow', 'radio_taiso_1'], variant: { radio_taiso_1: 'lowImpact' }, cond: 0 },
  before_sport: { minutes: [5,10,15,20], def: 15, tpl: 'ramp',  pool: RAMP_POOL, holdCap: 30, maxHoldsPerMuscle: 1, rir: 3, levelCap: 0,
                  potentiate: 'impactAllowed', flowFirst5: ['radio_taiso_1'] },
  after_sport:  { minutes: [5,10,15],    def: 10, tpl: 'flow',  pool: COOL_POOL, longHolds: 1, flowFirst: ['baduanjin_sequence:short'], cond: 0, strength: 0 },
  wind_down:    { minutes: [5,10,15,20], def: 10, tpl: 'flow',  pool: WIND_POOL, longHolds: 1, breathEnd: 90,
                  flowFirst: ['baduanjin_sequence:short', 'taichi_short_flow'], exclude: ['radio_taiso_1'], cond: 0, strength: 0, darkPlayer: true },
  travel:       { minutes: [10,15,20,30,45], def: 20, tpl: 'full', forceLowImpact: true, space: 'small',
                  equipment: ['wall', 'bench', 'table'], ban: ['bear_crawl', 'burpee', 'dead_hang'] },
  low_energy:   { minutes: [5,10,15,20], def: 5, tpl: 'flow', breathStart: 60, breathEnd: 60, pool: CALM_POOL,
                  strengthFrom: 15, rir: 4, levelOffset: -1, cond: 0, exclude: ['radio_taiso_1'] },
};
```

`levelCap: 0` = never above the user's current family level. `levelOffset: -1` = one level below it (floor 1).

### 3.3 Selection rules (apply in this order)

1. **The normal filters come first**, unchanged: equipment, space, injuries, age band, BMI, pre-screen, `effectiveLowImpact`, and `isVisible` (tradition items only when verified and animated). Moments never loosen a safety filter.
2. **Minutes.** If `minutes` is not in `MOMENTS[m].minutes`, snap it to the nearest allowed value. The UI should also only show the allowed chips.
3. **Moment filters** (on top of step 1):
   - `posture: 'standing'` → keep only standing items (§6 proposes a `posture` field; until then use the explicit pools).
   - `noImpact` or `forceLowImpact` → exclude `impact: 'high'`, and use the `lowImpact` variant of `radio_taiso_1`.
   - `exclude` / `ban` → drop those ids. `EARLY_FLEXION` = `standing_hamstring_stretch`, `pancake_stretch`, `childs_pose`, `lying_leg_raise`, `hollow_body_hold`, `baduanjin_touch_toes`.
   - `after_meal` also excludes prone and supine floor items (every item in the pool is standing).
   - `cond: 0` and `strength: 0` remove those blocks entirely.
4. **Flows first.** Walk `flowFirst`. Use the first flow that is available (`availableFlows`) and fits in ≤70% of the time. The `:short` suffix = the `short` variant. At 5 min, Morning uses `radio_taiso_1` (186 s) plus one standing item. Before sport uses it only for the 5-min version. Otherwise the pool alone fills the time.
5. **Fill from the pool in order**, using `fillFlat` with the moment's `holdCap` and `longHolds` and rotating the start index by `seed`. Tradition singles in a pool are skipped when not visible, so each pool must still work with **zero** tradition items (the pools below lead with generic ids for that reason).
6. **Levels.** Strength items use the user's current family level (the `levelsEx` default), capped by `levelCap`, or offset by `levelOffset`. Never above the current level, and never an exercise never logged before, for `before_sport`, `energy` and `low_energy` **[practice]**. RIR comes from the moment when set; otherwise use `health`.
7. **Special templates.**
   - `snack` (Energy boost): 60 s easy raise → N bursts (N = 2 at 5 min, 4 at 10), each `burstSec` long, from the conditioning or fast-squat pool, with 30–60 s easy marching between → 45–60 s of standing openers. If `gateVigorous` fails (pre-screen Q1–3/Q7, age ≥65, BMI ≥35), the bursts become 60 s of moderate marching or squats, and the name stays the same.
   - `ramp` (Before sport): split the time about 20% Raise / 30% Activate / 35% Mobilise / 15% Potentiate. Potentiate only when impact is allowed; otherwise its time goes to Activate. For 65+, Raise gets Potentiate's time. `research.md` §4 warm-up minimums do not apply, because the session is itself a warm-up.
   - `full` (On the road): the existing default Quick template with the forced overrides.
8. **Breath blocks** (`breathStart`, `breathEnd`) use `rt_deep_breath` when visible and promoted. Otherwise use a timed "Paced breathing" note item (inhale 4 s, exhale 6 s) with no animation. **Never a breath hold.**
9. **Balance for 55+.** The `research.md` §4 balance minimum applies to hard sessions only. Moments are light, so skip it, except that `morning` at 15+ and `travel` still add `taichi_golden_rooster` or a single-leg item for age ≥55.
10. **Determinism.** Same inputs → same session.

### 3.4 Pools (ordered; generic first, tradition ids are skipped when not visible)

| Pool | Ordered ids |
|---|---|
| `MORNING_POOL` | `marching_in_place`, `arm_circles`, `rt_stretch_up`, `rt_side_bend`, `hip_circles`, `rt_trunk_twist`, `leg_swings`, `taichi_commencement`, `open_book`, `cat_cow`, `thoracic_opener`, `worlds_greatest_stretch`, `baduanjin_hold_up_sky`, `taichi_cloud_hands`; strength from 10 min: `box_squat`/`bodyweight_squat`, `wall_push_up`/`incline_push_up`, `glute_bridge`, `bird_dog`, `calf_raise`; balance from 15: `taichi_golden_rooster` |
| `DESK_POOL` | `marching_in_place`, `box_squat`, `calf_raise`, `rt_stretch_up`, `doorway_chest_stretch`, `seated_trunk_rotation`, `wall_push_up`, `rt_side_bend`, `hip_circles`, `arm_circles`, `rt_trunk_twist`, `leg_swings`, `single_leg_rdl`, `taichi_cloud_hands`, `baduanjin_hold_up_sky`, `baduanjin_look_back` |
| `ENERGY_POOL` (bursts) | impact: `high_knees`, `jumping_jack`, `squat_jump`; low impact: `marching_in_place` (fast), `bodyweight_squat` (fast), `baithak`, `mountain_climber`; easy parts: `arm_circles`, `hip_circles`, `rt_stretch_up`, `rt_trunk_twist` |
| `MEAL_POOL` | `marching_in_place`, `calf_raise`, `bodyweight_squat`/`box_squat` (half range), `hip_circles`, `arm_circles`, `rt_stretch_up`, `rt_side_bend`, `leg_swings`, `taichi_cloud_hands`, `taichi_part_horse_mane`, `taichi_brush_knee`, `baduanjin_hold_up_sky`, `baduanjin_draw_bow`, `single_leg_calf_raise` |
| `RAMP_POOL` | Raise: `marching_in_place`, `jumping_jack`, `high_knees` · Activate: `glute_bridge`, `bird_dog`, `split_squat`, `calf_raise`, `single_leg_rdl`, `side_plank`, `plank_shoulder_tap`, `reverse_lunge`, `baduanjin_draw_bow`, `taichi_golden_rooster` · Mobilise: `leg_swings`, `hip_circles`, `arm_circles`, `worlds_greatest_stretch`, `inchworm`, `open_book`, `rt_trunk_twist`, `rotational_lunge` · Potentiate: `squat_jump`, `high_knees` |
| `COOL_POOL` | `marching_in_place` (slow), `hip_flexor_stretch`, `standing_hamstring_stretch`, `calf_stretch`, `doorway_chest_stretch`, `pigeon_stretch`, `childs_pose`, `thread_the_needle`, `open_book`, `cat_cow`, `deep_squat_hold`, `taichi_commencement` |
| `WIND_POOL` | `cat_cow`, `open_book`, `thread_the_needle`, `childs_pose`, `thoracic_opener`, `hip_flexor_stretch`, `pigeon_stretch`, `standing_hamstring_stretch`, `calf_stretch`, `taichi_cloud_hands`, `baduanjin_hold_up_sky`, `baduanjin_look_back`, `taichi_commencement` (close) |
| `CALM_POOL` | `marching_in_place` (easy), `rt_stretch_up`, `rt_side_bend`, `hip_circles`, `arm_circles`, `cat_cow`, `open_book`, `childs_pose`, `taichi_cloud_hands`, `baduanjin_hold_up_sky`; strength from 15: `wall_push_up`/`incline_push_up`, `box_squat`, `glute_bridge`, `bird_dog` |

### 3.5 Logging and streaks

A moment session is a Quick session (`id: 'Q'`), so it logs and counts exactly as Quick does today. **Open question for Product:** moments of ≤10 min are closer to Morning Taisō than to a training session. The proposal is that they keep the day streak alive but do not count towards the weekly session target, which matches the rule already proposed for Morning Taisō (`world-movement.md` §4.5). `applySessionLog` should not evaluate progression on `before_sport`, `after_sport`, `wind_down`, `low_energy` or `after_meal` sessions, because they are deliberately below the user's level. `travel` and `morning` strength items may progress normally.

---

## 4. UI wording

### 4.1 The third "Train for" option

`Train for: [A goal] [A body area] [A moment]`

When "A moment" is picked, show chips with a kanji mark, in the style of the goal chips (`<span class="qk">朝</span>Morning wake-up`). Under the chips, show a one-line helper for the selected moment (§5). Show only that moment's allowed minute chips, and pre-select its default.

| id | Chip label | Kanji | Reading and meaning | Why it is natural |
|---|---|---|---|---|
| `morning` | Morning wake-up | 朝 | *asa*, morning | As in 朝の体操 (morning exercises), which is exactly what Radio Taisō is. |
| `desk` | Desk reset | 伸 | *nobi*, stretch, reach | 伸びをする is the everyday phrase for stretching after sitting. 伸びの運動 is also the first move of Radio Taisō. |
| `energy` | Energy boost | 昼 | *hiru*, midday | As in 昼休み (lunch break). It marks the time rather than claiming an effect. |
| `after_meal` | After a meal | 食 | *shoku*, eating, meal | Read with the label, it evokes 食後 (after eating). **Alternative:** the two-character 食後 if the design allows two characters here. |
| `before_sport` | Before sport | 備 | *sonae*, prepare | From 準備運動, the standard Japanese PE term for a warm-up. |
| `after_sport` | After sport | 整 | *totonoe*, put in order, settle | From 整理運動, the standard Japanese PE term for a cool-down. 整う ("to be settled") is also a current everyday word for feeling restored. |
| `wind_down` | Wind down | 静 | *shizuka*, quiet, still | Calm and stillness, with no promise about sleep. **Alternative:** 夜 (*yoru*, night) if a time-of-day mark is preferred. Avoid 眠 (sleep): it overclaims. |
| `travel` | On the road | 旅 | *tabi*, journey, travel | Plain and natural. |
| `low_energy` | Low-energy day | 息 | *iki*, breath | As in 一息つく ("take a breather"), which is exactly the mood of this moment. |

None of these clash with the existing marks (即 力 筋 耐 柔 技 健 衡). As with the tradition names (`world-movement.md` §5.2), **a native speaker should sign off the set before release**, especially 食 used alone and 整 (its newer sauna-culture sense, 整う, is positive but informal).

### 4.2 Optional clock hint

Pre-highlight (never auto-select) one moment from the local time: 05:00–10:00 → Morning wake-up; 12:00–14:00 → After a meal; 14:00–16:30 → Energy boost; after 20:30 → Wind down. The user's saved pick (`settings.quick`) wins over the hint.

### 4.3 Morning Taisō link

If Morning Taisō is enabled and already logged today, the Morning wake-up helper reads "You've done Morning Taisō today. This adds a little more." and the 5-min option starts after the Taisō instead of repeating it.

---

## 5. Copy lines (honest, graded)

Helper line under the chips (≤ 90 characters), then an optional "Why" line for the info sheet. **Do not** use the words *burn*, *detox*, *boost metabolism*, *fat*, *reset your hormones*, *cure* or *prevent* (except "lower injury risk" for Before sport, which is grade A).

| Moment | Helper line | "Why" line (info sheet) | Grade |
|---|---|---|---|
| Morning wake-up | Gentle, standing moves to loosen up and start the day. | Your back is stiffer first thing, so we keep deep forward bends for later. | C (B for back pain) |
| Desk reset | A few minutes on your feet to undo some of the sitting. | Short, frequent movement breaks can lower blood-sugar rises during long sitting. Little and often works best. | B |
| Energy boost | Short, brisk bursts for a quick lift. Good before lunch, too. | Many people feel more alert after a brisk few minutes. Short bursts through the day add up for fitness. | C / B |
| After a meal | Easy, steady moves soon after eating. A walk works just as well. | Moving soon after a meal can help soften the rise in blood sugar. Sooner is better than later. | B |
| Before sport | Raise, activate, mobilise, then a few quick efforts. | Structured warm-ups with strength and balance work lower injury risk in team sports. Keep stretches short: under 30 seconds. | A / B |
| After sport | Slow down, breathe and stretch while you're warm. | A cool-down won't stop soreness, but it's a good time to work on flexibility and let your breathing settle. | C (A for the soreness null) |
| Wind down | Slow flow, easy stretches and a longer out-breath. | Gentle movement in the evening is fine for sleep. It's hard efforts right before bed that can keep some people up. | B |
| On the road | No kit, small space, no jumping. The neighbours will never know. | After flying east, moving in your destination's morning or early afternoon may help you adjust. | C |
| Low-energy day | Breathe first, then move gently. Stopping early still counts. | A short, easy session can take the edge off. Five minutes keeps the habit going. | B (small) |

Always-on line for Low-energy day and Wind down: "If you've felt low, anxious or unable to sleep most days for a couple of weeks, it's worth talking to your doctor."

---

## 6. Content and schema suggestions (non-blocking, for the Content owner)

1. **`posture` field** (`'standing' | 'seated' | 'kneeling' | 'floor'`) on every exercise. Moments need it (Desk, After a meal), and it would let pools shrink to rules.
2. **Promote `rt_deep_breath`** from `flowOnly` to a standalone `breath` item (`world-movement.md` v1.3 already plans it). Wind down, After sport and Low-energy day use it. Also add a generic `paced_breathing` (longer exhale, no hold) so breath blocks work without the Radio Taisō gate.
3. **`standing_hip_flexor_stretch`** (a split stance with the back heel lifted and pelvis tucked). This gives Desk reset and After a meal a hip opener with no kneeling.
4. **`seated_calf_raise`** ("soleus raise": seated, heels up and down, slow and continuous). This is a desk and after-meal option **(C)**, with no claimed figure.
5. **`wall_angel`** or a standing `band_pull_apart` for Desk reset upper back, replacing the floor-only `prone_ytw`.
6. **`towel_door_row`** is **not** recommended: a door-anchored towel can fail. For travel, keep `table_row` only with a sturdy desk.
7. Seated Radio Taisō (v1.3) would make Morning wake-up and Desk reset work for 75+ users.

---

## 7. Roadmap and open questions

**v1.3 (with "Flow and breath")**
- Ship six moments whose content already exists: **Morning wake-up, Desk reset, After a meal, Before sport, After sport, Wind down**. All of them work with zero tradition items and improve when Taisō, Tai Chi or Baduanjin are visible.
- Add the `posture` field and `paced_breathing` (§6).

**v1.4**
- **Energy boost, On the road, Low-energy day.** These need the `snack` template, the `gateVigorous` check and forced low impact.
- The sport-type sub-choice for Before sport (lower-body or upper-body bias).

**Later**
- Optional reminders for Desk reset (every 30–60 min in working hours), if PWA notifications allow. The evidence favours frequency over length **(B)**.
- With kids or family, as a reviewed, content-led feature (§1.11).

**Open questions**
1. **Streak weight of short moments** (§3.5): keep the day streak alive but not count towards the weekly target? This needs a Product decision, shared with Morning Taisō.
2. **Trim to eight?** If nine chips feel crowded on a phone, merge **Wind down + Low-energy day → "Calm" (静)**, with the evening rules applied after 19:00. That is the only merge the evidence allows without losing a distinct purpose.
3. **Before a meal wording.** The founder asked for "before a major meal". This document recommends After a meal (§1.5). Confirm with the founder.
4. **Glucose copy for people with diabetes.** Keep it general ("can help soften the rise"). Do not add targets, CGM numbers or medication advice.
5. **Native-speaker review** of the nine kanji (§4.1).

---

## Sources opened for this document

Meal and sitting: [Engeroff 2023](https://pubmed.ncbi.nlm.nih.gov/36715875/) · [Reynolds 2016](https://pubmed.ncbi.nlm.nih.gov/27747394/) · [Bellini 2024](https://pubmed.ncbi.nlm.nih.gov/38674861/) · [Buffey 2022](https://pubmed.ncbi.nlm.nih.gov/35147898/) · [Dunstan 2012](https://pubmed.ncbi.nlm.nih.gov/22374636/) · [Dempsey 2016](https://pubmed.ncbi.nlm.nih.gov/27208318/) · [Hamilton 2022](https://pubmed.ncbi.nlm.nih.gov/36034224/) · [Francois 2014](https://pubmed.ncbi.nlm.nih.gov/24817675/)
Sleep and calm: [Stutz 2019](https://pubmed.ncbi.nlm.nih.gov/30374942/) · [Frimpong 2021](https://pubmed.ncbi.nlm.nih.gov/34416428/) · [Leota 2025](https://pubmed.ncbi.nlm.nih.gov/40234380/) · [Wang 2026](https://pubmed.ncbi.nlm.nih.gov/42576331/) · [Zhao 2026](https://pubmed.ncbi.nlm.nih.gov/42639391/) · [Kovacevic 2018](https://pubmed.ncbi.nlm.nih.gov/28919335/) · [Balban 2023](https://pubmed.ncbi.nlm.nih.gov/36630953/) · [Ensari 2015](https://pubmed.ncbi.nlm.nih.gov/25899389/)
Sport: [Thorborg 2017](https://pubmed.ncbi.nlm.nih.gov/28087568/) · [Soligard 2008](https://pubmed.ncbi.nlm.nih.gov/19066253/) · [Lauersen 2014](https://pubmed.ncbi.nlm.nih.gov/24100287/) · [Fradkin 2010](https://pubmed.ncbi.nlm.nih.gov/19996770/) · [Behm 2016](https://pubmed.ncbi.nlm.nih.gov/26642915/) · [RAMP, Human Kinetics](https://us.humankinetics.com/blogs/strength-conditioning-fitness/the-ramp-system) · [Van Hooren & Peake 2018](https://pubmed.ncbi.nlm.nih.gov/29663142/) · [Herbert 2011](https://pubmed.ncbi.nlm.nih.gov/21735398/)
Morning, energy, travel, family: [Adams 1987](https://pubmed.ncbi.nlm.nih.gov/3589804/) · [Snook 1998](https://pubmed.ncbi.nlm.nih.gov/9854759/) · [Aird 2018](https://pubmed.ncbi.nlm.nih.gov/29315892/) · [Youngstedt 2019](https://pubmed.ncbi.nlm.nih.gov/30784068/) · [Randolph 2017](https://pubmed.ncbi.nlm.nih.gov/28302573/) · [Puetz 2006](https://pubmed.ncbi.nlm.nih.gov/17073524/) · [Jenkins 2019](https://pubmed.ncbi.nlm.nih.gov/30649897/) · [Stamatakis 2022](https://pubmed.ncbi.nlm.nih.gov/36482104/) · [Chen 2018](https://academic.oup.com/ptj/article/98/1/40/4430817) · [Brown 2016](https://pubmed.ncbi.nlm.nih.gov/26756281/)
Carried over from `research.md` and `world-movement.md`: Osuka 2024, Garber 2011, Kotarsky 2018, Zaccaro 2018, Lally 2010, Bull 2020.
