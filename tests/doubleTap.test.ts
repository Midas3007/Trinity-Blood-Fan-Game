import { describe, expect, it } from 'vitest';
import { TapCounter } from '../src/systems/input/doubleTap';

describe('TapCounter', () => {
  it('two presses inside the window are a double tap; one press is a single tap after the window', () => {
    const t = new TapCounter(280);
    expect(t.update(true, 16)).toBeNull();
    expect(t.update(false, 100)).toBeNull();
    expect(t.update(true, 16)).toBe('double');
    expect(t.update(false, 400)).toBeNull(); // nothing left waiting
    expect(t.update(true, 16)).toBeNull();
    expect(t.update(false, 200)).toBeNull();
    expect(t.update(false, 100)).toBe('single');
  });
});
