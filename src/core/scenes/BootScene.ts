import Phaser from 'phaser';
import { SCENES } from '../constants';

/** Loads shared assets (none yet: Milestone 1 uses only shapes) and hands over to the menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    this.scene.start(SCENES.menu);
  }
}
