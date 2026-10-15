import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave, SAVE_VERSION, type SaveData } from '../src/systems/save/saveFormat';
import { SaveStore, type KeyValueStorage } from '../src/systems/save/SaveStore';

const sample: SaveData = {
  version: SAVE_VERSION,
  checkpoint: { room: 'market_square', id: 'fountain' },
  flags: ['well_open'],
  visited: ['istvan_station', 'market_square'],
  time: 'night',
  savedAt: 1,
};

class MemoryStorage implements KeyValueStorage {
  readonly items = new Map<string, string>();
  failWrites = false;
  getItem(k: string) {
    return this.items.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.failWrites) throw new Error('QuotaExceededError');
    this.items.set(k, v);
  }
  removeItem(k: string) {
    this.items.delete(k);
  }
}

describe('save format', () => {
  it('round-trips', () => {
    expect(decodeSave(encodeSave(sample))).toEqual(sample);
  });

  it('migrates a version 1 save', () => {
    const v1 = { version: 1, hp: 40, checkpoint: null, flags: ['a'], visited: ['b'] };
    expect(decodeSave(JSON.stringify(v1))).toEqual({ version: SAVE_VERSION, checkpoint: null, flags: ['a'], visited: ['b'], time: 'night', savedAt: 0 });
  });

  it.each([
    ['empty', ''],
    ['not JSON', '{broken'],
    ['an array', '[]'],
    ['a future version', JSON.stringify({ ...sample, version: 99 })],
    ['bad flags', JSON.stringify({ ...sample, flags: [1] })],
    ['bad checkpoint', JSON.stringify({ ...sample, checkpoint: { room: 3 } })],
    ['bad time', JSON.stringify({ ...sample, time: 'noon' })],
  ])('rejects %s', (_name, raw) => {
    expect(decodeSave(raw)).toBeNull();
  });
});

describe('SaveStore', () => {
  it('saves and loads', () => {
    const store = new SaveStore(new MemoryStorage());
    expect(store.hasSave()).toBe(false);
    expect(store.save(sample)).toBe(true);
    expect(store.load()).toEqual(sample);
  });

  it('falls back to the previous save when the newest is corrupt', () => {
    const mem = new MemoryStorage();
    const store = new SaveStore(mem);
    store.save(sample);
    store.save({ ...sample, flags: ['newer'] });
    mem.items.set('trinity-blood.save', '{cut off');
    expect(store.load()?.flags).toEqual(['well_open']);
  });

  it('never throws when storage is missing or full', () => {
    expect(new SaveStore(null).save(sample)).toBe(false);
    expect(new SaveStore(null).load()).toBeNull();
    const mem = new MemoryStorage();
    mem.failWrites = true;
    expect(new SaveStore(mem).save(sample)).toBe(false);
  });

  it('clear removes the save', () => {
    const store = new SaveStore(new MemoryStorage());
    store.save(sample);
    store.clear();
    expect(store.hasSave()).toBe(false);
  });
});
