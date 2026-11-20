import { createAudioController } from './audio.ts';
import { createHud, createMatchSession, getPlayerHeroId, HERO_LABELS, HERO_ROLES, parseAudioSettings, serializeAudioSettings, SETTINGS_STORAGE_KEY, handleScoreboardTabDown, handleScoreboardTabUp, toggleScoreboardPin, cancelScoreboardPin } from './hud.ts';
import type { AudioSettings, SettingsMode } from './hud.ts';
import { createRenderScene, projectSimPointToScreen, screenToGroundPoint } from './render.ts';
import { createSimulation, FIXED_STEP_SECONDS, getEventsAfterSequence, isStructureTargetEligible, stepSimulation } from './sim.ts';
import type { HeroRole, PlayerCommand, PlayerSkillKey, Position, Simulation } from './sim.ts';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app mount element.');
}

const appElement: HTMLDivElement = app;

const required = <T extends HTMLElement>(selector: string): T => {
  const element = app.querySelector<T>(selector);
  if (!element) throw new Error(`Missing app element: ${selector}`);
  return element;
};

const heroSelectScreen = required<HTMLElement>('#hero-select-screen');
const heroSelectButtons = Array.from(app.querySelectorAll<HTMLButtonElement>('.hero-select-card[data-hero-role]'));
const selectedHeroSummary = required<HTMLElement>('#selected-hero-summary');
const enterMatchButton = required<HTMLButtonElement>('#enter-match');

function readStoredAudioSettings(): AudioSettings {
  try {
    return parseAudioSettings(window.localStorage.getItem(SETTINGS_STORAGE_KEY));
  } catch {
    return parseAudioSettings(null);
  }
}

const session = createMatchSession<Simulation>();
const audio = createAudioController();
let settingsValues: AudioSettings = readStoredAudioSettings();
audio.setVolumes(settingsValues.masterVolume / 100, settingsValues.sfxVolume / 100);
const hud = createHud(app, undefined, {
  onOpenSettings: openSettings,
  onSettingsChange: updateAudioSettings,
  onSettingsContinue: closeSettings,
  onSettingsDone: closeSettings,
  onSettingsReturnToMenu: returnToMenu,
  onScoreboardPinToggle: toggleScoreboardPinned,
});
hud.setSettingsValues(settingsValues);

let selectedRole: HeroRole | null = null;
let renderScene: ReturnType<typeof createRenderScene> | null = null;
let paused = false;
let shopOpen = false;
let scoreboardOpen = false;
let scoreboardPinned = false;
let tabHeld = false;
let settingsOpen = false;
let settingsMode: SettingsMode = 'menu';
let audioUnlocked = false;
let eventCursor = 0; // Last consumed event sequence, not an array index.
let accumulator = 0;
let hudAccumulator = 0;
let previousFrameTime = 0;
let animationFrame = 0;
const heldKeys = new Set<string>();
let pendingAttack = false;
let pendingSkill: PlayerSkillKey | null = null;
let pendingAimPosition: Position | null = null;
let aimingSkill: 'Q' | 'E' | 'R' | null = null;
let playerAimPosition: Position | null = null;
let playerMoveTarget: { x: number; y: number } | null = null;
let playerAttackTargetId: string | null = null;
const TARGET_PICK_RADIUS_PX = 28;
const GROUND_HALF_EXTENT = 20;

function clearAimingSkill(): void {
  aimingSkill = null;
  playerAimPosition = null;
  hud.setAimingSkill(null);
  if (session.world) renderScene?.setSkillAimPreview(session.world, null, null);
}

function clearPlayerInput(): void {
  heldKeys.clear();
  tabHeld = false;
  if (!scoreboardPinned && scoreboardOpen) {
    scoreboardOpen = false;
    hud.setScoreboardOpen(false, false);
  }
  pendingAttack = false;
  pendingSkill = null;
  pendingAimPosition = null;
  playerMoveTarget = null;
  playerAttackTargetId = null;
  clearAimingSkill();
  hud.setPlayerTargetHint(null);
}

function isPlayerHeroAlive(world: Simulation | null = session.world): boolean {
  if (!world || !session.selectedRole) return false;
  const playerHeroId = getPlayerHeroId(session.selectedRole);
  return world.entities.some((entity) => entity.id === playerHeroId && entity.kind === 'hero' && entity.alive);
}

function isPlayerSelectableEnemyTarget(world: Simulation, targetId: string): boolean {
  const player = world.playerHeroId
    ? world.entities.find((entity) => entity.id === world.playerHeroId && entity.kind === 'hero' && entity.alive)
    : undefined;
  const target = world.entities.find((entity) => entity.id === targetId && entity.alive);
  if (!player || !target || target.team === player.team || target.team === 'neutral') return false;
  if (target.kind === 'hero' || target.kind === 'minion') return true;
  if (target.kind === 'tower' || target.kind === 'crystal') {
    return isStructureTargetEligible(world, player.team, target.id);
  }
  return false;
}

function findProjectedEnemyAtPoint(
  world: Simulation,
  screenX: number,
  screenY: number,
  width: number,
  height: number,
): Simulation['entities'][number] | null {
  const player = world.playerHeroId
    ? world.entities.find((entity) => entity.id === world.playerHeroId && entity.kind === 'hero' && entity.alive)
    : undefined;
  if (!player) return null;
  const radiusSquared = TARGET_PICK_RADIUS_PX * TARGET_PICK_RADIUS_PX;
  let nearest: Simulation['entities'][number] | null = null;
  let nearestDistanceSquared = radiusSquared;

  for (const entity of world.entities) {
    if (!entity.alive || entity.team === player.team || entity.team === 'neutral') continue;
    if (entity.kind !== 'hero' && entity.kind !== 'minion' && entity.kind !== 'tower' && entity.kind !== 'crystal') continue;
    const worldHeight = entity.kind === 'tower' ? 1.6 : entity.kind === 'crystal' ? 1.35 : entity.kind === 'hero' ? 0.9 : 0.5;
    const projected = projectSimPointToScreen(entity.position, width, height, worldHeight);
    if (!projected) continue;
    const dx = projected.x - screenX;
    const dy = projected.y - screenY;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared > nearestDistanceSquared) continue;
    if (distanceSquared === nearestDistanceSquared && nearest && entity.id > nearest.id) continue;
    nearest = entity;
    nearestDistanceSquared = distanceSquared;
  }
  return nearest;
}

function onCanvasContextMenu(event: MouseEvent): void {
  event.preventDefault();
}

function onCanvasMouseDown(event: MouseEvent): void {
  if (event.button !== 0 && event.button !== 2) return;
  if (event.button === 2) event.preventDefault();
  const world = session.world;
  if (
    !world || paused || settingsOpen || world.winner !== null || shopOpen || scoreboardOpen ||
    !isPlayerHeroAlive(world) || aimingSkill !== null || !renderScene
  ) return;

  const rect = renderScene.canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;
  const clickedEntity = findProjectedEnemyAtPoint(world, screenX, screenY, rect.width, rect.height);
  if (clickedEntity) {
    // A locked inner tower or crystal is a blocked target, not a ground-move destination.
    if (!isPlayerSelectableEnemyTarget(world, clickedEntity.id)) return;
    playerAttackTargetId = clickedEntity.id;
    playerMoveTarget = null;
    hud.setPlayerTargetHint('attack', clickedEntity.id);
    return;
  }

  if (event.button === 2) {
    const groundPoint = screenToGroundPoint(screenX, screenY, rect.width, rect.height);
    if (!groundPoint || Math.abs(groundPoint.x) > GROUND_HALF_EXTENT || Math.abs(groundPoint.y) > GROUND_HALF_EXTENT) return;
    playerMoveTarget = groundPoint;
    playerAttackTargetId = null;
    hud.setPlayerTargetHint('move');
    return;
  }

  playerMoveTarget = null;
  playerAttackTargetId = null;
  hud.setPlayerTargetHint(null);
}

function onCanvasMouseMove(event: MouseEvent): void {
  if (aimingSkill === null) return;
  const world = session.world;
  if (!world || paused || settingsOpen || world.winner !== null || !isPlayerHeroAlive(world) || !renderScene) {
    playerAimPosition = null;
    return;
  }
  const rect = renderScene.canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    playerAimPosition = null;
    return;
  }
  playerAimPosition = screenToGroundPoint(
    event.clientX - rect.left,
    event.clientY - rect.top,
    rect.width,
    rect.height,
  );
}

function consumePlayerCommand(): PlayerCommand {
  const left = heldKeys.has('a') || heldKeys.has('arrowleft');
  const right = heldKeys.has('d') || heldKeys.has('arrowright');
  const up = heldKeys.has('w') || heldKeys.has('arrowup');
  const down = heldKeys.has('s') || heldKeys.has('arrowdown');
  const world = session.world;
  if (world && playerAttackTargetId && !isPlayerSelectableEnemyTarget(world, playerAttackTargetId)) {
    playerAttackTargetId = null;
    hud.setPlayerTargetHint(null);
  }
  const command: PlayerCommand = {
    enabled: true,
    moveX: Number(right) - Number(left),
    moveY: Number(down) - Number(up),
    moveTarget: playerMoveTarget ? { ...playerMoveTarget } : undefined,
    attackTargetId: playerAttackTargetId,
    attack: heldKeys.has(' ') || pendingAttack,
    skill: pendingSkill ?? undefined,
    aimPosition: pendingAimPosition ? { ...pendingAimPosition } : undefined,
  };
  pendingAttack = false;
  pendingSkill = null;
  pendingAimPosition = null;
  return command;
}

function setSelectedRole(role: HeroRole | null): void {
  selectedRole = role;
  for (const button of heroSelectButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.heroRole === role));
  }
  enterMatchButton.disabled = role === null;
  selectedHeroSummary.textContent = role
    ? `已选择 ${HERO_LABELS[role]}，确认后进入战场。`
    : '选择一位英雄，确认后进入战场。';
}

for (const button of heroSelectButtons) {
  const role = button.dataset.heroRole as HeroRole | undefined;
  if (!role || !HERO_ROLES.includes(role)) continue;
  button.addEventListener('click', () => setSelectedRole(role));
}

function unlockAudio(): void {
  const world = session.world;
  if (audioUnlocked || !world) return;
  audio.unlock();
  audioUnlocked = true;
  eventCursor = world.eventSequence;
}

function handleSimulationEvents(world: Simulation): void {
  if (!audioUnlocked) {
    eventCursor = world.eventSequence;
    return;
  }
  const selectedHeroId = session.selectedRole ? getPlayerHeroId(session.selectedRole) : null;
  for (const event of getEventsAfterSequence(world, eventCursor)) {
    if (event.type === 'attack') {
      if (event.targetId?.includes('-tower-')) audio.playTower();
      else if (event.sourceId === selectedHeroId) audio.playAttack();
    } else if (event.type === 'passive-gold' && event.team === 'blue' && event.sourceId === selectedHeroId) {
      audio.playGold();
    } else if (event.type === 'unit-died' && event.sourceId === selectedHeroId) {
      audio.playGold();
    } else if (event.type === 'item-purchased' && event.team === 'blue') {
      audio.playPurchase();
    } else if (event.type === 'tower-destroyed') {
      audio.playTower();
    } else if (event.type === 'crystal-destroyed') {
      if (event.team === 'blue') audio.playVictory();
      else audio.playDefeat();
    }
    eventCursor = event.sequence;
  }
}

function onKeyDown(event: KeyboardEvent): void {
  const key = event.key.toLowerCase();
  if (key === 'tab') {
    const world = session.world;
    if (!world || settingsOpen) return;
    event.preventDefault();
    if (event.repeat || paused || world.winner !== null) return;
    const nextScoreboard = handleScoreboardTabDown({ open: scoreboardOpen, pinned: scoreboardPinned, tabHeld });
    tabHeld = nextScoreboard.tabHeld;
    if (!scoreboardPinned) {
      scoreboardOpen = nextScoreboard.open;
      if (shopOpen) {
        shopOpen = false;
        hud.setShopOpen(false);
      }
      hud.setScoreboardOpen(scoreboardOpen, false);
    }
    return;
  }
  if (event.repeat) return;
  if (key === 'escape' && settingsOpen) {
    closeSettings();
    return;
  }
  const world = session.world;
  if (!world) return;
  if (key === 'escape') {
    if (aimingSkill !== null) {
      clearAimingSkill();
      pendingSkill = null;
      pendingAimPosition = null;
      return;
    }
    if (shopOpen) {
      shopOpen = false;
      hud.setShopOpen(false);
      return;
    }
    if (scoreboardPinned) {
      const nextScoreboard = cancelScoreboardPin({ open: scoreboardOpen, pinned: scoreboardPinned, tabHeld });
      scoreboardPinned = nextScoreboard.pinned;
      scoreboardOpen = nextScoreboard.open;
      hud.setScoreboardOpen(false, false);
      return;
    }
    openSettings('match');
    return;
  }
  if (settingsOpen || paused || world.winner !== null) return;
  if (key === 'p') {
    shopOpen = !shopOpen;
    if (shopOpen) {
      scoreboardPinned = false;
      scoreboardOpen = false;
      hud.setScoreboardOpen(false, false);
    }
    hud.setShopOpen(shopOpen);
    return;
  }
  if (key === 'm') {
    hud.setMuted(audio.toggleMuted());
    return;
  }
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
    heldKeys.add(key);
    if (playerMoveTarget) {
      playerMoveTarget = null;
      hud.setPlayerTargetHint(playerAttackTargetId ? 'attack' : null, playerAttackTargetId ?? undefined);
    }
    event.preventDefault();
    return;
  }
  if (key === ' ') {
    heldKeys.add(key);
    pendingAttack = true;
    event.preventDefault();
    if (aimingSkill === null) hud.setHint('Space');
    return;
  }
  if (['q', 'e', 'r'].includes(key)) {
    if (!isPlayerHeroAlive(world)) {
      clearAimingSkill();
      return;
    }
    if (aimingSkill === null) {
      aimingSkill = key.toUpperCase() as 'Q' | 'E' | 'R';
      playerAimPosition = null;
      hud.setAimingSkill(aimingSkill);
    }
    event.preventDefault();
    return;
  }
  if (['f', 'g', 'b'].includes(key)) {
    pendingAimPosition = null;
    pendingSkill = key.toUpperCase() as PlayerSkillKey;
    event.preventDefault();
    if (aimingSkill === null) hud.setHint(key.toUpperCase());
  }
}

function onKeyUp(event: KeyboardEvent): void {
  const key = event.key.toLowerCase();
  if (key === 'tab') {
    if (session.world && !settingsOpen && !paused) event.preventDefault();
    const nextScoreboard = handleScoreboardTabUp({ open: scoreboardOpen, pinned: scoreboardPinned, tabHeld });
    tabHeld = nextScoreboard.tabHeld;
    scoreboardOpen = nextScoreboard.open;
    hud.setScoreboardOpen(scoreboardOpen, scoreboardPinned);
    return;
  }
  heldKeys.delete(key);
  if (settingsOpen || paused || !session.world) return;
  if (!['q', 'e', 'r'].includes(key)) return;
  const skill = key.toUpperCase() as 'Q' | 'E' | 'R';
  if (aimingSkill !== skill) return;
  const world = session.world;
  const canRelease = Boolean(world && !paused && !settingsOpen && world.winner === null && isPlayerHeroAlive(world));
  const releasedAimPosition = playerAimPosition ? { ...playerAimPosition } : null;
  clearAimingSkill();
  if (canRelease) {
    pendingSkill = skill;
    pendingAimPosition = releasedAimPosition;
  } else {
    pendingAimPosition = null;
  }
}


function frame(now: number): void {
  const world = session.world;
  if (!world || !renderScene) {
    animationFrame = 0;
    return;
  }

  if (previousFrameTime === 0) previousFrameTime = now;
  const elapsed = Math.min((now - previousFrameTime) / 1000, 0.25);
  previousFrameTime = now;

  if (!paused && world.winner === null) {
    accumulator += elapsed;
    while (accumulator >= FIXED_STEP_SECONDS) {
      stepSimulation(world, 1, consumePlayerCommand());
      const playerHero = session.selectedRole
        ? world.entities.find((entity) => entity.id === getPlayerHeroId(session.selectedRole!))
        : null;
      if (!playerHero?.alive || world.winner !== null) {
        clearPlayerInput();
      } else {
        if (playerMoveTarget && Math.hypot(playerHero.position.x - playerMoveTarget.x, playerHero.position.y - playerMoveTarget.y) <= 0.3 + 1e-9) {
          playerMoveTarget = null;
          hud.setPlayerTargetHint(null);
        }
        if (playerAttackTargetId && !isPlayerSelectableEnemyTarget(world, playerAttackTargetId)) {
          playerAttackTargetId = null;
          hud.setPlayerTargetHint(null);
        }
      }
      accumulator -= FIXED_STEP_SECONDS;
      if (world.winner !== null) {
        accumulator = 0;
        break;
      }
    }
  } else {
    accumulator = 0;
  }

  renderScene.syncSimulation(world);
  renderScene.setSkillAimPreview(world, aimingSkill, playerAimPosition);
  handleSimulationEvents(world);

  hudAccumulator += elapsed;
  if (hudAccumulator >= 0.1 || world.winner !== null) {
    hud.update(world);
    hudAccumulator %= 0.1;
  }
  animationFrame = window.requestAnimationFrame(frame);
}

function updateAudioSettings(values: AudioSettings): void {
  settingsValues = parseAudioSettings(serializeAudioSettings(values));
  audio.setVolumes(settingsValues.masterVolume / 100, settingsValues.sfxVolume / 100);
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, serializeAudioSettings(settingsValues));
  } catch {
    // Private browsing or a storage policy may reject writes; live audio still updates.
  }
  hud.setSettingsValues(settingsValues);
}

function openSettings(mode: SettingsMode): void {
  if (settingsOpen) return;
  if (mode === 'match' && !session.world) return;
  if (mode === 'menu' && session.world) return;
  settingsOpen = true;
  settingsMode = mode;
  if (mode === 'match') {
    paused = true;
    shopOpen = false;
    scoreboardOpen = false;
    scoreboardPinned = false;
    tabHeld = false;
    clearPlayerInput();
    hud.setShopOpen(false);
    hud.setScoreboardOpen(false, false);
    hud.setPaused(true);
  }
  hud.setSettingsValues(settingsValues);
  hud.setSettingsOpen(true, mode);
}

function closeSettings(): void {
  if (!settingsOpen) return;
  const wasMatchSettings = settingsMode === 'match';
  settingsOpen = false;
  hud.setSettingsOpen(false, settingsMode);
  if (wasMatchSettings) {
    paused = false;
    hud.setPaused(false);
    accumulator = 0;
    previousFrameTime = 0;
  }
}

function toggleScoreboardPinned(): void {
  const world = session.world;
  if (!world || paused || settingsOpen || world.winner !== null) return;
  const nextScoreboard = toggleScoreboardPin({ open: scoreboardOpen, pinned: scoreboardPinned, tabHeld });
  scoreboardPinned = nextScoreboard.pinned;
  scoreboardOpen = nextScoreboard.open;
  if (scoreboardPinned) {
    shopOpen = false;
    hud.setShopOpen(false);
  }
  hud.setScoreboardOpen(scoreboardOpen, scoreboardPinned);
}

function startMatch(role: HeroRole): void {
  if (session.world) return;
  const world = session.enter(role, () => createSimulation(20261119, role));
  paused = false;
  shopOpen = false;
  scoreboardOpen = false;
  scoreboardPinned = false;
  tabHeld = false;
  settingsOpen = false;
  settingsMode = 'match';
  eventCursor = world.eventSequence;
  accumulator = 0;
  hudAccumulator = 0;
  previousFrameTime = 0;

  heroSelectScreen.hidden = true;
  hud.setSelectedHero(role);
  hud.setActive(true);
  hud.setShopOpen(false);
  hud.setScoreboardOpen(false, false);
  hud.setPaused(false);
  hud.setSettingsOpen(false, 'match');
  hud.setHint('');
  hud.update(world);

  renderScene = createRenderScene(appElement);
  renderScene.canvas.addEventListener('mousedown', onCanvasMouseDown);
  renderScene.canvas.addEventListener('mousemove', onCanvasMouseMove);
  renderScene.canvas.addEventListener('contextmenu', onCanvasContextMenu);
  renderScene.syncSimulation(world);
  renderScene.start();
  unlockAudio();
  animationFrame = window.requestAnimationFrame(frame);
}

function returnToMenu(): void {
  clearPlayerInput();
  if (animationFrame !== 0) {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }
  session.leave();
  renderScene?.canvas.removeEventListener('mousedown', onCanvasMouseDown);
  renderScene?.canvas.removeEventListener('mousemove', onCanvasMouseMove);
  renderScene?.canvas.removeEventListener('contextmenu', onCanvasContextMenu);
  renderScene?.dispose();
  renderScene = null;
  paused = false;
  shopOpen = false;
  scoreboardOpen = false;
  scoreboardPinned = false;
  tabHeld = false;
  settingsOpen = false;
  settingsMode = 'menu';
  eventCursor = 0;
  accumulator = 0;
  hudAccumulator = 0;
  previousFrameTime = 0;
  hud.setActive(false);
  hud.setSettingsOpen(false, 'menu');
  hud.setScoreboardOpen(false, false);
  hud.setPaused(false);
  hud.setHint('');
  heroSelectScreen.hidden = false;
  setSelectedRole(null);
}

enterMatchButton.addEventListener('click', () => {
  if (selectedRole) startMatch(selectedRole);
});
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);
window.addEventListener('blur', clearPlayerInput);

setSelectedRole(null);
hud.setActive(false);

window.addEventListener('beforeunload', () => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('blur', clearPlayerInput);
  returnToMenu();
  audio.dispose();
});
