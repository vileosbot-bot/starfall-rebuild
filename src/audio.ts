export interface AudioController {
  unlock(): void;
  toggleMuted(): boolean;
  setMuted(muted: boolean): void;
  setVolumes(masterVolume: number, sfxVolume: number): void;
  getVolumes(): { masterVolume: number; sfxVolume: number };
  isMuted(): boolean;
  playAttack(): void;
  playGold(): void;
  playPurchase(): void;
  playTower(): void;
  playVictory(): void;
  playDefeat(): void;
  dispose(): void;
}

export const AUDIO_GAIN = {
  voiceMaster: 0.12,
  outputBase: 1,
  peakLimit: 0.2,
  safetyFactor: 0.9,
  defaultMasterVolume: 0.8,
  defaultSfxVolume: 0.9,
} as const;

const MASTER_VOLUME = AUDIO_GAIN.voiceMaster;
const MASTER_OUTPUT_GAIN = AUDIO_GAIN.outputBase;
const PEAK_TARGET = AUDIO_GAIN.peakLimit * AUDIO_GAIN.safetyFactor;
const ENVELOPE_FLOOR = 0.0001;

type ToneSpec = Readonly<{
  frequency: number;
  duration: number;
  releaseTail: number;
  waveform: OscillatorType;
  offset: number;
  level: number;
}>;

type NoiseSpec = Readonly<{
  duration: number;
  releaseTail: number;
  offset: number;
  level: number;
  filterFrequency: number;
}>;

type SoundSpec = Readonly<{
  tones: readonly ToneSpec[];
  noises: readonly NoiseSpec[];
}>;

type AudioTrigger = 'attack' | 'gold' | 'purchase' | 'tower' | 'victory' | 'defeat';

// One source of truth drives both playback and the deterministic peak calculation.
export const AUDIO_SOUND_DESIGN = {
  attack: {
    tones: [{ frequency: 520, duration: 0.055, releaseTail: 0.015, waveform: 'square', offset: 0, level: 0.55 }],
    noises: [],
  },
  gold: {
    tones: [
      { frequency: 880, duration: 0.08, releaseTail: 0.015, waveform: 'sine', offset: 0, level: 0.5 },
      { frequency: 1175, duration: 0.1, releaseTail: 0.015, waveform: 'sine', offset: 0.085, level: 0.45 },
    ],
    noises: [],
  },
  purchase: {
    tones: [
      { frequency: 440, duration: 0.09, releaseTail: 0.015, waveform: 'triangle', offset: 0, level: 0.55 },
      { frequency: 554, duration: 0.09, releaseTail: 0.015, waveform: 'triangle', offset: 0.09, level: 0.55 },
      { frequency: 659, duration: 0.14, releaseTail: 0.015, waveform: 'triangle', offset: 0.18, level: 0.6 },
    ],
    noises: [],
  },
  tower: {
    tones: [{ frequency: 92, duration: 0.22, releaseTail: 0.015, waveform: 'triangle', offset: 0, level: 0.75 }],
    noises: [{ duration: 0.16, releaseTail: 0.01, offset: 0, level: 0.28, filterFrequency: 420 }],
  },
  victory: {
    tones: [
      { frequency: 523, duration: 0.16, releaseTail: 0.015, waveform: 'sine', offset: 0, level: 0.6 },
      { frequency: 659, duration: 0.18, releaseTail: 0.015, waveform: 'sine', offset: 0.15, level: 0.6 },
      { frequency: 784, duration: 0.3, releaseTail: 0.015, waveform: 'sine', offset: 0.32, level: 0.65 },
    ],
    noises: [],
  },
  defeat: {
    tones: [
      { frequency: 330, duration: 0.18, releaseTail: 0.015, waveform: 'triangle', offset: 0, level: 0.6 },
      { frequency: 247, duration: 0.24, releaseTail: 0.015, waveform: 'triangle', offset: 0.18, level: 0.55 },
    ],
    noises: [],
  },
} as const satisfies Record<AudioTrigger, SoundSpec>;

interface ScheduledVoice {
  startAt: number;
  endAt: number;
  peakLevel: number;
}

interface PeakEvent {
  time: number;
  delta: number;
}

function maximumOverlappingLevel(sound: SoundSpec): number {
  const events: PeakEvent[] = [];
  const envelopeFloorLevel = ENVELOPE_FLOOR / MASTER_VOLUME;
  for (const voice of [...sound.tones, ...sound.noises]) {
    const envelopeEnd = voice.offset + voice.duration;
    events.push({ time: voice.offset, delta: voice.level });
    events.push({ time: envelopeEnd, delta: envelopeFloorLevel - voice.level });
    events.push({ time: envelopeEnd + voice.releaseTail, delta: -envelopeFloorLevel });
  }
  events.sort((left, right) => left.time - right.time);

  let activeLevel = 0;
  let peakLevel = 0;
  for (let index = 0; index < events.length;) {
    const eventTime = events[index].time;
    let delta = 0;
    while (index < events.length && events[index].time === eventTime) {
      delta += events[index].delta;
      index += 1;
    }
    activeLevel = Math.max(0, activeLevel + delta);
    peakLevel = Math.max(peakLevel, activeLevel);
  }
  return peakLevel;
}

/**
 * Conservative peak bound for one concurrent invocation of each trigger group.
 * The runtime master-output limiter applies the same 0.18 target to every overlap,
 * including repeated invocations of a trigger.
 */
export function estimateWorstCasePeak(): number {
  const summedVoiceLevel = Object.values(AUDIO_SOUND_DESIGN)
    .reduce((sum, sound) => sum + maximumOverlappingLevel(sound), 0);
  const unboundedPeak = summedVoiceLevel * MASTER_VOLUME * MASTER_OUTPUT_GAIN;
  return Math.min(unboundedPeak, PEAK_TARGET);
}

export function createAudioController(): AudioController {
  let context: AudioContext | null = null;
  let masterOutput: GainNode | null = null;
  let muted = false;
  // The app injects its persisted 80/90 settings before unlock; unity remains the legacy fallback until that injection.
  let masterVolume: number = AUDIO_GAIN.defaultMasterVolume;
  let sfxVolume: number = AUDIO_GAIN.defaultSfxVolume;
  let volumeSettingsApplied = false;
  const outputVolumeMultiplier = (): number => volumeSettingsApplied ? masterVolume * sfxVolume : 1;
  const scheduledVoices: ScheduledVoice[] = [];

  function safeOutputGain(activePeakLevel: number): number {
    if (activePeakLevel <= 0) return MASTER_OUTPUT_GAIN;
    return Math.min(MASTER_OUTPUT_GAIN, PEAK_TARGET / activePeakLevel);
  }

  function refreshMasterOutput(): void {
    if (!context || !masterOutput) return;
    const now = context.currentTime;
    for (let index = scheduledVoices.length - 1; index >= 0; index -= 1) {
      if (scheduledVoices[index].endAt <= now) scheduledVoices.splice(index, 1);
    }

    let activePeakLevel = 0;
    const events: PeakEvent[] = [];
    for (const voice of scheduledVoices) {
      if (voice.startAt <= now) activePeakLevel += voice.peakLevel;
      else events.push({ time: voice.startAt, delta: voice.peakLevel });
      events.push({ time: voice.endAt, delta: -voice.peakLevel });
    }
    events.sort((left, right) => left.time - right.time);

    // setValueAtTime is intentional: the shared output gain must clamp at the exact
    // scheduled boundary, and muting must take effect at the current audio time.
    masterOutput.gain.cancelScheduledValues(now);
    masterOutput.gain.setValueAtTime(muted ? 0 : safeOutputGain(activePeakLevel) * outputVolumeMultiplier(), now);

    for (let index = 0; index < events.length;) {
      const eventTime = events[index].time;
      let delta = 0;
      while (index < events.length && events[index].time === eventTime) {
        delta += events[index].delta;
        index += 1;
      }
      activePeakLevel = Math.max(0, activePeakLevel + delta);
      if (eventTime > now) {
        masterOutput.gain.setValueAtTime(muted ? 0 : safeOutputGain(activePeakLevel) * outputVolumeMultiplier(), eventTime);
      }
    }
  }

  function registerVoice(startAt: number, duration: number, level: number, releaseTail: number): void {
    scheduledVoices.push({
      startAt,
      endAt: startAt + duration,
      peakLevel: MASTER_VOLUME * level,
    });
    scheduledVoices.push({
      startAt: startAt + duration,
      endAt: startAt + duration + releaseTail,
      peakLevel: ENVELOPE_FLOOR,
    });
    refreshMasterOutput();
  }

  function unlock(): void {
    if (typeof window === 'undefined' || !('AudioContext' in window)) return;
    try {
      context ??= new window.AudioContext();
      if (!masterOutput) {
        masterOutput = context.createGain();
        masterOutput.gain.setValueAtTime(muted ? 0 : MASTER_OUTPUT_GAIN * outputVolumeMultiplier(), context.currentTime);
        masterOutput.connect(context.destination);
      }
      if (context.state === 'suspended') void context.resume();
    } catch {
      context = null;
      masterOutput = null;
      scheduledVoices.length = 0;
    }
  }

  function tone(spec: ToneSpec): void {
    const audioContext = context;
    const output = masterOutput;
    if (!audioContext || !output || muted) return;
    const startAt = audioContext.currentTime + spec.offset;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = spec.waveform;
    oscillator.frequency.setValueAtTime(spec.frequency, startAt);
    gain.gain.setValueAtTime(ENVELOPE_FLOOR, startAt);
    gain.gain.linearRampToValueAtTime(MASTER_VOLUME * spec.level, startAt + 0.008);
    gain.gain.exponentialRampToValueAtTime(ENVELOPE_FLOOR, startAt + spec.duration);
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(startAt);
    oscillator.stop(startAt + spec.duration + spec.releaseTail);
    registerVoice(startAt, spec.duration, spec.level, spec.releaseTail);
  }

  function noise(spec: NoiseSpec): void {
    const audioContext = context;
    const output = masterOutput;
    if (!audioContext || !output || muted) return;
    const startAt = audioContext.currentTime + spec.offset;
    const frameCount = Math.max(1, Math.floor(audioContext.sampleRate * spec.duration));
    const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * (1 - index / frameCount);
    }
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(spec.filterFrequency, startAt);
    gain.gain.setValueAtTime(MASTER_VOLUME * spec.level, startAt);
    gain.gain.exponentialRampToValueAtTime(ENVELOPE_FLOOR, startAt + spec.duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    source.start(startAt);
    source.stop(startAt + spec.duration + spec.releaseTail);
    registerVoice(startAt, spec.duration, spec.level, spec.releaseTail);
  }

  function playSound(trigger: AudioTrigger): void {
    const sound = AUDIO_SOUND_DESIGN[trigger];
    for (const spec of sound.tones) tone(spec);
    for (const spec of sound.noises) noise(spec);
  }

  function setMuted(value: boolean): void {
    muted = value;
    refreshMasterOutput();
  }

  function setVolumes(master: number, sfx: number): void {
    masterVolume = Number.isFinite(master) ? Math.max(0, Math.min(1, master)) : AUDIO_GAIN.defaultMasterVolume;
    sfxVolume = Number.isFinite(sfx) ? Math.max(0, Math.min(1, sfx)) : AUDIO_GAIN.defaultSfxVolume;
    volumeSettingsApplied = true;
    refreshMasterOutput();
  }

  function getVolumes(): { masterVolume: number; sfxVolume: number } {
    return { masterVolume, sfxVolume };
  }

  return {
    unlock,
    toggleMuted() {
      setMuted(!muted);
      return muted;
    },
    setMuted,
    setVolumes,
    getVolumes,
    isMuted() {
      return muted;
    },
    playAttack() {
      playSound('attack');
    },
    playGold() {
      playSound('gold');
    },
    playPurchase() {
      playSound('purchase');
    },
    playTower() {
      playSound('tower');
    },
    playVictory() {
      playSound('victory');
    },
    playDefeat() {
      playSound('defeat');
    },
    dispose() {
      if (context) void context.close();
      context = null;
      masterOutput = null;
      scheduledVoices.length = 0;
    },
  };
}
