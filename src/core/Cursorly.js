/* global __CURSORLY_VERSION__ */
import '../effects/index.js';
import { getEffect, listEffects, registerEffect } from '../effects/registry.js';
import { getPreset, listPresets, registerPreset } from '../presets.js';
import { createMagnetic } from '../features/magnetic.js';
import { Emitter } from './Emitter.js';
import { createSurface, injectCSS, media } from './dom.js';
import { clamp } from './math.js';
import { DEFAULTS, merge, normalizeEffect, resolveOptions, uniqueIds } from './options.js';

const VERSION = typeof __CURSORLY_VERSION__ !== 'undefined' ? __CURSORLY_VERSION__ : 'dev';

/** Attributes that make an element a hover target on their own. */
const MARKERS = '[data-cursor], [data-cursor-text], [data-cursor-stick], [data-cursor-magnetic]';

const NATIVE_CLASSES = { true: 'cly-hide-cursor', all: 'cly-hide-cursor-all' };

function radiusOf(el) {
  const value = getComputedStyle(el).borderTopLeftRadius;
  const n = parseFloat(value) || 0;
  if (!value.endsWith('%')) return n;
  const { width, height } = el.getBoundingClientRect();
  return (n / 100) * Math.min(width, height);
}

/**
 * Cursorly — custom cursor effects.
 *
 *   const cursor = new Cursorly({ preset: 'classic' });
 *   const cursor = new Cursorly({ effects: ['ring', { type: 'dot', color: 'red' }] });
 */
export class Cursorly {
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
  #effects = new Map(); // id → { id, type, options, layer, surfaces, instance }
  #container = null;
  #magnetic;
  #queries = null;
  #wanted = false;
  #running = false;
  #listeners = null;
  #raf = 0;
  #last = 0;
  #idle = true;
  #nativeClass = '';
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
    dt: 1 / 60,
  };

  constructor(options = {}) {
    this.#user = { ...options };
    this.#opts = resolveOptions(this.#user);
    this.#magnetic = createMagnetic(() => this.#opts);
    if (typeof document === 'undefined') return; // server-side rendering: an inert instance

    if (this.#opts.injectCSS) injectCSS(this.#opts.nonce);
    const { container } = this.#opts;
    this.#container =
      (typeof container === 'string' ? document.querySelector(container) : container) || document.body || document.documentElement;

    this.#queries = { fine: media('(any-pointer: fine)'), reduced: media('(prefers-reduced-motion: reduce)') };
    for (const query of Object.values(this.#queries)) query.addEventListener('change', this.#sync);

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
    const rebuild = 'preset' in patch || 'effects' in patch;
    const { effects } = this.#opts;
    this.#user = { ...this.#user, ...patch };
    if ('preset' in patch && !('effects' in patch)) delete this.#user.effects;
    this.#opts = resolveOptions(this.#user);
    if (rebuild) this.#setEffects(this.#opts.effects);
    else this.#opts.effects = effects; // keep effects added or changed since
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
    if (this.#queries) for (const query of Object.values(this.#queries)) query.removeEventListener('change', this.#sync);
    this.#events.emit('destroy', { cursor: this });
  }

  /* ------------------------------------------------------------------ *
   * Lifecycle
   * ------------------------------------------------------------------ */

  /** Starts or stops listening depending on start()/stop(), the device and the motion preference. */
  #sync = () => {
    if (!this.#queries) return;
    const { touch, reducedMotion } = this.#opts;
    const reduced = this.#queries.reduced.matches;
    this.#frame.reducedMotion = reduced && reducedMotion === 'reduce';
    const shouldRun = this.#wanted && (touch || this.#queries.fine.matches) && !(reduced && reducedMotion === 'disable');
    if (shouldRun && !this.#running) this.#attach();
    else if (!shouldRun && this.#running) this.#detach();
    this.#updateNative();
  };

  #attach() {
    this.#running = true;
    this.#listeners = new AbortController();
    const options = { passive: true, signal: this.#listeners.signal };
    window.addEventListener('pointermove', this.#onMove, options);
    window.addEventListener('pointerdown', this.#onDown, options);
    window.addEventListener('pointerup', this.#onUp, options);
    window.addEventListener('pointercancel', this.#onUp, options);
    document.addEventListener('mouseout', this.#onOut, options);
    window.addEventListener('scroll', this.#onScroll, { ...options, capture: true });
    window.addEventListener('resize', this.#onResize, options);
    for (const entry of this.#effects.values()) entry.layer.hidden = false;
    this.#idle = true;
    this.#request();
    this.#events.emit('start', { cursor: this });
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
    this.#events.emit('stop', { cursor: this });
  }

  /** Hides the OS cursor while the custom one is on screen. */
  #updateNative() {
    const { known, inside, touch } = this.#pointer;
    const hidden = this.#hover.hidden || this.#override.hidden;
    const wanted = this.#running && known && inside && !touch && !hidden ? NATIVE_CLASSES[this.#opts.hideNativeCursor] || '' : '';
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
    if (event.pointerType === 'touch' && !this.#opts.touch) {
      p.touch = true;
      this.#updateNative();
      this.#request();
      return;
    }
    if (p.down && event.buttons === 0) this.#onUp(event); // released outside the window
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
    if (event.pointerType === 'touch' && !this.#opts.touch) {
      this.#pointer.touch = true; // a tap on a touch-screen laptop hides the mouse cursor
      this.#updateNative();
      this.#request();
      return;
    }
    this.#pointer.down = this.#frame.down = true;
    this.#press('down', event);
  };

  #onUp = (event) => {
    if (!this.#pointer.down) return;
    this.#pointer.down = this.#frame.down = false;
    this.#press('up', event);
  };

  #press(type, event) {
    const f = this.#frame;
    if (event.type !== 'pointercancel' && event.type !== 'pointermove') {
      f.x = this.#pointer.x = event.clientX;
      f.y = this.#pointer.y = event.clientY;
    }
    for (const entry of this.#effects.values()) entry.instance[type]?.(f);
    this.#events.emit(type, { x: f.x, y: f.y, target: this.#hover.target, event });
    this.#request();
  }

  #onOut = (event) => {
    if (event.relatedTarget) return; // still inside the page
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
        h.state = named ? (named === 'default' ? null : named) : target.matches(o.textSelector) ? 'text' : 'pointer';
      }
      h.text = target?.dataset.cursorText || null;
      h.stick = target?.hasAttribute('data-cursor-stick') ? target : null;
      h.radius = h.stick ? radiusOf(h.stick) : 0;
      if (previous) this.#events.emit('leave', { target: previous });
      if (target) this.#events.emit('enter', { target, state: h.state, text: h.text });
    }
    h.color = element?.closest('[data-cursor-color]')?.dataset.cursorColor || null;
    h.hidden = Boolean(element?.closest('[data-cursor-hide]'));
    this.#magnetic.hover(element?.closest('[data-cursor-magnetic]') ?? null);
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
    const dt = this.#idle ? 1 / 60 : clamp((now - this.#last) / 1000, 0.001, 0.1);
    this.#last = now;

    const p = this.#pointer;
    const h = this.#hover;
    const o = this.#override;
    const f = this.#frame;

    if ((this.#pendingHover || (h.el && !h.el.isConnected)) && p.inside) {
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
    f.time = now / 1000;
    f.down = p.down;
    f.state = o.state ?? h.state;
    f.text = o.text ?? h.text;
    f.color = o.color ?? h.color;
    f.target = h.target;
    f.visible = p.inside && !p.touch && !o.hidden && !h.hidden;
    f.rect = h.stick && f.visible ? h.stick.getBoundingClientRect() : null;
    f.radius = h.radius;

    if (f.state !== this.#lastState) {
      this.#events.emit('statechange', { state: f.state, previous: this.#lastState });
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
      console.warn(`Cursorly: unknown effect "${spec.type}". Registered: ${listEffects().join(', ')}.`);
      return null;
    }
    if (!this.#container) return spec.id;

    const layer = document.createElement('div');
    layer.className = `cly-layer cly-layer--${spec.type}`;
    layer.dataset.effect = spec.id;
    layer.setAttribute('aria-hidden', 'true');
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
      element(className = '', tag = 'div') {
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
      request: () => this.#request(),
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
    entry.layer.style.mixBlendMode = entry.options.blend || '';
  }

  #resizeEntry(entry) {
    for (const surface of entry.surfaces) surface.fit();
    entry.instance.resize?.();
  }
}
