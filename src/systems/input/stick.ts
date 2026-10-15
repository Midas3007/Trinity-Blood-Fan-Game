export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Converts a finger offset from the stick centre into a normalised vector.
 * Magnitude is clamped to 1; inside the dead zone the result is zero, and the
 * remaining range is rescaled so output starts at 0 just past the dead zone.
 */
export function stickVector(dx: number, dy: number, radius: number, deadZone: number): Vec2 {
  if (radius <= 0) return { x: 0, y: 0 };
  const len = Math.hypot(dx, dy);
  const mag = Math.min(len / radius, 1);
  if (mag <= deadZone || len === 0) return { x: 0, y: 0 };
  const scaled = (mag - deadZone) / (1 - deadZone);
  return { x: (dx / len) * scaled, y: (dy / len) * scaled };
}

/** True when the stick is pushed up far enough to count as a jump press (y is negative upward). */
export function stickUpJump(y: number, threshold: number): boolean {
  return y <= -threshold;
}
