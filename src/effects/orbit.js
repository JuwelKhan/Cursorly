import { Smooth, stateOf } from './shared.js';

let uid = 0;

/** Text running around a circle that spins around the pointer. */
export const orbit = {
  description: 'Text running around a spinning circle — shows data-cursor-text when hovering a labelled element.',
  defaults: {
    text: 'CURSORLY • CUSTOM CURSORS • ',
    radius: 42,
    fontSize: 10.5,
    fontWeight: 600,
    color: null,
    speed: 70, // deg/s, negative spins anti-clockwise
    ease: 0.16,
    useLabel: true, // replace the text with data-cursor-text while hovering
    opacity: 1,
    blend: null,
    downScale: 0.9,
    states: { pointer: { scale: 1.25, speed: 180 }, text: { scale: 0 } },
  },
  create(ctx) {
    const id = `cly-orbit-${++uid}`;
    const NS = 'http://www.w3.org/2000/svg';
    const el = ctx.element('cly-orbit');
    const svg = document.createElementNS(NS, 'svg');
    const path = document.createElementNS(NS, 'path');
    const text = document.createElementNS(NS, 'text');
    const textPath = document.createElementNS(NS, 'textPath');
    path.id = id;
    path.setAttribute('fill', 'none');
    textPath.setAttribute('href', `#${id}`);
    text.append(textPath);
    svg.append(path, text);
    el.append(svg);

    const s = new Smooth({ x: 0, y: 0, scale: 1, opacity: 0 });
    let rotation = 0;
    let shape = '';
    let content = '';
    let color = '';

    function layout(o) {
      const key = `${o.radius}|${o.fontSize}|${o.fontWeight}`;
      if (key === shape) return;
      shape = key;
      const r = o.radius;
      const box = r + o.fontSize * 1.5;
      svg.setAttribute('viewBox', `${-box} ${-box} ${box * 2} ${box * 2}`);
      svg.setAttribute('width', box * 2);
      svg.setAttribute('height', box * 2);
      path.setAttribute('d', `M ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0`);
      text.setAttribute('font-size', o.fontSize);
      text.setAttribute('font-weight', o.fontWeight);
      textPath.setAttribute('textLength', (Math.PI * 2 * r).toFixed(2));
      textPath.setAttribute('lengthAdjust', 'spacing');
      content = '';
    }

    function setText(o, value) {
      // Repeat short labels so they wrap the whole circle.
      const perChar = o.fontSize * 0.68;
      const repeat = Math.max(1, Math.round((Math.PI * 2 * o.radius) / (value.length * perChar)));
      const next = value.repeat(repeat);
      if (next !== content) textPath.textContent = content = next;
    }

    return {
      update(p, dt) {
        const o = ctx.options;
        const state = stateOf(o, p);
        layout(o);
        setText(o, o.useLabel && p.text ? `${p.text} • ` : o.text);
        const nextColor = ctx.color(p, state);
        if (nextColor !== color) text.setAttribute('fill', (color = nextColor));

        s.frame();
        if (p.jump) s.set({ x: p.x, y: p.y });
        s.to({ x: p.x, y: p.y }, ctx.reducedMotion ? 1 : o.ease, dt);
        s.to({ scale: (state.scale ?? 1) * (p.down ? o.downScale : 1), opacity: p.visible ? o.opacity : 0 }, 0.18, dt);
        const spinning = !ctx.reducedMotion && s.value.opacity > 0;
        if (spinning) rotation = (rotation + (state.speed ?? o.speed) * dt) % 360;

        const v = s.value;
        el.style.opacity = v.opacity;
        el.style.transform = `translate3d(${v.x}px, ${v.y}px, 0) translate(-50%, -50%) rotate(${rotation}deg) scale(${v.scale})`;
        return s.busy || spinning;
      },
    };
  },
};
