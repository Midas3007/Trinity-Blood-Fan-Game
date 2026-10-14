let next = 1;

/** Unique id for anything that can be hit (used so one swing hits each target once). */
export function nextEntityId(): number {
  return next++;
}
