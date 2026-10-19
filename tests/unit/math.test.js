import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, easeOutCubic, follow, pick, random } from '../../src/core/math.js';
import { Smooth } from '../../src/effects/shared.js';

test('follow is frame-rate independent', () => {
  let at60 = 0;
  for (let i = 0; i < 60; i++) at60 = follow(at60, 100, 0.1, 1 / 60);
  let at120 = 0;
  for (let i = 0; i < 120; i++) at120 = follow(at120, 100, 0.1, 1 / 120);
  assert.ok(Math.abs(at60 - at120) < 0.01, `${at60} vs ${at120}`);
});

test('follow edge cases', () => {
  assert.equal(follow(0, 50, 1, 1 / 60), 50, 'ease 1 jumps');
  assert.equal(follow(10, 50, 0, 1 / 60), 10, 'ease 0 stays');
  assert.equal(follow(NaN, 50, 0.2, 1 / 60), 50, 'invalid current jumps');
  assert.equal(follow(49.9999, 50, 0.2, 1 / 60), 50, 'snaps when close');
});

test('Smooth applies first targets directly and reports busy', () => {
  const s = new Smooth({ x: 0 });
  s.frame();
  s.to({ x: 100 }, 0.2, 1 / 60);
  assert.equal(s.value.x, 100, 'first target is applied directly');
  assert.equal(s.busy, false);
  s.frame();
  s.to({ x: 0 }, 0.2, 1 / 60);
  assert.ok(s.value.x < 100 && s.value.x > 0);
  assert.equal(s.busy, true);
});

test('helpers', () => {
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(random(4), 4);
  const value = random([2, 3]);
  assert.ok(value >= 2 && value <= 3);
  assert.ok(['a', 'b'].includes(pick(['a', 'b'])));
  assert.equal(pick('a'), 'a');
});
