import Phaser from 'phaser';
import { DB } from '../scenes/style.js';

// A lamp above a vault: brightness shows the chance this vault would unseal now.
export class VaultLamp {
  constructor(scene, x, y) {
    this.scene = scene;
    scene.add.circle(x, y, 7, DB.black);
    this.glow = scene.add.image(x, y, 'glow').setTint(DB.yellow).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(0.6);
    this.bulb = scene.add.circle(x, y, 5, DB.yellow).setAlpha(0.08);
  }

  set(level) {
    const a = Math.min(1, level);
    this.scene.tweens.killTweensOf([this.bulb, this.glow]);
    this.scene.tweens.add({ targets: this.bulb, alpha: 0.08 + 0.92 * a, duration: 300 });
    this.scene.tweens.add({ targets: this.glow, alpha: 0.9 * a, scale: 0.4 + a, duration: 300 });
  }
}
