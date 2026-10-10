import Phaser from 'phaser';
import { DB } from '../scenes/style.js';

// A small bronze lantern above a vault: its flame shows the chance this vault would
// unseal if Fireboy read right now. Brightness glides between lap counts.
export class VaultLamp {
  constructor(scene, x, y) {
    Object.assign(this, { scene, level: 0 });
    const g = scene.add.graphics();
    for (let cy = y - 14; cy < y - 6; cy += 3) g.fillStyle(DB.iron).fillRect(x - 1, cy, 2, 2);   // chain
    g.fillStyle(DB.black).fillRect(x - 5, y - 7, 10, 15);
    g.fillStyle(DB.brown).fillRect(x - 4, y - 6, 8, 13);
    g.fillStyle(DB.orange).fillRect(x - 5, y - 7, 10, 2).fillRect(x - 5, y + 6, 10, 2);
    g.fillStyle(0x15171d).fillRect(x - 3, y - 4, 6, 9);
    this.glow = scene.add.image(x, y, 'glow').setTint(0xffc860).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(0.4);
    this.flame = scene.add.ellipse(x, y + 1, 4, 7, DB.yellow).setAlpha(0.06);
    this.core = scene.add.ellipse(x, y + 2, 2, 3, DB.white).setAlpha(0);
    // A gentle flicker on lit lamps.
    scene.time.addEvent({ delay: 120 + Math.random() * 80, loop: true, callback: () => {
      if (this.level > 0.02) this.glow.setAlpha(Math.min(1, this.level) * (0.75 + Math.random() * 0.25));
    } });
  }

  set(level) {
    this.level = level;
    const a = Math.min(1, level);
    this.scene.tweens.killTweensOf([this.flame, this.core, this.glow]);
    this.scene.tweens.add({ targets: this.flame, alpha: 0.06 + 0.94 * a, scaleX: 1 + a * 0.6, scaleY: 1 + a * 0.6, duration: 700, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({ targets: this.core, alpha: a, duration: 700 });
    this.scene.tweens.add({ targets: this.glow, alpha: a, scale: 0.4 + 1.3 * a, duration: 700, ease: 'Sine.easeInOut' });
  }
}
