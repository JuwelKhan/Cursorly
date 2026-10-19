/**
 * Cursorly — ES module entry.
 *   import Cursorly from 'cursorly';
 *   import { Cursorly, registerEffect, registerPreset } from 'cursorly';
 */
export { Cursorly, Cursorly as default } from './core/Cursorly.js';
export { registerEffect, getEffect, listEffects } from './effects/registry.js';
export { registerPreset, getPreset, listPresets } from './presets.js';
export { DEFAULTS } from './core/options.js';
export { follow, clamp } from './core/math.js';
