import Phaser from 'phaser';
import { COLORS, H, PLAYERS, W, font } from './style.js';

const GROUND_Y = 500;
const SPEED = 200;
const JUMP = 430;          // with gravity 900: ~100 px high, ~190 px across on flat ground
const HERO = { w: 24, h: 36 };
const POOL_COLOR = { lava: 0xff5722, water: 0x29b6f6 };

// Fireboy's path on the left half, running from the wall out to his vault.
// Watergirl's path is the mirror image on the right half. `own` pools are the
// hero's own element (safe to wade through); the others kill.
const PATH = {
  start: 430,
  pools: [
    { x1: 340, x2: 400, own: true },
    { x1: 240, x2: 300, own: false },
    { x1: 70, x2: 200, own: false },
  ],
  ledges: [{ x1: 110, x2: 170, y: 430 }],
  pedestal: { x1: 20, x2: 60 },
};

const SIDES = {
  fire: { own: 'lava', other: 'water', mirror: false, keys: { left: 'A', right: 'D', jump: 'W' } },
  water: { own: 'water', other: 'lava', mirror: true, keys: { left: 'LEFT', right: 'RIGHT', jump: 'UP' } },
};

export class Vaults extends Phaser.Scene {
  constructor() { super('Vaults'); }

  create() {
    this.add.text(W / 2, 30, 'The doors slam shut! Reach your vault.', font(26)).setOrigin(0.5);
    this.add.text(W / 2, 62, 'Fire dies in water, water dies in lava.', font(16, COLORS.dim)).setOrigin(0.5);

    const solids = this.physics.add.staticGroup();
    const solid = (x1, y1, x2, y2, color) => solids.add(this.add.rectangle((x1 + x2) / 2, (y1 + y2) / 2, x2 - x1, y2 - y1, color));
    solid(0, GROUND_Y, W, H, 0x3b3f4e);                       // floor
    solid(W / 2 - 5, 90, W / 2 + 5, GROUND_Y, COLORS.outline); // the wall between the vaults

    this.heroes = {};
    for (const [id, side] of Object.entries(SIDES)) {
      const span = ({ x1, x2 }) => (side.mirror ? [W - x2, W - x1] : [x1, x2]);
      const startX = side.mirror ? W - PATH.start : PATH.start;

      const hazards = [];
      for (const pool of PATH.pools) {
        const [x1, x2] = span(pool);
        const rect = this.add.rectangle((x1 + x2) / 2, GROUND_Y - 6, x2 - x1, 12, POOL_COLOR[pool.own ? side.own : side.other]);
        if (!pool.own) hazards.push(this.physics.add.existing(rect, true));
      }
      for (const ledge of PATH.ledges) {
        const [x1, x2] = span(ledge);
        solid(x1, ledge.y, x2, ledge.y + 14, 0x5d6275);
      }
      const [px1, px2] = span(PATH.pedestal);
      const pedestal = this.physics.add.existing(this.add.rectangle((px1 + px2) / 2, GROUND_Y - 15, px2 - px1, 30, 0x8d6e63), true);
      this.add.circle((px1 + px2) / 2, GROUND_Y - 40, 9, PLAYERS[id].color);   // the gem on the pedestal
      this.add.text((px1 + px2) / 2, GROUND_Y - 62, id === 'fire' ? 'Fire Vault' : 'Water Vault', font(14)).setOrigin(0.5);

      const body = this.physics.add.existing(this.add.rectangle(startX, GROUND_Y - HERO.h / 2, HERO.w, HERO.h, PLAYERS[id].color));
      body.body.setCollideWorldBounds(true);
      this.physics.add.collider(body, solids);
      this.physics.add.overlap(body, hazards, () => this.die(id));
      this.physics.add.overlap(body, pedestal, () => this.arrive(id));

      this.heroes[id] = {
        sprite: body,
        startX,
        keys: this.input.keyboard.addKeys(side.keys),
        arrived: false,
        status: this.add.text(side.mirror ? W * 3 / 4 : W / 4, 110, '', font(16)).setOrigin(0.5),
        help: side.mirror ? '← → move   ↑ jump' : 'A D move   W jump',
      };
      this.setStatus(id, this.heroes[id].help, COLORS.dim);
    }
  }

  update() {
    for (const hero of Object.values(this.heroes)) {
      const { body } = hero.sprite;
      if (hero.arrived) { body.setVelocityX(0); continue; }
      const { left, right, jump } = hero.keys;
      body.setVelocityX(((right.isDown ? 1 : 0) - (left.isDown ? 1 : 0)) * SPEED);
      if (jump.isDown && body.blocked.down) body.setVelocityY(-JUMP);
    }
  }

  setStatus(id, text, color = COLORS.text) {
    this.heroes[id].status.setText(text).setColor(color);
  }

  die(id) {
    const hero = this.heroes[id];
    if (hero.arrived) return;
    hero.sprite.body.reset(hero.startX, GROUND_Y - HERO.h / 2);
    this.setStatus(id, `${PLAYERS[id].name} ${id === 'fire' ? 'hit water' : 'hit lava'}! Back to the start.`, '#ef5350');
    this.time.delayedCall(1500, () => { if (!hero.arrived) this.setStatus(id, hero.help, COLORS.dim); });
  }

  arrive(id) {
    const hero = this.heroes[id];
    if (hero.arrived) return;
    hero.arrived = true;
    hero.sprite.body.setVelocity(0, 0);
    this.setStatus(id, `${PLAYERS[id].name} is at the pedestal`, '#66bb6a');
    if (Object.values(this.heroes).every(h => h.arrived)) {
      this.time.delayedCall(800, () => this.scene.start('Run'));
    }
  }
}
