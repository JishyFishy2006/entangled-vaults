import Phaser from 'phaser';
import { DB } from '../scenes/style.js';

// The hall lever Fireboy pulls to start (or restart) the search.
export class SpreadLever {
  constructor(scene, x, floorY) {
    this.scene = scene;
    const base = scene.add.graphics();
    base.fillStyle(DB.black).fillRect(x - 10, floorY - 8, 20, 8);
    base.fillStyle(DB.stone).fillRect(x - 9, floorY - 8, 18, 7);
    base.fillStyle(DB.slate).fillRect(x - 9, floorY - 8, 18, 2);
    base.fillStyle(DB.yellow).fillRect(x - 2, floorY - 6, 4, 3);
    this.stick = scene.add.graphics({ x, y: floorY - 7 });
    this.stick.fillStyle(DB.black).fillRect(-2, -20, 4, 20);
    this.stick.fillStyle(DB.brown).fillRect(-1, -19, 2, 19);
    this.stick.fillStyle(DB.black).fillCircle(0, -21, 4);
    this.stick.fillStyle(DB.yellow).fillCircle(0, -21, 3);
    this.stick.fillStyle(DB.white).fillRect(-1, -23, 1, 1);
    this.stick.rotation = 0.6;
    this.sparks = scene.add.particles(x, floorY - 10, 'px', {
      speed: { min: 20, max: 60 }, angle: { min: 220, max: 320 }, lifespan: 400, gravityY: 120,
      tint: [DB.yellow, DB.orange], alpha: { start: 1, end: 0 }, emitting: false, blendMode: Phaser.BlendModes.ADD,
    });
    this.zone = scene.physics.add.existing(scene.add.zone(x, floorY - 12, 22, 24), true);
  }

  pull() {
    this.scene.tweens.killTweensOf(this.stick);
    this.stick.rotation = 0.6;
    this.scene.tweens.add({ targets: this.stick, rotation: -0.6, duration: 160, yoyo: true, hold: 250 });
    this.sparks.explode(10);
  }
}
