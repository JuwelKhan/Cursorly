/**
 * Browser tests against demo/index.html (needs `npm run build` first).
 * Uses the Playwright library with the locally installed Chromium; skipped
 * automatically when no browser is available.
 */
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DEMO = pathToFileURL(path.join(ROOT, 'demo/index.html')).href;
const FIXTURE = pathToFileURL(path.join(ROOT, 'tests/e2e/fixtures/auto-init.html')).href;

let browser;
let skip = false;

before(async () => {
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch();
  } catch (error) {
    skip = `Playwright/Chromium not available: ${error.message.split('\n')[0]}`;
  }
});

after(async () => browser?.close());

/** Fresh page; fails the test on any uncaught page error. */
async function open(url = DEMO, contextOptions = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...contextOptions });
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', (error) => page.errors.push(error.message));
  await page.goto(url);
  return page;
}

async function close(page) {
  assert.deepEqual(page.errors, []);
  await page.context().close();
}

const settle = (page, ms = 600) => page.waitForTimeout(ms);

/** Moves the pointer to the centre of an element (after scrolling it into view). */
async function hover(page, selector) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  return box;
}

const layerBox = (page, type) =>
  page.evaluate((t) => {
    const el = document.querySelector(`.cly-layer--${t} .cly-shape`);
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, width: r.width, height: r.height, opacity: Number(getComputedStyle(el).opacity) };
  }, type);

describe('Cursorly demo', () => {
  test('mounts the classic preset and follows the pointer', async (t) => {
    if (skip) return t.skip(skip);
    const page = await open();
    assert.deepEqual(await page.evaluate(() => [demoCursor.running, demoCursor.effects]), [true, ['ring', 'dot']]);
    assert.equal(await page.locator('.cly-layer').count(), 2);
    assert.equal(await page.locator('.cly-layer[aria-hidden="true"]').count(), 2);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('cly-hide-cursor')), false, 'native cursor stays until the first move');

    await page.mouse.move(400, 500);
    await page.mouse.move(420, 520);
    await settle(page);
    const dot = await layerBox(page, 'dot');
    assert.ok(Math.abs(dot.x - 420) < 1 && Math.abs(dot.y - 520) < 1, JSON.stringify(dot));
    const ring = await layerBox(page, 'ring');
    assert.ok(Math.abs(ring.x - 420) < 1 && Math.abs(ring.y - 520) < 1, 'ring catches up');
    assert.equal(dot.opacity, 1);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('cly-hide-cursor')), true);
    await close(page);
  });

  test('links get the pointer state, text fields the text state with the native I-beam', async (t) => {
    if (skip) return t.skip(skip);
    const page = await open();
    await page.evaluate(() => {
      window.events = [];
      demoCursor.on('enter', ({ state }) => events.push(`enter:${state}`));
      demoCursor.on('statechange', ({ state }) => events.push(`state:${state}`));
    });
    await hover(page, '.tile a[href="#playground"]');
    await settle(page);
    assert.equal(await page.evaluate(() => demoCursor.state), 'pointer');
    const ring = await layerBox(page, 'ring');
    assert.ok(ring.width > 38 * 1.5, `ring grows on links (${ring.width})`);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.tile a')).cursor), 'none');

    await hover(page, '.field');
    await settle(page, 1000);
    assert.equal(await page.evaluate(() => demoCursor.state), 'text');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.field')).cursor), 'text');
    assert.ok((await layerBox(page, 'ring')).width < 1, 'ring hides over text fields');
    const events = await page.evaluate(() => events);
    assert.ok(events.includes('enter:pointer') && events.includes('state:text'), events.join());
    await close(page);
  });

  test('data-cursor-text shows a label inside the ring', async (t) => {
    if (skip) return t.skip(skip);
    const page = await open();
    await hover(page, '.art--1');
    await settle(page);
    const label = await page.evaluate(() => {
      const el = document.querySelector('.cly-layer--ring .cly-shape__label');
      return { text: el.textContent, opacity: Number(el.style.opacity) };
    });
    assert.deepEqual(label, { text: 'View', opacity: 1 });
    assert.ok((await layerBox(page, 'ring')).width > 80);
    assert.ok((await layerBox(page, 'dot')).width < 1, 'dot hides behind the label');
    await close(page);
  });

  test('magnetic elements follow the pointer and sticky elements are wrapped by the ring', async (t) => {
    if (skip) return t.skip(skip);
    const page = await open();
    const box = await hover(page, '.round');
    await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2, { steps: 3 });
    await settle(page);
    const translate = await page.evaluate(() => document.querySelector('.round').style.translate);
    assert.match(translate, /^\d+(\.\d+)?px/, 'pulled to the right');
    assert.ok(parseFloat(translate) > 3, translate);

    const ring = await layerBox(page, 'ring');
    assert.ok(Math.abs(ring.width - (box.width + 12)) < 2, `ring wraps the button (${ring.width} vs ${box.width})`);

    await page.mouse.move(box.x - 200, box.y - 200, { steps: 3 });
    await settle(page, 900);
    assert.equal(await page.evaluate(() => document.querySelector('.round').style.translate), '', 'eases back and cleans up');
    await close(page);
  });

  test('data-cursor-color recolours and data-cursor-hide gives the native cursor back', async (t) => {
    if (skip) return t.skip(skip);
    const page = await open();
    await hover(page, '.swatch[data-cursor-color="#3b5bff"]');
    await settle(page);
    assert.equal(await page.evaluate(() => document.querySelector('.cly-layer--dot .cly-shape').style.getPropertyValue('--cly-c')), '#3b5bff');

    await hover(page, '.tile--hatched');
    await settle(page);
    assert.equal((await layerBox(page, 'dot')).opacity, 0);
    assert.equal(await page.evaluate(() => document.documentElement.className), '');
    await close(page);
  });

  test('every preset mounts, animates and reacts to clicks without errors', async (t) => {
    if (skip) return t.skip(skip);
    const page = await open();
    const presets = await page.evaluate(() => Cursorly.presets);
    assert.ok(presets.length >= 12);
    for (const name of presets) {
      await page.evaluate((n) => document.querySelector(`[data-preset="${n}"]`).click(), name);
      await page.mouse.move(200, 300);
      await page.mouse.move(700, 400, { steps: 10 });
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(120);
      const mounted = await page.evaluate(() => ({ layers: document.querySelectorAll('.cly-layer').length, effects: demoCursor.effects.length }));
      assert.equal(mounted.layers, mounted.effects, name);
    }
    await close(page);
  });

  test('the frame loop goes idle when nothing moves', async (t) => {
    if (skip) return t.skip(skip);
    const page = await open();
    await page.mouse.move(300, 300);
    await page.mouse.move(500, 400, { steps: 5 });
    await settle(page, 1500);
    const frames = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let count = 0;
          const raf = window.requestAnimationFrame;
          window.requestAnimationFrame = (callback) => (count++, raf(callback));
          setTimeout(() => {
            window.requestAnimationFrame = raf;
            resolve(count);
          }, 400);
        }),
    );
    assert.equal(frames, 0);
    await close(page);
  });

  test('API: effects, overrides, stop/start and destroy', async (t) => {
    if (skip) return t.skip(skip);
    const page = await open();
    await page.mouse.move(600, 400);
    const result = await page.evaluate(async () => {
      const wait = () => new Promise((r) => setTimeout(r, 400));
      const out = {};
      let updates = 0;
      Cursorly.registerEffect('counter', () => ({ update: () => (updates++, false) }));
      const id = demoCursor.addEffect('counter');
      const id2 = demoCursor.addEffect({ type: 'dot', size: 30 });
      out.ids = [id, id2];
      out.layers = document.querySelectorAll('.cly-layer').length;
      demoCursor.setEffectOptions('dot-2', { size: 50 });
      out.size = demoCursor.getEffectOptions('dot-2').size;
      demoCursor.removeEffect('dot-2');
      demoCursor.setText('Hey');
      await wait();
      out.updates = updates > 0;
      out.label = document.querySelector('.cly-layer--ring .cly-shape__label').textContent;
      demoCursor.setText(null);
      demoCursor.stop();
      out.stopped = [demoCursor.running, document.documentElement.className, document.querySelector('.cly-layer').hidden];
      demoCursor.start();
      out.started = [demoCursor.running, document.querySelector('.cly-layer').hidden];
      demoCursor.destroy();
      out.destroyed = document.querySelectorAll('.cly-layer').length;
      return out;
    });
    assert.deepEqual(result, {
      ids: ['counter', 'dot-2'],
      layers: 4,
      size: 50,
      updates: true,
      label: 'Hey',
      stopped: [false, '', true],
      started: [true, false],
      destroyed: 0,
    });
    await close(page);
  });

  test('stays off on touch-only devices unless touch: true', async (t) => {
    if (skip) return t.skip(skip);
    const page = await open(DEMO, { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    const fine = await page.evaluate(() => matchMedia('(any-pointer: fine)').matches);
    if (fine) {
      await close(page);
      return t.skip('this Chromium build reports a fine pointer in mobile emulation');
    }
    assert.equal(await page.evaluate(() => [demoCursor.enabled, demoCursor.running].join()), 'true,false');
    assert.equal(await page.evaluate(() => new Cursorly({ touch: true }).running), true);
    await close(page);
  });

  test('respects prefers-reduced-motion', async (t) => {
    if (skip) return t.skip(skip);
    const page = await open(DEMO, { reducedMotion: 'reduce' });
    await page.mouse.move(100, 100);
    await page.mouse.move(700, 500);
    await page.waitForTimeout(50);
    const ring = await layerBox(page, 'ring');
    assert.ok(Math.abs(ring.x - 700) < 1, 'ring no longer lags behind');
    assert.equal(await page.evaluate(() => new Cursorly({ reducedMotion: 'disable', injectCSS: false }).running), false);
    await close(page);
  });

  test('auto-initialises from data-cursorly', async (t) => {
    if (skip) return t.skip(skip);
    const page = await open(FIXTURE);
    const info = await page.evaluate(() => {
      const cursor = document.querySelector('[data-cursorly]').cursorly;
      return { effects: cursor.effects, color: cursor.options.color, css: Boolean(document.getElementById('cursorly-css')) };
    });
    assert.deepEqual(info, { effects: ['blob'], color: '#ff0000', css: true });
    await hover(page, 'button');
    await settle(page);
    assert.equal(await page.evaluate(() => document.querySelector('[data-cursorly]').cursorly.state), 'custom');
    await page.mouse.wheel(0, 300);
    await settle(page, 300);
    assert.equal(await page.evaluate(() => document.querySelector('[data-cursorly]').cursorly.state), null, 'scrolling away updates the state');
    await close(page);
  });
});
