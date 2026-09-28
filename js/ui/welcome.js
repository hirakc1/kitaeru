// Welcome hero.
import { seal } from './components.js';

export function render(root, ctx) {
  root.innerHTML = `
  <section class="welcome">
    <div class="welcome-mark">${seal('鍛', { size: 112, cls: 'seal-hero' })}</div>
    <p class="eyebrow">きたえる · Kitaeru</p>
    <h1 class="welcome-title">鍛える</h1>
    <p class="welcome-sub">to forge the body and mind</p>
    <div class="ink-rule" aria-hidden="true"></div>
    <p class="welcome-promise">Your bodyweight, forged daily.<br>Free forever. No account, no ads, your data stays on your phone.</p>
    <button class="btn btn-primary btn-lg" data-begin>Begin</button>
    <p class="small muted welcome-foot">About three minutes to set up.</p>
  </section>`;
  root.querySelector('[data-begin]').addEventListener('click', () => ctx.go('#/onboarding/goals'));
}
