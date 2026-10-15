/** Shapes of public/assets/sprites/index.json (written by tools/spritegen) and pure helpers to turn it into
 * Phaser animation definitions. Kept free of Phaser so it can be unit tested. */

export interface ManifestAnimation {
  frames: number[];
  durations_ms: number[];
  loop: boolean;
  attack?: string;
  events?: { frame: number; type: string; id?: string }[];
}

export interface SheetManifest {
  sheet: string;
  entity: string;
  cell_width: number;
  cell_height: number;
  pivot_x: number;
  pivot_y: number;
  columns: number;
  animations: Record<string, ManifestAnimation>;
}

export interface SpriteIndex {
  sheets: Record<string, SheetManifest>;
}

export interface SheetLoad {
  /** Texture key: the sheet file name without extension, e.g. "abel_run". */
  key: string;
  url: string;
  frameWidth: number;
  frameHeight: number;
}

export interface AnimDef {
  /** Animation key "<entity>_<animation>", e.g. "abel_run". */
  key: string;
  texture: string;
  frames: { frame: number; duration: number }[];
  repeat: number;
}

export const SPRITES_BASE = 'assets/sprites/';

export function textureKey(sheetPath: string): string {
  const file = sheetPath.split('/').pop() ?? sheetPath;
  return file.replace(/\.png$/, '');
}

export function sheetLoads(index: SpriteIndex): SheetLoad[] {
  return Object.entries(index.sheets).map(([path, m]) => ({
    key: textureKey(path),
    url: SPRITES_BASE + path,
    frameWidth: m.cell_width,
    frameHeight: m.cell_height,
  }));
}

export function animDefs(index: SpriteIndex): AnimDef[] {
  const out: AnimDef[] = [];
  for (const [path, m] of Object.entries(index.sheets)) {
    for (const [name, a] of Object.entries(m.animations)) {
      if (a.frames.length !== a.durations_ms.length) {
        throw new Error(`${path} ${name}: ${a.frames.length} frames but ${a.durations_ms.length} durations`);
      }
      out.push({
        key: `${m.entity}_${name}`,
        texture: textureKey(path),
        frames: a.frames.map((frame, i) => ({ frame, duration: a.durations_ms[i] ?? 100 })),
        repeat: a.loop ? -1 : 0,
      });
    }
  }
  return out;
}
