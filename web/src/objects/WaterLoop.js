import Phaser from 'phaser';
import { Liquid, T, brickBlock } from '../art.js';
import { sfx } from '../sfx.js';
import { COLORS, DB, label } from '../scenes/style.js';

// Watergirl's channel, set into the floor between x1 and x2, with the Echo Fountain
// at its right end (she presses DOWN there). Fire dies in the water. The fountain
// glows while the key is marked; the mark itself is invisible in the lamps.
export class WaterLoop {
  constructor(scene, x1, x2, floorY) {
    Object.assign(this, { scene, x1, x2, floorY, nextRipple: 0 });
    new Liquid(scene, x1, floorY + 1, x2 - x1, T - 1, 'water');
    brickBlock(scene, x1, floorY + T, (x2 - x1) / T, 2);

    // Echo Fountain: a carved spout low in the back wall, always pouring into the channel.
    const sx = x2 - 16;
    const sy = floorY - 26;
    const spout = scene.add.graphics();
    spout.fillStyle(DB.black).fillRect(sx - 11, sy - 9, 22, 18);
    spout.fillStyle(DB.stone).fillRect(sx - 10, sy - 8, 20, 16);
    spout.fillStyle(DB.slate).fillRect(sx - 10, sy - 8, 20, 2);
    spout.fillStyle(DB.black).fillRect(sx - 4, sy + 2, 8, 4);
    spout.fillStyle(DB.cyan).fillRect(sx - 6, sy - 5, 2, 2).fillRect(sx + 4, sy - 5, 2, 2);
    this.spray = scene.add.particles(sx, sy + 5, 'px', {
      speedX: { min: -18, max: -6 }, speedY: { min: 0, max: 20 }, gravityY: 300, lifespan: 400, frequency: 22, quantity: 2,
      tint: [DB.cyan, DB.white, DB.blue], alpha: { start: 0.9, end: 0.2 },
    });
    this.burst = scene.add.particles(sx, sy + 5, 'px', {
      speed: { min: 30, max: 90 }, angle: { min: 180, max: 300 }, gravityY: 220, lifespan: 600, emitting: false,
      tint: [DB.white, DB.cyan], alpha: { start: 1, end: 0 }, blendMode: Phaser.BlendModes.ADD,
    });
    this.markGlow = scene.add.image(sx, floorY - 14, 'glow').setTint(DB.cyan).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(1.4);
    label(scene, sx - 6, floorY + 21, 'FOUNTAIN', 8, COLORS.dim);   // engraved in the floor
    this.ripples = scene.add.graphics();
    this.rippleList = [];

    // Covers the stone basin over the channel's last 48 px (and the water under it).
    this.fountain = scene.physics.add.existing(scene.add.zone(x2 - 24, floorY - 26, 48, 52), true);
    this.hazard = scene.physics.add.existing(scene.add.zone((x1 + x2) / 2, floorY + 2, x2 - x1 - 8, 6), true);

    scene.events.on('update', this.animate, this);
    scene.events.once('shutdown', () => scene.events.off('update', this.animate, this));
  }

  animate(time, delta) {
    const r = this.ripples.clear();
    for (const rp of this.rippleList) {
      rp.age += delta;
      const t = rp.age / 700;
      r.lineStyle(1, DB.white, 0.7 * (1 - t)).strokeEllipse(rp.x, this.floorY + 3, 6 + 22 * t, 2 + 3 * t);
    }
    this.rippleList = this.rippleList.filter(rp => rp.age < 700);
  }

  // Call every frame with Watergirl's sprite: ripples behind her as she wades.
  update(sprite) {
    const b = sprite.body;
    const inWater = sprite.x > this.x1 && sprite.x < this.x2 && (b.blocked.down || b.touching.down);
    if (inWater && Math.abs(b.velocity.x) > 0 && this.scene.time.now > this.nextRipple) {
      this.rippleList.push({ x: sprite.x, age: 0 });
      this.nextRipple = this.scene.time.now + 140;
    }
  }

  // The fountain was used: chime and spray; it glows while the key is marked.
  splash(marked) {
    sfx.chime(this.scene);
    this.burst.explode(18);
    this.scene.tweens.killTweensOf(this.markGlow);
    this.scene.tweens.add({ targets: this.markGlow, alpha: marked ? 0.7 : 0, duration: 400 });
  }

  setMarked(marked) {
    this.scene.tweens.killTweensOf(this.markGlow);
    this.markGlow.setAlpha(marked ? 0.7 : 0);
  }
}
