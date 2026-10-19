import { follow } from '../core/math.js';

/**
 * Pulls [data-cursor-magnetic] elements towards the pointer while hovered and
 * eases them back on leave. Uses the CSS `translate` property, so the
 * element's own `transform` is left alone.
 *
 *   <button data-cursor-magnetic>…</button>          default strength
 *   <button data-cursor-magnetic="0.6">…</button>    stronger pull
 */
export function createMagnetic(getOptions) {
  const moving = new Map(); // element → { x, y }
  let active = null;

  return {
    /** Called whenever the hovered element changes. */
    hover(el) {
      if (el === active) return;
      active = el; // the previous element stays in `moving` until it has eased back
      if (el && !moving.has(el)) moving.set(el, { x: 0, y: 0 });
    },

    update(p, dt) {
      const { magnetic, magneticStrength } = getOptions();
      let busy = false;
      for (const [el, offset] of moving) {
        let tx = 0;
        let ty = 0;
        if (el === active && magnetic && p.visible && !p.reducedMotion) {
          const raw = parseFloat(el.dataset.cursorMagnetic);
          const strength = Number.isFinite(raw) ? raw : magneticStrength;
          const rect = el.getBoundingClientRect();
          // Measure from the element's resting position, not where it has been pulled to.
          const cx = rect.left + rect.width / 2 - offset.x;
          const cy = rect.top + rect.height / 2 - offset.y;
          tx = (p.x - cx) * strength;
          ty = (p.y - cy) * strength;
        }
        offset.x = follow(offset.x, tx, 0.18, dt);
        offset.y = follow(offset.y, ty, 0.18, dt);
        if (offset.x === 0 && offset.y === 0 && el !== active) {
          el.style.removeProperty('translate');
          moving.delete(el);
          continue;
        }
        el.style.translate = `${offset.x.toFixed(2)}px ${offset.y.toFixed(2)}px`;
        if (offset.x !== tx || offset.y !== ty) busy = true;
      }
      return busy;
    },

    /** Puts every element straight back. */
    reset() {
      for (const el of moving.keys()) el.style.removeProperty('translate');
      moving.clear();
      active = null;
    },
  };
}
