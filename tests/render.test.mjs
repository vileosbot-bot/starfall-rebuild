import test from 'node:test';
import assert from 'node:assert/strict';
import { projectSimPointToScreen, screenToGroundPoint } from '../src/render.ts';

test('screen center intersects the ground plane at the simulation origin', () => {
  const point = screenToGroundPoint(640, 360, 1280, 720);
  assert.ok(point);
  assert.ok(Math.abs(point.x) < 1e-9);
  assert.ok(Math.abs(point.y) < 1e-9);
});

test('ground projection and screen-to-ground conversion round-trip simulation coordinates', () => {
  const original = { x: 2.5, y: -3.25 };
  const screen = projectSimPointToScreen(original, 1280, 720, 0);
  assert.ok(screen);
  const restored = screenToGroundPoint(screen.x, screen.y, 1280, 720);
  assert.ok(restored);
  assert.ok(Math.abs(restored.x - original.x) < 1e-8);
  assert.ok(Math.abs(restored.y - original.y) < 1e-8);
});

test('screen conversion rejects invalid canvas dimensions and projection rejects points behind the camera', () => {
  assert.equal(screenToGroundPoint(10, 10, 0, 720), null);
  assert.equal(screenToGroundPoint(10, 10, 1280, Number.NaN), null);
  assert.equal(projectSimPointToScreen({ x: 100, y: 100 }, 1280, 720, 0), null);
});
