import { describe, expect, it } from 'vitest';
import { ActionState } from '../src/systems/input/ActionState';
import { emptyFrame, mergeFrames } from '../src/systems/input/actions';
import { stickUpJump, stickVector } from '../src/systems/input/stick';
import { TapCounter } from '../src/systems/input/TapCounter';
import { buttonAt, type ButtonLayout } from '../src/ui/touchLayout';
import controls from '../src/data/controls.json';

describe('stickVector', () => {
  it('is zero inside the dead zone', () => {
    expect(stickVector(5, 0, 40, 0.2)).toEqual({ x: 0, y: 0 });
  });
  it('clamps to magnitude 1 beyond the radius', () => {
    const v = stickVector(200, 0, 40, 0.2);
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(0);
  });
  it('rescales past the dead zone', () => {
    // halfway between dead zone edge (8px) and radius (40px)
    expect(stickVector(-24, 0, 40, 0.2).x).toBeCloseTo(-0.5);
  });
});

describe('stick up = jump', () => {
  it('only a clearly upward push counts as jump', () => {
    const th = controls.stick.upJumpThreshold;
    expect(stickUpJump(stickVector(0, -40, 34, 0.2).y, th)).toBe(true); // straight up
    expect(stickUpJump(stickVector(40, -10, 34, 0.2).y, th)).toBe(false); // mostly sideways
    expect(stickUpJump(stickVector(0, 40, 34, 0.2).y, th)).toBe(false); // down
  });
});

describe('mergeFrames', () => {
  it('keeps the strongest axis and ORs buttons (multitouch + keyboard)', () => {
    const touch = emptyFrame();
    touch.moveX = -0.4;
    touch.buttons.attack = true;
    const keys = emptyFrame();
    keys.moveX = 1;
    keys.buttons.jump = true;
    const m = mergeFrames([touch, keys]);
    expect(m.moveX).toBe(1);
    expect(m.buttons.attack).toBe(true);
    expect(m.buttons.jump).toBe(true);
    expect(m.buttons.dodge).toBe(false);
  });
});

describe('ActionState', () => {
  it('reports justPressed for one frame only', () => {
    const s = new ActionState();
    const f = emptyFrame();
    f.buttons.jump = true;
    s.update(f);
    expect(s.justPressed('jump')).toBe(true);
    s.update(f);
    expect(s.justPressed('jump')).toBe(false);
    expect(s.isDown('jump')).toBe(true);
    s.update(emptyFrame());
    expect(s.justReleased('jump')).toBe(true);
  });
});

describe('TapCounter', () => {
  it('fires on the Nth tap inside the window, not when taps are too slow', () => {
    const t = new TapCounter(3, 600);
    expect(t.tap(0)).toBe(false);
    expect(t.tap(200)).toBe(false);
    expect(t.tap(400)).toBe(true);
    expect(t.tap(1000)).toBe(false);
    expect(t.tap(1700)).toBe(false);
    expect(t.tap(2400)).toBe(false);
  });
});

describe('touch layout', () => {
  const buttons = controls.buttons as ButtonLayout[];
  it('every button centre resolves to that button', () => {
    for (const b of buttons) {
      expect(buttonAt(buttons, b.x * 480, b.y * 270, 480, 270)?.action).toBe(b.action);
    }
  });
  it('defines all five actions with buttons fully on screen', () => {
    expect(new Set(buttons.map((b) => b.action))).toEqual(new Set(['attack', 'jump', 'dodge', 'ability', 'heal']));
    for (const b of buttons) {
      expect(b.x * 480 - b.radius).toBeGreaterThan(0);
      expect(b.x * 480 + b.radius).toBeLessThan(480);
      expect(b.y * 270 - b.radius).toBeGreaterThan(0);
      expect(b.y * 270 + b.radius).toBeLessThan(270);
    }
  });
});
