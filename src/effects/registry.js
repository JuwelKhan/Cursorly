const effects = new Map();

/**
 * Registers an effect. `definition` is either a `create(ctx)` function or
 * `{ create(ctx), defaults?, description? }`. `create` returns an object with
 * any of `update(p, dt)`, `down(p)`, `up(p)`, `resize()`, `destroy()`.
 */
export function registerEffect(name, definition) {
  if (typeof name !== 'string' || !name) throw new TypeError('Cursorly: an effect name must be a non-empty string.');
  const def = typeof definition === 'function' ? { create: definition } : definition;
  if (!def || typeof def.create !== 'function') {
    throw new TypeError(`Cursorly: effect "${name}" needs a create(ctx) function.`);
  }
  const effect = Object.freeze({
    name,
    description: def.description || '',
    defaults: Object.freeze({ ...def.defaults }),
    create: def.create,
  });
  effects.set(name, effect);
  return effect;
}

export const getEffect = (name) => effects.get(name) || null;

export const listEffects = () => [...effects.keys()];
