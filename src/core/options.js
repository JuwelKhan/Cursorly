import { getPreset } from '../presets.js';

/** Elements that switch the cursor to the `pointer` state. */
export const HOVER_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not(:disabled)',
  'select:not(:disabled)',
  'summary',
  'label[for]',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  'input:is([type="submit"], [type="button"], [type="reset"], [type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="file"], [type="image"]):not(:disabled)',
].join(', ');

/** Elements that switch the cursor to the `text` state (and keep the native I-beam). */
export const TEXT_SELECTOR = [
  'textarea',
  'input:not([type="submit"], [type="button"], [type="reset"], [type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="file"], [type="image"], [type="hidden"])',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ');

/**
 * Every cursor option with its default. Documented in README.md.
 */
export const DEFAULTS = Object.freeze({
  // What to draw
  preset: null, // name of a registered preset ('classic' when neither preset nor effects is set)
  effects: null, // ['dot', { type: 'ring', size: 40 }, …] — replaces the preset's effects

  // Theme (effects fall back to these when they have no colour of their own)
  color: '#111111',
  accent: '#ff5a36',

  // Behaviour
  hideNativeCursor: true, // true: hide except on text fields · 'all' · false
  touch: false, // also run on devices without a fine pointer (phones, tablets)
  reducedMotion: 'reduce', // 'reduce' | 'disable' | 'ignore' when the OS asks for less motion
  magnetic: true, // pull [data-cursor-magnetic] elements towards the pointer
  magneticStrength: 0.35, // default pull for data-cursor-magnetic without a value
  hoverSelector: HOVER_SELECTOR,
  textSelector: TEXT_SELECTOR,

  // Setup
  container: null, // element the layers are appended to (default: document.body)
  zIndex: 2147483000,
  injectCSS: true, // inject the core stylesheet (skipped when cursorly.css is already loaded)
  nonce: null, // CSP nonce for the injected <style>
  autoStart: true,
});

const isPlainObject = (value) => value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;

/** Deep-merges plain objects (used for effect `states`); arrays and other values are replaced. */
export function merge(base, patch) {
  const out = { ...base };
  for (const [key, value] of Object.entries(patch || {})) {
    out[key] = isPlainObject(value) && isPlainObject(out[key]) ? merge(out[key], value) : value;
  }
  return out;
}

/** 'ring' | { type: 'ring', id?, …options } → { id, type, options }. */
export function normalizeEffect(spec) {
  if (typeof spec === 'string') return { id: spec, type: spec, options: {} };
  if (isPlainObject(spec) && typeof spec.type === 'string') {
    const { type, id = type, ...options } = spec;
    return { id, type, options };
  }
  throw new TypeError('Cursorly: an effect must be a name or an object with a "type".');
}

/** Gives every effect a unique id: ['dot', 'dot'] → ids 'dot' and 'dot-2'. */
export function uniqueIds(specs, taken = new Set()) {
  return specs.map((spec) => {
    let id = spec.id;
    for (let n = 2; taken.has(id); n++) id = `${spec.id}-${n}`;
    taken.add(id);
    return { ...spec, id };
  });
}

/** Defaults ← preset options ← user options, with the effect list resolved. */
export function resolveOptions(user = {}) {
  let presetName = user.preset ?? (user.effects ? null : 'classic');
  let preset = presetName ? getPreset(presetName) : null;
  if (presetName && !preset) {
    console.warn(`Cursorly: unknown preset "${presetName}", using "classic".`);
    presetName = 'classic';
    preset = getPreset('classic');
  }
  const options = { ...DEFAULTS, ...preset?.options, ...user, preset: presetName };
  const effects = user.effects ?? preset?.effects ?? [];
  options.effects = uniqueIds(effects.map(normalizeEffect));

  if (!['reduce', 'disable', 'ignore'].includes(options.reducedMotion)) options.reducedMotion = 'reduce';
  if (![true, false, 'all'].includes(options.hideNativeCursor)) options.hideNativeCursor = true;
  options.magneticStrength = Number(options.magneticStrength) || 0;
  return options;
}
