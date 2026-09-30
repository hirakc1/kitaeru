// Single import point for modules owned by other teams (data, animation, planner).
// Everything else in the UI imports from here, so the contract surface lives in one place.
export { MUSCLES, MUSCLE_IDS } from '../data/muscles.js';
export { EXERCISES, FAMILIES, byId, varietyFor } from '../data/exercises.js';
// v1.2 world movement (for the flow player, culture cards and filters): ALL_* include hidden items; use only to resolve flow steps.
export { ALL_EXERCISES, ALL_BY_ID, ALL_FAMILIES, EQUIPMENT, isVisible, flowSteps, flowSeconds } from '../data/exercises.js';
export { TRADITIONS, traditionVisible, traditionPreview, contentVisible, RADIO_TAISO_ATTRIBUTION, showsMuscles } from '../data/traditions.js';
export { generateMorningTaiso, availableFlows, MORNING_TAISO_SESSION_ID, MOMENTS, RECOVERY_MOMENTS, momentMinutes, isShortMomentLog } from '../engine/planner.js';
export { hasAnimation } from '../data/animated.js';
export { createSkeletonPlayer } from '../anim/skeleton.js';
export { renderBodyMap, bodyMapSVG } from '../anim/bodymap.js';
export { initialLevels, generateWeek, applySessionLog, computeStreak, explainPlan, estimateMinutes, generateQuickSession, quickPoolIds } from '../engine/planner.js';
// v1.3: swaps for moves that are not ladders, and why a move is unavailable
export { swapAlternatives, unavailableReason } from '../engine/planner.js';

// Optional (non-contract) helper: the planner's own availability rule, so the UI agrees with the plan.
import * as planner from '../engine/planner.js';
export const plannerIsAvailable = typeof planner.isAvailable === 'function' ? planner.isAvailable : null;
export const plannerStartDate = typeof planner.planStartDate === 'function' ? planner.planStartDate : null;
