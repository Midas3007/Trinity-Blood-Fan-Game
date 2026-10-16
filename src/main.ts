import Phaser from 'phaser';
import { audio } from './systems/audio/AudioManager';
import { registerSW } from 'virtual:pwa-register';
import { createGameConfig } from './core/gameConfig';
import { preventBrowserGestures } from './systems/browserGuards';

preventBrowserGestures();
audio.install();
/** How often an open game checks for a new deploy (ms). */
const UPDATE_CHECK_MS = 60_000;

// autoUpdate reloads the page once a new service worker activates, but browsers only look for one on
// navigation. An installed app left open in the background never navigates, so check on return and periodically.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    const check = (): void => {
      if (navigator.onLine) void reg.update().catch(() => undefined);
    };
    setInterval(check, UPDATE_CHECK_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  },
});

new Phaser.Game(createGameConfig('game'));
