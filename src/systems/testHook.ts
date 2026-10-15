/**
 * Read-only snapshot of game state for automated playtests, exposed as `window.__tb`
 * only when the page URL contains `?test`. Normal play never installs it.
 */
export interface TestSnapshot {
  time: number;
  fps: number;
  player: { state: string; x: number; y: number; vx: number; vy: number; hp: number; invulnerable: boolean; facing: number; height: number; view: string };
  enemies: { type: string; state: string; x: number; y: number; hp: number }[];
  dummies: { x: number; hp: number; alive: boolean }[];
}

declare global {
  interface Window {
    __tb?: { snapshot: () => TestSnapshot };
  }
}

export function testHookEnabled(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('test');
}

export function installTestHook(snapshot: () => TestSnapshot): () => void {
  window.__tb = { snapshot };
  return () => {
    delete window.__tb;
  };
}
