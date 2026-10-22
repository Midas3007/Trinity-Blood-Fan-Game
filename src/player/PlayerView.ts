import type Phaser from 'phaser';
import mapping from '../data/playerAnimations.json';
import { SpriteView, type StateVisual } from '../systems/sprites/SpriteView';
import type { PlayerStateKey } from './playerStates';
import type { AbelForm } from '../combat/finisherData';

export type { StateVisual };

/** Visual keys: every player state plus a few looks within a state (walk, pray, climbStill). */
export type VisualKey = PlayerStateKey | 'walk' | 'pray' | 'climbStill';
const states = mapping.states as Record<string, StateVisual | null>;
const crusnikStates = mapping.crusnikStates as Record<string, StateVisual | null>;
const wingedStates = mapping.wingedStates as Record<string, StateVisual | null>;
const swordStates = mapping.swordStates as Record<string, StateVisual | null>;
const ascendedStates = mapping.ascendedStates as Record<string, StateVisual | null>;
const PLAYER_DEPTH = 10;

/** The visual for a state, or null for "show the placeholder". `{attack}` resolves to the running attack id.
 * Pure; exported for tests. */
export function visualFor(state: VisualKey, attackId: string | null = null, form: AbelForm = 'priest', winged = false, weapon = 'fists', ascended = false): StateVisual | null {
  const armed = form === 'priest' && weapon === 'sword' ? swordStates[state] : undefined;
  const v = (ascended && form === 'crusnik' ? ascendedStates[state] : undefined) ?? (winged ? wingedStates[state] : undefined) ?? armed ?? (form === 'crusnik' ? crusnikStates : states)[state] ?? null;
  if (!v || !v.anim.includes('{attack}')) return v;
  return attackId ? { ...v, anim: v.anim.replace('{attack}', attackId) } : null;
}

/** The player's sprite; falls back to the placeholder rectangle (and its facing mark) when a state has no art. */
export class PlayerView {
  private readonly view: SpriteView;

  constructor(
    scene: Phaser.Scene,
    private readonly placeholder: Phaser.GameObjects.Rectangle,
    private readonly facingMark: Phaser.GameObjects.Rectangle,
  ) {
    this.view = new SpriteView(scene, visualFor('idle')?.anim ?? null, PLAYER_DEPTH);
  }

  get hasArt(): boolean {
    return this.view.sprite !== null;
  }

  get label(): string {
    return this.view.label;
  }

  update(state: VisualKey, attackId: string | null, feetX: number, feetY: number, facing: 1 | -1, alpha: number, form: AbelForm = 'priest', winged = false, weapon = 'fists', ascended = false): void {
    const shown = this.view.show(visualFor(state, attackId, form, winged, weapon, ascended), feetX, feetY, facing, alpha);
    this.placeholder.setVisible(!shown);
    this.facingMark.setVisible(!shown);
  }
}
