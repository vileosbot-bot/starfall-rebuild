import test from 'node:test';
import assert from 'node:assert/strict';
import { HERO_SCREEN_FRACTION, updateLocomotion } from '../dist/render3d.js';

test('camera hero occupancy matches the 1/10 reference scale', () => {
  assert.equal(HERO_SCREEN_FRACTION, 1 / 10);
});

test('render locomotion holds its gait across 30 Hz simulation gaps at 60 Hz render cadence', () => {
  const state = { move: 0 };
  const dt = 1 / 60;
  const samples = [];
  for (let frame = 0; frame < 12; frame++) {
    const speed = frame % 2 === 0 ? 12 : 0;
    updateLocomotion(state, speed, dt, true, false);
    samples.push(state.move);
  }
  assert.ok(samples[9] > .8, `movement blend should settle while sim updates every other frame: ${samples[9]}`);
  assert.ok(samples.slice(2, 12).every((value, i, values) => i === 0 || value >= values[i - 1] - .04), `movement blend should not flicker: ${samples.join(',')}`);
  updateLocomotion(state, 12, dt, true, true);
  assert.equal(state.moveHold, 0, 'teleport clears the movement hold');
});
