import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager, SoundEffectType } from '../src/audio/audio-manager';

class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, val: string): void {
    this.store[key] = String(val);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe('AudioManager Procedural Web Audio Engine', () => {
  const STORAGE_KEY = 'outpost_mars_audio_settings';
  let mockStorage: MockLocalStorage;
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: mockStorage,
      setTimeout,
      clearTimeout,
    };
  });

  afterEach(() => {
    mockStorage.clear();
    (globalThis as unknown as { window: unknown }).window = originalWindow;
    vi.restoreAllMocks();
  });

  it('initializes with default balanced audio settings', () => {
    const manager = new AudioManager();
    const settings = manager.getSettings();

    expect(settings.masterVolume).toBe(0.7);
    expect(settings.musicEnabled).toBe(true);
    expect(settings.sfxEnabled).toBe(true);
    expect(settings.musicVolume).toBe(0.35);
    expect(settings.sfxVolume).toBe(0.6);
    expect(manager.isMuted()).toBe(false);
    manager.destroy();
  });

  it('correctly sets master volume and clamps out-of-range values', () => {
    const manager = new AudioManager();

    manager.setMasterVolume(0.45);
    expect(manager.getSettings().masterVolume).toBe(0.45);

    // Clamps below 0
    manager.setMasterVolume(-0.5);
    expect(manager.getSettings().masterVolume).toBe(0);
    expect(manager.isMuted()).toBe(true);

    // Clamps above 1
    manager.setMasterVolume(1.5);
    expect(manager.getSettings().masterVolume).toBe(1.0);
    expect(manager.isMuted()).toBe(false);

    manager.destroy();
  });

  it('persists modified volume settings to localStorage', () => {
    const manager = new AudioManager();
    manager.setMasterVolume(0.85);

    const stored = JSON.parse(mockStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.masterVolume).toBe(0.85);

    manager.destroy();
  });

  it('toggles ambient music on and off', () => {
    const manager = new AudioManager();

    expect(manager.getSettings().musicEnabled).toBe(true);

    const disabled = manager.toggleMusic();
    expect(disabled).toBe(false);
    expect(manager.getSettings().musicEnabled).toBe(false);

    const reenabled = manager.toggleMusic();
    expect(reenabled).toBe(true);
    expect(manager.getSettings().musicEnabled).toBe(true);

    manager.destroy();
  });

  it('toggles sound effects on and off', () => {
    const manager = new AudioManager();

    expect(manager.getSettings().sfxEnabled).toBe(true);

    const disabled = manager.toggleSfx();
    expect(disabled).toBe(false);
    expect(manager.getSettings().sfxEnabled).toBe(false);

    const reenabled = manager.toggleSfx();
    expect(reenabled).toBe(true);
    expect(manager.getSettings().sfxEnabled).toBe(true);

    manager.destroy();
  });

  it('toggles mute all and restores nominal sound levels upon unmute', () => {
    const manager = new AudioManager();

    expect(manager.isMuted()).toBe(false);

    // Mute All
    const isNowUnmuted = manager.toggleMuteAll();
    expect(isNowUnmuted).toBe(false);
    expect(manager.isMuted()).toBe(true);
    expect(manager.getSettings().masterVolume).toBe(0);

    // Unmute All
    const unmutedAgain = manager.toggleMuteAll();
    expect(unmutedAgain).toBe(true);
    expect(manager.isMuted()).toBe(false);
    expect(manager.getSettings().masterVolume).toBe(0.7);
    expect(manager.getSettings().musicEnabled).toBe(true);
    expect(manager.getSettings().sfxEnabled).toBe(true);

    manager.destroy();
  });

  it('preserves muted settings across re-instantiation / refresh simulation', () => {
    const initialManager = new AudioManager();
    initialManager.setMasterVolume(0);
    expect(initialManager.isMuted()).toBe(true);
    initialManager.destroy();

    // Simulate page reload by creating a new manager instance reading from the same mockStorage
    const freshManager = new AudioManager();
    expect(freshManager.getSettings().masterVolume).toBe(0);
    expect(freshManager.isMuted()).toBe(true);
    freshManager.destroy();
  });

  it('preserves individual music and sfx disabled toggles across refresh simulation', () => {
    const initialManager = new AudioManager();
    initialManager.toggleMusic(); // false
    initialManager.toggleSfx(); // false
    initialManager.destroy();

    const freshManager = new AudioManager();
    expect(freshManager.getSettings().musicEnabled).toBe(false);
    expect(freshManager.getSettings().sfxEnabled).toBe(false);
    expect(freshManager.isMuted()).toBe(true);
    freshManager.destroy();
  });

  it('operates safely without throwing in headless test environments', () => {
    const manager = new AudioManager();
    const effects: SoundEffectType[] = [
      'help',
      'scienceLog',
      'save',
      'resetWarning',
      'buildingInspect',
      'taskComplete',
      'missionComplete',
      'tutorialNav',
    ];

    expect(() => {
      effects.forEach((sfx) => manager.playSfx(sfx));
    }).not.toThrow();

    expect(() => manager.destroy()).not.toThrow();
  });

  it('unlocks audio context when available and handles rejection gracefully', async () => {
    const manager = new AudioManager();

    // In environments without AudioContext, unlock returns false safely without throwing
    const result = await manager.unlock();
    expect(typeof result).toBe('boolean');

    manager.destroy();
  });
});
