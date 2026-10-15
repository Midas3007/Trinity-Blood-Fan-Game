import { describe, expect, it } from 'vitest';
import { FlyerBrain, flyerConfigs } from '../src/enemies/flyers/FlyerBrain';

const DT = 1000 / 60;

function run(b: FlyerBrain, ms: number, px: number, py: number, until?: (b: FlyerBrain) => boolean): Set<string> {
  const seen = new Set<string>();
  for (let t = 0; t < ms && !(until?.(b) ?? false); t += DT) {
    b.update(DT, px, py);
    seen.add(b.state);
  }
  return seen;
}

describe('flying creatures', () => {
  it('a bat notices Abel, winds up and swoops at him (contact hurts only during the swoop)', () => {
    const b = new FlyerBrain(flyerConfigs['bat']!, 100, 100);
    expect(b.contactActive).toBe(false);
    const seen = run(b, 6000, 160, 130, (x) => x.state === 'attack');
    expect([...seen]).toEqual(expect.arrayContaining(['chase', 'windup']));
    expect(b.contactActive).toBe(true);
    const before = Math.hypot(160 - b.x, 130 - b.y);
    b.update(100, 160, 130);
    expect(Math.hypot(160 - b.x, 130 - b.y)).toBeLessThan(before);
  });

  it('a fairy keeps its distance and screams a ring that hits once as its edge passes', () => {
    const b = new FlyerBrain(flyerConfigs['fairy']!, 100, 100);
    run(b, 8000, 180, 130, (x) => x.rings.length > 0);
    expect(b.rings.length).toBe(1);
    expect(Math.abs(b.x - 180)).toBeGreaterThan(30);
    let hit = null;
    for (let t = 0; t < 2000 && !hit; t += DT) {
      b.update(DT, 180, 130);
      hit = b.ringHitAt(180, 130);
    }
    expect(hit).not.toBeNull();
    expect(b.ringHitAt(180, 130)).toBeNull(); // only once per ring
  });

  it('gives up and drifts home when Abel leaves; falls when killed', () => {
    const b = new FlyerBrain(flyerConfigs['bat']!, 100, 100);
    run(b, 1500, 150, 110);
    run(b, 5000, 2000, 110);
    expect(b.state).toBe('idle');
    expect(Math.hypot(b.x - 100, b.y - 100)).toBeLessThan(20);
    b.takeHit(100, 50);
    expect(b.alive).toBe(false);
    const y = b.y;
    run(b, 600, 0, 0);
    expect(b.y).toBeGreaterThan(y);
    expect(b.finished).toBe(true);
  });
});
