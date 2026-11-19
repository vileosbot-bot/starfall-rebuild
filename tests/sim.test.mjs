import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIXED_STEP_SECONDS,
  WAVE_INTERVAL_TICKS,
  calculateDamage,
  createSimulation,
  purchaseEquipment,
  stepSimulation,
} from '../src/sim.ts';

function entity(world, id) {
  const result = world.entities.find((candidate) => candidate.id === id);
  assert.ok(result, 'missing entity: ' + id);
  return result;
}

test('same seed and fixed steps produce identical world state', () => {
  const initial = createSimulation(20261119);
  const left = createSimulation(20261119);
  const right = createSimulation(20261119);
  stepSimulation(left, 240);
  stepSimulation(right, 240);
  assert.equal(left.stepSeconds, FIXED_STEP_SECONDS);
  assert.deepEqual(left, right);
  assert.equal(initial.entities.filter((item) => item.kind === 'hero').length, 10);
  assert.equal(initial.entities.filter((item) => item.kind === 'monster').length, 2);
  assert.equal(initial.entities.filter((item) => item.kind === 'tower').length, 4);
  assert.equal(initial.entities.filter((item) => item.kind === 'crystal').length, 2);
  for (const role of ['vanguard', 'ranger', 'arcanist', 'duelist', 'guardian']) {
    const blue = entity(initial, 'blue-hero-' + role);
    const red = entity(initial, 'red-hero-' + role);
    assert.equal(blue.maxHp, red.maxHp);
    assert.equal(blue.attackDamage, red.attackDamage);
    assert.equal(blue.magicPower, red.magicPower);
  }
});

test('physical and magic damage use their matching defense values', () => {
  const physical = calculateDamage(
    { damageType: 'physical', attackDamage: 60, magicPower: 0 },
    { armor: 20, resistance: 90 },
  );
  const magic = calculateDamage(
    { damageType: 'magic', attackDamage: 0, magicPower: 48 },
    { armor: 90, resistance: 60 },
  );
  assert.equal(physical, 50);
  assert.equal(magic, 30);
});

test('hero kills grant gold and experience and can trigger a level-up', () => {
  const world = createSimulation(7);
  const killer = entity(world, 'blue-hero-vanguard');
  const victim = entity(world, 'red-hero-vanguard');
  killer.position = { x: 0, y: 0 };
  killer.gold = 20;
  killer.experience = 90;
  killer.cooldownRemaining = 0;
  killer.critChance = 0;
  victim.position = { x: 0, y: 0 };
  victim.hp = 1;

  stepSimulation(world, 1);

  assert.equal(victim.alive, false);
  assert.equal(killer.kills, 1);
  assert.equal(killer.gold, 100);
  assert.equal(killer.level, 2);
  assert.equal(killer.experience, 110);
  assert.ok(world.events.some((event) => event.type === 'unit-died' && event.targetId === victim.id));
});

test('minion waves spawn on the first step and every 500 ticks thereafter', () => {
  const world = createSimulation(11);
  assert.equal(WAVE_INTERVAL_TICKS, 500);
  stepSimulation(world, 1);
  assert.equal(world.waveCount, 1);
  assert.equal(world.entities.filter((item) => item.kind === 'minion').length, 10);

  stepSimulation(world, 499);
  assert.equal(world.tick, 500);
  assert.equal(world.waveCount, 1);

  stepSimulation(world, 1);
  assert.equal(world.waveCount, 2);
  assert.equal(world.entities.filter((item) => item.kind === 'minion').length, 20);
  assert.equal(world.events.filter((event) => event.type === 'wave-spawned').length, 4);
});

test('destroying the exposed crystal ends the simulation immediately', () => {
  const world = createSimulation(13);
  stepSimulation(world, 1);
  const crystal = entity(world, 'red-crystal');
  const attacker = entity(world, 'blue-hero-vanguard');

  for (const unit of world.entities) {
    if (unit.team === 'red' && unit.kind !== 'crystal') {
      unit.alive = false;
      unit.hp = 0;
      unit.respawnTicks = 0;
    }
  }
  attacker.position = { ...crystal.position };
  attacker.attackDamage = 2000;
  attacker.damageType = 'physical';
  attacker.attackRange = 2;
  attacker.cooldownRemaining = 0;
  attacker.critChance = 0;
  crystal.hp = 1;

  stepSimulation(world, 1);
  assert.equal(crystal.alive, false);
  assert.equal(world.winner, 'blue');
  assert.equal(world.endReason, 'crystal-destroyed');
  assert.ok(world.events.some((event) => event.type === 'crystal-destroyed'));

  const terminalTick = world.tick;
  stepSimulation(world, 100);
  assert.equal(world.tick, terminalTick);
});

test('equipment purchase applies original item stats and prevents duplicate purchases', () => {
  const world = createSimulation(17);
  const hero = entity(world, 'blue-hero-ranger');
  const beforeDamage = hero.attackDamage;
  const beforeGold = hero.gold;

  assert.equal(purchaseEquipment(world, hero.id, 'ember-blade'), true);
  assert.equal(hero.attackDamage, beforeDamage + 20);
  assert.equal(hero.gold, beforeGold - 180);
  assert.deepEqual(hero.inventory, ['ember-blade']);
  assert.equal(purchaseEquipment(world, hero.id, 'ember-blade'), false);
});

test('living heroes move by a deterministic fixed-step amount', () => {
  const world = createSimulation(19);
  const hero = entity(world, 'blue-hero-vanguard');
  const before = hero.position.x;
  stepSimulation(world, 1);
  assert.ok(hero.position.x > before);
  assert.equal(world.tick, 1);
});


test('towers automatically attack enemy minions inside their range', () => {
  const world = createSimulation(23);
  stepSimulation(world, 1);
  const tower = entity(world, 'blue-tower-2');
  const target = world.entities.find((unit) => unit.kind === 'minion' && unit.team === 'red' && unit.alive);
  assert.ok(target);
  tower.position = { x: 0, y: 0 };
  tower.attackRange = 6;
  tower.cooldownRemaining = 0;
  target.position = { x: 1, y: 0 };
  target.hp = 1;

  stepSimulation(world, 1);
  assert.equal(target.alive, false);
  assert.ok(world.events.some((event) => event.type === 'attack' && event.sourceId === tower.id && event.targetId === target.id));
});
