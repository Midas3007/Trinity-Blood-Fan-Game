import { describe, expect, it } from 'vitest';
import { findLedge, hangCentre, standCentre } from '../src/player/ledge';
import { playerTuning as t } from '../src/player/tuning';

const W = t.width;
const H = t.height;
// A wall whose face is at x = 100 and whose top is at y = 200; open ground above it.
const wall = { x: 100, y: 200, w: 64, h: 160 };
const sideX = 100 - W / 2; // body centre touching the wall's face from the left

describe('findLedge', () => {
  it('finds a wall top just below the head', () => {
    expect(findLedge(sideX, 198, W, H, 1, [wall], t)).toEqual({ edgeX: 100, topY: 200, dir: 1 });
  });

  it('ignores walls behind, too far away, or tops out of reach', () => {
    expect(findLedge(sideX, 198, W, H, -1, [wall], t)).toBeNull();
    expect(findLedge(sideX - 20, 198, W, H, 1, [wall], t)).toBeNull();
    expect(findLedge(sideX, 200 + t.ledgeReachAbove + 20, W, H, 1, [wall], t)).toBeNull(); // top far above the head
    expect(findLedge(sideX, 200 - t.ledgeReachBelow - 20, W, H, 1, [wall], t)).toBeNull(); // top far below the head
  });

  it('works facing left too', () => {
    const left = { x: 0, y: 200, w: 50, h: 160 };
    expect(findLedge(50 + W / 2, 198, W, H, -1, [left], t)).toEqual({ edgeX: 50, topY: 200, dir: -1 });
  });

  it('no grab when there is no room to stand on top, or a ceiling blocks the climb', () => {
    const above = { x: 100, y: 200 - H + 4, w: 64, h: 16 }; // something sitting on the ledge
    expect(findLedge(sideX, 198, W, H, 1, [wall, above], t)).toBeNull();
    const ceiling = { x: sideX - 20, y: 180, w: 40, h: 8 };
    expect(findLedge(sideX, 198, W, H, 1, [wall, ceiling], t)).toBeNull();
  });

  it('a mid-wall seam (another solid stacked on top) is not a ledge', () => {
    const upper = { x: 100, y: 120, w: 64, h: 80 };
    expect(findLedge(sideX, 198, W, H, 1, [wall, upper], t)).toBeNull();
  });

  it('hang and stand positions sit against the wall and on top of it', () => {
    const l = { edgeX: 100, topY: 200, dir: 1 as const };
    const hang = hangCentre(l, W, H, t.ledgeHeadAbove);
    expect(hang.x + W / 2).toBe(100);
    expect(hang.y - H / 2).toBe(200 - t.ledgeHeadAbove);
    const stand = standCentre(l, W, H, 2);
    expect(stand.x - W / 2).toBeGreaterThan(100);
    expect(stand.y + H / 2).toBe(200);
  });
});
