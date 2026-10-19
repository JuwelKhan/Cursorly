import { easeOutCubic } from '../core/math.js';

/** Expanding rings where the user clicks. */
export const ripple = {
  description: 'Expanding rings where you click.',
  defaults: {
    color: null,
    size: 90, // final diameter in px
    duration: 0.6, // seconds
    width: 2,
    fill: 0, // fill opacity inside the ring (0–1)
    rings: 1, // number of rings per click
    delay: 0.1, // seconds between rings
    blend: null,
  },
  create(ctx) {
    const surface = ctx.canvas();
    const ripples = [];

    return {
      update(p, dt) {
        const o = ctx.options;
        const c = surface.ctx;
        surface.clear();
        for (let i = ripples.length - 1; i >= 0; i--) {
          const ripple = ripples[i];
          ripple.age += dt;
          const t = (ripple.age - ripple.delay) / o.duration;
          if (t >= 1) {
            ripples.splice(i, 1);
            continue;
          }
          if (t < 0) continue;
          const radius = Math.max(0.1, (o.size / 2) * easeOutCubic(t));
          c.globalAlpha = 1 - t;
          c.beginPath();
          c.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
          if (o.fill) {
            c.globalAlpha = (1 - t) * o.fill;
            c.fillStyle = ripple.color;
            c.fill();
            c.globalAlpha = 1 - t;
          }
          c.strokeStyle = ripple.color;
          c.lineWidth = o.width * (1 - t * 0.6);
          c.stroke();
        }
        c.globalAlpha = 1;
        return ripples.length > 0;
      },
      down(p) {
        const o = ctx.options;
        for (let i = 0; i < o.rings; i++) {
          ripples.push({ x: p.x, y: p.y, age: 0, delay: i * o.delay, color: ctx.color(p) });
        }
        ctx.request();
      },
    };
  },
};
