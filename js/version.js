// The deployed build, written by deploy.py together with VERSION in sw.js. Shown on Me → About.
export const VERSION = 'v2026.10.01-1154';

/** 'v2026.09.29-1525' -> '29 Sep 2026, 15:25' (the build's date and time, UK time). */
export function versionLabel(v = VERSION) {
  const m = /^v(\d{4})\.(\d\d)\.(\d\d)-(\d\d)(\d\d)/.exec(v);
  if (!m) return v;
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1];
  return `${+m[3]} ${mon} ${m[1]}, ${m[4]}:${m[5]}`;
}
