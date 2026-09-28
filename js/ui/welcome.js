// Welcome hero.
import { seal } from './components.js';

export function render(root, ctx) {
  root.innerHTML = `
  <section class="welcome">
    <div class="welcome-mark">${seal('鍛', { size: 112, cls: 'seal-hero' })}</div>
    <p class="eyebrow">きたえる · Kitaeru</p>
    <h1 class="welcome-title">鍛える</h1>
    <p class="welcome-sub">to forge</p>
    <div class="ink-rule" aria-hidden="true"></div>
    <p class="welcome-promise">Movement disciplines from around the world, brought together to strengthen body and mind.</p>
    <p class="welcome-free small muted">Free forever. No account, no ads, your data stays on your phone.</p>
    <div class="welcome-actions">
      <button class="btn btn-primary btn-lg" data-begin>Build my plan<span class="btn-sub">about 3 minutes</span></button>
      <button class="btn btn-ghost btn-lg btn-accent-outline" data-quick>Quick workout<span class="btn-sub">no setup — start now</span></button>
    </div>
  </section>`;
  root.querySelector('[data-begin]').addEventListener('click', () => ctx.go('#/onboarding/goals'));
  root.querySelector('[data-quick]').addEventListener('click', () => ctx.go('#/quick'));
}
