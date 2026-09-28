// Kitaeru muscle map. Ids are fixed by docs/CONTRACTS.md.
// view: which body-map silhouette shows the muscle ('front' | 'back' | 'both').
// region: 'upper' | 'core' | 'lower' (for grouping in the UI).

export const MUSCLES = {
  chest: { name: 'Chest', view: 'front', latin: 'Pectoralis major', region: 'upper' },
  front_delts: { name: 'Front shoulders', view: 'front', latin: 'Anterior deltoid', region: 'upper' },
  side_delts: { name: 'Side shoulders', view: 'both', latin: 'Lateral deltoid', region: 'upper' },
  rear_delts: { name: 'Rear shoulders', view: 'back', latin: 'Posterior deltoid', region: 'upper' },
  triceps: { name: 'Triceps', view: 'back', latin: 'Triceps brachii', region: 'upper' },
  biceps: { name: 'Biceps', view: 'front', latin: 'Biceps brachii & brachialis', region: 'upper' },
  forearms: { name: 'Forearms & grip', view: 'both', latin: 'Wrist flexors & extensors', region: 'upper' },
  traps: { name: 'Traps', view: 'back', latin: 'Trapezius (upper & lower)', region: 'upper' },
  upper_back: { name: 'Upper back', view: 'back', latin: 'Rhomboids & middle trapezius', region: 'upper' },
  lats: { name: 'Lats', view: 'back', latin: 'Latissimus dorsi', region: 'upper' },
  lower_back: { name: 'Lower back', view: 'back', latin: 'Erector spinae', region: 'core' },
  abs: { name: 'Abs', view: 'front', latin: 'Rectus abdominis & transversus', region: 'core' },
  obliques: { name: 'Obliques', view: 'both', latin: 'External & internal obliques', region: 'core' },
  glutes: { name: 'Glutes', view: 'back', latin: 'Gluteus maximus & medius', region: 'lower' },
  hip_flexors: { name: 'Hip flexors', view: 'front', latin: 'Iliopsoas & rectus femoris', region: 'lower' },
  quads: { name: 'Quads', view: 'front', latin: 'Quadriceps femoris', region: 'lower' },
  hamstrings: { name: 'Hamstrings', view: 'back', latin: 'Biceps femoris & semitendinosus/membranosus', region: 'lower' },
  adductors: { name: 'Inner thighs', view: 'front', latin: 'Adductor magnus, longus & brevis', region: 'lower' },
  calves: { name: 'Calves', view: 'back', latin: 'Gastrocnemius & soleus', region: 'lower' },
};

export const MUSCLE_IDS = Object.keys(MUSCLES);
