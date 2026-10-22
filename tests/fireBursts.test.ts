import { describe, expect, it } from 'vitest';
import { FireBursts } from '../src/combat/fireBursts';

const cfg = { delayMs: 300, activeMs: 200, radius: 30, damage: 18 };

describe('flame-beast death burst', () => {
  it('flares first (harmless), then burns once, then is gone', () => {
    const f = new FireBursts();
    f.add(100, 50, cfg);
    expect(f.hazards()).toHaveLength(0);
    f.update(320);
    const h = f.hazards();
    expect(h).toHaveLength(1);
    expect(h[0]!.hurtbox()).toEqual({ x: 70, y: 20, w: 60, h: 60 });
    expect(h[0]!.contactHit(140).knockbackX).toBeGreaterThan(0);
    expect(f.hazards()).toHaveLength(0); // spent: one hit only
    f.update(300);
    expect(f.shapes).toHaveLength(0);
  });
});
