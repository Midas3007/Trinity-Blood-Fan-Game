import Phaser from 'phaser';
import { fx } from '../../systems/fx';
import { audio } from '../../systems/audio/AudioManager';
import { musicFor } from '../../systems/audio/music';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../constants';
import { DialogueBox } from '../../ui/DialogueBox';
import { cutscene, cutsceneImages, type CutsceneActor, type CutsceneData, type CutscenePanel, type PanelLayout } from '../cutscenes';
import { GothicButton } from '../../ui/GothicButton';

/**
 * Cutscenes as moving manga panels (owner's choice): panels slide onto a black page one by one, each with a
 * painted background drifting slowly, the game's own character sprites posed large inside it, and speech in the
 * dialogue box. Tap advances; SKIP ends. Data: src/data/cutscenes.json (original lines).
 */
const GUTTER = 6;
const BORDER = 0xeadfc4;
const ACTOR_DEPTH = 5;
const PANEL_ENTER_MS = 420;
/** A caption the narrator reads stays up long enough to hear it. */
const CAPTION_VOICED_MS = 3200;
const TEXT_AREA = 74; // the dialogue box covers the bottom; panels stop above it

function rectFor(layout: PanelLayout): Phaser.Geom.Rectangle {
  const W = GAME_WIDTH;
  const H = GAME_HEIGHT - TEXT_AREA;
  const g = GUTTER;
  const hw = (W - g * 3) / 2;
  const hh = (H - g * 3) / 2;
  switch (layout) {
    case 'left':
      return new Phaser.Geom.Rectangle(g, g, hw, H - g * 2);
    case 'right':
      return new Phaser.Geom.Rectangle(g * 2 + hw, g, hw, H - g * 2);
    case 'top':
      return new Phaser.Geom.Rectangle(g, g, W - g * 2, hh);
    case 'bottom':
      return new Phaser.Geom.Rectangle(g, g * 2 + hh, W - g * 2, hh);
    case 'tl':
      return new Phaser.Geom.Rectangle(g, g, hw, hh);
    case 'tr':
      return new Phaser.Geom.Rectangle(g * 2 + hw, g, hw, hh);
    case 'bl':
      return new Phaser.Geom.Rectangle(g, g * 2 + hh, hw, hh);
    case 'br':
      return new Phaser.Geom.Rectangle(g * 2 + hw, g * 2 + hh, hw, hh);
    case 'wide':
      return new Phaser.Geom.Rectangle(g, g + H * 0.18, W - g * 2, H * 0.64);
    default:
      return new Phaser.Geom.Rectangle(g, g, W - g * 2, H - g * 2);
  }
}

export class CutsceneScene extends Phaser.Scene {
  private id = '';
  private data_!: CutsceneData;
  private index = -1;
  private page: Phaser.GameObjects.GameObject[] = [];
  private dialogue!: DialogueBox;
  private caption!: Phaser.GameObjects.Text;
  private ending = false;

  constructor() {
    super(SCENES.cutscene);
  }

  init(d: { id: string }): void {
    this.id = d.id;
    this.data_ = cutscene(d.id) ?? { panels: [] };
    this.index = -1;
    this.page = [];
    this.ending = false;
  }

  preload(): void {
    for (const key of cutsceneImages(this.data_)) {
      if (this.textures.exists(key)) continue;
      if (key.startsWith('rooms/')) this.load.image(key, `assets/${key}.png`);
    }
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050408).setOrigin(0);
    this.dialogue = new DialogueBox(this);
    this.dialogue.onLine = (line) => audio.voice(line.voice);
    audio.music(musicFor({ cutscene: this.id }));
    this.caption = this.add
      .text(GAME_WIDTH / 2, 10, '', { fontFamily: 'serif', fontSize: '10px', color: '#0b0a10', backgroundColor: '#eadfc4', padding: { x: 6, y: 3 } })
      .setOrigin(0.5, 0)
      .setDepth(20)
      .setVisible(false);
    new GothicButton(this, GAME_WIDTH - 34, 14, 'SKIP', () => this.finish(), 48, 16, 30);
    this.next();
  }

  private next(): void {
    if (this.ending) return;
    this.index++;
    const p = this.data_.panels[this.index];
    if (!p) {
      this.finish();
      return;
    }
    if (p.newPage || p.layout === 'full' || p.layout === 'wide') this.clearPage();
    this.drawPanel(p);
    this.caption.setVisible(!!p.caption).setText(p.caption ?? '');
    if (p.lines && p.lines.length) {
      this.dialogue.play(p.lines, () => this.next());
    } else {
      audio.voice(p.captionVoice);
      this.time.delayedCall(p.captionVoice ? CAPTION_VOICED_MS : 1800, () => this.next());
    }
  }

  private clearPage(): void {
    for (const o of this.page) o.destroy();
    this.page = [];
  }

  private drawPanel(p: CutscenePanel): void {
    const r = rectFor(p.layout);
    const container = this.add.container(0, 0).setDepth(2);
    this.page.push(container);
    // Background: painted art cropped to the panel ("cover"), drifting slowly; or a flat colour.
    if (p.bg?.startsWith('color:')) {
      container.add(this.add.rectangle(r.x, r.y, r.width, r.height, Number(p.bg.slice(6))).setOrigin(0));
    } else if (p.bg && this.textures.exists(p.bg)) {
      const img = this.add.image(r.centerX, r.centerY, p.bg);
      const scale = Math.max(r.width / img.width, r.height / img.height) * 1.15;
      img.setScale(scale);
      if (p.tint) img.setTint(Number(p.tint));
      this.tweens.add({ targets: img, x: r.centerX + r.width * 0.05, duration: 9000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
      container.add(img);
    } else {
      container.add(this.add.rectangle(r.x, r.y, r.width, r.height, 0x1a1220).setOrigin(0));
    }
    if (p.fx === 'speedlines') {
      const g = this.add.graphics();
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const len = Math.max(r.width, r.height);
        g.lineStyle(1, 0xffffff, 0.25).lineBetween(r.centerX + Math.cos(a) * len * 0.25, r.centerY + Math.sin(a) * len * 0.25, r.centerX + Math.cos(a) * len, r.centerY + Math.sin(a) * len);
      }
      container.add(g);
    }
    for (const a of p.actors ?? []) container.add(this.actor(a, r));
    // Mask everything to the panel; draw the ink border on top.
    const shape = this.make.graphics({}, false).fillStyle(0xffffff).fillRect(r.x, r.y, r.width, r.height);
    container.setMask(shape.createGeometryMask());
    const border = this.add.graphics().setDepth(3).lineStyle(2, BORDER, 1).strokeRect(r.x, r.y, r.width, r.height);
    this.page.push(border, shape);
    // Slide in like a turned page.
    container.setAlpha(0).setY(10);
    border.setAlpha(0);
    this.tweens.add({ targets: [container], alpha: 1, y: 0, duration: PANEL_ENTER_MS, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: border, alpha: 1, duration: PANEL_ENTER_MS });
    if (p.fx === 'flash') fx.flash(this.cameras.main, 260, 255, 250, 235);
    if (p.fx === 'redflash') fx.flash(this.cameras.main, 380, 212, 40, 62);
    if (p.fx === 'shake') fx.shake(this.cameras.main, 320, 0.012);
  }

  private actor(a: CutsceneActor, r: Phaser.Geom.Rectangle): Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle {
    const x = r.x + r.width * a.x;
    const y = r.y + r.height * a.y;
    if (!this.anims.exists(a.anim)) return this.add.rectangle(x, y - 20, 14, 40, 0x6a1524).setOrigin(0.5, 1);
    const s = this.add.sprite(x, y, '').setOrigin(0.5, 1).setScale(a.scale ?? 2).setFlipX(!!a.flip).setDepth(ACTOR_DEPTH).setAlpha(a.alpha ?? 1);
    if (a.frame === undefined) s.play(a.anim);
    else {
      const f = this.anims.get(a.anim).frames[a.frame];
      if (f) s.setTexture(f.textureKey, f.textureFrame);
    }
    if (a.tint) s.setTint(Number(a.tint));
    const from = a.enter ?? 'fade';
    if (from === 'left') s.x -= r.width * 0.4;
    if (from === 'right') s.x += r.width * 0.4;
    if (from === 'up') s.y -= r.height * 0.4;
    if (from !== 'none') {
      const alpha = s.alpha;
      s.setAlpha(from === 'fade' ? 0 : alpha);
      this.tweens.add({ targets: s, x, y, alpha, duration: 650, ease: 'Cubic.easeOut' });
    }
    return s;
  }

  update(_t: number, dt: number): void {
    this.dialogue.update(dt);
  }

  private finish(): void {
    if (this.ending) return;
    this.ending = true;
    audio.stopVoice();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.game.events.emit(`cutscene-done:${this.id}`);
      this.scene.stop();
    });
  }
}
