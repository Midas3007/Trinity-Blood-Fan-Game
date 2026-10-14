/** Fixed internal resolution (16:9). The canvas is scaled to fit the screen. */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

export const SCENES = {
  boot: 'Boot',
  menu: 'Menu',
  play: 'Play',
} as const;

export const FAN_NOTICE =
  'Unofficial fan-made project. Not affiliated with or endorsed by the rights holders of Trinity Blood.';

export const COLORS = {
  background: 0x0b0a10,
  floor: 0x3a3442,
  player: 0xc9c2d6,
  accent: 0x8e1b2c,
  stone: 0x6f6676,
  flash: 0xefeaf2,
  spark: 0xd9963a,
  hitbox: 0xd4283e,
  text: '#c9c2d6',
  textDim: '#8a8296',
} as const;

/** Max simultaneous touches Phaser tracks (stick + several buttons). */
export const MAX_TOUCH_POINTERS = 5;
