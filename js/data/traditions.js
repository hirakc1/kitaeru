// Kitaeru movement traditions (v1.2). Schema: docs/CONTRACTS.md "Traditions"; research: docs/world-movement.md §5-6.
//
// ACCURACY GATE: every exercise with a `tradition` is hidden from users (library, plans, Quick, swaps) until that
// tradition's `verified` is set. `verified` is set only by a separate fact-check pass once the minimum bar in
// CONTRACTS.md is met (2+ independent sources per move, one official/primary where one exists; native names
// checked against 2+ sources; no claims beyond the evidence grade). Never self-verify here.
// Dev override: add `?preview=traditions` to the URL.
//
// Copy rules (world-movement.md §5.1): native name first; a tradition's own explanations are framed as the
// tradition's; no "ancient secrets" framing; health claims no stronger than the evidence grade. Cards show a
// "Sources" line, never "Reviewed by".

/**
 * The only place the Radio Taisō name appears in user-facing data. The music is copyrighted and never ships;
 * the name's trademark status is unconfirmed. To remove the name everywhere, blank this one string.
 */
export const RADIO_TAISO_ATTRIBUTION = 'the Radio Taisō No. 1 movements (NHK / Japan Post Insurance). Kitaeru is not affiliated with them.';

const S = (label, url, kind) => ({ label, url, kind });

export const TRADITIONS = {
  radio_taiso: {
    name: 'Morning Taisō',
    nativeName: null, // "Morning Taisō" is Kitaeru's own name, not a Japanese title
    region: 'East Asia', countries: ['JP'],
    era: '1928–; current No. 1 sequence 1951',
    card: 'Since 1928, Japan has started the day with a few minutes of exercises, in schoolyards, offices and parks; '
      + 'the current sequence dates from 1951. Thirteen brisk movements take every joint through its range. In a recent trial, '
      + 'frail older adults who did them daily, alongside a nutrition programme, improved in agility, balance and endurance. '
      + 'Kitaeru teaches the movements with its own count; no music is used.',
    principles: ['Brisk and on the count', 'Every joint, every direction', 'Big, relaxed movements', 'Finish with a slow breath'],
    trains: { strength: 0, mobility: 2, balance: 1, breath: 1, coordination: 1 },
    evidence: [
      { grade: 'B', claim: 'May improve agility, balance and endurance in frail older adults (one 12-week trial)', cite: 'Osuka et al. 2024, J Epidemiol',
        url: 'https://www.jstage.jst.go.jp/article/jea/34/10/34_JE20230317/_article/-char/en' },
    ],
    safety: ['Swap the hops for heel raises if you avoid impact', 'Keep bends and twists in a comfortable range'],
    attribution: RADIO_TAISO_ATTRIBUTION,
    sensitivity: 'attributed',
    sources: [
      S('Japan Post Insurance: illustrated guide to the No. 1 movements', 'https://www.jp-life.japanpost.jp/radio/instruction/radio_first.html', 'official'),
      S('NHK: radio exercise No. 1 and 2 illustrated sheet', 'https://www.nhk.or.jp/program/radio-taisou/pdf/radio.pdf', 'official'),
      S('Japan Post Insurance: music and usage rules', 'https://www.jp-life.japanpost.jp/radio/abt_csr_rdo_cr.html', 'official'),
      S('Nippon.com (Japan Glances): Japan’s Radio Calisthenics', 'https://www.nippon.com/en/features/jg00068/', 'reference'),
      S('Wikipedia: Radio calisthenics', 'https://en.wikipedia.org/wiki/Radio_calisthenics', 'reference'),
      S('Osuka et al. 2024, J Epidemiol (RCT)', 'https://www.jstage.jst.go.jp/article/jea/34/10/34_JE20230317/_article/-char/en', 'research'),
    ],
    verified: { date: '2026-09-28', notes: 'Order and reps checked against Kampo guide and NHK sheet; cues corrected per NHK; card hedged to grade B (Osuka 2024, with nutrition co-intervention); no native name; heel raise disclosed as Kitaeru adaptation; music never used.' },
    learnMore: [],
    families: ['flow_sequence', 'warmup', 'rotation'],
    since: '1.2',
    // A brisk loosening-up routine: no muscle is worked hard (founder, 2026-09-30), so the player and the Library draw the
    // figure without muscle highlight and hide the muscle chips and body map for its items (see showsMuscles).
    showMuscles: false,
    // The human-body figure (anim v3) draws its items as the solid figure in sportswear: no see-through body, no skeleton,
    // no muscles (founder, 2026-09-30). Every other tradition and generic exercise: the see-through body (see bodyLook).
    bodyLook: 'solid',
  },
  tai_chi: {
    name: 'Tai Chi',
    nativeName: { text: '太极拳', romanised: 'tàijíquán', lang: 'zh-Hans', alt: [{ text: '太極拳', lang: 'zh-Hant' }] },
    region: 'East Asia', countries: ['CN'],
    era: '17th century–; Simplified 24-form 1956',
    card: 'Tai Chi grew from Chinese martial arts into a slow, flowing practice done in parks around the world. '
      + 'The Simplified 24-form was created in 1956 from Yang-style Tai Chi so that anyone could learn it. '
      + 'It is one of the best-studied exercises for balance: in trials, older adults who practised it fell less often.',
    principles: ['Slow and continuous', 'Shift your weight fully', 'Turn from the waist', 'Stay upright and relaxed'],
    trains: { strength: 1, mobility: 2, balance: 3, breath: 1, coordination: 2 },
    evidence: [
      { grade: 'A', claim: 'Fewer falls in older adults', cite: 'Sherrington et al. 2019, Cochrane',
        url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD012424.pub2/full' },
      { grade: 'B', claim: 'May ease knee osteoarthritis symptoms about as much as physical therapy (one trial)', cite: 'Wang et al. 2016, Ann Intern Med',
        url: 'https://pubmed.ncbi.nlm.nih.gov/27183035/' },
    ],
    safety: ['Keep your knees in line with your toes', 'Use a high stance until it feels easy', 'Keep a chair nearby for one-leg forms'],
    attribution: 'Simplified 24-form (1956), from Yang-style Tai Chi',
    sensitivity: 'attributed',
    sources: [
      S('Wikipedia: 24-form tai chi', 'https://en.wikipedia.org/wiki/24-form_tai_chi', 'reference'),
      S('Wikipedia (zh): 二十四式太极拳', 'https://zh.wikipedia.org/wiki/二十四式太极拳', 'reference'),
      S('NCCIH: Tai Chi, what you need to know', 'https://www.nccih.nih.gov/health/tai-chi-what-you-need-to-know', 'reference'),
      S('Sherrington et al. 2019, Cochrane: exercise for preventing falls', 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD012424.pub2/full', 'research'),
    ],
    verified: { date: '2026-09-28', notes: 'Names, pinyin and form numbers checked against en/zh Wikipedia and Guizhou University of Commerce 24-form guide; poses match; short flow labelled as an excerpt; knee-OA claim hedged.' },
    learnMore: [{ label: 'NCCIH: Tai Chi', url: 'https://www.nccih.nih.gov/health/tai-chi-what-you-need-to-know' }],
    families: ['flow_taichi', 'flow_sequence'],
    since: '1.2',
  },
  baduanjin: {
    name: 'Baduanjin',
    nativeName: { text: '八段锦', romanised: 'bāduànjǐn', lang: 'zh-Hans', alt: [{ text: '八段錦', lang: 'zh-Hant' }] },
    region: 'East Asia', countries: ['CN'],
    era: 'Song dynasty records (12th century); standard version 2003',
    card: 'Baduanjin, the "Eight Pieces of Brocade", is a Qigong routine with written records going back about 900 years. '
      + 'Each of its eight standing movements pairs a slow stretch with an unhurried breath, and each name describes what it is '
      + 'traditionally said to do. Studies link it to better flexibility, balance and sleep.',
    principles: ['Slow, even breathing', 'Hold the stretch at the end of each movement', 'Knees soft, spine long', 'Move without strain'],
    trains: { strength: 1, mobility: 2, balance: 1, breath: 2, coordination: 1 },
    evidence: [
      { grade: 'B', claim: 'May improve flexibility, balance, sleep quality and blood pressure', cite: 'Zou et al. 2017, eCAM (meta-analysis)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28367223/' },
    ],
    // v1.3a: the optional heel line from flow-and-breath.md §7.5 (a Kitaeru adaptation, disclosed on the heel bounce; fact-check §3: PASS)
    safety: ['Keep head turns small and pain-free', 'Bend your knees in forward folds', 'Lower your heels slowly at the end if you avoid impact or have fragile bones'],
    attribution: 'Health Qigong Baduanjin, standardised by the Chinese Health Qigong Association (2003)',
    sensitivity: 'attributed',
    sources: [
      S('General Administration of Sport, Health Qigong Management Center: Baduanjin', 'https://www.sport.gov.cn/qgzx/n5407/c840284/content.html', 'official'),
      S('Heshan Municipal Health Bureau: Baduanjin guide', 'https://www.heshan.gov.cn/jmhswjj/gkmlpt/content/3/3043/post_3043430.html', 'official'),
      S('Wikipedia: Baduanjin qigong', 'https://en.wikipedia.org/wiki/Baduanjin_qigong', 'reference'),
      S('Zou et al. 2017, eCAM (meta-analysis)', 'https://pubmed.ncbi.nlm.nih.gov/28367223/', 'research'),
    ],
    verified: { date: '2026-09-28', notes: 'Order, couplet names, characters, tones (攒 cuán) and reps checked against sport.gov.cn and Heshan health bureau; softened knees and short version disclosed as Kitaeru’s.' },
    learnMore: [],
    families: ['flow_qigong', 'flow_sequence'],
    since: '1.2',
  },
  pehlwani: {
    name: 'Pehlwani',
    nativeName: { text: 'पहलवानी', romanised: 'pahalvānī', lang: 'hi', alt: [{ text: 'پہلوانی', romanised: 'pahalwānī', lang: 'ur' }] },
    region: 'South Asia', countries: ['IN', 'PK'],
    era: 'Mughal era–',
    card: 'In earthen wrestling pits called akhāṛās, Pehlwani wrestlers build endurance with long sets of daṇḍs and baiṭhaks. '
      + 'The Great Gama, famed as undefeated across a long career, was famous for this daily discipline. '
      + 'Kitaeru adds these as tougher variations on push-ups and squats.',
    principles: ['Rhythm over speed', 'Breathe with every rep', 'Build volume patiently'],
    trains: { strength: 2, mobility: 1, balance: 0, breath: 1, coordination: 1 },
    evidence: [
      { grade: 'C', claim: 'The daṇḍ is a push-up variant; push-up progressions build upper-body strength', cite: 'Kotarsky et al. 2018 (push-up progressions)',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29466268/' },
    ],
    safety: ['Keep the cobra arc in a pain-free range', 'Skip the baiṭhak if your knees complain'],
    attribution: 'Conditioning drills of Pehlwani wrestling (India and Pakistan)',
    sensitivity: 'attributed',
    sources: [
      S('Alter, The Wrestler’s Body (UC Press, 1992)', 'https://publishing.cdlib.org/ucpressebooks/view?docId=ft6n39p104&brand=ucpress', 'reference'),
      S('Wikipedia: Pehlwani', 'https://en.wikipedia.org/wiki/Pehlwani', 'reference'),
      S('Wikipedia: The Great Gama', 'https://en.wikipedia.org/wiki/The_Great_Gama', 'reference'),
      S('National Wrestling Hall of Fame: Ghulam Muhammad (the Great Gama)', 'https://nwhof.org/hall_of_fame/bio_by_name/ghulam-muhammad', 'reference'),
    ],
    verified: { date: '2026-09-28', notes: 'daṇḍ and baiṭhak checked against Wikipedia, Alter 1992 and Yog Sandesh; Urdu corrected; no rep counts; Gama “undefeated” per Wikipedia and NWHOF; evidence limited to the push-up (Kotarsky 2018).' },
    learnMore: [],
    families: ['push_horizontal', 'conditioning'],
    since: '1.2',
  },
  // v1.3b: widened from "Horse stance" to the basic wushu stances (步型), so the bow stance belongs here too
  // (docs/flow-and-breath.md §7.5; fact-check 2026-09-29 §3: PASS WITH CORRECTIONS, Zhengzhou standard added to sources)
  horse_stance: {
    name: 'Martial-arts stances',
    nativeName: { text: '步型', romanised: 'bùxíng', lang: 'zh-Hans' },
    region: 'East Asia', countries: ['CN'],
    card: 'Chinese martial artists begin with a handful of basic stances: the wide, square horse stance and the long, lunging bow stance among them. '
      + 'Holding them builds strong, patient legs and a steady centre, and teaches you to breathe calmly under effort.',
    principles: ['Hold still with good alignment', 'Stay relaxed and breathe slowly', 'Lower the stance over months'],
    trains: { strength: 2, mobility: 0, balance: 1, breath: 1, coordination: 0 },
    evidence: [
      { grade: 'C', claim: 'Indirect: isometric training, with the wall squat ranked highest, lowered resting blood pressure; the horse stance itself has not been trialled',
        cite: 'Edwards et al. 2023, BJSM (network meta-analysis)', url: 'https://pubmed.ncbi.nlm.nih.gov/37491419/' },
    ],
    safety: ['Deep holds load the knees: start high, knees only slightly bent', 'Go lower before you hold for longer',
      'Never hold your breath, especially if you have high blood pressure'],
    attribution: 'Foundation stances of Chinese martial arts (bùxíng)',
    sensitivity: 'attributed',
    sources: [
      S('Wikipedia: Horse stance', 'https://en.wikipedia.org/wiki/Horse_stance', 'reference'),
      S('Guangzhou College of Technology and Business: university wushu course plan, basic stances (武术步型: 弓步, 马步)', 'https://www.gzgs.edu.cn/__local/7/D6/39/AB29C045F11DC31F11D99E4EC9C_E7669F1F_27A40B.pdf', 'reference'),
      S('Zhengzhou municipal standard DB4101/T 73—2023, 少林武术基本动作要求 §5.3 步型', 'https://www.shaolinkungfu.edu.cn/ueditor/php/upload/file/20231229/1703820828137111.pdf', 'official'),
      S('Edwards et al. 2023, BJSM: exercise training and resting blood pressure', 'https://pubmed.ncbi.nlm.nih.gov/37491419/', 'research'),
    ],
    verified: { date: '2026-09-29', notes: 'Widened card re-checked: 步型 bùxíng per Guangzhou wushu course and Zhengzhou standard DB4101/T 73—2023; horse and bow stance forms confirmed in both; evidence unchanged (Edwards 2023, grade C indirect); knee and breath-holding cautions present.' },
    learnMore: [],
    families: ['stance'],
    since: '1.2',
  },
  // ---- v1.3b "Flow and breath" cards (docs/flow-and-breath.md §7; fact-check docs/flow-and-breath-factcheck.md §3)
  // Yoga card independently checked 2026-09-30, including the योग two-source check (factcheck §3 and §9).
  yoga: {
    name: 'Yoga',
    nativeName: { text: 'योग', romanised: 'yoga', lang: 'sa' },
    region: 'South Asia', countries: ['IN'],
    era: 'Āsana practice mostly 20th century; Sun Salutation popularised 1920s–30s',
    card: 'Yoga is a South Asian philosophy and spiritual path, of which physical postures, āsana, are one part. '
      + 'Most of today’s standing poses and flowing sequences took shape in the 20th century, and the Sun Salutation was popularised by the Rajah of Aundh, who wrote that it was an age-old practice. '
      + 'In trials, yoga modestly improved balance and mobility in adults over 60. Kitaeru teaches the postures only: no chanting or breath-holding.',
    principles: ['Link each movement to a breath', 'Steady and comfortable', 'Never force a pose', 'Keep breathing: no breath holds'],
    trains: { strength: 1, mobility: 3, balance: 2, breath: 2, coordination: 1 },
    evidence: [
      { grade: 'B', claim: 'May modestly improve balance and mobility in adults over 60', cite: 'Youkhana et al. 2016, Age Ageing (meta-analysis)', url: 'https://pubmed.ncbi.nlm.nih.gov/26707903/' },
    ],
    safety: ['Bend your knees in forward folds', 'Keep backbends small', 'Use a wall or chair for one-leg poses', 'Plank and dog load the wrists'],
    attribution: 'Yoga āsana; Sun Salutation in the Sivananda tradition',
    sensitivity: 'attributed',
    sources: [
      S('Ministry of AYUSH: Common Yoga Protocol (2019)', 'https://www.mea.gov.in/images/pdf/common-yoga-protocol-english.pdf', 'official'),
      S('Sivananda Yoga Vedanta Centres: The Sun Salutation', 'https://sivanandayoga.org/teachings/the-sun-salutation/', 'official'),
      S('Department of Tourism, Government of Kerala: Surya Namaskar', 'https://www.keralatourism.org/yoga/popular-asanas/surya-namaskar', 'official'),
      S('The Art of Living (Hindi): सूर्य नमस्कार', 'https://www.artofliving.org/in-hi/yoga/yoga-poses/sun-salutation', 'reference'),
      S('Wikipedia: Sun Salutation', 'https://en.wikipedia.org/wiki/Sun_Salutation', 'reference'),
      S('Youkhana et al. 2016, Age Ageing (meta-analysis)', 'https://pubmed.ncbi.nlm.nih.gov/26707903/', 'research'),
    ],
    verified: { date: '2026-09-30', notes: 'Independent check (not the author). योग yoga per Wikipedia (Sanskrit योग), Wiktionary (Sanskrit योग, yóga) and Art of Living (Hindi); “philosophy and spiritual path, āsana one part” per Common Yoga Protocol 2019 (“essentially a spiritual discipline”; āsana one of its practices) and Wikipedia; 20th-century origin of most standing poses per Wikipedia (Standing asanas: very few before the 20th century); Rajah of Aundh popularised the Sun Salutation (Wikipedia), “age-old method” per his book as quoted by the Wellcome Collection; era 1920s–30s fits 1928 and 1938 editions; Youkhana 2016 re-read (6 trials, 307 people, g 0.40 balance; 3 trials, g 0.50 mobility), hedged; no chanting, mantras or breath holds; no Iyengar source.' },
    learnMore: [{ label: 'Ministry of AYUSH: Common Yoga Protocol (free)', url: 'https://www.mea.gov.in/images/pdf/common-yoga-protocol-english.pdf' }],
    families: ['flow_sequence', 'balance_hold', 'stance', 'mobility'],
    since: '1.3',
  },
  makko_ho: {
    name: 'Makkō-hō',
    nativeName: { text: '真向法', romanised: 'makkōhō', lang: 'ja' },
    region: 'East Asia', countries: ['JP'],
    era: '1933–',
    // Kitaeru's own wording: the association asks that its text and illustrations are not reused. No life dates, no aikidō claim.
    card: 'After a stroke at 42, Nagai Wataru practised the deep bow he had read about in a Buddhist sutra until his stiff hips moved freely again, and in 1933 he began teaching it. '
      + 'From it came Makkō-hō, four simple seated stretches done in about three minutes with a slow out-breath on every fold. '
      + 'It is still taught across Japan by the Makkō-hō Association.',
    principles: ['Breathe out as you fold', 'No bouncing, no forcing', 'Keep your back long', 'Come all the way back up'],
    trains: { strength: 0, mobility: 3, balance: 0, breath: 1, coordination: 0 },
    evidence: [],   // grade D: not studied in trials, so no outcome line
    safety: ['Skip the fourth stretch if your knees or ankles complain', 'Lean back only as far as is comfortable', 'Not straight after a meal'],
    attribution: 'Makkō-hō, created by Nagai Wataru (1933); taught by the Makkō-hō Association',
    sensitivity: 'attributed',
    sources: [
      S('Makkō-hō Association (公益社団法人真向法協会): the four exercises', 'https://makkoho.or.jp/shiru__about3', 'official'),
      S('Makkō-hō Association: origin (真向法の由来)', 'https://makkoho.or.jp/shiru__history', 'official'),
      S('Sasakawa Sports Foundation, sports dictionary: 真向法', 'https://www.ssf.or.jp/knowledge/dictionary/makkoho.html', 'reference'),
      S('Kotobank: 真向法 (Kyodo News; Britannica)', 'https://kotobank.jp/word/%E7%9C%9F%E5%90%91%E6%B3%95-163241', 'reference'),
    ],
    verified: { date: '2026-09-29', notes: 'Card checked against Makkō-hō Association, SSF and Kotobank: stroke at 42, sutra bows, 1933 start of teaching, four stretches, ~3 min, out-breath on the fold; card timing corrected; no life dates, no health claims.' },
    learnMore: [{ label: 'Makkō-hō Association (classes across Japan)', url: 'https://makkoho.or.jp/' }],
    families: ['flow_sequence'],
    since: '1.3',
  },
  zhan_zhuang: {
    name: 'Standing post',
    nativeName: { text: '站桩', romanised: 'zhàn zhuāng', lang: 'zh-Hans', alt: [{ text: '站樁', lang: 'zh-Hant' }] },
    region: 'East Asia', countries: ['CN'],
    era: 'Popularised in the 20th century',
    card: 'In Chinese internal martial arts and Qigong, students often begin by simply standing still, arms rounded as if hugging a tree. '
      + 'Zhan zhuang, “standing like a post”, was popularised in the 20th century by Wang Xiangzhai, the founder of Yiquan, and is also practised as a standing meditation. '
      + 'It trains patient legs, relaxed shoulders and slow, easy breathing.',
    principles: ['Stand still and relaxed, not slack', 'Knees soft, shoulders down', 'Breathe slowly; never hold your breath', 'Lower the stance over months'],
    trains: { strength: 1, mobility: 0, balance: 1, breath: 2, coordination: 0 },
    evidence: [
      { grade: 'C', claim: 'Indirect: still, isometric holds lowered resting blood pressure in trials; standing post itself has not been properly trialled',
        cite: 'Edwards et al. 2023, BJSM', url: 'https://pubmed.ncbi.nlm.nih.gov/37491419/' },
    ],
    safety: ['Start high, knees only slightly bent', 'Lower your arms if your shoulders tire', 'Sit down if you feel dizzy'],
    attribution: 'Standing practice of Chinese internal arts and Qigong (zhàn zhuāng)',
    sensitivity: 'attributed',
    sources: [
      S('China Medical Qigong Society (中国医学气功学会): 站桩功', 'https://www.cmqg.cn/Home/Details/1573bded-fac8-4b55-b53c-a2f479de4e28', 'official'),
      S('Lyu et al. 2021, Medicine: three-circle standing qigong (protocol, Table 1)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8213330/', 'research'),
      S('Wikipedia: Zhan zhuang', 'https://en.wikipedia.org/wiki/Zhan_zhuang', 'reference'),
      S('Edwards et al. 2023, BJSM: exercise training and resting blood pressure', 'https://pubmed.ncbi.nlm.nih.gov/37491419/', 'research'),
    ],
    verified: { date: '2026-09-29', notes: 'Card checked: 站桩 zhàn zhuāng per CMQG and Wikipedia; Wang Xiangzhai/Yiquan per Wikipedia and Baike; standing meditation framed as the tradition’s; evidence grade C indirect (Edwards 2023), standing post itself untrialled (Lyu 2021 is a protocol).' },
    learnMore: [],
    families: ['stance'],
    since: '1.3',
  },
  // Not a tradition: an explainer card for the generic rotation / anti-rotation families. It never gates anything.
  rotation: {
    kind: 'explainer', gate: false,
    name: 'Rotation',
    nativeName: null,
    region: null, countries: [],
    card: 'Walking, throwing, carrying and turning to look behind you all involve twisting your trunk, or resisting a twist. '
      + 'Most strength plans skip this. Kitaeru adds two families: rotation, which trains your trunk to turn smoothly and powerfully, '
      + 'and anti-rotation, which trains it to hold steady against a twist.',
    principles: ['Turn from the ribs and hips, not the lower back', 'Move in a pain-free range', 'Breathe out as you turn'],
    trains: { strength: 1, mobility: 2, balance: 1, breath: 0, coordination: 1 },
    evidence: [
      { grade: 'B', claim: 'Anti-rotation holds changed trunk muscle activation in a small 6-week trial', cite: 'Cinarli & Kafkas 2025, Eur J Appl Physiol',
        url: 'https://link.springer.com/article/10.1007/s00421-025-05768-4' },
      { grade: 'C', claim: 'Thoracic mobility work added to physio helped people with chronic low back pain (small trials)', cite: 'PubMed 39028057',
        url: 'https://pubmed.ncbi.nlm.nih.gov/39028057/' },
    ],
    safety: ['People with a back problem stay with the first levels'],
    attribution: null,
    sensitivity: 'open',
    sources: [
      S('Cinarli & Kafkas 2025, Eur J Appl Physiol', 'https://link.springer.com/article/10.1007/s00421-025-05768-4', 'research'),
      S('Frontiers in Physiology 2022: core training systematic review', 'https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2022.915259/full', 'research'),
    ],
    verified: null, // informational only: explainers are never gated
    learnMore: [],
    families: ['rotation', 'anti_rotation'],
    since: '1.2',
  },
};
export const TRADITION_IDS = Object.keys(TRADITIONS);

/**
 * Does the UI show muscles (figure highlight, muscle chips, body map) for this exercise? False only when its tradition
 * card sets `showMuscles: false` (the Morning Taisō). Generic exercises and every other tradition: true.
 */
export const showsMuscles = ex => !(ex && ex.tradition && TRADITIONS[ex.tradition]?.showMuscles === false);

/**
 * The human-body figure's look for this exercise: 'solid' (the solid figure in sportswear) when its tradition card sets
 * `bodyLook: 'solid'` (the Morning Taisō), else 'xray' (the see-through body with muscle highlight; skeleton optional).
 */
export const bodyLook = ex => (ex && ex.tradition && TRADITIONS[ex.tradition]?.bodyLook === 'solid' ? 'solid' : 'xray');

/**
 * Practices Kitaeru never packages as exercise (world-movement.md §5.3), not even with ?preview=traditions:
 * sacred or lineage-held practices, rituals, and safety exclusions (charkh spinning, headstands, shoulderstands).
 */
export const EXCLUDED_TRADITIONS = ['haka', 'hula', 'lua', 'wai_khru', 'devekh', 'pesrev', 'zurkhaneh_ritual', 'capoeira_roda', 'sumo_ritual',
  'charkh', 'headstand', 'shoulderstand'];

// ---------- accuracy gate ----------
function previewFromUrl() {
  try {
    const q = new URLSearchParams(globalThis.location?.search || '');
    return q.getAll('preview').some(v => v.split(',').includes('traditions'));
  } catch { return false; }
}
let preview = previewFromUrl();

/** True when `?preview=traditions` is in the URL (or tests switched it on). */
export const traditionPreview = () => preview;
/** Tests only: switch the dev override on or off. */
export function setTraditionPreview(on) { preview = !!on; }

/**
 * Is content of this tradition visible to users? No tradition = generic content, always visible.
 * Unknown ids fail closed (hidden unless previewing). 'excluded' traditions are never shown.
 */
export function traditionVisible(id) {
  if (!id) return true;
  if (EXCLUDED_TRADITIONS.includes(id)) return false;
  const t = TRADITIONS[id];
  if (t && t.gate === false) return true;
  if (t && t.sensitivity === 'excluded') return false;
  if (preview) return true;
  return !!(t && t.verified);
}

/**
 * Is this exercise's cultural content visible? Generic exercises (no `tradition`) always are. A tradition item needs
 * its tradition AND its own `verified` set (the accuracy bar is per move), unless previewing.
 */
export function contentVisible(ex) {
  if (!ex) return false;
  if (!ex.tradition) return true;
  if (!traditionVisible(ex.tradition)) return false;
  return preview || !!ex.verified;
}
