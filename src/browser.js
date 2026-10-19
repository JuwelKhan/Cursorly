/**
 * Browser (IIFE) entry — exposes `window.Cursorly` and auto-initialises the
 * first element with a `data-cursorly` attribute (usually <body> or the
 * <script> tag itself). The value is a preset name or JSON options:
 *
 *   <script src="cursorly.min.js" data-cursorly="classic"></script>
 *   <body data-cursorly='{"preset": "blend", "magnetic": false}'>
 */
import { Cursorly } from './core/Cursorly.js';

function parseOptions(value) {
  const text = (value || '').trim();
  if (!text) return {};
  if (!text.startsWith('{')) return { preset: text };
  try {
    return JSON.parse(text);
  } catch {
    console.warn('Cursorly: data-cursorly must be a preset name or valid JSON options.');
    return {};
  }
}

function autoInit() {
  const el = document.querySelector('[data-cursorly]');
  if (el && !el.cursorly) el.cursorly = new Cursorly(parseOptions(el.dataset.cursorly));
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit);
  else autoInit();
}

export default Cursorly;
