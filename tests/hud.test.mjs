import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT } from '../src/sim.ts';
import {
  formatGameTime,
  formatGold,
  getEquipmentAvailability,
  SKILL_HINTS,
} from '../src/hud.ts';

test('game time formats zero, one minute, and ten minutes from fixed simulation ticks', () => {
  assert.equal(formatGameTime(0), '00:00');
  assert.equal(formatGameTime(1200), '01:00');
  assert.equal(formatGameTime(12000), '10:00');
});

test('gold display uses a readable grouped integer', () => {
  assert.equal(formatGold(9959), '9,959');
  assert.equal(formatGold(0), '0');
});

test('shop availability covers enough gold, insufficient gold, full inventory, and duplicate ownership', () => {
  const item = EQUIPMENT['ember-blade'];
  assert.equal(getEquipmentAvailability({ gold: item.cost, inventory: [] }, item), 'available');
  assert.equal(getEquipmentAvailability({ gold: item.cost - 1, inventory: [] }, item), 'insufficient-gold');
  assert.equal(getEquipmentAvailability({ gold: 5000, inventory: ['gale-fang', 'tide-ward', 'star-core'] }, item), 'inventory-full');
  assert.equal(getEquipmentAvailability({ gold: 5000, inventory: ['ember-blade'] }, item), 'already-owned');
});

test('every skill and action key has a non-empty placeholder hint', () => {
  assert.deepEqual(SKILL_HINTS.map((entry) => entry.key), ['Q', 'E', 'R', 'F', 'G', 'B', 'Space']);
  assert.ok(SKILL_HINTS.every((entry) => entry.text.trim().length > 0));
});
