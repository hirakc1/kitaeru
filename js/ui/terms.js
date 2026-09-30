// Terms of use and health & safety: must be accepted before the app can be used (guard in app.js).
// Bump TERMS_VERSION in store.js whenever the text below changes in substance: everyone is asked to accept again.
import { getState, update, TERMS_VERSION } from '../store.js';
import { esc, icon } from './base.js';

export const TERMS_UPDATED = '30 September 2026';

// Short screening list shown at acceptance (from the PAR-Q+ questions used in onboarding).
const SCREEN = [
  'a heart condition or high blood pressure',
  'chest pain at rest, in daily life or when active',
  'dizziness that made you lose balance, or losing consciousness, in the past 12 months',
  'another chronic medical condition, or prescribed medication for one',
  'a bone, joint or soft-tissue problem that activity could make worse',
  'a doctor’s advice to exercise only under medical supervision',
  'pregnancy, recent surgery or injury, or feeling unwell today',
];

const SECTIONS = [
  ['1. About Kitaeru', `<p>Kitaeru is a free app that offers general exercise guidance, workouts and information about movement traditions from around the world. It is made and provided by Levin Chakravorty, an independent developer (“we”, “us”). You can contact us through the project page at <a href="https://github.com/hirakc1/kitaeru" target="_blank" rel="noopener">github.com/hirakc1/kitaeru</a>.</p>`],
  ['2. Not medical advice', `<p>Everything in Kitaeru is general information. It is not medical, physiotherapy or other professional advice, and it does not diagnose, treat or prevent any condition. It is not a substitute for advice from a doctor or a qualified instructor who can see you in person. The health questions in the app help you think about your own safety; they do not clear you to exercise.</p>`],
  ['3. Your health is your responsibility', `<p>Before you start, and whenever your health changes, speak to a doctor if any of the conditions listed on the acceptance screen apply to you, or if you are unsure whether exercise is safe for you. You are responsible for deciding whether each exercise is suitable for you, for choosing an easier option or skipping it when it isn’t, and for stopping when something doesn’t feel right.</p>
    <p><strong>Stop straight away</strong> and seek medical help if you feel chest pain or pressure, faintness or dizziness, severe breathlessness, an irregular heartbeat, or sharp or worsening pain. In an emergency, call 999 (or your local emergency number).</p>`],
  ['4. You exercise at your own risk', `<p>Physical activity carries a risk of injury, including muscle strains, sprains, falls and, rarely, serious medical events. By using Kitaeru you choose to take part voluntarily and you accept those risks. Start gently, keep good form and progress gradually, as the app suggests.</p>`],
  ['5. Your space and equipment', `<p>You are responsible for exercising in a safe space with enough room, a non-slip floor and nothing to trip over or hit, and for keeping clear of other people, children and pets. If you use furniture or equipment (for example a chair, table, wall, bar, rings or a resistance band), you are responsible for checking that it is sturdy, secure and suitable before you put your weight on it.</p>`],
  ['6. Young people', `<p>Kitaeru is for people aged 13 and over. If you are under 18, a parent or guardian must read and accept these terms with you, and you should train with their awareness or that of a coach or PE teacher.</p>`],
  ['7. Accuracy of content', `<p>We work hard to make the content accurate and we cite our sources, but it may contain errors or omissions. Animations are illustrations and may not show every detail of good technique. Movements from traditional practices are presented as exercise only; Kitaeru does not teach those traditions in full and is not affiliated with the organisations named in it.</p>`],
  ['8. The app is provided “as is”', `<p>Kitaeru is free and provided “as is” and “as available”. We don’t promise that it will always be available, error-free or suitable for your particular needs, and we may change or withdraw features at any time.</p>`],
  ['9. Limits on our responsibility', `<p>To the fullest extent permitted by law, we are not liable for any injury, illness, loss or damage arising from your use of Kitaeru or from doing any exercise it describes or suggests.</p>
    <p>Nothing in these terms excludes or limits any liability that cannot be excluded or limited by law, including liability for death or personal injury caused by negligence, or for fraud. Nothing in these terms affects your statutory rights as a consumer.</p>`],
  ['10. Your data', `<p>Your data stays on your device. We don’t collect it, and there are no accounts, ads or tracking. You are responsible for keeping a backup (Me → Your data → Export) if you want one.</p>`],
  ['11. Changes to these terms', `<p>We may update these terms. When we change them in a way that matters, the app will ask you to read and accept the new version before you continue.</p>`],
  ['12. Law', `<p>These terms are governed by the law of England and Wales, and the courts of England and Wales have jurisdiction. If you live elsewhere in the UK or in another country, you keep any rights your local law gives you.</p>`],
];

export function termsHTML() {
  return SECTIONS.map(([h, body]) => `<section class="terms-sec"><h2 class="h3">${esc(h)}</h2>${body}</section>`).join('');
}

const CHECKS = [
  ['read', 'I have read and accept the Terms of use and the Health and safety information.'],
  ['risk', 'I understand that exercise carries a risk of injury. I take part at my own risk, and I am responsible for deciding whether each exercise is safe for me.'],
  ['health', 'None of the health conditions listed above apply to me, or a doctor has told me that I can exercise.'],
  ['age', 'I am 18 or over, or I am 13–17 and a parent or guardian has read and accepted these terms with me.'],
];

export function render(root, ctx) {
  const s = getState();
  const accepted = s.settings.terms && s.settings.terms.v === TERMS_VERSION ? s.settings.terms : null;
  const viewOnly = !!accepted;
  const next = ctx.query.next && /^\/[a-z]/.test(ctx.query.next) ? `#${ctx.query.next}` : null;
  const checked = new Set();
  root.innerHTML = `
  <section class="terms">
    ${viewOnly ? `<button class="icon-btn" data-back aria-label="Back">${icon('back')}</button>` : ''}
    <p class="eyebrow">Before you start</p>
    <h1 class="title">Terms of use and safety</h1>
    <p class="muted small">Last updated ${TERMS_UPDATED}.</p>
    <div class="note note-warn">${icon('info', { size: 20 })}<div>
      <p><strong>Please read this before you use Kitaeru.</strong> Kitaeru gives general exercise guidance, not medical advice. You exercise at your own risk.</p>
      <p>Speak to a doctor before starting if any of these apply to you:</p>
      <ul class="terms-screen">${SCREEN.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div></div>
    ${termsHTML()}
    ${viewOnly
      ? `<p class="small muted terms-accepted">${icon('check', { size: 16 })} You accepted these terms on ${esc(new Date(accepted.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))}.</p>`
      : `<form class="terms-accept" data-accept>
          ${CHECKS.map(([k, t]) => `<label class="terms-check"><input type="checkbox" data-check="${k}"><span>${esc(t)}</span></label>`).join('')}
          <button class="btn btn-primary btn-lg btn-block" type="submit" data-ok disabled>I agree, continue</button>
          <p class="small muted center">If you don’t agree, please don’t use Kitaeru.</p>
        </form>`}
  </section>`;
  root.querySelector('[data-back]')?.addEventListener('click', () => (history.length > 1 ? history.back() : ctx.go('#/me')));
  const form = root.querySelector('[data-accept]');
  if (!form) return;
  const ok = form.querySelector('[data-ok]');
  form.addEventListener('change', e => {
    const k = e.target.dataset.check; if (!k) return;
    if (e.target.checked) checked.add(k); else checked.delete(k);
    ok.disabled = checked.size !== CHECKS.length;
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (checked.size !== CHECKS.length) return;
    update(st => { st.settings.terms = { v: TERMS_VERSION, at: new Date().toISOString() }; });
    ctx.go(next || '#/welcome', { replace: true });
  });
}
