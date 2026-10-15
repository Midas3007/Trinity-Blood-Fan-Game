import mapping from '../data/enemyAnimations.json';
import type { StateVisual } from '../systems/sprites/SpriteView';
import type { EnemyStateKey } from './enemyStates';

const table = mapping as unknown as Record<string, Partial<Record<EnemyStateKey, StateVisual>>>;

/** The visual for an enemy type in a state, or null for "show the placeholder". Pure; exported for tests. */
export function enemyVisualFor(type: string, state: EnemyStateKey): StateVisual | null {
  return table[type]?.[state] ?? null;
}
