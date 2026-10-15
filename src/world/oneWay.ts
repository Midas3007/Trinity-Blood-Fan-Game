import type Phaser from 'phaser';

/** Small tolerance so standing exactly on a plank still counts as 'from above' (px). */
const ABOVE_SLOP = 2;

/**
 * Collision filter for platforms you can jump up through: collide only when the body is falling onto the top
 * from above. `dropping` lets a body fall through on purpose (stick down + jump).
 */
export function landsOnTop(body: Phaser.Physics.Arcade.Body, platform: Phaser.Physics.Arcade.StaticBody, dropping = false): boolean {
  if (dropping || body.velocity.y < 0) return false;
  return body.prev.y + body.height <= platform.top + ABOVE_SLOP;
}
