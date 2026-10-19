import { Smooth, stateOf } from './shared.js';

/** A large, soft, lazily following light. */
export const glow = {
  description: 'Large soft light that lazily follows the pointer — great on dark pages.',
  defaults: {
    size: 420,
    color: null, // defaults to the cursor accent colour
    opacity: 0.35,
    ease: 0.07,
    blend: null, // e.g. 'screen' on dark pages, 'multiply' on light ones
    states: { pointer: { scale: 1.2 }, text: { scale: 0.8 } },
  },
  create(ctx) {
    const el = ctx.element('cly-glow');
    const s = new Smooth({ x: 0, y: 0, size: 0, opacity: 0 });
    let color = '';

    return {
      update(p, dt) {
        const o = ctx.options;
        const state = stateOf(o, p);
        s.frame();
        if (p.jump) s.set({ x: p.x, y: p.y });
        s.to({ x: p.x, y: p.y }, ctx.reducedMotion ? 1 : o.ease, dt);
        s.to({ size: o.size * (state.scale ?? 1), opacity: p.visible ? (state.opacity ?? o.opacity) : 0 }, 0.08, dt);
        const next = p.color || state.color || o.color || ctx.accent;
        if (next !== color) el.style.setProperty('--cly-c', (color = next));
        const v = s.value;
        el.style.width = el.style.height = `${v.size}px`;
        el.style.opacity = v.opacity;
        el.style.transform = `translate3d(${v.x - v.size / 2}px, ${v.y - v.size / 2}px, 0)`;
        return s.busy;
      },
    };
  },
};
