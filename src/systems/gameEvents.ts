import type { HitInfo } from '../combat/types';

/** Cross-system events. Feedback (shake, sparks, hit-stop) listens here instead of reaching into combat code. */
export interface GameEvents {
  'combat:hit': { x: number; y: number; hit: HitInfo; targetId: number; byPlayer: boolean };
  'player:hurt': { hp: number; max: number };
  'player:died': Record<string, never>;
  'enemy:died': { id: number; x: number; y: number };
  /** The player parried an attack; `x,y` is where the blades met. */
  'combat:parry': { x: number; y: number };
  /** A finisher's strike landed: `x,y` is the target, `fromX,fromY` where it came from (the gun, the fangs). */
  'combat:finisher': { finisher: string; x: number; y: number; fromX: number; fromY: number; direction: 1 | -1; hitstopMs: number; shakeMs: number; shakeIntensity: number };
}
