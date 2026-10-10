import { Liquid } from '../art.js';
import { COLORS, DB, label } from '../scenes/style.js';

// Watergirl's swim track: water set into the floor between x1 and x2, with the
// Echo Fountain at the right end and the Mirror Pool at the left. Touching the
// Fountain, then the Pool, is one lap (in that order only). Fire dies in it.
export class WaterLoop {
  constructor(scene, x1, x2, floorY, onLap) {
    Object.assign(this, { scene, onLap, armed: false });
    new Liquid(scene, x1, floorY + 1, x2 - x1, 15, 'water');
    const g = scene.add.graphics();
    // Placeholder markers for the two ends.
    g.fillStyle(DB.cyan, 0.35).fillRect(x2 - 32, floorY - 40, 32, 40);
    g.fillStyle(DB.blue, 0.35).fillRect(x1, floorY - 40, 32, 40);
    label(scene, x2 - 16, floorY - 48, 'FOUNTAIN', 8, COLORS.text);
    label(scene, x1 + 16, floorY - 48, 'POOL', 8, COLORS.text);
    this.fountain = scene.physics.add.existing(scene.add.zone(x2 - 16, floorY - 20, 32, 40), true);
    this.pool = scene.physics.add.existing(scene.add.zone(x1 + 16, floorY - 20, 32, 40), true);
    this.hazard = scene.physics.add.existing(scene.add.zone((x1 + x2) / 2, floorY + 2, x2 - x1 - 8, 6), true);
    this.fountainGlow = scene.add.rectangle(x2 - 16, floorY - 20, 32, 40, DB.white, 0);

    // The gate that closes the loop at the lap cap (sits in the middle of the channel).
    const gx = Math.round((x1 + x2) / 2);
    this.gate = scene.add.rectangle(gx, floorY - 24, 8, 48, DB.slate).setVisible(false);
    this.gateZone = scene.physics.add.existing(scene.add.zone(gx, floorY - 24, 8, 48), true);
    this.gateZone.body.enable = false;
  }

  // Call every frame with Watergirl's sprite.
  update(sprite) {
    const world = this.scene.physics.world;
    if (world.overlap(sprite, this.fountain) && !this.armed) {
      this.armed = true;
      this.fountainGlow.setAlpha(0.5);
      this.scene.tweens.add({ targets: this.fountainGlow, alpha: 0, duration: 400 });
    }
    if (world.overlap(sprite, this.pool) && this.armed) {
      this.armed = false;
      this.onLap();
    }
  }

  setGate(closed) {
    this.gate.setVisible(closed);
    this.gateZone.body.enable = closed;
  }

  reset() {
    this.armed = false;
  }
}
