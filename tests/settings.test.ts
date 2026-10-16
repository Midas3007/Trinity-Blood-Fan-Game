import { describe, expect, it } from 'vitest';
import controls from '../src/data/controls.json';
import { bindingsFrom, clampSpot, damageTaken, defaultSettings, parryWindow, parseSettings, rebind, touchLayoutFrom } from '../src/systems/settings';
import type { TouchLayout } from '../src/ui/touchLayout';
import type { Action } from '../src/systems/input/actions';

const DEFAULTS: Record<Action, number[]> = { attack: [74, 88], jump: [32], dodge: [76], ability: [73], heal: [72], parry: [79] };

describe('settings', () => {
  it('broken or hostile storage falls back to defaults field by field', () => {
    expect(parseSettings(null)).toEqual(defaultSettings());
    expect(parseSettings('not json')).toEqual(defaultSettings());
    const s = parseSettings(JSON.stringify({ difficulty: 'nightmare', shake: 'yes', keys: { attack: [999], jump: [75] }, touch: { buttons: { attack: { x: 9, y: -3, radius: 400 } } } }));
    expect(s.difficulty).toBe('normal');
    expect(s.shake).toBe(true);
    expect(s.keys.attack).toBeUndefined();
    expect(s.keys.jump).toEqual([75]);
    expect(s.touch.buttons.attack).toEqual(clampSpot({ x: 9, y: -3, radius: 400 }));
  });
  it('difficulty scales damage taken; parry assist widens the window', () => {
    const d = defaultSettings();
    expect(damageTaken(20, d)).toBe(20);
    expect(damageTaken(20, { ...d, difficulty: 'story' })).toBe(10);
    expect(damageTaken(20, { ...d, difficulty: 'hard' })).toBe(30);
    expect(damageTaken(1, { ...d, difficulty: 'story' })).toBe(1);
    expect(parryWindow(200, { ...d, parryAssist: true })).toBeGreaterThan(200);
  });
  it('rebinding gives an action one key and takes that key off any other action', () => {
    const s = rebind(defaultSettings(), DEFAULTS, 'jump', 88);
    const b = bindingsFrom(DEFAULTS, s);
    expect(b.jump).toEqual([88]);
    expect(b.attack).toEqual([74]);
    expect(b.heal).toEqual([72]);
  });
  it('moved and resized touch controls replace the defaults, the rest stay', () => {
    const base = controls as TouchLayout;
    const s = { ...defaultSettings(), touch: { buttons: { attack: { x: 0.5, y: 0.5, radius: 30 } }, stick: { x: 0.2, y: 0.8, radius: 40 } } };
    const l = touchLayoutFrom(base, s);
    expect(l.buttons.find((b) => b.action === 'attack')).toMatchObject({ x: 0.5, y: 0.5, radius: 30 });
    expect(l.buttons.find((b) => b.action === 'jump')).toEqual(base.buttons.find((b) => b.action === 'jump'));
    expect(l.stick.radius).toBe(40);
  });
});
