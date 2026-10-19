export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Frame-rate independent smoothing. `ease` is the share of the remaining
 * distance covered per 60 fps frame (1 = jump straight to the target).
 */
export function follow(current, target, ease, dt) {
  if (ease >= 1 || !Number.isFinite(current)) return target;
  if (ease <= 0) return current;
  const next = current + (target - current) * (1 - Math.pow(1 - ease, dt * 60));
  return Math.abs(target - next) < 1e-3 ? target : next;
}

/** A number, or a random number inside a `[min, max]` pair. */
export const random = (value) => (Array.isArray(value) ? value[0] + (value[1] - value[0]) * Math.random() : value);

/** A value, or a random item of an array. */
export const pick = (value) => (Array.isArray(value) ? value[Math.floor(Math.random() * value.length)] : value);

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export const DEG = Math.PI / 180;
