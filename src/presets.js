/**
 * Presets are named effect combinations (plus optional cursor options).
 * The order of `effects` is the paint order: later effects sit on top.
 */
const presets = new Map();

export function registerPreset(name, preset) {
  if (typeof name !== 'string' || !name) throw new TypeError('Cursorly: a preset name must be a non-empty string.');
  if (!preset || !Array.isArray(preset.effects)) throw new TypeError(`Cursorly: preset "${name}" needs an effects array.`);
  presets.set(name, Object.freeze({ name, description: '', options: {}, ...preset }));
  return presets.get(name);
}

export const getPreset = (name) => presets.get(name) || null;

export const listPresets = () => [...presets.keys()];

const BUILT_IN = {
  classic: {
    description: 'A dot with a lagging ring that grows on links, shows labels and wraps sticky buttons.',
    effects: ['ring', { type: 'dot', stuckScale: 0 }],
  },
  minimal: {
    description: 'Just a dot that grows softly over links.',
    effects: [{ type: 'dot', size: 10, ease: 0.35, states: { pointer: { scale: 3.2 } }, opacity: 0.9 }],
  },
  blend: {
    description: 'An inverting blob that stretches with speed — reads well on any background.',
    effects: ['blob'],
  },
  ripple: {
    description: 'Classic dot and ring, plus ripples on every click.',
    effects: ['ripple', 'ring', { type: 'dot', stuckScale: 0 }],
  },
  neon: {
    description: 'Glowing gradient trail with a white core.',
    effects: [
      { type: 'trail', color: ['#00e5ff', '#7c4dff', '#ff2bd6'], width: 7, glow: 14, life: 0.35 },
      { type: 'dot', color: '#ffffff', size: 7 },
    ],
  },
  rainbow: {
    description: 'Long rainbow ribbon.',
    effects: [
      { type: 'trail', color: 'rainbow', width: 9, life: 0.5 },
      { type: 'dot', size: 6 },
    ],
  },
  sparkle: {
    description: 'Golden stars fall off the pointer, with a starburst on click.',
    effects: [
      {
        type: 'particles',
        shape: ['star', 'spark'],
        colors: ['#ffd166', '#ffb703', '#fff1b8'],
        size: [3, 7],
        rate: 6,
        gravity: 140,
        burst: 18,
      },
      { type: 'dot', size: 7 },
    ],
  },
  confetti: {
    description: 'Confetti bursts on every click.',
    effects: [
      {
        type: 'particles',
        shape: ['square', 'triangle', 'circle'],
        colors: ['#ff5a36', '#ffb13b', '#3b5bff', '#12b886', '#ff3d77'],
        size: [3, 6],
        rate: 0,
        burst: 36,
        burstSpeed: [220, 620],
        gravity: 900,
        drag: 2.2,
        life: [0.9, 1.6],
        fade: false,
      },
      'ring',
      { type: 'dot', stuckScale: 0 },
    ],
  },
  bubbles: {
    description: 'Soft bubbles float up from the pointer.',
    effects: [
      {
        type: 'particles',
        shape: 'circle',
        colors: ['rgba(120, 200, 255, 0.55)', 'rgba(170, 140, 255, 0.5)', 'rgba(255, 255, 255, 0.6)'],
        size: [3, 10],
        rate: 3,
        speed: [5, 25],
        gravity: -120,
        drag: 0.8,
        life: [0.8, 1.6],
        burst: 10,
        burstSpeed: [40, 160],
      },
      { type: 'dot', size: 9 },
    ],
  },
  emoji: {
    description: 'Hearts, sparkles and stars, because why not.',
    effects: [
      {
        type: 'particles',
        shape: ['💖', '✨', '⭐', '🌈'],
        size: [5, 9],
        rate: 2.5,
        speed: [20, 60],
        gravity: 260,
        spin: 120,
        burst: 12,
      },
      { type: 'image', emoji: '👆', size: 30, hotspot: [0.38, 0.1] },
    ],
  },
  spotlight: {
    description: 'The page is dark; your cursor is a torch.',
    effects: ['spotlight', { type: 'dot', color: '#ffffff', size: 6 }],
  },
  glow: {
    description: 'A big soft light lazily follows a small dot.',
    effects: [{ type: 'glow', opacity: 0.45 }, 'dot'],
  },
  snake: {
    description: 'A chain of dots that slithers after the pointer.',
    effects: ['snake'],
  },
  orbit: {
    description: 'Spinning text circles the pointer and turns into labels on hover.',
    effects: ['orbit', 'dot'],
  },
  crosshair: {
    description: 'Precise guide lines with live coordinates.',
    effects: [{ type: 'crosshair', coords: true }, { type: 'dot', size: 5 }],
  },
  comet: {
    description: 'A stretchy blob with a tapered tail.',
    effects: [
      { type: 'trail', width: 14, life: 0.22 },
      { type: 'dot', size: 14, stretch: 0.8, ease: 0.6, states: { pointer: { scale: 2.2 } } },
    ],
  },
};

for (const [name, preset] of Object.entries(BUILT_IN)) registerPreset(name, preset);
