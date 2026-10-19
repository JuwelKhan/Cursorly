import { clamp } from '../core/math.js';
import { Smooth, stateOf } from './shared.js';

/**
 * One DOM shape that follows the pointer. `dot`, `ring` and `blob` are the
 * same engine with different defaults:
 *   - grows/shrinks per state (`states.pointer.scale`, …) and while pressed
 *   - optional outline (`border`) with a fill that fades in (`fill`)
 *   - optional squash & stretch along the direction of travel (`stretch`)
 *   - optional label from data-cursor-text (`label`)
 *   - optional morph around [data-cursor-stick] elements (`stick`)
 */
const BASE = {
  size: 10,
  color: null,
  ease: 1, // position smoothing; lower = lazier
  sizeEase: 0.2, // smoothing for size, fill and opacity
  border: 0, // > 0 draws an outline of this width instead of a filled disc
  fill: 0, // fill opacity behind the outline (0–1)
  opacity: 1,
  blend: null, // mix-blend-mode, e.g. 'difference'
  stretch: 0, // 0–1 squash & stretch with speed
  downScale: 0.8,
  label: false, // show data-cursor-text inside the shape
  labelSize: 84,
  labelColor: '#fff',
  labelScale: 1, // scale when another effect shows the label (0 hides this shape)
  stuckScale: 1, // scale while another effect wraps a [data-cursor-stick] element
  stick: false, // wrap [data-cursor-stick] elements
  stickPadding: 6,
  stickFill: 0.08,
  states: {
    pointer: { scale: 1.5 },
    text: { scale: 0 },
  },
};

export function shape(name, description, defaults) {
  return {
    description,
    defaults: { ...BASE, ...defaults, states: { ...BASE.states, ...defaults.states } },
    create(ctx) {
      const el = ctx.element(`cly-shape cly-${name}`);
      const label = document.createElement('span');
      label.className = 'cly-shape__label';
      el.append(label);

      const s = new Smooth({ x: 0, y: 0, w: 0, h: 0, r: 0, fill: 0, opacity: 0, label: 0, stretch: 0 });
      let angle = 0;
      let color = '';
      let labelText = '';

      return {
        update(p, dt) {
          const o = ctx.options;
          s.frame();
          const state = stateOf(o, p);
          const reduced = ctx.reducedMotion;
          const showLabel = Boolean(o.label && p.text);
          const stuck = Boolean(o.stick && p.rect && !showLabel);

          let scale = state.scale ?? 1;
          if (p.text && !o.label) scale *= o.labelScale;
          if (p.rect && !o.stick) scale *= o.stuckScale;
          if (p.down) scale *= o.downScale;

          let { x, y } = p;
          let w = o.size * scale;
          let h = w;
          let r = w / 2;
          let fill = state.fill ?? o.fill;

          if (showLabel) {
            w = h = o.labelSize * (p.down ? o.downScale : 1);
            r = w / 2;
            fill = 1;
          } else if (stuck) {
            const { left, top, width, height } = p.rect;
            const cx = left + width / 2;
            const cy = top + height / 2;
            x = cx + (p.x - cx) * 0.08;
            y = cy + (p.y - cy) * 0.08;
            w = width + o.stickPadding * 2;
            h = height + o.stickPadding * 2;
            r = Math.min(p.radius + o.stickPadding, w / 2, h / 2);
            fill = state.fill ?? o.stickFill;
          }

          const positionEase = reduced ? 1 : stuck ? Math.min(o.ease, 0.25) : o.ease;
          if (p.jump) s.set({ x, y });
          s.to({ x, y }, positionEase, dt);
          s.to(
            {
              w,
              h,
              r,
              fill: o.border ? fill : 1,
              opacity: p.visible ? (state.opacity ?? o.opacity) : 0,
              label: showLabel ? 1 : 0,
              stretch: stuck || reduced ? 0 : clamp(p.speed / 2400, 0, 1) * o.stretch,
            },
            o.sizeEase,
            dt,
          );
          if (p.speed > 30) angle = p.angle;

          const nextColor = ctx.color(p, state);
          if (nextColor !== color) {
            color = nextColor;
            el.style.setProperty('--cly-c', color);
          }
          if (showLabel && p.text !== labelText) {
            labelText = p.text;
            label.textContent = labelText;
          }

          const v = s.value;
          const st = v.stretch;
          el.style.width = `${v.w}px`;
          el.style.height = `${v.h}px`;
          el.style.borderRadius = `${v.r}px`;
          // A shrinking ring must not leave its border behind (browsers round thin borders up to 1px).
          el.style.borderWidth = `${Math.min(v.w, v.h) < 2 ? 0 : Math.min(o.border, v.w / 2, v.h / 2)}px`;
          el.style.opacity = v.opacity;
          el.style.setProperty('--cly-fill', v.fill);
          el.style.setProperty('--cly-label', o.labelColor);
          label.style.opacity = v.label;
          el.style.transform =
            `translate3d(${v.x - v.w / 2}px, ${v.y - v.h / 2}px, 0)` +
            (st > 0.001 ? ` rotate(${angle}rad) scale(${1 + st}, ${1 - st * 0.45}) rotate(${-angle}rad)` : '');

          return s.busy || st > 0.001;
        },
      };
    },
  };
}

export const dot = shape('dot', 'Small filled dot that sits exactly on the pointer.', {
  size: 8,
  ease: 1,
  labelScale: 0,
  states: { pointer: { scale: 0.5 } },
});

export const ring = shape('ring', 'Outlined circle that trails the pointer, fills on hover, shows labels and wraps sticky elements.', {
  size: 38,
  ease: 0.17,
  border: 1.5,
  label: true,
  stick: true,
  downScale: 0.85,
  states: { pointer: { scale: 1.6, fill: 0.12 } },
});

export const blob = shape('blob', 'Soft disc that inverts whatever is under it (mix-blend-mode: difference) and stretches with speed.', {
  size: 26,
  ease: 0.2,
  color: '#ffffff',
  blend: 'difference',
  stretch: 0.6,
  label: true,
  labelSize: 96,
  labelColor: '#000000',
  states: { pointer: { scale: 3 }, text: { scale: 0.4 } },
});
