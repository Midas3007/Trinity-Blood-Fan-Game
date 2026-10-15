import { describe, expect, it } from 'vitest';
import { attackTable } from '../src/combat/attackData';
import playerTuning from '../src/data/player.json';

/** Art timing must agree with combat data (docs/sprite-pipeline.md §4.5). Passes trivially until sheets exist. */
const FRAME_MS = 1000 / 60;

interface Anim {
  attack?: string;
  frames: number[];
  durations_ms: number[];
  events?: { frame: number; type: string }[];
  hitboxes?: { frame: number; x: number; y: number; w: number; h: number }[];
}
interface Manifest {
  sheet: string;
  cell_width: number;
  cell_height: number;
  pivot_x: number;
  pivot_y: number;
  animations: Record<string, Anim>;
}

// Every manifest shipped under public/assets/sprites (none until the first sheets are built).
const found = import.meta.glob<Manifest>(['/public/assets/sprites/**/*.json', '!**/index.json'], {
  eager: true,
  import: 'default',
});

const timeBefore = (a: Anim, frame: number): number => a.durations_ms.slice(0, frame).reduce((s, d) => s + d, 0);

describe('sprite manifests agree with combat data', () => {
  it('loads every manifest', () => {
    expect(Object.keys(found).length).toBeGreaterThanOrEqual(0);
  });

  for (const [file, m] of Object.entries(found)) {
    for (const [name, anim] of Object.entries(m.animations)) {
      if (!anim.attack) continue;
      it(`${file} ${name} matches attack "${anim.attack}"`, () => {
        const def = attackTable[anim.attack!];
        expect(def, `unknown attack ${anim.attack}`).toBeDefined();
        const on = anim.events?.find((e) => e.type === 'hitbox_on');
        const off = anim.events?.find((e) => e.type === 'hitbox_off');
        expect(on && off, 'attack animations need hitbox_on and hitbox_off events').toBeTruthy();
        expect(Math.abs(timeBefore(anim, on!.frame) - def!.startupMs)).toBeLessThanOrEqual(FRAME_MS);
        expect(Math.abs(timeBefore(anim, off!.frame) - timeBefore(anim, on!.frame) - def!.activeMs)).toBeLessThanOrEqual(FRAME_MS);
        for (const hb of anim.hitboxes ?? []) {
          // attacks.json hitboxes are relative to the body centre; manifests use cell pixels from the top-left.
          const cx = m.pivot_x + def!.hitbox.x;
          const cy = m.pivot_y - playerTuning.height / 2 + def!.hitbox.y;
          expect(hb.x).toBe(Math.round(cx - def!.hitbox.w / 2));
          expect(hb.y).toBe(Math.round(cy - def!.hitbox.h / 2));
          expect([hb.w, hb.h]).toEqual([def!.hitbox.w, def!.hitbox.h]);
        }
      });
    }
  }
});
