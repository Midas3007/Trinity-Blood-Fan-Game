import mapping from '../data/enemyAnimations.json';
import type { StateVisual } from '../systems/sprites/SpriteView';
import type { EnemyStateKey } from './enemyStates';

/** Visual keys: every enemy state, plus 'block' (a shield turning a blow aside). */
const table = mapping as unknown as Record<string, Partial<Record<EnemyStateKey | 'block', StateVisual>>>;

/** The visual for an enemy type in a state, or null for "show the placeholder". Pure; exported for tests. */
export function enemyVisualFor(type: string, state: EnemyStateKey | 'block'): StateVisual | null {
  return table[type]?.[state] ?? null;
}
