import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../../src/effects/index.js';
import { DEFAULTS, merge, normalizeEffect, resolveOptions, uniqueIds } from '../../src/core/options.js';
import { registerPreset } from '../../src/presets.js';

test('defaults to the classic preset', () => {
  const options = resolveOptions();
  assert.equal(options.preset, 'classic');
  assert.deepEqual(
    options.effects.map((spec) => spec.type),
    ['ring', 'dot'],
  );
  assert.equal(options.color, DEFAULTS.color);
});

test('effects replace the preset list', () => {
  const options = resolveOptions({ preset: 'neon', effects: ['blob'] });
  assert.deepEqual(
    options.effects.map((spec) => spec.type),
    ['blob'],
  );
});

test('effects without a preset do not pull in classic', () => {
  const options = resolveOptions({ effects: [{ type: 'trail', width: 4 }] });
  assert.equal(options.preset, null);
  assert.deepEqual(options.effects, [{ id: 'trail', type: 'trail', options: { width: 4 } }]);
});

test('unknown presets fall back to classic with a warning', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  assert.equal(resolveOptions({ preset: 'nope' }).preset, 'classic');
  assert.equal(warn.mock.callCount(), 1);
});

test('preset options sit between defaults and user options', () => {
  registerPreset('test-themed', { effects: ['dot'], options: { color: '#fff', accent: '#000' } });
  const options = resolveOptions({ preset: 'test-themed', accent: '#f00' });
  assert.equal(options.color, '#fff');
  assert.equal(options.accent, '#f00');
});

test('invalid enum options fall back to defaults', () => {
  const options = resolveOptions({ reducedMotion: 'sometimes', hideNativeCursor: 'maybe', magneticStrength: 'x' });
  assert.equal(options.reducedMotion, 'reduce');
  assert.equal(options.hideNativeCursor, true);
  assert.equal(options.magneticStrength, 0);
});

test('normalizeEffect accepts names and objects', () => {
  assert.deepEqual(normalizeEffect('dot'), { id: 'dot', type: 'dot', options: {} });
  assert.deepEqual(normalizeEffect({ type: 'dot', id: 'big', size: 20 }), { id: 'big', type: 'dot', options: { size: 20 } });
  assert.throws(() => normalizeEffect({ size: 3 }), TypeError);
  assert.throws(() => normalizeEffect(42), TypeError);
});

test('uniqueIds suffixes duplicates', () => {
  const ids = uniqueIds(['dot', 'dot', 'ring'].map(normalizeEffect), new Set(['ring'])).map((spec) => spec.id);
  assert.deepEqual(ids, ['dot', 'dot-2', 'ring-2']);
});

test('merge deep-merges plain objects and replaces arrays', () => {
  const base = { size: 1, states: { pointer: { scale: 2, fill: 0.1 }, text: { scale: 0 } }, colors: ['a', 'b'] };
  const out = merge(base, { states: { pointer: { scale: 3 } }, colors: ['c'] });
  assert.deepEqual(out, { size: 1, states: { pointer: { scale: 3, fill: 0.1 }, text: { scale: 0 } }, colors: ['c'] });
  assert.equal(base.states.pointer.scale, 2, 'base is not mutated');
});
