import Phaser from 'phaser';
import { getGameConfig } from './config';

/**
 * Initializes and mounts the OUTPOST: MARS Phaser 3 game instance.
 *
 * @param parent DOM element or string ID of the host container.
 * @returns Instantiated Phaser.Game.
 */
export function createOutpostGame(parent: HTMLElement | string): Phaser.Game {
  const config = getGameConfig(parent);
  return new Phaser.Game(config);
}

export { getGameConfig } from './config';
export { MarsScene } from './scenes/MarsScene';
