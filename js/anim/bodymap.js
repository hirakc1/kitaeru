// Kitaeru body map: front and back anatomical silhouettes with the 19 muscle groups as named regions.
// export renderBodyMap(container, { primary, secondary, size }) and bodyMapSVG({ primary, secondary, size }).

const f1 = n => Math.round(n * 10) / 10;

// Right half of the silhouette outline as [x offset from centre line, y]; mirrored for the left half.
const OUTLINE = [
  [6, 23], [6.5, 30], [17, 33.5], [24.5, 36.5], [28, 43], [29, 57], [30.5, 71], [32.5, 87], [33, 103], [34.5, 112], [33, 120],
  [30, 120.5], [28, 114], [27, 103], [25, 88], [24, 74], [21.5, 60], [19.5, 51], [18.5, 62], [15.5, 84], [18.5, 97], [19.5, 112],
  [18, 132], [15, 147], [15, 158], [12, 176], [10.5, 182], [13, 188.5], [4, 189.5], [4.5, 181], [4.5, 165], [5, 150], [3.2, 132], [1.6, 112], [0, 107],
];

function smoothClosed(pts) {
  const n = pts.length; let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f1(c1[0])},${f1(c1[1])} ${f1(c2[0])},${f1(c2[1])} ${f1(p2[0])},${f1(p2[1])}`;
  }
  return d + 'Z';
}

function silhouette(cx) {
  const right = OUTLINE.map(([x, y]) => [cx + x, y]);
  const left = OUTLINE.slice(0, -1).reverse().map(([x, y]) => [cx - x, y]);
  // start at the crotch so the smoothing wraps cleanly: right side top->bottom, then left side bottom->top
  const pts = [...right, ...left];
  return `<path class="bm-body" d="${smoothClosed(pts)}"/>` +
    `<ellipse class="bm-body" cx="${cx}" cy="13" rx="9" ry="11"/>`;
}

// Shapes are defined for the right half ([x offset, ...]) and mirrored. e = ellipse [x, y, rx, ry, rot], p = polygon pts
const FRONT = {
  traps: [['e', 11.5, 32.5, 5, 1.8, 14]],
  chest: [['p', [[1.5, 38.5], [10, 37], [19, 40.5], [19, 47], [12, 53], [2, 52]]]],
  front_delts: [['e', 22.8, 41, 4.2, 5.5, -18]],
  side_delts: [['e', 26.6, 44.5, 2.2, 5.5, -12]],
  biceps: [['e', 25, 58, 3.3, 9, -6]],
  forearms: [['e', 29, 87, 3.2, 12, -6]],
  lats: [['e', 17.3, 60, 1.8, 7, 8]],
  abs: [['r', 1.4, 56.5, 5.4, 8.5], ['r', 1.4, 66.5, 5.4, 8.5], ['r', 1.4, 76.5, 5.4, 9.5]],
  obliques: [['e', 12.5, 73, 3.4, 11, -8]],
  hip_flexors: [['e', 9.5, 98.5, 2.8, 6.5, -32]],
  quads: [['e', 12, 123, 6, 18, 4]],
  adductors: [['e', 4.8, 116, 2.6, 11, 2]],
  calves: [['e', 12.6, 160, 2.6, 9, 3], ['e', 6.4, 161, 2, 8, -2]],
};
const BACK = {
  traps: [['p', [[0.5, 27], [6.5, 30], [17, 34.5], [9, 43], [0.5, 58]]]],
  rear_delts: [['e', 23.5, 41.5, 4.4, 5, 18]],
  side_delts: [['e', 26.6, 44.5, 2.2, 5.5, -12]],
  upper_back: [['e', 12.5, 46.5, 5.5, 4.2, 20]],
  lats: [['p', [[8, 53], [19, 50], [17, 66], [10, 82], [7, 74]]]],
  triceps: [['e', 25, 58, 3.5, 9.5, -6]],
  forearms: [['e', 29, 87, 3.2, 12, -6]],
  lower_back: [['r', 1.4, 68, 5, 22]],
  obliques: [['e', 15, 86, 2.6, 6, -10]],
  glutes: [['e', 10, 104, 9, 9.5, 0]],
  hamstrings: [['e', 11.4, 129, 5.4, 15, 3]],
  adductors: [['e', 4.3, 118, 2.3, 9, 0]],
  calves: [['e', 11.6, 158, 4.4, 10, 2], ['e', 6.2, 159, 2.4, 8, -2]],
};

function shapes(table, cx, prim, sec) {
  let out = '';
  for (const id in table) {
    const cls = prim.has(id) ? 'bm-m bm-p' : sec.has(id) ? 'bm-m bm-s' : 'bm-m bm-i';
    let d = '';
    for (const s of [1, -1]) for (const sh of table[id]) {
      if (sh[0] === 'e') {
        const [, x, y, rx, ry, rot] = sh, X = cx + s * x;
        d += `<ellipse cx="${f1(X)}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${s * rot} ${f1(X)} ${y})"/>`;
      } else if (sh[0] === 'r') {
        const [, x, y, w, h] = sh, X = s > 0 ? cx + x : cx - x - w;
        d += `<rect x="${f1(X)}" y="${y}" width="${w}" height="${h}" rx="1.6"/>`;
      } else {
        d += `<polygon points="${sh[1].map(([x, y]) => `${f1(cx + s * x)},${y}`).join(' ')}"/>`;
      }
    }
    out += `<g class="${cls}" data-muscle="${id}"><title>${id.replace(/_/g, ' ')}</title>${d}</g>`;
  }
  return out;
}

const STYLE = `<style>
.bm .bm-body{fill:var(--bone,#EDE5D3);stroke:var(--ink-muted,#6B665C);stroke-width:.9;stroke-linejoin:round}
.bm .bm-m{stroke:none}
.bm .bm-p{fill:var(--muscle-primary,#C8372D);opacity:.85}
.bm .bm-s{fill:var(--muscle-secondary,#D9A441);opacity:.6}
.bm .bm-i{fill:var(--ink-muted,#6B665C);opacity:.13}
.bm .bm-line{fill:none;stroke:var(--ink-muted,#6B665C);stroke-width:.6;stroke-opacity:.45;stroke-linecap:round}
.bm text{fill:var(--ink-muted,#6B665C);font:600 8px system-ui,sans-serif;letter-spacing:.08em}
</style>`;

export function bodyMapSVG({ primary = [], secondary = [], size = 160 } = {}) {
  const prim = new Set(primary || []), sec = new Set(secondary || []);
  const label = [primary.length ? `Primary: ${primary.join(', ')}` : '', secondary.length ? `Secondary: ${secondary.join(', ')}` : '']
    .filter(Boolean).join('. ').replace(/_/g, ' ') || 'Body map';
  const lines = cx => `<path class="bm-line" d="M${cx},37 L${cx},96 M${cx - 12},148 q2,-2 4,0 M${cx + 8},148 q2,-2 4,0"/>`;
  return `<svg class="bm" viewBox="0 0 200 204" width="100%" style="max-width:${size}px;display:block;height:auto" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${STYLE}` +
    `<g>${silhouette(50)}${shapes(FRONT, 50, prim, sec)}${lines(50)}<text x="50" y="201" text-anchor="middle">FRONT</text></g>` +
    `<g>${silhouette(150)}${shapes(BACK, 150, prim, sec)}${lines(150)}<text x="150" y="201" text-anchor="middle">BACK</text></g></svg>`;
}

export function renderBodyMap(container, { primary = [], secondary = [], size = 160 } = {}) {
  container.innerHTML = bodyMapSVG({ primary, secondary, size });
  return container.firstElementChild;
}
