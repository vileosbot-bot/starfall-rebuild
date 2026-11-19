export interface AudioController {
  unlock(): void;
  toggleMuted(): boolean;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  playAttack(): void;
  playGold(): void;
  playPurchase(): void;
  playTower(): void;
  playVictory(): void;
  playDefeat(): void;
  dispose(): void;
}

// Master output is deliberately capped at 0.12, below the requested 0.2 ceiling.
const MASTER_VOLUME = 0.12;

export function createAudioController(): AudioController {
  let context: AudioContext | null = null;
  let muted = false;

  function unlock(): void {
    if (typeof window === 'undefined' || !('AudioContext' in window)) return;
    try {
      context ??= new window.AudioContext();
      if (context.state === 'suspended') void context.resume();
    } catch {
      context = null;
    }
  }

  function tone(
    frequency: number,
    duration: number,
    waveform: OscillatorType = 'sine',
    offset = 0,
    level = 0.65,
  ): void {
    if (!context || muted) return;
    const startAt = context.currentTime + offset;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(MASTER_VOLUME * level, startAt + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.015);
  }

  function noise(duration: number, level = 0.3): void {
    if (!context || muted) return;
    const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * (1 - index / frameCount);
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, context.currentTime);
    gain.gain.setValueAtTime(MASTER_VOLUME * level, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start();
    source.stop(context.currentTime + duration + 0.01);
  }

  return {
    unlock,
    toggleMuted() {
      muted = !muted;
      return muted;
    },
    setMuted(value) {
      muted = value;
    },
    isMuted() {
      return muted;
    },
    playAttack() {
      tone(520, 0.055, 'square', 0, 0.55);
    },
    playGold() {
      tone(880, 0.08, 'sine', 0, 0.5);
      tone(1175, 0.1, 'sine', 0.085, 0.45);
    },
    playPurchase() {
      tone(440, 0.09, 'triangle', 0, 0.55);
      tone(554, 0.09, 'triangle', 0.09, 0.55);
      tone(659, 0.14, 'triangle', 0.18, 0.6);
    },
    playTower() {
      tone(92, 0.22, 'triangle', 0, 0.75);
      noise(0.16, 0.28);
    },
    playVictory() {
      tone(523, 0.16, 'sine', 0, 0.6);
      tone(659, 0.18, 'sine', 0.15, 0.6);
      tone(784, 0.3, 'sine', 0.32, 0.65);
    },
    playDefeat() {
      tone(330, 0.18, 'triangle', 0, 0.6);
      tone(247, 0.24, 'triangle', 0.18, 0.55);
    },
    dispose() {
      if (context) void context.close();
      context = null;
    },
  };
}
