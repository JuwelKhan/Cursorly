import { follow } from '../core/math.js';

const NONE = Object.freeze({});

/** The `states[p.state]` entry of an effect's options, or an empty object. */
export const stateOf = (options, p) => (p.state && options.states?.[p.state]) || NONE;

/**
 * A bag of numbers smoothed towards their targets with `follow()`.
 * `busy` is true while any value is still moving.
 */
export class Smooth {
  constructor(values) {
    this.value = { ...values };
    this.busy = false;
    this.#fresh = new Set(Object.keys(values));
  }

  #fresh;

  /** Jumps straight to the given values. */
  set(values) {
    Object.assign(this.value, values);
  }

  /** Moves the given values towards their targets; resets `busy` on the first call of a frame. */
  to(targets, ease, dt) {
    for (const [key, target] of Object.entries(targets)) {
      // The very first target is applied directly so nothing flies in from 0.
      if (this.#fresh.delete(key)) this.value[key] = target;
      const next = follow(this.value[key], target, ease, dt);
      if (next !== target) this.busy = true;
      this.value[key] = next;
    }
  }

  /** Call at the start of every frame. */
  frame() {
    this.busy = false;
  }
}

const parsed = new Map();
let probe;

/** Any CSS colour the canvas understands → [r, g, b, a]. */
export function parseColor(css) {
  if (parsed.has(css)) return parsed.get(css);
  probe ??= document.createElement('canvas').getContext('2d');
  probe.fillStyle = '#000';
  probe.fillStyle = css;
  const value = probe.fillStyle; // normalised to '#rrggbb' or 'rgba(r, g, b, a)'
  const rgba = value.startsWith('#')
    ? [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)).concat(1)
    : value.match(/[\d.]+/g).map(Number);
  if (parsed.size > 256) parsed.clear();
  parsed.set(css, rgba);
  return rgba;
}

/** Colour at position `k` (0–1) of a list of colours. */
export function gradientAt(colors, k) {
  if (colors.length === 1) return colors[0];
  const span = k * (colors.length - 1);
  const i = Math.min(colors.length - 2, Math.floor(span));
  const t = span - i;
  const a = parseColor(colors[i]);
  const b = parseColor(colors[i + 1]);
  const c = a.map((v, n) => v + (b[n] - v) * t);
  return `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${c[3].toFixed(3)})`;
}
