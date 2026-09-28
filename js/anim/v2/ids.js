// Kitaeru animation v2: which exercise ids have a Direction A clip, and which clip file holds them.
// Tiny and dependency-free: the app imports only this at start; the renderer and a clip group load on first use.
// Keep in sync with clips/*.js (anim-v2-compare.html flags any mismatch).
export const V2_GROUPS = {
  push: ['push_up', 'knee_push_up', 'scapular_push_up', 'wall_push_up', 'incline_push_up', 'decline_push_up', 'diamond_push_up',
    'archer_push_up', 'pseudo_planche_push_up', 'pike_push_up', 'elevated_pike_push_up', 'bench_dip', 'bar_dip', 'ring_dip'],
  pull: ['pull_up', 'chin_up', 'dead_hang', 'scapular_pull', 'negative_pull_up', 'band_assisted_pull_up', 'archer_pull_up',
    'inverted_row', 'table_row', 'archer_row', 'band_row'],
  legs: ['bodyweight_squat', 'box_squat', 'split_squat', 'bulgarian_split_squat', 'calf_raise', 'single_leg_calf_raise',
    'glute_bridge', 'single_leg_glute_bridge', 'hip_thrust'],
  trunk: ['plank', 'side_plank', 'superman'],
  flow: ['taichi_cloud_hands', 'taichi_brush_knee'],   // stepping pilots for v1.2 (not app exercises yet; not precached)
};
export const V2_GROUP_OF = Object.fromEntries(Object.entries(V2_GROUPS).flatMap(([g, ids]) => ids.map(id => [id, g])));
export const V2_IDS = new Set(Object.keys(V2_GROUP_OF));
