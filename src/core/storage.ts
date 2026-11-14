import { GameState } from './types';

export const DEFAULT_STORAGE_KEY = 'outpost_mars_saved_state_v1';

// In-memory fallback if localStorage is unavailable (e.g., private browsing restrictions or tests)
const memoryStorage: Record<string, string> = {};

function getStorage(): Storage | { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Test actual availability
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch {
    // Fall back to memory
  }

  return {
    getItem: (key: string) => (key in memoryStorage ? memoryStorage[key] : null),
    setItem: (key: string, value: string) => {
      memoryStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete memoryStorage[key];
    },
  };
}

/**
 * Saves the current game state to persistent storage.
 */
export function saveGameState(state: GameState, key = DEFAULT_STORAGE_KEY): boolean {
  try {
    const storage = getStorage();
    const updatedState: GameState = {
      ...state,
      lastSavedAt: Date.now(),
    };
    storage.setItem(key, JSON.stringify(updatedState));
    return true;
  } catch (err) {
    console.warn('Failed to save game state to storage:', err);
    return false;
  }
}

/**
 * Loads the game state from persistent storage.
 */
export function loadGameState(key = DEFAULT_STORAGE_KEY): GameState | null {
  try {
    const storage = getStorage();
    const data = storage.getItem(key);
    if (!data) return null;

    const parsed = JSON.parse(data) as GameState;
    // Basic schema sanity check
    if (parsed && typeof parsed.sol === 'number' && parsed.resources && parsed.crewSafety) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.warn('Failed to load game state from storage:', err);
    return null;
  }
}

/**
 * Clears saved game state from storage.
 */
export function clearGameState(key = DEFAULT_STORAGE_KEY): boolean {
  try {
    const storage = getStorage();
    storage.removeItem(key);
    return true;
  } catch (err) {
    console.warn('Failed to clear game state from storage:', err);
    return false;
  }
}

/**
 * Checks whether persistent browser storage is functional.
 */
export function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const testKey = '__storage_test_check__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}
