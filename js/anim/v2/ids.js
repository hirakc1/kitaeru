// Kitaeru animation v2: which exercise ids have a Direction A clip, and which clip file holds them.
// Tiny and dependency-free: the app imports only this at start (skeleton.js, data/animated.js); the renderer and a
// clip group load on first use. Keep in sync with clips/*.js (anim-v2-compare.html flags any mismatch).
export const V2_GROUPS = {
  push: ['push_up', 'knee_push_up', 'scapular_push_up', 'wall_push_up', 'incline_push_up', 'decline_push_up', 'diamond_push_up',
    'archer_push_up', 'pseudo_planche_push_up', 'pike_push_up', 'elevated_pike_push_up', 'bench_dip', 'bar_dip', 'ring_dip'],
  pull: ['pull_up', 'chin_up', 'dead_hang', 'scapular_pull', 'negative_pull_up', 'band_assisted_pull_up', 'archer_pull_up',
    'inverted_row', 'table_row', 'archer_row', 'band_row'],
  legs: ['bodyweight_squat', 'box_squat', 'split_squat', 'bulgarian_split_squat', 'calf_raise', 'single_leg_calf_raise',
    'glute_bridge', 'single_leg_glute_bridge', 'hip_thrust'],
  trunk: ['plank', 'side_plank', 'superman'],
  // batch 3: core and skill
  abs: ['wall_handstand_push_up', 'dead_bug', 'lying_leg_raise', 'hollow_body_hold', 'hanging_knee_raise', 'hanging_leg_raise', 'l_sit', 'side_plank_hip_dip',
    'bird_dog', 'crow_pose', 'wall_handstand', 'freestanding_handstand'],
  // batch 4: conditioning
  cond: ['marching_in_place', 'high_knees', 'jumping_jack', 'squat_jump', 'mountain_climber', 'bear_crawl', 'burpee'],
  // batch 5: mobility and warm-up (thoracic_opener is in rot, with the open book)
  mob: ['cat_cow', 'wrist_prep', 'childs_pose', 'cobra_stretch', 'deep_squat_hold', 'hip_flexor_stretch', 'standing_hamstring_stretch',
    'pigeon_stretch', 'calf_stretch', 'doorway_chest_stretch', 'shoulder_dislocate', 'arm_circles', 'leg_swings', 'hip_circles',
    'worlds_greatest_stretch', 'pancake_stretch', 'inchworm'],
  // Moments: short everyday pauses
  moments: ['standing_hip_flexor_stretch', 'wall_angel', 'seated_calf_raise', 'paced_breathing'],
  strength: ['prone_ytw', 'superman_pull', 'reverse_lunge', 'cossack_squat', 'pistol_squat', 'shrimp_squat', 'single_leg_rdl', 'nordic_curl_negative'],
  // v1.2: rotation / anti-rotation, then the strength traditions
  rot: ['open_book', 'thread_the_needle', 'seated_trunk_rotation', 'bodyweight_woodchop', 'rotational_lunge',
    'band_woodchop', 'standing_windmill', 'bird_dog_row', 'half_kneeling_pallof_hold', 'plank_shoulder_tap', 'pallof_press',
    'pallof_press_overhead', 'side_plank_reach_through', 'thoracic_opener'],
  trad: ['dand', 'baithak', 'horse_stance'],
  // Morning Taisō: the 13 steps of radio_taiso_1 (stretch up, side bend and trunk twist are also standalone) + heel raise
  taiso: ['rt_stretch_up', 'rt_arm_swing_knee_bend', 'rt_arm_circles', 'rt_chest_opener', 'rt_side_bend', 'rt_forward_back_bend',
    'rt_trunk_twist', 'rt_arms_up_down', 'rt_diagonal_bend', 'rt_trunk_circle', 'rt_two_foot_hops', 'rt_heel_raise', 'rt_deep_breath'],
  // Tai Chi: the six forms of taichi_short_flow (Simplified 24-form) plus the golden rooster
  taichi: ['taichi_commencement', 'taichi_part_horse_mane', 'taichi_white_crane', 'taichi_brush_knee', 'taichi_cloud_hands',
    'taichi_golden_rooster', 'taichi_closing'],
  // Baduanjin: the eight pieces plus the ready and closing stances of baduanjin_sequence (step anims)
  baduanjin: ['baduanjin_ready', 'baduanjin_hold_up_sky', 'baduanjin_draw_bow', 'baduanjin_separate_heaven_earth', 'baduanjin_look_back',
    'baduanjin_sway_head_tail', 'baduanjin_touch_toes', 'baduanjin_clench_fists', 'baduanjin_heel_bounce', 'baduanjin_close'],
  // v1.3b "Flow and breath": standing post, bow stance and the breath-paced walk
  stances: ['zhan_zhuang', 'bow_stance', 'breath_paced_walk'],
  // yoga: the Surya Namaskar positions (sn_*: each reached by its own arrival, one shared frame) and the whole round; tree, Warrior II, triangle
  yoga: ['surya_namaskar', 'sn_prayer', 'sn_raised_arms', 'sn_forward_fold', 'sn_lunge_r', 'sn_lunge_l', 'sn_plank', 'sn_plank_l', 'sn_knees_chest',
    'sn_cobra', 'sn_dog', 'sn_lunge_in_r', 'sn_lunge_in_l', 'sn_fold_in_l', 'sn_fold_in_r', 'sn_rise', 'sn_stand', 'vrikshasana', 'virabhadrasana_2', 'trikonasana'],
  // Makkō-hō: the four seated stretches (one shared frame)
  makko: ['makko_1', 'makko_2', 'makko_3', 'makko_4'],
};
// clips that exist (compare page) but are not yet cue-checked for the app: kept out of the animation gate
export const V2_DRAFT = new Set([]);
export const V2_GROUP_OF = Object.fromEntries(Object.entries(V2_GROUPS).flatMap(([g, ids]) => ids.map(id => [id, g])));
export const V2_ALL = new Set(Object.keys(V2_GROUP_OF));
export const V2_IDS = new Set([...V2_ALL].filter(id => !V2_DRAFT.has(id)));
