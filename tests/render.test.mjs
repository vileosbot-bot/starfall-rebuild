import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createSimulation } from '../src/sim.ts';
import assert from 'node:assert/strict';
import { getSkillAimPreviewData, projectSimPointToScreen, screenToGroundPoint } from '../src/render.ts';

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


test('aim preview data exposes skill range and area radius and clears for absent or non-target skills', () => {
  const world = createSimulation(20261125, 'ranger');
  const hero = world.entities.find((entity) => entity.id === world.playerHeroId);
  hero.position = { x: 1.5, y: -2 };
  assert.deepEqual(getSkillAimPreviewData(world, 'E', { x: 4, y: 3 }), {
    origin: { x: 1.5, y: -2 },
    aimPosition: { x: 4, y: 3 },
    range: 6,
    radius: 2.2,
  });
  assert.deepEqual(getSkillAimPreviewData(world, 'Q', null), {
    origin: { x: 1.5, y: -2 },
    aimPosition: null,
    range: 7,
    radius: null,
  });
  assert.equal(getSkillAimPreviewData(world, null, { x: 0, y: 0 }), null);
  const guardianWorld = createSimulation(20261126, 'guardian');
  assert.equal(getSkillAimPreviewData(guardianWorld, 'E', { x: 0, y: 0 }), null);
});

test('render scene owns and clears the temporary aim preview group', async () => {
  const source = await readFile(new URL('../src/render.ts', import.meta.url), 'utf8');
  assert.match(source, /aimPreview\.name = 'skill-aim-preview'/);
  assert.match(source, /function clearSkillAimPreview\(\)/);
  assert.match(source, /aimPreview\.visible = false/);
  assert.match(source, /aimPreview\.visible = true/);
  assert.match(source, /setSkillAimPreview,/);
  assert.match(source, /clearSkillAimPreview\(\);\s*scene\.remove\(aimPreview\)/);
});
