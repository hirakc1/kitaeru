// Culture cards (v1.2, docs/world-movement.md §5.4): native name first, then English, region, era, the card copy,
// "What it trains", the graded evidence line, the attribution and a "Sources" line. Never "Reviewed by".
// Everything here respects the accuracy gate: a card only exists while its tradition has visible exercises.
import { TRADITIONS, EXERCISES, traditionVisible } from './deps.js';
import { esc, icon, openSheet, nativeNameHTML } from './components.js';
import { makeButtonHTML, onMakeClick } from './maker.js';

const EXPLAINER_FAMILIES = ['rotation', 'anti_rotation'];
const TRAINS = [['strength', 'Strength'], ['mobility', 'Mobility'], ['balance', 'Balance'], ['breath', 'Breath'], ['coordination', 'Coordination']];
const GRADE = { A: 'Strong evidence', B: 'Some evidence', C: 'Limited evidence', D: 'Tradition, not yet studied' };

const isExplainer = t => t?.kind === 'explainer';
/** Visible exercises a card covers: its tradition's items, or an explainer's families. */
export function cardExercises(id) {
  const t = TRADITIONS[id];
  if (!t) return [];
  if (isExplainer(t)) return EXERCISES.filter(e => (t.families || EXPLAINER_FAMILIES).includes(e.family) && !e.tradition);
  return EXERCISES.filter(e => e.tradition === id);
}
/** Can this card be shown? Only while the tradition passes the accuracy gate AND something it covers is visible. */
export function cardVisible(id) {
  const t = TRADITIONS[id];
  return !!t && traditionVisible(id) && cardExercises(id).length > 0;
}
/** Visible cards, traditions first, explainers last. */
export function visibleCards() {
  const ids = Object.keys(TRADITIONS).filter(cardVisible);
  return [...ids.filter(id => !isExplainer(TRADITIONS[id])), ...ids.filter(id => isExplainer(TRADITIONS[id]))];
}
/** The card for an exercise: its tradition's, or the rotation explainer for generic rotation / anti-rotation items. */
export function cardFor(ex) {
  if (!ex) return null;
  if (ex.tradition) return cardVisible(ex.tradition) ? ex.tradition : null;
  const exp = Object.keys(TRADITIONS).find(id => isExplainer(TRADITIONS[id]) && (TRADITIONS[id].families || []).includes(ex.family));
  return exp && cardVisible(exp) ? exp : null;
}
export const traditionName = id => TRADITIONS[id]?.name || '';
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);

function trainsHTML(tr = {}) {
  const rows = TRAINS.filter(([k]) => (tr[k] || 0) > 0);
  if (!rows.length) return '';
  return `<ul class="cc-trains">${rows.map(([k, l]) => `<li><span>${l}</span><span class="cc-dots" role="img" aria-label="${tr[k]} of 3">${[1, 2, 3].map(i => `<i class="${i <= tr[k] ? 'on' : ''}"></i>`).join('')}</span></li>`).join('')}</ul>`;
}

/** A small tappable card for lists (Library "Traditions" row, exercise detail). */
export function cardChipHTML(id) {
  const t = TRADITIONS[id];
  if (!t) return '';
  const exp = isExplainer(t);
  return `<button type="button" class="cc-chip ${exp ? 'cc-chip-explainer' : ''}" data-culture="${esc(id)}">
    ${t.nativeName ? nativeNameHTML(t.nativeName, { roman: false, cls: 'cc-chip-native' }) : `<span class="cc-chip-mark" aria-hidden="true">${icon('info', { size: 18 })}</span>`}
    <span class="cc-chip-text"><span class="cc-chip-name">${esc(exp ? `Why ${t.name.toLowerCase()}?` : t.name)}</span><span class="small muted">${esc(exp ? 'Explainer' : t.region || '')}</span></span></button>`;
}

export function cardHTML(id, { head = true } = {}) {
  const t = TRADITIONS[id];
  if (!t) return '';
  const exp = isExplainer(t);
  const items = cardExercises(id);
  const sources = (t.sources || []).filter(s => s.url);
  return `<article class="culture ${exp ? 'culture-explainer' : ''}">
    ${exp ? `<p class="eyebrow">Explainer · not a tradition</p>${head ? `<h3 class="cc-title">${esc(t.name)}</h3>` : ''}`
      : `<header class="cc-head">${head ? `${nativeNameHTML(t.nativeName, { cls: 'cc-native' })}
        <h3 class="cc-title">${esc(t.name)}</h3>` : ''}
        <p class="small muted cc-where">${[t.region, t.era].filter(Boolean).map(esc).join(' · ')}</p></header>`}
    <p class="cc-copy">${esc(t.card)}</p>
    ${!exp ? '<p class="small muted">Kitaeru teaches foundation movements only. The full practice is best learned with a teacher or a local group.</p>' : ''}
    ${trainsHTML(t.trains) ? `<h4 class="h3">What it trains</h4>${trainsHTML(t.trains)}` : ''}
    ${(t.evidence || []).length ? `<h4 class="h3">Evidence</h4><ul class="cc-evidence">${t.evidence.map(e => `<li><span class="cc-grade" title="${esc(GRADE[e.grade] || '')}">${esc(e.grade)}</span>
      <span>${esc(e.claim)}. <span class="muted small">${esc(GRADE[e.grade] || '')}${e.cite ? ` · ${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.cite)}</a>` : esc(e.cite)}` : ''}</span></span></li>`).join('')}</ul>` : ''}
    ${t.attribution ? `<p class="small cc-attr"><span class="label">Based on</span> ${esc(cap(t.attribution))}</p>` : ''}
    ${items.length ? `<h4 class="h3">In Kitaeru</h4><p class="cc-items">${items.map(e => `<a class="chip chip-link" href="#/library/${esc(e.id)}">${esc(e.name)}</a>`).join('')}</p>` : ''}
    ${sources.length ? `<p class="small cc-sources"><span class="label">Sources</span> ${sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join('<span aria-hidden="true"> · </span>')}</p>` : ''}
  </article>`;
}

/** Open a culture card as a sheet. Returns close() or null when the card is hidden by the gate. */
export function openCultureCard(id) {
  if (!cardVisible(id)) return null;
  const t = TRADITIONS[id];
  return openSheet({
    // "Make a workout" from this discipline first (hidden when nothing in its pool suits this user), then the card.
    title: t.name, cls: 'sheet-tall', html: makeButtonHTML({ tradition: id }, { cls: 'mk-in-card' }) + cardHTML(id, { head: false }),
    // Native name first (script + romanisation), then English (world-movement.md §5.1.2).
    titleHTML: t.nativeName ? `${nativeNameHTML(t.nativeName, { cls: 'title-native' })}<span class="title-en">${esc(t.name)}</span>` : '',
    onMount(el, close) { el.addEventListener('click', e => { if (onMakeClick(e)) return; if (e.target.closest('.cc-items a')) close(); }); },
  });
}
