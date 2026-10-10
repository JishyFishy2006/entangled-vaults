import Phaser from 'phaser';
import { HERO_FRAME, Liquid, T, brickBlock, gem, keyHint, panel, tile, templeBackground, vaultDoor } from '../art.js';
import { sfx } from '../sfx.js';
import { COLORS, DB, PLAYERS, W, label } from './style.js';

const FLOOR = 320;
const CEIL = 48;
const SPEED = 110;
const JUMP = 300;            // with gravity 820: ~55 px high, ~80 px across on flat ground
const BODY = { fire: { w: 14, h: 34 }, water: { w: 14, h: 30 } };

// Fireboy's path on the left half, from the centre wall out to his vault door.
// Watergirl's path is the mirror image. Pools: `own` = hero's element (safe to
// walk through), `other` = the other element, `goo` = deadly to both.
const PATH = {
  start: 292,
  pools: [
    { x1: 256, x2: 288, kind: 'own' },
    { x1: 192, x2: 240, kind: 'other' },
    { x1: 80, x2: 160, kind: 'goo' },
  ],
  ledge: { x1: 104, x2: 136, y: 272 },
  lever: 120,
  gate: { x1: 48, x2: 56 },
  door: 24,
  gems: [[216, 254], [120, 246], [68, 300]],
};
const KIND = { fire: { own: 'lava', other: 'water' }, water: { own: 'water', other: 'lava' } };

export class Vaults extends Phaser.Scene {
  constructor() { super('Vaults'); }

  create() {
    templeBackground(this, { seed: 11, candles: [[160, 96], [480, 96]] });
    this.cameras.main.fadeIn(300, 20, 12, 28);

    const solids = this.physics.add.staticGroup();
    const solid = (x, y, w, h) => solids.add(this.add.zone(x + w / 2, y + h / 2, w, h));

    // Ceiling, centre wall and floor (the floor runs under the pools too: you walk on liquid).
    brickBlock(this, 0, CEIL, W / T, 1);
    brickBlock(this, W / 2 - 8, CEIL + T, 1, (FLOOR - CEIL) / T - 1);
    solid(W / 2 - 8, CEIL, 16, FLOOR - CEIL);
    solid(0, FLOOR, W, 40);
    solid(0, 0, W, CEIL + T);

    // The hidden fellow DawnLike's author asks for, tucked behind a vine.
    tile(this, 'platino', 604, CEIL + T).setAlpha(0.55);
    tile(this, 'vine3', 600, CEIL + T + 2);

    label(this, W / 2, 14, 'THE TWIN VAULTS', 16, COLORS.gold);
    label(this, W / 2, 32, 'Your lever opens your partner\'s gate.', 8, COLORS.dim);

    this.heroes = {};
    this.gates = {};
    for (const [id, p] of Object.entries(PLAYERS)) {
      const mirror = id === 'water';
      const mx = x => (mirror ? W - x : x);
      const span = (x1, x2) => (mirror ? [W - x2, W - x1] : [x1, x2]);

      // Floor bricks with pools set into them (the last strip runs under the centre wall).
      const hazards = [];
      let cursor = 0;
      const floorStrip = (a, b) => { const [x1, x2] = span(a, b); brickBlock(this, x1, FLOOR, (x2 - x1) / T, 3); };
      for (const pool of [...PATH.pools].sort((a, b) => a.x1 - b.x1)) {
        const [x1, x2] = span(pool.x1, pool.x2);
        const kind = pool.kind === 'goo' ? 'goo' : KIND[id][pool.kind];
        new Liquid(this, x1, FLOOR + 1, x2 - x1, T - 1, kind);
        brickBlock(this, x1, FLOOR + T, (x2 - x1) / T, 2);
        if (pool.kind !== 'own') {
          hazards.push(this.physics.add.existing(this.add.zone((x1 + x2) / 2, FLOOR - 3, x2 - x1 - 6, 8), true));
        }
        if (pool.x1 > cursor) floorStrip(cursor, pool.x1);
        cursor = pool.x2;
      }
      floorStrip(cursor, W / 2);

      // Ledge over the goo, with the lever on it.
      const [lx1] = span(PATH.ledge.x1, PATH.ledge.x2);
      brickBlock(this, lx1, PATH.ledge.y, (PATH.ledge.x2 - PATH.ledge.x1) / T, 1);
      solid(lx1, PATH.ledge.y, PATH.ledge.x2 - PATH.ledge.x1, T);
      const lever = this.makeLever(mx(PATH.lever), PATH.ledge.y, mirror);

      // Gate in front of this hero's vault: opened by the partner's lever.
      const [gx1, gx2] = span(PATH.gate.x1, PATH.gate.x2);
      this.gates[id] = this.makeGate(gx1, gx2, solids);

      const door = vaultDoor(this, mx(PATH.door), FLOOR, id);
      const doorZone = this.physics.add.existing(this.add.zone(mx(PATH.door), FLOOR - 24, 20, 40), true);

      const gems = PATH.gems.map(([x, y]) => {
        const g = gem(this, mx(x), y, 5, id === 'fire' ? 'red' : 'blue');
        this.tweens.add({ targets: g, y: y - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        return this.physics.add.existing(this.add.zone(mx(x), y, 12, 14), true).setData('gem', g);
      });

      // The hero.
      const startX = mx(PATH.start);
      const sprite = this.physics.add.sprite(startX, FLOOR, p.sheet).play(`${id}-idle`);
      const hero = this.heroes[id] = {
        id, sprite, startX, mirror, door, lever, gemsLeft: gems.length,
        keys: this.input.keyboard.addKeys({ left: p.keys.left, right: p.keys.right, jump: p.keys.jump }),
        arrived: false, dead: false, facing: mirror ? 1 : -1,
      };
      sprite.body.setSize(BODY[id].w, BODY[id].h);
      this.face(hero, hero.facing);
      sprite.setCollideWorldBounds(true);
      this.physics.add.collider(sprite, solids);
      this.physics.add.overlap(sprite, hazards, () => this.die(hero));
      this.physics.add.overlap(sprite, doorZone, () => this.arrive(hero));
      this.physics.add.overlap(sprite, lever.zone, () => this.pullLever(hero));
      for (const z of gems) {
        this.physics.add.overlap(sprite, z, () => this.collect(hero, z));
      }

      // HUD: name, gem counter, status line.
      const hx = mirror ? W - 70 : 70;
      panel(this, hx - 62, 2, 124, 40);
      label(this, hx, 12, p.name.toUpperCase(), 8, p.text);
      hero.hudGem = gem(this, hx - 26, 26, 4, id === 'fire' ? 'red' : 'blue');
      hero.hudCount = label(this, hx + 4, 27, `0 / ${gems.length}`, 8);
      hero.status = label(this, mirror ? W * 3 / 4 + 4 : W / 4 - 4, 104, '', 8, COLORS.dim);
      if (mirror) keyHint(this, W / 2 + 40, 80, ['left', 'right', 'up'], 'move / jump');
      else keyHint(this, 24, 80, ['A', 'D', 'W'], 'move / jump');
    }
  }

  makeLever(x, floorY, mirror) {
    const base = this.add.graphics();
    base.fillStyle(DB.black).fillRect(x - 7, floorY - 5, 14, 5);
    base.fillStyle(DB.stone).fillRect(x - 6, floorY - 5, 12, 4);
    const stick = this.add.graphics({ x, y: floorY - 4 });
    stick.fillStyle(DB.black).fillRect(-2, -15, 4, 15);
    stick.fillStyle(DB.slate).fillRect(-1, -14, 2, 14);
    stick.fillStyle(DB.red).fillCircle(0, -15, 3);
    stick.rotation = mirror ? -0.6 : 0.6;
    const zone = this.physics.add.existing(this.add.zone(x, floorY - 10, 14, 20), true);
    return { stick, zone, pulled: false, mirror };
  }

  makeGate(x1, x2, solids) {
    const h = FLOOR - CEIL - T;   // floor to ceiling, so it can't be jumped over
    const g = this.add.graphics({ x: 0, y: 0 });
    g.fillStyle(DB.black).fillRect(x1 - 1, FLOOR - h, x2 - x1 + 2, h);
    for (let k = 0; k < 3; k++) g.fillStyle(DB.slate).fillRect(x1 + k * 3, FLOOR - h + 1, 2, h - 1);
    for (let y = FLOOR - h + 10; y < FLOOR; y += 24) g.fillStyle(DB.iron).fillRect(x1 - 1, y, x2 - x1 + 2, 3);
    const mask = this.make.graphics({}, false).fillRect(x1 - 2, CEIL + T, x2 - x1 + 4, FLOOR - CEIL - T).createGeometryMask();
    g.setMask(mask);
    const zone = this.add.zone((x1 + x2) / 2, FLOOR - h / 2, x2 - x1, h);
    solids.add(zone);
    return { g, zone, open: false };
  }

  face(hero, dir) {
    if (!dir) return;
    hero.facing = dir;
    const f = HERO_FRAME[hero.id];
    const ox = dir < 0 ? 1 - f.originX : f.originX;
    hero.sprite.setFlipX(dir < 0).setOrigin(ox, 1);
    hero.sprite.body.setOffset(ox * 128 - BODY[hero.id].w / 2, 72 - BODY[hero.id].h);
  }

  update() {
    for (const hero of Object.values(this.heroes)) {
      const { body } = hero.sprite;
      if (hero.dead || hero.arrived) { body.setVelocityX(0); continue; }
      const { left, right, jump } = hero.keys;
      const dir = (right.isDown ? 1 : 0) - (left.isDown ? 1 : 0);
      body.setVelocityX(dir * SPEED);
      this.face(hero, dir);
      const onGround = body.blocked.down;
      if (jump.isDown && onGround) { body.setVelocityY(-JUMP); sfx.jump(this); }

      const anim = !onGround ? (body.velocity.y < 0 ? 'jump_up' : 'jump_down') : dir ? 'run' : 'idle';
      const key = `${hero.id}-${anim}`;
      if (hero.sprite.anims.currentAnim?.key !== key) hero.sprite.play(key);
    }
  }

  setStatus(hero, text, color = COLORS.dim) {
    hero.status.setText(text).setColor(color);
  }

  die(hero) {
    if (hero.dead || hero.arrived) return;
    hero.dead = true;
    const { sprite } = hero;
    sprite.body.setVelocity(0, 0).setAllowGravity(false);
    sprite.play(`${hero.id}-death`);
    sfx.death(this);
    this.cameras.main.shake(120, 0.004);
    const steam = this.add.particles(sprite.x, FLOOR - 4, 'px', {
      speedY: { min: -60, max: -20 }, speedX: { min: -25, max: 25 }, lifespan: 600, quantity: 14, emitting: false,
      tint: hero.id === 'fire' ? [DB.white, DB.cyan] : [DB.orange, DB.yellow], alpha: { start: 1, end: 0 },
    });
    steam.explode(14);
    this.setStatus(hero, `${PLAYERS[hero.id].name} ${hero.id === 'fire' ? 'fizzled out' : 'boiled away'}!`, COLORS.bad);
    this.time.delayedCall(1000, () => {
      sprite.body.reset(hero.startX, FLOOR);
      sprite.body.setAllowGravity(true);
      sprite.play(`${hero.id}-idle`);
      this.face(hero, hero.mirror ? 1 : -1);
      hero.dead = false;
      sprite.setAlpha(0);
      this.tweens.add({ targets: sprite, alpha: 1, duration: 300 });
      this.time.delayedCall(800, () => { if (!hero.dead && !hero.arrived) this.setStatus(hero, ''); });
    });
  }

  collect(hero, zone) {
    if (!zone.active) return;
    const g = zone.getData('gem');
    zone.destroy();
    sfx.pickup(this);
    this.tweens.add({ targets: g, y: g.y - 14, alpha: 0, scale: 1.8, duration: 300, onComplete: () => g.destroy() });
    hero.gemsLeft--;
    hero.hudCount.setText(`${PATH.gems.length - hero.gemsLeft} / ${PATH.gems.length}`);
  }

  pullLever(hero) {
    const { lever } = hero;
    if (lever.pulled || hero.dead) return;
    lever.pulled = true;
    sfx.lever(this);
    this.tweens.add({ targets: lever.stick, rotation: lever.mirror ? 0.6 : -0.6, duration: 200 });
    const partner = hero.id === 'fire' ? 'water' : 'fire';
    const gate = this.gates[partner];
    gate.open = true;
    gate.zone.destroy();
    this.time.delayedCall(250, () => {
      sfx.door(this);
      this.tweens.add({ targets: gate.g, y: -(FLOOR - CEIL), duration: 1400, ease: 'Sine.easeIn' });
    });
    this.setStatus(hero, `${PLAYERS[partner].name}'s gate is open!`, COLORS.gold);
  }

  arrive(hero) {
    if (hero.arrived || hero.dead) return;
    hero.arrived = true;
    const { sprite, door } = hero;
    sprite.body.setVelocity(0, 0);
    sprite.play(`${hero.id}-idle`);
    sfx.door(this);
    this.tweens.add({ targets: door.door, y: -door.h + 4, duration: 600, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: sprite, alpha: 0, duration: 500, delay: 500 });
    this.setStatus(hero, 'In the vault!', COLORS.good);
    if (Object.values(this.heroes).every(h => h.arrived)) {
      this.time.delayedCall(1300, () => {
        this.cameras.main.fadeOut(400, 20, 12, 28);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Run'));
      });
    }
  }
}
