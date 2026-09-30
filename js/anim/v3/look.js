// Kitaeru animation v3: the body's two looks, as small custom shaders (no PBR, no shadow maps: cheap on phones).
//   'solid'  washi-clay figure in sportswear (Kitaeru palette: vermilion top, sumi bottoms, sumi hair): the Morning Taisō
//   'xray'   see-through fresnel "glass" body; muscles glow through it (primary vermilion, secondary gold); the
//            garments show as a slightly denser tint so the figure still reads as dressed; optional skeleton inside
// Lights follow the camera (view space), so every camera angle is lit the same way.
import * as THREE from '../../vendor/three.module.min.js';

export const MUSCLES = ['none', 'chest', 'front_delts', 'side_delts', 'rear_delts', 'triceps', 'biceps', 'forearms', 'traps', 'upper_back',
  'lats', 'lower_back', 'abs', 'obliques', 'glutes', 'hip_flexors', 'quads', 'hamstrings', 'adductors', 'calves'];
const NM = MUSCLES.length;

const VERT = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
attribute vec4 _region;
attribute vec4 _cloth;
uniform float uPrim[${NM}];
uniform float uSec[${NM}];
uniform float uIsBone;
varying vec3 vN; varying vec3 vV; varying float vP; varying float vS; varying vec4 vCloth;
void main() {
  #include <skinbase_vertex>
  #include <begin_vertex>
  #include <beginnormal_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  #include <clipping_planes_vertex>
  vN = normalize(transformedNormal); vV = normalize(-mvPosition.xyz);
  int i1 = int(_region.x + .5), i2 = int(_region.z + .5);
  vP = max(uPrim[i1] * _region.y, uPrim[i2] * _region.w) / 255.;
  vS = max(uSec[i1] * _region.y, uSec[i2] * _region.w) / 255.;
  vCloth = uIsBone > .5 ? vec4(0.) : _cloth;
}`;

// crisp hems wherever the soft per-vertex mask crosses one half (anti-aliased with the screen-space derivative)
const CLOTH = /* glsl */`
float hem(float m) { float w = max(fwidth(m), 1e-4); return smoothstep(.5 - w, .5 + w, m); }`;

const FRAG_SOLID = /* glsl */`
uniform vec3 uSkin; uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uHair; uniform vec3 uEye;
uniform vec3 uSky; uniform vec3 uGround; uniform vec3 uRim; uniform float uRimK;
varying vec3 vN; varying vec3 vV; varying float vP; varying float vS; varying vec4 vCloth;
#include <clipping_planes_pars_fragment>
${CLOTH}
void main() {
  #include <clipping_planes_fragment>
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 base = uSkin;
  base = mix(base, uBottom, hem(vCloth.y));
  base = mix(base, uTop, hem(vCloth.x));
  base = mix(base, uHair, hem(vCloth.z));
  base = mix(base, uEye, hem(vCloth.w));
  vec3 L = normalize(vec3(-.45, .65, .6));
  float d = dot(n, L) * .5 + .5; d = d * d;
  float hemi = n.y * .5 + .5;
  vec3 amb = mix(uGround, uSky, hemi);
  float f = pow(1. - clamp(dot(n, normalize(vV)), 0., 1.), 3.);
  vec3 col = base * (amb * .55 + d * .72) + uRim * f * uRimK;
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}`;

const FRAG_XRAY = /* glsl */`
uniform vec3 uSkin; uniform vec3 uRim; uniform vec3 uPrimC; uniform vec3 uSecC; uniform vec3 uClothC; uniform float uOpacity; uniform float uCore;
varying vec3 vN; varying vec3 vV; varying float vP; varying float vS; varying vec4 vCloth;
#include <clipping_planes_pars_fragment>
${CLOTH}
void main() {
  #include <clipping_planes_fragment>
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  float f = 1. - clamp(abs(dot(n, normalize(vV))), 0., 1.);
  float fr = pow(f, 1.8);
  float cl = max(hem(vCloth.x), hem(vCloth.y)) * .55 + hem(vCloth.z) * .7;
  vec3 col = mix(mix(uSkin, uClothC, cl * .5), uRim, fr);
  float a = uOpacity * (uCore + (1. - uCore) * fr) + cl * .09;
  float m = max(vP, vS);
  if (m > .001) {
    vec3 mc = vP >= vS ? uPrimC : uSecC;
    float lit = .55 + .45 * clamp(dot(n, normalize(vec3(-.3, .6, .75))), 0., 1.);
    col = mix(col, mc * lit, clamp(m * 1.3, 0., 1.));
    a = max(a, m * .78 + .2 * fr * m);
  }
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;

const css = (name, fb) => { try { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; } catch { return fb; } };
export const isDark = () => new THREE.Color(css('--bg', '#F5F1E8')).getHSL({}).l < .3;

/** One set of materials per stage (uniforms are per player: muscles differ). */
export function createLooks(lod = 0) {
  const zeros = () => new Array(NM).fill(0);
  const C = () => ({ value: new THREE.Color() });
  const U = { uPrim: { value: zeros() }, uSec: { value: zeros() }, uIsBone: { value: 0 } };
  const solidU = { ...U, uSkin: C(), uTop: C(), uBottom: C(), uHair: C(), uEye: C(), uSky: C(), uGround: C(), uRim: C(), uRimK: { value: .25 } };
  const xrayU = { ...U, uSkin: C(), uRim: C(), uPrimC: C(), uSecC: C(), uClothC: C(), uOpacity: { value: .55 }, uCore: { value: .3 } };
  const boneU = { uPrim: { value: zeros() }, uSec: { value: zeros() }, uIsBone: { value: 1 }, uSkin: C(), uTop: C(), uBottom: C(), uHair: C(), uEye: C(),
    uSky: C(), uGround: C(), uRim: C(), uRimK: { value: .15 } };
  // (clipping: true lets the detail inset cut away everything above the hands)
  const solid = new THREE.ShaderMaterial({ uniforms: solidU, vertexShader: VERT, fragmentShader: FRAG_SOLID, toneMapped: false, clipping: true });
  const xray = new THREE.ShaderMaterial({ uniforms: xrayU, vertexShader: VERT, fragmentShader: FRAG_XRAY, transparent: true, depthWrite: false, toneMapped: false, clipping: true });
  const bone = new THREE.ShaderMaterial({ uniforms: boneU, vertexShader: VERT, fragmentShader: FRAG_SOLID, toneMapped: false });
  const depth = new THREE.MeshBasicMaterial({ colorWrite: false });
  const prop = new THREE.MeshLambertMaterial({ color: 0xd9d0bf });
  function theme() {
    const dark = isDark();
    xrayU.uPrimC.value.set(css('--muscle-primary', css('--accent', '#C8372D')));
    xrayU.uSecC.value.set(css('--muscle-secondary', css('--accent-2', '#D9A441')));
    // (thumbnails: a denser glass and a darker rim, so a 100 px figure still reads against the paper)
    xrayU.uSkin.value.set(dark ? '#3a352f' : '#efe4d1'); xrayU.uRim.value.set(dark ? '#efe6d6' : lod ? '#2e2822' : '#463d33');
    xrayU.uClothC.value.set(dark ? '#8a7f70' : '#6f655a'); xrayU.uOpacity.value = lod ? .95 : dark ? .62 : .7;
    solidU.uSkin.value.set(dark ? '#cfbfa6' : '#ead9c0');
    solidU.uTop.value.set(dark ? '#c9594a' : '#b9493c');
    solidU.uBottom.value.set(dark ? '#45403a' : '#35302b');
    solidU.uHair.value.set(dark ? '#2c2824' : '#2b2622');
    solidU.uEye.value.set(dark ? '#6f6254' : '#7d6d5d');   // (soft, not black: a clay figure's eyes)
    solidU.uSky.value.set(dark ? '#d6ccbb' : '#fffaf0'); solidU.uGround.value.set(dark ? '#5b544a' : '#a49886');
    solidU.uRim.value.set(dark ? '#f2e3c4' : '#fff4e0'); solidU.uRimK.value = dark ? .45 : .25;
    boneU.uSkin.value.set(dark ? '#e6dcc6' : '#efe6d2'); boneU.uRim.value.set('#ffffff');
    boneU.uSky.value.set(dark ? '#d9cfbd' : '#fffaf0'); boneU.uGround.value.set(dark ? '#6b6358' : '#9a8f7c');
    prop.color.set(dark ? '#4a453e' : '#ddd4c3');
    return dark;
  }
  function muscles(prim = [], sec = []) {
    const P = new Set(prim), S = new Set(sec);
    for (let i = 0; i < NM; i++) {
      xrayU.uPrim.value[i] = P.has(MUSCLES[i]) ? 1 : 0;
      xrayU.uSec.value[i] = S.has(MUSCLES[i]) && !P.has(MUSCLES[i]) ? 1 : 0;
    }
  }
  // the glass's density at the centre of the body: denser without the skeleton (the figure reads better), clearer with it
  const core = skeleton => { xrayU.uCore.value = skeleton ? .12 : .3; };
  return { solid, xray, bone, depth, prop, theme, muscles, core, dispose() { for (const m of [solid, xray, bone, depth, prop]) m.dispose(); } };
}
