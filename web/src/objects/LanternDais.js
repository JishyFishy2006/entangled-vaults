import Phaser from 'phaser';
import { COLORS, DB, label } from '../scenes/style.js';

// The raised dais Fireboy stands on to read. Solid on top; a zone above it detects him.
export class LanternDais {
  constructor(scene, x1, x2, floorY, solids, height = 16) {
    this.scene = scene;
    const top = floorY - height;
    scene.add.rectangle((x1 + x2) / 2, top + height / 2, x2 - x1, height, DB.brown).setStrokeStyle(1, DB.orange);
    solids.add(scene.add.zone((x1 + x2) / 2, top + height / 2, x2 - x1, height));
    label(scene, (x1 + x2) / 2, top - 44, 'DAIS', 8, COLORS.dim);
    this.zone = scene.physics.add.existing(scene.add.zone((x1 + x2) / 2, top - 14, x2 - x1, 28), true);
    this.flare = scene.add.image((x1 + x2) / 2, top - 20, 'glow').setTint(0xffb050).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(2);
  }

  flash() {
    this.flare.setAlpha(1).setScale(1);
    this.scene.tweens.add({ targets: this.flare, alpha: 0, scale: 4, duration: 600 });
  }
}
