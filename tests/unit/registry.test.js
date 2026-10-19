import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../../src/effects/index.js';
import { getEffect, listEffects, registerEffect } from '../../src/effects/registry.js';
import { getPreset, listPresets, registerPreset } from '../../src/presets.js';
import { normalizeEffect } from '../../src/core/options.js';

const BUILT_IN = ['dot', 'ring', 'blob', 'trail', 'particles', 'ripple', 'spotlight', 'glow', 'snake', 'orbit', 'crosshair', 'image'];

test('all built-in effects are registered with a description and defaults', () => {
  for (const name of BUILT_IN) {
    const effect = getEffect(name);
    assert.ok(effect, name);
    assert.equal(typeof effect.create, 'function', name);
    assert.ok(effect.description.length > 10, `${name} description`);
    assert.equal(typeof effect.defaults, 'object', name);
  }
});

test('every preset only uses registered effects and known options', () => {
  assert.ok(listPresets().length >= 12);
  for (const name of listPresets()) {
    const preset = getPreset(name);
    assert.ok(preset.description, `${name} description`);
    assert.ok(preset.effects.length > 0, `${name} effects`);
    for (const spec of preset.effects) {
      const { type, options } = normalizeEffect(spec);
      const effect = getEffect(type);
      assert.ok(effect, `${name}: unknown effect ${type}`);
      for (const key of Object.keys(options)) {
        assert.ok(key in effect.defaults, `${name}: "${type}" has no option "${key}"`);
      }
    }
  }
});

test('custom effects can be registered as functions or objects', () => {
  registerEffect('test-fn', () => ({}));
  registerEffect('test-obj', { defaults: { size: 3 }, create: () => ({}) });
  assert.ok(listEffects().includes('test-fn'));
  assert.equal(getEffect('test-obj').defaults.size, 3);
  assert.ok(Object.isFrozen(getEffect('test-obj').defaults));
  assert.throws(() => registerEffect('broken', {}), TypeError);
  assert.throws(() => registerEffect('', () => ({})), TypeError);
});

test('unknown effects and presets resolve to null', () => {
  assert.equal(getEffect('nope'), null);
  assert.equal(getPreset('nope'), null);
});

test('custom presets need an effects array', () => {
  registerPreset('test-preset', { effects: ['dot'], options: { color: 'red' } });
  assert.deepEqual(getPreset('test-preset').options, { color: 'red' });
  assert.throws(() => registerPreset('broken', {}), TypeError);
});
