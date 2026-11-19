import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_RULES,
  EQUIPMENT,
  FIXED_STEP_SECONDS,
  HERO_PURCHASE_ORDER,
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
  hero.position = { x: -12, y: -1.45 };
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

test('low-health hero enters retreat state and moves toward its own crystal', () => {
  const world = createSimulation(29);
  const hero = entity(world, 'blue-hero-vanguard');
  hero.position = { x: 0, y: 0 };
  hero.hp = hero.maxHp * (AI_RULES.retreatHealthRatio - 0.01);
  stepSimulation(world, 1);
  assert.equal(hero.aiState, 'retreat');
  assert.ok(hero.position.x < 0);
});

test('hero heals at its fountain and leaves only after reaching full health', () => {
  const world = createSimulation(31);
  const hero = entity(world, 'blue-hero-ranger');
  hero.position = { x: -13.5, y: 0 };
  hero.aiState = 'heal';
  hero.hp = hero.maxHp - 100;
  stepSimulation(world, 20);
  assert.equal(hero.hp, hero.maxHp - 70);
  assert.equal(hero.aiState, 'heal');
  stepSimulation(world, 47);
  assert.equal(hero.hp, hero.maxHp);
  assert.equal(hero.aiState, 'push');
});

test('AI automatically buys the first role-recommended item when affordable', () => {
  const world = createSimulation(37);
  const hero = entity(world, 'blue-hero-ranger');
  hero.gold = EQUIPMENT['ember-blade'].cost;
  stepSimulation(world, 1);
  assert.deepEqual(hero.inventory, [HERO_PURCHASE_ORDER.ranger[0]]);
  assert.ok(world.events.some((event) => event.type === 'item-purchased' && event.sourceId === hero.id));
});

test('six-item catalog contains two original items in each category', () => {
  const items = Object.values(EQUIPMENT);
  assert.equal(items.length, 6);
  assert.equal(items.filter((item) => item.category === 'physical').length, 2);
  assert.equal(items.filter((item) => item.category === 'magic').length, 2);
  assert.equal(items.filter((item) => item.category === 'defense').length, 2);
  for (const order of Object.values(HERO_PURCHASE_ORDER)) assert.equal(order.length, 3);
});

test('AI executes the lowest-health nearby enemy hero before minions, otherwise farms the nearest minion', () => {
  const executeWorld = createSimulation(59);
  stepSimulation(executeWorld, 1);
  const executor = entity(executeWorld, 'blue-hero-vanguard');
  const lowHero = entity(executeWorld, 'red-hero-vanguard');
  const otherLowHero = entity(executeWorld, 'red-hero-ranger');
  const minion = executeWorld.entities.find((unit) => unit.kind === 'minion' && unit.team === 'red' && unit.alive);
  assert.ok(minion);
  executor.position = { x: 0, y: 0 };
  executor.attackRange = 2;
  executor.attackDamage = 2000;
  executor.critChance = 0;
  lowHero.position = { x: 1, y: 0 };
  lowHero.hp = 80;
  otherLowHero.position = { x: 1.2, y: 0 };
  otherLowHero.hp = 120;
  minion.position = { x: 0.5, y: 0 };
  minion.hp = 10000;
  stepSimulation(executeWorld, 1);
  assert.ok(executeWorld.events.some((event) => event.type === 'attack' && event.sourceId === executor.id && event.targetId === lowHero.id));

  const farmWorld = createSimulation(61);
  stepSimulation(farmWorld, 1);
  const farmer = entity(farmWorld, 'blue-hero-vanguard');
  const healthyHero = entity(farmWorld, 'red-hero-vanguard');
  const enemyMinion = farmWorld.entities.find((unit) => unit.kind === 'minion' && unit.team === 'red' && unit.alive);
  assert.ok(enemyMinion);
  farmer.position = { x: 0, y: 0 };
  farmer.attackRange = 2;
  farmer.attackDamage = 2000;
  farmer.critChance = 0;
  healthyHero.position = { x: 1, y: 0 };
  enemyMinion.position = { x: 0.5, y: 0 };
  enemyMinion.hp = 10000;
  stepSimulation(farmWorld, 1);
  assert.ok(farmWorld.events.some((event) => event.type === 'attack' && event.sourceId === farmer.id && event.targetId === enemyMinion.id));
});

test('purchase validation rejects insufficient gold, a full three-item inventory, duplicates, and dead heroes', () => {
  const world = createSimulation(41);
  const poor = entity(world, 'blue-hero-vanguard');
  poor.gold = EQUIPMENT['gale-fang'].cost - 1;
  assert.equal(purchaseEquipment(world, poor.id, 'gale-fang'), false);

  const full = entity(world, 'blue-hero-ranger');
  full.gold = 5000;
  full.inventory = ['ember-blade', 'gale-fang', 'tide-ward'];
  assert.equal(purchaseEquipment(world, full.id, 'star-core'), false);

  const duplicate = entity(world, 'blue-hero-arcanist');
  duplicate.gold = 5000;
  assert.equal(purchaseEquipment(world, duplicate.id, 'star-core'), true);
  assert.equal(purchaseEquipment(world, duplicate.id, 'star-core'), false);

  const dead = entity(world, 'blue-hero-duelist');
  dead.gold = 5000;
  dead.alive = false;
  assert.equal(purchaseEquipment(world, dead.id, 'gale-fang'), false);
});

test('passive gold is granted every 20 completed ticks', () => {
  const world = createSimulation(43);
  const hero = entity(world, 'blue-hero-guardian');
  hero.position = { x: -13.5, y: 0 };
  hero.aiState = 'heal';
  hero.gold = 0;
  stepSimulation(world, AI_RULES.passiveGoldIntervalTicks);
  assert.equal(hero.gold, AI_RULES.passiveGoldAmount);
  assert.equal(world.events.filter((event) => event.type === 'passive-gold' && event.sourceId === hero.id).length, 1);
});

test('hero does not attack a tower without a friendly minion tanking inside tower range', () => {
  const world = createSimulation(47);
  const hero = entity(world, 'blue-hero-ranger');
  const tower = entity(world, 'red-tower-1');
  hero.position = { x: 2, y: 0 };
  hero.attackRange = 5;
  for (const unit of world.entities) {
    if (unit.kind === 'monster') { unit.alive = false; unit.hp = 0; }
  }
  stepSimulation(world, 1);
  assert.equal(tower.hp, tower.maxHp);
  assert.ok(!world.events.some((event) => event.type === 'attack' && event.sourceId === hero.id && event.targetId === tower.id));
});

test('hero attacks a tower only while a friendly minion is inside its range', () => {
  const world = createSimulation(53);
  const hero = entity(world, 'blue-hero-ranger');
  const tower = entity(world, 'red-tower-1');
  hero.position = { x: 2, y: 0 };
  hero.attackRange = 5;
  for (const unit of world.entities) {
    if (unit.kind === 'monster') { unit.alive = false; unit.hp = 0; }
  }
  stepSimulation(world, 1);
  const tank = world.entities.find((unit) => unit.kind === 'minion' && unit.team === 'blue' && unit.alive);
  assert.ok(tank);
  tank.position = { x: tower.position.x - 2, y: 0 };
  tank.hp = 100000;
  stepSimulation(world, 30);
  assert.ok(tower.hp < tower.maxHp);
  assert.ok(world.events.some((event) => event.type === 'attack' && event.sourceId === hero.id && event.targetId === tower.id));
});

test('ten-minute simulation produces measurable tower progress', () => {
  const world = createSimulation(20261119);
  stepSimulation(world, 12000);
  const towers = world.entities.filter((unit) => unit.kind === 'tower');
  assert.ok(towers.some((tower) => tower.hp < tower.maxHp || !tower.alive));
});
