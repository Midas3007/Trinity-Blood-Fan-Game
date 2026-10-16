import Phaser from 'phaser';
import { audio } from './systems/audio/AudioManager';
import { testHookEnabled } from './systems/testHook';
import { registerSW } from 'virtual:pwa-register';
import { createGameConfig } from './core/gameConfig';
import { preventBrowserGestures } from './systems/browserGuards';

preventBrowserGestures();
audio.install();
// Test mode only: record the game's own audio (MediaRecorder on the WebAudio output) for the recorded playthrough.
if (testHookEnabled()) {
  let rec: MediaRecorder | null = null;
  const chunks: Blob[] = [];
  (window as unknown as { __tbAudio: unknown }).__tbAudio = {
    start: (): number => {
      const stream = audio.capture();
      if (!stream) return 0;
      rec = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.start(1000);
      return Date.now();
    },
    stop: (): Promise<string> =>
      new Promise((resolve) => {
        if (!rec) return resolve('');
        rec.onstop = () => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
          r.readAsDataURL(new Blob(chunks, { type: 'audio/webm' }));
        };
        rec.stop();
      }),
  };
}
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
