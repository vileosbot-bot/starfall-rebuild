import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_RULES,
  EQUIPMENT,
  FIXED_STEP_SECONDS,
  HERO_PURCHASE_ORDER,
  HERO_SKILLS,
  WAVE_INTERVAL_TICKS,
  FIRST_WAVE_TICK,
  PASSIVE_GOLD_START_TICK,
  calculateHeroKillGold,
  calculateHeroKillExperience,
  getExperienceShareFactor,
  getLoggedGoldBalance,
  getPassiveGoldTotalAtTick,
  getTowerTeamGoldReward,
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

test('hero kills grant calibrated gold, first blood, and level-scaled shared experience', () => {
  const world = createSimulation(7);
  const killer = entity(world, 'blue-hero-vanguard');
  const victim = entity(world, 'red-hero-vanguard');
  for (const teammate of world.entities.filter((unit) =>
    unit.kind === 'hero' && unit.team === 'blue' && unit.id !== killer.id
  )) teammate.position = { x: -50, y: 50 };
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
  assert.equal(killer.gold, 148);
  assert.equal(killer.level, 2);
  assert.equal(killer.experience, 108);
  assert.ok(world.events.some((event) => event.type === 'unit-died' && event.targetId === victim.id));
  assert.ok(world.events.some((event) =>
    event.type === 'gold-transaction' && event.incomeSource === 'hero-kill' &&
    event.recipientId === killer.id && event.amount === 88
  ));
  assert.ok(world.events.some((event) =>
    event.type === 'gold-transaction' && event.incomeSource === 'first-blood' &&
    event.recipientId === killer.id && event.amount === 40
  ));
  assert.equal(getLoggedGoldBalance(world, killer.id), killer.gold);
});

test('minion waves start at tick 200, recur every 600 ticks, and stagger the local lane roster', () => {
  const world = createSimulation(11);
  assert.equal(FIRST_WAVE_TICK, 200);
  assert.equal(WAVE_INTERVAL_TICKS, 600);
  assert.equal(FIXED_STEP_SECONDS, 0.05);
  assert.equal(1 / FIXED_STEP_SECONDS, 20);
  assert.equal(FIRST_WAVE_TICK * FIXED_STEP_SECONDS, 10);
  assert.equal(PASSIVE_GOLD_START_TICK * FIXED_STEP_SECONDS, 10);
  assert.equal(WAVE_INTERVAL_TICKS * FIXED_STEP_SECONDS, 30);
  stepSimulation(world, FIRST_WAVE_TICK);
  assert.equal(world.tick, 200);
  assert.equal(world.waveCount, 0);
  assert.equal(world.entities.filter((item) => item.kind === 'minion').length, 0);

  stepSimulation(world, 1);
  assert.equal(world.waveCount, 1);
  assert.equal(world.entities.filter((item) => item.kind === 'minion').length, 2);
  assert.ok(world.events.some((event) => event.type === 'wave-spawned' && event.tick === 200));

  stepSimulation(world, 24);
  const firstWave = world.entities.filter((item) => item.kind === 'minion');
  assert.equal(firstWave.length, 6);
  assert.equal(firstWave.filter((item) => item.minionType === 'melee').length, 4);
  assert.equal(firstWave.filter((item) => item.minionType === 'ranged').length, 2);
  const blueSpawnTicks = world.events
    .filter((event) => event.type === 'minion-spawned' && event.team === 'blue' && event.targetId?.includes('-minion-1-'))
    .map((event) => event.tick);
  assert.deepEqual(blueSpawnTicks, [200, 212, 224]);

  stepSimulation(world, 575);
  assert.equal(world.tick, 800);
  assert.equal(world.waveCount, 1);
  stepSimulation(world, 1);
  assert.equal(world.waveCount, 2);
  assert.ok(world.events.some((event) => event.type === 'wave-spawned' && event.tick === 800));
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
  world.tick = FIRST_WAVE_TICK;
  stepSimulation(world, 1);
  const tower = entity(world, 'blue-tower-2');
  const target = world.entities.find((unit) => unit.kind === 'minion' && unit.team === 'red' && unit.alive);
  assert.ok(target);
  tower.position = { x: 0, y: 0 };
  entity(world, 'blue-tower-1').position = { x: -30, y: 0 };
  tower.attackRange = 6;
  tower.cooldownRemaining = 0;
  target.position = { x: 1, y: 0 };
  target.hp = 1;

  stepSimulation(world, 1);
  assert.equal(target.alive, false);
  assert.ok(world.events.some((event) => event.type === 'attack' && event.sourceId === tower.id && event.targetId === target.id));
});

test('outer tower is nearer the lane center and is selected before the inner tower', () => {
  const world = createSimulation(24);
  world.tick = FIRST_WAVE_TICK;
  stepSimulation(world, 1);
  const outer = entity(world, 'red-tower-1');
  const inner = entity(world, 'red-tower-2');
  assert.equal(outer.position.x, 4);
  assert.equal(inner.position.x, 8);
  assert.ok(Math.abs(outer.position.x) < Math.abs(inner.position.x));

  const attacker = entity(world, 'blue-hero-ranger');
  attacker.position = { x: 0, y: 0 };
  attacker.attackRange = 5;
  attacker.attackDamage = 2000;
  attacker.critChance = 0;
  attacker.cooldownRemaining = 0;
  outer.hp = 1;
  inner.hp = 1;

  for (const unit of world.entities) {
    if (unit.kind === 'monster' || (unit.kind === 'hero' && unit.id !== attacker.id) || unit.team === 'red') {
      if (unit.kind !== 'tower') {
        unit.alive = false;
        unit.hp = 0;
        unit.respawnTicks = 0;
      }
    }
    if (unit.kind === 'minion') {
      unit.alive = false;
      unit.hp = 0;
    }
  }
  const escort = world.entities.find((unit) => unit.kind === 'minion' && unit.team === 'blue');
  assert.ok(escort);
  escort.alive = true;
  escort.hp = 100000;
  escort.position = { x: 4, y: 0 };

  stepSimulation(world, 1);
  const destroyed = world.events.filter((event) => event.type === 'tower-destroyed');
  assert.equal(destroyed[0]?.targetId, outer.id);
  assert.equal(inner.alive, true);
});

test('neutral monsters do not choose a side when the nearest blue and red units are within one step of a tie', () => {
  const world = createSimulation(25);
  stepSimulation(world, 1);
  const blue = entity(world, 'blue-hero-vanguard');
  const red = entity(world, 'red-hero-vanguard');
  for (const unit of world.entities) {
    if (unit.kind === 'minion' || (unit.kind === 'hero' && unit.id !== blue.id && unit.id !== red.id)) {
      unit.alive = false;
      unit.hp = 0;
      unit.respawnTicks = 0;
    }
  }
  blue.position = { x: -1, y: -3.4 };
  red.position = { x: 1, y: -3.4 };
  blue.moveSpeed = 0;
  red.moveSpeed = 0;
  blue.attackRange = 0;
  red.attackRange = 0;
  stepSimulation(world, 1);
  assert.equal(world.events.filter((event) => event.type === 'attack' && event.sourceId?.startsWith('neutral-')).length, 0);
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
  executeWorld.tick = FIRST_WAVE_TICK;
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
  farmWorld.tick = FIRST_WAVE_TICK;
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

test('passive gold starts at tick 200, uses cumulative rounding, and is paid during death', () => {
  const world = createSimulation(43);
  const hero = entity(world, 'blue-hero-guardian');
  hero.position = { x: -13.5, y: 0 };
  hero.aiState = 'heal';
  hero.gold = 0;
  hero.alive = false;
  hero.hp = 0;

  assert.equal(getPassiveGoldTotalAtTick(199), 0);
  assert.equal(getPassiveGoldTotalAtTick(200), 2);
  assert.equal(getPassiveGoldTotalAtTick(210), 3);
  assert.equal(getPassiveGoldTotalAtTick(220), 4);
  stepSimulation(world, PASSIVE_GOLD_START_TICK - 1);
  assert.equal(hero.gold, 0);
  stepSimulation(world, 1);
  assert.equal(hero.gold, 2);
  stepSimulation(world, 10);
  assert.equal(hero.gold, 3);
  stepSimulation(world, 10);
  assert.equal(hero.gold, 4);
  const passiveEvents = world.events.filter((event) =>
    event.type === 'passive-gold' && event.sourceId === hero.id
  );
  assert.deepEqual(passiveEvents.map((event) => [event.tick, event.amount, event.simSeconds]), [
    [200, 2, 10],
    [210, 1, 10.5],
    [220, 1, 11],
  ]);
  assert.equal(getLoggedGoldBalance(world, hero.id), hero.gold);
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
  world.tick = FIRST_WAVE_TICK;
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

test('the three specified ten-minute seeds produce tower destruction', () => {
  const results = [20261119, 20261120, 20261121].map((seed) => {
    const world = createSimulation(seed);
    stepSimulation(world, 12000);
    return {
      seed,
      destroyedTowers: world.events.filter((event) => event.type === 'tower-destroyed').length,
      winner: world.winner,
    };
  });
  assert.ok(results.every((result) => result.destroyedTowers > 0), JSON.stringify(results));
});

test('the 30-minute natural match destroys towers and a crystal, declares a winner, stops, and is deterministic', () => {
  const world = createSimulation(20261119);
  const repeat = createSimulation(20261119);
  stepSimulation(world, 36000);
  stepSimulation(repeat, 36000);

  assert.deepEqual(world, repeat);
  assert.ok(world.events.some((event) => event.type === 'tower-destroyed'));
  const crystalEvent = world.events.find((event) => event.type === 'crystal-destroyed');
  assert.ok(crystalEvent);
  assert.equal(world.winner, crystalEvent.team);
  assert.equal(world.endReason, 'crystal-destroyed');
  assert.ok(world.tick < 36000, 'the game should stop at the crystal result instead of running to the requested cap');

  const terminalTick = world.tick;
  const terminalEventCount = world.events.length;
  stepSimulation(world, 1000);
  assert.equal(world.tick, terminalTick);
  assert.equal(world.events.length, terminalEventCount);
});


test('player movement is fixed-step and stops when movement input is released', () => {
  const world = createSimulation(101, 'vanguard');
  const hero = entity(world, 'blue-hero-vanguard');
  const start = { ...hero.position };
  stepSimulation(world, 4, { moveX: 1 });
  assert.ok(Math.abs(hero.position.x - (start.x + hero.moveSpeed * FIXED_STEP_SECONDS * 4)) < 1e-9);
  const stopped = { ...hero.position };
  stepSimulation(world, 3);
  assert.deepEqual(hero.position, stopped);
});

test('space attack damages the nearest in-range enemy using the normal damage calculation', () => {
  const world = createSimulation(103, 'vanguard');
  const hero = entity(world, 'blue-hero-vanguard');
  const target = entity(world, 'red-hero-vanguard');
  hero.position = { x: 0, y: 9 };
  hero.attackRange = 2;
  hero.critChance = 0;
  target.position = { x: 1, y: 9 };
  target.gold = 0;
  target.hp = target.maxHp;
  const expected = calculateDamage(hero, target);
  stepSimulation(world, 1, { attack: true });
  const attack = world.events.find((event) => event.type === 'attack' && event.sourceId === hero.id && event.targetId === target.id);
  assert.ok(attack);
  assert.equal(attack.amount, expected);
  assert.equal(target.hp, target.maxHp - expected);
});

test('all five roles execute their three Q/E/R skills with locked parameters', () => {
  for (const role of ['vanguard', 'ranger', 'arcanist', 'duelist', 'guardian']) {
    for (const key of ['Q', 'E', 'R']) {
      const world = createSimulation(107, role);
      const hero = entity(world, 'blue-hero-' + role);
      const target = entity(world, 'red-hero-vanguard');
      hero.position = { x: 0, y: 0 };
      hero.mana = hero.maxMana ?? 300;
      target.position = { x: 1, y: 0 };
      target.hp = target.maxHp;
      if (HERO_SKILLS[role][key].effect === 'heal') hero.hp = hero.maxHp - 100;
      stepSimulation(world, 1, { skill: key });
      const event = world.events.find((entry) => entry.type === 'player-skill' && entry.sourceId === hero.id && entry.detail?.startsWith(key + ':'));
      assert.ok(event, role + ' ' + key + ' should emit a player-skill event');
      assert.equal(hero.skillCooldowns[key], HERO_SKILLS[role][key].cooldownTicks);
      assert.equal(hero.mana, 300 - HERO_SKILLS[role][key].manaCost);
    }
  }
});

test('F flashes exactly five units and starts a 110-second cooldown', () => {
  const world = createSimulation(109, 'ranger');
  const hero = entity(world, 'blue-hero-ranger');
  hero.position = { x: 0, y: 0 };
  stepSimulation(world, 1, { skill: 'F', moveX: 1 });
  assert.equal(hero.position.x, 5);
  assert.equal(hero.position.y, 0);
  assert.equal(hero.skillCooldowns.F, 110 * 20);
  assert.ok(world.events.some((event) => event.type === 'player-skill' && event.detail === 'F:flash'));
  stepSimulation(world, 1, { skill: 'F', moveX: 1 });
  assert.equal(hero.position.x, 5);
});

test('G completes after five seconds and restores 30 percent of maximum health and mana', () => {
  const world = createSimulation(113, 'guardian');
  const hero = entity(world, 'blue-hero-guardian');
  hero.hp = hero.maxHp - 400;
  hero.mana = 100;
  hero.manaRegenPerSecond = 0;
  stepSimulation(world, 100, { skill: 'G' });
  assert.equal(hero.hp, hero.maxHp - 94);
  assert.equal(hero.mana, 190);
  assert.equal(hero.channel, null);
  assert.ok(world.events.some((event) => event.type === 'player-channel-completed' && event.detail?.startsWith('G:heal')));
  assert.equal(hero.skillCooldowns.G, 60 * 20 - 99);
});

test('B completes after five seconds and returns the player hero to the home crystal', () => {
  const world = createSimulation(127, 'duelist');
  const hero = entity(world, 'blue-hero-duelist');
  hero.position = { ...entity(world, 'blue-crystal').position };
  for (const unit of world.entities) {
    if (unit.kind === 'hero' && unit.id !== hero.id) {
      unit.alive = false;
      unit.hp = 0;
      unit.respawnTicks = 0;
    }
    if (unit.kind === 'monster') unit.position = { x: 50, y: 50 };
  }
  stepSimulation(world, 100, { skill: 'B' });
  assert.deepEqual(hero.position, entity(world, 'blue-crystal').position);
  assert.equal(hero.channel, null);
  assert.equal(hero.skillCooldowns.B, 60 * 20 - 99);
  assert.ok(world.events.some((event) => event.type === 'player-channel-completed' && event.detail === 'B:recall'));
});

test('cooldown and insufficient mana prevent repeated Q casts without spending more mana', () => {
  const world = createSimulation(131, 'arcanist');
  const hero = entity(world, 'blue-hero-arcanist');
  const target = entity(world, 'red-hero-vanguard');
  hero.position = { x: 0, y: 0 };
  target.position = { x: 1, y: 0 };
  hero.critChance = 0;
  hero.manaRegenPerSecond = 0;
  stepSimulation(world, 2, { skill: 'Q' });
  const skillCount = world.events.filter((event) => event.type === 'player-skill' && event.sourceId === hero.id && event.detail?.startsWith('Q:')).length;
  assert.equal(skillCount, 1);
  assert.equal(hero.mana, 275);
  hero.skillCooldowns.Q = 0;
  hero.mana = 0;
  stepSimulation(world, 1, { skill: 'Q' });
  assert.equal(world.events.filter((event) => event.type === 'player-skill' && event.sourceId === hero.id && event.detail?.startsWith('Q:')).length, skillCount);
  assert.equal(hero.skillCooldowns.Q, 0);
});

test('moving or attacking interrupts G/B channels and keeps the started cooldown', () => {
  const moveWorld = createSimulation(137, 'vanguard');
  const mover = entity(moveWorld, 'blue-hero-vanguard');
  stepSimulation(moveWorld, 1, { skill: 'B' });
  stepSimulation(moveWorld, 1, { moveX: 1 });
  assert.equal(mover.channel, null);
  assert.ok(mover.skillCooldowns.B > 0);
  assert.ok(!moveWorld.events.some((event) => event.type === 'player-channel-completed' && event.detail === 'B:recall'));

  const attackWorld = createSimulation(139, 'vanguard');
  const attacker = entity(attackWorld, 'blue-hero-vanguard');
  const target = entity(attackWorld, 'red-hero-vanguard');
  attacker.position = { x: 0, y: 0 };
  attacker.attackRange = 2;
  target.position = { x: 1, y: 0 };
  attacker.hp = attacker.maxHp - 200;
  stepSimulation(attackWorld, 1, { skill: 'G' });
  const hpAtStart = attacker.hp;
  stepSimulation(attackWorld, 1, { attack: true });
  assert.equal(attacker.channel, null);
  assert.ok(attacker.skillCooldowns.G > 0);
  assert.equal(attacker.hp, hpAtStart);
  assert.ok(attackWorld.events.some((event) => event.type === 'player-channel-cancelled' && event.detail === 'heal:attack'));
});

test('damage interrupts a channel without applying its recovery effect', () => {
  const world = createSimulation(149, 'guardian');
  const hero = entity(world, 'blue-hero-guardian');
  const monster = entity(world, 'neutral-sentinel');
  for (const unit of world.entities) {
    if (unit.kind === 'hero' && unit.id !== hero.id) {
      unit.alive = false;
      unit.hp = 0;
      unit.respawnTicks = 0;
    }
  }
  hero.position = { x: 0, y: 0 };
  hero.hp = hero.maxHp - 100;
  monster.position = { x: 50, y: 50 };
  stepSimulation(world, 1, { skill: 'G' });
  const hpAtChannelStart = hero.hp;
  monster.position = { ...hero.position };
  monster.attackRange = 2;
  monster.attackDamage = 100;
  monster.cooldownRemaining = 0;
  const expectedDamage = calculateDamage(monster, hero);
  stepSimulation(world, 1, { enabled: false });
  assert.equal(hero.channel, null);
  assert.equal(hero.hp, hpAtChannelStart - expectedDamage);
  assert.ok(world.events.some((event) => event.type === 'player-channel-cancelled' && event.detail === 'heal:damage'));
});

test('dead and disabled player input cannot move, attack, or cast skills', () => {
  const deadWorld = createSimulation(151, 'ranger');
  const deadHero = entity(deadWorld, 'blue-hero-ranger');
  deadHero.alive = false;
  deadHero.hp = 0;
  deadHero.respawnTicks = 90;
  const deadPosition = { ...deadHero.position };
  stepSimulation(deadWorld, 1, { moveX: 1, attack: true, skill: 'Q' });
  assert.deepEqual(deadHero.position, deadPosition);
  assert.equal(deadHero.mana, 300);
  assert.ok(!deadWorld.events.some((event) => event.type === 'player-skill' && event.sourceId === deadHero.id));

  const pausedWorld = createSimulation(157, 'ranger');
  const pausedHero = entity(pausedWorld, 'blue-hero-ranger');
  const pausedPosition = { ...pausedHero.position };
  stepSimulation(pausedWorld, 1, { enabled: false, moveX: 1, attack: true, skill: 'Q' });
  assert.deepEqual(pausedHero.position, pausedPosition);
  assert.equal(pausedHero.mana, 300);
  assert.ok(!pausedWorld.events.some((event) => event.type === 'player-skill' && event.sourceId === pausedHero.id));
});

test('selected hero is player-controlled while the other nine heroes retain AI behavior', () => {
  const world = createSimulation(163, 'vanguard');
  stepSimulation(world, 1);
  const player = entity(world, 'blue-hero-vanguard');
  assert.deepEqual(player.inventory, []);
  const aiHeroes = world.entities.filter((unit) => unit.kind === 'hero' && unit.id !== player.id);
  assert.equal(aiHeroes.length, 9);
  assert.ok(aiHeroes.every((hero) => hero.inventory.length > 0));
});

test('player command sequences are deterministic for the same seed', () => {
  const run = () => {
    const world = createSimulation(167, 'ranger');
    stepSimulation(world, 8, { moveX: 1 });
    stepSimulation(world, 1, { skill: 'Q' });
    stepSimulation(world, 12, { attack: true });
    return world;
  };
  assert.deepEqual(run(), run());
});


test('starting wallets, transaction ledger, and local equipment prices are locked', () => {
  const world = createSimulation(20261120);
  const heroes = world.entities.filter((unit) => unit.kind === 'hero');
  assert.equal(heroes.length, 10);
  assert.ok(heroes.every((hero) => hero.gold === 300));
  assert.equal(world.events.filter((event) =>
    event.type === 'gold-transaction' && event.incomeSource === 'starting-gold'
  ).length, 10);
  assert.deepEqual({
    'ember-blade': EQUIPMENT['ember-blade'].cost,
    'gale-fang': EQUIPMENT['gale-fang'].cost,
    'star-core': EQUIPMENT['star-core'].cost,
    'moon-prism': EQUIPMENT['moon-prism'].cost,
    'tide-ward': EQUIPMENT['tide-ward'].cost,
    'bastion-plate': EQUIPMENT['bastion-plate'].cost,
  }, {
    'ember-blade': 180,
    'gale-fang': 240,
    'star-core': 190,
    'moon-prism': 250,
    'tide-ward': 160,
    'bastion-plate': 230,
  });
});

test('hero bounty formula locks base, streak adjustment, death adjustment, clamp, and first blood', () => {
  assert.deepEqual(calculateHeroKillGold(0, 0, false), {
    base: 88, streakBonus: 0, deathPenalty: 0, raw: 88, bounty: 88, firstBloodBonus: 0, total: 88,
  });
  assert.deepEqual(calculateHeroKillGold(2, 1, true), {
    base: 88, streakBonus: 44, deathPenalty: 11, raw: 121, bounty: 121, firstBloodBonus: 40, total: 161,
  });
  assert.equal(calculateHeroKillGold(20, 0, false).bounty, 208);
  assert.equal(calculateHeroKillGold(0, 20, false).bounty, 44);
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((count) => getExperienceShareFactor(count)),
    [1, 0.70, 0.52, 0.42, 0.36],
  );
  assert.equal(HERO_KILL_EXPERIENCE_SCALE, 0.7);
  assert.equal(calculateHeroKillExperience(1, 1), 118);
  assert.equal(calculateHeroKillExperience(1, 3), 61);
  assert.equal(calculateHeroKillExperience(2, 3), 71);
});

test('every third wave adds siege minions and an inner-tower break adds a lane super minion', () => {
  const siegeWorld = createSimulation(31);
  siegeWorld.tick = FIRST_WAVE_TICK + WAVE_INTERVAL_TICKS * 2;
  siegeWorld.waveCount = 2;
  stepSimulation(siegeWorld, 37);
  const siegeMinions = siegeWorld.entities.filter((unit) => unit.kind === 'minion' && unit.minionType === 'siege');
  assert.equal(siegeWorld.waveCount, 3);
  assert.equal(siegeMinions.length, 2);
  assert.ok(siegeMinions.every((unit) => unit.maxHp === 420 && unit.attackDamage === 34 &&
    unit.bountyGold === 42 && unit.bountyExperience === 40));

  const superWorld = createSimulation(32);
  const redInnerTower = entity(superWorld, 'red-tower-2');
  redInnerTower.alive = false;
  redInnerTower.hp = 0;
  superWorld.tick = FIRST_WAVE_TICK;
  stepSimulation(superWorld, 37);
  const superMinions = superWorld.entities.filter((unit) => unit.kind === 'minion' && unit.minionType === 'super');
  assert.equal(superMinions.length, 1);
  assert.equal(superMinions[0].team, 'blue');
  assert.equal(superMinions[0].maxHp, 945);
  assert.equal(superMinions[0].attackDamage, 46);
  assert.equal(superMinions[0].bountyGold, 47);
  assert.equal(superMinions[0].bountyExperience, 45);
});

test('minion last-hit keeps its bounty and shares a 35 percent pool with nearby allied heroes', () => {
  const world = createSimulation(20261120, 'vanguard');
  world.tick = FIRST_WAVE_TICK;
  stepSimulation(world, 1);
  const killer = entity(world, 'blue-hero-vanguard');
  const ally = entity(world, 'blue-hero-ranger');
  const target = world.entities.find((unit) =>
    unit.kind === 'minion' && unit.team === 'red' && unit.minionType === 'melee' && unit.alive
  );
  assert.ok(target);
  for (const unit of world.entities) {
    if (![killer.id, ally.id, target.id].includes(unit.id)) {
      unit.alive = false;
      unit.hp = 0;
      unit.respawnTicks = 0;
    }
  }
  killer.alive = true;
  ally.alive = true;
  killer.position = { x: 0, y: 0 };
  ally.position = { x: 10, y: 0 };
  target.position = { x: 0.5, y: 0 };
  target.hp = 1;
  killer.gold = 0;
  ally.gold = 0;
  killer.attackRange = 2;
  killer.attackDamage = 2000;
  killer.critChance = 0;
  killer.cooldownRemaining = 0;

  stepSimulation(world, 1, { attack: true });

  assert.equal(target.alive, false);
  assert.equal(killer.gold, 18);
  assert.equal(ally.gold, 6);
  assert.equal(killer.experience, 17);
  assert.equal(ally.experience, 17);
  assert.equal(getLoggedGoldBalance(world, killer.id), killer.gold);
  assert.equal(getLoggedGoldBalance(world, ally.id), ally.gold);
  const minionTransactions = world.events.filter((event) =>
    event.type === 'gold-transaction' && event.targetId === target.id &&
    (event.incomeSource === 'minion-last-hit' || event.incomeSource === 'minion-share')
  );
  assert.deepEqual(minionTransactions
    .map((event) => [event.recipientId, event.amount, event.experienceAmount])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]))), [
    [ally.id, 6, 17],
    [killer.id, 18, 17],
  ]);
  assert.ok(minionTransactions.every((event) => typeof event.tick === 'number' &&
    typeof event.simSeconds === 'number' && typeof event.incomeSource === 'string'));
});

test('hero kill pays 80 percent of actual adjusted bounty to assists and shares level-scaled experience', () => {
  const world = createSimulation(20261120, 'vanguard');
  const killer = entity(world, 'blue-hero-vanguard');
  const victim = entity(world, 'red-hero-vanguard');
  const assistantA = entity(world, 'blue-hero-arcanist');
  const assistantB = entity(world, 'blue-hero-ranger');
  for (const unit of world.entities) {
    if (![killer.id, victim.id, assistantA.id, assistantB.id].includes(unit.id)) {
      unit.alive = false;
      unit.hp = 0;
      unit.respawnTicks = 0;
    }
  }
  killer.position = { x: 0, y: 0 };
  victim.position = { x: 1, y: 0 };
  assistantA.position = { x: 8, y: 0 };
  assistantB.position = { x: 10, y: 0 };
  killer.gold = 0;
  assistantA.gold = 0;
  assistantB.gold = 0;
  killer.killStreak = 2;
  victim.deathStreak = 1;
  killer.attackRange = 2;
  killer.attackDamage = 2000;
  killer.critChance = 0;
  killer.cooldownRemaining = 0;
  victim.hp = 1;
  world.damageContributions[victim.id] = {
    [assistantA.id]: 30,
    [assistantB.id]: 20,
  };

  stepSimulation(world, 1, { attack: true });

  assert.equal(victim.alive, false);
  assert.equal(killer.gold, 161);
  assert.equal(assistantA.gold, 64);
  assert.equal(assistantB.gold, 64);
  assert.equal(killer.experience, 61);
  assert.equal(assistantA.experience, 61);
  assert.equal(assistantB.experience, 61);
  assert.equal(assistantA.assists, 1);
  assert.equal(assistantB.assists, 1);
  assert.equal(world.firstBloodAwarded, true);
  assert.equal(getLoggedGoldBalance(world, killer.id), killer.gold);
  assert.equal(getLoggedGoldBalance(world, assistantA.id), assistantA.gold);
  assert.equal(getLoggedGoldBalance(world, assistantB.id), assistantB.gold);
  assert.ok(world.events.some((event) =>
    event.incomeSource === 'hero-kill' && event.recipientId === killer.id && event.amount === 121
  ));
  assert.ok(world.events.some((event) =>
    event.incomeSource === 'first-blood' && event.recipientId === killer.id && event.amount === 40
  ));
  assert.ok(world.events.some((event) =>
    event.incomeSource === 'hero-assist' && event.recipientId === assistantA.id && event.amount === 64
  ));
  assert.ok(world.events.some((event) =>
    event.incomeSource === 'hero-assist' && event.recipientId === assistantB.id && event.amount === 64
  ));
});

test('tower destruction pays every teammate by layer, a 40 gold hero last-hit bonus, and 100 shared experience', () => {
  const world = createSimulation(20261120, 'vanguard');
  const attacker = entity(world, 'blue-hero-vanguard');
  const tower = entity(world, 'red-tower-1');
  for (const unit of world.entities) {
    if (unit.kind === 'hero' && unit.team === 'blue' && unit.id !== attacker.id) {
      unit.position = { x: -40, y: 40 };
      unit.aiState = 'heal';
    } else if (unit.team === 'red' && unit.kind !== 'tower') {
      unit.alive = false;
      unit.hp = 0;
      unit.respawnTicks = 0;
    } else if (unit.kind === 'minion' || unit.kind === 'monster') {
      unit.alive = false;
      unit.hp = 0;
      unit.respawnTicks = 0;
    }
  }
  attacker.position = { x: 0, y: 0 };
  attacker.attackRange = 2;
  attacker.attackDamage = 2000;
  attacker.critChance = 0;
  tower.position = { x: 0, y: 0 };
  tower.hp = 1;

  stepSimulation(world, 1, { attack: true });

  const blueHeroes = world.entities.filter((unit) => unit.kind === 'hero' && unit.team === 'blue');
  assert.equal(tower.alive, false);
  assert.deepEqual([getTowerTeamGoldReward(1), getTowerTeamGoldReward(2), getTowerTeamGoldReward(3)], [48, 56, 64]);
  assert.ok(blueHeroes.every((hero) => hero.experience === 20));
  assert.ok(blueHeroes.every((hero) => hero.gold === (hero.id === attacker.id ? 388 : 348)));
  const teamRewards = world.events.filter((event) =>
    event.type === 'gold-transaction' && event.incomeSource === 'tower-team' && event.targetId === tower.id
  );
  assert.equal(teamRewards.length, 5);
  assert.ok(teamRewards.every((event) => event.amount === 48 && event.experienceAmount === 20));
  assert.ok(world.events.some((event) =>
    event.incomeSource === 'tower-last-hit' && event.recipientId === attacker.id && event.amount === 40
  ));
});

