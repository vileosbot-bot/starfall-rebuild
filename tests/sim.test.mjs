import test from 'node:test';
import assert from 'node:assert/strict';
import { World, HEROES, ITEMS, MAP } from '../dist/sim.js';

const fixture = (options = {}) => new World({ heroId: 'mage', noBots: true, noSpawns: true, autoBuy: false, ...options });
function advance(world, seconds) { for (let i = 0; i < Math.round(seconds * 30); i++) world.step(1 / 30); }
const tower = (w, team, lane, tier) => w.entities.find(e => e.type === 'tower' && e.team === team && e.lane === lane && e.tier === tier);
const enemy = w => w.entities.find(e => e.type === 'hero' && e.team === 'red');
function colocate(w, a, b, ax = 0, ay = 0, bx = 2, by = 0) {
  a.x = ax; a.y = ay; b.x = bx; b.y = by; a.visibleTo.red = true; b.visibleTo.blue = true; w._buildGrid();
}

test('complete initial roster and exact map structure', () => {
  const w = fixture();
  assert.equal(HEROES.length, 5); assert.equal(ITEMS.length, 17);
  assert.equal(w.entities.filter(e => e.type === 'hero').length, 10);
  assert.equal(w.entities.filter(e => e.type === 'tower').length, 18);
  assert.equal(w.entities.filter(e => e.type === 'core').length, 2);
  assert.equal(MAP.walls.length, 24); assert.equal(MAP.bushes.length, 22); assert.equal(MAP.camps.length, 14);
  assert.deepEqual(MAP.cores.blue, { x: -47, y: 47 });
  assert.equal(w.player.name, '王昭君'); assert.equal(w.player.gold, 50);
});

test('each lane unlocks its own tower chain; other lanes remain protected', () => {
  const w = fixture(), h = w.player;
  assert.equal(w.command({ type: 'attack', targetId: tower(w, 'red', 'top', 2).id }).ok, false);
  const outer = tower(w, 'red', 'top', 1); outer.hp = 1;
  w._damage(h, outer, 1000, 'true');
  assert.equal(outer.alive, false);
  assert.equal(w.isStructureVulnerable(tower(w, 'red', 'top', 2)), true);
  assert.equal(w.isStructureVulnerable(tower(w, 'red', 'mid', 2)), false);
  assert.equal(w.isStructureVulnerable(tower(w, 'red', 'top', 3)), false);
});

test('destroying one complete lane unlocks the core and only core death ends match', () => {
  const w = fixture(), core = w.entities.find(e => e.type === 'core' && e.team === 'red');
  assert.equal(w.isStructureVulnerable(core), false);
  for (const tier of [1, 2, 3]) { const t = tower(w, 'red', 'mid', tier); t.hp = 1; w._damage(w.player, t, 1000, 'true'); }
  assert.equal(w.isStructureVulnerable(core), true);
  assert.equal(tower(w, 'red', 'top', 3).alive, true); assert.equal(w.winner, null);
  core.hp = 1; w._damage(w.player, core, 1000, 'true');
  assert.equal(w.winner, 'blue'); const time = w.time; advance(w, 1); assert.equal(w.time, time);
});

test('armor mitigation uses reference factor 600 and true damage bypasses it', () => {
  const w = fixture(), target = enemy(w); target.hp = target.maxHp = 10000; target.armor = 600;
  const physical = w._damage(w.player, target, 1000, 'physical');
  assert.equal(physical, 500); assert.equal(w._damage(w.player, target, 1000, 'true'), 1000);
});

test('no-minion structure defense reduces damage by sixty percent', () => {
  const w = fixture(), t = tower(w, 'red', 'mid', 1); t.armor = 0;
  assert.equal(w._damage(w.player, t, 1000, 'physical'), 400);
  const minion = { ...w._unit('minion', 'blue', t.x + 2, t.y, '测试小兵'), variant: 'melee' };
  w.entities.push(minion); w._buildGrid(); assert.equal(w._damage(w.player, t, 1000, 'physical'), 1000);
});

test('boot upgrades credit old sale value and do not consume an extra slot', () => {
  const w = fixture(); w.player.gold = 1000;
  assert.equal(w.command({ type: 'purchase', itemId: 'boots' }).ok, true);
  assert.equal(w.command({ type: 'purchase', itemId: 'boots_guard' }).ok, true);
  assert.deepEqual(w.player.items, ['boots_guard']); assert.equal(w.player.gold, 190);
  assert.equal(w.command({ type: 'purchase', itemId: 'boots_guard' }).ok, false);
  assert.equal(w.command({ type: 'purchase', itemId: 'boots' }).ok, false);
});

test('shop rejects insufficient gold and full inventory, sell returns sixty percent', () => {
  const w = fixture();
  assert.equal(w.command({ type: 'purchase', itemId: 'sage_codex' }).ok, false);
  w.player.gold = 100000;
  for (const id of ['boots', 'sage_codex', 'void_crown', 'astral_staff', 'winter_scepter', 'guardian_plate']) assert.equal(w.command({ type: 'purchase', itemId: id }).ok, true);
  const gold = w.player.gold; assert.equal(w.command({ type: 'purchase', itemId: 'thorn_mail' }).ok, false); assert.equal(w.player.gold, gold);
  assert.equal(w.command({ type: 'sell', slot: 1 }).ok, true); assert.equal(w.player.gold, gold + 1254); assert.equal(w.player.items.length, 5);
});

test('first skill consumes mana once and respects cooldown; locked skills consume nothing', () => {
  const w = fixture(), h = w.player;
  assert.equal(w.command({ type: 'cast', slot: 1, x: h.x + 2, y: h.y }).ok, false); assert.equal(h.mp, 520);
  assert.equal(w.command({ type: 'cast', slot: 0, x: h.x + 10, y: h.y }).ok, true);
  assert.equal(h.mp, 470); assert.equal(h.cooldowns[0], 6.3);
  assert.equal(w.command({ type: 'cast', slot: 0, x: h.x + 10, y: h.y }).ok, false); assert.equal(h.mp, 470);
});

test('empty target-ultimate aim never spends mana or cooldown', () => {
  const w = fixture({ heroId: 'assassin' }), h = w.player; h.level = 4; h.skillLevels = [2, 1, 1]; h.x = 0; h.y = 0; w._buildGrid();
  const mp = h.mp;
  assert.equal(w.command({ type: 'cast', slot: 2, x: 5, y: 0 }).ok, false);
  assert.equal(h.mp, mp); assert.equal(h.cooldowns[2], 0);
});

test('target-ultimate validates aim and damages a valid hero', () => {
  const w = fixture({ heroId: 'assassin' }), h = w.player, target = enemy(w); h.level = 4; h.skillLevels = [2, 1, 1];
  colocate(w, h, target, 0, 0, 4, 0); const hp = target.hp;
  assert.equal(w.command({ type: 'cast', slot: 2, x: 4, y: 0 }).ok, true);
  assert.ok(target.hp < hp); assert.equal(h.mp, 340); assert.ok(Math.hypot(h.x - target.x, h.y - target.y) < 1);
});

test('level progression learns the ultimate at level four', () => {
  const w = fixture(), h = w.player;
  w._gainXp(h, 160 + 220 + 280); assert.equal(h.level, 4); assert.deepEqual(h.skillLevels, [2, 1, 1]);
  w._gainXp(h, 100000); assert.equal(h.level, 15); assert.deepEqual(h.skillLevels, [6, 6, 3]);
});

test('recall completes after five seconds and movement cancels its channel', () => {
  const w = fixture(), h = w.player; h.x = 0; h.y = 0;
  assert.equal(w.command({ type: 'recall' }).ok, true); advance(w, 4.9); assert.ok(h.recallTimer > 0);
  advance(w, .1); assert.ok(Math.hypot(h.x - MAP.fountains.blue.x, h.y - MAP.fountains.blue.y) < .01);
  h.x = 0; h.y = 0; w.command({ type: 'recall' }); w.input.x = 1; advance(w, .1); assert.equal(h.recallTimer, 0); assert.ok(h.x > 0);
});

test('damage and attack orders cancel recall', () => {
  const w = fixture(), h = w.player, target = enemy(w); colocate(w, h, target);
  w.command({ type: 'recall' }); w._damage(target, h, 10, 'true'); assert.equal(h.recallTimer, 0);
  w.command({ type: 'recall' }); assert.equal(w.command({ type: 'attack', targetId: target.id }).ok, true); assert.equal(h.recallTimer, 0);
});

test('dead hero cannot cast, move, heal or flash, but can buy and respawns', () => {
  const w = fixture(), h = w.player; w._kill(h, null);
  for (const command of [{ type: 'cast', slot: 0 }, { type: 'move', x: 0, y: 0 }, { type: 'heal' }, { type: 'flash', x: 0, y: 0 }]) assert.equal(w.command(command).ok, false);
  assert.equal(w.command({ type: 'purchase', itemId: 'boots' }).ok, false); // 50 starting gold cannot afford 250
  h.gold = 250; assert.equal(w.command({ type: 'purchase', itemId: 'boots' }).ok, true);
  h.gold = 5000; assert.equal(w.command({ type: 'purchase', itemId: 'guardian_plate' }).ok, true); assert.equal(h.hp, 0);
  advance(w, 7.6); assert.equal(h.alive, true); assert.equal(h.hp, h.maxHp);
});

test('slow affects normal heroes and direct movement collides with terrain', () => {
  const w = fixture(), h = w.player; h.x = -5; h.y = 5; w.input.x = 1; h.slowTimer = 5; h.slowAmount = .5;
  advance(w, 1); assert.ok(Math.abs(h.x - (-5 + 5.5 * .5)) < .02);
  h.x = -39; h.y = 0; h.slowTimer = 0; w.input.x = -1; advance(w, 1); assert.ok(h.x > -41 && -39 - h.x < 2, `hero crossed rock wall at ${h.x}`);
});

test('waves start at ten seconds and repeat every thirty seconds', () => {
  const w = fixture({ noSpawns: false }); advance(w, 9.9); assert.equal(w.wave, 0);
  advance(w, .1); assert.equal(w.wave, 1); advance(w, 1.3); assert.equal(w.entities.filter(e => e.type === 'minion').length, 18);
  advance(w, 28.7); assert.equal(w.wave, 2);
});

test('paused match freezes gold, movement and cooldowns', () => {
  const w = fixture(), h = w.player; w.paused = true; h.cooldowns[0] = 5; w.input.x = 1;
  const before = [w.time, h.gold, h.x, h.cooldowns[0]]; advance(w, 3); assert.deepEqual([w.time, h.gold, h.x, h.cooldowns[0]], before);
});

test('seeded full simulation repeats and keeps finite bounded state', () => {
  const run = () => {
    const w = new World({ heroId: 'mage', seed: 1122, demo: true }); let peak = 0;
    for (let i = 0; i < 30 * 180; i++) { w.step(1 / 30); peak = Math.max(peak, w.entities.length); }
    assert.ok(peak < 500); assert.ok(w.events.length <= 200); assert.ok(w.effects.length <= 400);
    for (const e of w.entities) assert.ok([e.x, e.y, e.hp, e.mp].every(Number.isFinite));
    assert.ok(w.entities.some(e => e.type === 'hero' && e.level > 1)); assert.ok(w.score.blue + w.score.red > 0);
    return JSON.stringify({ score: w.score, entities: w.entities.map(e => [e.id, e.x, e.y, e.hp, e.level, e.gold]), events: w.events });
  };
  assert.equal(run(), run());
});


test('all fifteen hero abilities execute without nonfinite state', () => {
  for (const def of HEROES) for (const slot of [0, 1, 2]) {
    const w = fixture({ heroId: def.id }), h = w.player, target = enemy(w);
    w._gainXp(h, 100000); h.mp = h.maxMp; target.hp = target.maxHp = 1000000; target._buyTimer = Infinity;
    colocate(w, h, target, 0, 0, 3, 0);
    const mana = h.mp; const result = w.command({ type: 'cast', slot, x: target.x, y: target.y });
    assert.equal(result.ok, true, `${def.id}/${slot}: ${result.message}`);
    assert.ok(h.mp < mana); assert.ok(h.cooldowns[slot] > 0);
    advance(w, 3.5);
    for (const e of w.entities) assert.ok([e.x, e.y, e.hp, e.mp].every(Number.isFinite), `${def.id}/${slot}`);
    if (!(def.id === 'marksman' && slot === 1)) assert.ok(target.hp < target.maxHp || h.shield > 0, `${def.id}/${slot} did not affect its target`);
  }
});
