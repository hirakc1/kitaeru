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
    safety: ['Keep head turns small and pain-free', 'Bend your knees in forward folds'],
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
  horse_stance: {
    name: 'Horse stance',
    nativeName: { text: '马步', romanised: 'mǎbù', lang: 'zh-Hans', alt: [{ text: '馬步', lang: 'zh-Hant' }] },
    region: 'East Asia', countries: ['CN'],
    card: 'Generations of martial artists began by simply holding the horse stance. '
      + 'It builds strong, patient legs and a steady centre, and it teaches you to breathe calmly under effort.',
    principles: ['Hold still with good alignment', 'Stay relaxed and breathe slowly', 'Lower the stance over months'],
    trains: { strength: 2, mobility: 0, balance: 1, breath: 1, coordination: 0 },
    evidence: [
      { grade: 'C', claim: 'Indirect: isometric training, with the wall squat ranked highest, lowered resting blood pressure; the horse stance itself has not been trialled',
        cite: 'Edwards et al. 2023, BJSM (network meta-analysis)', url: 'https://pubmed.ncbi.nlm.nih.gov/37491419/' },
    ],
    safety: ['Deep holds load the knees: start high, knees only slightly bent', 'Go lower before you hold for longer',
      'Never hold your breath, especially if you have high blood pressure'],
    attribution: 'Foundation stance of Chinese martial arts (mǎbù)',
    sensitivity: 'attributed',
    sources: [
      S('Wikipedia: Horse stance', 'https://en.wikipedia.org/wiki/Horse_stance', 'reference'),
      S('Guangzhou College of Technology and Business: university wushu course plan, basic stances (马步)', 'https://www.gzgs.edu.cn/__local/7/D6/39/AB29C045F11DC31F11D99E4EC9C_E7669F1F_27A40B.pdf', 'reference'),
      S('Edwards et al. 2023, BJSM: exercise training and resting blood pressure', 'https://pubmed.ncbi.nlm.nih.gov/37491419/', 'research'),
    ],
    verified: { date: '2026-09-28', notes: '马步 mǎbù checked against Wikipedia and Guangzhou College of Technology and Business wushu course; grade C indirect (Edwards 2023 BJSM); knee and breath-holding cautions present.' },
    learnMore: [],
    families: ['stance'],
    since: '1.2',
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
