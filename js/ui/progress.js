// Progress tab: streak heatmap, totals, ladders, PBs, history, body weight, weekly volume.
import { FAMILIES, byId, MUSCLES, unavailableReason } from './deps.js';
import { getState, update, toISO, fromISO, weekStart, addDays, todayISO } from '../store.js';
import { esc, icon, openSheet, confirmSheet, exName, muscleName, familyName, ladder, isAvailable, isProgression,
  fmtDate, fmtWeight, kgToLb, lbToKg, plural, toast, weightUnit } from './components.js';
import { getStreak, freezesBanked, isTrainingLog } from './model.js';

const WEEKS = 16;

function heatmap(logs) {
  const mins = new Map();
  for (const l of logs) mins.set(l.date, (mins.get(l.date) || 0) + (l.durationMin || 1));
  const today = new Date();
  const start = addDays(weekStart(today), -7 * (WEEKS - 1));
  const cell = 15, gap = 3, left = 22, top = 16;
  let cells = '', months = '', lastMonth = -1;
  for (let w = 0; w < WEEKS; w++) {
    const colStart = addDays(start, w * 7);
    if (colStart.getMonth() !== lastMonth) {
      lastMonth = colStart.getMonth();
      if (w < WEEKS - 1) months += `<text x="${left + w * (cell + gap)}" y="10" class="hm-lab">${colStart.toLocaleDateString(undefined, { month: 'short' })}</text>`;
    }
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, w * 7 + d);
      if (day > today) continue;
      const iso = toISO(day), m = mins.get(iso) || 0;
      const lvl = m === 0 ? 0 : m < 15 ? 1 : m < 30 ? 2 : m < 45 ? 3 : 4;
      cells += `<rect x="${left + w * (cell + gap)}" y="${top + d * (cell + gap)}" width="${cell}" height="${cell}" rx="3" class="hm hm-${lvl}${iso === todayISO() ? ' hm-today' : ''}"><title>${fmtDate(iso)}: ${m ? `${m} min` : 'no session'}</title></rect>`;
    }
  }
  const dl = ['M', '', 'W', '', 'F', '', 'S'].map((t, i) => t ? `<text x="0" y="${top + i * (cell + gap) + 11}" class="hm-lab">${t}</text>` : '').join('');
  const W = left + WEEKS * (cell + gap), H = top + 7 * (cell + gap);
  return `<svg class="heatmap" viewBox="0 0 ${W} ${H}" role="img" aria-label="Training calendar for the last ${WEEKS} weeks">${months}${dl}${cells}</svg>
    <div class="hm-legend small muted" aria-hidden="true">Less <i class="hm-0"></i><i class="hm-1"></i><i class="hm-2"></i><i class="hm-3"></i><i class="hm-4"></i> More</div>`;
}

function consistency(s) {
  const p = s.profile, start = s.plan?.startDate;
  if (!p || !start) return null;
  const today = new Date();
  let d = addDays(today, -55);
  if (d < fromISO(start)) d = fromISO(start);
  let planned = 0;
  for (; d <= today; d = addDays(d, 1)) if (p.preferredDays.includes(d.getDay())) planned++;
  const from = toISO(addDays(today, -55));
  const done = new Set(s.logs.filter(l => l.date >= from && isTrainingLog(l)).map(l => l.date)).size;
  return planned ? Math.min(100, Math.round((done / planned) * 100)) : null;
}

function weeklyVolume(logs) {
  const from = toISO(weekStart()), vol = {};
  for (const l of logs) if (l.date >= from) for (const it of l.items) {
    const e = byId[it.exerciseId]; if (!e) continue;
    const n = it.sets.length;
    e.muscles.primary.forEach(m => { vol[m] = (vol[m] || 0) + n; });
    e.muscles.secondary.forEach(m => { vol[m] = (vol[m] || 0) + n * 0.5; });
  }
  const rows = Object.entries(vol).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return '<p class="muted small">No sets logged yet this week.</p>';
  const max = rows[0][1];
  return `<ul class="bars">${rows.map(([m, v]) => `<li><span class="bar-lab">${esc(muscleName(m))}</span>
    <span class="bar-track"><span class="bar-fill region-${MUSCLES[m]?.region || 'x'}" style="width:${Math.max(4, (v / max) * 100)}%"></span></span><span class="bar-val">${Math.round(v * 10) / 10}</span></li>`).join('')}</ul>
    <p class="small muted">Sets this week. Secondary muscles count as half a set.</p>`;
}

function ladders(s) {
  const fams = Object.keys(FAMILIES).filter(isProgression);
  return `<ul class="ladders">${fams.map(f => {
    const lad = ladder(f);
    if (!lad.length) return '';
    const cur = s.levels[f];
    const ci = lad.findIndex(e => e.id === cur);
    return `<li class="ladder"><details><summary><span class="ld-head"><span class="ld-fam">${esc(familyName(f))}</span>
      <span class="ld-cur">${ci >= 0 ? esc(lad[ci].name) : '<span class="muted">not in plan</span>'}</span></span>
      <span class="ld-dots" style="--pf:${ci > 0 ? (ci / (lad.length - 1)).toFixed(3) : 0}" role="img" aria-label="${ci >= 0 ? `Level ${ci + 1} of ${lad.length}` : 'Not started'}">${lad.map((e, i) => `<i class="${i < ci ? 'past' : i === ci ? 'cur' : ''}" title="${esc(e.name)}"></i>`).join('')}</span></summary>
      <ol class="ld-list">${lad.map((e, i) => `<li class="${i === ci ? 'cur' : i < ci ? 'past' : ''} ${isAvailable(e, s.profile) ? '' : 'na'}"><a href="#/library/${e.id}">${esc(e.name)}</a>${i === ci ? ' <span class="badge badge-accent">now</span>' : ''}${isAvailable(e, s.profile) ? '' : ` <span class="small muted">${esc(unavailableReason(e, s.profile)?.label || 'not for you now')}</span>`}</li>`).join('')}</ol></details></li>`;
  }).join('')}</ul>`;
}

function personalBests(logs) {
  const pb = new Map();
  const PB_CATS = new Set(['strength', 'core', 'skill']); // warm-ups, mobility and conditioning aren't PBs
  for (const l of logs) for (const it of l.items) {
    if (!PB_CATS.has(byId[it.exerciseId]?.category)) continue;
    for (const st of it.sets) {
    const val = st.sec ?? st.reps; if (val == null) continue;
    const k = it.exerciseId, cur = pb.get(k);
    if (!cur || val > cur.val) pb.set(k, { val, unit: st.sec != null ? 's' : 'reps', date: l.date });
    }
  }
  const rows = [...pb.entries()].sort((a, b) => b[1].date.localeCompare(a[1].date)).slice(0, 12);
  if (!rows.length) return '<p class="muted small">Your personal bests will appear here.</p>';
  return `<ul class="list">${rows.map(([id, r]) => `<li class="list-item"><a href="#/library/${id}">${esc(exName(id))}</a><span class="pb-val" aria-label="Best set ${r.val} ${r.unit === 's' ? 'seconds' : 'reps'}">${r.val}<small> ${r.unit}</small></span><span class="small muted">${fmtDate(r.date, { day: 'numeric', month: 'short' })}</span></li>`).join('')}</ul>`;
}

function history(logs, all) {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
  if (!sorted.length) return '<p class="muted small">No sessions yet. Your first one is waiting on the Today tab.</p>';
  const shown = all ? sorted : sorted.slice(0, 8);
  return `<ul class="list history">${shown.map(l => `<li><button class="list-item list-btn" data-log="${esc(l.id)}">
    <span><span class="opt-name">${esc(l.name || `Session ${l.sessionId}`)}</span><span class="small muted">${fmtDate(l.date)} · ${l.durationMin || '?'} min · effort ${l.feel ?? '–'}/5</span></span>${icon('chevron', { size: 18 })}</button></li>`).join('')}</ul>
    ${sorted.length > 8 && !all ? `<button class="btn btn-quiet btn-block" data-all>Show all ${sorted.length}</button>` : ''}`;
}

function weightChart(bw, units) {
  const pts = [...bw].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  if (pts.length < 2) return `<p class="muted small">${pts.length ? 'Add another entry to see a trend.' : 'Log your weight now and then to see a trend. Optional.'}</p>`;
  const lb = weightUnit() === 'lb';
  const conv = kg => (lb ? kgToLb(kg) : kg);
  const vals = pts.map(p => conv(p.kg));
  const lo = Math.floor(Math.min(...vals) - 1), hi = Math.ceil(Math.max(...vals) + 1);
  const W = 320, H = 130, px = 34, py = 12;
  const t0 = fromISO(pts[0].date).getTime(), t1 = fromISO(pts[pts.length - 1].date).getTime() || t0 + 1;
  const x = d => px + ((fromISO(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - px - 10);
  const y = v => py + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - py * 2);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(conv(p.kg)).toFixed(1)}`).join(' ');
  return `<svg class="wchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Body weight trend from ${vals[0].toFixed(1)} to ${vals[vals.length - 1].toFixed(1)} ${lb ? 'lb' : 'kg'}">
    <line x1="${px}" x2="${W - 10}" y1="${y(hi)}" y2="${y(hi)}" class="grid"/><line x1="${px}" x2="${W - 10}" y1="${y(lo)}" y2="${y(lo)}" class="grid"/>
    <text x="0" y="${y(hi) + 4}" class="hm-lab">${hi}</text><text x="0" y="${y(lo) + 4}" class="hm-lab">${lo}</text>
    <path d="${path}" class="wline"/>${pts.map(p => `<circle cx="${x(p.date).toFixed(1)}" cy="${y(conv(p.kg)).toFixed(1)}" r="3" class="wdot"><title>${fmtDate(p.date)}: ${fmtWeight(p.kg, units)}</title></circle>`).join('')}</svg>`;
}

function logDetailHTML(l) {
  return `<p class="muted">${fmtDate(l.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${l.durationMin} min · effort ${l.feel ?? '–'}/5</p>
    <ul class="list">${l.items.map(it => `<li class="list-item detail-item"><span><a href="#/library/${it.exerciseId}" data-close>${esc(exName(it.exerciseId))}</a>
      <span class="small muted">${it.sets.map(s => (s.sec != null ? `${s.sec}s` : `${s.reps}`)).join(' · ')}${it.pain != null ? ` · pain ${it.pain}/10` : ''}</span></span>
      <span class="badge ${it.rating === 'easy' ? 'badge-ok' : it.rating === 'hard' ? 'badge-accent' : ''}">${esc(it.rating || '')}</span></li>`).join('')}</ul>
    <button class="btn btn-quiet btn-block danger-text" data-del>${icon('trash', { size: 18 })} Delete this session</button>`;
}

export function render(root, ctx) {
  let showAll = false;
  const draw = () => {
    const s = getState();
    const st = getStreak();
    const totalMin = s.logs.reduce((a, l) => a + (l.durationMin || 0), 0);
    const cons = consistency(s);
    const plan = !!s.profile;   // Quick-only users (no plan): day streak only, no weekly target or freezes
    const units = s.settings.units, wu = weightUnit();
    root.innerHTML = `
    <div class="screen progress">
      <header class="screen-head"><p class="eyebrow">進歩 · Progress</p><h1 class="title">Your forging</h1></header>
      <section class="card"><div class="stat-grid">
        ${plan ? `<div class="stat stat-hero"><span class="stat-num">${st.weekly?.current ?? 0}</span><span class="stat-lab">week streak<br><span class="muted">best ${st.weekly?.best ?? 0}</span></span></div>` : ''}
        <div class="stat ${plan ? '' : 'stat-hero stat-wide'}"><span class="stat-num">${st.current ?? 0}</span><span class="stat-lab">day streak<br><span class="muted">best ${st.best ?? 0}</span></span></div>
        <div class="stat"><span class="stat-num">${s.logs.length}</span><span class="stat-lab">sessions</span></div>
        <div class="stat"><span class="stat-num">${totalMin >= 600 ? `${Math.round(totalMin / 60)}<small>h</small>` : totalMin}</span><span class="stat-lab">${totalMin >= 600 ? 'hours' : 'minutes'}</span></div>
      </div>
      ${plan ? `<p class="small muted stat-foot">${icon('snow', { size: 14 })}<span>${freezesBanked(st)}/2 freezes banked${cons != null ? ` · ${cons}% consistency over 8 weeks` : ''}</span></p>` : ''}</section>
      <section class="section"><h2 class="section-title">Last ${WEEKS} weeks</h2><div class="card hm-card">${heatmap(s.logs)}</div></section>
      <section class="section"><h2 class="section-title">This week’s volume</h2><div class="card">${weeklyVolume(s.logs)}</div></section>
      <section class="section"><h2 class="section-title">Progressions</h2><div class="card card-flush">${ladders(s)}</div></section>
      <section class="section"><h2 class="section-title">Personal bests</h2><div class="card card-flush">${personalBests(s.logs)}</div></section>
      <section class="section"><h2 class="section-title">History</h2><div class="card card-flush">${history(s.logs, showAll)}</div></section>
      <section class="section"><h2 class="section-title">Body weight</h2><div class="card">
        ${weightChart(s.bodyweights, units)}
        <form class="bw-form" data-bw novalidate>
          <label class="num-field"><span class="sr-only">Weight</span><input type="text" inputmode="decimal" name="w" placeholder="${wu === 'lb' ? '165' : '75.0'}" aria-label="Weight in ${wu === 'lb' ? 'pounds' : 'kilograms'}" maxlength="5"><span class="unit">${wu}</span></label>
          <input type="date" name="d" class="input" value="${todayISO()}" max="${todayISO()}" aria-label="Date">
          <button class="btn btn-primary btn-sm" type="submit">${icon('plus', { size: 16 })} Add</button></form>
        ${s.bodyweights.length ? `<ul class="list bw-list">${[...s.bodyweights].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(b => `<li class="list-item"><span>${fmtDate(b.date)}</span><span>${fmtWeight(b.kg, units)}</span>
          <button class="icon-btn icon-btn-sm" data-bwdel="${b.date}" aria-label="Delete entry for ${fmtDate(b.date)}">${icon('trash', { size: 16 })}</button></li>`).join('')}</ul>` : ''}
      </div></section>
    </div>`;
  };
  draw();

  root.addEventListener('click', async e => {
    if (e.target.closest('[data-all]')) { showAll = true; draw(); return; }
    const del = e.target.closest('[data-bwdel]');
    if (del) { update(s => { s.bodyweights = s.bodyweights.filter(b => b.date !== del.dataset.bwdel); }); draw(); return; }
    const lb = e.target.closest('[data-log]');
    if (lb) {
      const l = getState().logs.find(x => String(x.id) === lb.dataset.log); if (!l) return;
      openSheet({
        title: l.name || 'Session', html: logDetailHTML(l),
        onMount(el, close) {
          el.querySelector('[data-del]').addEventListener('click', async () => {
            close();
            if (await confirmSheet({ title: 'Delete session?', body: 'This removes it from your history and streaks. Progression levels are not changed.', ok: 'Delete', danger: true })) {
              update(s => { s.logs = s.logs.filter(x => x.id !== l.id); }); draw(); toast('Session deleted');
            }
          });
        },
      });
    }
  });
  root.addEventListener('submit', e => {
    const f = e.target.closest('[data-bw]'); if (!f) return;
    e.preventDefault();
    const units = getState().settings.units;
    const v = parseFloat(f.w.value.replace(',', '.'));
    const kg = weightUnit(units) === 'lb' ? lbToKg(v) : v;
    if (!Number.isFinite(kg) || kg < 25 || kg > 350) { toast('Enter a realistic weight'); f.w.focus(); return; }
    const date = /^\d{4}-\d{2}-\d{2}$/.test(f.d.value) ? f.d.value : todayISO();
    update(s => {
      s.bodyweights = s.bodyweights.filter(b => b.date !== date).concat({ date, kg: Math.round(kg * 100) / 100 });
      const latest = s.bodyweights.reduce((a, b) => (b.date > a.date ? b : a));
      if (s.profile) s.profile.weightKg = Math.round(latest.kg * 10) / 10; // keep the profile current for the planner
    });
    draw(); toast('Weight logged');
  });
}
