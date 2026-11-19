import { createAudioController } from './audio.ts';
import { createHud } from './hud.ts';
import { createRenderScene } from './render.ts';
import { createSimulation, FIXED_STEP_SECONDS, stepSimulation } from './sim.ts';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app mount element.');
}

const world = createSimulation(20261119);
const renderScene = createRenderScene(app);
const audio = createAudioController();
const hud = createHud(app);

let paused = false;
let shopOpen = false;
let scoreboardOpen = false;
let audioUnlocked = false;
let eventCursor = world.events.length;
let accumulator = 0;
let hudAccumulator = 0;
let previousFrameTime = 0;

function unlockAudio(): void {
  if (audioUnlocked) return;
  audio.unlock();
  audioUnlocked = true;
  eventCursor = world.events.length;
}

window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

function handleSimulationEvents(): void {
  if (!audioUnlocked) {
    eventCursor = world.events.length;
    return;
  }
  for (; eventCursor < world.events.length; eventCursor += 1) {
    const event = world.events[eventCursor];
    if (!event) continue;
    if (event.type === 'attack') {
      if (event.targetId?.includes('-tower-')) audio.playTower();
      else if (event.sourceId?.startsWith('blue-hero-')) audio.playAttack();
    } else if (event.type === 'passive-gold' && event.team === 'blue' && event.sourceId === 'blue-hero-vanguard') {
      audio.playGold();
    } else if (event.type === 'unit-died' && event.sourceId?.startsWith('blue-hero-')) {
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
  if (event.repeat) return;
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

window.addEventListener('keydown', onKeyDown);

function frame(now: number): void {
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
  handleSimulationEvents();

  hudAccumulator += elapsed;
  if (hudAccumulator >= 0.1 || world.winner !== null) {
    hud.update(world);
    hudAccumulator %= 0.1;
  }
  window.requestAnimationFrame(frame);
}

hud.update(world);
renderScene.syncSimulation(world);
renderScene.start();
window.requestAnimationFrame(frame);

window.addEventListener('beforeunload', () => {
  window.removeEventListener('keydown', onKeyDown);
  renderScene.dispose();
  audio.dispose();
});
