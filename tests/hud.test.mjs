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
  getAimingSkillHint,
  getPlayerTargetHint,
  getChannelHudState,
  formatChannelHudLabel,
  getMinimapMarkers,
  getScoreboardCombatStats,
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


test('Q/E/R aiming prompts explicitly say release to cast', () => {
  assert.equal(getAimingSkillHint('Q'), 'Q：瞄准中，松开施放');
  assert.equal(getAimingSkillHint('E'), 'E：瞄准中，松开施放');
  assert.equal(getAimingSkillHint('R'), 'R：瞄准中，松开施放');
});

test('player target prompts distinguish right-click pathing from a specified attack target', () => {
  assert.equal(getPlayerTargetHint('move'), '正在前往目标点');
  assert.equal(getPlayerTargetHint('attack', 'red-minion-1'), '已指定攻击目标：red-minion-1');
  assert.equal(getPlayerTargetHint(null), '');
});

test('main mouse input is canvas-only and respects overlay, pause, death, winner, and aiming guards', async () => {
  const source = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(source, /renderScene\.canvas\.addEventListener\('mousedown', onCanvasMouseDown\)/);
  assert.match(source, /renderScene\.canvas\.addEventListener\('contextmenu', onCanvasContextMenu\)/);
  assert.doesNotMatch(source, /window\.addEventListener\('mousedown'/);
  assert.match(source, /!world \|\| paused \|\| world\.winner !== null \|\| shopOpen \|\| scoreboardOpen \|\|[\s\S]*?!isPlayerHeroAlive\(world\) \|\| aimingSkill !== null/);
  assert.match(source, /function onCanvasContextMenu\(event: MouseEvent\): void \{\s*event\.preventDefault\(\);/);
  assert.match(source, /function clearPlayerInput\(\): void \{[\s\S]*?playerMoveTarget = null;[\s\S]*?playerAttackTargetId = null;/);
  assert.match(source, /if \(playerMoveTarget\) \{\s*playerMoveTarget = null;/);
  assert.match(source, /playerAttackTargetId \? 'attack' : null/);
  assert.match(source, /const groundPoint = screenToGroundPoint\(screenX, screenY, rect\.width, rect\.height\);[\s\S]*?playerMoveTarget = groundPoint;[\s\S]*?playerAttackTargetId = null;/);
  assert.match(source, /Math\.hypot\(playerHero\.position\.x - playerMoveTarget\.x, playerHero\.position\.y - playerMoveTarget\.y\) <= 0\.3 \+ 1e-9/);
  assert.match(source, /if \(playerAttackTargetId && !isPlayerSelectableEnemyTarget\(world, playerAttackTargetId\)\)/);
  assert.match(source, /function laneFromY\(y: number\)/);
  assert.match(source, /const laneTowers = world\.entities[\s\S]*?laneFromY\(entity\.position\.y\) === targetLane/);
  assert.match(source, /anyEnemyInnerTowerDestroyed/);
});

test('main input wiring starts Q/E/R aim on keydown, dispatches on keyup, and clears aim on cancel/death', async () => {
  const source = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(source, /if \(event\.repeat \|\| !session\.world\) return;/);
  assert.match(source, /if \(key === 'escape'\) \{[\s\S]*?clearPlayerInput\(\);[\s\S]*?paused = !paused;/);
  assert.match(source, /if \(\['q', 'e', 'r'\]\.includes\(key\)\) \{[\s\S]*?aimingSkill = key\.toUpperCase\(\)[\s\S]*?hud\.setAimingSkill\(aimingSkill\);[\s\S]*?return;/);
  const aimedKeydown = source.match(/if \(\['q', 'e', 'r'\]\.includes\(key\)\) \{([\s\S]*?)\n  \}\n  if \(\['f', 'g', 'b'\]/);
  assert.ok(aimedKeydown);
  assert.doesNotMatch(aimedKeydown[1], /pendingSkill\s*=/, 'keydown only enters aim and never queues a cast');
  assert.match(source, /function onKeyUp\(event: KeyboardEvent\): void \{[\s\S]*?if \(aimingSkill !== skill\) return;[\s\S]*?if \(canRelease\) pendingSkill = skill;/);
  assert.match(source, /function clearPlayerInput\(\): void \{[\s\S]*?clearAimingSkill\(\);/);
  assert.match(source, /if \(!playerHero\?\.alive \|\| world\.winner !== null\) \{\s*clearPlayerInput\(\);/);
});

test('channel HUD exposes progress, remaining time, and the same cumulative G recovery ledger', () => {
  assert.deepEqual(getChannelHudState({ channel: { kind: 'recall', totalTicks: 100, remainingTicks: 40, hpRestored: 0, manaRestored: 0 } }), {
    label: '回城',
    progress: 0.6,
    remainingSeconds: 2,
    hpRestored: 0,
    manaRestored: 0,
  });
  assert.deepEqual(getChannelHudState({ channel: { kind: 'heal', totalTicks: 100, remainingTicks: 50, hpRestored: 153, manaRestored: 45 } }), {
    label: '疗伤',
    progress: 0.5,
    remainingSeconds: 2.5,
    hpRestored: 153,
    manaRestored: 45,
  });
  assert.equal(formatChannelHudLabel({ label: '疗伤', progress: 0.5, remainingSeconds: 2.5, hpRestored: 153, manaRestored: 45 }), '疗伤 2.5/5.0s · HP+153.0 MP+45.0');
  assert.equal(formatChannelHudLabel({ label: '回城', progress: 0.4, remainingSeconds: 3, hpRestored: 0, manaRestored: 0 }), '回城引导 2.0/5.0s');
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
  const towerMarkers = markers.filter((marker) => marker.kind === 'tower');
  assert.equal(towerMarkers.length, 12);
  for (const laneY of [-8, 0, 8]) assert.equal(towerMarkers.filter((marker) => marker.y === laneY).length, 4);
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
  assert.ok(render.includes('group.position.set(entity.position.x, 0, entity.position.y)'));
  assert.ok(render.includes('riverGeometry'));
  assert.ok(render.includes('grassGeometry'));
});


test('scoreboard shows assists and minion last-hits in the existing K/D columns', async () => {
  const world = createSimulation(20261120, 'vanguard');
  const hero = world.entities.find((unit) => unit.id === 'blue-hero-vanguard');
  assert.ok(hero);
  hero.kills = 3;
  hero.deaths = 2;
  hero.assists = 4;
  hero.minionLastHits = 7;
  assert.deepEqual(getScoreboardCombatStats(hero), {
    killsAndAssists: '3/4',
    deathsAndLastHits: '2/7',
  });
  const source = await readFile(new URL('../src/hud.ts', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(source, /<span>K\/A<\/span>/);
  assert.match(source, /<span>D\/CS<\/span>/);
  assert.match(html, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*34px\s*34px\s*58px/);
});


test('main mouse target selection is lane-local and unlocks the crystal after any inner tower falls', async () => {
  const source = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  const laneMatch = source.match(/function laneFromY\(y: number\): 'top' \| 'mid' \| 'bottom' \{([\s\S]*?)\n\}/);
  assert.ok(laneMatch, 'main contains the current-position lane helper');
  const laneFromY = new Function('y', laneMatch[1]);
  const match = source.match(/function isPlayerSelectableEnemyTarget\(world: Simulation, targetId: string\): boolean \{([\s\S]*?)\n\}/);
  assert.ok(match, 'main contains the player target selection function');
  const isSelectable = new Function('world', 'targetId', 'laneFromY', match[1]);
  const player = { id: 'blue-hero-vanguard', kind: 'hero', team: 'blue', alive: true };
  const towers = [];
  for (const lane of ['top', 'mid', 'bottom']) {
    const y = lane === 'top' ? -8 : lane === 'bottom' ? 8 : 0;
    towers.push(
      { id: 'red-tower-' + lane + '-1', kind: 'tower', team: 'red', alive: true, lane, towerIndex: 1, position: { x: 4, y } },
      { id: 'red-tower-' + lane + '-2', kind: 'tower', team: 'red', alive: true, lane, towerIndex: 2, position: { x: 8, y } },
    );
  }
  const crystal = { id: 'red-crystal', kind: 'crystal', team: 'red', alive: true, position: { x: 13.5, y: 0 } };
  const enemyHero = { id: 'red-hero-vanguard', kind: 'hero', team: 'red', alive: true };
  const enemyMinion = { id: 'red-minion-test', kind: 'minion', team: 'red', alive: true };
  const world = { playerHeroId: player.id, entities: [player, ...towers, crystal, enemyHero, enemyMinion] };
  for (const lane of ['top', 'mid', 'bottom']) {
    assert.equal(isSelectable(world, 'red-tower-' + lane + '-1', laneFromY), true, lane + ' outer tower is selectable while other lanes remain defended');
  }
  assert.equal(isSelectable(world, 'red-tower-top-2', laneFromY), false, 'top inner tower is locked behind its own outer tower');
  const topOuter = towers.find((tower) => tower.id === 'red-tower-top-1');
  topOuter.alive = false;
  assert.equal(isSelectable(world, 'red-tower-top-2', laneFromY), true, 'top inner tower unlocks after its own outer tower falls');
  assert.equal(isSelectable(world, crystal.id, laneFromY), false, 'crystal remains locked before an inner tower falls');
  const bottomInner = towers.find((tower) => tower.id === 'red-tower-bottom-2');
  bottomInner.alive = false;
  assert.equal(isSelectable(world, crystal.id, laneFromY), true, 'one inner tower falling in any lane unlocks crystal selection');
  assert.equal(isSelectable(world, enemyHero.id, laneFromY), true, 'enemy hero selection remains unchanged');
  assert.equal(isSelectable(world, enemyMinion.id, laneFromY), true, 'enemy minion selection remains unchanged');
});
