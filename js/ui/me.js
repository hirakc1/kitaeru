// Me tab: profile, settings, data export/import/reset, about.
import { getState, update, exportJSON, validateImport, replaceState, resetAll, todayISO } from '../store.js';
import { esc, icon, seal, openSheet, confirmSheet, toast, downloadFile, fmtHeight, fmtWeight, DOW_SHORT, DOW_ORDER } from './components.js';
import { goalName, levelsFor, morningTaisoAvailable } from './model.js';
import { beginEdit, DISCLAIMER } from './onboarding.js';
import { VERSION, versionLabel } from '../version.js';
import { inviteHTML } from './plan.js';

const EXP = { new: 'New to this', some: 'Some experience', regular: 'Trains regularly', advanced: 'Advanced' };
// Me -> Animation: the figure (human body, default; or the classic skeleton plate), which body, and the skeleton inside
// the see-through body. The body defaults to the profile's sex (female when unspecified) until chosen here.
const animSeg = (key, label, val, opts) => `<div class="seg seg-sm" role="group" aria-label="${esc(label)}">${opts.map(([v, l]) => `<button type="button" class="chip" data-set="${key}" data-val="${v}" aria-pressed="${val === v}">${l}</button>`).join('')}</div>`;
function animFigureHTML(st, p) {
  const human = st.animFigure !== 'classic';
  const body = st.animBody === 'm' || st.animBody === 'f' ? st.animBody : p?.sex === 'male' ? 'm' : 'f';
  return `<div class="set-row"><span>Figure<br><span class="small muted">${human ? 'A 3D body in sportswear. Devices that can’t show 3D get the classic figure.' : 'The anatomical drawing of bones and muscles'}</span></span>${animSeg('animFigure', 'Figure', human ? 'human' : 'classic', [['human', 'Human body'], ['classic', 'Classic skeleton']])}</div>
        ${human ? `<div class="set-row"><span>Body</span>${animSeg('animBody', 'Body', body, [['f', 'Female'], ['m', 'Male']])}</div>
        <label class="set-row"><span>Skeleton inside<br><span class="small muted">Show the bones inside the see-through body</span></span><input type="checkbox" class="switch" data-anim-set="animSkeleton" ${st.animSkeleton === true ? 'checked' : ''}></label>` : ''}`;
}
const seg = (key, val, opts) => `<div class="seg seg-sm" role="group" aria-label="${esc(key)}">${opts.map(([v, l]) => `<button type="button" class="chip" data-set="${key}" data-val="${v}" aria-pressed="${val === v}">${l}</button>`).join('')}</div>`;

export function render(root, ctx) {
  const draw = () => {
    const s = getState(), p = s.profile, st = s.settings;
    root.innerHTML = `
    <div class="screen me">
      <header class="screen-head"><p class="eyebrow">自分 · Me</p><h1 class="title">${p?.name ? esc(p.name) : 'You'}</h1></header>
      ${p ? `<section class="card profile-card">
        <dl class="kv">
          <div><dt>Goals</dt><dd>${p.goals.map(g => (g === p.primaryGoal ? `<strong>${goalName(g)}</strong>` : goalName(g))).join(', ')}</dd></div>
          <div><dt>Schedule</dt><dd>${p.daysPerWeek}× · ${p.minutesPerSession} min · ${DOW_ORDER.filter(d => p.preferredDays.includes(d)).map(d => DOW_SHORT[d]).join(' ')}</dd></div>
          <div><dt>Body</dt><dd>${p.age} · ${fmtHeight(p.heightCm)} · ${fmtWeight(p.weightKg)}</dd></div>
          <div><dt>Level</dt><dd>${EXP[p.experience] || '—'}</dd></div>
          <div><dt>Kit</dt><dd>${p.equipment.length} item${p.equipment.length === 1 ? '' : 's'} · ${p.space} space${p.lowImpact ? ' · low impact' : ''}</dd></div>
        </dl>
        <button class="btn btn-ghost btn-block" data-edit>${icon('edit', { size: 18 })} Edit profile & plan</button>
      </section>` : inviteHTML('No plan yet')}

      <section class="section"><h2 class="section-title">Settings</h2><div class="card settings">
        <div class="set-row"><span>Units</span>${seg('units', st.units, [['metric', 'Metric'], ['imperial', 'Imperial']])}</div>
        <div class="set-row"><span>Theme</span>${seg('theme', st.theme, [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']])}</div>
        <label class="set-row"><span>Sound & vibration<br><span class="small muted">Rest-timer beeps and haptics</span></span><input type="checkbox" class="switch" data-sound ${st.sound ? 'checked' : ''}></label>
        ${morningTaisoAvailable() ? `<label class="set-row"><span>Morning Taisō<br><span class="small muted">A 3-minute routine on Today. Keeps your day streak going; doesn’t count towards your weekly sessions.</span></span><input type="checkbox" class="switch" data-taiso ${st.morningTaiso ? 'checked' : ''}></label>` : ''}
        <div class="set-row"><span class="small muted">Animation</span></div>
        ${animFigureHTML(st, p)}
        <div class="set-row"><span class="small muted">Animation extras</span></div>
        <label class="set-row"><span>Breath guide<br><span class="small muted">Breathing ring on holds, breathing and flows</span></span><input type="checkbox" class="switch" data-anim-set="animBreath" ${st.animBreath !== false ? 'checked' : ''}></label>
        <label class="set-row"><span>Motion trail<br><span class="small muted">Movement path in the library and workouts</span></span><input type="checkbox" class="switch" data-anim-set="animTrail" ${st.animTrail !== false ? 'checked' : ''}></label>
      </div></section>

      <section class="section"><h2 class="section-title">Your data</h2><div class="card">
        <p class="small muted">Everything lives only on this device. Export a backup now and then — especially before clearing your browser.</p>
        <div class="stack">
          <button class="btn btn-ghost btn-block" data-export>${icon('download', { size: 18 })} Export data (JSON)</button>
          <label class="btn btn-ghost btn-block file-btn">${icon('upload', { size: 18 })} Import data<input type="file" accept="application/json,.json" data-import class="sr-only"></label>
          ${p ? '<button class="btn btn-quiet btn-block" data-relevel>Reset progression levels</button>' : ''}
          <button class="btn btn-quiet btn-block danger-text" data-reset>${icon('trash', { size: 18 })} Reset all data</button>
        </div></div></section>

      <section class="section about"><h2 class="section-title">About</h2><div class="card">
        <div class="about-head">${seal('鍛える', { size: 64 })}<div><p class="opt-name">Kitaeru 鍛える</p><p class="small muted">“To forge” — body and mind, a little every day.</p></div></div>
        <p>Movement disciplines from around the world, brought together to strengthen body and mind.</p>
        <p><strong>Kitaeru is free forever.</strong> No account, no ads, no tracking. Your data never leaves your phone.</p>
        <details class="disclaimer"><summary>Health disclaimer</summary><p class="small">${esc(DISCLAIMER)}</p></details>
        <p><a class="btn btn-quiet" href="#/terms">Terms of use and safety</a></p>
        <p class="small muted">Programming follows published evidence on progressive calisthenics, deloads and habit formation.</p>
        <details class="disclaimer"><summary>Motion credits</summary><p class="small">Some human-body animations are real motion capture.
          The Surya Namaskar positions and the tree pose use data obtained from mocap.cs.cmu.edu; the database was created with funding from NSF EIA-0196217.
          The squat, jumping jack, marching and breath-paced walk use HDM05 (M. Müller, T. Röder, M. Clausen, B. Eberhardt, B. Krüger, A. Weber, Universität Bonn, 2007);
          those four motion files are adapted by Kitaeru and shared under <a href="https://creativecommons.org/licenses/by-sa/3.0/" rel="noopener" target="_blank">CC BY-SA 3.0</a>.</p></details>
        <div class="version-row"><p class="small">Version <strong>${esc(versionLabel())}</strong> <span class="muted">(${esc(VERSION)})</span></p>
          <button class="btn btn-quiet" data-update-check>Check for updates</button></div>
        <p class="small muted" data-update-msg aria-live="polite"></p>
      </div></section>
    </div>`;
  };
  draw();

  root.addEventListener('click', async e => {
    const b = e.target.closest('[data-set]');
    if (b) {
      const { set: k, val } = b.dataset;
      update(s => { s.settings[k] = val; if (k === 'units' && s.profile) s.profile.units = val; });
      draw(); root.querySelector(`[data-set="${k}"][data-val="${val}"]`)?.focus();
      return;
    }
    if (e.target.closest('[data-edit]')) { beginEdit('hub'); return; }
    if (e.target.closest('[data-export]')) { downloadFile(`kitaeru-backup-${todayISO()}.json`, exportJSON()); toast('Backup downloaded'); return; }
    if (e.target.closest('[data-relevel]')) {
      if (await confirmSheet({ title: 'Reset progression levels?', body: 'Every exercise family goes back to the recommended starting level for your profile. History and streaks are kept.', ok: 'Reset levels' })) {
        update(s => { s.levels = levelsFor(s.profile, {}, true); }); toast('Levels reset');
      }
      return;
    }
    if (e.target.closest('[data-update-check]')) { checkForUpdate(root); return; }
    if (e.target.closest('[data-reset]')) resetSheet(ctx);
  });
  root.addEventListener('change', async e => {
    if (e.target.matches('[data-sound]')) { update(s => { s.settings.sound = e.target.checked; }); return; }
    if (e.target.matches('[data-taiso]')) { update(s => { s.settings.morningTaiso = e.target.checked; }); toast(e.target.checked ? 'Morning Taisō is on your Today screen' : 'Morning Taisō switched off'); return; }
    if (e.target.matches('[data-anim-set]')) { const k = e.target.dataset.animSet; update(s => { s.settings[k] = e.target.checked; }); return; }
    if (e.target.matches('[data-import]')) {
      const file = e.target.files[0]; e.target.value = '';
      if (!file) return;
      if (file.size > 5e6) { toast('That file is too large to be a Kitaeru backup'); return; }
      let obj;
      try { obj = JSON.parse(await file.text()); } catch { toast('Could not read that file — is it JSON?'); return; }
      const res = validateImport(obj);
      if (!res.ok) { toast(res.error, 4000); return; }
      const n = res.data.logs.length;
      if (await confirmSheet({ title: 'Replace your data?', body: `This backup has ${n} session${n === 1 ? '' : 's'}${res.data.profile ? '' : ' and no profile'}. It will replace everything currently on this device.`, ok: 'Import & replace', danger: true })) {
        replaceState(res.data);
        toast('Data imported');
        ctx.go(res.data.profile ? '#/today' : '#/welcome');
      }
    }
  });
}

// Me → About: ask the service worker to look for a new build now. When one installs, app.js reloads into it.
async function checkForUpdate(root) {
  const say = t => { const m = root.querySelector('[data-update-msg]'); if (m) m.textContent = t; };
  const reg = await navigator.serviceWorker?.getRegistration?.().catch(() => null);
  if (!reg) { say('Updates arrive automatically when you open the app online.'); return; }
  say('Checking…');
  try { await reg.update(); } catch { say('Couldn’t check just now. Are you offline?'); return; }
  if (reg.installing || reg.waiting) say('Downloading the new version. The app will restart in a moment.');
  else say(`You have the latest version (${versionLabel()}).`);
}

function resetSheet(ctx) {
  openSheet({
    title: 'Reset all data', cls: 'sheet-small',
    html: `<p>This permanently deletes your profile, plan, history, streaks and body-weight log from this device. Export a backup first if you might want it back.</p>
      <label class="field"><span class="label">Type <strong>RESET</strong> to confirm</span><input class="input" data-confirm autocomplete="off" autocapitalize="characters" spellcheck="false"></label>
      <div class="btn-row"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-danger" data-go disabled>Delete everything</button></div>`,
    onMount(el, close) {
      const inp = el.querySelector('[data-confirm]'), go = el.querySelector('[data-go]');
      inp.addEventListener('input', () => { go.disabled = inp.value.trim().toUpperCase() !== 'RESET'; });
      go.addEventListener('click', () => { close(); resetAll(); toast('All data deleted'); ctx.go('#/welcome'); });
      setTimeout(() => inp.focus(), 50);
    },
  });
}
