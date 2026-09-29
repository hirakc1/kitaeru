// Plan tab: this week's sessions, phase, "why this plan".
import { getState, getCurrentWeekIndex } from '../store.js';
import { explainPlan } from './deps.js';
import { esc, icon, openSheet, mountAnims, fmtTarget, exName, DOW_LONG, seal, fmtDate } from './components.js';
import { todayISO } from '../store.js';
import { getWeek, weekDays, sessionMinutes, startWorkout, sessionById, groupLabel, withOptions, optionMinutes } from './model.js';
// onboarding.js loads only when editing, so Today does not wait for it.
const beginEdit = step => import('./onboarding.js').then(m => m.beginEdit(step));
import { update } from '../store.js';

const KIND_LABEL = { warmup: 'Warm-up', skill: 'Skill', main: 'Main', conditioning: 'Conditioning', mobility: 'Mobility', cooldown: 'Cool-down', balance: 'Balance', flow: 'Flow' };

/** v1.2 optional warm-up / cool-down swaps as switches. Empty when the session has none (tradition gated). */
export function optionsHTML(session) {
  const opts = session?.options || [];
  if (!opts.length) return '';
  const on = getState().settings.options || {};
  return `<div class="options" role="group" aria-label="Optional swaps">${opts.map(o => `<label class="switch-row opt-swap">
    <span><span class="opt-name">Swap the ${o.replaces === 'warmup' ? 'warm-up' : 'cool-down'} for ${esc(o.block.title || o.title)}</span>
    <span class="small muted">Optional · about ${optionMinutes(o)} min${o.block.items[0]?.notes ? ` · ${esc(o.block.items[0].notes)}` : ''}</span></span>
    <input type="checkbox" class="switch" data-option="${esc(o.id)}" ${on[o.id] ? 'checked' : ''}></label>`).join('')}</div>`;
}
/** Handle a change on an option switch: remembers the choice for next time. Returns true when handled. */
export function onOptionChange(e) {
  const t = e.target.closest?.('[data-option]');
  if (!t) return false;
  update(s => { s.settings.options = { ...(s.settings.options || {}), [t.dataset.option]: t.checked }; });
  return true;
}

export function sessionPreviewHTML(session) {
  return `<div class="preview">${session.blocks.map(b => `<section class="pv-block"><h3 class="pv-title">${esc(b.title || KIND_LABEL[b.kind] || b.kind)}</h3>
    <ul class="pv-list">${b.items.map((it, i, arr) => { const g = groupLabel(arr, i); return `<li class="pv-item ${g ? `pv-grouped ${g.pos === 1 ? 'pv-gfirst' : ''} ${g.pos === g.size ? 'pv-glast' : ''}` : ''}">${g ? `<span class="pv-glabel" aria-label="${g.circuit ? 'Circuit' : 'Superset'} ${g.label}">${g.label}</span>` : ''}<div class="pv-anim" data-anim="${it.exerciseId}" data-size="64" data-play="1"></div>
      <div class="pv-text"><a class="pv-name" href="#/library/${it.exerciseId}">${esc(exName(it.exerciseId))}</a><span class="muted small">${esc(fmtTarget(it))}${it.restSec ? ` · rest ${it.restSec}s` : ''}</span>
      ${it.notes ? `<span class="small pv-note">${esc(it.notes)}</span>` : ''}</div></li>`; }).join('')}</ul></section>`).join('')}</div>`;
}

export function inviteHTML(title = 'Build your plan') {
  return `<section class="card invite"><div class="invite-top">${seal('鍛', { size: 52 })}<div><h2 class="card-title">${title}</h2>
    <p class="muted small">Answer a few questions (about 3 minutes) and Kitaeru forges a weekly plan that progresses with you. Your quick workouts are kept.</p></div></div>
    <a class="btn btn-primary btn-block" href="#/onboarding/goals">Build my plan</a></section>`;
}

export function render(root, ctx) {
  const s = getState();
  if (!s.profile) {
    root.innerHTML = `<div class="screen plan"><header class="screen-head"><p class="eyebrow">計画 · Plan</p><h1 class="title">No plan yet</h1></header>${inviteHTML()}
      <a class="btn btn-ghost btn-block" href="#/quick">${icon('play', { size: 18 })} Or do a quick workout</a></div>`;
    return;
  }
  const wi = getCurrentWeekIndex();
  const week = getWeek(wi);
  let bullets = [];
  try { bullets = explainPlan(s.profile, week) || []; } catch (e) { console.error(e); }
  const days = weekDays();
  const fresh = ctx.query.fresh === '1';
  const deload = week.phase === 'deload';
  const whyHTML = `<section class="card why ${fresh ? 'why-fresh' : ''}"><h2 class="section-title">Why this plan</h2>
      <ul class="why-list">${bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul></section>`;

  root.innerHTML = `
  <div class="screen plan">
    <header class="screen-head">
      ${fresh ? `<div class="fresh">${seal('鍛', { size: 64, cls: 'stamp' })}<div><p class="eyebrow">Your plan is forged</p><p class="small muted">Here’s your week, and the thinking behind it.</p></div></div>` : ''}
      <p class="eyebrow">Week ${wi + 1}</p>
      <h1 class="title">${s.plan?.startDate > todayISO() ? 'Your first week' : 'This week'}</h1>
      <div class="badges"><span class="badge ${deload ? 'badge-gold' : 'badge-accent'}">${deload ? 'Deload' : week.meta?.reentry != null ? 'Re-entry' : 'Build'}${week.meta?.blockWeek != null && !deload ? ` · week ${week.meta.blockWeek} of ${week.meta.cycleLen}` : ''}</span>
        ${week.meta?.calibration ? '<span class="badge">Calibrating levels</span>' : ''}
        <span class="badge">${s.profile.daysPerWeek}× · ${s.profile.minutesPerSession} min</span></div>
      ${s.plan?.startDate > todayISO() ? `<p class="muted small">Your plan starts ${fmtDate(s.plan.startDate, { weekday: 'long', day: 'numeric', month: 'long' })}. You can start any session early from here or from Today.</p>` : ''}
      ${deload ? '<p class="muted small">Deload week: lighter on purpose. This is when you adapt.</p>' : ''}
      ${week.meta?.reentry != null ? `<p class="muted small">Welcome back — a lighter re-entry week (${Math.round(week.meta.reentry * 100)}% volume) to ease you in.</p>` : ''}
    </header>
    ${fresh ? whyHTML : ''}
    <ol class="plan-days">${days.map(d => {
      const ses = d.session;
      return `<li class="plan-day ${d.isToday ? 'is-today' : ''} ${ses ? '' : 'is-rest'}">
        <div class="pd-date"><span class="pd-dow">${DOW_LONG[d.dow].slice(0, 3)}</span><span class="pd-num">${d.date.getDate()}</span></div>
        ${ses ? `<button class="pd-main" data-preview="${esc(ses.id)}" aria-label="Preview ${esc(ses.name)} on ${DOW_LONG[d.dow]}">
            <span class="pd-name">${esc(ses.name)}</span><span class="muted small">~${sessionMinutes(ses)} min${ses.focus?.length ? ` · ${ses.focus.map(esc).join(', ')}` : ''}</span></button>`
          : `<div class="pd-main"><span class="pd-name muted">Rest</span><span class="muted small">Recovery is training</span></div>`}
        <span class="pd-status">${d.done ? `<span class="tick" aria-label="Done">${icon('check', { size: 16 })}</span>` : d.light || d.taiso ? `<span class="tick tick-light" aria-label="Light day: keeps the day streak">${icon('check', { size: 16 })}</span>` : ses ? icon('chevron', { size: 18 }) : ''}</span></li>`;
    }).join('')}</ol>
    ${fresh ? '' : whyHTML}
    <button class="btn btn-ghost btn-block" data-edit>${icon('edit', { size: 18 })} Regenerate / edit preferences</button>
  </div>`;

  root.addEventListener('click', e => {
    const pv = e.target.closest('[data-preview]');
    if (pv) {
      const base = sessionById(week, pv.dataset.preview);
      const today = days.find(d => d.isToday);
      const isToday = today?.session?.id === base.id && !today.done;
      const body = () => { const ses = withOptions(base); return `<p class="muted small">~${sessionMinutes(ses)} min · ${week.phase === 'deload' ? 'deload' : 'build'} week</p>${optionsHTML(base)}${sessionPreviewHTML(ses)}`; };
      openSheet({
        title: base.name,
        html: `<div data-pv>${body()}</div>
          <button class="btn ${isToday ? 'btn-primary' : 'btn-ghost'} btn-block sheet-cta" data-go>${icon('play', { size: 18 })} ${isToday ? 'Start today’s session' : 'Do this session now'}</button>`,
        onMount(el, close) {
          let d = mountAnims(el);
          el.querySelector('[data-go]').addEventListener('click', () => { close(); startWorkout(withOptions(base), { weekIndex: wi, sessionId: base.id }); });
          el.addEventListener('click', ev => { if (ev.target.closest('.pv-name')) close(); });
          el.addEventListener('change', ev => {
            if (!onOptionChange(ev)) return;
            d(); el.querySelector('[data-pv]').innerHTML = body(); d = mountAnims(el);
            el.querySelector(`[data-option="${ev.target.dataset.option}"]`)?.focus({ preventScroll: true });
          });
          return () => d();
        },
      });
    }
    if (e.target.closest('[data-edit]')) beginEdit('hub');
  });
}
