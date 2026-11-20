import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_GAIN, AUDIO_SOUND_DESIGN, createAudioController, estimateWorstCasePeak } from '../src/audio.ts';

class FakeParam {
  constructor(value = 0, now = () => 10) { this.value = value; this.now = now; this.events = []; }
  setValueAtTime(value, time) { if (time <= this.now() + 1e-9) this.value = value; this.events.push({ type: 'set', value, time }); }
  linearRampToValueAtTime(value, time) { if (time <= this.now() + 1e-9) this.value = value; this.events.push({ type: 'linear', value, time }); }
  exponentialRampToValueAtTime(value, time) { if (time <= this.now() + 1e-9) this.value = value; this.events.push({ type: 'exponential', value, time }); }
  cancelScheduledValues(time) { this.events.push({ type: 'cancel', time }); }
}

class FakeNode {
  constructor(kind) { this.kind = kind; this.connections = []; }
  connect(target) { this.connections.push(target); return target; }
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 10;
    this.sampleRate = 8000;
    this.state = 'running';
    this.destination = new FakeNode('destination');
    this.nodes = [];
    this.gains = [];
    this.oscillators = [];
    this.bufferSources = [];
  }
  createGain() {
    const node = new FakeNode('gain');
    node.gain = new FakeParam(1, () => this.currentTime);
    this.nodes.push(node); this.gains.push(node); return node;
  }
  createOscillator() {
    const node = new FakeNode('oscillator');
    node.type = 'sine'; node.frequency = new FakeParam(0, () => this.currentTime);
    node.startTimes = []; node.stopTimes = [];
    node.start = (time) => node.startTimes.push(time);
    node.stop = (time) => node.stopTimes.push(time);
    this.nodes.push(node); this.oscillators.push(node); return node;
  }
  createBuffer(channels, frameCount, sampleRate) {
    const data = Array.from({ length: channels }, () => new Float32Array(frameCount));
    return { getChannelData: (index) => data[index], channels, frameCount, sampleRate };
  }
  createBufferSource() {
    const node = new FakeNode('buffer-source');
    node.startTimes = []; node.stopTimes = [];
    node.start = (time) => node.startTimes.push(time);
    node.stop = (time) => node.stopTimes.push(time);
    this.nodes.push(node); this.bufferSources.push(node); return node;
  }
  createBiquadFilter() {
    const node = new FakeNode('filter');
    node.type = 'lowpass'; node.frequency = new FakeParam(0, () => this.currentTime);
    this.nodes.push(node); return node;
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}

function installFakeWindow() {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const context = new FakeAudioContext();
  const AudioContextConstructor = function AudioContextConstructor() { return context; };
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: { AudioContext: AudioContextConstructor } });
  return { context, restore() { if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window; } };
}

function maximumOverlappingLevel(sound) {
  const floor = 0.0001 / AUDIO_GAIN.voiceMaster;
  const events = [];
  for (const voice of [...sound.tones, ...sound.noises]) {
    const end = voice.offset + voice.duration;
    events.push({ time: voice.offset, delta: voice.level });
    events.push({ time: end, delta: floor - voice.level });
    events.push({ time: end + voice.releaseTail, delta: -floor });
  }
  events.sort((a, b) => a.time - b.time);
  let active = 0; let peak = 0;
  for (let i = 0; i < events.length;) {
    const time = events[i].time; let delta = 0;
    while (i < events.length && events[i].time === time) delta += events[i++].delta;
    active = Math.max(0, active + delta); peak = Math.max(peak, active);
  }
  return peak;
}

test('six trigger groups route all local gains through one shared output node', () => {
  const env = installFakeWindow(); const audio = createAudioController();
  try {
    audio.unlock(); const master = env.context.gains[0];
    assert.deepEqual(master.connections, [env.context.destination]);
    for (const name of ['playAttack', 'playGold', 'playPurchase', 'playTower', 'playVictory', 'playDefeat']) {
      const before = env.context.gains.length; audio[name]();
      const voices = env.context.gains.slice(before);
      assert.ok(voices.length > 0, name + ' creates voice gains');
      assert.ok(voices.every((gain) => gain.connections.length === 1 && gain.connections[0] === master));
    }
    assert.deepEqual(env.context.nodes.filter((node) => node.connections.includes(env.context.destination)), [master]);
  } finally { audio.dispose(); env.restore(); }
});

test('mute immediately zeros the shared output after already-started victory notes are scheduled', () => {
  const env = installFakeWindow(); const audio = createAudioController();
  try {
    audio.unlock(); audio.playVictory();
    assert.deepEqual(env.context.oscillators.map((node) => node.startTimes[0]), [10, 10.15, 10.32]);
    const master = env.context.gains[0]; audio.setMuted(true);
    assert.equal(audio.isMuted(), true); assert.equal(master.gain.value, 0);
    assert.ok(master.gain.events.some((event) => event.type === 'set' && event.time === 10 && event.value === 0));
    const lastCancel = master.gain.events.map((event) => event.type).lastIndexOf('cancel');
    assert.ok(master.gain.events.slice(lastCancel + 1).filter((event) => event.type === 'set').every((event) => event.value === 0));
    audio.setMuted(false); assert.ok(master.gain.value > 0);
  } finally { audio.dispose(); env.restore(); }
});

test('worst-case peak derives from playback constants and remains below the 0.2 ceiling', () => {
  const perTrigger = Object.values(AUDIO_SOUND_DESIGN).map(maximumOverlappingLevel).reduce((a, b) => a + b, 0);
  const raw = perTrigger * AUDIO_GAIN.voiceMaster * AUDIO_GAIN.outputBase;
  const expected = Math.min(raw, AUDIO_GAIN.peakLimit * AUDIO_GAIN.safetyFactor);
  assert.ok(Math.abs(perTrigger - 4.530833333333333) < 1e-12);
  assert.ok(Math.abs(raw - 0.5437) < 1e-12);
  assert.equal(estimateWorstCasePeak(), expected);
  assert.ok(Math.abs(estimateWorstCasePeak() - 0.18) < 1e-12);
  assert.ok(estimateWorstCasePeak() <= AUDIO_GAIN.peakLimit);
  assert.ok(Math.abs(AUDIO_GAIN.peakLimit - estimateWorstCasePeak() - 0.02) < 1e-12);
});

test('frequency, waveform, duration, offset, level, and release timing remain unchanged', () => {
  assert.deepEqual(AUDIO_SOUND_DESIGN, {
    attack: { tones: [{ frequency: 520, duration: 0.055, releaseTail: 0.015, waveform: 'square', offset: 0, level: 0.55 }], noises: [] },
    gold: { tones: [
      { frequency: 880, duration: 0.08, releaseTail: 0.015, waveform: 'sine', offset: 0, level: 0.5 },
      { frequency: 1175, duration: 0.1, releaseTail: 0.015, waveform: 'sine', offset: 0.085, level: 0.45 },
    ], noises: [] },
    purchase: { tones: [
      { frequency: 440, duration: 0.09, releaseTail: 0.015, waveform: 'triangle', offset: 0, level: 0.55 },
      { frequency: 554, duration: 0.09, releaseTail: 0.015, waveform: 'triangle', offset: 0.09, level: 0.55 },
      { frequency: 659, duration: 0.14, releaseTail: 0.015, waveform: 'triangle', offset: 0.18, level: 0.6 },
    ], noises: [] },
    tower: { tones: [{ frequency: 92, duration: 0.22, releaseTail: 0.015, waveform: 'triangle', offset: 0, level: 0.75 }],
      noises: [{ duration: 0.16, releaseTail: 0.01, offset: 0, level: 0.28, filterFrequency: 420 }] },
    victory: { tones: [
      { frequency: 523, duration: 0.16, releaseTail: 0.015, waveform: 'sine', offset: 0, level: 0.6 },
      { frequency: 659, duration: 0.18, releaseTail: 0.015, waveform: 'sine', offset: 0.15, level: 0.6 },
      { frequency: 784, duration: 0.3, releaseTail: 0.015, waveform: 'sine', offset: 0.32, level: 0.65 },
    ], noises: [] },
    defeat: { tones: [
      { frequency: 330, duration: 0.18, releaseTail: 0.015, waveform: 'triangle', offset: 0, level: 0.6 },
      { frequency: 247, duration: 0.24, releaseTail: 0.015, waveform: 'triangle', offset: 0.18, level: 0.55 },
    ], noises: [] },
  });
});

test('dynamic master limiter also clamps eight simultaneous tower triggers', () => {
  const env = installFakeWindow(); const audio = createAudioController();
  try {
    audio.unlock(); for (let i = 0; i < 8; i += 1) audio.playTower();
    const master = env.context.gains[0];
    const peak = 8 * AUDIO_GAIN.voiceMaster * (0.75 + 0.28);
    const target = AUDIO_GAIN.peakLimit * AUDIO_GAIN.safetyFactor;
    assert.ok(master.gain.value < 1);
    assert.ok(master.gain.value * peak <= target + 1e-12);
    assert.ok(Math.abs(master.gain.value - target / peak) < 1e-12);
  } finally { audio.dispose(); env.restore(); }
});

test('all six triggers can be phase-aligned and the shared output clamps their worst overlap', () => {
  const env = installFakeWindow(); const audio = createAudioController();
  try {
    const ctx = env.context; ctx.currentTime = 9.68; audio.unlock(); audio.playVictory();
    ctx.currentTime = 9.82; audio.playPurchase();
    ctx.currentTime = 10; audio.playAttack(); audio.playGold(); audio.playTower(); audio.playDefeat();
    const perTrigger = Object.values(AUDIO_SOUND_DESIGN).map(maximumOverlappingLevel).reduce((a, b) => a + b, 0);
    const raw = perTrigger * AUDIO_GAIN.voiceMaster * AUDIO_GAIN.outputBase;
    const target = AUDIO_GAIN.peakLimit * AUDIO_GAIN.safetyFactor;
    assert.ok(Math.abs(env.context.gains[0].gain.value - target / raw) < 1e-12,
      'actual=' + env.context.gains[0].gain.value + ' expected=' + target / raw);
    assert.ok(env.context.gains[0].gain.value * raw <= target + 1e-12);
  } finally { audio.dispose(); env.restore(); }
});

test('toggleMuted and isMuted retain the HUD-facing boolean behavior', () => {
  const env = installFakeWindow(); const audio = createAudioController();
  try {
    audio.unlock(); const master = env.context.gains[0];
    assert.equal(audio.isMuted(), false); assert.equal(audio.toggleMuted(), true);
    assert.equal(audio.isMuted(), true); assert.equal(master.gain.value, 0);
    assert.equal(audio.toggleMuted(), false); assert.equal(audio.isMuted(), false);
    assert.equal(master.gain.value, AUDIO_GAIN.outputBase);
  } finally { audio.dispose(); env.restore(); }
});

test('no AudioContext or window remains a silent no-throw environment', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window'); delete globalThis.window;
  const audio = createAudioController();
  try {
    assert.doesNotThrow(() => {
      audio.unlock(); audio.playAttack(); audio.playGold(); audio.playPurchase();
      audio.playTower(); audio.playVictory(); audio.playDefeat(); audio.setMuted(true);
      assert.equal(audio.isMuted(), true); assert.equal(audio.toggleMuted(), false); audio.dispose();
    });
  } finally { if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window; }
});
