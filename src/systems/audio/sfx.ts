/**
 * Procedural sound effects (WebAudio, no samples): blade swings, hits, the parry clang, shots, bells.
 * Names are the keys PlayScene and the UI ask for.
 */
export type SfxName =
  | 'swing' | 'hit' | 'hurt' | 'parry' | 'death' | 'gunshot' | 'heal' | 'pray' | 'transform'
  | 'bolt' | 'door' | 'card' | 'dodge' | 'phase' | 'ui';

let noiseBuf: AudioBuffer | null = null;
function noise(ctx: BaseAudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = b;
  return b;
}

function burst(ctx: BaseAudioContext, out: AudioNode, t: number, len: number, vol: number, type: BiquadFilterType, f0: number, f1: number, q = 1): void {
  const s = ctx.createBufferSource();
  s.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + len);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(f).connect(g).connect(out);
  s.start(t, Math.random() * 0.5);
  s.stop(t + len + 0.02);
}

function tone(ctx: BaseAudioContext, out: AudioNode, t: number, len: number, vol: number, type: OscillatorType, f0: number, f1 = f0): void {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + len);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + len + 0.02);
}

export function playSfx(ctx: BaseAudioContext, out: AudioNode, name: SfxName): void {
  const t = ctx.currentTime + 0.005;
  switch (name) {
    case 'swing':
      burst(ctx, out, t, 0.16, 0.35, 'bandpass', 1800, 600, 1.5);
      return;
    case 'dodge':
      burst(ctx, out, t, 0.22, 0.25, 'bandpass', 500, 1400, 1);
      return;
    case 'hit':
      tone(ctx, out, t, 0.12, 0.5, 'sine', 160, 60);
      burst(ctx, out, t, 0.08, 0.35, 'lowpass', 2500, 400);
      return;
    case 'hurt':
      tone(ctx, out, t, 0.2, 0.4, 'square', 220, 90);
      burst(ctx, out, t, 0.12, 0.3, 'lowpass', 1500, 300);
      return;
    case 'parry':
      for (const [hz, v] of [[1180, 0.22], [1870, 0.15], [2950, 0.1], [4100, 0.06]] as const) tone(ctx, out, t, 0.7, v, 'sine', hz);
      burst(ctx, out, t, 0.05, 0.4, 'highpass', 5000, 3000);
      return;
    case 'death':
      tone(ctx, out, t, 0.6, 0.35, 'sawtooth', 180, 40);
      burst(ctx, out, t, 0.5, 0.25, 'lowpass', 1200, 100);
      return;
    case 'gunshot':
      burst(ctx, out, t, 0.25, 0.8, 'lowpass', 6000, 300);
      tone(ctx, out, t, 0.15, 0.6, 'sine', 120, 40);
      return;
    case 'bolt':
      burst(ctx, out, t, 0.1, 0.25, 'bandpass', 3000, 1200, 3);
      tone(ctx, out, t, 0.08, 0.15, 'triangle', 700, 300);
      return;
    case 'heal':
      for (const [i, hz] of [523, 659, 784].entries()) tone(ctx, out, t + i * 0.07, 0.5, 0.15, 'sine', hz);
      return;
    case 'pray':
      for (const [hz, v] of [[392, 0.25], [784, 0.12], [1082, 0.08], [196, 0.15]] as const) tone(ctx, out, t, 2.5, v, 'sine', hz);
      return;
    case 'phase':
      for (const [hz, v] of [[98, 0.35], [196, 0.18], [270, 0.12], [529, 0.06]] as const) tone(ctx, out, t, 3, v, 'sine', hz);
      return;
    case 'transform':
      tone(ctx, out, t, 1.1, 0.4, 'sawtooth', 55, 110);
      tone(ctx, out, t, 1.1, 0.25, 'sawtooth', 58, 116);
      burst(ctx, out, t, 0.9, 0.35, 'lowpass', 300, 3000);
      return;
    case 'door':
      tone(ctx, out, t, 0.5, 0.3, 'triangle', 90, 60);
      burst(ctx, out, t, 0.4, 0.2, 'bandpass', 400, 200, 2);
      return;
    case 'card':
      for (const [i, hz] of [294, 440, 587].entries()) tone(ctx, out, t + i * 0.02, 2.2, 0.12, 'sine', hz);
      return;
    case 'ui':
      tone(ctx, out, t, 0.08, 0.15, 'triangle', 880, 660);
      return;
  }
}
