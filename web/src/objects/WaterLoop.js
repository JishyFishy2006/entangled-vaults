import Phaser from 'phaser';
import { Liquid, T, brickBlock } from '../art.js';
import { sfx } from '../sfx.js';
import { COLORS, DB, label } from '../scenes/style.js';

// Watergirl's swim channel, set into the floor between x1 and x2: the Echo Fountain
// at the right end, the Mirror Pool at the left. Touching the Fountain, then the Pool,
// is one lap (in that order only). Fire dies in it. A portcullis drops at the lap cap.
export class WaterLoop {
  constructor(scene, x1, x2, floorY, onLap) {
    Object.assign(this, { scene, x1, x2, floorY, onLap, armed: false, nextRipple: 0 });
    new Liquid(scene, x1, floorY + 1, x2 - x1, T - 1, 'water');
    brickBlock(scene, x1, floorY + T, (x2 - x1) / T, 2);

    // Echo Fountain: a carved spout in the back wall, always pouring into the channel.
    const sx = x2 - 16;
    const sy = floorY - 40;
    const spout = scene.add.graphics();
    spout.fillStyle(DB.black).fillRect(sx - 11, sy - 9, 22, 18);
    spout.fillStyle(DB.stone).fillRect(sx - 10, sy - 8, 20, 16);
    spout.fillStyle(DB.slate).fillRect(sx - 10, sy - 8, 20, 2);
    spout.fillStyle(DB.black).fillRect(sx - 4, sy + 2, 8, 4);
    spout.fillStyle(DB.cyan).fillRect(sx - 6, sy - 5, 2, 2).fillRect(sx + 4, sy - 5, 2, 2);
    this.spray = scene.add.particles(sx, sy + 5, 'px', {
      speedX: { min: -18, max: -6 }, speedY: { min: 0, max: 20 }, gravityY: 300, lifespan: 500, frequency: 22, quantity: 2,
      tint: [DB.cyan, DB.white, DB.blue], alpha: { start: 0.9, end: 0.2 },
    });
    this.burst = scene.add.particles(sx, sy + 5, 'px', {
      speed: { min: 30, max: 90 }, angle: { min: 180, max: 300 }, gravityY: 220, lifespan: 600, emitting: false,
      tint: [DB.white, DB.cyan], alpha: { start: 1, end: 0 }, blendMode: Phaser.BlendModes.ADD,
    });
    this.fountainGlow = scene.add.image(sx, floorY - 16, 'glow').setTint(DB.cyan).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(1.4);
    label(scene, sx - 6, floorY + 21, 'FOUNTAIN', 8, COLORS.dim);   // engraved in the floor

    // Mirror Pool: framed by two stone posts, its surface glinting like glass.
    const px1 = x1 + 2;
    const px2 = x1 + 30;
    const posts = scene.add.graphics();
    for (const x of [px1, px2]) {
      posts.fillStyle(DB.black).fillRect(x - 3, floorY - 18, 6, 18);
      posts.fillStyle(DB.stone).fillRect(x - 2, floorY - 17, 4, 17);
      posts.fillStyle(DB.slate).fillCircle(x, floorY - 19, 3);
    }
    this.glints = scene.add.graphics();
    this.mirrorFlash = scene.add.rectangle((px1 + px2) / 2, floorY - 6, px2 - px1, 22, DB.white, 0).setBlendMode(Phaser.BlendModes.ADD);
    label(scene, (px1 + px2) / 2 + 6, floorY + 21, 'MIRROR', 8, COLORS.dim);
    this.ripples = scene.add.graphics();
    this.rippleList = [];

    this.fountain = scene.physics.add.existing(scene.add.zone(x2 - 16, floorY - 20, 32, 40), true);
    this.pool = scene.physics.add.existing(scene.add.zone(x1 + 16, floorY - 20, 32, 40), true);
    this.hazard = scene.physics.add.existing(scene.add.zone((x1 + x2) / 2, floorY + 2, x2 - x1 - 8, 6), true);

    // The portcullis that closes the loop at the lap cap: hidden up under the bridge until then.
    const gx = Math.round((x1 + x2) / 2);
    this.gate = scene.add.graphics();
    this.gate.fillStyle(DB.black).fillRect(gx - 5, floorY - 52, 10, 52);
    for (let k = 0; k < 3; k++) this.gate.fillStyle(DB.slate).fillRect(gx - 4 + k * 3, floorY - 51, 2, 51);
    for (let y = floorY - 44; y < floorY; y += 14) this.gate.fillStyle(DB.iron).fillRect(gx - 5, y, 10, 3);
    this.gate.setMask(scene.make.graphics({}, false).fillRect(gx - 6, floorY - 52, 12, 52).createGeometryMask());
    this.gate.y = -52;
    this.gateZone = scene.physics.add.existing(scene.add.zone(gx, floorY - 24, 8, 48), true);
    this.gateZone.body.enable = false;

    scene.events.on('update', this.animate, this);
    scene.events.once('shutdown', () => scene.events.off('update', this.animate, this));
  }

  animate(time, delta) {
    // Glints sliding across the mirror pool.
    const g = this.glints.clear();
    for (let k = 0; k < 4; k++) {
      const x = this.x1 + 6 + ((time / 25 + k * 7) % 22);
      g.fillStyle(DB.white, 0.6).fillRect(Math.round(x), this.floorY + 2 + (k % 2) * 3, 3, 1);
    }
    // Ripples spreading behind the swimmer.
    const r = this.ripples.clear();
    for (const rp of this.rippleList) {
      rp.age += delta;
      const t = rp.age / 700;
      r.lineStyle(1, DB.white, 0.7 * (1 - t)).strokeEllipse(rp.x, this.floorY + 3, 6 + 22 * t, 2 + 3 * t);
    }
    this.rippleList = this.rippleList.filter(rp => rp.age < 700);
  }

  // Call every frame with Watergirl's sprite.
  update(sprite) {
    const world = this.scene.physics.world;
    const b = sprite.body;
    const inWater = sprite.x > this.x1 && sprite.x < this.x2 && (b.blocked.down || b.touching.down);
    if (inWater && Math.abs(b.velocity.x) > 0 && this.scene.time.now > this.nextRipple) {
      this.rippleList.push({ x: sprite.x, age: 0 });
      this.nextRipple = this.scene.time.now + 140;
    }
    if (world.overlap(sprite, this.fountain) && !this.armed) {
      this.armed = true;
      sfx.chime(this.scene);
      this.burst.explode(18);
      this.fountainGlow.setAlpha(0.9);
      this.scene.tweens.add({ targets: this.fountainGlow, alpha: 0, duration: 700 });
    }
    if (world.overlap(sprite, this.pool) && this.armed) {
      this.armed = false;
      sfx.whoosh(this.scene);
      this.mirrorFlash.setAlpha(0.8);
      this.scene.tweens.add({ targets: this.mirrorFlash, alpha: 0, duration: 500 });
      this.onLap();
    }
  }

  setGate(closed) {
    if (this.gateZone.body.enable === closed) return;
    this.gateZone.body.enable = closed;
    this.scene.tweens.killTweensOf(this.gate);
    this.scene.tweens.add({ targets: this.gate, y: closed ? 0 : -52, duration: closed ? 250 : 500, ease: closed ? 'Bounce.easeOut' : 'Sine.easeIn' });
    if (closed) sfx.door(this.scene);
  }

  reset() {
    this.armed = false;
  }
}
