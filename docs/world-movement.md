# Kitaeru: World Movement Blueprint

Owner: Research (movement anthropology and exercise science). Consumers: Content (`js/data/exercises.js`, the proposed `js/data/traditions.js`), Animation (`js/anim/*`), Engine (`js/engine/planner.js`) and UI. Last reviewed: 2026-09-28.

鍛える means "to forge body and mind". This document plans how Kitaeru grows from 82 calisthenics exercises into a library of strength and mobility practices from around the world. It covers a survey of 20 traditions, 85 candidate movements, rotational training, planner integration, cultural respect, a schema proposal and a phased roadmap.

**How to read the evidence grades**

| Grade | Meaning |
|---|---|
| **A** | Several meta-analyses of RCTs agree, with at least moderate certainty. Safe to make a specific claim in the app ("reduces falls"). |
| **B** | At least one good RCT or a meta-analysis with low certainty. Use hedged copy ("may improve"). |
| **C** | Small or low-quality trials, or indirect evidence from similar exercise. Copy describes what it trains, not outcomes. |
| **D** | Historical and practice-based only. Copy must not claim health outcomes. |

Rule for copy: **we describe the traditional explanation as the tradition's own** ("in Qigong this is said to regulate the *sānjiāo*"), and we never present it as medical fact. Physiological claims must meet the grade above.

---

## 0. Summary

1. **Tai Chi is our best-evidenced import.** It has grade A evidence for falls and balance in older adults. A tailored programme cut falls by 58% versus stretching ([Li et al. 2018, JAMA Intern Med](https://pubmed.ncbi.nlm.nih.gov/30208396/)). It fits a 2D animator reasonably well, if the torso can turn.
2. **Radio Taisō is our best brand fit.** It is Japanese, 3 minutes long, and loved, and it now has RCT evidence in frail older adults ([Osuka et al. 2024, J Epidemiol](https://www.jstage.jst.go.jp/article/jea/34/10/34_JE20230317/_article/-char/en)). We may use the movements, but **not the music**: Japan Post Insurance (かんぽ生命) holds the copyright ([Kampo](https://www.jp-life.japanpost.jp/radio/abt_csr_rdo_cr.html)).
3. **Baduanjin** (Eight Pieces of Brocade) is short, standing, standardised and has grade B evidence ([Zou et al. 2017](https://pubmed.ncbi.nlm.nih.gov/28367223)). It is an ideal cool-down and rest-day flow.
4. **Pehlwani dands and baithaks** and the **horse stance** add genuine strength work with deep roots. Their evidence is grade C/D, but they sit on the same progression logic as our existing push-up and squat ladders.
5. **Rotation is the biggest gap in the current library.** Of 82 exercises, only `thoracic_opener` and `worlds_greatest_stretch` train the transverse plane, and there is no anti-rotation work. Add a `rotation` family and an `anti_rotation` family (§3).
6. **The animation team must add torso and pelvis yaw, stepping with weight transfer, multi-minute sequences, props and a breath indicator** before any of this ships (§2.2).
7. **Some practices must not be packaged as exercises:** haka, hula, wai khru ram muay, the Mongolian eagle dance, the Turkish peşrev and the Zurkhaneh ritual as a whole (§5.3).

---

## 1. Survey of traditions

Each entry gives the origin, the principles, what it trains, the evidence (graded), and safety notes. S = strength, M = mobility, B = balance, Br = breath, C = coordination, E = endurance.

### 1.1 Tai Chi (太极拳 tàijíquán), China: Yang-style 24 form

- **Origin.** Tai Chi is an internal martial art from 17th–19th-century China. It developed into the Chen, Yang, Wu, Sun and other family styles. In 1956 China's sports commission gathered masters to create the **Simplified 24-form** from the Yang long form (about 108 movements) as "exercise for the masses". It takes about six minutes and is probably the most practised form in the world ([Wikipedia: 24-form](https://en.wikipedia.org/wiki/24-form_tai_chi)).
- **Principles.** Slow, continuous movement. Weight shifts fully from one leg to the other ("separate full and empty"). Turning comes from the waist (腰 yāo). The body stays upright and relaxed (松 sōng), and breath is natural and unforced.
- **Trains.** B +++, M ++, C ++, S + (sustained single-leg loading in a bent-knee stance), Br +.
- **Evidence: A for falls and balance.**
  - Cochrane (community-dwelling older adults): Tai Chi may reduce the rate of falls by 19% (RaR 0.81, 95% CI 0.67–0.99; 7 trials; low certainty) ([Sherrington et al. 2019](https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD012424.pub2/full)).
  - Meta-analysis of 24 RCTs: fall risk RR 0.76 (0.71–0.82). Effects hold in healthy and high-risk older adults and grow with duration and frequency ([Frontiers Public Health 2023, PMC10509476](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10509476/)).
  - A network meta-analysis of 17 RCTs (3,470 participants) ranked **Yang 24-form** as the most effective style for fall prevention ([Aging Clin Exp Res 2023](https://link.springer.com/article/10.1007/s40520-023-02674-7)).
  - TJQMBB (a therapeutic 8-form derived from Tai Chi), 2 × 60 min/week for 24 weeks, in 670 adults aged about 78 at high fall risk: falls IRR 0.42 versus stretching and a 31% reduction versus multimodal exercise ([Li et al. 2018](https://pubmed.ncbi.nlm.nih.gov/30208396/)).
  - Knee osteoarthritis: 12 weeks of Tai Chi matched standard physical therapy ([Wang et al. 2016, Ann Intern Med](https://pubmed.ncbi.nlm.nih.gov/27183035/)).
  - Broad review of 77 RCTs of Qigong and Tai Chi: consistent benefits for bone health, cardiopulmonary fitness, balance and quality of life ([Jahnke et al. 2010, AJHP](https://pubmed.ncbi.nlm.nih.gov/20594090/)).
  - *Honest caveats:* the trials are heterogeneous in style, dose and instructor quality ([Wayne & Kaptchuk 2008](https://pubmed.ncbi.nlm.nih.gov/18446928/)). Almost all use supervised classes. Nobody has tested whether a phone animation delivers the same effect.
- **Safety.** Adverse events are mostly minor knee and back aches, with no serious intervention-related events reported in RCTs. Adverse-event reporting is poor, though ([Wayne et al. 2014, Arch Phys Med Rehabil](https://www.sciencedirect.com/science/article/abs/pii/S000399931400392X)). The knee is the main risk in low stances with the knee twisting relative to the foot. Cue: "knee follows toes; turn from the hip, not the knee". Offer a "high stance" default and allow a chair nearby for single-leg forms.

### 1.2 Qigong: Baduanjin (八段锦 bāduànjǐn, "Eight Pieces of Brocade"), China

- **Origin.** Baduanjin is one of the oldest documented *dǎoyǐn* (導引, guiding and pulling) health routines. Written records go back to the Song dynasty (12th century). The Chinese Health Qigong Association standardised a version in 2003, and it is taught in Chinese schools and hospitals ([Wikipedia](https://en.wikipedia.org/wiki/Baduanjin_qigong)).
- **Principles.** Eight standing movements, each repeated several times. Movement is coordinated with slow breathing and there is a sustained stretch at the end range of each movement. Each movement's name is a couplet that states its traditional purpose.
- **Trains.** M ++ (shoulders, spine, hamstrings), Br ++, B + (heel raises, horse stance), S + (horse stance in the bow and fist forms).
- **Evidence: B.** A meta-analysis of 19 RCTs (1,535 participants aged 19–75) found benefits for quality of life, sleep quality, balance, handgrip strength, trunk flexibility, blood pressure and resting heart rate. The authors call for better trials on leg power and cardiorespiratory endurance ([Zou et al. 2017, eCAM](https://pubmed.ncbi.nlm.nih.gov/28367223)). There are condition-specific reviews for stroke rehabilitation ([PMC5923642](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5923642/)) and fatigue ([PMC10419663](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10419663/)). Many trials are small, Chinese-language and at high risk of bias.
- **Safety.** "Wise owl looks back" and "sway the head and tail" load the neck. Keep the neck range small and pain-free, and exclude them for `neck` injuries. "Touch the toes" is loaded spinal flexion, so give it a knees-bent option and cap the range for `lower_back` injuries and suspected osteoporosis.

### 1.3 Zhan zhuang (站桩, "standing like a post") and Shaolin stance training, China

- **Origin.** Chinese martial arts train stances (步型 bùxíng) as isometric foundations. The **horse stance** (马步 mǎbù) is the classic Shaolin and southern-style drill ([Wikipedia: Horse stance](https://en.wikipedia.org/wiki/Horse_stance)). Zhan zhuang, a standing meditation, was popularised by Wang Xiangzhai (1885–1963).
- **Principles.** Hold a stance in stillness with alignment, relaxation and breath. The stance lowers over months.
- **Trains.** S ++ (quads, adductors, glutes: isometric), B +, Br +.
- **Evidence: C** (indirect). Isometric wall-sit style holds build quad endurance, and isometric training, with the wall squat ranked highest, lowers resting blood pressure ([Edwards et al. 2023, BJSM](https://pubmed.ncbi.nlm.nih.gov/37491419/)). There are no specific RCTs of mǎbù.
- **Safety.** Deep holds load the knees and patellofemoral joint. Start high (knee angle about 150°), progress depth before duration, and never hold the breath (Valsalva) if the user may have high blood pressure.

### 1.4 Radio Taisō (ラジオ体操 rajio taisō), Japan

- **Origin.** It was first broadcast on 1 November 1928 by the Ministry of Communications' Postal Life Insurance Bureau, the Ministry of Education and NHK, inspired by MetLife's US radio exercises. It was suspended after 1945 and relaunched in 1951 in its current form (No. 1). Millions still do it each morning, in parks, schools and workplaces ([Nippon.com](https://www.nippon.com/en/features/jg00068/); [Wikipedia](https://en.wikipedia.org/wiki/Radio_calisthenics)).
- **Principles.** Thirteen whole-body movements in about 3 minutes, done to a piano count. It moves every major joint through every plane: side bends, forward and back bends, twists, trunk circles, low hops and a closing deep breath. The official sequence of No. 1 is: 伸びの運動 (stretch up); 腕を振って脚を曲げ伸ばす運動 (arm swing and knee bend); 腕を回す運動 (arm circles); 胸を反らす運動 (chest opener); 体を横に曲げる運動 (side bend); 体を前後に曲げる運動 (forward and back bend); 体をねじる運動 (trunk twist); 腕を上下に伸ばす運動 (arms up and down); 体を斜め下に曲げ胸を反らす運動 (diagonal bend and chest opener); 体を回す運動 (trunk circle); 両脚で跳ぶ運動 (two-foot hops); a repeat of the arm swing and knee bend; and 深呼吸 (deep breathing) ([Kampo illustrated guide](https://www.jp-life.japanpost.jp/radio/instruction/radio_first.html)). There is an official **seated version** (座位). In it the hops are replaced by **shoulder shakes**: relax the shoulders and arms and lightly shake the shoulders 8 times, twice (8 × 2) ([Kampo seated guide](https://www.jp-life.japanpost.jp/radio/instruction/radio_first_zai.html)) (fact-check 2026-09-29).
- **Trains.** M ++, C +, light E, a little S. It is a warm-up and mobility routine, not strength training.
- **Evidence: B for frail older adults.** A 12-week RCT (n = 226, pre-frail and frail older adults) did not improve its primary outcome, mental HRQoL. It did improve agility and dynamic balance, aerobic endurance and exercise self-efficacy, with a median adherence of about 94% ([Osuka et al. 2024](https://www.jstage.jst.go.jp/article/jea/34/10/34_JE20230317/_article/-char/en); pilot: [Osuka et al. 2023](https://onlinelibrary.wiley.com/doi/10.1111/ggi.14511)). In a cohort study of 18,016 people aged 65 and over followed for 5.3 years, Radio Taisō practice was associated with lower dementia risk (HR 0.82, 95% CI 0.68–0.9998). This is observational, so there is residual confounding ([JAGES, SSM Popul Health 2024](https://www.sciencedirect.com/science/article/pii/S2352827324001320)).
- **Safety.** The hops are high-impact, so swap in a heel raise for `lowImpact`. Trunk circles and back bends need a gentle range for `lower_back`. Use the seated version for 75+ users or users with balance concerns.
- **Legal.** The movements are free to teach, but **the music is copyrighted**. Kampo requires an application to use it, forbids arrangements and forbids use as background music ([Kampo usage rules](https://www.jp-life.japanpost.jp/radio/abt_csr_rdo_cr.html)). Kitaeru must use its own count and voice. Before using ラジオ体操 in marketing, check the trademark status, and never imply official endorsement. Attribute the sequence as "the Radio Taisō No. 1 sequence (NHK / Japan Post Insurance)".

### 1.5 Makkō-hō (真向法), Japan

- **Origin.** Wataru Nagai (reported as 1889–1963 in WEB秘伝 (BAB Japan) and a Wikipedia article that cites it; not confirmed elsewhere, so keep the dates hedged) recovered from a stroke by practising the full bows of a Buddhist sutra he had read; the recovery came first, and in 1933 he founded Makkō-hō and began teaching its four floor stretches (fact-check 2026-09-29). Makkō-hō is still taught in Japan, and at least one aikidō dojo includes it in its warm-up (fact-check 2026-09-29).
- **Principles.** Four stretches, each done with exhale-led folding: seated sole-to-sole forward bend; long sitting forward fold; wide straddle fold; and kneeling back-lying (a reclined hero pose).
- **Trains.** M +++ (hips, hamstrings, adductors, quads), Br +.
- **Evidence: D.** There are no trials. Use the general flexibility dose from ACSM ([Garber et al. 2011](https://pubmed.ncbi.nlm.nih.gov/21694556/)).
- **Safety.** The 4th stretch (kneeling back-lying) strongly loads the knees and lumbar spine. Offer a one-leg version (Kitaeru's own option, not in the association's material (fact-check 2026-09-29)) and exclude it for `knee` injuries.

### 1.6 Budō stances and conditioning, Japan (karate, kendō, sumō)

- **Origin.** Karate inherits stances from Okinawan and Chinese arts: kiba-dachi (騎馬立ち, horse riding stance) and shiko-dachi (四股立ち) ([Wikipedia: Karate stances](https://en.wikipedia.org/wiki/Karate_stances)). Kendō uses suburi (素振り), repeated sword swings with a shinai or bokken. Sumō's shiko (四股) leg-stamp is both conditioning and ritual (see §5.3).
- **Principles.** Rootedness, a low centre and repetition (稽古 keiko).
- **Trains.** S + (stances), E + (suburi), M + (shiko hips and adductors).
- **Evidence: D** (practice-based).
- **Safety.** Shiko includes a single-leg balance with a wide hip abduction. It is a hip and knee load, so progress the height slowly.

### 1.7 Yoga āsana and Sūrya Namaskār, India

- **Origin.** Yoga is a broad South Asian philosophical and spiritual tradition that is thousands of years old. Most of today's standing and flowing āsana practice dates from the late 19th and 20th centuries. It developed partly in dialogue with European physical culture, including Ling's Swedish gymnastics ([Singleton 2010, *Yoga Body*, OUP](https://en.wikipedia.org/wiki/Yoga_Body)). Sūrya Namaskār (Sun Salutation) was popularised and named by the Raja of Aundh, Bhawanrao Pant Pratinidhi, in his 1928 book, *Surya Namaskars – For Health, Efficiency & Longevity* (the English edition *The Ten-Point Way to Health*, by Louise Morgan, is 1938 (fact-check 2026-09-29)). He said it was already a common Marathi practice ([Wikipedia](https://en.wikipedia.org/wiki/Bhawanrao_Shriniwasrao_Pant_Pratinidhi)).
- **Principles.** Āsana (a steady, comfortable posture), linked with breath. In a flow (*vinyāsa*), each movement is paired with an inhale or exhale.
- **Trains.** M +++, B ++ (standing poses), S + (plank, chaturanga, warrior holds), Br ++.
- **Evidence: B.** In adults aged 60 and over, yoga has a small effect on balance and a medium effect on mobility ([Youkhana et al. 2016, Age Ageing](https://pubmed.ncbi.nlm.nih.gov/26707903/)). Its effect on falls is not proven. For Sūrya Namaskār, there are small RCTs showing fitness and strength benefits, mostly in young people, at high risk of bias ([systematic review, Healthcare 2026](https://www.mdpi.com/2227-9032/14/13/1924); [RCT, PMC12171770](https://pmc.ncbi.nlm.nih.gov/articles/PMC12171770/)).
- **Safety.** Sustained wrist extension in the plank and downward dog affects `wrist`. The cobra and upward dog put the lumbar spine into extension (`lower_back`). Headstands and shoulderstands are **excluded** from Kitaeru because of the neck load.

### 1.8 Pehlwani / Kushti (पहलवानी, کشتی), India and Pakistan

- **Origin.** Pehlwani is wrestling practised in earthen pits (akhāṛā). It blends indigenous malla-yuddha with Persian and Mughal influences. Its conditioning drills are the **daṇḍ** (दंड, "staff", the Hindu push-up), the **baiṭhak** (बैठक, "seat", the Hindu squat) and swinging the **gadā** (गदा, mace) and **jōṛī** (paired clubs). The Great Gama (Ghulam Muhammad, 1878–1960) reportedly did thousands of each daily ([Wikipedia: Hindu push-up](https://en.wikipedia.org/wiki/Hindu_push-up); [Hindu squat](https://en.wikipedia.org/wiki/Hindu_squat); [The Great Gama](https://en.wikipedia.org/wiki/The_Great_Gama)).
- **Principles.** Very high-repetition, rhythmic bodyweight work, with a traditional 2:1 ratio of baiṭhaks to daṇḍs. Discipline, diet and devotion are part of the akhāṛā way of life.
- **Trains.** S ++ (the daṇḍ is a push-up through a pike-to-cobra arc: chest, triceps, shoulders and spinal extension), E +++, M + (thoracic and hip extension).
- **Evidence: C** (indirect). The daṇḍ is a push-up variant, and push-up progressions are well evidenced ([Kotarsky et al. 2018](https://pubmed.ncbi.nlm.nih.gov/29466268/)). There are no trials of the specific movements. The traditional thousands of reps are an elite cultural practice, not a prescription.
- **Safety.** The baiṭhak lets the knees travel forward with the heels rising. This is fine for most healthy knees but loads the patellofemoral joint, so exclude or regress it for `knee`. The daṇḍ puts the lumbar spine into extension under load, so exclude it for `lower_back`, and it loads the `wrist` and `shoulder`.

### 1.9 Kalaripayattu (കളരിപ്പയറ്റ്), Kerala, India

- **Origin.** Kalaripayattu is a martial art of Kerala, transmitted orally from guru (gurukkal) to student over centuries, and often described as one of the oldest surviving martial arts. Training starts with **meythari / meypayattu** (body exercises), then moves on to wooden weapons, metal weapons and empty hand ([Kerala Tourism](https://www.keralatourism.org/kalaripayattu/disciplines/meythozhil)).
- **Principles.** Meypayattu is organised into four groups: kaikuthippayattu (hand-supported floor work), amarcha (low postures), therukkal (advance and retreat) and kaaluyarthippayattu (leg lifts and kicks). It also uses eight **vadivu** (animal postures: elephant, lion, horse, boar, snake, cat, rooster and fish).
- **Trains.** M +++ (dynamic hamstring and hip range from the kicks), S ++ (low stances), B ++, C ++.
- **Evidence: D.** There are no robust trials.
- **Safety.** The high straight-leg kicks (kaal eduppu) are ballistic hamstring stretches: progress the height slowly and exclude them for `lower_back` and hamstring injury. The postures should be **reviewed by a gurukkal** before release (§5).

### 1.10 Varzesh-e Pahlavani / Zurkhaneh (ورزش پهلوانی / زورخانه), Iran

- **Origin.** The zurkhāneh ("house of strength") combines pre-Islamic Persian, Sufi and Shia elements. Athletes train in a sunken octagonal pit (gowd), led by a **morshed** who drums on a zarb and recites epic and mystical poetry. UNESCO inscribed "Pahlevani and Zoorkhanei rituals" on its Intangible Heritage list in 2010 ([UNESCO](https://ich.unesco.org/en/RL/pahlevani-and-zoorkhanei-rituals-00378)).
- **Principles.** Rhythmic group movement to the drum: **shenā** (شنا, push-ups on a low board), **mīl-bāzī** (میل, swinging heavy wooden clubs behind the shoulders), **sang** (سنگ, heavy wooden shields pressed while lying down), **pā-zadan** (پا زدن, rhythmic footwork) and **charkh** (چرخ, spinning). Its ethic is humility, chivalry (javānmardī) and service.
- **Trains.** S ++ (shenā, sang), M ++ (shoulder circumduction with mīl), E ++, C ++.
- **Evidence: C/D.** Club swinging (the Indian clubs, descended from Persian mīl) is tested only in small studies: two 35-minute sessions increased shoulder flexibility in 23 students (conference abstract; [Jordan et al. 2015, IJES](https://digitalcommons.wku.edu/ijesab/vol9/iss3/45/)). One small study looked at cricket bowlers ([PMC10798617](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10798617/)).
- **Safety.** Swinging a club behind the head loads the `shoulder` in end-range rotation, so start with a light bottle. **Charkh (spinning) is excluded** because of the dizziness and fall risk.
- **Cultural note.** We include the *exercises*, attributed to the tradition. We do **not** reproduce the ritual, the morshed's verses, the bell or the gowd (§5.3).

### 1.11 Capoeira, Brazil (Afro-Brazilian)

- **Origin.** Capoeira was developed by enslaved Africans and their descendants in Brazil. It is widely linked to Central African (Angolan) traditions such as **engolo**, although the extent of that link is debated ([PMC12106554](https://pmc.ncbi.nlm.nih.gov/articles/PMC12106554/); [Engolo](https://en.wikipedia.org/wiki/Engolo)). Mestre Bimba (Regional) and Mestre Pastinha (Angola) codified the modern schools. UNESCO inscribed the **roda de capoeira** in 2014 ([Wikipedia](https://en.wikipedia.org/wiki/Capoeira)).
- **Principles.** The **ginga** (a Kimbundu-derived word) is a constant, rhythmic triangular sway. From it come esquivas (evasions), the aú (cartwheel), negativas (low evasions) and kicks, always played to the berimbau in a roda.
- **Trains.** C +++, E ++, M ++ (hips, adductors, thoracic rotation), S + (the low positions and the aú).
- **Evidence: D.** One RCT in adults is registered, not reported ([NCT06337929](https://clinicaltrials.gov/study/NCT06337929)). Dance-based exercise in general improves balance and gait in older adults, but its effect on falls is very uncertain ([Age Ageing 2024 meta-analysis](https://academic.oup.com/ageing/article/53/5/afae104/7679267)).
- **Safety.** The aú loads the `wrist` and `shoulder` and is excluded for them. The ginga is safe at low amplitude.

### 1.12 Muay Thai (มวยไทย), Thailand

- **Origin.** Muay Thai is Thailand's national combat sport, "the art of eight limbs", with roots in muay boran. Traditional conditioning uses running, skipping and shadow-boxing (chok lom), and pad and bag work.
- **Principles.** The hip-driven roundhouse kick (te), knee strikes (khao), the teep (push kick), and rhythm and balance on the ball of the foot.
- **Trains.** E +++, rotational power ++ (the roundhouse is a whole-body transverse-plane movement), B ++ (kicking on one leg).
- **Evidence: D** for health outcomes. The rotational power claims borrow from sport science (§3).
- **Safety.** Slow, controlled kicks only. Pivot on the ball of the support foot to protect the `knee`. **The wai khru ram muay is a spiritual rite of respect and is excluded** (§5.3).

### 1.13 Silat (Pencak Silat / Silek), Malay archipelago

- **Origin.** Silat is a family of martial arts across Indonesia, Malaysia, Brunei, Singapore, the southern Philippines and Thailand. UNESCO inscribed "Traditions of Pencak Silat" (Indonesia) in 2019 ([Jakarta Post](https://www.thejakartapost.com/news/2019/12/13/pencak-silat-given-unesco-intangible-world-heritage-distinction.html)); Malaysia's silat was inscribed separately.
- **Principles.** Low stances (kuda-kuda), stepping patterns (langkah, often triangular), and flowing, dance-like forms (bunga / kembang).
- **Trains.** S + (low stances), B +, C ++, M + (hips).
- **Evidence: D.**
- **Safety.** Deep lateral stances load the `knee` and `hip`. Content must be reviewed by a practitioner, because styles vary widely.

### 1.14 Arnis / Eskrima / Kali, Philippines

- **Origin.** These are Filipino stick and blade arts. Republic Act 9850 (2009) declared Arnis the national martial art and sport and required it to be taught in school PE ([Official Gazette](https://www.officialgazette.gov.ph/2009/12/11/republic-act-no-9850/)).
- **Principles.** Twirling and swinging strikes in figure-8 and X patterns, with the **sinawali** ("weaving") double-stick drills that coordinate both arms.
- **Trains.** C +++, forearm and grip endurance ++, shoulder M +, thoracic rotation +.
- **Evidence: D.**
- **Safety.** It is low-risk with light sticks. Use rolled newspaper or a wooden spoon as a household substitute, and clear the space.

### 1.15 Ling's Swedish gymnastics, Sweden

- **Origin.** Pehr Henrik Ling (1776–1839) founded the Royal Central Gymnastics Institute (GCI) in Stockholm in 1813, today's GIH, the oldest university college in the movement sciences. His system had pedagogical, medical, military and aesthetic branches ([GIH history](https://www.gih.se/english/about-gih/history)). It fed into European school PE, physiotherapy, Radio Taisō, via its influence on Western drill, and modern yoga ([Singleton 2010](https://en.wikipedia.org/wiki/Yoga_Body)).
- **Principles.** Free-standing, command-led exercises, done precisely and posturally, and sorted by body part. This is the ancestor of "calisthenics as PE".
- **Trains.** M ++, S + (bodyweight), posture.
- **Evidence: D** (historical). It is useful as a "roots" story: Kitaeru itself descends from it.

### 1.16 Pilates (Contrology), Germany / UK / USA

- **Origin.** Joseph Pilates (1883–1967), a German interned on the Isle of Man (Knockaloe) in 1915–1919, developed "Contrology" there and later taught it in New York ([Knockaloe](https://www.knockaloe.im/profile_428812.html); [Wikipedia](https://en.wikipedia.org/wiki/Joseph_Pilates)).
- **Principles.** Centering, control, precision, breath and flow. The mat repertoire (the Hundred, Roll-up, Saw, Spine Twist, Swimming) emphasises trunk control.
- **Trains.** Core S ++, M +, Br +.
- **Evidence: B for low back pain.** A Cochrane review of 10 RCTs found low to moderate quality evidence that Pilates beats minimal intervention for pain and disability, and no evidence that it beats other exercise ([Yamato et al. 2015](https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD010265.pub2/full)).
- **Safety.** The Roll-up, Saw and Hundred combine spinal flexion with rotation or load. Avoid them for suspected osteoporosis and `lower_back` flare-ups.

### 1.17 Systema (Система), Russia

- **Origin.** Systema is a modern Russian martial art, internationalised in the 1990s by Mikhail Ryabko and Vladimir Vasiliev.
- **Principles.** Breathing (leading movement with the breath, "burst breathing" to recover), relaxation, posture and continuous movement. Its signature drill is walking while breathing in for N steps and out for N steps.
- **Trains.** Br ++, E +.
- **Evidence: D** for Systema itself. Slow breathing in general (under 10 breaths/min) is associated with higher HRV and lower anxiety ([Zaccaro et al. 2018, systematic review](https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2018.00353/full)).
- **Safety.** We **exclude long breath-holds**, since they cause dizziness and are unsafe for people with hypertension or who are pregnant. We teach paced breathing only.

### 1.18 Greek antiquity: the gymnasion and the pentathlon

- **Origin.** The Greek gymnasium (γυμνάσιον, from γυμνός, "naked") trained citizens and athletes. **Halteres** (ἁλτῆρες), stone or lead hand-weights, date from about the 7th century BCE and were swung to extend the long jump and used as dumbbells ([Wikipedia](https://en.wikipedia.org/wiki/Halteres_(ancient_Greece))). Philostratus' *Gymnasticus* (3rd century CE) is the earliest surviving coaching manual.
- **Principles.** Harmony of body and mind, and training as civic virtue.
- **Trains.** It is a good origin story for hinge-and-swing power work.
- **Evidence: D.**

### 1.19 Turkish, Mongolian and Central Asian wrestling

- **Origin.** Kırkpınar oil wrestling (yağlı güreş), held in Edirne and by tradition dating to the mid-14th century, was inscribed by UNESCO in 2010 ([Wikipedia](https://en.wikipedia.org/wiki/Oil_wrestling)). Mongolian **bökh** is one of the "three manly games" of Naadam (UNESCO 2010) ([UNESCO](https://ich.unesco.org/en/RL/naadam-mongolian-traditional-festival-00395)).
- **Principles.** Grip, hip and leg strength. Opening rites: the **peşrev** in Turkey, and the **devekh** eagle dance in Mongolia, which has shamanic origins.
- **Recommendation.** Tell their stories on culture cards, but **do not package the rituals as exercises** (§5.3). Generic wrestler conditioning such as the bridge is not culturally specific. The neck bridge is excluded for `neck` risk anyway.

### 1.20 African dance-based conditioning

- **Origin.** Much of the continent's movement culture is dance, with polyrhythm and grounded, bent-knee posture: for example West African djembe dances, Zulu **indlamu** and the South African **gumboot dance** (isicathulo), which was born among mine workers. It is also the root of Afro-Brazilian and diaspora forms.
- **Evidence: C** (for dance in general). Dance improves balance and gait in older adults, but its effect on falls is very uncertain ([Age Ageing 2024](https://academic.oup.com/ageing/article/53/5/afae104/7679267); [network meta-analysis, PMC11697881](https://pmc.ncbi.nlm.nih.gov/articles/PMC11697881/)).
- **Recommendation.** "African dance" is not one tradition. Treat each dance as its own tradition, **only with a named community partner or teacher** who shapes the content and is credited and paid. Put this in a later wave (§7).

### 1.21 Haka and Māori movement; Hawaiian and Polynesian practices: why we exclude them

- **Haka.** Haka are taonga (treasures) of specific iwi and hapū. *Ka Mate* is legally attributed to Te Rauparaha and Ngāti Toa Rangatira under the **Haka Ka Mate Attribution Act 2014**, and its guidelines stress respect for ihi, wehi and wana ([MBIE guidelines](https://www.mbie.govt.nz/business-and-employment/business/intellectual-property/haka-ka-mate-attribution-act-guidelines)). Turning a haka into a workout would strip its meaning and is widely seen as offensive. **Decision: exclude.** A culture card may explain what haka is and why we don't teach it, if written or reviewed with Māori advisers.
- **Hula.** Hula is taught within lineages by a kumu hula, and some hālau keep kapu (sacred protocols) and an altar to Laka ([Wikipedia: Hālau hula](https://en.wikipedia.org/wiki/H%C4%81lau_hula)). "Hula fitness" products are a recognised form of trivialisation. **Decision: exclude.** The same applies to **lua** (Hawaiian martial art), which is restricted in transmission.
- **Open question.** Other Pacific traditions (for example Tongan or Samoan fitness practices) are only for community-led content, if Pacific partners propose it.

### 1.22 Rotational and transverse-plane traditions (cross-cutting)

Rotation is central to many of these traditions:
- the Tai Chi **waist** (yāo): cloud hands, brush knee, grasp sparrow's tail;
- Baduanjin "drawing the bow" and "wise owl looks back";
- Radio Taisō 体をねじる運動 (trunk twist) and 体を回す運動 (trunk circle);
- the Zurkhaneh mīl and Pehlwani gadā swinging;
- Arnis sinawali;
- the Muay Thai roundhouse;
- the capoeira ginga and esquivas;
- the Pilates Saw and Spine Twist;
- the yoga twists (parivṛtta poses).

§3 turns this into a family.

---

## 2. Candidate exercise list

### 2.1 Conventions

- **Muscles** use only the 19 contract ids. `P:` = primary, `S:` = secondary.
- **Equipment** uses contract ids, plus the proposed ids `club` (substitute: a 0.5–1 L water bottle held by the neck), `stick` (substitute: a broom handle, rolled towel or wooden spoon), `hand_weights` (substitute: two water bottles). Empty = none.
- **Impact** is L (low) or H (high). **Stress** uses the contract injury ids.
- **Type:** `single` = one repeatable movement (reps or hold); `flow` = a sequence (needs the §6 `sequence` schema).
- **Planes:** Sa = sagittal, Fr = frontal, Tr = transverse. **3D?** = whether it needs the new torso/pelvis yaw support (§2.2).
- **Proposed new families:** `flow_taichi`, `flow_qigong`, `flow_sequence` (Radio Taisō, Sūrya Namaskār, Makkō-hō), `stance`, `rotation`, `anti_rotation`, `breath`, `club_swing`. Existing families are reused where they fit (`push_horizontal`, `squat`, `mobility`, `warmup`, `conditioning`).
- **Native names** must be checked by a native speaker before release (§5.2).

### 2.2 What the animation team must plan for (read before the tables)

The current renderer (`js/anim/skeleton.js`) is 2D forward kinematics with a `side` or `front` view. It has sagittal and frontal limb angles plus foreshortening (`fsArm`, `fsThigh`...) but **no axial rotation of the trunk or pelvis**. The world library needs:

1. **Torso and pelvis yaw.** Add `yawPelvis` and `yawChest` in degrees. Render them by scaling the shoulder and hip width by cos(yaw), shifting the near/far limb roots, and reordering depth (which arm is drawn in front). About 70% of the Tai Chi and Baduanjin moves and every `rotation` item need it. A **three-quarter view** (`view: 'three_quarter'`, about 35°) would make both sagittal and transverse motion readable and should be the default for flows.
2. **Stepping with weight transfer.** Tai Chi and ginga steps move the base. The anchor must switch between feet mid-animation (`contact` per frame: `'N' | 'F' | 'both'`, matching the near/far limb suffixes), and the root must translate. The existing contact solver needs per-frame contact changes and a travel budget (flows drift; loop back to origin or pan the camera).
3. **Long sequences.** Radio Taisō No. 1 is about 3 min, the Tai Chi short flow 2–6 min and Baduanjin 10–12 min. Build sequences by **chaining existing per-move animations** with blend frames (§6.3), not as one giant keyframe list. Support `mirror: true` so left/right repeats reuse one animation.
4. **Head and gaze.** "Wise owl looks back", Tai Chi eye-follows-hand and Radio Taisō neck work need a `neckYaw` (head turn) as well as the existing `neck` flexion.
5. **Hand shapes.** Tai Chi uses an open palm, a fist and the hook hand (勾手 gōushǒu in single whip), with palm facing up or down. Add a `handShape` enum and a palm orientation (`supinated` / `pronated`) at a minimum.
6. **Props.** `club`, `stick` (two for sinawali), `hand_weights` and a band anchored to a door (Pallof, woodchop). The poses entry already has `props: [...]`; add circular prop paths for club swinging (a prop angle keyed per frame).
7. **Breath indicator.** A ring or bar that expands on the inhale and contracts on the exhale, synced to the sequence's `breath` timings (§6.2). It is essential for Qigong, yoga and Systema.
8. **Tempo.** Tai Chi is very slow (a form takes 8–20 s) and must feel continuous. Use ease-in-out, no pauses, and no "rep bounce". Radio Taisō is brisk and on the beat (about 2 counts per second).
9. **Balance sway.** Single-leg holds (golden rooster, tree) should show a subtle, stable sway, not a rigid freeze.

### 2.3 China: Tai Chi (Yang 24), Qigong, stances

| id | Name (native) | Cat. | Family | Muscles | Equip | Imp | Stress | Diff | Type | Planes / 3D? | Animation key poses |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `taichi_commencement` | Commencement 起势 qǐ shì | mobility | flow_taichi | P: quads · S: front_delts, calves | – | L | – | 1 | single | Sa · no | Feet shoulder-width → arms float to shoulder height, palms down (inhale) → sink knees while pressing palms down (exhale) |
| `taichi_part_horse_mane` | Part the wild horse's mane 野马分鬃 yě mǎ fēn zōng | mobility | flow_taichi | P: quads, glutes · S: obliques, adductors, side_delts | – | L | knee | 3 | single (alt. sides) | Sa+Tr · **yes** | Hold-ball → step out heel-first to bow stance → turn the waist, split the hands diagonally (upper palm up at eye height) |
| `taichi_white_crane` | White crane spreads its wings 白鹤亮翅 bái hè liàng chì | mobility | flow_taichi | P: quads · S: side_delts, calves | – | L | knee | 2 | single | Fr+Tr · yes | Weight on back leg, front toe touches (empty stance) → right hand rises beside the temple, left presses beside the hip |
| `taichi_brush_knee` | Brush knee and push 搂膝拗步 lōu xī ào bù | mobility | flow_taichi | P: quads, glutes · S: obliques, triceps, front_delts | – | L | knee | 3 | single (alt.) | Sa+Tr · **yes** | Turn the waist, hand circles back beside the ear → step to bow stance, lower hand brushes past the knee, other palm pushes forward |
| `taichi_repulse_monkey` | Repulse the monkey 倒卷肱 dào juǎn gōng | mobility | flow_taichi | P: quads, calves · S: obliques, front_delts | – | L | knee | 3 | single (alt.) | Sa+Tr · yes | Step **backwards**, toe first → one palm pushes forward as the other draws back to the hip; the waist turns towards the rear hand |
| `taichi_grasp_sparrow_tail` | Grasp the sparrow's tail 揽雀尾 lǎn què wěi | mobility | flow_taichi | P: quads, glutes · S: obliques, front_delts, triceps | – | L | knee | 4 | flow (ward-off, roll-back, press, push) | Sa+Tr · **yes** | Four sub-poses: ward off (arm arc) → roll back (weight shifts back, waist turns) → press (hands together) → push (both palms) |
| `taichi_single_whip` | Single whip 单鞭 dān biān | mobility | flow_taichi | P: quads, adductors · S: side_delts, obliques | – | L | knee | 3 | single | Fr+Tr · **yes** | Right hand forms a hook hand (勾手) to the side → turn left, step to bow stance → left palm rotates outward and pushes |
| `taichi_cloud_hands` | Cloud hands 云手 yún shǒu | mobility | flow_taichi | P: obliques, quads · S: adductors, side_delts | – | L | – | 2 | single (lateral steps) | Fr+Tr · **yes** | Hands circle alternately in front of the face and belly while the waist turns side to side; side-step, feet parallel, weight shifts |
| `taichi_golden_rooster` | Golden rooster stands on one leg 金鸡独立 jīn jī dú lì | skill | flow_taichi | P: glutes, quads · S: hip_flexors, calves, abs | – (`wall` for support) | L | knee, ankle | 4 | single (hold, alt.) | Sa · no | Knee lifts to hip height, same-side hand rises (palm facing sideways) as the other presses down; hold 3–10 s |
| `taichi_kick_heel` | Kick with heel 蹬脚 dēng jiǎo | skill | flow_taichi | P: glutes, quads · S: hip_flexors, hamstrings | – | L | knee, hip | 5 | single (alt.) | Sa+Fr · yes | Hands cross at the chest → knee lifts → heel presses out slowly as the arms open |
| `taichi_closing` | Closing 收势 shōu shì | mobility | flow_taichi | P: – · S: front_delts | – | L | – | 1 | single | Sa · no | Hands cross, then separate at shoulder width → lower slowly to the sides, exhale; feet together |
| `taichi_short_flow` | Tai Chi opening flow (from the 24 form) | mobility | flow_sequence | P: quads, glutes · S: obliques, adductors | – | L | knee | 3 | **flow** (commencement → horse's mane ×3 → white crane → brush knee ×3 → cloud hands ×3 → closing) | all · **yes** | Chains the ids above; about 2.5 min |
| `taichi_24_form` | Simplified 24-form 二十四式太极拳 | mobility | flow_sequence | P: quads, glutes · S: obliques, adductors, calves | – | L | knee | 5 | **flow** (24 forms) | all · **yes** | About 6 min. Later wave: needs the remaining forms (fair lady, needle at sea bottom, etc.) |
| `baduanjin_hold_up_sky` | Holding up the sky 两手托天理三焦 | mobility | flow_qigong | P: side_delts, upper_back · S: calves, abs | – | L | shoulder | 1 | single | Sa · no | Interlace fingers at the belly → lift, turning palms up overhead (inhale), heels optionally rise → lower (exhale) |
| `baduanjin_draw_bow` | Drawing the bow to shoot the eagle 左右开弓似射雕 | strength | flow_qigong | P: quads, upper_back · S: adductors, rear_delts, traps | – | L | knee | 3 | single (alt.) | Fr+Tr · **yes** | Horse stance → one arm draws the "bowstring" to the chest, the other extends sideways with the index finger up; the head turns to look past the finger |
| `baduanjin_separate_heaven_earth` | Separating heaven and earth 调理脾胃须单举 | mobility | flow_qigong | P: side_delts, lats · S: obliques, triceps | – | L | shoulder | 1 | single (alt.) | Fr · no | One palm presses up overhead, the other down beside the hip, both fingers pointing inward; swap |
| `baduanjin_look_back` | Wise owl looks back 五劳七伤往后瞧 | mobility | flow_qigong | P: traps, upper_back · S: obliques | – | L | neck | 1 | single (alt.) | Tr · **yes (head + chest yaw)** | Arms by the sides, palms turn outward → head and upper chest turn slowly to look behind → return |
| `baduanjin_sway_head_tail` | Sway the head and swing the tail 摇头摆尾去心火 | mobility | flow_qigong | P: quads, adductors · S: obliques, lower_back | – | L | neck, knee, lower_back | 4 | single (alt.) | Fr+Tr · **yes** | Horse stance, hands on thighs → lean the trunk to one side and circle the head and tailbone in opposite arcs |
| `baduanjin_touch_toes` | Two hands hold the feet 两手攀足固肾腰 | mobility | flow_qigong | P: hamstrings, lower_back · S: calves | – | L | lower_back | 2 | single | Sa · no | Hands slide down the back and legs → fold forward to the feet (knees soft) → rise leading with the arms |
| `baduanjin_clench_fists` | Punch with angry eyes 攒拳怒目增气力 | strength | flow_qigong | P: quads, adductors · S: triceps, forearms, front_delts | – | L | knee | 3 | single (alt.) | Sa · no | Horse stance, fists at the waist → slow punch forward, rotating the fist → open, grasp and return |
| `baduanjin_heel_bounce` | Bouncing on the toes 背后七颠百病消 | warmup | flow_qigong | P: calves · S: abs | – | L | ankle | 1 | single | Sa · no | Rise onto the balls of the feet, hold → drop gently onto the heels (a small jolt; skip it for `lowImpact` with osteoporosis) |
| `baduanjin_sequence` | Baduanjin, 8 movements 八段锦 | mobility | flow_sequence | P: quads, upper_back · S: side_delts, hamstrings, calves | – | L | knee, neck | 3 | **flow** | all · **yes** | The 8 ids above, 6 reps each (about 10–12 min), with a 4-rep "short" version (about 6 min) |
| `zhan_zhuang` | Standing post 站桩 zhàn zhuāng | breath | stance | P: quads · S: front_delts, calves | – | L | knee | 2 | single (hold) | Sa · no | Knees soft, arms rounded at chest height "hugging a tree"; still, slow breath; hold 30 s → 10 min |
| `horse_stance` | Horse stance 马步 mǎbù (kiba-dachi 騎馬立ち) | strength | stance | P: quads, adductors · S: glutes, calves, lower_back | – | L | knee | 3 | single (hold) | Fr · no (front view) | Feet about 2 shoulder-widths apart, toes forward, thighs lowering towards parallel, trunk upright, fists at the waist |
| `bow_stance` | Bow stance 弓步 gōngbù | strength | stance | P: quads, glutes · S: hip_flexors, calves | – | L | knee | 2 | single (hold, alt.) | Sa · no | Front knee over the ankle, back leg straight, back heel down, hips square |

### 2.4 Japan

| id | Name (native) | Cat. | Family | Muscles | Equip | Imp | Stress | Diff | Type | Planes / 3D? | Animation key poses |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `radio_taiso_1` | Radio Taisō No. 1 ラジオ体操第一 | warmup | flow_sequence | P: quads, obliques · S: side_delts, calves, upper_back | – | **H** (hops) | – | 2 | **flow** (13 moves, about 3 min) | all · **yes** | Chains the `rt_*` ids; `lowImpact` swaps the hops for heel raises; seated variant `radio_taiso_1_seated`, in which the hops become shoulder shakes (8 × 2, Kampo seated guide) (fact-check 2026-09-29) |
| `rt_stretch_up` | Stretch up 伸びの運動 | warmup | warmup | P: side_delts · S: calves, upper_back | – | L | – | 1 | single | Sa · no | Arms swing forward and up overhead (heels may rise) → lower out to the sides |
| `rt_arm_swing_knee_bend` | Arm swing and knee bend 腕を振って脚を曲げ伸ばす運動 | warmup | warmup | P: quads, calves · S: front_delts | – | L | knee | 1 | single | Sa+Fr · no (front) | Arms cross in front and swing out while the knees bend and bounce twice |
| `rt_arm_circles` | Arm circles 腕を回す運動 | warmup | warmup | P: front_delts, side_delts | – | L | shoulder | 1 | single | Fr · no | Big arm circles: first out and up the sides, crossing overhead and down in front (外まわし), then the reverse (up in front, down the sides), alternating one circle each way ×4 (NHK 4呼間×4回) (fact-check 2026-09-29) (reuse `arm_circles` rig) |
| `rt_chest_opener` | Chest opener 胸を反らす運動 | warmup | warmup | P: chest, upper_back · S: front_delts | – | L | lower_back | 1 | single | Sa+Fr · no | Feet apart → arms swing out and up with a slight upper-back extension, gaze up |
| `rt_side_bend` | Side bend 体を横に曲げる運動 | mobility | warmup | P: obliques · S: lats | – | L | – | 1 | single (alt.) | Fr · no (front view) | One arm overhead, bend sideways twice with a bounce → swap |
| `rt_forward_back_bend` | Forward and back bend 体を前後に曲げる運動 | mobility | warmup | P: hamstrings, lower_back · S: abs | – | L | lower_back | 2 | single | Sa · no | Three light bounces forward (hands towards the floor) → hands on the hips, gentle back bend |
| `rt_trunk_twist` | Trunk twist 体をねじる運動 | mobility | rotation | P: obliques · S: upper_back | – | L | lower_back | 1 | single (alt.) | **Tr · yes** | Feet planted, arms swing loosely around the body left and right, then two big twists with eyes following the hands |
| `rt_arms_up_down` | Arms up and down 腕を上下に伸ばす運動 | warmup | warmup | P: side_delts, traps · S: triceps | – | L | shoulder | 1 | single | Fr · no | Hands to shoulders → extend straight up → back to shoulders → extend down (NHK 腕を下にのばし; the Kampo seated form ends with the hands on the knees) (fact-check 2026-09-29) |
| `rt_diagonal_bend` | Diagonal bend and chest opener 体を斜め下に曲げ胸を反らす運動 | mobility | warmup | P: hamstrings, obliques · S: chest | – | L | lower_back | 2 | single (alt.) | Sa+Tr · yes | Bend down diagonally towards one foot with two bounces → rise, arms up, chest open |
| `rt_trunk_circle` | Trunk circle 体を回す運動 | mobility | warmup | P: obliques, lower_back · S: abs | – | L | lower_back | 2 | single (alt.) | Sa+Fr+Tr · yes | Arms overhead; the trunk traces a large circle from the hips |
| `rt_two_foot_hops` | Two-foot hops 両脚で跳ぶ運動 | conditioning | conditioning | P: calves · S: quads | – | **H** | ankle, knee | 2 | single | Sa+Fr · no | Small hops ×4 → hops with feet opening and closing (jack-style) |
| `rt_deep_breath` | Deep breath 深呼吸 | breath | breath | – | – | L | – | 1 | single | Sa · no | Arms rise from the front to overhead (inhale) → lower out to the sides (exhale) (NHK 腕を前から上にあげて… 横からおろす; Kampo) (fact-check 2026-09-29) |
| `makko_ho` | Makkō-hō 真向法 (4 stretches) | mobility | flow_sequence | P: adductors, hamstrings · S: hip_flexors, quads, lower_back | – | L | knee, lower_back, hip | 3 | **flow** (4) | Sa · no | 1: soles together, fold forward (exhale) · 2: legs long, fold · 3: straddle, fold · 4: kneeling, recline back (one-leg option) |
| `shiko` | Sumo leg lift and stamp 四股 shiko | strength | stance | P: glutes, adductors, quads · S: obliques, calves | – | L (controlled) | knee, hip | 5 | single (alt.) | Fr · no (front view) | Wide squat (shiko-dachi) → shift over one leg, lift the other leg high to the side → lower softly back into the squat. **Later wave, with cultural note** |
| `suburi` | Sword swing 素振り suburi | conditioning | conditioning | P: front_delts, lats · S: forearms, abs, triceps | stick | L | shoulder, wrist | 2 | single | Sa · no | Stick overhead → step forward as it cuts down to forehead height → step back and raise |

### 2.5 India

| id | Name (native) | Cat. | Family | Muscles | Equip | Imp | Stress | Diff | Type | Planes / 3D? | Animation key poses |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `dand` | Hindu push-up दंड daṇḍ | strength | push_horizontal (after `push_up`) | P: chest, triceps, front_delts · S: lower_back, abs, upper_back | – | L | wrist, shoulder, lower_back | 5 | single | Sa · no | Pike (hips high) → dive the chest close to the floor between the hands → sweep forward and up to a cobra with arms straight → push the hips back to the pike |
| `dand_knee` | Kneeling dand (regression) | strength | push_horizontal | P: chest, triceps · S: front_delts | – | L | wrist, shoulder, lower_back | 3 | single | Sa · no | As above from the knees |
| `baithak` | Hindu squat बैठक baiṭhak | conditioning | squat | P: quads · S: calves, glutes, front_delts | – | L | knee | 3 | single | Sa · no | Arms swing back as the heels rise and hips drop into a deep squat on the balls of the feet → arms swing forward and up while standing; rhythmic |
| `surya_namaskar` | Sun Salutation सूर्य नमस्कार sūrya namaskāra | mobility | flow_sequence | P: hamstrings, chest, triceps · S: hip_flexors, lower_back, abs | – | L | wrist, lower_back | 4 | **flow** (12 positions) | Sa · no | Prayer → arms up → fold → lunge → plank → knees-chest-forehead, hips up (Sivananda; Kerala Tourism) (fact-check 2026-09-29) → cobra → downward dog → lunge → fold → arms up → prayer; one breath per position |
| `vrikshasana` | Tree pose वृक्षासन vṛkṣāsana | skill | stance | P: glutes, calves · S: abs, adductors | – (`wall`) | L | ankle, knee | 2 | single (hold, alt.) | Fr · no | Sole on the inner calf or thigh (never on the knee), hands at the chest or overhead |
| `virabhadrasana_2` | Warrior II वीरभद्रासन २ vīrabhadrāsana | strength | stance | P: quads, adductors · S: glutes, side_delts | – | L | knee | 2 | single (hold, alt.) | Fr · no (front view) | Wide stance, front knee over the ankle, arms extended, gaze over the front hand |
| `trikonasana` | Triangle pose त्रिकोणासन trikoṇāsana | mobility | mobility | P: hamstrings, obliques · S: adductors, side_delts | – | L | lower_back | 3 | single (hold, alt.) | Fr · no | Straight legs, the trunk hinges sideways over the front leg, arms in one vertical line |
| `parivrtta_utkatasana` | Revolved chair परिवृत्त उत्कटासन | strength | stance | P: quads, obliques · S: upper_back, glutes | – | L | knee, lower_back | 4 | single (hold, alt.) | **Tr · yes** | Chair squat, palms together, elbow hooks outside the opposite knee, chest turns |
| `gada_swing` | Mace 360 गदा gadā | strength | club_swing | P: forearms, lats, obliques · S: front_delts, triceps, abs | club | L | shoulder, wrist, elbow | 5 | single (alt.) | Sa+Tr · yes | Club upright in front → drops behind the back over one shoulder → swings around and back to the front over the other shoulder |
| `club_arm_circle` | Indian club front circle (jōṛī) | mobility | club_swing | P: forearms, front_delts · S: side_delts, rear_delts | club | L | shoulder, wrist | 2 | single (alt.) | Sa+Fr · yes | Light club (bottle) traces a large vertical circle in front of the body; then an inward circle |
| `kalari_leg_swing` | Straight-leg kick കാലെടുപ്പ് kāleṭuppŭ | warmup | warmup | P: hamstrings, hip_flexors · S: glutes, abs | – | L | lower_back, hip | 3 | single (alt.) | Sa · no | Step, swing the straight leg up in front towards the opposite hand; controlled, height progresses |
| `kalari_elephant` | Elephant posture ഗജവടിവ് gajavaṭivŭ | strength | stance | P: quads, glutes · S: lower_back, front_delts | – | L | knee | 4 | single (hold) | Sa · no | Low forward stance, trunk inclined, arms forward like a trunk. **Needs gurukkal review** |

### 2.6 Iran, Brazil, Southeast Asia

| id | Name (native) | Cat. | Family | Muscles | Equip | Imp | Stress | Diff | Type | Planes / 3D? | Animation key poses |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `shena` | Zurkhaneh push-up شنا shenā | strength | push_horizontal | P: chest, triceps · S: front_delts, abs | – (a low board optional) | L | wrist, shoulder | 4 | single | Sa · no | Wide hands, fingers forward; rhythmic push-ups with a slight forward-and-back rock; variants with hips high |
| `meel_swing` | Club swing behind the shoulder میل mīl | strength | club_swing | P: lats, forearms · S: triceps, obliques, upper_back | club (×2 advanced) | L | shoulder, wrist, elbow | 4 | single (alt.) | Sa+Tr · yes | Club at the shoulder → drops behind the back → swings over the shoulder to the front, alternating arms, a step with each swing |
| `pa_zadan` | Zurkhaneh footwork پا زدن pā-zadan | conditioning | conditioning | P: calves · S: quads, hip_flexors | – | L | ankle | 2 | single | Sa · no | Rhythmic stepping in place to a drum count, then with the knees lifted |
| `ginga` | Ginga | conditioning | conditioning | P: quads, glutes · S: obliques, adductors, front_delts | – | L | knee | 3 | single (continuous) | Sa+Fr+Tr · **yes** | Triangular step: one leg steps back into a lunge, the opposite arm guards the face → back to parallel → other side |
| `esquiva_lateral` | Lateral dodge (esquiva lateral) | strength | squat | P: quads, adductors · S: glutes, obliques | – | L | knee | 3 | single (alt.) | Fr · no | From the ginga, drop into a deep side lunge with the trunk low and the arm guarding the head |
| `cocorinha` | Squat escape (cocorinha) | mobility | mobility | P: quads · S: calves, glutes | – | L | knee, ankle | 2 | single | Sa · no | Drop into a deep flat-footed squat, one hand guarding the head, the other on the floor |
| `au` | Cartwheel (aú) | skill | skill_balance | P: side_delts, triceps · S: obliques, adductors, traps | – | H | wrist, shoulder | 6 | single (alt.) | Fr · no (front) | Ginga → hands place one after the other → legs pass through a straddle over the top → land foot by foot; regression `au_low` (bunny hop to the side) |
| `muay_thai_knee` | Knee strike march เข่า khao | conditioning | conditioning | P: hip_flexors, abs · S: calves, obliques | – | L | – | 2 | single (alt.) | Sa · no | Hands pull an imagined head down as the knee drives up, rising onto the ball of the support foot |
| `muay_thai_roundhouse_slow` | Slow roundhouse kick เตะ te | skill | rotation | P: obliques, glutes · S: hip_flexors, adductors, calves | – | L | knee, hip | 5 | single (alt.) | **Tr · yes** | Step out → pivot on the ball of the support foot, turn the hips over, shin swings round at hip height, arm swings back for counter-rotation → return |
| `silat_kuda_kuda` | Silat low stance kuda-kuda | strength | stance | P: quads, adductors · S: glutes | – | L | knee | 3 | single (hold) | Fr · no | Low, wide stance, one knee bent more, hands guarding. **Needs practitioner review** |
| `sinawali` | Double-stick weave (sinawali) | conditioning | conditioning | P: forearms, front_delts · S: obliques, side_delts | stick ×2 | L | wrist, elbow | 3 | single (continuous) | Sa+Tr · yes | Alternating high and low diagonal strikes with both sticks in a figure-8 weave; the trunk rotates with the strikes |

### 2.7 Europe: Ling, Pilates, Systema, Greek antiquity

| id | Name (native) | Cat. | Family | Muscles | Equip | Imp | Stress | Diff | Type | Planes / 3D? | Animation key poses |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `ling_free_exercises` | Ling free-standing series (fristående gymnastik) | warmup | flow_sequence | P: side_delts, quads · S: obliques, calves | – | L | – | 2 | **flow** (arm raises, heel raises, trunk bends, lunges on command) | Sa+Fr · no | Precise, count-led positions; a "roots of calisthenics" flow |
| `pilates_hundred` | The Hundred | core | core_anterior | P: abs · S: hip_flexors, front_delts | – | L | neck, lower_back | 4 | single (hold with pumps) | Sa · no | Head and shoulders curled up, legs at tabletop or 45°, straight arms pumping; breathe in 5, out 5 |
| `pilates_roll_up` | Roll-up | core | core_anterior | P: abs · S: hip_flexors | – | L | lower_back, neck | 4 | single | Sa · no | Lie with arms overhead → articulate up vertebra by vertebra to a seated reach → roll down |
| `pilates_saw` | Saw | mobility | mobility | P: obliques, hamstrings · S: upper_back | – | L | lower_back | 3 | single (alt.) | **Tr · yes** | Sit in a straddle, arms wide → twist → little finger "saws" past the opposite little toe (exhale) → rise, untwist |
| `pilates_spine_twist` | Spine twist | mobility | mobility | P: obliques · S: upper_back, lower_back | – | L | lower_back | 2 | single (alt.) | **Tr · yes** | Sit tall, legs together, arms wide → rotate the ribcage in two pulses (exhale) → return |
| `pilates_swimming` | Swimming | core | core_posterior | P: lower_back, glutes · S: upper_back, rear_delts, hamstrings | – | L | lower_back, neck | 3 | single | Sa · no | Prone, arms and legs lifted; flutter opposite arm and leg quickly |
| `systema_breath_walk` | Breath-paced walk (Russian label removed: no source found (fact-check 2026-09-29); the Systema drill still needs an independent source) | breath | breath | P: – · S: calves | – | L | – | 1 | single (timed) | Sa · no | Walk in place; inhale for N steps, exhale for N steps (N = 2 → 6); no breath holds |
| `halteres_swing` | Halteres swing (ἁλτῆρες) | conditioning | hinge | P: glutes, hamstrings · S: front_delts, lower_back | hand_weights | L | lower_back | 3 | single | Sa · no | Hip hinge with the bottles swinging back between the legs → snap the hips forward, swinging them to chest height; optional small forward hop (H) in a later wave |

### 2.8 Generic rotation and anti-rotation (see §3)

| id | Name | Cat. | Family | Muscles | Equip | Imp | Stress | Diff | Type | Planes / 3D? | Animation key poses |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `open_book` | Open book (side-lying thoracic rotation) | mobility | rotation | P: upper_back · S: chest, obliques | – | L | shoulder | 1 | single (alt.) | **Tr · yes** | Side-lying, knees stacked at 90° → top arm sweeps over, chest turns to the ceiling, eyes follow the hand |
| `thread_the_needle` | Thread the needle | mobility | rotation | P: upper_back · S: rear_delts, obliques | – | L | shoulder | 1 | single (alt.) | **Tr · yes** | On all fours → one arm reaches under the body, shoulder to the floor → sweeps up to the ceiling |
| `seated_trunk_rotation` | Seated trunk rotation | mobility | rotation | P: obliques · S: upper_back | bench | L | lower_back | 1 | single (alt.) | **Tr · yes** | Sit tall on a chair, arms crossed → rotate the ribcage while the pelvis stays still |
| `standing_windmill` | Bodyweight windmill | mobility | rotation | P: obliques, hamstrings · S: side_delts, glutes | – | L | lower_back, shoulder | 3 | single (alt.) | Fr+Tr · yes | Feet angled, one arm vertical → hinge sideways at the hip, sliding the other hand down the leg, eyes on the top hand |
| `bodyweight_woodchop` | Woodchop (bodyweight) | conditioning | rotation | P: obliques · S: glutes, quads, front_delts | – | L | lower_back | 2 | single (alt.) | **Tr · yes** | Hands clasped high over one shoulder → chop diagonally down to the opposite knee, pivoting the back foot; the hips lead |
| `band_woodchop` | Band woodchop | strength | rotation | P: obliques, abs · S: glutes, front_delts | resistance_band | L | lower_back | 3 | single (alt.) | **Tr · yes** | Band anchored high → pull diagonally across the body, turning through the hips and pivoting the back foot |
| `rotational_lunge` | Reverse lunge with rotation | strength | rotation | P: quads, glutes · S: obliques | – | L | knee | 3 | single (alt.) | Sa+Tr · yes | Reverse lunge → rotate the trunk over the front leg, arms extended → return |
| `plank_shoulder_tap` | Plank shoulder tap | core | anti_rotation | P: abs, obliques · S: front_delts, triceps | – | L | wrist, shoulder | 3 | single | **Tr (resisted) · yes (small)** | High plank, feet wide → tap the opposite shoulder without the hips rocking |
| `bird_dog_row` | Bird dog reach-through | core | anti_rotation | P: abs, lower_back · S: glutes, rear_delts | – | L | wrist | 2 | single (alt.) | Sa · no | Bird dog → elbow to knee under the body → extend; the pelvis stays level (links to the existing `bird_dog`) |
| `half_kneeling_pallof_hold` | Half-kneeling Pallof hold | core | anti_rotation | P: obliques, abs · S: glutes | resistance_band | L | knee | 2 | single (hold, alt.) | **Tr (resisted)** · yes | Band anchored at the side at chest height, kneeling side-on → press the hands straight out and hold without turning |
| `pallof_press` | Pallof press | core | anti_rotation | P: obliques, abs · S: glutes, front_delts | resistance_band | L | – | 3 | single (alt.) | Tr (resisted) · yes | Standing side-on to the anchor → press out, pause 2 s, return |
| `pallof_press_overhead` | Pallof press with overhead reach | core | anti_rotation | P: obliques, abs · S: side_delts, lats | resistance_band | L | shoulder | 4 | single (alt.) | Tr · yes | Press out → raise the arms overhead → return, resisting the pull throughout |
| `side_plank_reach_through` | Side plank reach-through | core | anti_rotation | P: obliques · S: abs, upper_back, side_delts | – | L | shoulder, wrist | 5 | single (alt.) | Fr+Tr · yes | Side plank → top arm threads under the body with a controlled rotation → opens to the ceiling |

**Count:** 85 candidate movements (8 of them flows or multi-part forms). They fill four gaps in the current library:
- transverse-plane work, which is almost absent;
- balance, which `research.md` §4 already asks Content for;
- breath, which is absent;
- slow, low-impact flows for 55+ users and for rest days.

---

## 3. Rotational training

### 3.1 Why it matters

Human movement is three-dimensional. Walking, throwing, carrying, turning to look behind while driving and getting out of bed all involve trunk rotation or resisting it. The current library is almost entirely sagittal (push, pull, squat, hinge) with some frontal work (side plank, cossack squat).

### 3.2 What the evidence says (honestly)

| Claim | Evidence | Grade |
|---|---|---|
| Anti-movement (isometric Pallof-style) core training changes trunk muscle activation and efficiency. In 36 trained men over 6 weeks, twice a week, with 30 s holds: greater oblique activation gains and larger efficiency gains than dynamic core training. | [Cinarli & Kafkas 2025, Eur J Appl Physiol](https://link.springer.com/article/10.1007/s00421-025-05768-4) | B (small, one RCT, EMG outcomes) |
| Trunk rotator strength correlates strongly with rotational medicine-ball throw performance. | [PubMed 37721721](https://pubmed.ncbi.nlm.nih.gov/37721721/) | C (correlational) |
| Core training improves balance, core endurance and some sport-specific outcomes, such as throwing and striking, in athletes. The specific effect of *rotational* training is not isolated. | [Front Physiol 2022 systematic review](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2022.915259/full); [Sci Rep 2026 meta-analysis, racket sports](https://www.nature.com/articles/s41598-026-39391-w) | B |
| Thoracic mobility work improves pain, function and range of motion in chronic low back pain when added to physiotherapy (small RCTs). | [PubMed 39028057](https://pubmed.ncbi.nlm.nih.gov/39028057/); [PubMed 37483879](https://pubmed.ncbi.nlm.nih.gov/37483879/) | C |
| Tai Chi, which is dominated by waist rotation and weight shifts, reduces falls. | §1.1 | A (for the whole practice, not rotation specifically) |
| Loaded spinal flexion combined with rotation (sit-up twists, Russian twists with a weight) is commonly advised against for people with osteoporosis or vertebral fracture risk. | Osteoporosis exercise consensus (e.g. *Too Fit To Fracture*, Giangregorio et al.) **[practice consensus; verify the exact wording before quoting]** | C |

**Summary:** rotation and anti-rotation training are sensible and low-risk. The case for them rests on functional logic, athletic correlations and small trials, not on large outcome trials. The copy should say "trains your trunk to turn powerfully and resist twisting", not "prevents back pain".

### 3.3 Proposed families

The two families are split because they serve different planner slots: `rotation` goes in warm-ups, mobility and conditioning, while `anti_rotation` goes in the core slot, next to `core_anterior` and `core_lateral`.

**`anti_rotation`**: "Core: anti-rotation" (pattern `core`)

| level | id | equipment | notes |
|---|---|---|---|
| 1 | `bird_dog_row` | – | No-kit entry; links to `bird_dog` |
| 2 | `half_kneeling_pallof_hold` | band | 20–30 s holds (matches Cinarli dose) |
| 3 | `plank_shoulder_tap` | – | **No-band fallback** for levels 2–4 |
| 4 | `pallof_press` | band | 8–12/side, 2 s pause |
| 5 | `pallof_press_overhead` | band | |
| 6 | `side_plank_reach_through` | – | Bridges to `core_lateral` |

**`rotation`**: "Rotation" (pattern `mobility` for levels 1–3 and `core` for levels 4+)

| level | id | equipment | notes |
|---|---|---|---|
| 1 | `open_book` | – | Floor-supported, safest |
| 2 | `thread_the_needle` | – | |
| 3 | `seated_trunk_rotation` | bench | Pelvis fixed by the chair |
| 4 | `rt_trunk_twist` | – | Standing twist from Radio Taisō |
| 5 | `bodyweight_woodchop` | – | The hips lead, the back foot pivots |
| 6 | `rotational_lunge` | – | |
| 7 | `band_woodchop` | band | Loaded rotation |
| 8 | `standing_windmill` | – | |
| 9 | `muay_thai_roundhouse_slow` | – | Rotational skill with single-leg balance |

Tradition moves with rotation (the Tai Chi forms, `baduanjin_draw_bow`, `parivrtta_utkatasana`, `rt_trunk_circle`, `pilates_saw`, `pilates_spine_twist`, `sinawali`, `meel_swing`) stay in their tradition family but carry `planes: ['transverse', ...]`. This lets the planner pick any transverse-plane item for a "rotation" need.

**Injury rules:** `lower_back` → only levels 1–2 of `rotation` (pain-free range), plus `anti_rotation` levels 1–4. Suspected osteoporosis (not in the profile today; see §4.6) → no end-range flexion-plus-rotation (`pilates_saw`, `rt_trunk_circle` range limited).

---

## 4. Programming integration

### 4.1 New block uses

| Where | What | Dose | Evidence |
|---|---|---|---|
| **Warm-up** (any session) | `radio_taiso_1` (3 min) *or* 4–6 `rt_*` moves; plus 1 rotation level 1–3 move | 3–5 min | Osuka 2023/2024 used 3–5-min bouts 1–4×/day **(B)** |
| **Cool-down** | 3–4 Baduanjin moves, or `baduanjin_sequence` short version; finish with `rt_deep_breath` or `zhan_zhuang` (1–2 min) | 4–8 min | Zou 2017 **(B)**; slow breathing, Zaccaro 2018 **(B for acute HRV/anxiety)** |
| **Balance block** (age ≥55, or any user with a `balance` goal) | `taichi_short_flow`, or 3–5 Tai Chi forms, + `taichi_golden_rooster` / `vrikshasana` holds | 10–20 min per session | See §4.3 |
| **Rest / light day** ("active recovery") | A full flow: Tai Chi (short flow ×2–3) or Baduanjin (full) or Makkō-hō + Sūrya Namaskār (gentle) | 15–30 min | These count as light days for streaks (`research.md` §2) |
| **Main strength block** | `dand`, `baithak`, `shena`, `horse_stance`, `meel_swing` as family members or variety swaps | Normal sets/reps from `research.md` §1 | **(C)** |
| **Core slot** | 1 `anti_rotation` + the existing anterior and lateral work, rotating across the week | 2–3 sets | Cinarli 2025 **(B)** |

### 4.2 Goal mappings

| Goal (contract) | Traditions to pull from |
|---|---|
| `flexibility` | Yoga (Sūrya Namaskār, trikoṇāsana), Makkō-hō, Baduanjin, `rotation` 1–4, `club_arm_circle` |
| `health` | Radio Taisō warm-up, Tai Chi/Baduanjin cool-down, `breath` |
| `strength` / `muscle` | Pehlwani (`dand`, `baithak`), Zurkhaneh (`shena`, `meel_swing`), `stance` holds, `anti_rotation` |
| `endurance` | High-rep `baithak`/`dand` sets, `ginga`, `pa_zadan`, `muay_thai_knee`, `sinawali` intervals |
| `skill` | `au`, `taichi_kick_heel`, `muay_thai_roundhouse_slow`, `taichi_24_form` (learning the whole form *is* the skill) |
| **proposed `balance`** | Tai Chi (primary), yoga standing poses, `shiko`, Radio Taisō |

**Proposal:** add `balance` as a goal id. It has the strongest single evidence base in this document, and the 55+ audience will look for it. Until then, the planner infers it from `age ≥ 55` (which is already a rule in `research.md` §4).

### 4.3 Dosage from the research

- **Falls prevention (age ≥65):** aim for about 3 hours/week of balance-challenging exercise, ongoing ([Sherrington 2017](https://pubmed.ncbi.nlm.nih.gov/27707740/)). Tai Chi trials that worked used 2–3 sessions/week of 45–60 min for ≥12 weeks, and the best effects were seen at a cumulative 50–72 h ([Tai Chi dose meta-analysis](https://www.sciencedirect.com/science/article/pii/S1873959816300746)). TJQMBB used 2 × 60 min/week for 24 weeks ([Li 2018](https://pubmed.ncbi.nlm.nih.gov/30208396/)). **Kitaeru default:** balance block 15–20 min on each training day plus a 20–30 min flow on 1–2 light days, which gives about 1.5–3 h/week. **Be honest in the copy:** "Classes of 2–3 hours per week reduced falls in trials. Kitaeru sessions build towards that; a local class is great too."
- **Baduanjin:** typical trial protocols are 30–60 min, 3–5×/week, for 12–24 weeks **[summary of trials in Zou 2017]**. App default: the short version (about 6 min) on most days, and the full version on light days.
- **Radio Taisō:** 3–5 min, 1–4×/day (Osuka). It is a natural "morning streak" item.
- **Flexibility (yoga, Makkō-hō):** use the existing `research.md` flexibility rules (holds of 10–30 s, about 60 s per muscle, ≥2–3 days/week; Garber 2011). In a flowing sequence (vinyāsa), count 1 breath ≈ 4–6 s; hold 3–5 breaths in the static poses.
- **Breath:** paced breathing at about 6 breaths/min (inhale 4–5 s, exhale 5–6 s) for 3–10 min (Zaccaro 2018). No holds.
- **Anti-rotation:** 2×/week, 2–3 sets of 20–30 s holds or 8–12 presses per side (Cinarli 2025).
- **Pehlwani volume:** the traditional thousands are **not** a prescription. Use the push and squat rules in `research.md` §1. For endurance goals, sets of 20–50 `baithak` are reasonable once 3×20 bodyweight squats are easy **[practice]**.

### 4.4 Progression for flows

Flows don't progress by reps. Their `level` means **how much of the form you know**, and the levers are:
1. **Length:** more forms (Tai Chi 3 → 6 → 12 → 24).
2. **Stance height:** high → medium → low (a `stanceDepth` modifier on the session item).
3. **Tempo:** slower is harder (Tai Chi forms from 8 s → 15 s).
4. **Support:** chair nearby → free-standing → eyes-softened gaze (never eyes closed for 65+).

`applySessionLog` rule: if a flow is rated `easy` twice, unlock the next forms or the next stance depth. If it is rated `hard`, keep it. Streak and weekly credit are as for any session.

### 4.5 Features

- **World tour.** A 6–8 week programme where each week features one tradition. Its moves appear in warm-up, cool-down or as variety swaps, with the culture card shown once at the start of the week.
- **Tradition of the week.** A lighter version of the World tour for existing plans: one card in Library, plus one swap offered per session. It can be turned off in settings.
- **Morning Taisō.** An optional 3-minute Radio Taisō each morning that counts for the day streak as a "light" item (its weight in the streak needs a UI decision: the proposal is that it keeps the streak alive but doesn't count towards the weekly session target).
- **Quick workout focus.** Add `flow`, `balance` and `rotation` to the `generateQuickSession` `focus` enum.
- **Library filter.** "By tradition" and "by plane of motion".

### 4.6 Planner rules summary

1. Age ≥55 → add a balance block (5–10 min) to ≥2 sessions/week. Prefer Tai Chi forms, and default to a high stance with a chair nearby.
2. Age ≥65 or `lowImpact` → Radio Taisō swaps the hops for heel raises. For age ≥75 or `experience = new` with age ≥65, use the seated variant for the first 2 weeks **[practice]**.
3. `neck` injury → exclude `baduanjin_look_back` and `baduanjin_sway_head_tail`, and cap the neck range in Radio Taisō.
4. `knee` injury → exclude `baithak`, `horse_stance` below a high stance, and `makko_ho` step 4; use a high stance for all Tai Chi.
5. `lower_back` injury → exclude `dand`, `pilates_roll_up`, `pilates_saw`, `rt_trunk_circle` and `baduanjin_touch_toes`; allow `rotation` levels 1–2 and `anti_rotation` levels 1–4.
6. `wrist` injury → exclude `dand`, `shena`, `au`, `plank_shoulder_tap` and `surya_namaskar` (offer a chair version instead).
7. Suggest a profile flag `boneHealth: 'unknown' | 'osteopenia' | 'osteoporosis'` (optional). If it is set, avoid end-range loaded flexion plus rotation and the heel drop in `baduanjin_heel_bounce`.
8. Never put `charkh`, breath-holds, headstands or shoulderstands in any plan.

---

## 5. Presentation and cultural respect

### 5.1 Principles

1. **Name the source.** Every tradition move says where it comes from in the UI, not just in metadata. "Hindu push-up" becomes **"Daṇḍ (Hindu push-up), from Indian Pehlwani wrestling"**.
2. **Use the original name first, with a translation.** Show the native script and romanisation with diacritics (雲手 yún shǒu, दंड daṇḍ). The English gloss is secondary. Avoid colonial-era names used alone (e.g. "Indian club" should be "jōṛī / mīl (Indian club)").
3. **No "ancient secrets" framing.** No mystical fonts, gongs, faux-Asian typefaces, stock "zen" imagery, or "exotic" adjectives. Use the same sumi-ink design language as the rest of Kitaeru.
4. **Separate tradition from medicine.** Say "In Qigong this is traditionally said to open the chest and regulate the *sānjiāo*". Only make physiological claims that meet the evidence grade.
5. **Don't flatten.** "Chinese martial arts", "African dance" and "yoga" are not single things. Name the specific form or lineage where it matters ("the Simplified 24-form, based on Yang-style Tai Chi").
6. **Credit named people and institutions where history names them:** the 1956 committee (24-form), the Chinese Health Qigong Association (Baduanjin 2003), NHK and Japan Post Insurance (Radio Taisō), Wataru Nagai (Makkō-hō), the Raja of Aundh (Sūrya Namaskār), Joseph Pilates, Pehr Henrik Ling, and Mestres Bimba and Pastinha (capoeira).
7. **Consult, credit and pay.** Before a tradition ships, one qualified practitioner from that tradition reviews the moves, names, cues and card. Credit them on the card ("Reviewed by ...") with their consent. Budget for this even though the app is free. (fact-check 2026-09-29: the v1.3 "Flow and breath" batch rests on sources only; no practitioner review exists for it.)
8. **Present these as fundamentals, not the art.** Say "These are foundation movements from X. The full practice is learned with a teacher", and link to a directory or governing body where one exists.
9. **Stay out of politics:** name the countries in their current form, avoid disputed-origin arguments (e.g. whether silat is Indonesian or Malaysian: say "Malay archipelago"), and present debated histories (engolo → capoeira) as debated.

### 5.2 When to credit a lineage specifically

- **Always** when the sequence is a codified, authored form: the 24-form, Baduanjin (the 2003 standard version), Radio Taisō No. 1, Makkō-hō, Sūrya Namaskār (the Aundh 10- or 12-count), and the Pilates mat repertoire.
- **At the level of the tradition** for generic drills shared across schools: the horse stance, daṇḍ and baiṭhak, the ginga.
- **Per school** where content comes from a reviewer's lineage (e.g. a specific Kalari style, CVN or Vadakkan; a silat perguruan). Name that lineage on the card.

### 5.3 What we do **not** package as exercise

| Practice | Why | What we do instead |
|---|---|---|
| Haka (incl. *Ka Mate*) | Taonga of iwi; legally protected attribution (Ka Mate); performance carries whakapapa and protocol | No exercise. An optional card co-written with Māori advisers, or nothing |
| Hula, lua | Lineage-based, with kapu and sacred dimensions | Exclude |
| Wai khru ram muay (Muay Thai) | A spiritual rite honouring teachers | Mention it respectfully on the Muay Thai card; no animation |
| Devekh eagle dance (Mongolia), peşrev (Turkey) | Ceremonial openings | Mention on the card; no animation |
| The full Zurkhaneh ritual (morshed, verses, bell, gowd, charkh) | Religious, mystical, communal; UNESCO-listed as a ritual | Exercises only (shenā, mīl, pā-zadan), attributed; no recitation audio |
| Capoeira roda and music | Communal, living tradition | Solo fundamentals only (ginga, esquivas, aú); link to academies |
| Sumō ritual elements (salt, clapping, the dohyō) | Shintō ritual | `shiko` as a leg exercise only, with a note on its ritual meaning; later wave, after review |
| Chanting (mantras, Om) with yoga | Religious | No audio chanting. Sūrya Namaskār includes an optional note that some practise it as devotion to Sūrya, and offers the neutral name "Sun Salutation" |
| Any headstand or neck-loaded posture | Safety, not culture | Exclude |

### 5.4 Culture cards

**Format:** a title (native script + romanisation + English), region, era, 2–3 sentences, "What it trains", the evidence line (graded), "Reviewed by" and a "Learn more" link. The suggested copy is below. Each card must be reviewed per §5.1.7 before release.

| Tradition | Suggested card copy |
|---|---|
| **Tai Chi 太极拳** · China | Tai Chi grew from Chinese martial arts into a slow, flowing practice done in parks around the world. The Simplified 24-form was created in 1956 from Yang-style Tai Chi so anyone could learn it in weeks. It is one of the best-studied exercises for balance: in trials, older adults who practised it fell less often. |
| **Baduanjin 八段锦** · China | The "Eight Pieces of Brocade" is a Qigong routine with written records going back about 900 years. Each of its eight standing movements pairs a slow stretch with an unhurried breath, and each name describes what it is traditionally said to do. Studies link it to better flexibility, balance and sleep. |
| **Horse stance 马步** · China | Generations of martial artists began by simply holding the horse stance. It builds strong, patient legs and a steady centre, and it teaches you to breathe calmly under effort. |
| **Radio Taisō ラジオ体操** · Japan | Since 1928, Japan has started the day with the same few minutes of radio exercises, in schoolyards, offices and parks. Its thirteen movements take every joint through its range, and in a recent trial frail older adults who did it daily moved more quickly and confidently. Kitaeru teaches the movements with its own count; the famous music belongs to Japan Post Insurance and NHK. |
| **Makkō-hō 真向法** · Japan | In the 1930s Wataru Nagai recovered from a stroke using four simple stretches drawn from a Buddhist bowing practice. Makkō-hō is still practised in Japan today to keep hips and backs supple. |
| **Budō stances 武道** · Japan | Karate, kendō and sumō all train rooted stances and thousands of patient repetitions: *keiko*, practice as a way of forging character. Kitaeru borrows a few of their foundation drills. |
| **Yoga āsana योग** · India | Yoga is an ancient South Asian philosophy and spiritual path, of which physical postures are one part. Today's flowing sequences took shape in the 20th century; the Sun Salutation was popularised by the Raja of Aundh in 1928, who said it was an age-old practice (fact-check 2026-09-29). In trials, yoga modestly improved balance and mobility in older adults. |
| **Pehlwani पहलवानी** · India and Pakistan | In earthen wrestling pits called akhāṛās, Pehlwani wrestlers built legendary endurance with thousands of daṇḍs and baiṭhaks. The Great Gama, undefeated across a long career, was famous for this daily discipline. Kitaeru adds these as tougher variations on push-ups and squats. |
| **Kalaripayattu കളരിപ്പയറ്റ്** · Kerala, India | One of the oldest surviving martial arts, Kalaripayattu begins with *meypayattu*, body training that builds flexibility, balance and control through low postures and sweeping kicks. Its postures are named after animals: the elephant, lion, horse, boar, snake, cat, rooster and fish. |
| **Varzesh-e Pahlavani ورزش پهلوانی** · Iran | In the *zurkhāneh*, the "house of strength", athletes train together to a drum, swinging wooden clubs and doing rhythmic push-ups, while a master recites epic poetry. UNESCO recognises it as living heritage, and its ideals are strength in the service of humility and chivalry. Kitaeru teaches a few of its exercises; the ritual itself belongs in the zurkhāneh. |
| **Capoeira** · Brazil | Capoeira was created by enslaved Africans and their descendants in Brazil, disguising a fight as a game and a dance. Everything flows from the *ginga*, a constant rocking step. UNESCO recognised the capoeira circle (*roda*) in 2014; to play in one, find an academy. |
| **Muay Thai มวยไทย** · Thailand | Known as "the art of eight limbs", Muay Thai is Thailand's national sport. Its roundhouse kick turns the whole body like a swinging door, a great teacher of rotational power and balance. Before fights, boxers perform the *wai khru ram muay* to honour their teachers; we leave that to the ring. |
| **Silat** · Malay archipelago | Silat is a family of martial arts from across Indonesia, Malaysia and neighbouring lands, recognised by UNESCO. Its low stances and graceful stepping patterns build strong, adaptable legs. |
| **Arnis / Eskrima / Kali** · Philippines | The Philippines' national martial art trains the hands to weave sticks in fast, rhythmic patterns. Sinawali drills challenge coordination, grip and trunk rotation, and a broom handle works fine at home. |
| **Ling gymnastics** · Sweden | In 1813 Pehr Henrik Ling founded an institute in Stockholm to teach precise, free-standing exercise for health. His "Swedish drill" spread to schools worldwide and helped shape physiotherapy, and even the calisthenics you do in Kitaeru. |
| **Pilates** · Germany / UK | Joseph Pilates developed "Contrology" while interned on the Isle of Man during the First World War, then taught it in New York. Its mat exercises train deep trunk control with precise breathing. |
| **Systema Система** · Russia | Systema is a modern Russian martial art that puts relaxed breathing at the centre of movement. Kitaeru borrows one of its simplest drills: walking with your breath paced to your steps. |
| **Ancient Greece** | Greek athletes trained in the *gymnasion* and swung stone *halteres* to jump further in the pentathlon. Philostratus' *Gymnasticus*, written in the 3rd century, is one of the oldest surviving coaching manuals. |
| **Wrestling rites** · Mongolia and Türkiye | Mongolian *bökh* wrestlers open with the eagle dance, and Turkish oil wrestlers with the *peşrev*: ceremonies of respect as well as warm-ups. We share their stories but don't teach these rites as exercises. |
| **Haka** · Aotearoa New Zealand | *(Card only if co-written with Māori advisers.)* Haka are treasured expressions of Māori identity, belonging to specific iwi. We don't teach them as workouts, out of respect. |

---

## 6. Schema proposal

### 6.1 Exercise additions (all optional; existing exercises keep working)

```js
{
  id: 'taichi_cloud_hands',
  name: 'Cloud hands',
  // ...all existing fields (family, level, category, mode, muscles, equipment, space, impact, stress, difficulty, cues, description)
  category: 'mobility',             // proposed new categories: 'balance', 'breath', 'flow'
  tradition: 'tai_chi',             // key into TRADITIONS (6.4); omitted for generic calisthenics
  origin: { region: 'East Asia', countries: ['CN'] },  // ISO 3166 codes; region is a display string
  nativeName: { text: '云手', romanised: 'yún shǒu', lang: 'zh-Hans', alt: [{ text: '雲手', lang: 'zh-Hant' }] },
  aka: ['Wave hands like clouds'],  // search aliases
  planes: ['frontal', 'transverse'],// 'sagittal' | 'frontal' | 'transverse'
  breath: { pattern: 'natural' },   // or { in: 'arms rise', out: 'arms press' }
  tempo: { secPerRep: 8 },          // guides the timer and the animation speed
  evidence: 'A',                    // tradition-level grade inherited if omitted
  attribution: 'Simplified 24-form (1956), Yang style',
  review: { by: 'Name, school', date: '2027-01-15' },   // required before release for tradition moves
  cultural: 'open',                 // 'open' | 'attributed' (must show the credit) | 'restricted' (never auto-planned)
  stanceLevels: ['high', 'medium', 'low'], // optional modifiers for stance-based moves
}
```

### 6.2 Sequences (flows)

A flow is an exercise with `mode: 'flow'` and a `sequence`. Each step references a single-move exercise, so its animation, muscles and injury rules are inherited, or it references an inline `anim` for transitions.

```js
{
  id: 'baduanjin_sequence',
  name: 'Baduanjin',
  mode: 'flow',                      // new mode alongside 'reps' | 'hold'
  family: 'flow_sequence',
  tradition: 'baduanjin',
  sequence: [
    { move: 'baduanjin_ready', sec: 10, cue: 'Stand, knees soft', breath: 'natural' },
    { move: 'baduanjin_hold_up_sky', reps: 6, cue: 'Lift through the palms', breath: [{ phase: 'in', at: 0 }, { phase: 'out', at: .5 }] },
    { move: 'baduanjin_draw_bow', reps: 3, side: 'both', cue: 'Look past your index finger' },
    // ...
    { move: 'rt_deep_breath', reps: 3, breath: 'in-out' }
  ],
  variants: { short: { repsScale: .5 }, seated: { replace: { baduanjin_draw_bow: 'baduanjin_draw_bow_seated' } } },
  estSec: 660,
}
```

Rules:
- A flow's `muscles` and `stress` are the **union** of its steps. This is computed at load, so the injury filter works automatically. The planner may also drop or swap individual steps: a knee injury swaps the horse stance steps to high-stance variants.
- `breath` on a step is either a keyword (`'natural' | 'in' | 'out' | 'in-out'`) or phase markers at a normalised time `at` (0–1) within one rep, which drive the breath indicator (§2.2.7).
- `side: 'both'` means alternate sides with a mirrored animation.
- `SessionLog.items[].sets` for a flow is `[{ sec, done, completedSteps }]`.

### 6.3 Animation additions (proposal for the Animation owner)

```js
// poses.js
taichi_cloud_hands: { view: 'three_quarter', anchor: 'feet', contact: 'both', duration: 8000, loop: true,
  frames: [ F(0, { yawPelvis: -20, yawChest: -35, neckYaw: -10, handShapeN: 'palm', palmN: 'in', ... , contact: 'both' }), ... ] }
// new pose keys: yawPelvis, yawChest, neckYaw, handShapeN/F ('palm'|'fist'|'hook'|'point'), palmN/F ('up'|'down'|'in'|'out'),
// per-frame contact: 'N' | 'F' | 'both' (weight-bearing foot), rootX (travel), propAngle
// sequences: SEQ[id] = [{ anim, reps, mirror, blendMs }] built from EXERCISES.sequence at load
```

### 6.4 `js/data/traditions.js`

```js
export const TRADITIONS = {
  tai_chi: {
    name: 'Tai Chi',
    nativeName: { text: '太极拳', romanised: 'tàijíquán', lang: 'zh-Hans' },
    region: 'East Asia', countries: ['CN'],
    era: '17th century–; 24-form 1956',
    card: 'Tai Chi grew from Chinese martial arts into a slow, flowing practice ...', // 2–3 sentences, §5.4
    principles: ['Slow and continuous', 'Shift weight fully', 'Turn from the waist', 'Stay upright and relaxed'],
    trains: { strength: 1, mobility: 2, balance: 3, breath: 1, coordination: 2 },    // 0–3 for card icons
    evidence: [
      { grade: 'A', claim: 'Fewer falls in older adults', cite: 'Sherrington 2019 Cochrane', url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD012424.pub2/full' },
      { grade: 'B', claim: 'Knee osteoarthritis pain similar to physio', cite: 'Wang 2016', url: 'https://pubmed.ncbi.nlm.nih.gov/27183035/' },
    ],
    safety: ['Keep knees in line with toes', 'Use a high stance until comfortable'],
    attribution: 'Simplified 24-form created in 1956 from Yang-style Tai Chi',
    sensitivity: 'open',            // 'open' | 'attributed' | 'card_only' | 'excluded'
    reviewedBy: null,               // must be set before the tradition is visible in production
    learnMore: [{ label: 'NCCIH: Tai Chi', url: 'https://www.nccih.nih.gov/health/tai-chi-what-you-need-to-know' }],
    families: ['flow_taichi'],
    since: '1.2',
  },
  haka: { name: 'Haka', sensitivity: 'excluded', card: null, note: 'See docs/world-movement.md §5.3' },
  // ...
};
export const TRADITION_IDS = Object.keys(TRADITIONS);
```

**Contract changes to request in `CONTRACTS.md`:** the new equipment ids `club`, `stick` and `hand_weights` (each with a household-substitute string); the new category values `balance`, `breath` and `flow`; the mode `flow`; the session block kind `flow` (or reuse `mobility` and `cooldown`); the goal id `balance`; the Quick workout focus values `flow`, `balance` and `rotation`; and the new families listed in §2.1.

---

## 7. Roadmap

### v1.2 "First steps abroad" (20 items, 4 traditions plus rotation)

Selection criteria: (1) evidence grade, (2) brand fit, (3) animation cost, (4) review available.

| # | id | Why |
|---|---|---|
| 1 | `radio_taiso_1` (flow) | Brand-defining, B evidence, a daily-habit hook |
| 2–4 | `rt_stretch_up`, `rt_trunk_twist`, `rt_side_bend` | Standalone warm-up pieces; reuse from the flow |
| 5 | `taichi_commencement` | Easy first pose; sagittal (cheap) |
| 6 | `taichi_cloud_hands` | Iconic; **the pilot for yaw rendering** |
| 7 | `taichi_brush_knee` | A stepping form; **the pilot for weight transfer** |
| 8 | `taichi_part_horse_mane` | Core 24-form movement |
| 9 | `taichi_golden_rooster` | A single-leg balance hold (fills the gap in `research.md` §4) |
| 10 | `taichi_short_flow` | A flow; A evidence tradition |
| 11 | `baduanjin_hold_up_sky` | The simplest, sagittal |
| 12 | `baduanjin_draw_bow` | Horse stance + rotation; iconic |
| 13 | `baduanjin_look_back` | Tests neckYaw |
| 14 | `baduanjin_sequence` (short version first) | Cool-down and rest-day flow |
| 15 | `horse_stance` | Strength hold; front view (cheap) |
| 16 | `dand` | Strength; new push variation |
| 17 | `baithak` | Endurance squat |
| 18 | `open_book` | `rotation` level 1 |
| 19 | `thread_the_needle` | `rotation` level 2 |
| 20 | `pallof_press` (+ `plank_shoulder_tap` as no-band fallback) | `anti_rotation` core |

Also in v1.2:
- `traditions.js` with 5 cards (Radio Taisō, Tai Chi, Baduanjin, Pehlwani, and a "Rotation" explainer that is not a tradition);
- the `sequence` schema;
- the breath indicator;
- the balance block for 55+;
- the Morning Taisō toggle;
- one paid reviewer each for the Tai Chi/Baduanjin and Radio Taisō content (a Japanese PE teacher or a Radio Taisō instructor; the national Radio Taisō federation, 全国ラジオ体操連盟, trains instructors).

### v1.3 "Flow and breath" (about 15)

- The rest of the Radio Taisō singles and the seated variant.
- The remaining Baduanjin singles (full version).
- `zhan_zhuang`, `bow_stance`.
- `surya_namaskar`, `vrikshasana`, `virabhadrasana_2`, `trikonasana`.
- `makko_ho`, `rt_deep_breath`, `systema_breath_walk`.
- The rest of the `rotation` and `anti_rotation` families.
- The "Tradition of the week" feature.

### v1.4 "Strength traditions" (about 12)

- Zurkhaneh: `shena`, `pa_zadan`, `meel_swing`; Pehlwani: `club_arm_circle`, `gada_swing`. This needs the `club` equipment and prop rendering.
- `dand_knee`, `halteres_swing`, `pilates_*`, `ling_free_exercises`.
- An Iranian practitioner review, plus a card for the zurkhāneh.

### v1.5 "Play and power" (about 12)

- Capoeira: `ginga`, `esquiva_lateral`, `cocorinha`, `au`.
- Muay Thai: `muay_thai_knee`, `muay_thai_roundhouse_slow`.
- `sinawali`, `suburi`.
- The remaining Tai Chi forms toward the `taichi_24_form`.
- The "World tour" programme.

### v2.x "Community-led"

- Kalaripayattu and Silat, only with named practitioner partners.
- `shiko`, with a note from a sumō or Japanese cultural adviser.
- African dance traditions, one at a time and with community partners (e.g. gumboot dance, with South African artists).
- Any Pacific content only if proposed by Pacific partners.
- A localisation pass so that native names render correctly offline (font subsetting for CJK, Devanagari, Malayalam, Persian and Thai; system fonts are the fallback).

### Risks and open questions

1. **Efficacy transfer.** Every strong Tai Chi and Baduanjin result comes from supervised classes. App-delivered effectiveness is unknown. Consider an in-app opt-in outcome check (a timed single-leg stand every 4 weeks).
2. **Radio Taisō rights.** Confirm with Kampo whether a free app may use the name and the movement order, and whether any trademark covers ラジオ体操. Never ship the music.
3. **Reviewer budget.** Cultural review is a hard gate, not a nice-to-have. A tradition without a reviewer does not ship.
4. **Animation scope.** Yaw, stepping and sequences are a renderer upgrade (§2.2). If that slips, v1.2 can still ship Radio Taisō singles, Baduanjin items 1 and 11–13 in simplified form, the horse stance, the dand, the baithak and the open book, which are mostly sagittal or frontal. Cloud hands and the Tai Chi flow would then wait.
