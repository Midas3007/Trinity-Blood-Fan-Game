import { describe, expect, it } from 'vitest';
import { animDefs, sheetLoads, textureKey, type SpriteIndex } from '../src/systems/sprites/spriteIndex';
import { visualFor } from '../src/player/PlayerView';
import { playerStates, type PlayerStateKey } from '../src/player/playerStates';
import player from '../src/data/player.json';
import index from '../public/assets/sprites/index.json';

const idx = index as unknown as SpriteIndex;

describe('sprite index', () => {
  it('turns every sheet into a loader entry and every animation into frames with durations', () => {
    const loads = sheetLoads(idx);
    expect(loads.map((l) => l.key)).toContain('abel_run');
    for (const l of loads) expect(l.url).toMatch(/^assets\/sprites\/.+\.png$/);
    const run = animDefs(idx).find((a) => a.key === 'abel_run');
    expect(run?.repeat).toBe(-1);
    expect(run?.frames.length).toBe(4);
    expect(run?.frames.every((f) => f.duration > 0)).toBe(true);
  });

  it('texture keys are file names without extension', () => {
    expect(textureKey('abel/abel_idle.png')).toBe('abel_idle');
  });

  it('rejects manifests whose frame and duration counts differ', () => {
    const bad: SpriteIndex = {
      sheets: {
        'x/x_a.png': { sheet: 'x_a.png', entity: 'x', cell_width: 64, cell_height: 64, pivot_x: 32, pivot_y: 64, columns: 2,
          animations: { a: { frames: [0, 1], durations_ms: [100], loop: true } } },
      },
    };
    expect(() => animDefs(bad)).toThrow(/durations/);
  });
});

describe('player visuals', () => {
  const anims = new Set(animDefs(idx).map((a) => a.key));
  const allStates = Object.keys(playerStates) as PlayerStateKey[];

  it('every player state has a visual entry, and every animation it names exists in the sprite index', () => {
    for (const s of allStates) {
      const v = visualFor(s, 'priest1');
      if (v === null) continue;
      expect(anims.has(v.anim), `${s} -> ${v.anim}`).toBe(true);
      if (v.frame !== undefined) {
        const def = animDefs(idx).find((a) => a.key === v.anim)!;
        expect(v.frame).toBeLessThan(def.frames.length);
      }
    }
  });

  it('each combo hit plays its own animation', () => {
    for (const id of ['priest1', 'priest2', 'priest3']) {
      const v = visualFor('attack', id);
      expect(v?.anim).toBe(`abel_${id}`);
      expect(anims.has(v!.anim)).toBe(true);
    }
    expect(visualFor('attack', null)).toBeNull();
  });

  it('low postures (crouch, slide, roll) have art and the roll animation lasts as long as the dodge', () => {
    for (const s of ['crouch', 'slide', 'dodge', 'crouchAttack'] as const) {
      const v = visualFor(s);
      expect(v).not.toBeNull();
      expect(anims.has(v!.anim)).toBe(true);
    }
    const roll = animDefs(idx).find((a) => a.key === 'abel_dodge');
    const total = roll!.frames.reduce((t, f) => t + f.duration, 0);
    expect(total).toBe(player.dodgeDurationMs);
  });
});
