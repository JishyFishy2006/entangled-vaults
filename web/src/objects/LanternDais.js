import Phaser from 'phaser';
import { T, brickBlock } from '../art.js';
import { COLORS, DB, label } from '../scenes/style.js';

// The raised dais Fireboy stands on to read: a sandstone step with a gold rune inlay.
// Solid on top; a zone just above it detects him. flash() is the read's burst of light.
export class LanternDais {
  constructor(scene, x1, x2, floorY, solids, height = T) {
    this.scene = scene;
    const top = floorY - height;
    const cx = (x1 + x2) / 2;
    brickBlock(scene, x1, top, (x2 - x1) / T, height / T);
    const runes = scene.add.graphics();
    runes.fillStyle(DB.yellow, 0.8).fillRect(cx - 12, top + 6, 24, 2).fillRect(cx - 1, top + 3, 2, 8).fillRect(cx - 8, top + 4, 2, 6).fillRect(cx + 6, top + 4, 2, 6);
    solids.add(scene.add.zone(cx, top + height / 2, x2 - x1, height));
    label(scene, cx, floorY + 18, 'DAIS', 8, COLORS.dim);   // engraved in the floor below
    this.zone = scene.physics.add.existing(scene.add.zone(cx, top - 14, x2 - x1, 28), true);
    this.flare = scene.add.image(cx, top - 20, 'glow').setTint(0xffb050).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(2).setDepth(4);
    this.rays = scene.add.graphics({ x: cx, y: top - 20 }).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(4);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      this.rays.lineStyle(2, DB.yellow, 0.8).lineBetween(Math.cos(a) * 10, Math.sin(a) * 10, Math.cos(a) * 60, Math.sin(a) * 60);
    }
    this.sparks = scene.add.particles(cx, top - 20, 'px', {
      speed: { min: 40, max: 120 }, lifespan: 600, emitting: false,
      tint: [DB.yellow, DB.white, DB.orange], alpha: { start: 1, end: 0 }, blendMode: Phaser.BlendModes.ADD,
    }).setDepth(4);
  }

  flash() {
    this.flare.setAlpha(1).setScale(1);
    this.scene.tweens.add({ targets: this.flare, alpha: 0, scale: 5, duration: 700 });
    this.rays.setAlpha(1).setScale(0.6).setRotation(0);
    this.scene.tweens.add({ targets: this.rays, alpha: 0, scale: 1.6, rotation: 0.6, duration: 700 });
    this.sparks.explode(24);
  }
}
