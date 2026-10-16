import type Phaser from 'phaser';
import effects from '../data/effects.json';
import { settings } from './settings';

/**
 * Screen effects through the player's settings: shake (off in low effects or when turned off), flashes (accessibility)
 * and sparks (low effects). Every camera shake and flash in the game goes through here.
 */
export const fx = {
  get shakeOn(): boolean {
    const s = settings.current;
    return effects.screenShake && s.shake && !s.lowEffects;
  },
  get sparksOn(): boolean {
    return effects.sparks && !settings.current.lowEffects;
  },
  get flashOn(): boolean {
    return settings.current.flashes;
  },
  get lowEffects(): boolean {
    return settings.current.lowEffects;
  },
  shake(cam: Phaser.Cameras.Scene2D.Camera, ms: number, intensity: number): void {
    if (fx.shakeOn) cam.shake(ms, intensity);
  },
  flash(cam: Phaser.Cameras.Scene2D.Camera, ms: number, r: number, g: number, b: number): void {
    if (fx.flashOn) cam.flash(ms, r, g, b);
  },
};
