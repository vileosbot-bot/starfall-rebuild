import test from 'node:test';
import assert from 'node:assert/strict';
import { World, HEROES, ITEMS, MAP } from '../dist/sim.js';
import { objectiveText, waveCountdown, deathLines, killBanner } from '../dist/hud.js';
import { mapToMini, miniToMap } from '../dist/minimap.js';
import { run } from './tools-fullsim.mjs';

const quiet = (options = {}) => new World({ heroId: 'fighter', noBots: true, noSpawns: true, autoBuy: false, ...options });
const advance = (w, s) => { for (let i = 0; i < Math.round(s * 30); i++) w.step(1 / 30); };

test('audit: four items carry the original names and prices, ids and effects untouched', () => {
  const expected = { starfall_blade: ['破军', 2950], phantom_edge: ['无尽战刃', 2140], sage_codex: ['贤者之书', 2090], sunchaser_bow: ['影刃', 2070] };
  for (const [id, [name, price]] of Object.entries(expected)) { const item = ITEMS.find(i => i.id === id); assert.equal(item.name, name); assert.equal(item.price, price); }
  assert.equal(ITEMS.length, 17);
  assert.deepEqual(ITEMS.find(i => i.id === 'starfall_blade').stats, { ad: 110, cdr: .1 });
  assert.deepEqual(ITEMS.find(i => i.id === 'sunchaser_bow').stats, { attackSpeedPct: .35, critChance: .15, moveSpeed: .25 });
});

test('audit: every hero starts with 50 gold', () => {
  const w = quiet();
  for (const h of w.entities.filter(e => e.type === 'hero')) { assert.equal(h.gold, 50); assert.equal(h.goldEarned, 50); }
});

test('audit: hero base stats and per-level growth match the original table', () => {
  const table = {
    tank: ['樊哙', '鸿门闯帐', [3650, 440, 158, 120, 70, .8, 5.6, 2.3, 11, 3.2], [330, 100, 9.5, 24, 9, .015]],
    fighter: ['程咬金', '混世魔王', [3450, 430, 172, 104, 55, .9, 5.8, 2.3, 9, 3], [310, 95, 12.5, 21, 8, .022]],
    mage: ['王昭君', '落雁出塞', [3100, 520, 150, 80, 50, .85, 5.5, 7.5, 7, 4.2], [225, 125, 8, 14, 6, .01]],
    marksman: ['李广', '汉之飞将', [2900, 440, 168, 78, 50, .95, 5.5, 8.2, 7, 3], [205, 100, 13, 14, 6, .03]],
    assassin: ['荆轲', '易水壮士', [3050, 440, 178, 88, 52, .92, 6, 2.2, 8, 3], [250, 100, 13.5, 16, 6.5, .022]]
  };
  for (const h of HEROES) {
    const [name, title, base, growth] = table[h.id], s = h.stats, g = h.growth;
    assert.equal(h.name, name); assert.equal(h.title, title);
    assert.deepEqual([s.hp, s.mp, s.ad, s.armor, s.mr, s.attackSpeed, s.speed, s.range, s.hpRegen, s.manaRegen], base, h.id);
    assert.deepEqual([g.hp, g.mana, g.ad, g.armor, g.mr, g.attackSpeedPct], growth, h.id);
  }
});

test('objective banner follows the match state', () => {
  const w = quiet(); advance(w, 4);
  assert.equal(waveCountdown(w), '6秒');
  assert.equal(objectiveText(w), '小兵 6 秒后出发，先去上路一塔等着');
  w.wave = 1; w.player.x = 30; w.player.y = 30; // far from the top lane
  assert.equal(objectiveText(w), '回到上路，跟著小兵打');
  const lane = MAP.lanes.top[1]; w.player.x = lane.x; w.player.y = lane.y + 20;
  assert.equal(objectiveText(w), '跟著小兵推掉敌方上路一塔');
  w.player.hp = w.player.maxHp * .2; assert.match(objectiveText(w), /回城补给/);
  const jungle = quiet({ heroId: 'assassin' }); advance(jungle, 1); assert.match(objectiveText(jungle), /秒后出发，先去野区打野怪/);
});

test('death lines name the killer, class and level; first blood is flagged', () => {
  const w = quiet(), p = w.player, killer = w.entities.find(e => e.type === 'hero' && e.team === 'red' && e.heroId === 'mage');
  killer.level = 3; p.x = 0; p.y = 0; killer.x = 2; killer.y = 0; w._buildGrid();
  w._damage(killer, p, 1e6, 'true', 'skill');
  assert.equal(p.alive, false);
  const lines = deathLines(w);
  assert.equal(lines.banner, '敌方王昭君 击杀了你'); assert.equal(lines.killer, `击杀者 敌方 王昭君 法师 Lv.${killer.level}`); assert.ok(killer.level >= 3); assert.equal(lines.first, true); assert.equal(lines.killerHeroId, 'mage');
  const event = w.events.findLast(e => e.type === 'kill'), banner = killBanner(w, event);
  assert.deepEqual([banner.text, banner.tone, banner.first], ['敌方王昭君 击杀了你', 'enemy', true]);
  assert.equal(objectiveText(w), '等待复活，先看看装备');
});

test('camp timers are exposed read-only for the minimap (1:56 / 4:26 at 4 seconds)', () => {
  const w = quiet({ noSpawns: false }); advance(w, 4);
  const camps = w.camps, drake = camps.find(c => c.variant === 'abyss_drake'), colossus = camps.find(c => c.variant === 'star_colossus');
  assert.equal(camps.length, 14); assert.equal(Math.round(drake.respawnIn), 116); assert.equal(Math.round(colossus.respawnIn), 266);
  camps[0].x = 999; assert.notEqual(w.camps[0].x, 999);
});

test('minimap is an unrotated square: map corners map to canvas corners and back', () => {
  assert.deepEqual(mapToMini(-57.5, -57.5, 200), { x: 0, y: 0 }); assert.deepEqual(mapToMini(57.5, 57.5, 200), { x: 200, y: 200 });
  const blue = mapToMini(MAP.cores.blue.x, MAP.cores.blue.y, 200); assert.ok(blue.x < 40 && blue.y > 160, 'blue base bottom-left');
  const back = miniToMap(blue.x, blue.y, 200); assert.ok(Math.abs(back.x - MAP.cores.blue.x) < 1e-9 && Math.abs(back.y - MAP.cores.blue.y) < 1e-9);
  assert.deepEqual(miniToMap(-50, 9999, 200), { x: -57.5, y: 57.5 });
});

test('pacing: all-AI and idle-player matches end by crystal destruction inside 12-20 minutes', () => {
  for (const kind of ['ai', 'afk']) {
    const r = run(kind, { seed: 1122, heroId: 'mage' });
    assert.ok(r.winner === 'blue' || r.winner === 'red', `${kind}: no winner`);
    assert.equal(Math.min(r.cores.blue, r.cores.red), 0, `${kind}: a crystal must be destroyed`);
    assert.ok(r.time >= 720 && r.time <= 1200, `${kind}: ${r.mmss} outside 12-20 min`);
  }
});
