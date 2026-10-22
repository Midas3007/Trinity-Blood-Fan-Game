/** Scrolling the fast-travel list. Pure; tested. */

/** How many rows fit in `height` px (at least one, never more than there are). */
export function visibleRows(total: number, height: number, rowH: number): number {
  return Math.max(1, Math.min(total, Math.floor(height / rowH)));
}

/** The first row shown after scrolling `step` rows, kept so the view is always full. */
export function scrollBy(offset: number, step: number, total: number, shown: number): number {
  return Math.max(0, Math.min(Math.max(0, total - shown), offset + step));
}
