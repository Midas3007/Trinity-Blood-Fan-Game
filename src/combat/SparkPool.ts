import Phaser from 'phaser';

interface Spark {
  shape: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  lifeMs: number;
}

const SPARK_SIZE = 2;
const SPARK_GRAVITY = 500;

/** Fixed pool of tiny rectangles used for impact sparks; nothing is allocated during play. */
export class SparkPool {
  private readonly sparks: Spark[] = [];

  constructor(
    scene: Phaser.Scene,
    size: number,
    color: number,
    private readonly lifeMs: number,
    private readonly speed: number,
  ) {
    for (let i = 0; i < size; i++) {
      const shape = scene.add.rectangle(0, 0, SPARK_SIZE, SPARK_SIZE, color).setVisible(false).setDepth(500);
      this.sparks.push({ shape, vx: 0, vy: 0, lifeMs: 0 });
    }
  }

  burst(x: number, y: number, count: number, direction: number): void {
    let spawned = 0;
    for (const s of this.sparks) {
      if (spawned >= count) break;
      if (s.lifeMs > 0) continue;
      // Fan out mostly in the hit direction, slightly upward.
      const angle = (Math.random() - 0.5) * Math.PI * 0.9 - Math.PI * 0.15;
      const speed = this.speed * (0.5 + Math.random() * 0.5);
      s.vx = Math.cos(angle) * speed * (direction >= 0 ? 1 : -1);
      s.vy = Math.sin(angle) * speed;
      s.lifeMs = this.lifeMs;
      s.shape.setPosition(x, y).setVisible(true).setAlpha(1);
      spawned++;
    }
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    for (const s of this.sparks) {
      if (s.lifeMs <= 0) continue;
      s.lifeMs -= dtMs;
      s.vy += SPARK_GRAVITY * dt;
      s.shape.setPosition(s.shape.x + s.vx * dt, s.shape.y + s.vy * dt);
      s.shape.setAlpha(Math.max(0, s.lifeMs / this.lifeMs));
      if (s.lifeMs <= 0) s.shape.setVisible(false);
    }
  }
}
