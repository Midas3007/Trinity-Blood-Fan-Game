import { describe, expect, it } from 'vitest';
import { composeBar, degree } from '../src/systems/audio/composer';
import { music, musicFor, track } from '../src/systems/audio/music';
import cutscenes from '../src/data/cutscenes.json';

const rooms = Object.keys(import.meta.glob('../src/data/rooms/*.tmj')).map((p) => p.replace(/^.*\/(.*)\.tmj$/, '$1'));

describe('music map', () => {
  it('every room, boss, cutscene and the menu name a real track', () => {
    const keys = [music.menu, music.credits, music.defaultRoom, ...Object.values(music.rooms), ...Object.values(music.bosses), ...Object.values(music.cutscenes)];
    for (const k of keys) expect(track(k), k).toBeDefined();
  });
  it('covers every room and every cutscene', () => {
    for (const r of rooms) expect(music.rooms[r], r).toBeDefined();
    for (const id of Object.keys((cutscenes as { scenes: Record<string, unknown> }).scenes)) expect(music.cutscenes[id], id).toBeDefined();
  });
  it('a cutscene beats a fight, a fight beats the room', () => {
    expect(musicFor({ room: 'water_tunnels' })).toBe('undercity');
    expect(musicFor({ room: 'water_tunnels', boss: 'paula' })).toBe('fight_paula');
    expect(musicFor({ room: 'water_tunnels', boss: 'paula', cutscene: 'paula_outro' })).toBe('scene_sad');
    expect(musicFor({ room: 'nowhere' })).toBe(music.defaultRoom);
  });
  it('places, fights and scenes have different pieces', () => {
    const areas = new Set(Object.values(music.rooms));
    const fights = new Set(Object.values(music.bosses));
    expect(fights.size).toBe(Object.keys(music.bosses).length);
    for (const f of fights) expect(areas.has(f)).toBe(false);
    expect(areas.size).toBeGreaterThanOrEqual(6);
  });
});

describe('composer', () => {
  it('scale steps wrap into octaves', () => {
    expect(degree(60, 'minor', 0)).toBe(60);
    expect(degree(60, 'minor', 2)).toBe(63);
    expect(degree(60, 'minor', 7)).toBe(72);
    expect(degree(60, 'minor', -1)).toBe(58);
    expect(degree(60, 'harmonic', 6)).toBe(71);
  });
  it('is deterministic and keeps notes inside the bar and audible range', () => {
    for (const [key, def] of Object.entries(music.tracks)) {
      for (let bar = 0; bar < 16; bar++) {
        const a = composeBar(def, bar);
        expect(a, key).toEqual(composeBar(def, bar));
        expect(a.length).toBeGreaterThan(0);
        for (const n of a) {
          expect(n.t).toBeGreaterThanOrEqual(0);
          expect(n.t).toBeLessThan(def.beats);
          expect(n.midi).toBeGreaterThanOrEqual(12);
          expect(n.midi).toBeLessThanOrEqual(108);
        }
      }
    }
  });
  it('a waltz puts the bass on one and chords on two and three', () => {
    const notes = composeBar({ ...music.tracks.ballroom!, arp: false, melody: false, drums: false }, 0);
    expect(notes.filter((n) => n.part === 'bass').map((n) => n.t)).toEqual([0]);
    expect(new Set(notes.filter((n) => n.part === 'pad').map((n) => n.t))).toEqual(new Set([1, 2]));
  });
});
