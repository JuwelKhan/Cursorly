/*! Cursorly v0.9.0 | MIT License | https://github.com/JuwelKhan/Cursorly */
var Cursorly = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/browser.js
  var browser_exports = {};
  __export(browser_exports, {
    default: () => browser_default
  });

  // src/effects/registry.js
  var effects = /* @__PURE__ */ new Map();
  function registerEffect(name, definition) {
    if (typeof name !== "string" || !name) throw new TypeError("Cursorly: an effect name must be a non-empty string.");
    const def = typeof definition === "function" ? { create: definition } : definition;
    if (!def || typeof def.create !== "function") {
      throw new TypeError(`Cursorly: effect "${name}" needs a create(ctx) function.`);
    }
    const effect = Object.freeze({
      name,
      description: def.description || "",
      defaults: Object.freeze({ ...def.defaults }),
      create: def.create
    });
    effects.set(name, effect);
    return effect;
  }
  var getEffect = (name) => effects.get(name) || null;
  var listEffects = () => [...effects.keys()];

  // src/core/math.js
  var clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  function follow(current, target, ease, dt) {
    if (ease >= 1 || !Number.isFinite(current)) return target;
    if (ease <= 0) return current;
    const next = current + (target - current) * (1 - Math.pow(1 - ease, dt * 60));
    return Math.abs(target - next) < 1e-3 ? target : next;
  }
  var random = (value) => Array.isArray(value) ? value[0] + (value[1] - value[0]) * Math.random() : value;
  var pick = (value) => Array.isArray(value) ? value[Math.floor(Math.random() * value.length)] : value;
  var easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  var DEG = Math.PI / 180;

  // src/effects/shared.js
  var NONE = Object.freeze({});
  var stateOf = (options, p) => p.state && options.states?.[p.state] || NONE;
  var Smooth = class {
    constructor(values) {
      this.value = { ...values };
      this.busy = false;
      this.#fresh = new Set(Object.keys(values));
    }
    #fresh;
    /** Jumps straight to the given values. */
    set(values) {
      Object.assign(this.value, values);
    }
    /** Moves the given values towards their targets; resets `busy` on the first call of a frame. */
    to(targets, ease, dt) {
      for (const [key, target] of Object.entries(targets)) {
        if (this.#fresh.delete(key)) this.value[key] = target;
        const next = follow(this.value[key], target, ease, dt);
        if (next !== target) this.busy = true;
        this.value[key] = next;
      }
    }
    /** Call at the start of every frame. */
    frame() {
      this.busy = false;
    }
  };
  var parsed = /* @__PURE__ */ new Map();
  var probe;
  function parseColor(css) {
    if (parsed.has(css)) return parsed.get(css);
    probe ??= document.createElement("canvas").getContext("2d");
    probe.fillStyle = "#000";
    probe.fillStyle = css;
    const value = probe.fillStyle;
    const rgba = value.startsWith("#") ? [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)).concat(1) : value.match(/[\d.]+/g).map(Number);
    if (parsed.size > 256) parsed.clear();
    parsed.set(css, rgba);
    return rgba;
  }
  function gradientAt(colors, k) {
    if (colors.length === 1) return colors[0];
    const span = k * (colors.length - 1);
    const i = Math.min(colors.length - 2, Math.floor(span));
    const t = span - i;
    const a = parseColor(colors[i]);
    const b = parseColor(colors[i + 1]);
    const c = a.map((v, n) => v + (b[n] - v) * t);
    return `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${c[3].toFixed(3)})`;
  }

  // src/effects/shape.js
  var BASE = {
    size: 10,
    color: null,
    ease: 1,
    // position smoothing; lower = lazier
    sizeEase: 0.2,
    // smoothing for size, fill and opacity
    border: 0,
    // > 0 draws an outline of this width instead of a filled disc
    fill: 0,
    // fill opacity behind the outline (0–1)
    opacity: 1,
    blend: null,
    // mix-blend-mode, e.g. 'difference'
    stretch: 0,
    // 0–1 squash & stretch with speed
    downScale: 0.8,
    label: false,
    // show data-cursor-text inside the shape
    labelSize: 84,
    labelColor: "#fff",
    labelScale: 1,
    // scale when another effect shows the label (0 hides this shape)
    stuckScale: 1,
    // scale while another effect wraps a [data-cursor-stick] element
    stick: false,
    // wrap [data-cursor-stick] elements
    stickPadding: 6,
    stickFill: 0.08,
    states: {
      pointer: { scale: 1.5 },
      text: { scale: 0 }
    }
  };
  function shape(name, description, defaults) {
    return {
      description,
      defaults: { ...BASE, ...defaults, states: { ...BASE.states, ...defaults.states } },
      create(ctx) {
        const el = ctx.element(`cly-shape cly-${name}`);
        const label = document.createElement("span");
        label.className = "cly-shape__label";
        el.append(label);
        const s = new Smooth({ x: 0, y: 0, w: 0, h: 0, r: 0, fill: 0, opacity: 0, label: 0, stretch: 0 });
        let angle = 0;
        let color = "";
        let labelText = "";
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
                opacity: p.visible ? state.opacity ?? o.opacity : 0,
                label: showLabel ? 1 : 0,
                stretch: stuck || reduced ? 0 : clamp(p.speed / 2400, 0, 1) * o.stretch
              },
              o.sizeEase,
              dt
            );
            if (p.speed > 30) angle = p.angle;
            const nextColor = ctx.color(p, state);
            if (nextColor !== color) {
              color = nextColor;
              el.style.setProperty("--cly-c", color);
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
            el.style.borderWidth = `${Math.min(v.w, v.h) < 2 ? 0 : Math.min(o.border, v.w / 2, v.h / 2)}px`;
            el.style.opacity = v.opacity;
            el.style.setProperty("--cly-fill", v.fill);
            el.style.setProperty("--cly-label", o.labelColor);
            label.style.opacity = v.label;
            el.style.transform = `translate3d(${v.x - v.w / 2}px, ${v.y - v.h / 2}px, 0)` + (st > 1e-3 ? ` rotate(${angle}rad) scale(${1 + st}, ${1 - st * 0.45}) rotate(${-angle}rad)` : "");
            return s.busy || st > 1e-3;
          }
        };
      }
    };
  }
  var dot = shape("dot", "Small filled dot that sits exactly on the pointer.", {
    size: 8,
    ease: 1,
    labelScale: 0,
    states: { pointer: { scale: 0.5 } }
  });
  var ring = shape("ring", "Outlined circle that trails the pointer, fills on hover, shows labels and wraps sticky elements.", {
    size: 38,
    ease: 0.17,
    border: 1.5,
    label: true,
    stick: true,
    downScale: 0.85,
    states: { pointer: { scale: 1.6, fill: 0.12 } }
  });
  var blob = shape("blob", "Soft disc that inverts whatever is under it (mix-blend-mode: difference) and stretches with speed.", {
    size: 26,
    ease: 0.2,
    color: "#ffffff",
    blend: "difference",
    stretch: 0.6,
    label: true,
    labelSize: 96,
    labelColor: "#000000",
    states: { pointer: { scale: 3 }, text: { scale: 0.4 } }
  });

  // src/effects/trail.js
  var trail = {
    description: "Smooth tapered ribbon behind the pointer \u2014 one colour, a gradient or a rainbow, with optional glow.",
    defaults: {
      color: null,
      // a colour, an array of colours (tail → head) or 'rainbow'
      width: 6,
      life: 0.32,
      // seconds a point stays on the ribbon
      maxPoints: 80,
      taper: true,
      // thin tail, full-width head
      glow: 0,
      // shadow blur in px
      opacity: 1,
      blend: null,
      // mix-blend-mode of the layer, e.g. 'screen'
      composite: null
      // canvas globalCompositeOperation, e.g. 'lighter'
    },
    create(ctx) {
      const surface = ctx.canvas();
      const points = [];
      function colorAt(o, p, k) {
        const { color } = o;
        if (color === "rainbow") return `hsl(${(p.time * 140 + k * 160) % 360} 95% 60%)`;
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
          c.lineCap = "round";
          c.lineJoin = "round";
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
        }
      };
    }
  };

  // src/effects/particles.js
  var SHAPES = {
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
    triangle: () => new Path2D("M0 -1.1 L0.95 0.65 L-0.95 0.65 Z"),
    star: () => {
      const path = new Path2D();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.45 : 1.15;
        const a = i * Math.PI / 5 - Math.PI / 2;
        path.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      path.closePath();
      return path;
    },
    heart: () => new Path2D("M0 0.95 C-1.4 -0.05 -0.95 -1.25 0 -0.5 C0.95 -1.25 1.4 -0.05 0 0.95 Z"),
    spark: () => new Path2D("M0 -1.3 Q0.15 -0.15 1.3 0 Q0.15 0.15 0 1.3 Q-0.15 0.15 -1.3 0 Q-0.15 -0.15 0 -1.3 Z")
  };
  var paths = /* @__PURE__ */ new Map();
  var pathFor = (shape2) => {
    if (!SHAPES[shape2]) return null;
    if (!paths.has(shape2)) paths.set(shape2, SHAPES[shape2]());
    return paths.get(shape2);
  };
  var particles = {
    description: "Particles emitted while moving and/or in a burst on click \u2014 circles, stars, hearts, confetti or any emoji.",
    defaults: {
      shape: "circle",
      // circle | square | triangle | star | heart | spark | any text/emoji — or an array to mix
      colors: null,
      // array of colours; defaults to the cursor colour + accent
      size: [2, 6],
      // radius in px
      rate: 5,
      // particles per 100 px of movement (0 = only bursts)
      life: [0.5, 1.1],
      // seconds
      speed: [10, 70],
      // px/s, random direction
      inherit: 0.12,
      // share of the pointer's velocity passed on to particles
      gravity: 0,
      // px/s², positive falls down
      drag: 1.6,
      // velocity damping per second
      spin: 240,
      // max rotation speed in deg/s
      fade: true,
      shrink: true,
      burst: 0,
      // particles per click
      burstSpeed: [160, 460],
      max: 350,
      blend: null,
      composite: null
      // canvas globalCompositeOperation, e.g. 'lighter'
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
          color: pick(colors)
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
          c.scale(0.1, 0.1);
          c.font = '20px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
          c.textAlign = "center";
          c.textBaseline = "middle";
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
              travelled += distance * o.rate / 100;
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
        }
      };
    }
  };

  // src/effects/ripple.js
  var ripple = {
    description: "Expanding rings where you click.",
    defaults: {
      color: null,
      size: 90,
      // final diameter in px
      duration: 0.6,
      // seconds
      width: 2,
      fill: 0,
      // fill opacity inside the ring (0–1)
      rings: 1,
      // number of rings per click
      delay: 0.1,
      // seconds between rings
      blend: null
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
            const ripple2 = ripples[i];
            ripple2.age += dt;
            const t = (ripple2.age - ripple2.delay) / o.duration;
            if (t >= 1) {
              ripples.splice(i, 1);
              continue;
            }
            if (t < 0) continue;
            const radius = Math.max(0.1, o.size / 2 * easeOutCubic(t));
            c.globalAlpha = 1 - t;
            c.beginPath();
            c.arc(ripple2.x, ripple2.y, radius, 0, Math.PI * 2);
            if (o.fill) {
              c.globalAlpha = (1 - t) * o.fill;
              c.fillStyle = ripple2.color;
              c.fill();
              c.globalAlpha = 1 - t;
            }
            c.strokeStyle = ripple2.color;
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
        }
      };
    }
  };

  // src/effects/spotlight.js
  var spotlight = {
    description: "Darkens the page except for a soft circle of light around the pointer.",
    defaults: {
      radius: 170,
      softness: 0.45,
      // share of the radius used for the soft edge (0–1)
      color: "rgba(6, 6, 10, 0.88)",
      // colour of the darkness
      ease: 0.2,
      downScale: 0.92,
      states: { pointer: { scale: 1.3 }, text: { scale: 1 } },
      blend: null
    },
    create(ctx) {
      const el = ctx.element("cly-spotlight");
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
        }
      };
    }
  };

  // src/effects/glow.js
  var glow = {
    description: "Large soft light that lazily follows the pointer \u2014 great on dark pages.",
    defaults: {
      size: 420,
      color: null,
      // defaults to the cursor accent colour
      opacity: 0.35,
      ease: 0.07,
      blend: null,
      // e.g. 'screen' on dark pages, 'multiply' on light ones
      states: { pointer: { scale: 1.2 }, text: { scale: 0.8 } }
    },
    create(ctx) {
      const el = ctx.element("cly-glow");
      const s = new Smooth({ x: 0, y: 0, size: 0, opacity: 0 });
      let color = "";
      return {
        update(p, dt) {
          const o = ctx.options;
          const state = stateOf(o, p);
          s.frame();
          if (p.jump) s.set({ x: p.x, y: p.y });
          s.to({ x: p.x, y: p.y }, ctx.reducedMotion ? 1 : o.ease, dt);
          s.to({ size: o.size * (state.scale ?? 1), opacity: p.visible ? state.opacity ?? o.opacity : 0 }, 0.08, dt);
          const next = p.color || state.color || o.color || ctx.accent;
          if (next !== color) el.style.setProperty("--cly-c", color = next);
          const v = s.value;
          el.style.width = el.style.height = `${v.size}px`;
          el.style.opacity = v.opacity;
          el.style.transform = `translate3d(${v.x - v.size / 2}px, ${v.y - v.size / 2}px, 0)`;
          return s.busy;
        }
      };
    }
  };

  // src/effects/snake.js
  var snake = {
    description: "A chain of dots that slithers after the pointer, each one following the one ahead.",
    defaults: {
      count: 14,
      size: 16,
      colors: null,
      // gradient from head to tail; defaults to cursor colour → accent
      ease: 0.5,
      // how tightly each dot follows the one ahead
      tail: 0.25,
      // size of the last dot relative to the head
      opacity: 1,
      blend: null,
      downScale: 0.8,
      states: { pointer: { scale: 1.5 }, text: { scale: 0 } }
    },
    create(ctx) {
      let dots = [];
      let built = "";
      const s = new Smooth({ scale: 1, opacity: 0 });
      function build(o, p) {
        const colors = o.colors?.length ? o.colors : [ctx.color(p), ctx.accent];
        const key = `${o.count}|${colors.join()}`;
        if (key === built) return;
        built = key;
        const previous = dots;
        dots.forEach((dot2) => dot2.el.remove());
        dots = Array.from({ length: o.count }, (_, i) => {
          const el = ctx.element("cly-snake__dot");
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
          for (const dot2 of dots) {
            if (p.jump || ctx.reducedMotion) {
              dot2.x = leadX;
              dot2.y = leadY;
            } else {
              const t = 1 - Math.pow(1 - o.ease, dt * 60);
              dot2.x += (leadX - dot2.x) * t;
              dot2.y += (leadY - dot2.y) * t;
            }
            if (Math.abs(dot2.x - leadX) > 0.05 || Math.abs(dot2.y - leadY) > 0.05) busy = true;
            const size = o.size * (1 - dot2.k * (1 - o.tail)) * s.value.scale;
            dot2.el.style.width = dot2.el.style.height = `${size}px`;
            dot2.el.style.opacity = s.value.opacity;
            dot2.el.style.transform = `translate3d(${dot2.x - size / 2}px, ${dot2.y - size / 2}px, 0)`;
            leadX = dot2.x;
            leadY = dot2.y;
          }
          return busy;
        }
      };
    }
  };

  // src/effects/orbit.js
  var uid = 0;
  var orbit = {
    description: "Text running around a spinning circle \u2014 shows data-cursor-text when hovering a labelled element.",
    defaults: {
      text: "CURSORLY \u2022 CUSTOM CURSORS \u2022 ",
      radius: 42,
      fontSize: 10.5,
      fontWeight: 600,
      color: null,
      speed: 70,
      // deg/s, negative spins anti-clockwise
      ease: 0.16,
      useLabel: true,
      // replace the text with data-cursor-text while hovering
      opacity: 1,
      blend: null,
      downScale: 0.9,
      states: { pointer: { scale: 1.25, speed: 180 }, text: { scale: 0 } }
    },
    create(ctx) {
      const id = `cly-orbit-${++uid}`;
      const NS = "http://www.w3.org/2000/svg";
      const el = ctx.element("cly-orbit");
      const svg = document.createElementNS(NS, "svg");
      const path = document.createElementNS(NS, "path");
      const text = document.createElementNS(NS, "text");
      const textPath = document.createElementNS(NS, "textPath");
      path.id = id;
      path.setAttribute("fill", "none");
      textPath.setAttribute("href", `#${id}`);
      text.append(textPath);
      svg.append(path, text);
      el.append(svg);
      const s = new Smooth({ x: 0, y: 0, scale: 1, opacity: 0 });
      let rotation = 0;
      let shape2 = "";
      let content = "";
      let color = "";
      function layout(o) {
        const key = `${o.radius}|${o.fontSize}|${o.fontWeight}`;
        if (key === shape2) return;
        shape2 = key;
        const r = o.radius;
        const box = r + o.fontSize * 1.5;
        svg.setAttribute("viewBox", `${-box} ${-box} ${box * 2} ${box * 2}`);
        svg.setAttribute("width", box * 2);
        svg.setAttribute("height", box * 2);
        path.setAttribute("d", `M ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0`);
        text.setAttribute("font-size", o.fontSize);
        text.setAttribute("font-weight", o.fontWeight);
        textPath.setAttribute("textLength", (Math.PI * 2 * r).toFixed(2));
        textPath.setAttribute("lengthAdjust", "spacing");
        content = "";
      }
      function setText(o, value) {
        const perChar = o.fontSize * 0.68;
        const repeat = Math.max(1, Math.round(Math.PI * 2 * o.radius / (value.length * perChar)));
        const next = value.repeat(repeat);
        if (next !== content) textPath.textContent = content = next;
      }
      return {
        update(p, dt) {
          const o = ctx.options;
          const state = stateOf(o, p);
          layout(o);
          setText(o, o.useLabel && p.text ? `${p.text} \u2022 ` : o.text);
          const nextColor = ctx.color(p, state);
          if (nextColor !== color) text.setAttribute("fill", color = nextColor);
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
        }
      };
    }
  };

  // src/effects/crosshair.js
  var crosshair = {
    description: "Full-screen guide lines through the pointer, with an optional coordinates read-out.",
    defaults: {
      color: null,
      width: 1,
      gap: 12,
      // empty space around the pointer
      opacity: 0.55,
      ease: 1,
      coords: false,
      // show "x, y" next to the pointer
      blend: null,
      states: { pointer: { gap: 22 }, text: { opacity: 0.25 } }
    },
    create(ctx) {
      const h = ctx.element("cly-crosshair cly-crosshair--h");
      const v = ctx.element("cly-crosshair cly-crosshair--v");
      const label = ctx.element("cly-crosshair__coords");
      const s = new Smooth({ x: 0, y: 0, gap: 0, opacity: 0 });
      let color = "";
      return {
        update(p, dt) {
          const o = ctx.options;
          const state = stateOf(o, p);
          s.frame();
          if (p.jump) s.set({ x: p.x, y: p.y });
          s.to({ x: p.x, y: p.y }, ctx.reducedMotion ? 1 : o.ease, dt);
          s.to({ gap: state.gap ?? o.gap, opacity: p.visible ? state.opacity ?? o.opacity : 0 }, 0.2, dt);
          const nextColor = ctx.color(p, state);
          if (nextColor !== color) ctx.layer.style.setProperty("--cly-c", color = nextColor);
          const { x, y, gap, opacity } = s.value;
          ctx.layer.style.setProperty("--cly-x", `${x}px`);
          ctx.layer.style.setProperty("--cly-y", `${y}px`);
          ctx.layer.style.setProperty("--cly-gap", `${gap}px`);
          ctx.layer.style.setProperty("--cly-w", `${o.width}px`);
          ctx.layer.style.opacity = opacity;
          h.style.transform = `translate3d(0, ${y - o.width / 2}px, 0)`;
          v.style.transform = `translate3d(${x - o.width / 2}px, 0, 0)`;
          label.hidden = !o.coords;
          if (o.coords) {
            label.textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;
            label.style.transform = `translate3d(${x + 14}px, ${y + 14}px, 0)`;
          }
          return s.busy;
        }
      };
    }
  };

  // src/effects/image.js
  var image = {
    description: "Use any image, SVG, emoji or HTML as the cursor \u2014 optionally rotating towards the direction of travel.",
    defaults: {
      src: null,
      // image URL (PNG, SVG, GIF, data: URL…)
      emoji: null,
      // e.g. '🚀'
      html: null,
      // trusted HTML string (it is inserted as-is)
      size: 32,
      hotspot: [0.5, 0.5],
      // the point that sits on the pointer, as fractions of the size
      ease: 1,
      rotate: false,
      // turn towards the direction of travel
      rotateOffset: 0,
      // deg, for artwork that does not point right
      opacity: 1,
      blend: null,
      downScale: 0.9,
      states: { pointer: { scale: 1.25 }, text: { scale: 0 } }
    },
    create(ctx) {
      const el = ctx.element("cly-image");
      const s = new Smooth({ x: 0, y: 0, scale: 1, opacity: 0, angle: 0 });
      let content = "";
      function render(o) {
        const key = `${o.src}|${o.emoji}|${o.html}`;
        if (key === content) return;
        content = key;
        el.replaceChildren();
        if (o.src) {
          const img = document.createElement("img");
          img.src = o.src;
          img.alt = "";
          img.draggable = false;
          el.append(img);
        } else if (o.html) {
          el.innerHTML = o.html;
        } else {
          el.textContent = o.emoji || "\u{1F446}";
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
          el.style.transform = `translate3d(${v.x - o.size * hx}px, ${v.y - o.size * hy}px, 0) scale(${v.scale})` + (o.rotate ? ` rotate(${v.angle + o.rotateOffset * Math.PI / 180}rad)` : "");
          return s.busy;
        }
      };
    }
  };

  // src/effects/index.js
  var BUILT_IN = { dot, ring, blob, trail, particles, ripple, spotlight, glow, snake, orbit, crosshair, image };
  for (const [name, definition] of Object.entries(BUILT_IN)) registerEffect(name, definition);

  // src/presets.js
  var presets = /* @__PURE__ */ new Map();
  function registerPreset(name, preset) {
    if (typeof name !== "string" || !name) throw new TypeError("Cursorly: a preset name must be a non-empty string.");
    if (!preset || !Array.isArray(preset.effects)) throw new TypeError(`Cursorly: preset "${name}" needs an effects array.`);
    presets.set(name, Object.freeze({ name, description: "", options: {}, ...preset }));
    return presets.get(name);
  }
  var getPreset = (name) => presets.get(name) || null;
  var listPresets = () => [...presets.keys()];
  var BUILT_IN2 = {
    classic: {
      description: "A dot with a lagging ring that grows on links, shows labels and wraps sticky buttons.",
      effects: ["ring", { type: "dot", stuckScale: 0 }]
    },
    minimal: {
      description: "Just a dot that grows softly over links.",
      effects: [{ type: "dot", size: 10, ease: 0.35, states: { pointer: { scale: 3.2 } }, opacity: 0.9 }]
    },
    blend: {
      description: "An inverting blob that stretches with speed \u2014 reads well on any background.",
      effects: ["blob"]
    },
    ripple: {
      description: "Classic dot and ring, plus ripples on every click.",
      effects: ["ripple", "ring", { type: "dot", stuckScale: 0 }]
    },
    neon: {
      description: "Glowing gradient trail with a white core.",
      effects: [
        { type: "trail", color: ["#00e5ff", "#7c4dff", "#ff2bd6"], width: 7, glow: 14, life: 0.35 },
        { type: "dot", color: "#ffffff", size: 7 }
      ]
    },
    rainbow: {
      description: "Long rainbow ribbon.",
      effects: [
        { type: "trail", color: "rainbow", width: 9, life: 0.5 },
        { type: "dot", size: 6 }
      ]
    },
    sparkle: {
      description: "Golden stars fall off the pointer, with a starburst on click.",
      effects: [
        {
          type: "particles",
          shape: ["star", "spark"],
          colors: ["#ffd166", "#ffb703", "#fff1b8"],
          size: [3, 7],
          rate: 6,
          gravity: 140,
          burst: 18
        },
        { type: "dot", size: 7 }
      ]
    },
    confetti: {
      description: "Confetti bursts on every click.",
      effects: [
        {
          type: "particles",
          shape: ["square", "triangle", "circle"],
          colors: ["#ff5a36", "#ffb13b", "#3b5bff", "#12b886", "#ff3d77"],
          size: [3, 6],
          rate: 0,
          burst: 36,
          burstSpeed: [220, 620],
          gravity: 900,
          drag: 2.2,
          life: [0.9, 1.6],
          fade: false
        },
        "ring",
        { type: "dot", stuckScale: 0 }
      ]
    },
    bubbles: {
      description: "Soft bubbles float up from the pointer.",
      effects: [
        {
          type: "particles",
          shape: "circle",
          colors: ["rgba(120, 200, 255, 0.55)", "rgba(170, 140, 255, 0.5)", "rgba(255, 255, 255, 0.6)"],
          size: [3, 10],
          rate: 3,
          speed: [5, 25],
          gravity: -120,
          drag: 0.8,
          life: [0.8, 1.6],
          burst: 10,
          burstSpeed: [40, 160]
        },
        { type: "dot", size: 9 }
      ]
    },
    emoji: {
      description: "Hearts, sparkles and stars, because why not.",
      effects: [
        {
          type: "particles",
          shape: ["\u{1F496}", "\u2728", "\u2B50", "\u{1F308}"],
          size: [5, 9],
          rate: 2.5,
          speed: [20, 60],
          gravity: 260,
          spin: 120,
          burst: 12
        },
        { type: "image", emoji: "\u{1F446}", size: 30, hotspot: [0.38, 0.1] }
      ]
    },
    spotlight: {
      description: "The page is dark; your cursor is a torch.",
      effects: ["spotlight", { type: "dot", color: "#ffffff", size: 6 }]
    },
    glow: {
      description: "A big soft light lazily follows a small dot.",
      effects: [{ type: "glow", opacity: 0.45 }, "dot"]
    },
    snake: {
      description: "A chain of dots that slithers after the pointer.",
      effects: ["snake"]
    },
    orbit: {
      description: "Spinning text circles the pointer and turns into labels on hover.",
      effects: ["orbit", "dot"]
    },
    crosshair: {
      description: "Precise guide lines with live coordinates.",
      effects: [{ type: "crosshair", coords: true }, { type: "dot", size: 5 }]
    },
    comet: {
      description: "A stretchy blob with a tapered tail.",
      effects: [
        { type: "trail", width: 14, life: 0.22 },
        { type: "dot", size: 14, stretch: 0.8, ease: 0.6, states: { pointer: { scale: 2.2 } } }
      ]
    }
  };
  for (const [name, preset] of Object.entries(BUILT_IN2)) registerPreset(name, preset);

  // src/features/magnetic.js
  function createMagnetic(getOptions) {
    const moving = /* @__PURE__ */ new Map();
    let active = null;
    return {
      /** Called whenever the hovered element changes. */
      hover(el) {
        if (el === active) return;
        active = el;
        if (el && !moving.has(el)) moving.set(el, { x: 0, y: 0 });
      },
      update(p, dt) {
        const { magnetic, magneticStrength } = getOptions();
        let busy = false;
        for (const [el, offset] of moving) {
          let tx = 0;
          let ty = 0;
          if (el === active && magnetic && p.visible && !p.reducedMotion) {
            const raw = parseFloat(el.dataset.cursorMagnetic);
            const strength = Number.isFinite(raw) ? raw : magneticStrength;
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2 - offset.x;
            const cy = rect.top + rect.height / 2 - offset.y;
            tx = (p.x - cx) * strength;
            ty = (p.y - cy) * strength;
          }
          offset.x = follow(offset.x, tx, 0.18, dt);
          offset.y = follow(offset.y, ty, 0.18, dt);
          if (offset.x === 0 && offset.y === 0 && el !== active) {
            el.style.removeProperty("translate");
            moving.delete(el);
            continue;
          }
          el.style.translate = `${offset.x.toFixed(2)}px ${offset.y.toFixed(2)}px`;
          if (offset.x !== tx || offset.y !== ty) busy = true;
        }
        return busy;
      },
      /** Puts every element straight back. */
      reset() {
        for (const el of moving.keys()) el.style.removeProperty("translate");
        moving.clear();
        active = null;
      }
    };
  }

  // src/core/Emitter.js
  var Emitter = class {
    #handlers = /* @__PURE__ */ new Map();
    on(type, handler) {
      if (!this.#handlers.has(type)) this.#handlers.set(type, /* @__PURE__ */ new Set());
      this.#handlers.get(type).add(handler);
      return () => this.off(type, handler);
    }
    once(type, handler) {
      const off = this.on(type, (detail) => {
        off();
        return handler(detail);
      });
      return off;
    }
    off(type, handler) {
      if (!handler) this.#handlers.delete(type);
      else this.#handlers.get(type)?.delete(handler);
    }
    emit(type, detail) {
      let allowed = true;
      for (const handler of [...this.#handlers.get(type) || []]) {
        if (handler(detail) === false) allowed = false;
      }
      return allowed;
    }
  };

  // src/core/dom.js
  var CSS = true ? ':root{--cursorly-css: 1}.cly-hide-cursor,.cly-hide-cursor :not(textarea,input:not([type=submit],[type=button],[type=reset],[type=checkbox],[type=radio],[type=range],[type=color],[type=file],[type=image],[type=hidden]),[contenteditable]:not([contenteditable=false]),[contenteditable]:not([contenteditable=false]) *),.cly-hide-cursor-all,.cly-hide-cursor-all *{cursor:none !important}.cly-layer{position:fixed;inset:0;overflow:hidden;pointer-events:none;user-select:none;contain:strict;--cly-c: #111}.cly-canvas{position:absolute;inset:0;width:100%;height:100%}.cly-shape{position:absolute;top:0;left:0;box-sizing:border-box;border:0 solid var(--cly-c);will-change:transform;transition:border-color .25s ease}.cly-shape::before{content:"";position:absolute;inset:0;border-radius:inherit;background:var(--cly-c);opacity:var(--cly-fill, 1);transition:background-color .25s ease}.cly-shape__label{position:absolute;inset:0;display:grid;place-items:center;padding:0 .5em;overflow:hidden;color:var(--cly-label, #fff);font:600 11px/1.15 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.08em;text-align:center;text-transform:uppercase;white-space:nowrap}.cly-spotlight{position:absolute;inset:0}.cly-glow{position:absolute;top:0;left:0;border-radius:50%;background:radial-gradient(circle closest-side, var(--cly-c), transparent);will-change:transform}.cly-snake__dot{position:absolute;top:0;left:0;border-radius:50%;will-change:transform}.cly-orbit{position:absolute;top:0;left:0;will-change:transform}.cly-orbit svg{display:block;overflow:visible}.cly-orbit text{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.12em}.cly-crosshair{position:absolute;top:0;left:0;will-change:transform}.cly-crosshair--h{width:100%;height:var(--cly-w, 1px);background:linear-gradient(to right, var(--cly-c) calc(var(--cly-x) - var(--cly-gap)), transparent 0 calc(var(--cly-x) + var(--cly-gap)), var(--cly-c) 0)}.cly-crosshair--v{width:var(--cly-w, 1px);height:100%;background:linear-gradient(to bottom, var(--cly-c) calc(var(--cly-y) - var(--cly-gap)), transparent 0 calc(var(--cly-y) + var(--cly-gap)), var(--cly-c) 0)}.cly-crosshair__coords{position:absolute;top:0;left:0;color:var(--cly-c);font:500 10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap}.cly-image{position:absolute;top:0;left:0;display:grid;place-items:center;line-height:1;will-change:transform}.cly-image img,.cly-image svg{display:block;width:100%;height:100%;object-fit:contain}@media print{.cly-layer{display:none}}' : "";
  var STYLE_ID = "cursorly-css";
  function injectCSS(nonce) {
    if (!CSS || document.getElementById(STYLE_ID)) return;
    if (getComputedStyle(document.documentElement).getPropertyValue("--cursorly-css").trim()) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    if (nonce) style.nonce = nonce;
    style.textContent = CSS;
    document.head.prepend(style);
  }
  function createSurface(parent) {
    const canvas = document.createElement("canvas");
    canvas.className = "cly-canvas";
    parent.append(canvas);
    const surface = {
      canvas,
      ctx: canvas.getContext("2d"),
      width: 0,
      height: 0,
      dpr: 1,
      fit() {
        surface.dpr = Math.min(window.devicePixelRatio || 1, 2);
        surface.width = window.innerWidth;
        surface.height = window.innerHeight;
        canvas.width = Math.round(surface.width * surface.dpr);
        canvas.height = Math.round(surface.height * surface.dpr);
        surface.ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
      },
      clear() {
        surface.ctx.clearRect(0, 0, surface.width, surface.height);
      }
    };
    surface.fit();
    return surface;
  }
  var media = (query) => typeof matchMedia === "function" ? matchMedia(query) : { matches: false, addEventListener() {
  }, removeEventListener() {
  } };

  // src/core/options.js
  var HOVER_SELECTOR = [
    "a[href]",
    "area[href]",
    "button:not(:disabled)",
    "select:not(:disabled)",
    "summary",
    "label[for]",
    '[role="button"]',
    '[role="link"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="option"]',
    'input:is([type="submit"], [type="button"], [type="reset"], [type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="file"], [type="image"]):not(:disabled)'
  ].join(", ");
  var TEXT_SELECTOR = [
    "textarea",
    'input:not([type="submit"], [type="button"], [type="reset"], [type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="file"], [type="image"], [type="hidden"])',
    '[contenteditable]:not([contenteditable="false"])'
  ].join(", ");
  var DEFAULTS = Object.freeze({
    // What to draw
    preset: null,
    // name of a registered preset ('classic' when neither preset nor effects is set)
    effects: null,
    // ['dot', { type: 'ring', size: 40 }, …] — replaces the preset's effects
    // Theme (effects fall back to these when they have no colour of their own)
    color: "#111111",
    accent: "#ff5a36",
    // Behaviour
    hideNativeCursor: true,
    // true: hide except on text fields · 'all' · false
    touch: false,
    // also run on devices without a fine pointer (phones, tablets)
    reducedMotion: "reduce",
    // 'reduce' | 'disable' | 'ignore' when the OS asks for less motion
    magnetic: true,
    // pull [data-cursor-magnetic] elements towards the pointer
    magneticStrength: 0.35,
    // default pull for data-cursor-magnetic without a value
    hoverSelector: HOVER_SELECTOR,
    textSelector: TEXT_SELECTOR,
    // Setup
    container: null,
    // element the layers are appended to (default: document.body)
    zIndex: 2147483e3,
    injectCSS: true,
    // inject the core stylesheet (skipped when cursorly.css is already loaded)
    nonce: null,
    // CSP nonce for the injected <style>
    autoStart: true
  });
  var isPlainObject = (value) => value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
  function merge(base, patch) {
    const out = { ...base };
    for (const [key, value] of Object.entries(patch || {})) {
      out[key] = isPlainObject(value) && isPlainObject(out[key]) ? merge(out[key], value) : value;
    }
    return out;
  }
  function normalizeEffect(spec) {
    if (typeof spec === "string") return { id: spec, type: spec, options: {} };
    if (isPlainObject(spec) && typeof spec.type === "string") {
      const { type, id = type, ...options } = spec;
      return { id, type, options };
    }
    throw new TypeError('Cursorly: an effect must be a name or an object with a "type".');
  }
  function uniqueIds(specs, taken = /* @__PURE__ */ new Set()) {
    return specs.map((spec) => {
      let id = spec.id;
      for (let n = 2; taken.has(id); n++) id = `${spec.id}-${n}`;
      taken.add(id);
      return { ...spec, id };
    });
  }
  function resolveOptions(user = {}) {
    let presetName = user.preset ?? (user.effects ? null : "classic");
    let preset = presetName ? getPreset(presetName) : null;
    if (presetName && !preset) {
      console.warn(`Cursorly: unknown preset "${presetName}", using "classic".`);
      presetName = "classic";
      preset = getPreset("classic");
    }
    const options = { ...DEFAULTS, ...preset?.options, ...user, preset: presetName };
    const effects2 = user.effects ?? preset?.effects ?? [];
    options.effects = uniqueIds(effects2.map(normalizeEffect));
    if (!["reduce", "disable", "ignore"].includes(options.reducedMotion)) options.reducedMotion = "reduce";
    if (![true, false, "all"].includes(options.hideNativeCursor)) options.hideNativeCursor = true;
    options.magneticStrength = Number(options.magneticStrength) || 0;
    return options;
  }

  // src/core/Cursorly.js
  var VERSION = true ? "0.9.0" : "dev";
  var MARKERS = "[data-cursor], [data-cursor-text], [data-cursor-stick], [data-cursor-magnetic]";
  var NATIVE_CLASSES = { true: "cly-hide-cursor", all: "cly-hide-cursor-all" };
  function radiusOf(el) {
    const value = getComputedStyle(el).borderTopLeftRadius;
    const n = parseFloat(value) || 0;
    if (!value.endsWith("%")) return n;
    const { width, height } = el.getBoundingClientRect();
    return n / 100 * Math.min(width, height);
  }
  var Cursorly = class {
    static version = VERSION;
    static DEFAULTS = DEFAULTS;
    static registerEffect = registerEffect;
    static getEffect = getEffect;
    static registerPreset = registerPreset;
    static getPreset = getPreset;
    static get effects() {
      return listEffects();
    }
    static get presets() {
      return listPresets();
    }
    #user;
    #opts;
    #events = new Emitter();
    #effects = /* @__PURE__ */ new Map();
    // id → { id, type, options, layer, surfaces, instance }
    #container = null;
    #magnetic;
    #queries = null;
    #wanted = false;
    #running = false;
    #listeners = null;
    #raf = 0;
    #last = 0;
    #idle = true;
    #nativeClass = "";
    #pendingJump = false;
    #pendingHover = false;
    #lastState = null;
    #pointer = { x: 0, y: 0, known: false, inside: false, touch: false, down: false };
    #hover = { el: null, target: null, state: null, text: null, color: null, stick: null, radius: 0, hidden: false };
    #override = { state: null, text: null, color: null, hidden: false };
    #frame = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      speed: 0,
      angle: 0,
      down: false,
      visible: false,
      jump: false,
      state: null,
      text: null,
      color: null,
      target: null,
      rect: null,
      radius: 0,
      reducedMotion: false,
      time: 0,
      dt: 1 / 60
    };
    constructor(options = {}) {
      this.#user = { ...options };
      this.#opts = resolveOptions(this.#user);
      this.#magnetic = createMagnetic(() => this.#opts);
      if (typeof document === "undefined") return;
      if (this.#opts.injectCSS) injectCSS(this.#opts.nonce);
      const { container } = this.#opts;
      this.#container = (typeof container === "string" ? document.querySelector(container) : container) || document.body || document.documentElement;
      this.#queries = { fine: media("(any-pointer: fine)"), reduced: media("(prefers-reduced-motion: reduce)") };
      for (const query of Object.values(this.#queries)) query.addEventListener("change", this.#sync);
      this.#setEffects(this.#opts.effects);
      if (this.#opts.autoStart) this.start();
    }
    /* ------------------------------------------------------------------ *
     * Public API
     * ------------------------------------------------------------------ */
    /** Resolved options (read-only copy). */
    get options() {
      return { ...this.#opts, effects: this.#opts.effects.map((spec) => ({ ...spec })) };
    }
    /** true after start() until stop(), even while paused on a touch-only device. */
    get enabled() {
      return this.#wanted;
    }
    /** true while the cursor is actually listening and drawing. */
    get running() {
      return this.#running;
    }
    /** Ids of the mounted effects, in paint order. */
    get effects() {
      return [...this.#effects.keys()];
    }
    get position() {
      return { x: this.#pointer.x, y: this.#pointer.y };
    }
    get state() {
      return this.#frame.state;
    }
    /** The element under the pointer that defines the current state, if any. */
    get target() {
      return this.#hover.target;
    }
    start() {
      this.#wanted = true;
      this.#sync();
      return this;
    }
    stop() {
      this.#wanted = false;
      this.#sync();
      return this;
    }
    toggle(force = !this.#wanted) {
      return force ? this.start() : this.stop();
    }
    /** Changes cursor options. Passing `preset` or `effects` rebuilds the effects. */
    setOptions(patch = {}) {
      const rebuild = "preset" in patch || "effects" in patch;
      const { effects: effects2 } = this.#opts;
      this.#user = { ...this.#user, ...patch };
      if ("preset" in patch && !("effects" in patch)) delete this.#user.effects;
      this.#opts = resolveOptions(this.#user);
      if (rebuild) this.#setEffects(this.#opts.effects);
      else this.#opts.effects = effects2;
      for (const entry of this.#effects.values()) this.#styleLayer(entry);
      this.#sync();
      this.#request();
      return this;
    }
    /** Swaps every effect for the ones of a preset. */
    usePreset(name) {
      return this.setOptions({ preset: name });
    }
    /** Adds an effect on top of the others and returns its id. */
    addEffect(spec) {
      const [normalized] = uniqueIds([normalizeEffect(spec)], new Set(this.#effects.keys()));
      this.#opts.effects.push(normalized);
      return this.#mount(normalized);
    }
    removeEffect(id) {
      const entry = this.#effects.get(id);
      if (entry) {
        this.#unmount(entry);
        this.#opts.effects = this.#opts.effects.filter((spec) => spec.id !== id);
      }
      return this;
    }
    getEffectOptions(id) {
      const entry = this.#effects.get(id);
      return entry ? merge({}, entry.options) : null;
    }
    setEffectOptions(id, patch) {
      const entry = this.#effects.get(id);
      if (!entry) return this;
      entry.options = merge(entry.options, patch);
      const spec = this.#opts.effects.find((item) => item.id === id);
      if (spec) spec.options = merge(spec.options, patch);
      this.#styleLayer(entry);
      entry.instance.setOptions?.(entry.options);
      this.#request();
      return this;
    }
    /** Forces a state (e.g. 'loading'); `null` goes back to the hovered element's state. */
    setState(state = null) {
      this.#override.state = state;
      this.#request();
      return this;
    }
    /** Forces a label; `null` goes back to the hovered element's data-cursor-text. */
    setText(text = null) {
      this.#override.text = text;
      this.#request();
      return this;
    }
    /** Forces a colour; `null` goes back to data-cursor-color / the effect colours. */
    setColor(color = null) {
      this.#override.color = color;
      this.#request();
      return this;
    }
    /** Hides the custom cursor and gives the native cursor back until show(). */
    hide() {
      this.#override.hidden = true;
      this.#request();
      return this;
    }
    show() {
      this.#override.hidden = false;
      this.#request();
      return this;
    }
    /** Repaints after you moved/resized things without the pointer moving. */
    refresh() {
      this.#pendingHover = true;
      for (const entry of this.#effects.values()) this.#resizeEntry(entry);
      this.#request();
      return this;
    }
    on(type, handler) {
      return this.#events.on(type, handler);
    }
    once(type, handler) {
      return this.#events.once(type, handler);
    }
    off(type, handler) {
      this.#events.off(type, handler);
      return this;
    }
    destroy() {
      this.stop();
      for (const entry of [...this.#effects.values()]) this.#unmount(entry);
      if (this.#queries) for (const query of Object.values(this.#queries)) query.removeEventListener("change", this.#sync);
      this.#events.emit("destroy", { cursor: this });
    }
    /* ------------------------------------------------------------------ *
     * Lifecycle
     * ------------------------------------------------------------------ */
    /** Starts or stops listening depending on start()/stop(), the device and the motion preference. */
    #sync = () => {
      if (!this.#queries) return;
      const { touch, reducedMotion } = this.#opts;
      const reduced = this.#queries.reduced.matches;
      this.#frame.reducedMotion = reduced && reducedMotion === "reduce";
      const shouldRun = this.#wanted && (touch || this.#queries.fine.matches) && !(reduced && reducedMotion === "disable");
      if (shouldRun && !this.#running) this.#attach();
      else if (!shouldRun && this.#running) this.#detach();
      this.#updateNative();
    };
    #attach() {
      this.#running = true;
      this.#listeners = new AbortController();
      const options = { passive: true, signal: this.#listeners.signal };
      window.addEventListener("pointermove", this.#onMove, options);
      window.addEventListener("pointerdown", this.#onDown, options);
      window.addEventListener("pointerup", this.#onUp, options);
      window.addEventListener("pointercancel", this.#onUp, options);
      document.addEventListener("mouseout", this.#onOut, options);
      window.addEventListener("scroll", this.#onScroll, { ...options, capture: true });
      window.addEventListener("resize", this.#onResize, options);
      for (const entry of this.#effects.values()) entry.layer.hidden = false;
      this.#idle = true;
      this.#request();
      this.#events.emit("start", { cursor: this });
    }
    #detach() {
      this.#running = false;
      this.#listeners.abort();
      cancelAnimationFrame(this.#raf);
      this.#raf = 0;
      Object.assign(this.#pointer, { known: false, inside: false, touch: false, down: false });
      this.#setHover(null);
      this.#magnetic.reset();
      for (const entry of this.#effects.values()) entry.layer.hidden = true;
      this.#events.emit("stop", { cursor: this });
    }
    /** Hides the OS cursor while the custom one is on screen. */
    #updateNative() {
      const { known, inside, touch } = this.#pointer;
      const hidden = this.#hover.hidden || this.#override.hidden;
      const wanted = this.#running && known && inside && !touch && !hidden ? NATIVE_CLASSES[this.#opts.hideNativeCursor] || "" : "";
      if (wanted === this.#nativeClass) return;
      const root = document.documentElement.classList;
      if (this.#nativeClass) root.remove(this.#nativeClass);
      if (wanted) root.add(wanted);
      this.#nativeClass = wanted;
    }
    /* ------------------------------------------------------------------ *
     * Input
     * ------------------------------------------------------------------ */
    #onMove = (event) => {
      const p = this.#pointer;
      if (event.pointerType === "touch" && !this.#opts.touch) {
        p.touch = true;
        this.#updateNative();
        this.#request();
        return;
      }
      if (p.down && event.buttons === 0) this.#onUp(event);
      if (!p.known || !p.inside || p.touch) this.#pendingJump = true;
      p.x = event.clientX;
      p.y = event.clientY;
      p.known = p.inside = true;
      p.touch = false;
      const el = event.composedPath?.()[0] ?? event.target;
      if (el !== this.#hover.el) this.#setHover(el);
      this.#updateNative();
      this.#request();
    };
    #onDown = (event) => {
      if (event.pointerType === "touch" && !this.#opts.touch) {
        this.#pointer.touch = true;
        this.#updateNative();
        this.#request();
        return;
      }
      this.#pointer.down = this.#frame.down = true;
      this.#press("down", event);
    };
    #onUp = (event) => {
      if (!this.#pointer.down) return;
      this.#pointer.down = this.#frame.down = false;
      this.#press("up", event);
    };
    #press(type, event) {
      const f = this.#frame;
      if (event.type !== "pointercancel" && event.type !== "pointermove") {
        f.x = this.#pointer.x = event.clientX;
        f.y = this.#pointer.y = event.clientY;
      }
      for (const entry of this.#effects.values()) entry.instance[type]?.(f);
      this.#events.emit(type, { x: f.x, y: f.y, target: this.#hover.target, event });
      this.#request();
    }
    #onOut = (event) => {
      if (event.relatedTarget) return;
      this.#pointer.inside = false;
      this.#updateNative();
      this.#request();
    };
    #onScroll = () => {
      this.#pendingHover = true;
      this.#request();
    };
    #onResize = () => {
      for (const entry of this.#effects.values()) this.#resizeEntry(entry);
      this.#request();
    };
    /** Works out state, label, colour, stickiness and magnetism from the element under the pointer. */
    #setHover(el) {
      const h = this.#hover;
      const o = this.#opts;
      const element = el instanceof Element ? el : null;
      const target = element?.closest(`${MARKERS}, ${o.hoverSelector}, ${o.textSelector}`) ?? null;
      h.el = el;
      if (target !== h.target) {
        const previous = h.target;
        h.target = target;
        h.state = null;
        if (target) {
          const named = target.dataset.cursor;
          h.state = named ? named === "default" ? null : named : target.matches(o.textSelector) ? "text" : "pointer";
        }
        h.text = target?.dataset.cursorText || null;
        h.stick = target?.hasAttribute("data-cursor-stick") ? target : null;
        h.radius = h.stick ? radiusOf(h.stick) : 0;
        if (previous) this.#events.emit("leave", { target: previous });
        if (target) this.#events.emit("enter", { target, state: h.state, text: h.text });
      }
      h.color = element?.closest("[data-cursor-color]")?.dataset.cursorColor || null;
      h.hidden = Boolean(element?.closest("[data-cursor-hide]"));
      this.#magnetic.hover(element?.closest("[data-cursor-magnetic]") ?? null);
    }
    /* ------------------------------------------------------------------ *
     * Frame loop — runs only while something moves
     * ------------------------------------------------------------------ */
    #request() {
      if (!this.#raf && this.#running) this.#raf = requestAnimationFrame(this.#tick);
    }
    #tick = (now) => {
      this.#raf = 0;
      if (!this.#running) return;
      const dt = this.#idle ? 1 / 60 : clamp((now - this.#last) / 1e3, 1e-3, 0.1);
      this.#last = now;
      const p = this.#pointer;
      const h = this.#hover;
      const o = this.#override;
      const f = this.#frame;
      if ((this.#pendingHover || h.el && !h.el.isConnected) && p.inside) {
        this.#setHover(document.elementFromPoint(p.x, p.y));
        this.#updateNative();
      }
      this.#pendingHover = false;
      const jump = this.#pendingJump;
      this.#pendingJump = false;
      const dx = jump ? 0 : p.x - f.x;
      const dy = jump ? 0 : p.y - f.y;
      const k = 1 - Math.exp(-dt * 14);
      f.vx = jump ? 0 : f.vx + (dx / dt - f.vx) * k;
      f.vy = jump ? 0 : f.vy + (dy / dt - f.vy) * k;
      f.speed = Math.hypot(f.vx, f.vy);
      if (f.speed > 1) f.angle = Math.atan2(f.vy, f.vx);
      if (f.speed < 1) f.vx = f.vy = f.speed = 0;
      f.x = p.x;
      f.y = p.y;
      f.jump = jump;
      f.dt = dt;
      f.time = now / 1e3;
      f.down = p.down;
      f.state = o.state ?? h.state;
      f.text = o.text ?? h.text;
      f.color = o.color ?? h.color;
      f.target = h.target;
      f.visible = p.inside && !p.touch && !o.hidden && !h.hidden;
      f.rect = h.stick && f.visible ? h.stick.getBoundingClientRect() : null;
      f.radius = h.radius;
      if (f.state !== this.#lastState) {
        this.#events.emit("statechange", { state: f.state, previous: this.#lastState });
        this.#lastState = f.state;
      }
      let busy = dx !== 0 || dy !== 0 || f.speed > 0;
      if (this.#magnetic.update(f, dt)) busy = true;
      for (const entry of this.#effects.values()) {
        if (entry.instance.update?.(f, dt)) busy = true;
      }
      this.#idle = !busy;
      if (busy) this.#request();
    };
    /* ------------------------------------------------------------------ *
     * Effects
     * ------------------------------------------------------------------ */
    #setEffects(specs) {
      for (const entry of [...this.#effects.values()]) this.#unmount(entry);
      if (!this.#container) return;
      for (const spec of specs) this.#mount(spec);
    }
    #mount(spec) {
      const definition = getEffect(spec.type);
      if (!definition) {
        console.warn(`Cursorly: unknown effect "${spec.type}". Registered: ${listEffects().join(", ")}.`);
        return null;
      }
      if (!this.#container) return spec.id;
      const layer = document.createElement("div");
      layer.className = `cly-layer cly-layer--${spec.type}`;
      layer.dataset.effect = spec.id;
      layer.setAttribute("aria-hidden", "true");
      layer.hidden = !this.#running;
      const entry = { id: spec.id, type: spec.type, options: merge(definition.defaults, spec.options), layer, surfaces: [], instance: null };
      const cursor = this;
      const frame = this.#frame;
      const opts = () => this.#opts;
      const ctx = {
        id: spec.id,
        type: spec.type,
        cursor,
        layer,
        get options() {
          return entry.options;
        },
        get reducedMotion() {
          return frame.reducedMotion;
        },
        get accent() {
          return opts().accent;
        },
        /** Colour to draw with: data-cursor-color → state colour → effect colour → cursor colour. */
        color(p, state) {
          return p?.color || state?.color || entry.options.color || opts().color;
        },
        element(className = "", tag = "div") {
          const el = document.createElement(tag);
          el.className = className;
          layer.append(el);
          return el;
        },
        canvas() {
          const surface = createSurface(layer);
          entry.surfaces.push(surface);
          return surface;
        },
        request: () => this.#request()
      };
      this.#styleLayer(entry);
      entry.instance = definition.create(ctx) || {};
      this.#container.append(layer);
      this.#effects.set(spec.id, entry);
      this.#request();
      return spec.id;
    }
    #unmount(entry) {
      entry.instance.destroy?.();
      entry.layer.remove();
      this.#effects.delete(entry.id);
    }
    #styleLayer(entry) {
      entry.layer.style.zIndex = String(this.#opts.zIndex);
      entry.layer.style.mixBlendMode = entry.options.blend || "";
    }
    #resizeEntry(entry) {
      for (const surface of entry.surfaces) surface.fit();
      entry.instance.resize?.();
    }
  };

  // src/browser.js
  function parseOptions(value) {
    const text = (value || "").trim();
    if (!text) return {};
    if (!text.startsWith("{")) return { preset: text };
    try {
      return JSON.parse(text);
    } catch {
      console.warn("Cursorly: data-cursorly must be a preset name or valid JSON options.");
      return {};
    }
  }
  function autoInit() {
    const el = document.querySelector("[data-cursorly]");
    if (el && !el.cursorly) el.cursorly = new Cursorly(parseOptions(el.dataset.cursorly));
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoInit);
    else autoInit();
  }
  var browser_default = Cursorly;
  return __toCommonJS(browser_exports);
})();
Cursorly = Cursorly.default;
