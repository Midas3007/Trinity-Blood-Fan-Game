import { describe, expect, it } from 'vitest';
import { framesFor, SimPlayer } from './playerSim';
import { playerTuning as t } from '../src/player/tuning';

describe('parry (player)', () => {
  it('PARRY on the ground guards briefly: open for the window, then Abel is left open, then idle', () => {
    const p = new SimPlayer();
    p.step({ parry: true });
    expect(p.state).toBe('parry');
    expect(p.parryOpen).toBe(true);
    p.run(framesFor(t.parryWindowMs) + 1);
    expect(p.parryOpen).toBe(false);
    expect(p.state).toBe('parry');
    p.run(framesFor(t.parryRecoveryMs) + 2);
    expect(p.state).toBe('idle');
  });

  it('a deflected hit lets ATK follow at once (the riposte)', () => {
    const p = new SimPlayer();
    p.step({ parry: true });
    p.run(3);
    expect(p.hitArrives()).toBe(true);
    p.step();
    expect(p.parryOpen).toBe(false);
    p.step({ attack: true });
    expect(p.state).toBe('attack');
  });

  it('without a deflection, ATK during the recovery does nothing; unparryable hits are not deflected', () => {
    const p = new SimPlayer();
    p.step({ parry: true });
    expect(p.hitArrives(false)).toBe(false);
    p.run(framesFor(t.parryWindowMs) + 1);
    p.step({ attack: true });
    expect(p.state).toBe('parry');
  });

  it('a new parry starts clean (the last success does not carry over)', () => {
    const p = new SimPlayer();
    p.step({ parry: true });
    p.hitArrives();
    p.run(framesFor(t.parryWindowMs + t.parryRecoveryMs) + 2);
    p.step({ parry: true });
    expect(p.parrySucceeded).toBe(false);
    expect(p.parryOpen).toBe(true);
  });
});
