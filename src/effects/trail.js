import { gradientAt } from './shared.js';

/**
 * A smooth ribbon drawn behind the pointer on a canvas. Points expire after
 * `life` seconds, so the ribbon is long when you move fast and shrinks back
 * into the pointer when you stop.
 */
export const trail = {
  description: 'Smooth tapered ribbon behind the pointer — one colour, a gradient or a rainbow, with optional glow.',
  defaults: {
    color: null, // a colour, an array of colours (tail → head) or 'rainbow'
    width: 6,
    life: 0.32, // seconds a point stays on the ribbon
    maxPoints: 80,
    taper: true, // thin tail, full-width head
    glow: 0, // shadow blur in px
    opacity: 1,
    blend: null, // mix-blend-mode of the layer, e.g. 'screen'
    composite: null, // canvas globalCompositeOperation, e.g. 'lighter'
  },
  create(ctx) {
    const surface = ctx.canvas();
    const points = [];

    function colorAt(o, p, k) {
      const { color } = o;
      if (color === 'rainbow') return `hsl(${(p.time * 140 + k * 160) % 360} 95% 60%)`;
      if (Array.isArray(color)) return gradientAt(color, k);
      return color || ctx.color(p);
    }

    return {
      update(p, dt) {
        const o = ctx.options;
        const c = surface.ctx;
        const life = ctx.reducedMotion ? Math.min(o.life, 0.08) : o.life;

        if (p.jump) points.length = 0;
        if (p.visible) {
          const last = points[points.length - 1];
          if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 0.5) points.push({ x: p.x, y: p.y, t: p.time });
        }
        while (points.length && (p.time - points[0].t > life || points.length > o.maxPoints)) points.shift();

        surface.clear();
        if (points.length < 2) return points.length > 0;

        c.save();
        c.globalAlpha = o.opacity;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        if (o.composite) c.globalCompositeOperation = o.composite;
        const n = points.length;
        for (let i = 1; i < n; i++) {
          const k = i / (n - 1);
          const prev = points[i - 1];
          const point = points[i];
          const start = i === 1 ? prev : { x: (points[i - 2].x + prev.x) / 2, y: (points[i - 2].y + prev.y) / 2 };
          const end = i === n - 1 ? point : { x: (prev.x + point.x) / 2, y: (prev.y + point.y) / 2 };
          const color = colorAt(o, p, k);
          c.strokeStyle = color;
          c.lineWidth = Math.max(0.5, o.width * (o.taper ? k : 1));
          if (o.glow) {
            c.shadowColor = color;
            c.shadowBlur = o.glow;
          }
          c.beginPath();
          c.moveTo(start.x, start.y);
          c.quadraticCurveTo(prev.x, prev.y, end.x, end.y);
          c.stroke();
        }
        c.restore();
        return true;
      },
    };
  },
};
