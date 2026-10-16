import data from '../../data/music.json';

/** Instruments the procedural composer can play (see AudioManager). */
export type Voice = 'organ' | 'choir' | 'strings' | 'harpsichord' | 'bells';
export type ScaleName = 'minor' | 'harmonic' | 'phrygian' | 'dorian';

/** One piece: an original procedural composition, or a recording when `file` is set. */
export interface TrackDef {
  name: string;
  root: number;
  scale: ScaleName;
  bpm: number;
  beats: number;
  progression: number[];
  voice: Voice;
  arp: boolean;
  melody: boolean;
  drums: boolean;
  seed: number;
  gain: number;
  bells?: boolean;
  choir?: boolean;
  file?: string;
}

interface MusicData {
  tracks: Record<string, TrackDef>;
  menu: string;
  credits: string;
  rooms: Record<string, string>;
  defaultRoom: string;
  bosses: Record<string, string>;
  cutscenes: Record<string, string>;
}

export const music = data as unknown as MusicData;

export function track(key: string): TrackDef | undefined {
  return music.tracks[key];
}

/** What should be playing: a cutscene's piece wins over a fight's, a fight's over the room's. Pure; tested. */
export function musicFor(ctx: { room?: string | undefined; boss?: string | null | undefined; cutscene?: string | null | undefined }): string {
  if (ctx.cutscene && music.cutscenes[ctx.cutscene]) return music.cutscenes[ctx.cutscene] as string;
  if (ctx.boss && music.bosses[ctx.boss]) return music.bosses[ctx.boss] as string;
  if (ctx.room && music.rooms[ctx.room]) return music.rooms[ctx.room] as string;
  return music.defaultRoom;
}
