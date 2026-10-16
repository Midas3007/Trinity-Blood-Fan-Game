import type { Part } from './composer';
import type { Voice } from './music';

/**
 * Instrument voices for the procedural music, built from plain WebAudio oscillators (no samples): a pipe organ,
 * a soft choir, bowed strings, a harpsichord, bells, and a timpani. Each note makes a few short-lived nodes.
 */
function env(ctx: BaseAudioContext, when: number, attack: number, hold: number, release: number, peak: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(peak, when + attack);
  g.gain.setValueAtTime(peak, when + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, when + attack + hold + release);
  return g;
}

function osc(ctx: BaseAudioContext, type: OscillatorType, hz: number, when: number, stop: number, out: AudioNode, detune = 0): void {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = hz;
  o.detune.value = detune;
  o.connect(out);
  o.start(when);
  o.stop(stop);
}

function pluck(ctx: BaseAudioContext, out: AudioNode, hz: number, when: number, vel: number, decay: number, type: OscillatorType): void {
  const g = ctx.createGain();
  g.gain.setValueAtTime(vel, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
  g.connect(out);
  osc(ctx, type, hz, when, when + decay + 0.05, g);
}

function bell(ctx: BaseAudioContext, out: AudioNode, hz: number, when: number, vel: number, decay: number): void {
  for (const [ratio, amp] of [[1, 1], [2.76, 0.45], [5.4, 0.25], [0.5, 0.35]] as const) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel * amp, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay / ratio ** 0.3);
    g.connect(out);
    osc(ctx, 'sine', hz * ratio, when, when + decay + 0.05, g);
  }
}

function timpani(ctx: BaseAudioContext, out: AudioNode, hz: number, when: number, vel: number): void {
  const g = ctx.createGain();
  g.gain.setValueAtTime(vel, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.9);
  g.connect(out);
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(hz * 1.5, when);
  o.frequency.exponentialRampToValueAtTime(hz, when + 0.08);
  o.connect(g);
  o.start(when);
  o.stop(when + 1);
}

function sustained(ctx: BaseAudioContext, out: AudioNode, voice: Voice, hz: number, when: number, dur: number, vel: number): void {
  if (voice === 'organ') {
    const g = env(ctx, when, 0.04, Math.max(0, dur - 0.04), 0.25, vel * 0.5);
    g.connect(out);
    const end = when + dur + 0.3;
    osc(ctx, 'sine', hz, when, end, g);
    osc(ctx, 'sine', hz * 2, when, end, g);
    osc(ctx, 'triangle', hz * 4, when, end, g, 3);
    osc(ctx, 'sine', hz / 2, when, end, g);
    return;
  }
  // choir and strings: detuned saws through a soft low-pass, slow swell
  const choir = voice === 'choir';
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = choir ? 1100 : 1900;
  f.Q.value = choir ? 2 : 0.7;
  const attack = Math.min(dur * 0.5, choir ? 0.45 : 0.25);
  const g = env(ctx, when, attack, Math.max(0, dur - attack), choir ? 0.6 : 0.4, vel * 0.22);
  f.connect(g);
  g.connect(out);
  const end = when + dur + 0.7;
  osc(ctx, 'sawtooth', hz, when, end, f, -7);
  osc(ctx, 'sawtooth', hz, when, end, f, 7);
  if (choir) osc(ctx, 'triangle', hz * 2, when, end, f, 4);
}

/** Plays one note of a part on a track's main instrument. */
export function playNote(ctx: BaseAudioContext, out: AudioNode, voice: Voice, part: Part, midiHz: number, when: number, dur: number, vel: number): void {
  switch (part) {
    case 'drum':
      timpani(ctx, out, midiHz, when, vel * 0.9);
      return;
    case 'bell':
      bell(ctx, out, midiHz, when, vel * 0.25, 3);
      return;
    case 'bass':
      sustained(ctx, out, voice === 'harpsichord' || voice === 'bells' ? 'strings' : voice, midiHz, when, dur, vel * 0.8);
      return;
    case 'choir':
      sustained(ctx, out, 'choir', midiHz, when, dur, vel);
      return;
  }
  if (voice === 'harpsichord') {
    pluck(ctx, out, midiHz, when, vel * (part === 'pad' ? 0.06 : 0.12), part === 'pad' ? 1.2 : 0.5, 'sawtooth');
    return;
  }
  if (voice === 'bells') {
    bell(ctx, out, midiHz, when, vel * (part === 'pad' ? 0.06 : 0.14), part === 'pad' ? 1.2 : 1.6);
    return;
  }
  if (part === 'arp') {
    // Organ/choir/strings arpeggios are plucked lightly so they don't smear into the pad.
    pluck(ctx, out, midiHz, when, vel * 0.09, 0.35, voice === 'organ' ? 'square' : 'triangle');
    return;
  }
  sustained(ctx, out, voice, midiHz, when, dur * 0.95, part === 'melody' ? vel * 1.1 : vel);
}
