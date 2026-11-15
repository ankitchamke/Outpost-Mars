import Phaser from 'phaser';
import { MarsScene } from './scenes/MarsScene';

/**
 * Generates the Phaser GameConfig optimized for OUTPOST: MARS.
 * Configured for responsive desktop & mobile scaling with crisp pixel-art rendering.
 *
 * @param parent Container element or element ID to mount the game canvas.
 */
export function getGameConfig(parent: HTMLElement | string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%',
      min: {
        width: 320,
        height: 240,
      },
    },
    render: {
      pixelArt: true,
      antialias: false,
      antialiasGL: false,
      roundPixels: true,
      powerPreference: 'high-performance',
    },
    backgroundColor: '#150d1a',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [MarsScene],
  };
}
