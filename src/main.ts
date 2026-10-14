import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { createGameConfig } from './core/gameConfig';
import { preventBrowserGestures } from './systems/browserGuards';

preventBrowserGestures();
registerSW({ immediate: true });

new Phaser.Game(createGameConfig('game'));
