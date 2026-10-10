import { DB } from '../scenes/style.js';

// The hall lever Fireboy pulls to start (or restart) the search.
export class SpreadLever {
  constructor(scene, x, floorY) {
    this.scene = scene;
    const base = scene.add.graphics();
    base.fillStyle(DB.black).fillRect(x - 8, floorY - 6, 16, 6);
    base.fillStyle(DB.stone).fillRect(x - 7, floorY - 6, 14, 5);
    this.stick = scene.add.graphics({ x, y: floorY - 5 });
    this.stick.fillStyle(DB.black).fillRect(-2, -18, 4, 18);
    this.stick.fillStyle(DB.slate).fillRect(-1, -17, 2, 17);
    this.stick.fillStyle(DB.yellow).fillCircle(0, -18, 3);
    this.stick.rotation = 0.6;
    this.zone = scene.physics.add.existing(scene.add.zone(x, floorY - 12, 22, 24), true);
  }

  pull() {
    this.scene.tweens.killTweensOf(this.stick);
    this.stick.rotation = 0.6;
    this.scene.tweens.add({ targets: this.stick, rotation: -0.6, duration: 160, yoyo: true, hold: 250 });
  }
}
