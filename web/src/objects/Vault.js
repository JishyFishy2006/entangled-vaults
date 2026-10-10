import Phaser from 'phaser';
import { sfx } from '../sfx.js';
import { DB } from '../scenes/style.js';

// One vault door in a stone frame: sealed (gold seal), unsealed (seal shattered, warm
// glow), or open (door raised: the key, or an empty dark vault).
export class Vault {
  constructor(scene, index, cx, floorY, w = 20, h = 36) {
    Object.assign(this, { scene, index, cx, floorY, w, h, state: null });
    this.g = scene.add.graphics();
    this.halo = scene.add.rectangle(cx, floorY - h / 2, w + 8, h + 6, DB.yellow, 0).setBlendMode(Phaser.BlendModes.ADD);
    this.shards = scene.add.particles(cx, floorY - h / 2, 'px', {
      speed: { min: 30, max: 90 }, gravityY: 200, lifespan: 600, emitting: false,
      tint: [DB.yellow, DB.orange, DB.white], alpha: { start: 1, end: 0 },
    });
    this.motes = scene.add.particles(cx, floorY - 4, 'px', {
      speedY: { min: -30, max: -12 }, speedX: { min: -6, max: 6 }, lifespan: 900, frequency: 120, emitting: false,
      x: { min: -w / 2, max: w / 2 }, tint: [DB.yellow, DB.white], alpha: { start: 0.9, end: 0 }, blendMode: Phaser.BlendModes.ADD,
    });
    this.zone = scene.physics.add.existing(scene.add.zone(cx, floorY - h / 2, w + 4, h), true);
    this.setState('sealed');
  }

  setState(state, hasKey = false) {
    if (state === this.state && state !== 'open') return;
    const was = this.state;
    this.state = state;
    const { g, cx, floorY, w, h } = this;
    const x = cx - w / 2;
    const y = floorY - h;
    g.clear();
    // Stone frame.
    g.fillStyle(DB.black).fillRect(x - 4, y - 5, w + 8, h + 5);
    g.fillStyle(DB.stone).fillRect(x - 3, y - 4, w + 6, h + 4);
    g.fillStyle(DB.slate).fillRect(x - 3, y - 4, w + 6, 2);
    g.fillStyle(DB.black).fillRect(x, y, w, h);
    this.scene.tweens.killTweensOf(this.halo);
    this.halo.setAlpha(0);
    this.motes.stop();

    if (state === 'open') {
      g.fillStyle(0x1e1626).fillRect(x + 1, y + 1, w - 2, h - 1);
      if (hasKey) {
        g.fillStyle(DB.black).fillCircle(cx, y + 13, 5);
        g.fillStyle(DB.yellow).fillCircle(cx, y + 13, 4);
        g.fillStyle(0x1e1626).fillCircle(cx, y + 13, 1.5);
        g.fillStyle(DB.yellow).fillRect(cx - 1, y + 16, 2, 12).fillRect(cx, y + 24, 4, 2).fillRect(cx, y + 20, 3, 2);
        this.motes.start();
      }
      return;
    }
    // Iron (sealed) or warm bronze (unsealed) door with rivets.
    const unsealed = state === 'unsealed';
    g.fillStyle(unsealed ? 0x7a3020 : DB.iron).fillRect(x + 1, y + 1, w - 2, h - 1);
    g.fillStyle(unsealed ? DB.orange : DB.stone).fillRect(x + 1, y + 1, w - 2, 2);
    for (const [rx, ry] of [[x + 3, y + 5], [x + w - 4, y + 5], [x + 3, y + h - 4], [x + w - 4, y + h - 4]]) {
      g.fillStyle(unsealed ? DB.yellow : DB.slate).fillRect(rx, ry, 1, 1);
    }
    if (!unsealed) {
      // The gold seal.
      g.fillStyle(DB.black).fillCircle(cx, y + h / 2, 5);
      g.fillStyle(DB.brown).fillCircle(cx, y + h / 2, 4);
      g.fillStyle(DB.yellow).fillCircle(cx, y + h / 2 - 1, 3);
      g.fillStyle(DB.brown).fillRect(cx - 1, y + h / 2 - 2, 2, 2);
      return;
    }
    // Unsealed: glowing, with motes rising; shatter the seal if it was just broken.
    this.halo.setAlpha(0.15);
    this.scene.tweens.add({ targets: this.halo, alpha: 0.45, duration: 500, yoyo: true, repeat: -1 });
    this.motes.start();
    if (was === 'sealed') {
      this.shards.explode(20, cx, y + h / 2);
      sfx.unseal(this.scene);
    }
  }
}
