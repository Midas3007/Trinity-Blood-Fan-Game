import data from '../data/cutscenes.json';
import type { DialogueLine } from '../ui/dialogueLine';

/** Cutscene data (pure, no Phaser): the format of src/data/cutscenes.json. Played by CutsceneScene. */
export interface CutsceneActor {
  anim: string;
  frame?: number;
  /** Feet position as fractions of the panel. */
  x: number;
  y: number;
  scale?: number;
  flip?: boolean;
  enter?: 'left' | 'right' | 'up' | 'fade' | 'none';
  /** Tint (e.g. silhouettes '0x000000', a red glow). */
  tint?: string;
  alpha?: number;
}

export type PanelLayout = 'full' | 'left' | 'right' | 'top' | 'bottom' | 'tl' | 'tr' | 'bl' | 'br' | 'wide';

export interface CutscenePanel {
  layout: PanelLayout;
  /** Image key: 'rooms/<file>' (painted room art), 'title', 'cathedral_front', or 'color:0xRRGGBB'. */
  bg?: string;
  tint?: string;
  actors?: CutsceneActor[];
  caption?: string;
  lines?: DialogueLine[];
  fx?: 'flash' | 'redflash' | 'shake' | 'speedlines' | 'none';
  /** Start a fresh page before this panel. */
  newPage?: boolean;
}

export interface CutsceneData {
  panels: CutscenePanel[];
}


const scenes = (data as unknown as { scenes: Record<string, CutsceneData> }).scenes;

export function cutsceneIds(): string[] {
  return Object.keys(scenes);
}

export function cutscene(id: string): CutsceneData | undefined {
  return scenes[id];
}

/** All image keys a scene needs (to preload). Pure; exported for tests. */
export function cutsceneImages(c: CutsceneData): string[] {
  const keys = new Set<string>();
  for (const p of c.panels) if (p.bg && !p.bg.startsWith('color:')) keys.add(p.bg);
  return [...keys];
}

