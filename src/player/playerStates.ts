import type { State } from './StateMachine';

export type PlayerStateKey = 'idle' | 'run' | 'jump' | 'fall';

/** What the player states can see and do. Implemented by Player (Phaser) and by fakes in tests. */
export interface PlayerContext {
  readonly onGround: boolean;
  readonly velocityY: number;
  readonly moveX: number;
  readonly jumpPressed: boolean;
  /** Applies horizontal movement from moveX (and facing). */
  move(): void;
  /** Starts a jump. */
  jump(): void;
}

/** Shared ground logic: leaving the ground means falling; otherwise jump has priority, then run/idle. */
function groundNext(ctx: PlayerContext): PlayerStateKey {
  if (!ctx.onGround) return 'fall';
  if (ctx.jumpPressed) return 'jump';
  return ctx.moveX !== 0 ? 'run' : 'idle';
}

/** Placeholder states for Milestone 1. Coyote time, jump buffering and dodge arrive in Milestone 2. */
export const playerStates: Record<PlayerStateKey, State<PlayerStateKey, PlayerContext>> = {
  idle: {
    update(ctx) {
      ctx.move();
      return groundNext(ctx);
    },
  },
  run: {
    update(ctx) {
      ctx.move();
      return groundNext(ctx);
    },
  },
  jump: {
    enter(ctx) {
      ctx.jump();
    },
    update(ctx) {
      ctx.move();
      return ctx.velocityY >= 0 ? 'fall' : undefined;
    },
  },
  fall: {
    update(ctx) {
      ctx.move();
      if (ctx.onGround) return ctx.moveX !== 0 ? 'run' : 'idle';
      return undefined;
    },
  },
};
