// Multi-step onboarding (also used to edit the profile from Me).
import { getState, update, getDraft, saveDraft, clearDraft, toISO, weekStart } from '../store.js';
import { esc, icon, seal, stepper, handleStepper, clamp, reducedMotion, DOW_SHORT, DOW_ORDER, DOW_LONG,
  cmToFtIn, ftInToCm, kgToStLb, kgToLb, lbToKg, fmtHeight, fmtWeight } from './components.js';
import { GOALS, goalName, levelsFor, computePlanStart, isFirstTimer } from './model.js';

const STEPS = ['goals', 'time', 'about', 'experience', 'baseline', 'injuries', 'equipment', 'health', 'summary'];
const MINUTES = [10, 15, 20, 30, 45, 60, 75, 90];
const SUGGEST = { 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] };
const EXPERIENCE = [
  { id: 'new', name: 'New to this', desc: 'Little or no regular exercise lately. We start gently and build the habit first.' },
  { id: 'some', name: 'Some experience', desc: 'You move now and then and can do a few push-ups or squats with good form.' },
  { id: 'regular', name: 'Train regularly', desc: 'You have trained 2–3× a week for months. Push-ups and squats feel solid.' },
  { id: 'advanced', name: 'Advanced', desc: 'Years of consistent training. Pull-ups, dips or pistols are in your toolkit.' },
];
const BASELINE = [
  { key: 'pushUps', name: 'Max push-ups', unit: 'reps', max: 150 },
  { key: 'pullUps', name: 'Max pull-ups', unit: 'reps', max: 60 },
  { key: 'squats', name: 'Max squats', unit: 'reps', max: 300 },
  { key: 'plankSec', name: 'Plank hold', unit: 'sec', max: 600 },
];
const JOINTS = [['wrist', 'Wrists'], ['elbow', 'Elbows'], ['shoulder', 'Shoulders'], ['neck', 'Neck'], ['lower_back', 'Lower back'], ['hip', 'Hips'], ['knee', 'Knees'], ['ankle', 'Ankles']];
export const EQUIP = [
  ['wall', 'Clear wall', '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9.3h18M3 14.6h18M9 4v5.3M15 9.3v5.3M9 14.6V20"/>'],
  ['bench', 'Sturdy chair / bench', '<path d="M7 3v9h10M7 12v8M17 12v8M7 8h10"/>'],
  ['table', 'Sturdy table', '<path d="M2 8h20M4 8v12M20 8v12M4 11h16"/>'],
  ['pullup_bar', 'Pull-up bar', '<path d="M3 5h18M5 3v4M19 3v4"/><circle cx="12" cy="9" r="1.6"/><path d="M9 5l1.5 6h3L15 5M12 11v6M12 17l-2 4M12 17l2 4"/>'],
  ['dip_bars', 'Dip bars', '<path d="M3 9h8M13 12h8M5 9v11M9 9v11M15 12v8M19 12v8"/>'],
  ['rings', 'Gymnastic rings', '<path d="M8 2v8M16 2v8"/><circle cx="8" cy="14.5" r="4"/><circle cx="16" cy="14.5" r="4"/>'],
  ['parallettes', 'Parallettes', '<path d="M2 13h8M14 13h8M3 13l-1 6M9 13l1 6M15 13l-1 6M21 13l1 6"/>'],
  ['resistance_band', 'Resistance band', '<path d="M5 12c3-7 5 7 7 0s4 7 7 0"/><rect x="1.5" y="10" width="3.5" height="4" rx="1"/><rect x="19" y="10" width="3.5" height="4" rx="1"/>'],
];
const SPACES = [
  { id: 'small', name: 'Small', desc: 'About a yoga mat — room to lie down, not much more.' },
  { id: 'medium', name: 'Medium', desc: 'Room to lie down and swing your arms and legs freely.' },
  { id: 'large', name: 'Large', desc: 'Room to jump, lunge and crawl several metres.' },
];
// PAR-Q+ style questions and copy from docs/research.md §11.
const PARQ = [
  'Has a doctor ever said you have a heart condition or high blood pressure?',
  'Do you get chest pain at rest, during daily activities, or during physical activity?',
  'In the past 12 months, have you lost balance because of dizziness, or lost consciousness? (Answer no if the dizziness was only from over-breathing during hard exercise.)',
  'Have you been diagnosed with another chronic medical condition (other than heart disease or high blood pressure)?',
  'Are you currently taking prescribed medication for a chronic medical condition?',
  'Do you currently have (or have you had in the past 12 months) a bone, joint or soft-tissue problem that could be made worse by being more active?',
  'Has a doctor said you should only do medically supervised physical activity?',
];
const DELAY = [['unwell', 'Are you currently unwell (cold, fever, infection)?'], ['pregnant', 'Are you pregnant?'], ['changed', 'Has your health changed recently?']];
const STRONG = [0, 1, 2, 6];
const fmtHold = sec => (sec >= 60 ? `${Math.floor(sec / 60)} min${sec % 60 ? ` ${sec % 60} s` : ''}` : `${sec} s`);
export const DISCLAIMER = 'Kitaeru gives general fitness guidance, not medical advice. Exercise has some risk. Start easy, keep good form, and stop if you feel chest pain, faintness, severe breathlessness or sharp pain. If you have a medical condition, are pregnant, are recovering from injury or surgery, or are unsure whether exercise is safe for you, talk to a doctor or qualified professional first. Mild muscle soreness for 1–3 days is normal. Joint pain that lasts into the next day is not: ease off that exercise.';

function blankProfile() {
  const s = getState();
  return {
    name: '', goals: [], primaryGoal: null, daysPerWeek: 3, minutesPerSession: 30, preferredDays: [1, 3, 5],
    age: null, sex: null, heightCm: null, weightKg: null, units: s.settings.units || 'metric',
    experience: null, baseline: { pushUps: null, pullUps: null, squats: null, plankSec: null },
    injuries: [], equipment: ['wall'], space: 'medium', lowImpact: false,
  };
}

/** Start editing the saved profile (called from Me / Plan). */
function editDraft() {
  const s = getState();
  const h = s.profile.health;
  const parq = h && Array.isArray(h.parq) ? [...h.parq, !!h.unwell, !!h.pregnant, !!h.changed] : Array(PARQ.length + DELAY.length).fill(null);
  return { mode: 'edit', profile: structuredClone({ ...blankProfile(), ...s.profile }), parq, resetLevels: false, weightFmt: s.settings.weightFmt || 'stlb', touched: {} };
}
export function beginEdit(step = 'hub') {
  saveDraft(editDraft());
  location.hash = `#/onboarding/${step}`;
}

let d = null; // current draft
function loadDraft() {
  d = getDraft();
  if (!d || !d.profile) d = getState().profile ? editDraft() : { mode: 'new', profile: blankProfile(), parq: Array(PARQ.length + DELAY.length).fill(null), resetLevels: false, weightFmt: 'stlb', touched: {} };
  d.touched ||= {};
}
const save = () => saveDraft(d);

// ---------- day spreading ----------
const MONFIRST = dw => (dw + 6) % 7;
/** Smallest circular gap between training days (Monday-first); larger = better spread. */
function spreadScore(days) {
  const s = days.map(MONFIRST).sort((a, b) => a - b);
  let min = 7;
  for (let i = 0; i < s.length; i++) min = Math.min(min, ((s[(i + 1) % s.length] - s[i]) + 7) % 7 || 7);
  return min * 10 - s.reduce((a, x) => a + x, 0) / 100; // tie-break towards earlier days
}
/** Stepper: add or remove single days, choosing whichever keeps the week most spread out. */
function setDayCount(n) {
  const p = d.profile;
  let days = [...p.preferredDays];
  while (days.length < n) {
    const cands = [0, 1, 2, 3, 4, 5, 6].filter(x => !days.includes(x));
    days.push(cands.sort((a, b) => spreadScore([...days, b]) - spreadScore([...days, a]))[0]);
  }
  while (days.length > n) {
    days = days.map(x => days.filter(y => y !== x)).sort((a, b) => spreadScore(b) - spreadScore(a))[0];
  }
  p.preferredDays = days.sort((a, b) => a - b); p.daysPerWeek = n; d.dayMsg = '';
}

// ---------- validation ----------
function valid(step) {
  const p = d.profile;
  switch (step) {
    case 'goals': return p.goals.length > 0 && p.goals.includes(p.primaryGoal);
    case 'time': return p.preferredDays.length === p.daysPerWeek && MINUTES.includes(p.minutesPerSession);
    case 'about': return ageOk(p.age) && !!p.sex && heightOk(p.heightCm) && weightOk(p.weightKg);
    case 'experience': return !!p.experience;
    case 'equipment': return !!p.space;
    case 'health': return d.parq.every(a => a === true || a === false);
    default: return true;
  }
}
const ageOk = a => Number.isFinite(a) && a >= 13 && a <= 100;
const heightOk = h => Number.isFinite(h) && h >= 120 && h <= 230;
const weightOk = w => Number.isFinite(w) && w >= 30 && w <= 300;

// ---------- step templates ----------
const pressed = b => `aria-pressed="${b ? 'true' : 'false'}"`;
const chip = (act, val, label, on, extra = '') => `<button type="button" class="chip" data-act="${act}" data-val="${esc(val)}" ${pressed(on)} ${extra}>${label}</button>`;

const T = {
  goals(p) {
    return `<h1 class="ob-title">What are you forging?</h1><p class="muted">Choose everything that matters to you.</p>
    <div class="opt-grid" role="group" aria-label="Goals">${GOALS.map(g => `<button type="button" class="opt-card" data-act="goal" data-val="${g.id}" ${pressed(p.goals.includes(g.id))} aria-label="${esc(`${g.name}. ${g.desc}`)}">
      <span class="opt-kanji" aria-hidden="true">${g.emoji}</span><span class="opt-name">${g.name}</span><span class="opt-desc">${g.desc}</span>
      <span class="opt-check" aria-hidden="true">${icon('check', { size: 16 })}</span></button>`).join('')}</div>
    ${p.goals.length > 1 ? `<h2 class="ob-sub">Which matters most?</h2><div class="chips" role="group" aria-label="Primary goal">${p.goals.map(g => chip('primary', g, goalName(g), p.primaryGoal === g)).join('')}</div>` : ''}`;
  },
  time(p) {
    const n = p.daysPerWeek, sel = p.preferredDays.length;
    return `<h1 class="ob-title">Your week</h1><p class="muted">Consistency beats intensity. Pick a rhythm you can keep.</p>
    <div class="field"><span class="label">Days per week</span>${stepper({ name: 'days', value: n, min: 2, max: 6, label: 'days per week', unit: 'days' })}</div>
    <div class="field"><span class="label" id="dlab">Which days?</span>
      <div class="chips chips-days" role="group" aria-labelledby="dlab">${DOW_ORDER.map(dw => chip('day', dw, DOW_SHORT[dw], p.preferredDays.includes(dw), `aria-label="${DOW_LONG[dw]}"`)).join('')}</div>
      <p class="hint ${d.dayMsg ? 'warn' : 'ok'}" aria-live="polite">${d.dayMsg ? esc(d.dayMsg) : `${icon('check', { size: 16 })} ${sel} days a week.`}
      <button type="button" class="link" data-act="suggest">Spread them out</button></p></div>
    <div class="field"><span class="label" id="mlab">Minutes per session</span>
      <div class="chips" role="group" aria-labelledby="mlab">${MINUTES.map(m => chip('mins', m, `${m}`, p.minutesPerSession === m, `aria-label="${m} minutes"`)).join('')}</div></div>`;
  },
  about(p) {
    const imp = p.units === 'imperial';
    const fi = p.heightCm ? cmToFtIn(p.heightCm) : { ft: '', in: '' };
    const sl = p.weightKg ? kgToStLb(p.weightKg) : { st: '', lb: '' };
    const lb = p.weightKg ? Math.round(kgToLb(p.weightKg)) : '';
    const num = (key, val, label, unit, attrs = '') => `<label class="num-field"><span class="sr-only">${label}</span>
      <input type="text" inputmode="numeric" autocomplete="off" data-num="${key}" value="${val ?? ''}" aria-label="${label}" ${attrs}><span class="unit">${unit}</span></label>`;
    return `<h1 class="ob-title">About you</h1><p class="muted">Used only to tailor your plan. It never leaves this device.</p>
    <div class="field"><label class="label" for="nm">Name <span class="muted small">(optional)</span></label>
      <input id="nm" class="input" type="text" data-text="name" value="${esc(p.name || '')}" autocomplete="given-name" maxlength="30"></div>
    <div class="field"><span class="label">Age</span><div class="num-row">${num('age', p.age, 'Age in years', 'years', 'maxlength="3"')}</div><p class="hint warn" data-hint="age" ${d.touched.age && !ageOk(p.age) && !(p.age < 13) ? '' : 'hidden'}>Enter an age between 13 and 100.</p>
      <div class="note" data-hint="kid" ${Number.isFinite(p.age) && p.age > 0 && p.age < 13 ? '' : 'hidden'}>${icon('info', { size: 20 })}<p><strong>Kitaeru is for ages 13 and up.</strong> Thanks so much for your interest! Until then, the best training is play: run, climb, swim, ride and try lots of sports with friends. We’ll be here when you’re 13.</p></div>
      <div class="note" data-hint="teen" ${p.age >= 13 && p.age < 18 ? '' : 'hidden'}>${icon('info', { size: 20 })}<p>Great to have you. Please train with a parent, coach or PE teacher’s awareness, and focus on good technique.</p></div></div>
    <div class="field"><span class="label" id="sexl">Sex</span><div class="seg" role="group" aria-labelledby="sexl">
      ${[['male', 'Male'], ['female', 'Female'], ['unspecified', 'Prefer not to say']].map(([v, l]) => chip('sex', v, l, p.sex === v)).join('')}</div></div>
    <div class="field"><span class="label" id="unl">Units</span><div class="seg seg-sm" role="group" aria-labelledby="unl">
      ${chip('units', 'metric', 'Metric', !imp)}${chip('units', 'imperial', 'Imperial', imp)}</div></div>
    <div class="field"><span class="label">Height</span><div class="num-row">
      ${imp ? num('ft', fi.ft, 'Height feet', 'ft', 'maxlength="1"') + num('in', fi.in, 'Height inches', 'in', 'maxlength="2"') : num('cm', p.heightCm ? Math.round(p.heightCm) : '', 'Height in centimetres', 'cm', 'maxlength="3"')}</div>
      <p class="hint warn" data-hint="h" ${d.touched.h && !heightOk(p.heightCm) ? '' : 'hidden'}>Enter a height between 120 and 230 cm (3′11″–7′6″).</p></div>
    <div class="field"><span class="label">Weight</span>
      ${imp ? `<div class="seg seg-xs" role="group" aria-label="Weight format">${chip('wfmt', 'stlb', 'st & lb', d.weightFmt === 'stlb')}${chip('wfmt', 'kg', 'kg', d.weightFmt === 'kg')}${chip('wfmt', 'lb', 'lb', d.weightFmt === 'lb')}</div>` : ''}
      <div class="num-row">${!imp || d.weightFmt === 'kg' ? num('kg', p.weightKg ? Math.round(p.weightKg * 10) / 10 : '', 'Weight in kilograms', 'kg', 'inputmode="decimal" maxlength="5"')
        : d.weightFmt === 'lb' ? num('lb', lb, 'Weight in pounds', 'lb', 'maxlength="3"')
        : num('st', sl.st, 'Weight stones', 'st', 'maxlength="2"') + num('stlb', sl.lb, 'Weight pounds', 'lb', 'maxlength="2"')}</div>
      <p class="hint warn" data-hint="w" ${d.touched.w && !weightOk(p.weightKg) ? '' : 'hidden'}>Enter a weight between 30 and 300 kg (66–660 lb).</p></div>`;
  },
  experience(p) {
    return `<h1 class="ob-title">Where are you starting?</h1><p class="muted">Be honest — starting a little easy is the fastest way forward.</p>
    <div class="opt-list" role="group" aria-label="Experience level">${EXPERIENCE.map((e, i) => `<button type="button" class="opt-card opt-row" data-act="exp" data-val="${e.id}" ${pressed(p.experience === e.id)} aria-label="${esc(`${e.name}. ${e.desc}`)}">
      <span class="opt-level" aria-hidden="true">${'●'.repeat(i + 1)}${'○'.repeat(3 - i)}</span>
      <span><span class="opt-name">${e.name}</span><span class="opt-desc">${e.desc}</span></span></button>`).join('')}</div>`;
  },
  baseline(p) {
    return `<h1 class="ob-title">Quick baseline <span class="tag">optional</span></h1>
    <p class="muted">If you know roughly what you can do in one go, it sharpens your starting levels. Otherwise skip it.</p>
    <div class="stack">${BASELINE.map(b => {
      const v = p.baseline[b.key];
      const field = (key, val, unit, label, max = 3) => `<span class="num-field"><input id="bl-${key}" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="${max}" placeholder="—" data-num="base:${key}" value="${val ?? ''}" aria-label="${label}"><span class="unit">${unit}</span></span>`;
      const ctl = b.key === 'plankSec'
        ? field('plankMin', v == null ? '' : Math.floor(v / 60), 'min', 'Plank minutes', 2) + field('plankS', v == null ? '' : v % 60, 's', 'Plank seconds', 2)
        : field(b.key, v, b.unit, b.name);
      return `<div class="base-row card"><label class="base-name" for="bl-${b.key === 'plankSec' ? 'plankMin' : b.key}">${b.name}</label>
        <div class="base-ctl">${ctl}${chip('base-null', b.key, "Don’t know / can’t", v === null)}</div></div>`;
    }).join('')}</div>`;
  },
  injuries(p) {
    const none = p.injuries.length === 0;
    return `<h1 class="ob-title">Anything that hurts?</h1><p class="muted">We’ll avoid exercises that load these joints.</p>
    <div class="chips" role="group" aria-label="Joints">${chip('inj-none', 'none', 'None', none)}${JOINTS.map(([id, l]) => chip('inj', id, l, p.injuries.includes(id))).join('')}</div>
    <div class="note">${icon('info', { size: 20 })}<p>Kitaeru isn’t medical advice. If something hurts — especially sharp, persistent or worsening pain — please see a physiotherapist or doctor before training it.</p></div>`;
  },
  equipment(p) {
    return `<h1 class="ob-title">What do you have?</h1><p class="muted">Floor and bodyweight are always included. Tick anything else within reach.</p>
    <div class="equip-grid" role="group" aria-label="Equipment">${EQUIP.map(([id, l, svg]) => `<button type="button" class="equip" data-act="equip" data-val="${id}" ${pressed(p.equipment.includes(id))} aria-label="${esc(l)}">
      <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svg}</svg>
      <span>${l}</span></button>`).join('')}</div>
    <h2 class="ob-sub">How much space?</h2>
    <div class="opt-list" role="group" aria-label="Space">${SPACES.map(s => `<button type="button" class="opt-card opt-row" data-act="space" data-val="${s.id}" ${pressed(p.space === s.id)} aria-label="${esc(`${s.name} space. ${s.desc}`)}">
      <span class="space-ico space-${s.id}" aria-hidden="true"></span><span><span class="opt-name">${s.name}</span><span class="opt-desc">${s.desc}</span></span></button>`).join('')}</div>
    <label class="switch-row card"><span><span class="opt-name">Prefer low impact</span><span class="opt-desc">No jumping — kinder to joints and neighbours.</span></span>
      <input type="checkbox" class="switch" data-act="lowimpact" ${p.lowImpact ? 'checked' : ''}></label>`;
  },
  health(p) {
    const q = d.parq;
    const PREG = PARQ.length + 1;
    if (p.sex === 'male' && q[PREG] == null) { q[PREG] = false; save(); }
    const strong = STRONG.some(i => q[i] === true);
    const some = [3, 4, 5].some(i => q[i] === true);
    const [unwell, pregnant] = [q[PARQ.length], q[PARQ.length + 1]];
    const answered = q.every(a => a === true || a === false);
    const yn = (i, label) => `<li class="card"><p>${label}</p><div class="seg seg-sm" role="group" aria-label="${esc(label)}">
      ${chip('parq', `${i}:1`, 'Yes', q[i] === true)}${chip('parq', `${i}:0`, 'No', q[i] === false)}</div></li>`;
    const notes = [];
    if (strong) notes.push(`<div class="note note-warn" role="alert">${icon('info', { size: 20 })}<p><strong>Please speak to a doctor before starting.</strong> You can still continue once you’ve read this — we’ll keep things low impact and well short of failure.</p></div>`);
    else if (some) notes.push(`<div class="note">${icon('info', { size: 20 })}<p>Consider checking with a doctor or physiotherapist, especially before hard sessions.${q[5] ? ' Tell us about any sore joints on the injuries step so we can work around them.' : ''}</p></div>`);
    if (unwell) notes.push(`<div class="note">${icon('info', { size: 20 })}<p><strong>Wait until you’re better</strong> before your first session. Your plan will be ready when you are.</p></div>`);
    if (pregnant) notes.push(`<div class="note">${icon('info', { size: 20 })}<p>Check with your midwife or doctor. Many people can keep training, but some exercises need changes — we’ll keep it low impact.</p></div>`);
    if (answered && !notes.length) notes.push(`<div class="note note-ok">${icon('check', { size: 20 })}<p>You’re cleared to start gently.</p></div>`);
    return `<h1 class="ob-title">A quick health check</h1><p class="muted">Standard pre-exercise questions, based on the PAR-Q+. Answer for how you are today.</p>
    <ol class="parq">${PARQ.map((t, i) => yn(i, t)).join('')}</ol>
    <h2 class="ob-sub">Right now</h2>
    <ol class="parq parq-plain">${DELAY.map(([, t], j) => (p.sex === 'male' && PARQ.length + j === PREG ? '' : yn(PARQ.length + j, t))).join('')}</ol>
    ${notes.join('')}
    <details class="disclaimer"><summary>Important: please read</summary><p>${DISCLAIMER}</p></details>`;
  },
  summary(p) {
    const row = r => `<div class="sum-row"><dt>${r.label}</dt><dd>${r.value}</dd><button type="button" class="link" data-goto="${r.step}" aria-label="Edit ${r.label}">Edit</button></div>`;
    return `<h1 class="ob-title">Ready to forge</h1><p class="muted">Check everything looks right.</p>
    <dl class="summary card">${summaryRows(p).filter(r => r.step !== 'health').map(row).join('')}</dl>`;
  },
  hub(p) {
    return `<h1 class="ob-title">Your preferences</h1><p class="muted">Change any section, then save to update your plan.</p>
    <ul class="hub">${summaryRows(p).map(r => `<li class="hub-row card"><div class="hub-text"><span class="hub-label">${r.label}</span><span class="hub-val">${r.value}</span></div>
      <button type="button" class="btn btn-ghost btn-sm" data-goto="${r.step}" aria-label="Edit ${r.label}">${icon('edit', { size: 16 })} Edit</button></li>`).join('')}</ul>
    <label class="switch-row card"><span><span class="opt-name">Reset my progression levels</span><span class="opt-desc">Off keeps the levels you have earned.</span></span>
      <input type="checkbox" class="switch" data-act="resetlv" ${d.resetLevels ? 'checked' : ''}></label>`;
  },
};

/** One row per section, shared by the first-run summary and the edit hub. */
function summaryRows(p) {
  const days = DOW_ORDER.filter(x => p.preferredDays.includes(x)).map(x => DOW_SHORT[x]).join(' · ');
  const base = BASELINE.filter(b => p.baseline[b.key] != null).map(b => { const n = b.name.replace('Max ', ''); const v = p.baseline[b.key]; return `${n[0].toUpperCase()}${n.slice(1)} ${b.key === 'plankSec' ? fmtHold(v) : v}`; }).join(', ') || 'Skipped';
  const q = d.parq || [];
  const health = q.some(a => a == null) ? 'Not answered' : STRONG.some(i => q[i]) ? 'Doctor check advised' : q.some(Boolean) ? 'Some flags noted' : 'All clear';
  return [
    { label: 'Goals', step: 'goals', value: p.goals.map(g => (g === p.primaryGoal ? `<strong>${goalName(g)}</strong>` : goalName(g))).join(', ') || '—' },
    { label: 'Schedule', step: 'time', value: `${p.daysPerWeek}× a week · ${p.minutesPerSession} min<br><span class="muted">${days}</span>` },
    { label: 'About you', step: 'about', value: `${p.name ? esc(p.name) + ', ' : ''}${p.age ?? '—'} · ${fmtHeight(p.heightCm, p.units)} · ${fmtWeight(p.weightKg, p.units, d.weightFmt)}` },
    { label: 'Experience', step: 'experience', value: EXPERIENCE.find(e => e.id === p.experience)?.name || '—' },
    { label: 'Baseline', step: 'baseline', value: base },
    { label: 'Injuries', step: 'injuries', value: p.injuries.length ? p.injuries.map(i => JOINTS.find(j => j[0] === i)[1]).join(', ') : 'None' },
    { label: 'Kit & space', step: 'equipment', value: (p.equipment.map(e => EQUIP.find(x => x[0] === e)?.[1]).join(', ') || 'Floor only') + ` · ${p.space} space${p.lowImpact ? ' · low impact' : ''}` },
    { label: 'Health check', step: 'health', value: health },
  ];
}

// ---------- render ----------
let rootEl = null, ctxRef = null;
export function render(root, ctx) {
  rootEl = root; ctxRef = ctx;
  loadDraft();
  const want = ctx.params[0];
  const step = d.mode === 'edit' ? (STEPS.includes(want) && want !== 'summary' || want === 'hub' ? want : 'hub') : (STEPS.includes(want) ? want : 'goals');
  // Don't allow deep links past an invalid step.
  const firstBad = STEPS.slice(0, STEPS.indexOf(step)).find(s => !valid(s));
  if (firstBad && d.mode === 'new') { history.replaceState(null, '', `#/onboarding/${firstBad}`); return render(root, { ...ctx, params: [firstBad] }); }
  draw(step);
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
  root.addEventListener('focusout', onBlur);
  return () => { root.removeEventListener('click', onClick); root.removeEventListener('input', onInput); root.removeEventListener('change', onChange); root.removeEventListener('focusout', onBlur); };
}

let curStep = 'goals';
let lastDrawn = null;
function draw(step, opts = {}) {
  if (d.mode === 'edit') return drawEdit(step, opts);
  const { keepFocus = false } = opts;
  const entering = lastDrawn !== step;
  lastDrawn = curStep = step;
  const i = STEPS.indexOf(step);
  const fkey = keepFocus && document.activeElement?.closest('[data-act]') ? `[data-act="${document.activeElement.closest('[data-act]').dataset.act}"][data-val="${document.activeElement.closest('[data-act]').dataset.val}"]` : null;
  const isLast = step === 'summary';
  const canBack = i > 0 || d.mode === 'edit';
  rootEl.innerHTML = `
  <div class="ob">
    <header class="ob-head">
      <button class="icon-btn" data-nav="back" aria-label="${i > 0 ? 'Previous step' : 'Cancel'}" ${canBack || d.mode === 'new' ? '' : 'disabled'}>${icon(i === 0 && d.mode === 'edit' ? 'close' : 'back')}</button>
      <div class="ob-progress" role="progressbar" aria-label="Setup progress" aria-valuemin="1" aria-valuemax="${STEPS.length}" aria-valuenow="${i + 1}">
        <div class="progress-fill" style="width:${((i + 1) / STEPS.length) * 100}%"></div></div>
      <span class="ob-count">${i + 1}/${STEPS.length}</span>
    </header>
    <form class="ob-body ${entering ? 'enter' : ''}" novalidate onsubmit="return false">${T[step](d.profile)}</form>
    <footer class="ob-foot">
      ${step === 'baseline' ? '<button type="button" class="btn btn-ghost" data-nav="skip">Skip</button>' : `<button type="button" class="btn btn-ghost" data-nav="back">${i === 0 ? (d.mode === 'edit' ? 'Cancel' : 'Back') : 'Back'}</button>`}
      <button type="button" class="btn btn-primary" data-nav="next" ${valid(step) ? '' : 'disabled'}>${isLast ? `${seal('鍛', { size: 22, cls: 'seal-inline' })} Forge my plan` : 'Next'}</button>
    </footer>
  </div>`;
  if (fkey) rootEl.querySelector(fkey)?.focus({ preventScroll: true });
}

const focusKey = () => { const a = document.activeElement?.closest('[data-act]'); return a ? `[data-act="${a.dataset.act}"][data-val="${a.dataset.val}"]` : null; };
/** Edit mode: a hub of sections; each section opens alone and returns with Done. */
function drawEdit(step, { keepFocus = false } = {}) {
  const entering = lastDrawn !== step;
  lastDrawn = curStep = step;
  const fkey = keepFocus ? focusKey() : null;
  const hub = step === 'hub';
  rootEl.innerHTML = `
  <div class="ob ob-edit">
    <header class="ob-head">
      <button class="icon-btn" data-nav="back" aria-label="${hub ? 'Cancel editing' : 'Back to all preferences'}">${icon(hub ? 'close' : 'back')}</button>
      <span class="ob-edit-title">${hub ? 'Edit preferences' : 'Edit section'}</span>
    </header>
    <form class="ob-body ${entering ? 'enter' : ''}" novalidate onsubmit="return false">${T[step](d.profile)}</form>
    <footer class="ob-foot">
      ${hub ? `<button type="button" class="btn btn-ghost" data-nav="back">Cancel</button>
        <button type="button" class="btn btn-primary" data-nav="next" ${STEPS.filter(x => x !== 'summary').every(valid) ? '' : 'disabled'}>${seal('鍛', { size: 22, cls: 'seal-inline' })} Save & update plan</button>`
      : `<button type="button" class="btn btn-primary btn-block" data-nav="next" ${valid(step) ? '' : 'disabled'}>${icon('check', { size: 18 })} Done</button>`}
    </footer>
  </div>`;
  if (fkey) rootEl.querySelector(fkey)?.focus({ preventScroll: true });
}

function refreshNext() {
  const b = rootEl.querySelector('[data-nav="next"]'); if (b) b.disabled = !valid(curStep);
}

function nav(dir) {
  if (d.mode === 'edit') {
    if (curStep === 'hub') { if (dir < 0) { clearDraft(); location.hash = '#/me'; } else if (STEPS.filter(x => x !== 'summary').every(valid)) forge(); return; }
    if (dir > 0 && !valid(curStep)) return;
    location.hash = '#/onboarding/hub'; return;
  }
  const i = STEPS.indexOf(curStep);
  if (dir < 0) {
    if (i === 0) { if (d.mode === 'edit') { clearDraft(); location.hash = '#/me'; } else location.hash = '#/welcome'; return; }
    location.hash = `#/onboarding/${STEPS[i - 1]}`;
  } else {
    if (!valid(curStep)) return;
    if (curStep === 'summary') return forge();
    location.hash = `#/onboarding/${STEPS[i + 1]}`;
  }
}

function onClick(e) {
  const n = e.target.closest('[data-nav]');
  if (n) { if (n.dataset.nav === 'skip') { location.hash = `#/onboarding/${STEPS[STEPS.indexOf(curStep) + 1]}`; } else nav(n.dataset.nav === 'next' ? 1 : -1); return; }
  const g = e.target.closest('[data-goto]');
  if (g) { location.hash = `#/onboarding/${g.dataset.goto}`; return; }
  const st = handleStepper(e);
  if (st) {
    if (st.name === 'days') { setDayCount(st.value); save(); draw(curStep); rootEl.querySelector(`[data-stepper="days"] [data-step-dir="${e.target.closest('[data-step-dir]').dataset.stepDir}"]`)?.focus(); return; }
    save(); refreshNext(); return;
  }
  const a = e.target.closest('[data-act]'); if (!a || a.type === 'checkbox') return;
  const p = d.profile, v = a.dataset.val;
  const toggle = (arr, x) => (arr.includes(x) ? arr.filter(y => y !== x) : [...arr, x]);
  switch (a.dataset.act) {
    case 'goal': p.goals = toggle(p.goals, v); if (!p.goals.includes(p.primaryGoal)) p.primaryGoal = p.goals[0] || null; if (p.goals.length === 1) p.primaryGoal = p.goals[0]; break;
    case 'primary': p.primaryGoal = v; break;
    case 'day': {
      // Chips and the count always agree: toggling a day changes days-per-week (kept within 2–6).
      const next = toggle(p.preferredDays, +v).sort((x, y) => x - y);
      if (next.length < 2) { d.dayMsg = 'Two days a week is the minimum for progress.'; break; }
      if (next.length > 6) { d.dayMsg = 'Keep at least one full rest day.'; break; }
      d.dayMsg = ''; p.preferredDays = next; p.daysPerWeek = next.length; break;
    }
    case 'suggest': p.preferredDays = [...SUGGEST[p.daysPerWeek]]; d.dayMsg = ''; break;
    case 'mins': p.minutesPerSession = +v; break;
    case 'sex': p.sex = v; break;
    case 'units': p.units = v; break;
    case 'wfmt': d.weightFmt = v; break;
    case 'exp': p.experience = v; break;
    case 'base-null': p.baseline[v] = null; break;
    case 'inj-none': p.injuries = []; break;
    case 'inj': p.injuries = toggle(p.injuries, v); break;
    case 'equip': p.equipment = toggle(p.equipment, v); break;
    case 'space': p.space = v; break;
    case 'parq': { const [i, yes] = v.split(':'); d.parq[+i] = yes === '1'; break; }
    default: return;
  }
  save(); draw(curStep, { keepFocus: true });
}

function onChange(e) {
  const a = e.target.closest('[data-act]'); if (!a || a.type !== 'checkbox') return;
  if (a.dataset.act === 'lowimpact') d.profile.lowImpact = a.checked;
  if (a.dataset.act === 'resetlv') d.resetLevels = a.checked;
  save();
}

function onInput(e) {
  const t = e.target, p = d.profile;
  if (t.dataset.text === 'name') { p.name = t.value.trim(); save(); return; }
  const k = t.dataset.num; if (!k) return;
  if (k.startsWith('base:')) {
    let key = k.slice(5);
    const c = t.value.replace(/\D/g, ''); if (c !== t.value) t.value = c;
    if (key === 'plankMin' || key === 'plankS') {
      // Plank is entered as min + s, stored as plankSec.
      const mi = rootEl.querySelector('[data-num="base:plankMin"]').value, se = rootEl.querySelector('[data-num="base:plankS"]').value;
      key = 'plankSec';
      p.baseline.plankSec = mi === '' && se === '' ? null : Math.min(600, (+mi || 0) * 60 + Math.min(59, +se || 0));
    } else p.baseline[key] = c === '' ? null : Math.min(BASELINE.find(b => b.key === key).max, +c);
    const nullChip = rootEl.querySelector(`[data-act="base-null"][data-val="${key}"]`);
    if (nullChip) nullChip.setAttribute('aria-pressed', String(p.baseline[key] === null));
    save(); return;
  }
  const cleaned = t.value.replace(k === 'kg' ? /[^\d.]/g : /\D/g, '');
  if (cleaned !== t.value) t.value = cleaned;
  const n = cleaned === '' ? null : +cleaned;
  const val = key => { const el = rootEl.querySelector(`[data-num="${key}"]`); return el && el.value !== '' ? +el.value : null; };
  if (k === 'age') p.age = n;
  if (k === 'cm') p.heightCm = n;
  if (k === 'ft' || k === 'in') { const ft = val('ft'), inch = val('in') ?? 0; p.heightCm = ft ? Math.round(ftInToCm(ft, clamp(inch, 0, 11)) * 10) / 10 : null; }
  if (k === 'kg') p.weightKg = n;
  if (k === 'lb') p.weightKg = n ? Math.round(lbToKg(n) * 10) / 10 : null;
  if (k === 'st' || k === 'stlb') { const st = val('st'), lb = val('stlb') ?? 0; p.weightKg = st ? Math.round(lbToKg(st * 14 + clamp(lb, 0, 13)) * 10) / 10 : null; }
  save(); refreshNext(); updateHints();
}

const HINT_OF = { age: 'age', cm: 'h', ft: 'h', in: 'h', kg: 'w', lb: 'w', st: 'w', stlb: 'w' };
function updateHints() {
  const p = d.profile, ok = { age: ageOk(p.age), h: heightOk(p.heightCm), w: weightOk(p.weightKg) };
  const a = p.age;
  rootEl.querySelectorAll('[data-hint]').forEach(h => {
    const k = h.dataset.hint;
    if (k === 'kid') h.hidden = !(Number.isFinite(a) && a > 0 && a < 13);
    else if (k === 'teen') h.hidden = !(a >= 13 && a < 18);
    else if (k === 'age') h.hidden = !(d.touched.age && !ok.age && !(a > 0 && a < 13));
    else h.hidden = !(d.touched[k] && !ok[k]);
  });
}
function onBlur(e) {
  const k = e.target.dataset?.num; if (!k || k.startsWith('base:')) return;
  d.touched[HINT_OF[k]] = true; save(); updateHints();
}

// ---------- forge ----------
function forge() {
  const p = structuredClone(d.profile);
  p.preferredDays = [...p.preferredDays].sort((a, b) => a - b);
  p.primaryGoal ||= p.goals[0];
  if (!ageOk(p.age)) return; // never generate a plan for under-13s
  const q = d.parq;
  p.health = { parq: q.slice(0, PARQ.length), unwell: !!q[PARQ.length], pregnant: !!q[PARQ.length + 1], changed: !!q[PARQ.length + 2], checkedAt: toISO() };
  if (STRONG.some(i => q[i]) || p.health.pregnant) p.lowImpact = true;
  const mode = d.mode, reset = d.resetLevels, wfmt = d.weightFmt;
  const overlay = document.createElement('div');
  overlay.className = 'forge-overlay';
  overlay.setAttribute('role', 'status');
  overlay.innerHTML = `<div class="forge-inner">${seal('鍛', { size: 96, cls: 'stamp' })}
    <ul class="forge-lines"><li>Reading your answers</li><li>Choosing your progressions</li><li>Balancing the week</li></ul></div>`;
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('on'));
  update(s => {
    s.levels = levelsFor(p, s.levels, mode === 'new' || reset);
    s.profile = p;
    // New plans (and edits before any training) start on the Monday given by planStartDate, never in the past.
    if (!(mode === 'edit' && s.plan?.startDate && !isFirstTimer())) { const start = computePlanStart(toISO(), p.preferredDays); s.plan = { startDate: start, blockStart: start, createdOn: toISO() }; }
    s.settings.units = p.units;
    if (p.units === 'imperial') s.settings.weightFmt = wfmt;
  });
  clearDraft();
  setTimeout(() => {
    overlay.classList.add('out');
    ctxRef.go('#/plan?fresh=1');
    setTimeout(() => overlay.remove(), 400);
  }, reducedMotion() ? 500 : 2300);
}
