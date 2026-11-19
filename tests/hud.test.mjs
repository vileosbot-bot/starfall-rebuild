import test from 'node:test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { EQUIPMENT, FIRST_WAVE_TICK, createSimulation, getLoggedGoldBalance, purchaseEquipment, stepSimulation } from '../src/sim.ts';
import {
  formatGameTime,
  formatGold,
  getEquipmentAvailability,
  getPlayerHeroId,
  purchaseEquipmentForSelectedHero,
  createMatchSession,
  HERO_ROLES,
  SKILL_HINTS,
  getSkillHudState,
  getChannelHudState,
  getMinimapMarkers,
} from '../src/hud.ts';

test('game time formats zero, ten seconds, one minute, and ten minutes from fixed simulation ticks', () => {
  assert.equal(formatGameTime(0), '00:00');
  assert.equal(formatGameTime(200), '00:10');
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

test('hero selection binds the player shop target to each selected blue hero', () => {
  assert.deepEqual(HERO_ROLES.map((role) => getPlayerHeroId(role)), [
    'blue-hero-vanguard',
    'blue-hero-ranger',
    'blue-hero-arcanist',
    'blue-hero-duelist',
    'blue-hero-guardian',
  ]);
  assert.equal(getPlayerHeroId('ranger'), 'blue-hero-ranger');
});

test('returning to the menu clears the active match and the next selection starts a fresh world', () => {
  const session = createMatchSession();
  const firstWorld = session.enter('ranger', () => ({ tick: 240, gold: 640 }));
  assert.equal(session.selectedRole, 'ranger');
  assert.equal(session.world, firstWorld);
  assert.equal(session.world.tick, 240);
  assert.throws(() => session.enter('guardian', () => ({ tick: 0, gold: 320 })), /already active/);

  assert.equal(session.leave(), firstWorld);
  assert.equal(session.world, null);
  assert.equal(session.selectedRole, null);

  const nextWorld = session.enter('guardian', () => ({ tick: 0, gold: 320 }));
  assert.notEqual(nextWorld, firstWorld);
  assert.equal(session.selectedRole, 'guardian');
  assert.equal(session.world.tick, 0);
  assert.equal(session.world.gold, 320);
});

test('manual purchase charges and equips the selected non-vanguard hero only', () => {
  const world = createSimulation(20261119);
  const ranger = world.entities.find((entity) => entity.id === 'blue-hero-ranger');
  const vanguard = world.entities.find((entity) => entity.id === 'blue-hero-vanguard');
  assert.ok(ranger);
  assert.ok(vanguard);
  const rangerGoldBefore = ranger.gold;
  const vanguardGoldBefore = vanguard.gold;

  assert.equal(purchaseEquipmentForSelectedHero(world, 'ranger', 'ember-blade'), true);
  assert.deepEqual(ranger.inventory, ['ember-blade']);
  assert.equal(ranger.gold, rangerGoldBefore - EQUIPMENT['ember-blade'].cost);
  assert.deepEqual(vanguard.inventory, []);
  assert.equal(vanguard.gold, vanguardGoldBefore);
});


test('skill HUD reports cooldown seconds and mana insufficiency', () => {
  const hero = { mana: 10, skillCooldowns: { Q: 40, E: 0, R: 0, F: 0, G: 0, B: 0 } };
  assert.deepEqual(getSkillHudState(hero, 'arcanist', 'Q'), {
    cooldownTicks: 40,
    cooldownSeconds: 2,
    manaInsufficient: true,
  });
  assert.equal(getSkillHudState(hero, 'arcanist', 'F').manaInsufficient, false);
});

test('channel HUD exposes progress and remaining time for G and B', () => {
  assert.deepEqual(getChannelHudState({ channel: { kind: 'recall', totalTicks: 100, remainingTicks: 40 } }), {
    label: '回城',
    progress: 0.6,
    remainingSeconds: 2,
  });
  assert.deepEqual(getChannelHudState({ channel: { kind: 'heal', totalTicks: 100, remainingTicks: 90 } }), {
    label: '疗伤',
    progress: 0.1,
    remainingSeconds: 4.5,
  });
  assert.equal(getChannelHudState({ channel: null }), null);
});


test('HUD wallet balance is read from the per-hero gold transaction ledger', () => {
  const world = createSimulation(20261120, 'vanguard');
  const hero = world.entities.find((unit) => unit.id === 'blue-hero-vanguard');
  assert.ok(hero);
  assert.equal(hero.gold, 300);
  assert.equal(getLoggedGoldBalance(world, hero.id), 300);

  stepSimulation(world, 200);
  assert.equal(hero.gold, 302);
  assert.equal(getLoggedGoldBalance(world, hero.id), hero.gold);

  assert.equal(purchaseEquipment(world, hero.id, 'ember-blade'), true);
  assert.equal(hero.gold, 122);
  assert.equal(getLoggedGoldBalance(world, hero.id), hero.gold);
  const purchase = world.events.find((event) =>
    event.type === 'gold-transaction' && event.recipientId === hero.id &&
    event.incomeSource === 'equipment-purchase'
  );
  assert.ok(purchase);
  assert.equal(purchase.amount, -180);
  assert.equal(purchase.balanceAfter, 122);
  assert.equal(typeof purchase.tick, 'number');
  assert.equal(typeof purchase.simSeconds, 'number');
});


test('minimap markers include both teams and highlight only the selected player hero', () => {
  const world = createSimulation(20261119);
  stepSimulation(world, FIRST_WAVE_TICK + 1);
  const selectedHeroId = getPlayerHeroId('ranger');
  const markers = getMinimapMarkers(world, selectedHeroId);
  assert.equal(markers.filter((marker) => marker.kind === 'hero').length, 10);
  assert.equal(markers.filter((marker) => marker.kind === 'tower').length, 4);
  assert.equal(markers.filter((marker) => marker.kind === 'crystal').length, 2);
  assert.ok(markers.some((marker) => marker.kind === 'minion'));
  assert.ok(markers.some((marker) => marker.id === selectedHeroId && marker.selected));
  assert.ok(markers.filter((marker) => marker.kind === 'hero' && marker.id !== selectedHeroId)
    .every((marker) => !marker.selected));
  assert.ok(markers.every((marker) => marker.team === 'blue' || marker.team === 'red'));
  assert.ok(!markers.some((marker) => marker.id.startsWith('neutral-')));
});

test('HUD contains a non-interactive minimap separated from the top bar and skillbar', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const render = await readFile(new URL('../src/render.ts', import.meta.url), 'utf8');
  assert.match(html, /<canvas id="minimap" width="192" height="192"/);
  assert.match(html, /#minimap\s*\{[^}]*top:\s*90px/s);
  assert.match(html, /#minimap\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(html, /\.skillbar\s*\{[^}]*bottom:\s*22px/s);
  for (const id of ['blue-score', 'red-score', 'game-time', 'team-gold', 'shop-panel', 'scoreboard-panel', 'winner-overlay']) {
    assert.ok(html.includes('id="' + id + '"'), 'existing HUD element remains: ' + id);
  }
  for (const geometry of ['CylinderGeometry', 'SphereGeometry', 'OctahedronGeometry', 'TorusGeometry']) {
    assert.ok(render.includes(geometry), 'distinct unit geometry remains: ' + geometry);
  }
  assert.ok(render.includes("entity.minionType === 'ranged'"));
  assert.ok(render.includes("entity.minionType === 'siege'"));
  assert.ok(render.includes("entity.minionType === 'super'"));
  assert.ok(render.includes('for (const laneZ of [-8, 0, 8])'));
  assert.ok(render.includes('riverGeometry'));
  assert.ok(render.includes('grassGeometry'));
});
