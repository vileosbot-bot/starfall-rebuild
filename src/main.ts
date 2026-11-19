import { createAudioController } from './audio.ts';
import { createHud, createMatchSession, getPlayerHeroId, HERO_LABELS, HERO_ROLES } from './hud.ts';
import { createRenderScene } from './render.ts';
import { createSimulation, FIXED_STEP_SECONDS, stepSimulation } from './sim.ts';
import type { HeroRole, Simulation } from './sim.ts';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app mount element.');
}

const required = <T extends HTMLElement>(selector: string): T => {
  const element = app.querySelector<T>(selector);
  if (!element) throw new Error(`Missing app element: ${selector}`);
  return element;
};

const heroSelectScreen = required<HTMLElement>('#hero-select-screen');
const heroSelectButtons = Array.from(app.querySelectorAll<HTMLButtonElement>('.hero-select-card[data-hero-role]'));
const selectedHeroSummary = required<HTMLElement>('#selected-hero-summary');
const enterMatchButton = required<HTMLButtonElement>('#enter-match');
const returnMenuButton = required<HTMLButtonElement>('#return-menu');

const session = createMatchSession<Simulation>();
const audio = createAudioController();
const hud = createHud(app);

let selectedRole: HeroRole | null = null;
let renderScene: ReturnType<typeof createRenderScene> | null = null;
let paused = false;
let shopOpen = false;
let scoreboardOpen = false;
let audioUnlocked = false;
let eventCursor = 0;
let accumulator = 0;
let hudAccumulator = 0;
let previousFrameTime = 0;
let animationFrame = 0;

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
  eventCursor = world.events.length;
}

function handleSimulationEvents(world: Simulation): void {
  if (!audioUnlocked) {
    eventCursor = world.events.length;
    return;
  }
  const selectedHeroId = session.selectedRole ? getPlayerHeroId(session.selectedRole) : null;
  for (; eventCursor < world.events.length; eventCursor += 1) {
    const event = world.events[eventCursor];
    if (!event) continue;
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
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.repeat || !session.world) return;
  const key = event.key.toLowerCase();
  if (key === 'p') {
    shopOpen = !shopOpen;
    if (shopOpen) scoreboardOpen = false;
    hud.setShopOpen(shopOpen);
    return;
  }
  if (key === 'tab') {
    event.preventDefault();
    scoreboardOpen = !scoreboardOpen;
    if (scoreboardOpen) shopOpen = false;
    hud.setScoreboardOpen(scoreboardOpen);
    return;
  }
  if (key === 'escape') {
    paused = !paused;
    hud.setPaused(paused);
    return;
  }
  if (key === 'm') {
    hud.setMuted(audio.toggleMuted());
    return;
  }

  const hintKey = key === ' ' ? 'Space' : key.toUpperCase();
  if (['Q', 'E', 'R', 'F', 'G', 'B', 'Space'].includes(hintKey)) {
    if (hintKey === 'Space') event.preventDefault();
    hud.setHint(hintKey);
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
      stepSimulation(world, 1);
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
  handleSimulationEvents(world);

  hudAccumulator += elapsed;
  if (hudAccumulator >= 0.1 || world.winner !== null) {
    hud.update(world);
    hudAccumulator %= 0.1;
  }
  animationFrame = window.requestAnimationFrame(frame);
}

function startMatch(role: HeroRole): void {
  if (session.world) return;
  const world = session.enter(role, () => createSimulation(20261119));
  paused = false;
  shopOpen = false;
  scoreboardOpen = false;
  eventCursor = world.events.length;
  accumulator = 0;
  hudAccumulator = 0;
  previousFrameTime = 0;

  heroSelectScreen.hidden = true;
  hud.setSelectedHero(role);
  hud.setActive(true);
  hud.setShopOpen(false);
  hud.setScoreboardOpen(false);
  hud.setPaused(false);
  hud.setHint('');
  hud.update(world);

  renderScene = createRenderScene(app);
  renderScene.syncSimulation(world);
  renderScene.start();
  unlockAudio();
  animationFrame = window.requestAnimationFrame(frame);
}

function returnToMenu(): void {
  if (animationFrame !== 0) {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }
  session.leave();
  renderScene?.dispose();
  renderScene = null;
  paused = false;
  shopOpen = false;
  scoreboardOpen = false;
  eventCursor = 0;
  accumulator = 0;
  hudAccumulator = 0;
  previousFrameTime = 0;
  hud.setActive(false);
  hud.setHint('');
  heroSelectScreen.hidden = false;
  setSelectedRole(null);
}

enterMatchButton.addEventListener('click', () => {
  if (selectedRole) startMatch(selectedRole);
});
returnMenuButton.addEventListener('click', returnToMenu);
window.addEventListener('keydown', onKeyDown);

setSelectedRole(null);
hud.setActive(false);

window.addEventListener('beforeunload', () => {
  window.removeEventListener('keydown', onKeyDown);
  returnToMenu();
  audio.dispose();
});
