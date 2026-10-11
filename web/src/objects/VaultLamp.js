import Phaser from 'phaser';
import { DB } from '../scenes/style.js';

// A small bronze lantern above a vault. Two things show its odds:
//   flame - how this vault compares with an even split (all lit at the start),
//   glow  - the actual chance this vault would unseal if Fireboy read right now.
// Both glide between lap counts. blink() is the read animation's instant flash.
export class VaultLamp {
  constructor(scene, x, y) {
    Object.assign(this, { scene, glowLevel: 0 });
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
      if (this.glowLevel > 0.02 && !this.blinking) this.glow.setAlpha(Math.min(1, 0.25 + this.glowLevel) * (0.75 + Math.random() * 0.25));
    } });
  }

  // flame: 0..1 compared with an even split; glow: the chance itself, 0..1.
  set(flame, glow) {
    this.blinking = false;
    this.glowLevel = glow;
    const f = Math.min(1, flame);
    this.scene.tweens.killTweensOf([this.flame, this.core, this.glow]);
    this.scene.tweens.add({ targets: this.flame, alpha: 0.06 + 0.94 * f, scaleX: 1 + f * 0.4, scaleY: 1 + f * 0.4, duration: 700, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({ targets: this.core, alpha: f * 0.8 + glow * 0.2, duration: 700 });
    this.scene.tweens.add({
      targets: this.glow, alpha: glow > 0.02 ? Math.min(1, 0.25 + glow) : 0, scale: 0.4 + 1.6 * glow, duration: 700, ease: 'Sine.easeInOut',
    });
  }

  // Instant on/off for the read animation.
  blink(on) {
    this.blinking = true;
    this.scene.tweens.killTweensOf([this.flame, this.core, this.glow]);
    this.flame.setAlpha(on ? 1 : 0.08).setScale(on ? 1.5 : 1);
    this.core.setAlpha(on ? 1 : 0);
    this.glow.setAlpha(on ? 0.9 : 0).setScale(on ? 1.2 : 0.4);
  }
}
