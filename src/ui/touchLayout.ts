import type { Action } from '../systems/input/actions';

export interface StickLayout {
  x: number;
  y: number;
  radius: number;
  knobRadius: number;
  deadZone: number;
  /** Stick pushed up beyond this (0-1) counts as holding JUMP. */
  upJumpThreshold: number;
}

export interface ButtonLayout {
  action: Action;
  label: string;
  x: number;
  y: number;
  radius: number;
}

export interface TouchLayout {
  stick: StickLayout;
  buttons: ButtonLayout[];
}

/** Fraction of the screen width, from the left, where a touch grabs the stick. */
export const STICK_ZONE_WIDTH = 0.42;
/** Fraction of the screen height, from the top, above which touches never grab the stick (keeps the debug corner free). */
export const STICK_ZONE_TOP = 0.35;
/** Buttons accept touches slightly outside their drawn circle. */
export const BUTTON_HIT_SLOP = 1.3;

/** Returns the button under (x, y) in internal pixels, or null. Nearest wins when hit areas overlap. */
export function buttonAt(
  buttons: readonly ButtonLayout[],
  x: number,
  y: number,
  screenW: number,
  screenH: number,
): ButtonLayout | null {
  let best: ButtonLayout | null = null;
  let bestDist = Infinity;
  for (const b of buttons) {
    const d = Math.hypot(x - b.x * screenW, y - b.y * screenH);
    if (d <= b.radius * BUTTON_HIT_SLOP && d < bestDist) {
      best = b;
      bestDist = d;
    }
  }
  return best;
}
