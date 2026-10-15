import { CutsceneScene } from './scenes/CutsceneScene';
import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, MAX_TOUCH_POINTERS } from './constants';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { PlayScene } from './scenes/PlayScene';
import physics from '../data/physics.json';

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: COLORS.background,
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      activePointers: MAX_TOUCH_POINTERS,
      gamepad: true,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: physics.gravityY },
        // Fixed step keeps physics independent of the display refresh rate.
        fixedStep: true,
        fps: physics.stepsPerSecond,
        debug: false,
      },
    },
    scene: [BootScene, MenuScene, PlayScene, CutsceneScene],
  };
}
