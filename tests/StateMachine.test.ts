import { describe, expect, it } from 'vitest';
import { StateMachine, type State } from '../src/player/StateMachine';

type K = 'a' | 'b';
interface Ctx {
  log: string[];
  goB: boolean;
}

const states: Record<K, State<K, Ctx>> = {
  a: {
    enter: (c) => c.log.push('enter a'),
    update: (c) => (c.goB ? 'b' : undefined),
    exit: (c) => c.log.push('exit a'),
  },
  b: { enter: (c) => c.log.push('enter b') },
};

describe('StateMachine', () => {
  it('enters the initial state on construction', () => {
    const ctx: Ctx = { log: [], goB: false };
    const fsm = new StateMachine(states, 'a', ctx);
    expect(fsm.current).toBe('a');
    expect(ctx.log).toEqual(['enter a']);
  });

  it('stays put when update returns nothing', () => {
    const ctx: Ctx = { log: [], goB: false };
    const fsm = new StateMachine(states, 'a', ctx);
    fsm.update(16);
    expect(fsm.current).toBe('a');
    expect(ctx.log).toEqual(['enter a']);
  });

  it('runs exit then enter on transition', () => {
    const ctx: Ctx = { log: [], goB: true };
    const fsm = new StateMachine(states, 'a', ctx);
    fsm.update(16);
    expect(fsm.current).toBe('b');
    expect(ctx.log).toEqual(['enter a', 'exit a', 'enter b']);
  });
});
