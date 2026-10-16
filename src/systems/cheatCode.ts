/**
 * The owner's cheat switch: ↑ ↓ ← → ATK DODGE toggles it (the same moves again turn it off).
 * While on: no damage, holy water never runs out, the blood meter stays full. Session only (not saved). Pure.
 */
export type CheatToken = 'up' | 'down' | 'left' | 'right' | 'attack' | 'dodge';

export const CHEAT_SEQUENCE: readonly CheatToken[] = ['up', 'down', 'left', 'right', 'attack', 'dodge'];
/** The next move must come within this long of the last one (ms). */
export const CHEAT_GAP_MS = 2000;
/** Stick past this counts as a direction. */
const STICK = 0.6;

/** The switch itself; lives for the session, across rooms (each room restarts the scene). */
export const cheat = { on: false };

export type StickDir = 'up' | 'down' | 'left' | 'right' | null;

export function stickDir(moveX: number, moveY: number): StickDir {
  if (Math.abs(moveY) >= STICK && Math.abs(moveY) >= Math.abs(moveX)) return moveY < 0 ? 'up' : 'down';
  if (Math.abs(moveX) >= STICK) return moveX < 0 ? 'left' : 'right';
  return null;
}

export class CheatCode {
  private step = 0;
  private lastMs = -Infinity;
  private dir: StickDir = null;

  /** One frame of input; returns true on the frame the sequence completes. */
  frame(nowMs: number, moveX: number, moveY: number, attack: boolean, dodge: boolean): boolean {
    const d = stickDir(moveX, moveY);
    const tokens: CheatToken[] = [];
    if (d !== null && d !== this.dir) tokens.push(d);
    this.dir = d;
    if (attack) tokens.push('attack');
    if (dodge) tokens.push('dodge');
    let done = false;
    for (const t of tokens) done = this.feed(t, nowMs) || done;
    return done;
  }

  feed(token: CheatToken, nowMs: number): boolean {
    if (nowMs - this.lastMs > CHEAT_GAP_MS) this.step = 0;
    this.lastMs = nowMs;
    if (token === CHEAT_SEQUENCE[this.step]) this.step++;
    else this.step = token === CHEAT_SEQUENCE[0] ? 1 : 0;
    if (this.step < CHEAT_SEQUENCE.length) return false;
    this.step = 0;
    return true;
  }
}
