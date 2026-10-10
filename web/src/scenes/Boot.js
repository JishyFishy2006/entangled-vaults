import Phaser from 'phaser';

// Loads both shot pools once, before the first scene.
export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.load.json('pool-ideal', 'pools/ideal.json');
    this.load.json('pool-ionq-aria-1', 'pools/ionq-aria-1.json');
  }

  create() {
    this.scene.start('PlanningHall');
  }
}
