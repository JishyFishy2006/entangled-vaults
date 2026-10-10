import Phaser from 'phaser';
import { Liquid, T, brickBlock, gem, heroSprite, keyHint, templeBackground, vaultDoor } from '../art.js';
import { COLORS, DB, H, W, label } from './style.js';

const FLOOR = 320;

export class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    templeBackground(this, { seed: 7, candles: [[96, 150], [544, 150]] });

    // Floor with a lava and a water pool sunk into it.
    brickBlock(this, 0, FLOOR, 4, 3);
    new Liquid(this, 64, FLOOR + 4, 48, 28, 'lava');
    brickBlock(this, 112, FLOOR, 26, 3);
    new Liquid(this, 528, FLOOR + 4, 48, 28, 'water');
    brickBlock(this, 576, FLOOR, 4, 3);
    // Pool beds (the liquid sits in a one-tile-deep recess).
    brickBlock(this, 64, FLOOR + T * 2, 3, 1);
    brickBlock(this, 528, FLOOR + T * 2, 3, 1);

    vaultDoor(this, 200, FLOOR, 'fire');
    vaultDoor(this, 440, FLOOR, 'water');
    heroSprite(this, 'fire', 236, FLOOR);
    heroSprite(this, 'water', 404, FLOOR).setFlipX(true).setOrigin(1 - 63 / 128, 1);

    label(this, W / 2, 56, 'ENTANGLED', 32, COLORS.gold);
    label(this, W / 2, 92, 'VAULTS', 32, COLORS.gold);
    label(this, W / 2, 124, 'Level 1: The Twin Vaults', 8, COLORS.dim);

    // Two gems linked by a shimmering thread: one flips, the other always answers.
    const red = gem(this, W / 2 - 40, 186, 9, 'red');
    const blue = gem(this, W / 2 + 40, 186, 9, 'blue');
    const thread = this.add.graphics();
    let tick = 0;
    this.time.addEvent({
      delay: 600, loop: true, callback: () => {
        tick++;
        const c = tick % 2 ? 'red' : 'blue';
        red.setGem(c); blue.setGem(c);
        for (const g of [red, blue]) { g.setScale(1.25); this.tweens.add({ targets: g, scale: 1, duration: 250 }); }
      },
    });
    this.events.on('update', () => {
      const t = this.time.now / 1000;
      thread.clear();
      for (let x = -30; x <= 30; x += 2) {
        const y = Math.round(3 * Math.sin(t * 4 + x * 0.25));
        thread.fillStyle(x % 4 ? DB.cyan : DB.yellow, 0.4 + 0.4 * Math.sin(t * 6 + x)).fillRect(W / 2 + x, 186 + y, 2, 2);
      }
    });

    const start = label(this, W / 2, 218, 'Press SPACE to begin', 16, COLORS.text);
    this.tweens.add({ targets: start, alpha: 0.25, duration: 600, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [2] });
    keyHint(this, W / 2 - 50, 242, ['P'], 'how it works');
    this.add.graphics().fillStyle(DB.black, 0.85).fillRect(0, H - 14, W, 14);
    label(this, W / 2, H - 7, 'Art: chierit, DragonDePlatino & DawnBringer (CC BY 4.0)', 8, COLORS.dim);

    this.input.keyboard.once('keydown-SPACE', () => this.go('PlanningHall'));
    this.input.keyboard.once('keydown-ENTER', () => this.go('PlanningHall'));
    this.input.keyboard.once('keydown-P', () => this.go('Pitch'));
  }

  go(scene) {
    this.cameras.main.fadeOut(250, 20, 12, 28);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene));
  }
}
