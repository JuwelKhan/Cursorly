import { DEG, pick, random } from '../core/math.js';

/** Unit shapes (radius 1, centred on 0,0). Anything else is drawn as text, so emoji work too. */
const SHAPES = {
  circle: () => {
    const path = new Path2D();
    path.arc(0, 0, 1, 0, Math.PI * 2);
    return path;
  },
  square: () => {
    const path = new Path2D();
    path.rect(-0.8, -0.8, 1.6, 1.6);
    return path;
  },
  triangle: () => new Path2D('M0 -1.1 L0.95 0.65 L-0.95 0.65 Z'),
  star: () => {
    const path = new Path2D();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.45 : 1.15;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      path.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    path.closePath();
    return path;
  },
  heart: () => new Path2D('M0 0.95 C-1.4 -0.05 -0.95 -1.25 0 -0.5 C0.95 -1.25 1.4 -0.05 0 0.95 Z'),
  spark: () => new Path2D('M0 -1.3 Q0.15 -0.15 1.3 0 Q0.15 0.15 0 1.3 Q-0.15 0.15 -1.3 0 Q-0.15 -0.15 0 -1.3 Z'),
};
const paths = new Map();
const pathFor = (shape) => {
  if (!SHAPES[shape]) return null;
  if (!paths.has(shape)) paths.set(shape, SHAPES[shape]());
  return paths.get(shape);
};

/**
 * Particles emitted while the pointer moves and/or in a burst on click:
 * sparkles, confetti, bubbles, emoji…
 */
export const particles = {
  description: 'Particles emitted while moving and/or in a burst on click — circles, stars, hearts, confetti or any emoji.',
  defaults: {
    shape: 'circle', // circle | square | triangle | star | heart | spark | any text/emoji — or an array to mix
    colors: null, // array of colours; defaults to the cursor colour + accent
    size: [2, 6], // radius in px
    rate: 5, // particles per 100 px of movement (0 = only bursts)
    life: [0.5, 1.1], // seconds
    speed: [10, 70], // px/s, random direction
    inherit: 0.12, // share of the pointer's velocity passed on to particles
    gravity: 0, // px/s², positive falls down
    drag: 1.6, // velocity damping per second
    spin: 240, // max rotation speed in deg/s
    fade: true,
    shrink: true,
    burst: 0, // particles per click
    burstSpeed: [160, 460],
    max: 350,
    blend: null,
    composite: null, // canvas globalCompositeOperation, e.g. 'lighter'
  },
  create(ctx) {
    const surface = ctx.canvas();
    const list = [];
    let travelled = 0;
    let last = null;

    function emit(o, p, x, y, speedRange, inherit) {
      if (list.length >= o.max) list.shift();
      const angle = Math.random() * Math.PI * 2;
      const speed = random(speedRange);
      const colors = o.colors?.length ? o.colors : [ctx.color(p), ctx.accent];
      list.push({
        x,
        y,
        vx: Math.cos(angle) * speed + p.vx * inherit,
        vy: Math.sin(angle) * speed + p.vy * inherit,
        size: random(o.size),
        life: random(o.life),
        age: 0,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() * 2 - 1) * o.spin * DEG,
        shape: pick(o.shape),
        color: pick(colors),
      });
    }

    function draw(o, part) {
      const c = surface.ctx;
      const t = part.age / part.life;
      const scale = part.size * (o.shrink ? 1 - t * 0.85 : 1);
      c.globalAlpha = o.fade ? Math.min(1, (1 - t) * 1.6) : 1;
      c.setTransform(surface.dpr * scale, 0, 0, surface.dpr * scale, surface.dpr * part.x, surface.dpr * part.y);
      c.rotate(part.rotation);
      const path = pathFor(part.shape);
      if (path) {
        c.fillStyle = part.color;
        c.fill(path);
      } else {
        c.fillStyle = part.color;
        c.scale(0.1, 0.1); // render text at 20px and scale, small font sizes rasterise badly
        c.font = '20px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(part.shape, 0, 0);
      }
    }

    return {
      update(p, dt) {
        const o = ctx.options;
        const reduced = ctx.reducedMotion;

        if (p.jump || !p.visible) last = null;
        if (p.visible && o.rate > 0 && !reduced) {
          if (last) {
            const dx = p.x - last.x;
            const dy = p.y - last.y;
            const distance = Math.hypot(dx, dy);
            travelled += (distance * o.rate) / 100;
            const count = Math.floor(travelled);
            travelled -= count;
            for (let i = 1; i <= count; i++) {
              const k = i / count;
              emit(o, p, last.x + dx * k, last.y + dy * k, o.speed, o.inherit);
            }
          }
          last = { x: p.x, y: p.y };
        }

        surface.clear();
        if (!list.length) return false;

        const c = surface.ctx;
        c.save();
        if (o.composite) c.globalCompositeOperation = o.composite;
        const damping = Math.exp(-o.drag * dt);
        for (let i = list.length - 1; i >= 0; i--) {
          const part = list[i];
          part.age += dt;
          if (part.age >= part.life) {
            list.splice(i, 1);
            continue;
          }
          part.vx *= damping;
          part.vy = part.vy * damping + o.gravity * dt;
          part.x += part.vx * dt;
          part.y += part.vy * dt;
          part.rotation += part.spin * dt;
          draw(o, part);
        }
        c.restore();
        return true;
      },
      down(p) {
        const o = ctx.options;
        const count = ctx.reducedMotion ? Math.min(o.burst, 6) : o.burst;
        for (let i = 0; i < count; i++) emit(o, p, p.x, p.y, o.burstSpeed, 0);
        if (count) ctx.request();
      },
      destroy() {
        list.length = 0;
      },
    };
  },
};
