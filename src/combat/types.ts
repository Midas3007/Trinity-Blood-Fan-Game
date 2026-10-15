/** Axis-aligned rectangle; x/y are the top-left corner. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Hitbox relative to the attacker's centre; x is measured forward in the facing direction. */
export interface RelativeBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AttackDef {
  id: string;
  startupMs: number;
  activeMs: number;
  recoveryMs: number;
  damage: number;
  knockbackX: number;
  knockbackY: number;
  hitstopMs: number;
  shakeMs: number;
  shakeIntensity: number;
  /** Forward speed during startup and active frames (a small lunge); 0 = stand still. */
  stepSpeed: number;
  /** Whether the recovery can be cancelled into a dodge. */
  cancelIntoDodge: boolean;
  hitbox: RelativeBox;
  /** Next attack in the combo, if the attack button is pressed again in time. */
  next?: string;
}

export type AttackPhase = 'startup' | 'active' | 'recovery' | 'done';

/** What a target receives when hit. knockbackX is already signed (direction away from the attacker). */
export interface HitInfo {
  damage: number;
  knockbackX: number;
  knockbackY: number;
  hitstopMs: number;
  shakeMs: number;
  shakeIntensity: number;
}

/** Anything that can be hit by an attack. */
export interface Damageable {
  readonly id: number;
  readonly alive: boolean;
  readonly x: number;
  hurtbox(): Rect;
  /** Applies the hit; returns false if it was ignored (e.g. invulnerable). */
  receiveHit(hit: HitInfo): boolean;
}
