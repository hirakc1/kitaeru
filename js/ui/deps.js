// Single import point for modules owned by other teams (data, animation, planner).
// Everything else in the UI imports from here, so the contract surface lives in one place.
export { MUSCLES, MUSCLE_IDS } from '../data/muscles.js';
export { EXERCISES, FAMILIES, byId } from '../data/exercises.js';
export { createSkeletonPlayer } from '../anim/skeleton.js';
export { renderBodyMap, bodyMapSVG } from '../anim/bodymap.js';
export { initialLevels, generateWeek, applySessionLog, computeStreak, explainPlan, estimateMinutes, generateQuickSession } from '../engine/planner.js';

// Optional (non-contract) helper: the planner's own availability rule, so the UI agrees with the plan.
import * as planner from '../engine/planner.js';
export const plannerIsAvailable = typeof planner.isAvailable === 'function' ? planner.isAvailable : null;
export const plannerStartDate = typeof planner.planStartDate === 'function' ? planner.planStartDate : null;
