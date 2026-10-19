import { Smooth, stateOf } from './shared.js';

/** Darkens the page except for a soft circle around the pointer. */
export const spotlight = {
  description: 'Darkens the page except for a soft circle of light around the pointer.',
  defaults: {
    radius: 170,
    softness: 0.45, // share of the radius used for the soft edge (0–1)
    color: 'rgba(6, 6, 10, 0.88)', // colour of the darkness
    ease: 0.2,
    downScale: 0.92,
    states: { pointer: { scale: 1.3 }, text: { scale: 1 } },
    blend: null,
  },
  create(ctx) {
    const el = ctx.element('cly-spotlight');
    const s = new Smooth({ x: 0, y: 0, r: 0, opacity: 0 });

    return {
      update(p, dt) {
        const o = ctx.options;
        const state = stateOf(o, p);
        s.frame();
        if (p.jump) s.set({ x: p.x, y: p.y });
        s.to({ x: p.x, y: p.y }, ctx.reducedMotion ? 1 : o.ease, dt);
        s.to({ r: o.radius * (state.scale ?? 1) * (p.down ? o.downScale : 1), opacity: p.visible ? 1 : 0 }, 0.15, dt);
        const v = s.value;
        el.style.opacity = v.opacity;
        el.style.background = `radial-gradient(circle at ${v.x}px ${v.y}px, transparent ${v.r * (1 - o.softness)}px, ${state.color ?? o.color} ${v.r}px)`;
        return s.busy;
      },
    };
  },
};
