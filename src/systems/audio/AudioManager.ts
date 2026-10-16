import { beatSeconds, composeBar, midiToHz } from './composer';
import { track, type TrackDef } from './music';
import { playSfx, type SfxName } from './sfx';
import { playNote } from './synth';

const SETTINGS_KEY = 'trinity-blood.audio';
const LOOKAHEAD_S = 0.6;
const TICK_MS = 120;
const FADE_S = 1.4;
const DUCK = 0.35;
const LEVELS = { music: 0.55, sfx: 0.7, voice: 1 };

/** One playing piece: the procedural composer, or a recording (falling back to the composer if it won't load). */
class MusicPlayer {
  readonly out: GainNode;
  private timer: ReturnType<typeof setInterval> | null = null;
  private bar = 0;
  private nextBar = 0;
  private el: HTMLAudioElement | null = null;

  constructor(
    private readonly ctx: AudioContext,
    dest: AudioNode,
    readonly key: string,
    private readonly def: TrackDef,
  ) {
    this.out = ctx.createGain();
    this.out.gain.setValueAtTime(0, ctx.currentTime);
    this.out.gain.linearRampToValueAtTime(def.gain, ctx.currentTime + FADE_S);
    this.out.connect(dest);
    if (def.file) this.playFile(def.file);
    else this.compose();
  }

  private playFile(file: string): void {
    const el = new Audio(`assets/audio/music/${file}`);
    el.loop = true;
    el.crossOrigin = 'anonymous';
    this.el = el;
    el.addEventListener('error', () => {
      if (this.el !== el) return;
      this.el = null;
      this.compose(); // missing or undecodable: the original piece plays instead
    });
    this.ctx.createMediaElementSource(el).connect(this.out);
    void el.play().catch(() => undefined);
  }

  private compose(): void {
    this.nextBar = this.ctx.currentTime + 0.1;
    const tick = (): void => {
      const barLen = beatSeconds(this.def) * this.def.beats;
      while (this.nextBar < this.ctx.currentTime + LOOKAHEAD_S) {
        const spb = beatSeconds(this.def);
        for (const n of composeBar(this.def, this.bar)) {
          playNote(this.ctx, this.out, this.def.voice, n.part, midiToHz(n.midi), this.nextBar + n.t * spb, n.dur * spb, n.vel);
        }
        this.bar++;
        this.nextBar += barLen;
      }
    };
    tick();
    this.timer = setInterval(tick, TICK_MS);
  }

  stop(): void {
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0, t + FADE_S);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const el = this.el;
    this.el = null;
    setTimeout(() => {
      el?.pause();
      this.out.disconnect();
    }, FADE_S * 1000 + 3000);
  }
}

/**
 * All game audio (one per page; scenes come and go). WebAudio starts on the first touch or key press (browsers
 * require it), pauses when the page is hidden, and can be switched off from the pause menu (saved).
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private voiceBus: GainNode | null = null;
  private player: MusicPlayer | null = null;
  private wanted: string | null = null;
  private voiceEl: HTMLAudioElement | null = null;
  private on = true;
  private installed = false;
  private out: AudioNode | null = null;

  constructor() {
    try {
      this.on = globalThis.localStorage?.getItem(SETTINGS_KEY) !== 'off';
    } catch {
      this.on = true; // storage blocked: sound stays on
    }
  }

  get enabled(): boolean {
    return this.on;
  }

  /** What's playing now (for tests and the debug snapshot). */
  get current(): string | null {
    return this.wanted;
  }

  /** Hook the first-gesture unlock and the hide/show pause. Safe to call more than once. */
  install(): void {
    if (this.installed || typeof window === 'undefined') return;
    this.installed = true;
    const unlock = (): void => {
      this.unlock();
    };
    for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, unlock, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.visibilityState === 'hidden') void this.ctx.suspend();
      else if (this.on) void this.ctx.resume();
    });
  }

  private unlock(): void {
    if (!this.on) return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const comp = ctx.createDynamicsCompressor();
      comp.connect(ctx.destination);
      const bus = (v: number): GainNode => {
        const g = ctx.createGain();
        g.gain.value = v;
        g.connect(comp);
        return g;
      };
      this.ctx = ctx;
      this.out = comp;
      this.musicBus = bus(LEVELS.music);
      this.sfxBus = bus(LEVELS.sfx);
      this.voiceBus = bus(LEVELS.voice);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.wanted && this.player?.key !== this.wanted) this.startMusic(this.wanted);
  }

  setEnabled(on: boolean): void {
    this.on = on;
    try {
      globalThis.localStorage?.setItem(SETTINGS_KEY, on ? 'on' : 'off');
    } catch {
      /* storage blocked: the choice lasts this session */
    }
    if (!on) {
      this.player?.stop();
      this.player = null;
      this.voiceEl?.pause();
      if (this.ctx) void this.ctx.suspend();
    } else {
      this.unlock();
    }
  }

  /** Switch the music to `key` (crossfade). The same key keeps playing without a restart. */
  music(key: string): void {
    // Test mode only: ?test&music=<key> plays that piece everywhere (a steady bed for recorded footage).
    const forced = typeof location !== 'undefined' && /[?&]test\b/.test(location.search) ? new URLSearchParams(location.search).get('music') : null;
    if (forced) key = forced;
    if (this.wanted === key) return;
    this.wanted = key;
    if (this.ctx && this.on) this.startMusic(key);
  }

  private startMusic(key: string): void {
    const def = track(key);
    if (!this.ctx || !this.musicBus || !def) return;
    if (this.player?.key === key) return;
    this.player?.stop();
    this.player = new MusicPlayer(this.ctx, this.musicBus, key, def);
  }

  /** Test mode only: everything the game plays, as a stream (the recorded playthrough captures it). */
  capture(): MediaStream | null {
    if (!this.ctx || !this.out) return null;
    const dest = this.ctx.createMediaStreamDestination();
    this.out.connect(dest);
    return dest.stream;
  }

  sfx(name: SfxName): void {
    if (!this.on || !this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;
    playSfx(this.ctx, this.sfxBus, name);
  }

  /** A spoken cutscene line (public/assets/audio/voice/<id>.mp3); the music ducks under it. */
  voice(id: string | undefined): void {
    this.stopVoice();
    if (!id || !this.on || !this.ctx || !this.voiceBus || !this.musicBus) return;
    const el = new Audio(`assets/audio/voice/${id}.mp3`);
    el.crossOrigin = 'anonymous';
    this.ctx.createMediaElementSource(el).connect(this.voiceBus);
    this.voiceEl = el;
    this.duck(true);
    const end = (): void => {
      if (this.voiceEl === el) this.duck(false);
    };
    el.addEventListener('ended', end);
    el.addEventListener('error', end);
    void el.play().catch(end);
  }

  stopVoice(): void {
    if (!this.voiceEl) return;
    this.voiceEl.pause();
    this.voiceEl = null;
    this.duck(false);
  }

  private duck(on: boolean): void {
    if (!this.ctx || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
    this.musicBus.gain.linearRampToValueAtTime(LEVELS.music * (on ? DUCK : 1), t + 0.3);
  }
}

export const audio = new AudioManager();
