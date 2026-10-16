import { describe, expect, it } from 'vitest';
import { easeAlpha, upOnFront } from '../src/world/seeThrough';

const front = { x: 100, y: 100, w: 200, h: 300 }; // bottom at 400

describe('see-through fronts', () => {
  it('stays solid while walking past at street level', () => {
    expect(upOnFront(front, 150, 400)).toBe(false);
    expect(upOnFront(front, 150, 390)).toBe(false);
  });
  it('fades on a ledge, a balcony or the roof', () => {
    expect(upOnFront(front, 150, 360)).toBe(true);
    expect(upOnFront(front, 150, 100)).toBe(true);
    expect(upOnFront(front, 150, 80)).toBe(true);
  });
  it('not beside it or far above it', () => {
    expect(upOnFront(front, 40, 200)).toBe(false);
    expect(upOnFront(front, 150, 20)).toBe(false);
  });
  it('eases toward the target without overshooting', () => {
    expect(easeAlpha(1, 0.45, 5, 50)).toBeCloseTo(0.75);
    expect(easeAlpha(0.5, 0.45, 5, 1000)).toBe(0.45);
    expect(easeAlpha(0.45, 1, 5, 1000)).toBe(1);
  });
});
