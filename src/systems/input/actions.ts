export const ACTIONS = ['attack', 'jump', 'dodge', 'ability', 'heal'] as const;
export type Action = (typeof ACTIONS)[number];

/** One input source's reading for a single frame. moveX/moveY are in [-1, 1]. */
export interface InputFrame {
  moveX: number;
  moveY: number;
  buttons: Record<Action, boolean>;
}

export function emptyFrame(): InputFrame {
  return { moveX: 0, moveY: 0, buttons: { attack: false, jump: false, dodge: false, ability: false, heal: false } };
}

/** Combines touch, keyboard and gamepad: strongest axis wins, buttons are OR-ed. */
export function mergeFrames(frames: readonly InputFrame[]): InputFrame {
  const out = emptyFrame();
  for (const f of frames) {
    if (Math.abs(f.moveX) > Math.abs(out.moveX)) out.moveX = f.moveX;
    if (Math.abs(f.moveY) > Math.abs(out.moveY)) out.moveY = f.moveY;
    for (const a of ACTIONS) out.buttons[a] = out.buttons[a] || f.buttons[a];
  }
  return out;
}
