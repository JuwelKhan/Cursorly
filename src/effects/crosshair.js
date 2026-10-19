import { Smooth, stateOf } from './shared.js';

/** Full-width and full-height guide lines through the pointer. */
export const crosshair = {
  description: 'Full-screen guide lines through the pointer, with an optional coordinates read-out.',
  defaults: {
    color: null,
    width: 1,
    gap: 12, // empty space around the pointer
    opacity: 0.55,
    ease: 1,
    coords: false, // show "x, y" next to the pointer
    blend: null,
    states: { pointer: { gap: 22 }, text: { opacity: 0.25 } },
  },
  create(ctx) {
    const h = ctx.element('cly-crosshair cly-crosshair--h');
    const v = ctx.element('cly-crosshair cly-crosshair--v');
    const label = ctx.element('cly-crosshair__coords');
    const s = new Smooth({ x: 0, y: 0, gap: 0, opacity: 0 });
    let color = '';

    return {
      update(p, dt) {
        const o = ctx.options;
        const state = stateOf(o, p);
        s.frame();
        if (p.jump) s.set({ x: p.x, y: p.y });
        s.to({ x: p.x, y: p.y }, ctx.reducedMotion ? 1 : o.ease, dt);
        s.to({ gap: state.gap ?? o.gap, opacity: p.visible ? (state.opacity ?? o.opacity) : 0 }, 0.2, dt);
        const nextColor = ctx.color(p, state);
        if (nextColor !== color) ctx.layer.style.setProperty('--cly-c', (color = nextColor));

        const { x, y, gap, opacity } = s.value;
        ctx.layer.style.setProperty('--cly-x', `${x}px`);
        ctx.layer.style.setProperty('--cly-y', `${y}px`);
        ctx.layer.style.setProperty('--cly-gap', `${gap}px`);
        ctx.layer.style.setProperty('--cly-w', `${o.width}px`);
        ctx.layer.style.opacity = opacity;
        h.style.transform = `translate3d(0, ${y - o.width / 2}px, 0)`;
        v.style.transform = `translate3d(${x - o.width / 2}px, 0, 0)`;
        label.hidden = !o.coords;
        if (o.coords) {
          label.textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;
          label.style.transform = `translate3d(${x + 14}px, ${y + 14}px, 0)`;
        }
        return s.busy;
      },
    };
  },
};
