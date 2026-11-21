import test from 'node:test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { EQUIPMENT, FIRST_WAVE_TICK, createSimulation, getLoggedGoldBalance, isStructureTargetEligible, purchaseEquipment, stepSimulation } from '../src/sim.ts';
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
  DEFAULT_AUDIO_SETTINGS,
  SETTINGS_STORAGE_KEY,
  parseAudioSettings,
  serializeAudioSettings,
  handleScoreboardTabDown,
  handleScoreboardTabUp,
  toggleScoreboardPin,
  cancelScoreboardPin,
} from '../src/hud.ts';
import { AUDIO_GAIN, createAudioController, estimateWorstCasePeak } from '../src/audio.ts';

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
  const simSource = await readFile(new URL('../src/sim.ts', import.meta.url), 'utf8');
  assert.match(source, /renderScene\.canvas\.addEventListener\('mousedown', onCanvasMouseDown\)/);
  assert.match(source, /renderScene\.canvas\.addEventListener\('contextmenu', onCanvasContextMenu\)/);
  assert.doesNotMatch(source, /window\.addEventListener\('mousedown'/);
  assert.match(source, /!world \|\| paused \|\| settingsOpen \|\| world\.winner !== null \|\| shopOpen \|\| scoreboardOpen \|\|[\s\S]*?!isPlayerHeroAlive\(world\) \|\| aimingSkill !== null/);
  assert.match(source, /function onCanvasContextMenu\(event: MouseEvent\): void \{\s*event\.preventDefault\(\);/);
  assert.match(source, /function clearPlayerInput\(\): void \{[\s\S]*?playerMoveTarget = null;[\s\S]*?playerAttackTargetId = null;/);
  assert.match(source, /if \(playerMoveTarget\) \{\s*playerMoveTarget = null;/);
  assert.match(source, /playerAttackTargetId \? 'attack' : null/);
  assert.match(source, /const groundPoint = screenToGroundPoint\(screenX, screenY, rect\.width, rect\.height\);[\s\S]*?playerMoveTarget = groundPoint;[\s\S]*?playerAttackTargetId = null;/);
  assert.match(source, /Math\.hypot\(playerHero\.position\.x - playerMoveTarget\.x, playerHero\.position\.y - playerMoveTarget\.y\) <= 0\.3 \+ 1e-9/);
  assert.match(source, /if \(playerAttackTargetId && !isPlayerSelectableEnemyTarget\(world, playerAttackTargetId\)\)/);
  assert.match(source, /isStructureTargetEligible\(world, player\.team, target\.id\)/);
  assert.match(simSource, /export function isStructureTargetEligible/);
  assert.match(simSource, /entity\.towerIndex === 2 && !entity\.alive/);
});

test('main input wiring starts Q/E/R aim on keydown, dispatches on keyup, and clears aim on cancel/death', async () => {
  const source = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(source, /if \(event\.repeat\) return;/);
  assert.match(source, /if \(key === 'escape'\) \{[\s\S]*?if \(aimingSkill !== null\)[\s\S]*?if \(shopOpen\)[\s\S]*?if \(scoreboardPinned\)[\s\S]*?openSettings\('match'\);/);
  assert.match(source, /if \(\['q', 'e', 'r'\]\.includes\(key\)\) \{[\s\S]*?aimingSkill = key\.toUpperCase\(\)[\s\S]*?hud\.setAimingSkill\(aimingSkill\);[\s\S]*?return;/);
  const aimedKeydown = source.match(/if \(\['q', 'e', 'r'\]\.includes\(key\)\) \{([\s\S]*?)\n  \}\n  if \(\['f', 'g', 'b'\]/);
  assert.ok(aimedKeydown);
  assert.doesNotMatch(aimedKeydown[1], /pendingSkill\s*=/, 'keydown only enters aim and never queues a cast');
  assert.match(source, /function onKeyUp\(event: KeyboardEvent\): void \{[\s\S]*?if \(aimingSkill !== skill\) return;[\s\S]*?if \(canRelease\) \{\s*pendingSkill = skill;\s*pendingAimPosition = releasedAimPosition;\s*\} else \{\s*pendingAimPosition = null;\s*\}/);
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


test('main mouse target selection delegates cross-lane structure eligibility to the shared simulation predicate', async () => {
  const source = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(source, /isStructureTargetEligible/);
  const match = source.match(/function isPlayerSelectableEnemyTarget\(world: Simulation, targetId: string\): boolean \{([\s\S]*?)\n\}/);
  assert.ok(match, 'main contains the player target selection function');
  const isSelectable = new Function('world', 'targetId', 'isStructureTargetEligible', match[1]);
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
    assert.equal(isSelectable(world, 'red-tower-' + lane + '-1', isStructureTargetEligible), true);
  }
  assert.equal(isSelectable(world, 'red-tower-top-2', isStructureTargetEligible), false);
  const topOuter = towers.find((tower) => tower.id === 'red-tower-top-1');
  topOuter.alive = false;
  assert.equal(isSelectable(world, 'red-tower-top-2', isStructureTargetEligible), true);
  assert.equal(isSelectable(world, crystal.id, isStructureTargetEligible), false);
  const bottomInner = towers.find((tower) => tower.id === 'red-tower-bottom-2');
  bottomInner.alive = false;
  assert.equal(isSelectable(world, crystal.id, isStructureTargetEligible), true);
  assert.equal(isSelectable(world, enemyHero.id, isStructureTargetEligible), true);
  assert.equal(isSelectable(world, enemyMinion.id, isStructureTargetEligible), true);
});
test('audio settings use the original storage key, default to 80/90, and persist only supported values', () => {
  assert.equal(SETTINGS_STORAGE_KEY, 'starfall.settings.v1');
  assert.deepEqual(DEFAULT_AUDIO_SETTINGS, { masterVolume: 80, sfxVolume: 90 });
  assert.deepEqual(parseAudioSettings(null), { masterVolume: 80, sfxVolume: 90 });
  assert.deepEqual(parseAudioSettings('{bad json'), { masterVolume: 80, sfxVolume: 90 });
  assert.deepEqual(parseAudioSettings('{"masterVolume":0.5,"sfxVolume":0.9,"musicVolume":0.5}'), {
    masterVolume: 50,
    sfxVolume: 90,
  });
  assert.deepEqual(parseAudioSettings('{"masterVolume":120.4,"sfxVolume":-4,"quality":"high"}'), {
    masterVolume: 100,
    sfxVolume: 0,
  });
  assert.deepEqual(parseAudioSettings('{"masterVolume":"50","sfxVolume":null}'), {
    masterVolume: 80,
    sfxVolume: 90,
  });
  assert.equal(serializeAudioSettings(DEFAULT_AUDIO_SETTINGS), '{"masterVolume":0.8,"sfxVolume":0.9}');
  assert.equal(serializeAudioSettings({ masterVolume: 50, sfxVolume: 90 }), '{"masterVolume":0.5,"sfxVolume":0.9}');
  assert.equal(serializeAudioSettings({ masterVolume: 120, sfxVolume: -2 }), '{"masterVolume":1,"sfxVolume":0}');
});

test('Tab keydown shows an unpinned scoreboard, repeat is ignored, and keyup hides it only when unpinned', () => {
  const closed = { open: false, pinned: false, tabHeld: false };
  const pressed = handleScoreboardTabDown(closed);
  assert.deepEqual(pressed, { open: true, pinned: false, tabHeld: true });
  assert.deepEqual(handleScoreboardTabDown(pressed, true), pressed, 'repeated keydown does not toggle visibility');
  assert.deepEqual(handleScoreboardTabUp(pressed), closed, 'keyup hides an unpinned scoreboard');

  const pinned = toggleScoreboardPin(pressed);
  assert.deepEqual(pinned, { open: true, pinned: true, tabHeld: true });
  assert.deepEqual(handleScoreboardTabUp(pinned), {
    open: true, pinned: true, tabHeld: false,
  }, 'keyup must leave a pinned scoreboard visible');
});

test('Esc follows aim, shop, pinned scoreboard, then settings order; closing match settings resumes simulation', async () => {
  const source = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  const escapeBlock = source.match(/if \(key === 'escape'\) \{([\s\S]*?)\n  \}\n  if \(settingsOpen/);
  assert.ok(escapeBlock);
  const order = [
    escapeBlock[1].indexOf('if (aimingSkill !== null)'),
    escapeBlock[1].indexOf('if (shopOpen)'),
    escapeBlock[1].indexOf('if (scoreboardPinned)'),
    escapeBlock[1].indexOf("openSettings('match')"),
  ];
  assert.ok(order.every((index) => index >= 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(source, /function openSettings\(mode: SettingsMode\): void \{[\s\S]*?if \(mode === 'match'\) \{[\s\S]*?paused = true;[\s\S]*?hud\.setPaused\(true\);[\s\S]*?hud\.setSettingsOpen\(true, mode\);/);
  assert.match(source, /function closeSettings\(\): void \{[\s\S]*?settingsOpen = false;[\s\S]*?if \(wasMatchSettings\) \{\s*paused = false;\s*hud\.setPaused\(false\);/);
  assert.match(source, /if \(settingsOpen \|\| paused \|\| world\.winner !== null\) return;/);
  assert.match(source, /!world \|\| paused \|\| settingsOpen \|\| world\.winner !== null \|\| shopOpen \|\| scoreboardOpen/);
});

test('settings inputs immediately update audio, persist to localStorage, and restore 80/90 defaults', async () => {
  const source = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  const hudSource = await readFile(new URL('../src/hud.ts', import.meta.url), 'utf8');
  assert.match(source, /audio\.setVolumes\(settingsValues\.masterVolume \/ 100, settingsValues\.sfxVolume \/ 100\)/);
  assert.match(source, /window\.localStorage\.setItem\(SETTINGS_STORAGE_KEY, serializeAudioSettings\(settingsValues\)\)/);
  assert.match(hudSource, /masterVolumeInput\.addEventListener\('input'/);
  assert.match(hudSource, /sfxVolumeInput\.addEventListener\('input'/);
  assert.match(hudSource, /settingsResetButton\.addEventListener\('click'[\s\S]*?DEFAULT_AUDIO_SETTINGS/);
  assert.match(hudSource, /settingsReturnMenuButton\.addEventListener\('click'[\s\S]*?returnMenuConfirmationPending[\s\S]*?再次点击确认[\s\S]*?callbacks\.onSettingsReturnToMenu/);
});

test('title and HUD expose the three settings and scoreboard entry buttons with press-to-view copy', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const hudSource = await readFile(new URL('../src/hud.ts', import.meta.url), 'utf8');
  assert.match(html, /id="open-menu-settings"[^>]*>设置<\/button>/);
  assert.match(html, /id="hud-scoreboard-button"[^>]*>[\s\S]*?Tab<\/kbd>/);
  assert.match(html, /id="hud-settings-button"[^>]*>暂停 \/ 设置[\s\S]*?Esc<\/kbd>/);
  assert.match(html, /Tab 按住看战况 · P 商店 · Esc 设置 \/ 暂停/);
  assert.match(html, /\.hud-actions \{[^}]*pointer-events: none/s);
  assert.match(html, /\.hud-action-button \{[^}]*pointer-events: auto/s);
  assert.match(html, /按住 Tab 查看 · 点战况按钮固定/);
  assert.doesNotMatch(html, /按 Tab 关闭/);
  assert.match(html, /id="settings-title"/);
  assert.match(html, /id="master-volume" type="range" min="0" max="100"/);
  assert.match(html, /id="sfx-volume" type="range" min="0" max="100"/);
  assert.match(html, /id="settings-reset"[^>]*>恢复默认<\/button>/);
  assert.match(html, /id="settings-return-menu"[^>]*>返回主菜单<\/button>/);
  assert.match(html, /id="settings-continue"[^>]*>继续游戏<\/button>/);
  assert.match(html, /id="settings-menu-done"[^>]*>完成<\/button>/);
  assert.match(hudSource, /scoreboardButton\.setAttribute\('aria-pressed', String\(pinned\)\)/);
  assert.match(hudSource, /menuSettingsButton\.addEventListener\('click', \(\) => callbacks\.onOpenSettings\?\.\('menu'\)\)/);
  assert.match(hudSource, /hudSettingsButton\.addEventListener\('click', \(\) => callbacks\.onOpenSettings\?\.\('match'\)\)/);
  assert.match(hudSource, /scoreboardButton\.addEventListener\('click', \(\) => callbacks\.onScoreboardPinToggle\?\.\(\)\)/);
  assert.match(hudSource, /settingsContinueButton\.addEventListener\('click', \(\) => callbacks\.onSettingsContinue\?\.\(\)\)/);
  assert.match(hudSource, /settingsMenuDone\.addEventListener\('click', \(\) => callbacks\.onSettingsDone\?\.\(\)\)/);
  assert.match(hudSource, /settingsTitle\.textContent = mode === 'match' \? '游戏暂停' : '设置'/);
});

test('pause overlay is only an empty backdrop while the settings dialog supplies the pause title', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const hudSource = await readFile(new URL('../src/hud.ts', import.meta.url), 'utf8');
  assert.match(html, /<div id="pause-overlay" class="overlay" hidden aria-hidden="true"><\/div>/);
  assert.doesNotMatch(html, /id="pause-overlay"[^>]*>[\s\S]*?模拟已暂停/);
  assert.match(html, /id="settings-overlay"[\s\S]*?role="dialog" aria-modal="true"/);
  assert.match(hudSource, /pauseOverlay\.hidden = !active \|\| !paused/);
});


test('scoreboard hold, pin, unpin, and Escape transitions preserve the pinned-state rules', () => {
  const initial = { open: false, pinned: false, tabHeld: false };
  const held = handleScoreboardTabDown(initial);
  assert.deepEqual(held, { open: true, pinned: false, tabHeld: true });
  assert.deepEqual(handleScoreboardTabDown(held, true), held, 'repeat keydown does not create a new transition');
  assert.deepEqual(handleScoreboardTabUp(held), initial, 'keyup hides an unpinned scoreboard');

  const pinned = toggleScoreboardPin(initial);
  assert.deepEqual(pinned, { open: true, pinned: true, tabHeld: false });
  assert.deepEqual(handleScoreboardTabUp(pinned), pinned, 'keyup does not hide a pinned scoreboard');
  assert.deepEqual(toggleScoreboardPin(pinned), initial, 'second button click unpins and hides when Tab is not held');
  assert.deepEqual(cancelScoreboardPin(pinned), initial, 'Escape unpins and hides without opening another state');

  const heldAndPinned = toggleScoreboardPin(held);
  assert.deepEqual(heldAndPinned, { open: true, pinned: true, tabHeld: true });
  assert.deepEqual(toggleScoreboardPin(heldAndPinned), held, 'unpinning while Tab remains held keeps the scoreboard visible until keyup');
});


class SettingsTestParam {
  constructor(value = 0) { this.value = value; this.events = []; }
  setValueAtTime(value, time) { this.value = value; this.events.push({ type: 'set', value, time }); }
  cancelScheduledValues(time) { this.events.push({ type: 'cancel', time }); }
}

class SettingsTestGain {
  constructor() { this.gain = new SettingsTestParam(1); this.connections = []; }
  connect(target) { this.connections.push(target); return target; }
}

class SettingsTestAudioContext {
  constructor() { this.currentTime = 10; this.state = 'running'; this.destination = {}; this.gains = []; }
  createGain() { const gain = new SettingsTestGain(); this.gains.push(gain); return gain; }
  resume() { return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}

test('app default 80/90 settings multiply the shared output, update immediately, and preserve mute and peak limits', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const context = new SettingsTestAudioContext();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: { AudioContext: function AudioContext() { return context; } },
  });
  const audio = createAudioController();
  try {
    assert.deepEqual(DEFAULT_AUDIO_SETTINGS, { masterVolume: 80, sfxVolume: 90 });
    assert.deepEqual(audio.getVolumes(), { masterVolume: 0.8, sfxVolume: 0.9 });
    audio.setVolumes(DEFAULT_AUDIO_SETTINGS.masterVolume / 100, DEFAULT_AUDIO_SETTINGS.sfxVolume / 100);
    audio.unlock();
    const output = context.gains[0];
    assert.equal(output.gain.value, 0.8 * 0.9);
    assert.deepEqual(audio.getVolumes(), { masterVolume: 0.8, sfxVolume: 0.9 });

    audio.setVolumes(0.5, 0.9);
    assert.equal(output.gain.value, 0.5 * 0.9);
    audio.setMuted(true);
    assert.equal(output.gain.value, 0);
    audio.setVolumes(0.25, 0.4);
    assert.equal(output.gain.value, 0, 'volume changes do not unmute the output');
    audio.setMuted(false);
    assert.equal(output.gain.value, 0.25 * 0.4);

    audio.setVolumes(2, -1);
    assert.deepEqual(audio.getVolumes(), { masterVolume: 1, sfxVolume: 0 });
    assert.equal(output.gain.value, 0);
    audio.setVolumes(Number.NaN, 0.9);
    assert.deepEqual(audio.getVolumes(), { masterVolume: 0.8, sfxVolume: 0.9 });
    assert.equal(output.gain.value, 0.8 * 0.9);
    assert.equal(AUDIO_GAIN.peakLimit, 0.2);
    assert.ok(Math.abs(estimateWorstCasePeak() - 0.18) < 1e-12);
  } finally {
    audio.dispose();
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else delete globalThis.window;
  }
});


test('Q/E/R pointer aim is forwarded on release, Escape clears it, and aiming ignores left-click selection', async () => {
  const source = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.ok(source.includes('function onCanvasMouseMove(event: MouseEvent)'));
  assert.ok(source.includes('playerAimPosition = screenToGroundPoint('));
  assert.ok(source.includes('aimPosition: pendingAimPosition ? { ...pendingAimPosition } : undefined'));
  assert.ok(source.includes('pendingAimPosition = null'));
  assert.ok(source.includes('aimingSkill !== null || !renderScene'));
  assert.ok(source.includes("addEventListener('mousemove', onCanvasMouseMove)"));
  assert.ok(source.includes('setSkillAimPreview(world, aimingSkill, playerAimPosition)'));
});
