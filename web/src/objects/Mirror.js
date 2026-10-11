import Phaser from 'phaser';
import { sfx } from '../sfx.js';
import { COLORS, DB, label } from '../scenes/style.js';

// The Mirror Pool's mirror, standing on a high ledge: Watergirl presses DOWN at it.
// It reflects every vault's odds about the average.
export class Mirror {
  constructor(scene, x, ledgeY) {
    this.scene = scene;
    const top = ledgeY - 30;
    const g = scene.add.graphics();
    g.fillStyle(DB.black).fillRect(x - 11, top - 2, 22, 32);
    g.fillStyle(DB.stone).fillRect(x - 10, top - 1, 20, 31);
    g.fillStyle(DB.yellow).fillRect(x - 10, top - 1, 20, 2).fillCircle(x, top - 2, 3);
    g.fillStyle(0x9fc8d8).fillRect(x - 7, top + 3, 14, 24);
    g.fillStyle(DB.white, 0.8).fillRect(x - 5, top + 6, 2, 8).fillRect(x - 3, top + 4, 1, 3);
    g.fillStyle(DB.cyan, 0.6).fillRect(x + 2, top + 16, 3, 8);
    this.flashRect = scene.add.rectangle(x, top + 15, 14, 24, DB.white, 0).setBlendMode(Phaser.BlendModes.ADD);
    this.glow = scene.add.image(x, top + 15, 'glow').setTint(DB.white).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(1.2);
    // Beside it, clear of the title panel.
    label(scene, x + 16, top + 8, 'MIRROR', 8, COLORS.dim, 0);
    label(scene, x + 16, top + 18, '= DIFFUSER', 8, COLORS.dim, 0);
    this.zone = scene.physics.add.existing(scene.add.zone(x, ledgeY - 18, 30, 36), true);
  }

  // Bright for a lap; a dimmer shimmer when it runs a lap backwards or has nothing to do.
  flash(strong = true) {
    sfx.whoosh(this.scene);
    this.flashRect.setAlpha(strong ? 0.9 : 0.4);
    this.glow.setAlpha(strong ? 0.9 : 0.3).setScale(1);
    this.scene.tweens.add({ targets: this.flashRect, alpha: 0, duration: 500 });
    this.scene.tweens.add({ targets: this.glow, alpha: 0, scale: strong ? 3 : 1.6, duration: 600 });
  }
}
