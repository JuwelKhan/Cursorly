/* global __CURSORLY_CSS__ */
const CSS = typeof __CURSORLY_CSS__ !== 'undefined' ? __CURSORLY_CSS__ : '';
const STYLE_ID = 'cursorly-css';

/**
 * Injects the core stylesheet once. Skipped when dist/cursorly.css is already
 * on the page (it sets `--cursorly-css` on :root) or when the build has no CSS
 * inlined (running from src/ without a bundler).
 */
export function injectCSS(nonce) {
  if (!CSS || document.getElementById(STYLE_ID)) return;
  if (getComputedStyle(document.documentElement).getPropertyValue('--cursorly-css').trim()) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  if (nonce) style.nonce = nonce;
  style.textContent = CSS;
  document.head.prepend(style); // first, so page styles can override it
}

/** A canvas filling the viewport, sized for the device pixel ratio. */
export function createSurface(parent) {
  const canvas = document.createElement('canvas');
  canvas.className = 'cly-canvas';
  parent.append(canvas);
  const surface = {
    canvas,
    ctx: canvas.getContext('2d'),
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
    },
  };
  surface.fit();
  return surface;
}

export const media = (query) => (typeof matchMedia === 'function' ? matchMedia(query) : { matches: false, addEventListener() {}, removeEventListener() {} });
