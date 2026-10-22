# Cursorly

[![CI](https://github.com/JuwelKhan/Cursorly/actions/workflows/ci.yml/badge.svg)](https://github.com/JuwelKhan/Cursorly/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/cursorly.svg)](https://www.npmjs.com/package/cursorly)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Dependency-free **custom cursor effects** for the web. Dots, rings that wrap your buttons, blobs that invert the page, neon trails, sparkles, ripples, a spotlight, magnetic links and more. Use a preset in one line, or stack effects and build your own.

**[Live demo](https://juwelkhan.github.io/Cursorly/)** · or open `demo/index.html` locally.

> **Status: beta (0.9).** The API may still change before 1.0. Please [report issues](https://github.com/JuwelKhan/Cursorly/issues), especially from Safari, Firefox and pen/tablet devices.

## Features

- **12 composable effects**: `dot`, `ring`, `blob`, `trail`, `particles`, `ripple`, `spotlight`, `glow`, `snake`, `orbit`, `crosshair`, `image`.
- **16 presets** (`classic`, `blend`, `neon`, `sparkle`, `confetti`, `spotlight` and more), each a plain list of effects you can tweak.
- **HTML attributes, no per-element JS**: labels (`data-cursor-text`), colours, magnetic elements, sticky morphing, custom states, hidden areas.
- **Light on resources**: one `requestAnimationFrame` loop that sleeps when nothing moves, GPU transforms, frame-rate independent smoothing, ~13 kB gzipped including CSS.
- **Behaves well by default**: off on touch-only devices, adapts to `prefers-reduced-motion`, keeps the native I-beam in text fields, hides when the pointer leaves the window, restores the native cursor in `data-cursor-hide` areas.
- **Extensible**: register your own effects and presets. Events, a chainable API, TypeScript types.

## Install

```bash
npm install cursorly
```

or from a CDN, without a build step:

```html
<script src="https://cdn.jsdelivr.net/npm/cursorly@0.9/dist/cursorly.min.js" data-cursorly="classic"></script>
```

The stylesheet is bundled into the script. If your Content Security Policy blocks inline styles, link `dist/cursorly.css` and pass `injectCSS: false` (or use the `nonce` option).

## Quick start

```js
import Cursorly from 'cursorly';

const cursor = new Cursorly({ preset: 'classic' });
```

Mix effects yourself. Later effects are painted on top:

```js
new Cursorly({
  effects: [
    { type: 'trail', color: ['#00e5ff', '#ff2bd6'], glow: 12 },
    'ring',
    { type: 'dot', color: '#fff', stuckScale: 0 },
  ],
  color: '#111',
  accent: '#ff5a36',
});
```

**Without JavaScript setup** (browser build only). The value is a preset name or JSON options:

```html
<script src="cursorly.min.js" data-cursorly="blend"></script>
<body data-cursorly='{"preset": "sparkle", "magnetic": false}'>
```

The instance is stored on the element as `element.cursorly`.

## HTML attributes

| Attribute | Effect |
| --- | --- |
| `data-cursor="name"` | Puts the cursor in a named state while hovering. Style it per effect with `states` (see below). `data-cursor="default"` cancels the automatic `pointer` state. |
| `data-cursor-text="View"` | Shows a label inside `ring`, `blob` and `orbit`. Other shapes shrink by `labelScale`. |
| `data-cursor-color="#fff"` | Recolours every effect while the pointer is inside (handy on dark sections). |
| `data-cursor-magnetic="0.4"` | Pulls the element towards the pointer. No value = `magneticStrength`. Uses the CSS `translate` property, so your `transform` is untouched. |
| `data-cursor-stick` | The `ring` morphs around the element, matching its border radius. |
| `data-cursor-hide` | Hides the custom cursor and shows the native one (maps, canvases, video players). |

Links, buttons, `select`, `summary`, `label[for]`, clickable inputs and ARIA buttons/links/tabs get the **`pointer`** state automatically. Text inputs, textareas and `contenteditable` get the **`text`** state, where the native I-beam stays visible and most effects step aside.

## Presets

| Preset | Effects |
| --- | --- |
| `classic` (default) | ring + dot. Ring grows on links, shows labels and wraps sticky elements |
| `minimal` | a dot that grows softly over links |
| `blend` | a white blob with `mix-blend-mode: difference` that stretches with speed |
| `ripple` | classic + ripples on click |
| `neon` | glowing gradient trail with a white dot |
| `rainbow` | long rainbow ribbon |
| `comet` | a stretchy dot with a tapered tail |
| `sparkle` | golden stars falling off the pointer, starburst on click |
| `confetti` | ring + dot, confetti burst on click |
| `bubbles` | bubbles floating up |
| `emoji` | 💖 ✨ ⭐ particles with an emoji pointer |
| `spotlight` | the page goes dark, the cursor is a torch |
| `glow` | big soft light lazily following a dot |
| `snake` | a chain of dots |
| `orbit` | spinning text around the pointer, which turns into the label on hover |
| `crosshair` | full-screen guide lines with coordinates |

Switch at runtime with `cursor.usePreset('neon')`. Add your own with `Cursorly.registerPreset('brand', { effects: [...], options: { color: '#0af' } })`.

## Cursor options

| Option | Default | Description |
| --- | --- | --- |
| `preset` | `'classic'` | Preset name. Used when `effects` is not set. |
| `effects` | `null` | List of effect names or `{ type, id?, ...options }` objects. Replaces the preset's effects. |
| `color` | `'#111111'` | Fallback colour for every effect. |
| `accent` | `'#ff5a36'` | Second colour (glow, particles, snake gradient). |
| `hideNativeCursor` | `true` | `true` hides the OS cursor except in text fields, `'all'` hides it everywhere, `false` keeps it. |
| `touch` | `false` | Also run on devices without a fine pointer. |
| `reducedMotion` | `'reduce'` | With the OS "reduce motion" setting: `'reduce'` (no lag, short trails, no particles on move, no spinning), `'disable'` (turn off), `'ignore'`. |
| `magnetic` | `true` | Enable `data-cursor-magnetic`. |
| `magneticStrength` | `0.35` | Pull for `data-cursor-magnetic` without a value (0–1). |
| `hoverSelector` | links, buttons… | Elements that trigger the `pointer` state. |
| `textSelector` | text fields | Elements that trigger the `text` state. |
| `container` | `document.body` | Element (or selector) the layers are appended to. |
| `zIndex` | `2147483000` | z-index of every layer. |
| `injectCSS` | `true` | Inject the core stylesheet (skipped if `cursorly.css` is already loaded). |
| `nonce` | `null` | CSP nonce for the injected `<style>`. |
| `autoStart` | `true` | Start immediately. Otherwise call `start()`. |

## Effects

Every effect takes its own options. Most also accept:

- `color`: falls back to the cursor `color` (or `accent`).
- `blend`: `mix-blend-mode` of its layer, for example `'difference'` or `'screen'`.
- `states`: per-state overrides, deep-merged with the defaults:

  ```js
  { type: 'ring', states: { pointer: { scale: 2, fill: 0.2 }, video: { scale: 3, color: '#f00' } } }
  ```

  and then `<div data-cursor="video">`.

<details>
<summary><strong><code>dot</code> · <code>ring</code> · <code>blob</code></strong>: the shape engine</summary>

| Option | dot | ring | blob | Description |
| --- | --- | --- | --- | --- |
| `size` | 8 | 38 | 26 | Diameter in px. |
| `ease` | 1 | 0.17 | 0.2 | Position smoothing per 60 fps frame. 1 = no lag. |
| `sizeEase` | 0.2 | 0.2 | 0.2 | Smoothing for size, fill and opacity. |
| `border` | 0 | 1.5 | 0 | Outline width. 0 = filled disc. |
| `fill` | 0 | 0 | 0 | Fill opacity behind an outline. |
| `opacity` | 1 | 1 | 1 | |
| `stretch` | 0 | 0 | 0.6 | Squash & stretch with speed (0–1). |
| `downScale` | 0.8 | 0.85 | 0.8 | Scale while the mouse button is held. |
| `label` | false | true | true | Show `data-cursor-text` inside. |
| `labelSize` | 84 | 84 | 96 | Diameter while showing a label. |
| `labelColor` | `#fff` | `#fff` | `#000` | |
| `labelScale` | 0 | 1 | 1 | Scale when *another* effect shows the label. |
| `stick` | false | true | false | Wrap `[data-cursor-stick]` elements. |
| `stickPadding` | 6 | 6 | 6 | Space around a wrapped element. |
| `stickFill` | 0.08 | 0.08 | 0.08 | Fill opacity while wrapping. |
| `stuckScale` | 1 | 1 | 1 | Scale while *another* effect wraps an element (the `classic` dot uses 0). |
| `states` | pointer 0.5, text 0 | pointer 1.6 + fill 0.12, text 0 | pointer 3, text 0.4 | |

The label is styled by `.cly-shape__label`. Override its font in your own CSS.
</details>

<details>
<summary><strong><code>trail</code></strong>: tapered ribbon</summary>

`color` (a colour, an array of colours from tail to head, or `'rainbow'`), `width` (6), `life` (0.32 s), `maxPoints` (80), `taper` (true), `glow` (0, shadow blur in px), `opacity` (1), `composite` (canvas `globalCompositeOperation`, e.g. `'lighter'`).
</details>

<details>
<summary><strong><code>particles</code></strong>: sparkles, confetti, bubbles, emoji</summary>

`shape` (`circle`, `square`, `triangle`, `star`, `heart`, `spark`, or any text/emoji, or an array to mix), `colors` (array, default `[color, accent]`), `size` ([2, 6] radius), `rate` (5 per 100 px of movement, 0 = only bursts), `life` ([0.5, 1.1] s), `speed` ([10, 70] px/s), `inherit` (0.12 of the pointer velocity), `gravity` (0 px/s², negative floats up), `drag` (1.6), `spin` (240 deg/s), `fade`, `shrink`, `burst` (0 particles per click), `burstSpeed` ([160, 460]), `max` (350), `composite`.

Any number option written as `[min, max]` is randomised per particle.
</details>

<details>
<summary><strong><code>ripple</code></strong>: rings on click</summary>

`color`, `size` (90 px final diameter), `duration` (0.6 s), `width` (2), `fill` (0), `rings` (1), `delay` (0.1 s between rings).
</details>

<details>
<summary><strong><code>spotlight</code></strong> · <strong><code>glow</code></strong></summary>

**spotlight**: `radius` (170), `softness` (0.45), `color` (`'rgba(6, 6, 10, 0.88)'`, the darkness), `ease` (0.2), `downScale` (0.92), `states.pointer.scale` (1.3).

**glow**: `size` (420), `color` (defaults to `accent`), `opacity` (0.35), `ease` (0.07). Try `blend: 'screen'` on dark pages.
</details>

<details>
<summary><strong><code>snake</code></strong> · <strong><code>orbit</code></strong> · <strong><code>crosshair</code></strong> · <strong><code>image</code></strong></summary>

**snake**: `count` (14), `size` (16), `colors` (gradient head → tail), `ease` (0.5), `tail` (0.25, size of the last dot), `opacity`, `downScale`.

**orbit**: `text`, `radius` (42), `fontSize` (10.5), `fontWeight` (600), `color`, `speed` (70 deg/s, negative = anti-clockwise), `ease` (0.16), `useLabel` (true: show `data-cursor-text` instead), `states.pointer` `{ scale: 1.25, speed: 180 }`.

**crosshair**: `color`, `width` (1), `gap` (12), `opacity` (0.55), `ease` (1), `coords` (false).

**image**: `src` (image URL), `emoji`, or `html` (inserted as-is, trusted content only), `size` (32), `hotspot` ([0.5, 0.5] as fractions of the size), `ease` (1), `rotate` (false, turn towards the direction of travel), `rotateOffset` (deg).
</details>

## API

```js
const cursor = new Cursorly(options);

cursor.usePreset('neon');                       // swap all effects
cursor.addEffect({ type: 'ripple', rings: 2 }); // → 'ripple' (id)
cursor.setEffectOptions('ripple', { color: '#0af' });
cursor.getEffectOptions('ripple');
cursor.removeEffect('ripple');
cursor.setOptions({ color: '#fff', magnetic: false });

cursor.setState('loading');   // force a state; null = back to automatic
cursor.setText('Drag');       // force a label;  null = back to automatic
cursor.setColor('#f00');      // force a colour; null = back to automatic
cursor.hide(); cursor.show(); // custom cursor off/on (native cursor comes back)

cursor.stop(); cursor.start(); cursor.toggle();
cursor.refresh();             // re-read the element under the pointer after DOM changes
cursor.destroy();

cursor.running; cursor.enabled; cursor.effects; cursor.state; cursor.target; cursor.position; cursor.options;
```

Effect ids default to the effect type. Adding a second `dot` gives `dot-2`, or set your own with `{ type: 'dot', id: 'big' }`.

### Events

```js
const off = cursor.on('enter', ({ target, state, text }) => {});
cursor.on('leave', ({ target }) => {});
cursor.on('statechange', ({ state, previous }) => {});
cursor.on('down', ({ x, y, target, event }) => {});
cursor.on('up', ({ x, y, target, event }) => {});
cursor.on('start' | 'stop' | 'destroy', ({ cursor }) => {});
off(); // or cursor.off('enter', handler)
```

## Custom effects

An effect is a function that receives a context and returns frame callbacks. Return `true` from `update` while you are still animating. The shared loop sleeps once every effect returns `false`.

```js
import Cursorly, { follow } from 'cursorly';

Cursorly.registerEffect('square', {
  description: 'A spinning square.',
  defaults: { size: 18, ease: 0.2 },
  create(ctx) {
    const el = ctx.element('my-square'); // positioned absolutely inside the effect's fixed layer
    let x = 0, y = 0, angle = 0;
    return {
      update(p, dt) {
        const { size, ease } = ctx.options;
        x = p.jump ? p.x : follow(x, p.x, ease, dt); // frame-rate independent smoothing
        y = p.jump ? p.y : follow(y, p.y, ease, dt);
        angle += dt * 180;
        el.style.cssText = `width:${size}px;height:${size}px;background:${ctx.color(p)};opacity:${p.visible ? 1 : 0}`;
        el.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px) rotate(${angle}deg)`;
        return p.visible; // keep spinning while visible
      },
      down(p) {},   // mouse button pressed
      up(p) {},
      resize() {},
      destroy() {},
    };
  },
});

new Cursorly({ effects: ['square', 'dot'] });
```

`ctx` also gives you `ctx.canvas()` (a DPR-aware, auto-resized `<canvas>`), `ctx.layer`, `ctx.accent`, `ctx.reducedMotion` and `ctx.request()` (ask for frames, e.g. from `down()`). The frame `p` contains `x, y, vx, vy, speed, angle, down, visible, jump, state, text, color, target, rect, radius, time, dt, reducedMotion`. See `types/index.d.ts`.

## Architecture

```
src/
├── index.js / browser.js     ES module entry · IIFE entry with data-cursorly auto-init
├── core/
│   ├── Cursorly.js           input, hover detection, frame loop, public API
│   ├── options.js            defaults, preset resolution, effect specs
│   ├── dom.js                stylesheet injection, canvas surfaces
│   ├── Emitter.js            tiny event emitter
│   └── math.js               frame-rate independent smoothing, random helpers
├── features/magnetic.js      data-cursor-magnetic
├── effects/                  registry · shape (dot/ring/blob) · trail · particles · ripple ·
│                             spotlight · glow · snake · orbit · crosshair · image
└── presets.js                built-in presets + registry
scss/cursorly.scss            core styles (also inlined into the JS builds)
types/index.d.ts              TypeScript definitions
```

Each effect draws into its **own** fixed, click-through layer. They are not nested in a shared wrapper, so `mix-blend-mode` blends with the page itself. The core reads the pointer once per frame and hands every effect the same frame object. Effects never add event listeners.

## Notes

- **Blend modes** (`blob`, `blend: 'difference'`) blend with whatever shares the root stacking context. An ancestor of the layers with `isolation: isolate`, `transform`, `filter` or `opacity < 1` limits the blend. Keep `container` at its default (`<body>`).
- Elements in the browser's **top layer** (`<dialog>` opened with `showModal()`, fullscreen elements) paint above the cursor. Pass the dialog as `container` while it is open if you need the cursor there.
- Elements that are clickable only through JavaScript (`div` with an `onclick`) are not detected. Add `data-cursor` or `role="button"`.
- **SSR**: importing is safe on the server, and constructing there gives an inert instance.

## Browser support

Current Chrome, Edge, Firefox and Safari (it needs Pointer Events, `:is()`/complex `:not()`, CSS `translate` and `mix-blend-mode`). The automated tests run in Chromium.

## Development

```bash
npm install
npm run dev     # rebuild dist/ and demo/demo.css on change
npm test        # unit tests (Node) + end-to-end tests (Chromium via Playwright)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [RELEASING.md](RELEASING.md).

## License

[MIT](LICENSE) © Jewel Khan
