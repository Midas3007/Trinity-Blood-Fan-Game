import type { Action } from './input/actions';
import type { ButtonLayout, TouchLayout } from '../ui/touchLayout';

/**
 * Player settings (owner, 2026-10-16): difficulty, accessibility, low effects, key bindings and the touch layout.
 * Saved per device (localStorage 'trinity-blood.settings'), versioned; anything missing or broken falls back to
 * the defaults. Pure apart from the storage passed in.
 */
export type Difficulty = 'story' | 'normal' | 'hard';

export interface TouchSpot {
  x: number;
  y: number;
  radius: number;
}

export interface Settings {
  version: 1;
  difficulty: Difficulty;
  /** A longer parry window. */
  parryAssist: boolean;
  shake: boolean;
  flashes: boolean;
  /** Fewer particles and glows, no shake: for weaker phones. */
  lowEffects: boolean;
  /** Keyboard keys per action (key codes); missing actions use the defaults. */
  keys: Partial<Record<Action, number[]>>;
  /** Moved or resized touch controls; missing ones use controls.json. */
  touch: { stick?: TouchSpot; buttons: Partial<Record<Action, TouchSpot>> };
}

export const SETTINGS_KEY = 'trinity-blood.settings';

export const DIFFICULTY: Record<Difficulty, { label: string; damageTaken: number; note: string }> = {
  story: { label: 'Story', damageTaken: 0.5, note: 'Enemies hit for half.' },
  normal: { label: 'Normal', damageTaken: 1, note: 'As designed.' },
  hard: { label: 'Hard', damageTaken: 1.5, note: 'Enemies hit half again as hard.' },
};

export const PARRY_ASSIST_FACTOR = 1.75;

export function defaultSettings(): Settings {
  return { version: 1, difficulty: 'normal', parryAssist: false, shake: true, flashes: true, lowEffects: false, keys: {}, touch: { buttons: {} } };
}

const TOUCH_MIN_R = 10;
const TOUCH_MAX_R = 36;
const EDGE = 0.04;

export function clampSpot(s: TouchSpot): TouchSpot {
  const c = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
  return { x: c(s.x, EDGE, 1 - EDGE), y: c(s.y, EDGE, 1 - EDGE), radius: Math.round(c(s.radius, TOUCH_MIN_R, TOUCH_MAX_R)) };
}

/** Reads settings from untrusted storage: every field is checked; bad or missing ones get the default. */
export function parseSettings(text: string | null): Settings {
  const d = defaultSettings();
  if (!text) return d;
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return d;
  }
  if (!o || typeof o !== 'object') return d;
  const bool = (k: keyof Settings, def: boolean): boolean => (typeof o[k] === 'boolean' ? (o[k] as boolean) : def);
  const diff = o.difficulty;
  const keys: Settings['keys'] = {};
  if (o.keys && typeof o.keys === 'object') {
    for (const [a, v] of Object.entries(o.keys as Record<string, unknown>)) {
      if (Array.isArray(v) && v.every((n) => Number.isInteger(n) && n > 0 && n < 256)) keys[a as Action] = v as number[];
    }
  }
  const touch: Settings['touch'] = { buttons: {} };
  const spot = (v: unknown): TouchSpot | null => {
    if (!v || typeof v !== 'object') return null;
    const s = v as Record<string, unknown>;
    return typeof s.x === 'number' && typeof s.y === 'number' && typeof s.radius === 'number' ? clampSpot({ x: s.x, y: s.y, radius: s.radius }) : null;
  };
  const t = o.touch as Record<string, unknown> | undefined;
  if (t && typeof t === 'object') {
    const st = spot(t.stick);
    if (st) touch.stick = st;
    if (t.buttons && typeof t.buttons === 'object') {
      for (const [a, v] of Object.entries(t.buttons as Record<string, unknown>)) {
        const s = spot(v);
        if (s) touch.buttons[a as Action] = s;
      }
    }
  }
  return {
    version: 1,
    difficulty: diff === 'story' || diff === 'hard' || diff === 'normal' ? diff : d.difficulty,
    parryAssist: bool('parryAssist', d.parryAssist),
    shake: bool('shake', d.shake),
    flashes: bool('flashes', d.flashes),
    lowEffects: bool('lowEffects', d.lowEffects),
    keys,
    touch,
  };
}

/** The touch layout with the player's moves and resizes applied. */
export function touchLayoutFrom(base: TouchLayout, s: Settings): TouchLayout {
  const buttons: ButtonLayout[] = base.buttons.map((b) => {
    const o = s.touch.buttons[b.action];
    return o ? { ...b, x: o.x, y: o.y, radius: o.radius } : b;
  });
  const st = s.touch.stick;
  return { stick: st ? { ...base.stick, x: st.x, y: st.y, radius: st.radius, knobRadius: Math.round(st.radius * 0.42) } : base.stick, buttons };
}

/** Key bindings with the player's changes applied. */
export function bindingsFrom(defaults: Record<Action, number[]>, s: Settings): Record<Action, number[]> {
  const out = { ...defaults };
  for (const [a, codes] of Object.entries(s.keys) as [Action, number[]][]) if (codes.length) out[a] = codes;
  return out;
}

/** Rebinds an action to one key; that key is taken off any other action, so one key never does two things. */
export function rebind(s: Settings, defaults: Record<Action, number[]>, action: Action, code: number): Settings {
  const current = bindingsFrom(defaults, s);
  const keys: Settings['keys'] = {};
  for (const [a, codes] of Object.entries(current) as [Action, number[]][]) {
    const left = codes.filter((c) => c !== code);
    if (a === action) keys[a] = [code];
    else if (left.length !== codes.length) keys[a] = left;
    else if (s.keys[a]) keys[a] = codes;
  }
  return { ...s, keys };
}

interface Store {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

function browserStore(): Store | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** The live settings for this page; change() saves and tells listeners (the scene re-applies effects and controls). */
class SettingsStore {
  private value: Settings;
  private readonly listeners = new Set<(s: Settings) => void>();
  constructor(private readonly store: Store | null) {
    let text: string | null = null;
    try {
      text = store?.getItem(SETTINGS_KEY) ?? null;
    } catch {
      text = null;
    }
    this.value = parseSettings(text);
  }
  get current(): Settings {
    return this.value;
  }
  change(next: Partial<Settings>): void {
    this.value = { ...this.value, ...next };
    try {
      this.store?.setItem(SETTINGS_KEY, JSON.stringify(this.value));
    } catch {
      /* storage blocked: this session only */
    }
    for (const l of this.listeners) l(this.value);
  }
  onChange(l: (s: Settings) => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}

export const settings = new SettingsStore(browserStore());

/** Damage the player takes after the difficulty. */
export function damageTaken(raw: number, s: Settings = settings.current): number {
  return Math.max(1, Math.round(raw * DIFFICULTY[s.difficulty].damageTaken));
}

/** The parry window after parry assist. */
export function parryWindow(baseMs: number, s: Settings = settings.current): number {
  return s.parryAssist ? Math.round(baseMs * PARRY_ASSIST_FACTOR) : baseMs;
}
