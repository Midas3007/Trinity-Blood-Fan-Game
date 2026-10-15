import Phaser from 'phaser';

/** Colours shared by the gothic menu pieces (title, pause). */
export const GOTHIC = {
  plate: 0x1a1220,
  plateLit: 0x3a1420,
  pressed: 0x6a1626,
  gold: 0xc4a04a,
  goldDark: 0x6e5222,
  text: '#eadfc4',
  textLit: '#fff3d6',
} as const;

const ORNAMENT = 3;

/**
 * A plaque-style menu button: dark plate, double gold border, diamond studs at each end.
 * Every part has scroll factor 0 on its own (a Container's scroll factor does not move its children's
 * tap areas, which left the old pause menu untappable once the camera scrolled).
 * Fires on release over the button, like a native button; the press itself never reaches gameplay input.
 */
export class GothicButton {
  private readonly plate: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly zone: Phaser.GameObjects.Zone;
  private down = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    onPress: () => void,
    private readonly w = 132,
    private readonly h = 22,
    depth = 0,
  ) {
    this.plate = scene.add.graphics().setScrollFactor(0).setDepth(depth).setPosition(x, y);
    this.label = scene.add
      .text(x, y, text, { fontFamily: 'serif', fontSize: '12px', color: GOTHIC.text, stroke: '#0b0a10', strokeThickness: 2 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(depth + 1);
    this.zone = scene.add.zone(x, y, w + 8, h + 8).setScrollFactor(0).setDepth(depth + 2).setInteractive({ useHandCursor: true });
    this.draw(GOTHIC.plate);

    const stop = (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData): void => e.stopPropagation();
    this.zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer, lx: number, ly: number, e: Phaser.Types.Input.EventData) => {
      stop(p, lx, ly, e);
      this.down = true;
      this.draw(GOTHIC.pressed);
    });
    this.zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      this.down = false;
      this.draw(GOTHIC.plate);
    });
    this.zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => this.draw(GOTHIC.plateLit));
    this.zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (p: Phaser.Input.Pointer, lx: number, ly: number, e: Phaser.Types.Input.EventData) => {
      stop(p, lx, ly, e);
      const was = this.down;
      this.down = false;
      this.draw(GOTHIC.plate);
      if (was && this.zone.visible) onPress();
    });
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  setVisible(on: boolean): this {
    this.plate.setVisible(on);
    this.label.setVisible(on);
    this.zone.setVisible(on);
    if (on) this.zone.setInteractive();
    else this.zone.disableInteractive();
    this.down = false;
    this.draw(GOTHIC.plate);
    return this;
  }

  get objects(): Phaser.GameObjects.GameObject[] {
    return [this.plate, this.label, this.zone];
  }

  private draw(fill: number): void {
    const g = this.plate;
    const { w, h } = this;
    g.clear();
    g.fillStyle(fill, 0.94).fillRect(-w / 2, -h / 2, w, h);
    g.lineStyle(1, GOTHIC.gold, 1).strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
    g.lineStyle(1, GOTHIC.goldDark, 1).strokeRect(-w / 2 + 2.5, -h / 2 + 2.5, w - 5, h - 5);
    this.label?.setColor(fill === GOTHIC.plate ? GOTHIC.text : GOTHIC.textLit);
    // diamond studs on the ends
    for (const sx of [-w / 2, w / 2]) {
      g.fillStyle(GOTHIC.gold, 1).fillPoints(
        [new Phaser.Math.Vector2(sx, -ORNAMENT - 1), new Phaser.Math.Vector2(sx + ORNAMENT + 1, 0), new Phaser.Math.Vector2(sx, ORNAMENT + 1), new Phaser.Math.Vector2(sx - ORNAMENT - 1, 0)],
        true,
      );
      g.fillStyle(GOTHIC.pressed, 1).fillRect(sx - 1, -1, 2, 2);
    }
  }
}
