/**
 * OUTPOST: MARS — Procedural Web Audio Engine
 * Lightweight, 100% royalty-free, zero-network, zero-dependency atmospheric
 * audio system providing ambient Martian exploration soundscapes and UI telemetry.
 */

export type SoundEffectType =
  | 'help'
  | 'scienceLog'
  | 'save'
  | 'resetWarning'
  | 'buildingInspect'
  | 'taskComplete'
  | 'missionComplete'
  | 'tutorialNav';

export interface AudioSettings {
  masterVolume: number; // 0.0 to 1.0 (default 0.7)
  musicEnabled: boolean; // default true
  sfxEnabled: boolean; // default true
  musicVolume: number; // 0.0 to 1.0 (default 0.35)
  sfxVolume: number; // 0.0 to 1.0 (default 0.6)
}

const STORAGE_KEY = 'outpost_mars_audio_settings';

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.7,
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.35,
  sfxVolume: 0.6,
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Background ambient drone nodes
  private isMusicPlaying = false;
  private ambientOscillators: OscillatorNode[] = [];
  private windSource: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private pingIntervalId: number | null = null;

  private settings: AudioSettings;
  private isUnlocked = false;

  constructor() {
    this.settings = this.loadSettings();
  }

  public getSettings(): Readonly<AudioSettings> {
    return { ...this.settings };
  }

  public isMuted(): boolean {
    return this.settings.masterVolume === 0 || (!this.settings.musicEnabled && !this.settings.sfxEnabled);
  }

  /**
   * Initializes AudioContext upon user gesture.
   */
  public async unlock(): Promise<boolean> {
    if (this.isUnlocked && this.ctx && this.ctx.state === 'running') {
      return true;
    }

    try {
      if (!this.ctx) {
        const AudioContextClass =
          typeof window !== 'undefined'
            ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
            : null;

        if (!AudioContextClass) return false;
        this.ctx = new AudioContextClass();
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.setupAudioGraph();
      this.isUnlocked = true;

      // Start music if enabled
      if (this.settings.musicEnabled && !this.isMusicPlaying) {
        this.startBackgroundMusic();
      }

      return true;
    } catch {
      return false;
    }
  }

  private setupAudioGraph(): void {
    if (!this.ctx || this.masterGain) return;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.settings.masterVolume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    const targetMusicGain = this.settings.musicEnabled ? this.settings.musicVolume : 0;
    this.musicGain.gain.setValueAtTime(targetMusicGain, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    const targetSfxGain = this.settings.sfxEnabled ? this.settings.sfxVolume : 0;
    this.sfxGain.gain.setValueAtTime(targetSfxGain, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);
  }

  /**
   * Procedural Atmospheric Martian Ambient Soundscape
   * Continuous subtle drone with Martian wind texture and occasional faint harmonic pings.
   */
  private startBackgroundMusic(): void {
    if (!this.ctx || !this.musicGain || this.isMusicPlaying) return;
    this.isMusicPlaying = true;

    const now = this.ctx.currentTime;
    this.ambientOscillators = [];

    // 1. Warm Martian Atmospheric Drone (D-minor pentatonic root & 5th)
    // D2 = 73.42 Hz, A2 = 110.00 Hz, F3 = 174.61 Hz
    const droneFreqs = [73.42, 110.0, 174.61];
    const droneGains: GainNode[] = [];

    const droneMasterGain = this.ctx.createGain();
    droneMasterGain.gain.setValueAtTime(0.001, now);
    droneMasterGain.gain.exponentialRampToValueAtTime(0.4, now + 2.5); // Smooth 2.5s fade-in

    // Lowpass filter softens harmonics to create a deep cinematic space bed
    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(260, now);
    droneFilter.Q.setValueAtTime(1.8, now);

    droneMasterGain.connect(droneFilter);
    droneFilter.connect(this.musicGain);

    // Subtle LFO modulates filter cutoff to simulate breathing atmosphere
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.07, now); // ~14 second breathing cycle
    lfoGain.gain.setValueAtTime(60, now); // Swing +/- 60 Hz
    lfo.connect(lfoGain);
    lfoGain.connect(droneFilter.frequency);
    lfo.start(now);
    this.ambientOscillators.push(lfo);

    droneFreqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx === 0 ? 'sine' : 'triangle';
      // Subtle organic detuning
      const detune = (idx - 1) * 3.5;
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime(detune, now);

      gain.gain.setValueAtTime(idx === 0 ? 0.6 : 0.3, now);
      osc.connect(gain);
      gain.connect(droneMasterGain);

      osc.start(now);
      this.ambientOscillators.push(osc);
      droneGains.push(gain);
    });

    // 2. Procedural Martian Surface Wind (Pink-filtered noise buffer)
    this.startWindAtmosphere();

    // 3. Generative Telemetry Pings (sparse, faint cosmic bells every 9-13s)
    this.startCosmicTelemetryPings();
  }

  private startWindAtmosphere(): void {
    if (!this.ctx || !this.musicGain) return;

    // Generate 4 seconds of looping pink-like filtered noise
    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2) * 0.12;
    }

    const windSource = this.ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(380, this.ctx.currentTime);
    windFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    windGain.gain.exponentialRampToValueAtTime(0.18, this.ctx.currentTime + 3.0);

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.musicGain);

    windSource.start();
    this.windSource = windSource;
    this.windGain = windGain;
  }

  private startCosmicTelemetryPings(): void {
    if (this.pingIntervalId !== null) return;

    const pingNotes = [587.33, 880.0, 659.25, 1174.66]; // D5, A5, E5, D6
    const scheduleNextPing = () => {
      const delayMs = 9000 + Math.random() * 5000;
      this.pingIntervalId = window.setTimeout(() => {
        if (this.isMusicPlaying && this.settings.musicEnabled) {
          const note = pingNotes[Math.floor(Math.random() * pingNotes.length)];
          this.playCosmicPing(note);
        }
        scheduleNextPing();
      }, delayMs);
    };

    scheduleNextPing();
  }

  private playCosmicPing(freq: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + 2.3);
  }

  private stopBackgroundMusic(): void {
    if (!this.ctx || !this.isMusicPlaying) return;
    this.isMusicPlaying = false;

    if (this.pingIntervalId !== null) {
      window.clearTimeout(this.pingIntervalId);
      this.pingIntervalId = null;
    }

    const now = this.ctx.currentTime;

    for (const osc of this.ambientOscillators) {
      try {
        osc.stop(now + 0.3);
      } catch {
        // Ignored if already stopped
      }
    }
    this.ambientOscillators = [];

    if (this.windGain) {
      this.windGain.gain.setValueAtTime(0, now);
      this.windGain = null;
    }

    if (this.windSource) {
      try {
        this.windSource.stop(now + 0.3);
      } catch {
        // Ignored
      }
      this.windSource = null;
    }
  }

  /**
   * Procedural Sound Effects Generator (Zero audio files, instant response)
   */
  public playSfx(type: SoundEffectType): void {
    if (!this.settings.sfxEnabled || this.settings.masterVolume === 0) return;
    if (!this.ctx || !this.sfxGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;

    switch (type) {
      case 'help': {
        // Subtle friendly high-tech blip (640 Hz -> 960 Hz)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(640, now);
        osc.frequency.exponentialRampToValueAtTime(960, now + 0.06);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }

      case 'scienceLog': {
        // Scientific scanner dual-chirp (880 Hz followed by 1320 Hz)
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc1.connect(gain1);
        gain1.connect(this.sfxGain);
        osc1.start(now);
        osc1.stop(now + 0.055);

        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1320, now + 0.04);
        gain2.gain.setValueAtTime(0.001, now);
        gain2.gain.setValueAtTime(0.22, now + 0.04);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc2.connect(gain2);
        gain2.connect(this.sfxGain);
        osc2.start(now + 0.04);
        osc2.stop(now + 0.13);
        break;
      }

      case 'save': {
        // Ascending confirmation chime (523 Hz -> 659 Hz -> 784 Hz)
        const freqs = [523.25, 659.25, 783.99];
        freqs.forEach((f, idx) => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const t = now + idx * 0.05;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.setValueAtTime(0.16, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(t);
          osc.stop(t + 0.19);
        });
        break;
      }

      case 'resetWarning': {
        // Distinct solemn descending alert tone (360 Hz -> 180 Hz with resonance)
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.2);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);

        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.23);
        break;
      }

      case 'buildingInspect': {
        // Airlock / Structure inspection resonance (low hum + metallic chime)
        const lowOsc = this.ctx.createOscillator();
        const lowGain = this.ctx.createGain();
        lowOsc.type = 'sine';
        lowOsc.frequency.setValueAtTime(140, now);
        lowOsc.frequency.exponentialRampToValueAtTime(95, now + 0.15);
        lowGain.gain.setValueAtTime(0.28, now);
        lowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        lowOsc.connect(lowGain);
        lowGain.connect(this.sfxGain);
        lowOsc.start(now);
        lowOsc.stop(now + 0.19);

        const bellOsc = this.ctx.createOscillator();
        const bellGain = this.ctx.createGain();
        bellOsc.type = 'triangle';
        bellOsc.frequency.setValueAtTime(880, now + 0.04);
        bellGain.gain.setValueAtTime(0.001, now);
        bellGain.gain.setValueAtTime(0.18, now + 0.04);
        bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        bellOsc.connect(bellGain);
        bellGain.connect(this.sfxGain);
        bellOsc.start(now + 0.04);
        bellOsc.stop(now + 0.23);
        break;
      }

      case 'taskComplete': {
        // Rewarding Sol task complete fanfare (C5 -> E5 -> G5 -> C6)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const t = now + i * 0.065;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(t);
          osc.stop(t + 0.29);
        });
        break;
      }

      case 'missionComplete': {
        // Grand 5-Sol Mission Successful Celebration Fanfare (Chords progression)
        const chords = [
          [523.25, 659.25, 783.99], // C major
          [587.33, 698.46, 880.0],  // D minor
          [783.99, 987.77, 1174.66], // G major
          [1046.5, 1318.51, 1567.98], // C6 major triumph
        ];

        chords.forEach((chord, step) => {
          chord.forEach((freq) => {
            if (!this.ctx || !this.sfxGain) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + step * 0.16;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.setValueAtTime(0.14, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + (step === 3 ? 0.75 : 0.28));

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + (step === 3 ? 0.78 : 0.3));
          });
        });
        break;
      }

      case 'tutorialNav': {
        // Crisp, ultra-subtle interface step tick
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.035);
        break;
      }
    }
  }

  // --- Settings Control API ---

  public setMasterVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.settings.masterVolume = clamped;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
    }
    this.saveSettings();
  }

  public toggleMusic(): boolean {
    this.settings.musicEnabled = !this.settings.musicEnabled;
    if (this.musicGain && this.ctx) {
      const target = this.settings.musicEnabled ? this.settings.musicVolume : 0;
      this.musicGain.gain.setValueAtTime(target, this.ctx.currentTime);
    }

    if (this.settings.musicEnabled && this.isUnlocked && !this.isMusicPlaying) {
      this.startBackgroundMusic();
    } else if (!this.settings.musicEnabled && this.isMusicPlaying) {
      this.stopBackgroundMusic();
    }

    this.saveSettings();
    return this.settings.musicEnabled;
  }

  public toggleSfx(): boolean {
    this.settings.sfxEnabled = !this.settings.sfxEnabled;
    if (this.sfxGain && this.ctx) {
      const target = this.settings.sfxEnabled ? this.settings.sfxVolume : 0;
      this.sfxGain.gain.setValueAtTime(target, this.ctx.currentTime);
    }
    this.saveSettings();
    return this.settings.sfxEnabled;
  }

  public toggleMuteAll(): boolean {
    const currentlyMuted = this.isMuted();
    if (currentlyMuted) {
      // Unmute
      this.settings.masterVolume = 0.7;
      this.settings.musicEnabled = true;
      this.settings.sfxEnabled = true;
    } else {
      // Mute all
      this.settings.masterVolume = 0;
    }

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.settings.masterVolume, this.ctx.currentTime);
    }

    if (this.settings.musicEnabled && this.settings.masterVolume > 0 && this.isUnlocked && !this.isMusicPlaying) {
      this.startBackgroundMusic();
    } else if (this.isMuted() && this.isMusicPlaying) {
      this.stopBackgroundMusic();
    }

    this.saveSettings();
    return !this.isMuted();
  }

  private loadSettings(): AudioSettings {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return { ...DEFAULT_SETTINGS };
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return {
        masterVolume: typeof parsed.masterVolume === 'number' ? parsed.masterVolume : DEFAULT_SETTINGS.masterVolume,
        musicEnabled: typeof parsed.musicEnabled === 'boolean' ? parsed.musicEnabled : DEFAULT_SETTINGS.musicEnabled,
        sfxEnabled: typeof parsed.sfxEnabled === 'boolean' ? parsed.sfxEnabled : DEFAULT_SETTINGS.sfxEnabled,
        musicVolume: typeof parsed.musicVolume === 'number' ? parsed.musicVolume : DEFAULT_SETTINGS.musicVolume,
        sfxVolume: typeof parsed.sfxVolume === 'number' ? parsed.sfxVolume : DEFAULT_SETTINGS.sfxVolume,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private saveSettings(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Safe fallback if storage quota exceeded or disabled
    }
  }

  public destroy(): void {
    this.stopBackgroundMusic();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.isUnlocked = false;
  }
}

// Global singleton instance
export const audioManager = new AudioManager();
