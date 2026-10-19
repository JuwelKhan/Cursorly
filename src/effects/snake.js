import { Smooth, gradientAt, stateOf } from './shared.js';

/** A chain of dots, each one following the one in front of it. */
export const snake = {
  description: 'A chain of dots that slithers after the pointer, each one following the one ahead.',
  defaults: {
    count: 14,
    size: 16,
    colors: null, // gradient from head to tail; defaults to cursor colour → accent
    ease: 0.5, // how tightly each dot follows the one ahead
    tail: 0.25, // size of the last dot relative to the head
    opacity: 1,
    blend: null,
    downScale: 0.8,
    states: { pointer: { scale: 1.5 }, text: { scale: 0 } },
  },
  create(ctx) {
    let dots = [];
    let built = '';
    const s = new Smooth({ scale: 1, opacity: 0 });

    function build(o, p) {
      const colors = o.colors?.length ? o.colors : [ctx.color(p), ctx.accent];
      const key = `${o.count}|${colors.join()}`;
      if (key === built) return;
      built = key;
      const previous = dots;
      dots.forEach((dot) => dot.el.remove());
      dots = Array.from({ length: o.count }, (_, i) => {
        const el = ctx.element('cly-snake__dot');
        const k = o.count > 1 ? i / (o.count - 1) : 0;
        el.style.background = gradientAt(colors, k);
        el.style.zIndex = String(o.count - i);
        const old = previous[i] || previous[previous.length - 1];
        return { el, k, x: old?.x ?? p.x, y: old?.y ?? p.y };
      });
    }

    return {
      update(p, dt) {
        const o = ctx.options;
        const state = stateOf(o, p);
        build(o, p);
        s.frame();
        s.to({ scale: (state.scale ?? 1) * (p.down ? o.downScale : 1), opacity: p.visible ? o.opacity : 0 }, 0.2, dt);

        let busy = s.busy;
        let leadX = p.x;
        let leadY = p.y;
        for (const dot of dots) {
          if (p.jump || ctx.reducedMotion) {
            dot.x = leadX;
            dot.y = leadY;
          } else {
            const t = 1 - Math.pow(1 - o.ease, dt * 60);
            dot.x += (leadX - dot.x) * t;
            dot.y += (leadY - dot.y) * t;
          }
          if (Math.abs(dot.x - leadX) > 0.05 || Math.abs(dot.y - leadY) > 0.05) busy = true;
          const size = o.size * (1 - dot.k * (1 - o.tail)) * s.value.scale;
          dot.el.style.width = dot.el.style.height = `${size}px`;
          dot.el.style.opacity = s.value.opacity;
          dot.el.style.transform = `translate3d(${dot.x - size / 2}px, ${dot.y - size / 2}px, 0)`;
          leadX = dot.x;
          leadY = dot.y;
        }
        return busy;
      },
    };
  },
};
