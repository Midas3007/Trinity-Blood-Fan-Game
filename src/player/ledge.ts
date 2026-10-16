import type { Rect } from '../combat/types';
import { overlaps } from '../combat/geometry';

/** A ledge Abel can hang from: the wall's face (x), the floor on top of it (y) and which way it lies. */
export interface Ledge {
  edgeX: number;
  topY: number;
  dir: 1 | -1;
}

/** How far the hands reach for a ledge (px, see src/data/player.json). */
export interface LedgeReach {
  /** Ledge top this far above the head still counts. */
  ledgeReachAbove: number;
  /** Ledge top this far below the head still counts. */
  ledgeReachBelow: number;
  /** Gap allowed between the body's side and the wall. */
  ledgeReachGap: number;
}

/**
 * The ledge in front of a body (centre x, top y, width, height) facing `dir`, or null.
 * A ledge is the top of a solid whose face is next to the body, with that top near the head,
 * room for the body to stand on it, and nothing overhead to stop the pull-up. Pure; tested.
 */
export function findLedge(x: number, top: number, w: number, h: number, dir: 1 | -1, solids: readonly Rect[], reach: LedgeReach): Ledge | null {
  const side = x + (dir * w) / 2;
  let best: Ledge | null = null;
  for (const s of solids) {
    const face = dir > 0 ? s.x : s.x + s.w;
    const gap = (face - side) * dir;
    if (gap < -1 || gap > reach.ledgeReachGap) continue;
    if (s.y < top - reach.ledgeReachAbove || s.y > top + reach.ledgeReachBelow) continue;
    const ledge: Ledge = { edgeX: face, topY: s.y, dir };
    if (!clearToClimb(ledge, x, top, w, h, solids)) continue;
    if (!best || s.y < best.topY) best = ledge;
  }
  return best;
}

/** Room to rise beside the wall to the ledge top and to stand on it. */
function clearToClimb(l: Ledge, x: number, top: number, w: number, h: number, solids: readonly Rect[]): boolean {
  const standX = l.dir > 0 ? l.edgeX + 1 : l.edgeX - w - 1;
  const stand: Rect = { x: standX, y: l.topY - h + 1, w, h: h - 2 };
  const riseTop = Math.min(top, l.topY - h + 1);
  const rise: Rect = { x: x - w / 2 + 1, y: riseTop, w: w - 2, h: Math.max(1, top - riseTop) };
  return !solids.some((s) => overlaps(stand, s) || (rise.h > 1 && overlaps(rise, s)));
}

/** Where the body's centre sits while hanging (hands on the ledge top, head just above it). */
export function hangCentre(l: Ledge, w: number, h: number, headAbove: number): { x: number; y: number } {
  return { x: l.edgeX - (l.dir * w) / 2, y: l.topY - headAbove + h / 2 };
}

/** Where the body's centre lands after pulling up (standing on the ledge, a step in from the edge). */
export function standCentre(l: Ledge, w: number, h: number, stepIn: number): { x: number; y: number } {
  return { x: l.edgeX + l.dir * (w / 2 + stepIn), y: l.topY - h / 2 };
}
