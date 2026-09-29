// Today (home) tab.
import { getState, getActiveWorkout, clearActiveWorkout, getCurrentWeekIndex, todayISO } from '../store.js';
import { inviteHTML, optionsHTML, onOptionChange } from './plan.js';
import { esc, icon, seal, mountAnims, DOW_LONG, plural, confirmSheet, exName, fmtDate, nativeNameHTML } from './components.js';
import { ALL_BY_ID, MORNING_TAISO_SESSION_ID, MOMENTS, isShortMomentLog } from './deps.js';
import { getWeek, sessionForDow, sessionMinutes, getStreak, weekDays, sessionItems, mobilityFlow, startWorkout,
  weeklyTarget, sessionsThisWeek, freezesBanked, isFirstTimer, isTrainingLog, withOptions, morningTaiso, flowMinutes } from './model.js';

/** v1.2 Morning Taisō card (Me → Morning Taisō). Absent unless switched on AND its tradition is visible. */
function taisoCard(todayLogs) {
  const mt = morningTaiso();
  if (!mt) return { html: '', session: null };
  const done = todayLogs.some(l => l.sessionId === MORNING_TAISO_SESSION_ID);
  const ex = ALL_BY_ID[mt.blocks[0].items[0].exerciseId];
  return { session: mt, html: `<section class="card taiso-card" aria-label="Morning Taisō">
    <div class="card-top"><div><p class="eyebrow">Optional · ${done ? 'done today' : 'any morning'}</p>
      ${ex?.nativeName ? nativeNameHTML(ex.nativeName, { cls: 'taiso-native' }) : ''}<h2 class="card-title">${esc(mt.name)}</h2></div>
      <span class="badge">${icon('timer', { size: 14 })} ~${flowMinutes(mt.blocks)} min</span></div>
    <p class="muted small">${mt.blocks[0].items[0].notes ? `${esc(mt.blocks[0].items[0].notes)} ` : ''}Keeps your day streak going; doesn’t count towards your weekly sessions. No music: Kitaeru counts for you.</p>
    <button class="btn ${done ? 'btn-quiet' : 'btn-ghost'} btn-block" data-taiso>${done ? `${icon('check', { size: 18 })} Done · go again` : `${icon('play', { size: 18 })} Start Morning Taisō`}</button></section>` };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return ['こんばんは', 'Late night'];
  if (h < 12) return ['おはよう', 'Good morning'];
  if (h < 18) return ['こんにちは', 'Good afternoon'];
  return ['こんばんは', 'Good evening'];
}

export function streakCard(streak) {
  const target = weeklyTarget();
  const done = Math.min(sessionsThisWeek(), 7);
  const wk = streak.weekly?.current ?? 0;
  const fz = freezesBanked(streak);
  const dots = Array.from({ length: target }, (_, i) => `<span class="dot ${i < done ? 'on' : ''}"></span>`).join('');
  return `<section class="card streak-card" aria-label="Streaks">
    <div class="streak-main">
      <div class="streak-seal ${wk > 0 ? 'lit' : ''}" aria-hidden="true">${icon('flame', { size: 30 })}</div>
      <div><div class="streak-num"><span class="big">${wk}</span> ${wk === 1 ? 'week' : 'weeks'}</div>
        <div class="muted small">streak · ${Math.min(done, target)}/${target} sessions this week</div>
        <div class="week-dots" aria-label="${done} of ${target} sessions this week">${dots}</div></div>
    </div>
    <div class="streak-side">
      <div class="mini-stat" title="Consecutive planned training days completed"><span class="mini-num">${streak.current ?? 0}</span><span class="mini-lab">day streak</span></div>
      <div class="mini-stat" title="Freezes cover one missed day or week; earned every two kept weeks"><span class="mini-num">${icon('snow', { size: 15 })} ${fz}<small>/2</small></span><span class="mini-lab">freezes</span></div>
    </div></section>`;
}

/** What a light day's logs were: "Desk reset", "Morning Taisō", or both. */
function lightNames(logs) {
  return [...new Set(logs.filter(l => l.sessionId === MORNING_TAISO_SESSION_ID || isShortMomentLog(l))
    .map(l => (l.sessionId === MORNING_TAISO_SESSION_ID ? 'Morning Taisō' : MOMENTS[l.request.moment]?.label || l.name)))].join(' and ');
}

export function weekStrip(days) {
  // A light day (Morning Taisō or a moment of 10 min or less, v1.2) keeps the day streak but isn't a session: a lighter mark.
  const anyLight = days.some(d => !d.done && (d.light || d.taiso));
  return `<ol class="week-strip" aria-label="This week">${days.map(d => {
    const lightDay = !d.done && (d.light || d.taiso);
    const state = d.done ? 'done' : d.session ? (d.isPast ? (d.beforePlan ? 'pre' : 'missed') : 'planned') : 'rest';
    const base = state === 'done' ? 'done' : state === 'planned' ? `${d.session.name} planned` : state === 'missed' ? 'missed' : state === 'pre' ? 'before your plan started' : 'rest';
    const label = `${DOW_LONG[d.dow]}: ${lightDay ? `${lightNames(d.logs)} done, keeps the day streak${state === 'planned' ? `; ${d.session.name} still planned` : ''}` : base}`;
    return `<li class="ws-day ws-${state} ${lightDay ? 'ws-light' : ''} ${d.isToday ? 'ws-today' : ''}" aria-label="${esc(label)}" ${d.isToday ? 'aria-current="date"' : ''}>
      <span class="ws-dow">${DOW_LONG[d.dow].slice(0, 1)}</span><span class="ws-mark">${state === 'done' || lightDay ? icon('check', { size: 14 }) : ''}</span><span class="ws-date">${d.date.getDate()}</span></li>`;
  }).join('')}</ol>
  <div class="ws-legend small muted" aria-hidden="true"><span><i class="lg lg-done"></i>done</span>${anyLight ? '<span><i class="lg lg-light"></i>light</span>' : ''}<span><i class="lg lg-planned"></i>planned</span><span><i class="lg lg-rest"></i>rest</span></div>`;
}
/** Today's light logs, said plainly under the week strip. */
function lightTodayHTML(todayLogs) {
  const names = lightNames(todayLogs.filter(isShortMomentLog));
  return names ? `<p class="small muted light-note">${icon('check', { size: 14 })} ${esc(names)} today: keeps your day streak going. Moments of 10 min or less don’t count towards your weekly sessions.</p>` : '';
}

function thumbs(session, n = 5) {
  const items = sessionItems(session).filter(i => !['warmup', 'cooldown'].includes(i.blockKind));
  const shown = items.slice(0, n);
  return `<ul class="thumbs" aria-label="Exercises">${shown.map(i => `<li class="thumb" title="${esc(exName(i.exerciseId))}"><div data-anim="${i.exerciseId}" data-size="60"></div><span class="sr-only">${esc(exName(i.exerciseId))}</span></li>`).join('')}
    ${items.length > n ? `<li class="thumb thumb-more">+${items.length - n}</li>` : ''}</ul>`;
}

function lastQuick(last) {
  const m = last.mode === 'moment' && MOMENTS[last.moment];
  if (m) return `${m.minutes.includes(last.momentMinutes) ? last.momentMinutes : m.def} min · ${esc(m.label)}`;
  return `${last.minutes} min · ${last.mode === 'goal' ? esc(last.goal) : last.muscles?.length ? 'targeted muscles' : esc(last.focus || 'full body')}`;
}

export function quickCard(compact = false) {
  const last = getState().settings.quick;
  return `<a class="card quick-card ${compact ? 'compact' : ''}" href="#/quick">
    <span class="quick-mark" aria-hidden="true">即</span>
    <span class="quick-text"><span class="opt-name">Quick workout</span><span class="muted small">${last ? `Last time: ${lastQuick(last)}` : 'Short on time? Pick minutes and a goal, an area or a moment. No setup.'}</span></span>
    ${icon('chevron', { size: 20 })}</a>`;
}

function renderLite(root, ctx) {
  const s = getState();
  const [jp, en] = greeting();
  const recent = [...s.logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const taiso = taisoCard(s.logs.filter(l => l.date === todayISO()));
  root.innerHTML = `<div class="screen today">
    <header class="screen-head"><p class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <h1 class="title"><span class="jp" lang="ja">${jp}</span> ${en}</h1></header>
    ${quickCard()}
    ${taiso.html}
    ${s.logs.length ? streakCard(getStreak()) : ''}
    ${recent.length ? `<section class="section"><h2 class="section-title">Recent</h2><ul class="list card card-flush">${recent.map(l => `<li class="list-item"><span><span class="opt-name">${esc(l.name || 'Quick workout')}</span><span class="small muted">${fmtDate(l.date)} · ${l.durationMin} min</span></span><span class="tick" aria-label="Done">${icon('check', { size: 16 })}</span></li>`).join('')}</ul></section>` : ''}
    ${inviteHTML('Ready for a real plan?')}
  </div>`;
  root.addEventListener('click', e => { if (e.target.closest('[data-taiso]') && taiso.session) startWorkout(taiso.session, { sessionId: MORNING_TAISO_SESSION_ID }); });
}

export function render(root, ctx) {
  const s = getState();
  const p = s.profile;
  if (!p) return renderLite(root, ctx);
  const week = getWeek();
  const now = new Date();
  const planStart = s.plan?.startDate || '';
  const started = todayISO() >= planStart;
  const session = started ? withOptions(sessionForDow(week, now.getDay())) : null;
  const first = isFirstTimer();
  const early = planStart ? s.logs.filter(l => isTrainingLog(l) && l.date < planStart && l.date >= (s.plan?.createdOn || '')) : [];
  const firstSession = first && !session ? withOptions(week?.sessions?.[0] || null) : null;
  const todayLogs = s.logs.filter(l => l.date === todayISO());
  const doneMain = todayLogs.find(isTrainingLog); // Morning Taisō and rest-day mobility are not "the" session
  const taiso = taisoCard(todayLogs);
  const streak = getStreak();
  const active = getActiveWorkout();
  const [jp, en] = greeting();
  const phase = week?.phase === 'deload' ? 'Deload week' : 'Build week';

  let todayCard;
  if (doneMain) {
    todayCard = `<section class="card today-card done">
      <div class="done-row">${seal('済', { size: 56, cls: 'stamp-static' })}<div>
      <p class="eyebrow">Forged today</p><h2 class="card-title">${esc(doneMain.name || 'Session')} complete</h2>
      <p class="muted small">${plural(doneMain.durationMin || 0, 'minute')} · ${plural(doneMain.items.filter(i => i.sets.length).length, 'exercise')}. Rest well — recovery is when you adapt.</p></div></div></section>`;
  } else if (firstSession) {
    const mins = sessionMinutes(firstSession);
    const flow = mobilityFlow(p);
    todayCard = `<section class="card today-card first">
      <div class="card-top"><p class="eyebrow">Your first session</p><span class="badge">${icon('timer', { size: 14 })} ~${mins} min</span></div>
      <h2 class="card-title">${esc(firstSession.name)}</h2>
      <p class="muted small">${started ? 'Today is a planned rest day, but there’s no need to wait for your first session.' : `Your plan’s first week begins ${fmtDate(planStart, { weekday: 'long', day: 'numeric', month: 'short' })}. No need to wait: start your first session today.`}</p>
      ${thumbs(firstSession)}
      ${optionsHTML(firstSession)}
      <button class="btn btn-primary btn-block" data-first>${icon('play', { size: 18 })} Start your first session</button>
      ${flow.blocks[0].items.length ? `<button class="btn btn-quiet btn-block" data-mobility>Or a gentle ${flow.estMinutes}-minute mobility flow</button>` : ''}</section>`;
  } else if (session) {
    const mins = sessionMinutes(session);
    todayCard = `<section class="card today-card">
      <div class="card-top"><p class="eyebrow">${first ? 'Your first session' : `Today · ${phase} ${getCurrentWeekIndex() + 1}`}</p><span class="badge">${icon('timer', { size: 14 })} ~${mins} min</span></div>
      <h2 class="card-title">${esc(session.name)}</h2>
      ${session.focus?.length ? `<p class="muted small focus">${session.focus.map(esc).join(' · ')}</p>` : ''}
      ${thumbs(session)}
      ${optionsHTML(session)}
      <button class="btn btn-primary btn-block" data-start>${icon('play', { size: 18 })} ${active && active.sessionId === session.id ? 'Resume' : 'Start'}</button>
      ${week.phase === 'deload' ? '<p class="small muted center">Deload week: lighter on purpose. This is when you adapt.</p>' : ''}</section>`;
  } else {
    const flow = mobilityFlow(p);
    const didFlow = todayLogs.some(l => l.sessionId === 'M');
    todayCard = `<section class="card today-card rest">
      <p class="eyebrow">Today · Rest day</p><h2 class="card-title">Recovery is training</h2>
      <p class="muted">Rest day: recovery is part of the plan. Your muscles rebuild stronger between sessions, so enjoy it.</p>
      ${flow.blocks[0].items.length ? `<div class="flow card-inset"><div class="card-top"><div><p class="opt-name">${didFlow ? 'Mobility done ✓' : 'Optional: gentle mobility'}</p><p class="muted small">${flow.blocks[0].items.length} easy drills · ~${flow.estMinutes} min · doesn’t affect your streak</p></div></div>
        ${thumbs(flow, 6)}<button class="btn btn-ghost btn-block" data-mobility>${icon('play', { size: 18 })} ${didFlow ? 'Flow again' : 'Start mobility flow'}</button></div>` : ''}</section>`;
  }

  root.innerHTML = `
  <div class="screen today">
    <header class="screen-head"><p class="eyebrow">${now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <h1 class="title"><span class="jp" lang="ja">${jp}</span> ${en}${p.name ? `, ${esc(p.name)}` : ''}</h1></header>
    ${active ? `<section class="card resume-card" role="region" aria-label="Workout in progress"><div><p class="opt-name">Workout in progress</p><p class="muted small">${esc(active.session.name)} · exercise ${Math.min(active.idx + 1, active.items.length)} of ${active.items.length}</p></div>
      <div class="btn-row"><button class="btn btn-quiet btn-sm" data-discard>Discard</button><a class="btn btn-primary btn-sm" href="#/workout">Resume</a></div></section>` : ''}
    ${todayCard}
    ${taiso.html}
    ${quickCard(true)}
    ${streakCard(streak)}
    <section class="section"><h2 class="section-title">${planStart > todayISO() ? 'Your first week' : 'This week'}</h2>${weekStrip(weekDays(now))}${lightTodayHTML(todayLogs)}
      ${early.length ? `<p class="small early-note">${icon('check', { size: 14 })} Early start: ${early.length === 1 ? `${esc(early[0].name || 'a session')} on ${fmtDate(early[0].date, { weekday: 'long' })}` : `${early.length} sessions`} before your plan began.</p>` : ''}</section>
    <details class="card help"><summary>${icon('info', { size: 18 })} When to stop</summary>
      <p class="small">Stop and seek medical advice if you feel chest pain or pressure, unusual breathlessness, dizziness or fainting, palpitations, a sudden severe headache, or sharp joint pain.</p></details>
  </div>`;

  const destroy = mountAnims(root);
  root.addEventListener('click', async e => {
    if (e.target.closest('[data-start]')) startWorkout(session, { weekIndex: getCurrentWeekIndex() });
    if (e.target.closest('[data-first]')) startWorkout(firstSession, { weekIndex: getCurrentWeekIndex() });
    if (e.target.closest('[data-mobility]')) startWorkout(mobilityFlow(p), { sessionId: 'M' });
    if (e.target.closest('[data-taiso]') && taiso.session) startWorkout(taiso.session, { sessionId: MORNING_TAISO_SESSION_ID });
    if (e.target.closest('[data-discard]')) {
      if (await confirmSheet({ title: 'Discard workout?', body: 'Sets logged in this workout will be lost.', ok: 'Discard', danger: true })) { clearActiveWorkout(); ctx.rerender(); }
    }
  });
  root.addEventListener('change', e => { if (onOptionChange(e)) ctx.rerender(); });
  return destroy;
}
