import Phaser from 'phaser';
import { COLORS, PLAYERS, W, font } from './style.js';

// Placeholder for the separation: Phase 5 replaces this with the two platforming paths.
export class Vaults extends Phaser.Scene {
  constructor() { super('Vaults'); }

  create() {
    this.add.text(W / 2, 80, 'The doors slam shut!', font(32)).setOrigin(0.5);
    this.add.text(W / 2, 125, 'From here on, no talking: each hero only sees their own vault.', font(18, COLORS.dim)).setOrigin(0.5);
    this.add.rectangle(W / 2, 330, 8, 300, COLORS.outline);   // the wall between them

    const fire = this.add.rectangle(W / 2 - 40, 330, 40, 60, PLAYERS.fire.color);
    const water = this.add.rectangle(W / 2 + 40, 330, 40, 60, PLAYERS.water.color);
    this.tweens.add({ targets: fire, x: 160, duration: 1400, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: water, x: W - 160, duration: 1400, ease: 'Sine.easeInOut' });
    this.add.text(160, 400, 'Fire Vault', font(18)).setOrigin(0.5);
    this.add.text(W - 160, 400, 'Water Vault', font(18)).setOrigin(0.5);

    this.time.delayedCall(2000, () => this.scene.start('Run'));
  }
}
