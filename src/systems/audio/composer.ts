import type { ScaleName, TrackDef } from './music';

/**
 * The procedural composer: turns a track definition into the notes of one bar. Pure and seeded, so a piece is
 * the same every time it plays (and testable). Times and lengths are in beats; pitches are MIDI numbers.
 */
export type Part = 'pad' | 'bass' | 'arp' | 'melody' | 'drum' | 'bell' | 'choir';
export interface NoteEvent {
  t: number;
  dur: number;
  midi: number;
  part: Part;
  vel: number;
}

const SCALES: Record<ScaleName, number[]> = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

/** MIDI pitch of scale step `deg` (any integer; wraps into octaves). */
export function degree(root: number, scale: ScaleName, deg: number): number {
  const s = SCALES[scale];
  const oct = Math.floor(deg / s.length);
  const i = ((deg % s.length) + s.length) % s.length;
  return root + oct * 12 + (s[i] as number);
}

/** Small deterministic RNG (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/** Every note of bar `bar` (0, 1, 2 …; the progression loops). */
export function composeBar(def: TrackDef, bar: number): NoteEvent[] {
  const prog = def.progression;
  const d = prog[bar % prog.length] ?? 0;
  const chord = [0, 2, 4].map((k) => degree(def.root, def.scale, d + k));
  const B = def.beats;
  const out: NoteEvent[] = [];
  const r = rng(def.seed * 1000 + bar);
  const waltz = B === 3;
  // Harmony: held chords, or the waltz's "oom-pah-pah".
  if (waltz) {
    out.push({ t: 0, dur: 1, midi: (chord[0] as number) - 12, part: 'bass', vel: 0.9 });
    for (const t of [1, 2]) for (const m of chord) out.push({ t, dur: 0.7, midi: m, part: 'pad', vel: 0.45 });
  } else {
    out.push({ t: 0, dur: B, midi: (chord[0] as number) - 12, part: 'bass', vel: 0.8 });
    for (const m of chord) out.push({ t: 0, dur: B, midi: m, part: 'pad', vel: 0.5 });
  }
  if (def.choir) for (const m of chord) out.push({ t: 0, dur: B, midi: m + 12, part: 'choir', vel: 0.35 });
  if (def.arp) {
    const up = [...chord.map((m) => m + 12), (chord[1] as number) + 12, (chord[0] as number) + 24];
    for (let i = 0; i < B * 2; i++) out.push({ t: i / 2, dur: 0.5, midi: up[i % up.length] as number, part: 'arp', vel: i % 2 === 0 ? 0.55 : 0.4 });
  }
  if (def.melody) {
    // A walk over the scale, landing on a chord tone on the first beat; some beats rest, a few are split.
    let step = d + 7 + (r() < 0.5 ? 0 : 2);
    for (let b = 0; b < B; b++) {
      if (b > 0 && r() < 0.22) continue;
      if (b > 0) step += Math.round((r() - 0.5) * 4);
      const split = b > 0 && r() < 0.25;
      out.push({ t: b, dur: split ? 0.5 : 1, midi: degree(def.root, def.scale, step), part: 'melody', vel: 0.6 });
      if (split) out.push({ t: b + 0.5, dur: 0.5, midi: degree(def.root, def.scale, step + (r() < 0.5 ? 1 : -1)), part: 'melody', vel: 0.5 });
    }
  }
  if (def.drums) {
    out.push({ t: 0, dur: 1, midi: (chord[0] as number) - 24, part: 'drum', vel: 1 });
    if (!waltz) out.push({ t: B / 2, dur: 1, midi: degree(def.root, def.scale, d + 4) - 24, part: 'drum', vel: 0.7 });
    if (def.bpm >= 120 && bar % 2 === 1) out.push({ t: B - 0.5, dur: 0.5, midi: (chord[0] as number) - 24, part: 'drum', vel: 0.6 });
  }
  if (def.bells && bar % 2 === 0) out.push({ t: 0, dur: B * 2, midi: (chord[0] as number) + 24, part: 'bell', vel: 0.5 });
  return out;
}

/** Seconds per beat. */
export function beatSeconds(def: TrackDef): number {
  return 60 / def.bpm;
}
