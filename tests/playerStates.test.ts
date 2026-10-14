import { describe, expect, it } from 'vitest';
import { StateMachine } from '../src/player/StateMachine';
import { playerStates, type PlayerContext, type PlayerStateKey } from '../src/player/playerStates';

class FakePlayer implements PlayerContext {
  onGround = true;
  velocityY = 0;
  moveX = 0;
  jumpPressed = false;
  jumps = 0;
  move(): void {}
  jump(): void {
    this.jumps += 1;
    this.velocityY = -300;
  }
}

function setup(initial: PlayerStateKey = 'idle') {
  const p = new FakePlayer();
  const fsm = new StateMachine(playerStates, initial, p as PlayerContext);
  return { p, fsm };
}

describe('player states (Milestone 1 placeholder)', () => {
  it('idle -> run when moving, run -> idle when stopping', () => {
    const { p, fsm } = setup();
    p.moveX = 1;
    fsm.update(16);
    expect(fsm.current).toBe('run');
    p.moveX = 0;
    fsm.update(16);
    expect(fsm.current).toBe('idle');
  });

  it('jump press on the ground starts exactly one jump', () => {
    const { p, fsm } = setup();
    p.jumpPressed = true;
    fsm.update(16);
    expect(fsm.current).toBe('jump');
    expect(p.jumps).toBe(1);
  });

  it('cannot jump while airborne', () => {
    const { p, fsm } = setup('fall');
    p.onGround = false;
    p.velocityY = 100;
    p.jumpPressed = true;
    fsm.update(16);
    expect(fsm.current).toBe('fall');
    expect(p.jumps).toBe(0);
  });

  it('jump -> fall at the apex, fall -> idle on landing', () => {
    const { p, fsm } = setup();
    p.jumpPressed = true;
    fsm.update(16);
    p.jumpPressed = false;
    p.onGround = false;
    p.velocityY = 0;
    fsm.update(16);
    expect(fsm.current).toBe('fall');
    p.onGround = true;
    fsm.update(16);
    expect(fsm.current).toBe('idle');
  });

  it('walking off a ledge goes to fall', () => {
    const { p, fsm } = setup('run');
    p.moveX = 1;
    p.onGround = false;
    fsm.update(16);
    expect(fsm.current).toBe('fall');
  });
});
