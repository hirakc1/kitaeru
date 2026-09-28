// Kitaeru animation v2: every clip group at once (compare page, QA, three.js renderer). The app loads groups lazily
// instead (see ids.js / load.js).
import { CLIPS } from './clips/lib.js';
import './clips/push.js';
import './clips/pull.js';
import './clips/legs.js';
import './clips/trunk.js';
import './clips/rot.js';
import './clips/trad.js';
import './clips/taiso.js';
import './clips/taichi.js';

export { CLIPS };
export const CLIP_IDS = Object.keys(CLIPS);
