import Phaser from 'phaser';
import { audio } from './systems/audio/AudioManager';
import { testHookEnabled } from './systems/testHook';
import { registerSW } from 'virtual:pwa-register';
import { createGameConfig } from './core/gameConfig';
import { preventBrowserGestures } from './systems/browserGuards';

preventBrowserGestures();
audio.install();
// Test mode only: record the game canvas and its own audio for the recorded playthrough (two MediaRecorders started
// together: one recorder with both tracks writes nothing in headless Chromium). Chunks go, in order, to
// window.__tbSave(kind, base64), which the recording bot provides.
if (testHookEnabled()) {
  const w = window as unknown as { __tbRec: unknown; __tbSave?: (kind: string, b64: string) => Promise<void> };
  let recs: MediaRecorder[] = [];
  let chain = Promise.resolve();
  const send = (kind: string, blob: Blob): void => {
    chain = chain.then(
      () =>
        new Promise<void>((done) => {
          const r = new FileReader();
          r.onload = () => void (w.__tbSave?.(kind, String(r.result).split(',')[1] ?? '') ?? Promise.resolve()).then(() => done());
          r.readAsDataURL(blob);
        }),
    );
  };
  const record = (kind: string, stream: MediaStream, mimeType: string, bits: number): MediaRecorder => {
    const rec = new MediaRecorder(stream, { mimeType, bitsPerSecond: bits });
    rec.ondataavailable = (e) => {
      if (e.data.size) send(kind, e.data);
    };
    return rec;
  };
  w.__tbRec = {
    /** Starts the video and/or the audio recorder; returns the start time (ms) so the two can be lined up. */
    start: (kinds: string[] = ['video', 'audio']): number => {
      const canvas = document.querySelector('canvas');
      if (kinds.includes('video') && canvas) recs.push(record('video', canvas.captureStream(30), 'video/webm;codecs=vp8', 1_500_000));
      const sound = kinds.includes('audio') ? audio.capture() : null;
      if (sound) recs.push(record('audio', sound, 'audio/webm;codecs=opus', 128_000));
      for (const r of recs) if (r.state === 'inactive') r.start(1000);
      return Date.now();
    },
    stop: (): Promise<void> =>
      Promise.all(recs.map((r) => new Promise<void>((resolve) => {
        r.onstop = () => resolve();
        r.stop();
      }))).then(() => new Promise<void>((resolve) => setTimeout(() => void chain.then(() => resolve()), 300))),
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

const game = new Phaser.Game(createGameConfig('game'));
// Test mode only: which scenes are running (the recording bot waits for the title after the credits).
if (testHookEnabled()) (window as unknown as { __tbScenes: () => string[] }).__tbScenes = () => game.scene.getScenes(true).map((sc) => sc.scene.key);
