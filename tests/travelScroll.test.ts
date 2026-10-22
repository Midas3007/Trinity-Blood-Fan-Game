import { describe, expect, it } from 'vitest';
import { scrollBy, visibleRows } from '../src/ui/travelScroll';

describe('fast-travel list scrolling', () => {
  it('shows as many rows as fit, scrolls within the list and never past its ends', () => {
    expect(visibleRows(25, 180, 22)).toBe(8);
    expect(visibleRows(3, 180, 22)).toBe(3);
    expect(scrollBy(0, -1, 25, 8)).toBe(0);
    expect(scrollBy(0, 1, 25, 8)).toBe(1);
    expect(scrollBy(17, 1, 25, 8)).toBe(17);
    expect(scrollBy(5, 1, 3, 3)).toBe(0);
  });
});
