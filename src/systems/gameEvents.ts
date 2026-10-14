import type { HitInfo } from '../combat/types';

/** Cross-system events. Feedback (shake, sparks, hit-stop) listens here instead of reaching into combat code. */
export interface GameEvents {
  'combat:hit': { x: number; y: number; hit: HitInfo; targetId: number; byPlayer: boolean };
  'player:hurt': { hp: number; max: number };
  'player:died': Record<string, never>;
  'enemy:died': { id: number; x: number; y: number };
}
