/* Cursorly demo page wiring (uses the global build: window.Cursorly). */
(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const THEMES = { light: { color: '#111111', accent: '#ff5a36' }, dark: { color: '#f4f1ea', accent: '#ff7a59' } };

  const cursor = new Cursorly({ preset: 'classic' });
  window.demoCursor = cursor; // handy for the console

  /* ---------- Theme ---------- */
  let theme = 'light';
  function setTheme(next) {
    theme = next;
    document.documentElement.dataset.theme = next;
    cursor.setOptions(THEMES[next]);
    $('[data-option="color"]').value = THEMES[next].color;
    $('[data-option="accent"]').value = THEMES[next].accent;
    renderCode();
  }
  $('[data-theme-toggle]').addEventListener('click', () => setTheme(theme === 'light' ? 'dark' : 'light'));

  /* ---------- Presets ---------- */
  const presetGrid = $('[data-presets]');
  const darkPresets = ['neon', 'rainbow', 'spotlight', 'glow', 'bubbles'];

  Cursorly.presets.forEach((name, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'preset';
    card.dataset.preset = name;
    card.dataset.cursorText = 'Try';
    card.style.setProperty('--i', i);
    card.innerHTML = `
      <span class="preset__index">${String(i + 1).padStart(2, '0')}</span>
      <span class="preset__name">${name}</span>
      <span class="preset__desc">${Cursorly.getPreset(name).description}</span>
      <code class="preset__code">preset: '${name}'</code>`;
    presetGrid.append(card);
  });

  function usePreset(name) {
    cursor.usePreset(name);
    if (darkPresets.includes(name) && theme === 'light') setTheme('dark');
    $$('.preset').forEach((card) => card.setAttribute('aria-pressed', String(card.dataset.preset === name)));
    $('[data-now]').textContent = name;
    syncEffectChecks();
    renderCode();
  }

  presetGrid.addEventListener('click', (event) => {
    const card = event.target.closest('[data-preset]');
    if (card) usePreset(card.dataset.preset);
  });

  $$('a[href="#presets"]').forEach((link) => {
    if (link.closest('.tile--dark')) link.addEventListener('click', () => usePreset('blend'));
  });

  /* ---------- Playground API buttons ---------- */
  const api = {
    text() {
      cursor.setText('Hi!');
      setTimeout(() => cursor.setText(null), 1600);
    },
    color() {
      cursor.setColor('#3b5bff');
      setTimeout(() => cursor.setColor(null), 1600);
    },
    hide() {
      cursor.hide();
      setTimeout(() => cursor.show(), 2000);
    },
  };
  $$('[data-api]').forEach((button) => button.addEventListener('click', () => api[button.dataset.api]()));

  /* ---------- Builder ---------- */
  const effectList = $('[data-effects]');
  Cursorly.effects.forEach((name) => {
    const label = document.createElement('label');
    label.className = 'effect';
    label.title = Cursorly.getEffect(name).description;
    label.innerHTML = `<input type="checkbox" value="${name}"><span>${name}</span>`;
    effectList.append(label);
  });

  function syncEffectChecks() {
    const types = cursor.options.effects.map((spec) => spec.type);
    $$('.effect input').forEach((input) => (input.checked = types.includes(input.value)));
  }

  effectList.addEventListener('change', (event) => {
    const name = event.target.value;
    if (event.target.checked) cursor.addEffect(name);
    else cursor.options.effects.filter((spec) => spec.type === name).forEach((spec) => cursor.removeEffect(spec.id));
    $('[data-now]').textContent = 'custom';
    $$('.preset').forEach((card) => card.setAttribute('aria-pressed', 'false'));
    renderCode();
  });

  $$('[data-option]').forEach((input) => {
    input.addEventListener('input', () => {
      const value = input.type === 'checkbox' ? input.checked : input.value;
      cursor.setOptions({ [input.dataset.option]: value });
      renderCode();
    });
  });

  function format(value) {
    if (typeof value === 'string') return `'${value}'`;
    if (Array.isArray(value)) return `[${value.map(format).join(', ')}]`;
    if (value && typeof value === 'object') {
      return `{ ${Object.entries(value)
        .map(([key, v]) => `${key}: ${format(v)}`)
        .join(', ')} }`;
    }
    return String(value);
  }

  function renderCode() {
    const { options } = cursor;
    const effects = options.effects.map((spec) => (Object.keys(spec.options).length ? format({ type: spec.type, ...spec.options }) : format(spec.type)));
    const lines = [`import Cursorly from 'cursorly';`, '', 'const cursor = new Cursorly({'];
    lines.push('  effects: [');
    effects.forEach((effect) => lines.push(`    ${effect},`));
    lines.push('  ],');
    if (options.color !== Cursorly.DEFAULTS.color) lines.push(`  color: '${options.color}',`);
    if (options.accent !== Cursorly.DEFAULTS.accent) lines.push(`  accent: '${options.accent}',`);
    if (!options.magnetic) lines.push('  magnetic: false,');
    lines.push('});');
    $('[data-code]').textContent = lines.join('\n');
  }

  /* ---------- Copy buttons ---------- */
  async function copy(text, done) {
    try {
      await navigator.clipboard.writeText(text);
      done('copied ✓');
    } catch {
      done('select & copy');
    }
  }
  $('[data-copy]').addEventListener('click', (event) => {
    const hint = $('[data-copy-hint]');
    copy(event.currentTarget.dataset.copy, (message) => {
      hint.textContent = message;
      cursor.setText('Copied');
      setTimeout(() => {
        hint.textContent = 'copy';
        cursor.setText(null);
      }, 1400);
    });
  });
  $('[data-copy-code]').addEventListener('click', (event) => {
    const button = event.currentTarget;
    copy($('[data-code]').textContent, (message) => {
      button.textContent = message;
      setTimeout(() => (button.textContent = 'Copy'), 1400);
    });
  });

  usePreset('classic');
})();
