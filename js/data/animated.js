// Kitaeru animation gate (v1.2). An exercise is only planned, offered in Quick or swaps, or listed in the library when
// it has an animation: a v1 pose in js/anim/poses.js or a v2 clip. Without one it would render as a standing-figure
// fallback. `?preview=traditions` shows everything for development (the gate is off in preview).
//
// ONE pluggable predicate: hasAnimation(animId): a v1 pose or a registered id. The anim v2 clip list (V2_IDS in
// js/anim/v2/ids.js, drafts excluded) is registered below; the static import keeps EXERCISES (computed at load) in step
// with the planner. ids.js is only the id list, so this never pulls the v2 renderer into the first load.
import { ANIMS } from '../anim/poses.js';
import { V2_IDS } from '../anim/v2/ids.js';   // just the id list (tiny); the v2 renderer itself loads on first use
import { traditionPreview } from './traditions.js';

const extra = new Set();
let version = 0;

/** Add animation ids from another renderer (e.g. the anim v2 clip list). Accepts any iterable of ids. */
export function registerAnimationIds(ids) {
  for (const id of ids || []) extra.add(id);
  version++;
}
registerAnimationIds(V2_IDS);   // anim v2 clips (drafts excluded in ids.js)

/** Tests only: forget ids added with registerAnimationIds. */
export function clearRegisteredAnimationIds() { extra.clear(); version++; }
/** Changes whenever the registered id list changes (the planner keys its library cache on it). */
export const animationGateVersion = () => version;

/** Does this animation id have a clip (v1 pose or a registered v2 clip)? */
export function hasAnimation(animId) {
  return !!animId && (Object.prototype.hasOwnProperty.call(ANIMS, animId) || extra.has(animId));
}

/**
 * Can this exercise be shown on its own? Its animation (`anim`, defaulting to its id) must exist. A flow also needs
 * every step animated, including pauses (step `anim`) and the variant replacements it may switch to (e.g. the
 * low-impact heel raise). `lookup` resolves step move ids (pass ALL_BY_ID). In preview the gate is off.
 */
export function exerciseAnimated(ex, lookup = {}) {
  if (!ex) return false;
  if (traditionPreview()) return true;
  if (ex.mode !== 'flow') return hasAnimation(ex.anim || ex.id);
  const stepAnim = st => (st.move ? (lookup[st.move]?.anim || st.move) : st.anim);
  if (!(ex.sequence || []).every(st => hasAnimation(stepAnim(st)))) return false;
  const repl = Object.values(ex.variants || {}).flatMap(v => Object.values(v.replace || {}));
  return repl.every(id => hasAnimation(lookup[id]?.anim || id));
}
