import { Smooth, stateOf } from './shared.js';

/** Any image, SVG, emoji or HTML as the cursor. */
export const image = {
  description: 'Use any image, SVG, emoji or HTML as the cursor — optionally rotating towards the direction of travel.',
  defaults: {
    src: null, // image URL (PNG, SVG, GIF, data: URL…)
    emoji: null, // e.g. '🚀'
    html: null, // trusted HTML string (it is inserted as-is)
    size: 32,
    hotspot: [0.5, 0.5], // the point that sits on the pointer, as fractions of the size
    ease: 1,
    rotate: false, // turn towards the direction of travel
    rotateOffset: 0, // deg, for artwork that does not point right
    opacity: 1,
    blend: null,
    downScale: 0.9,
    states: { pointer: { scale: 1.25 }, text: { scale: 0 } },
  },
  create(ctx) {
    const el = ctx.element('cly-image');
    const s = new Smooth({ x: 0, y: 0, scale: 1, opacity: 0, angle: 0 });
    let content = '';

    function render(o) {
      const key = `${o.src}|${o.emoji}|${o.html}`;
      if (key === content) return;
      content = key;
      el.replaceChildren();
      if (o.src) {
        const img = document.createElement('img');
        img.src = o.src;
        img.alt = '';
        img.draggable = false;
        el.append(img);
      } else if (o.html) {
        el.innerHTML = o.html;
      } else {
        el.textContent = o.emoji || '👆';
      }
    }

    return {
      update(p, dt) {
        const o = ctx.options;
        const state = stateOf(o, p);
        render(o);
        s.frame();
        if (p.jump) s.set({ x: p.x, y: p.y });
        s.to({ x: p.x, y: p.y }, ctx.reducedMotion ? 1 : o.ease, dt);
        s.to({ scale: (state.scale ?? 1) * (p.down ? o.downScale : 1), opacity: p.visible ? o.opacity : 0 }, 0.2, dt);
        if (o.rotate && p.speed > 40 && !ctx.reducedMotion) {
          // Unwrap the target angle so the smoothing always takes the short way round.
          let target = p.angle;
          while (target - s.value.angle > Math.PI) target -= Math.PI * 2;
          while (target - s.value.angle < -Math.PI) target += Math.PI * 2;
          s.to({ angle: target }, 0.2, dt);
        }

        const v = s.value;
        const [hx, hy] = o.hotspot;
        el.style.width = el.style.height = `${o.size}px`;
        el.style.fontSize = `${o.size * 0.85}px`;
        el.style.opacity = v.opacity;
        el.style.transformOrigin = `${hx * 100}% ${hy * 100}%`;
        el.style.transform =
          `translate3d(${v.x - o.size * hx}px, ${v.y - o.size * hy}px, 0) scale(${v.scale})` +
          (o.rotate ? ` rotate(${v.angle + (o.rotateOffset * Math.PI) / 180}rad)` : '');
        return s.busy;
      },
    };
  },
};
