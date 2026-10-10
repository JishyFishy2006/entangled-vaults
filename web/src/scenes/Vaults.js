import Phaser from 'phaser';
import { HERO_FRAME, Liquid, T, brickBlock, gem, keyHint, panel, tile, templeBackground, vaultDoor } from '../art.js';
import { sfx } from '../sfx.js';
import { COLORS, DB, PLAYERS, W, label } from './style.js';

const FLOOR = 320;
const CEIL = 48;
const SPEED = 110;
const JUMP = 315;            // with gravity 820: ~60 px high, ~84 px across on flat ground
const TIME_LIMIT = 40;       // seconds for both heroes to reach their vaults
const BODY = { fire: { w: 14, h: 34 }, water: { w: 14, h: 30 } };
const KIND = { fire: { own: 'lava', other: 'water' }, water: { own: 'water', other: 'lava' } };

// Two different levels, in screen pixels. Walkways are brick ledges you can walk
// along (liquid pools are set into them: `own` is safe, `other` and `goo` kill).
// Blocks are plain brick (w, h in tiles). Movers are moving platforms. The lever
// opens the PARTNER's gate. Every jump here fits the ~60 px high, ~84 px wide jump.
export const LEVELS = {
  fire: {
    name: 'Ember Climb',
    start: 290,
    walkways: [
      { x1: 0, x2: 312, y: FLOOR, rows: 3, pools: [{ x1: 96, x2: 144, kind: 'goo' }, { x1: 176, x2: 224, kind: 'other' }, { x1: 240, x2: 272, kind: 'own' }] },
      { x1: 96, x2: 312, y: 176, rows: 1, pools: [{ x1: 112, x2: 144, kind: 'own' }, { x1: 176, x2: 224, kind: 'other' }] },
    ],
    blocks: [{ x: 0, y: 272, w: 3, h: 1 }],
    movers: [{ x: 64, y: 256, w: 2, axis: 'y', from: 176, to: 256, speed: 42, dwell: 1200 }],
    lever: { x: 24, y: 272 },
    gate: { x1: 256, x2: 264, top: CEIL + T, bottom: 176 },
    door: { x: 288, y: 176 },
    gems: [[200, 250], [80, 214], [128, 154]],
  },
  water: {
    name: 'Tide Spire',
    start: 344,
    walkways: [
      { x1: 328, x2: 640, y: FLOOR, rows: 3, pools: [{ x1: 360, x2: 392, kind: 'other' }, { x1: 472, x2: 552, kind: 'goo' }, { x1: 552, x2: 584, kind: 'own' }] },
    ],
    blocks: [
      { x: 384, y: 272, w: 2, h: 1 },                // step 1, past the lava
      { x: 424, y: 224, w: 2, h: 1 },                // step 2, against the spire
      { x: 456, y: 176, w: 1, h: 9 },                // the spire
    ],
    movers: [{ x: 472, y: 208, w: 2, axis: 'x', from: 472, to: 520, speed: 34, dwell: 700 }],
    lever: { x: 440, y: 224 },
    gate: { x1: 584, x2: 592, top: CEIL + T, bottom: FLOOR },
    door: { x: 616, y: FLOOR },
    gems: [[372, 262], [444, 204], [512, 188]],
  },
};

export class Vaults extends Phaser.Scene {
  constructor() { super('Vaults'); }

  create() {
    templeBackground(this, { seed: 11, candles: [[160, 96], [480, 96]] });
    this.cameras.main.fadeIn(300, 20, 12, 28);
    this.over = false;

    const solids = this.solids = this.physics.add.staticGroup();
    const solid = (x, y, w, h) => solids.add(this.add.zone(x + w / 2, y + h / 2, w, h));

    // Ceiling and the centre wall that keeps the heroes apart.
    brickBlock(this, 0, CEIL, W / T, 1);
    brickBlock(this, W / 2 - 8, CEIL + T, 1, (FLOOR - CEIL) / T - 1);
    solid(W / 2 - 8, CEIL, 16, FLOOR - CEIL);
    solid(0, 0, W, CEIL + T);

    // The hidden fellow DawnLike's author asks for, tucked behind a vine.
    tile(this, 'platino', 604, CEIL + T).setAlpha(0.55);
    tile(this, 'vine3', 600, CEIL + T + 2);

    label(this, W / 2, 12, 'THE TWIN VAULTS', 16, COLORS.gold);
    this.clock = label(this, W / 2, 32, '', 16);

    this.heroes = {};
    this.gates = {};
    this.movers = [];
    for (const [id, p] of Object.entries(PLAYERS)) {
      const L = LEVELS[id];
      const hazards = [];
      for (const way of L.walkways) this.buildWalkway(id, way, hazards);
      for (const b of L.blocks) {
        brickBlock(this, b.x, b.y, b.w, b.h);
        solid(b.x, b.y, b.w * T, b.h * T);
      }
      for (const m of L.movers) this.movers.push(this.makeMover(m));
      const lever = this.makeLever(L.lever.x, L.lever.y, id === 'water');
      this.gates[id] = this.makeGate(L.gate);

      const door = vaultDoor(this, L.door.x, L.door.y, id);
      const doorZone = this.physics.add.existing(this.add.zone(L.door.x, L.door.y - 24, 20, 40), true);

      const gems = L.gems.map(([x, y]) => {
        const g = gem(this, x, y, 5, id === 'fire' ? 'red' : 'blue');
        this.tweens.add({ targets: g, y: y - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        return this.physics.add.existing(this.add.zone(x, y, 12, 14), true).setData('gem', g);
      });

      const sprite = this.physics.add.sprite(L.start, FLOOR, p.sheet).play(`${id}-idle`);
      const hero = this.heroes[id] = {
        id, sprite, startX: L.start, door, lever, gemsLeft: gems.length, gemsTotal: gems.length,
        keys: this.input.keyboard.addKeys({ left: p.keys.left, right: p.keys.right, jump: p.keys.jump }),
        arrived: false, dead: false, homeFacing: id === 'water' ? 1 : -1,
      };
      sprite.body.setSize(BODY[id].w, BODY[id].h);
      this.face(hero, hero.homeFacing);
      sprite.setCollideWorldBounds(true);
      this.physics.add.collider(sprite, solids);
      for (const m of this.movers) this.physics.add.collider(sprite, m.zone);
      this.physics.add.overlap(sprite, hazards, () => this.die(hero));
      this.physics.add.overlap(sprite, doorZone, () => this.arrive(hero));
      this.physics.add.overlap(sprite, lever.zone, () => this.pullLever(hero));
      for (const z of gems) this.physics.add.overlap(sprite, z, () => this.collect(hero, z));

      // HUD: name, gem counter, status line, controls.
      const right = id === 'water';
      const hx = right ? W - 70 : 70;
      panel(this, hx - 62, 2, 124, 40);
      label(this, hx, 12, p.name.toUpperCase(), 8, p.text);
      gem(this, hx - 26, 28, 4, id === 'fire' ? 'red' : 'blue');
      hero.hudCount = label(this, hx + 4, 29, `0 / ${gems.length}`, 8);
      hero.status = label(this, right ? W * 3 / 4 + 4 : W / 4 - 4, 104, '', 8, COLORS.dim);
      if (right) keyHint(this, W / 2 + 40, 80, ['left', 'right', 'up'], 'move / jump');
      else keyHint(this, 24, 80, ['A', 'D', 'W'], 'move / jump');
      this.setStatus(hero, `${L.name}: find your lever!`, COLORS.gold);
      this.time.delayedCall(3000, () => { if (hero.status.text.endsWith('lever!')) this.setStatus(hero, ''); });
    }

    // Shared countdown: both heroes must be in their vaults before it runs out.
    this.timeLeft = TIME_LIMIT;
    this.showClock();
    this.ticker = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tick() });
  }

  // A brick ledge with liquid pools set into it; the collider covers the whole
  // ledge, so heroes walk on the liquid and die only in the deadly kinds.
  buildWalkway(id, way, hazards) {
    let cursor = way.x1;
    const strip = (a, b) => brickBlock(this, a, way.y, Math.ceil((b - a) / T), way.rows);
    for (const pool of [...way.pools].sort((a, b) => a.x1 - b.x1)) {
      if (pool.x1 > cursor) strip(cursor, pool.x1);
      const kind = pool.kind === 'goo' ? 'goo' : KIND[id][pool.kind];
      new Liquid(this, pool.x1, way.y + 1, pool.x2 - pool.x1, T - 1, kind);
      if (way.rows > 1) brickBlock(this, pool.x1, way.y + T, (pool.x2 - pool.x1) / T, way.rows - 1);
      if (pool.kind !== 'own') {
        // Hugs the surface and stops short of the edges, so only touching the liquid kills
        // (not taking off from the brink, which lifts the feet off the floor at once).
        hazards.push(this.physics.add.existing(this.add.zone((pool.x1 + pool.x2) / 2, way.y + 2, pool.x2 - pool.x1 - 8, 6), true));
      }
      cursor = pool.x2;
    }
    if (way.x2 > cursor) strip(cursor, way.x2);
    this.solids.add(this.add.zone((way.x1 + way.x2) / 2, way.y + (way.rows * T) / 2, way.x2 - way.x1, way.rows * T));
  }

  // A moving brick platform: an immovable body that carries whoever stands on it.
  makeMover(m) {
    const w = m.w * T;
    const zone = this.add.zone(m.x + w / 2, m.y + T / 2, w, T);
    this.physics.add.existing(zone);
    zone.body.setAllowGravity(false).setImmovable(true);
    const tiles = [];
    for (let i = 0; i < m.w; i++) {
      const name = m.w === 1 ? 'brick_t' : i === 0 ? 'brick_tl' : i === m.w - 1 ? 'brick_tr' : 'brick_t';
      tiles.push(tile(this, name, m.x + i * T, m.y).setTint(0xf0c890));
    }
    const chain = this.add.graphics();
    // Starts at its `x`/`y`, heading towards the other end; pauses `dwell` ms at each end.
    const mover = { ...m, zone, tiles, chain, wpx: w, waitUntil: 0 };
    const start = m.axis === 'x' ? m.x : m.y;
    mover.dir = start <= m.from ? 1 : -1;
    return mover;
  }

  makeLever(x, floorY, flip) {
    const base = this.add.graphics();
    base.fillStyle(DB.black).fillRect(x - 7, floorY - 5, 14, 5);
    base.fillStyle(DB.stone).fillRect(x - 6, floorY - 5, 12, 4);
    const stick = this.add.graphics({ x, y: floorY - 4 });
    stick.fillStyle(DB.black).fillRect(-2, -15, 4, 15);
    stick.fillStyle(DB.slate).fillRect(-1, -14, 2, 14);
    stick.fillStyle(DB.red).fillCircle(0, -15, 3);
    stick.rotation = flip ? -0.6 : 0.6;
    const zone = this.physics.add.existing(this.add.zone(x, floorY - 10, 14, 20), true);
    return { stick, zone, pulled: false, flip };
  }

  // Iron bars from `top` to `bottom`, too tall to jump over; opened by the partner's lever.
  makeGate({ x1, x2, top, bottom }) {
    const h = bottom - top;
    const g = this.add.graphics();
    g.fillStyle(DB.black).fillRect(x1 - 1, top, x2 - x1 + 2, h);
    for (let k = 0; k < 3; k++) g.fillStyle(DB.slate).fillRect(x1 + k * 3, top + 1, 2, h - 1);
    for (let y = top + 10; y < bottom; y += 24) g.fillStyle(DB.iron).fillRect(x1 - 1, y, x2 - x1 + 2, 3);
    g.setMask(this.make.graphics({}, false).fillRect(x1 - 2, top, x2 - x1 + 4, h).createGeometryMask());
    const zone = this.add.zone((x1 + x2) / 2, top + h / 2, x2 - x1, h);
    this.solids.add(zone);
    return { g, zone, h, open: false };
  }

  face(hero, dir) {
    if (!dir) return;
    const f = HERO_FRAME[hero.id];
    const ox = dir < 0 ? 1 - f.originX : f.originX;
    hero.sprite.setFlipX(dir < 0).setOrigin(ox, 1);
    hero.sprite.body.setOffset(ox * 128 - BODY[hero.id].w / 2, 72 - BODY[hero.id].h);
  }

  update() {
    for (const m of this.movers) {
      const b = m.zone.body;
      const pos = m.axis === 'x' ? b.x : b.y;
      const atEnd = (m.dir > 0 && pos >= m.to) || (m.dir < 0 && pos <= m.from);
      if (atEnd) {
        // Snap exactly level with the end, wait, then head back.
        const end = m.dir > 0 ? m.to : m.from;
        if (m.axis === 'x') b.reset(end + m.wpx / 2, b.y + T / 2); else b.reset(b.x + m.wpx / 2, end + T / 2);
        m.dir = -m.dir;
        m.waitUntil = this.time.now + m.dwell;
      }
      const moving = this.time.now >= m.waitUntil;
      const v = moving ? m.dir * m.speed : 0;
      if (m.axis === 'x') b.setVelocity(v, 0); else b.setVelocity(0, v);
      m.tiles.forEach((t, i) => t.setPosition(Math.round(b.x) + i * T, Math.round(b.y)));
      if (m.axis === 'y') {
        // Chains up to the ceiling for the elevator.
        m.chain.clear().fillStyle(DB.iron);
        for (const cx of [b.x + 3, b.x + m.wpx - 5]) {
          for (let y = CEIL + T; y < b.y; y += 4) m.chain.fillRect(Math.round(cx), y, 2, 3);
        }
      }
    }

    for (const hero of Object.values(this.heroes)) {
      const { body } = hero.sprite;
      if (hero.dead || hero.arrived || this.over) { if (!hero.dead) body.setVelocityX(0); continue; }
      const { left, right, jump } = hero.keys;
      const dir = (right.isDown ? 1 : 0) - (left.isDown ? 1 : 0);
      body.setVelocityX(dir * SPEED);
      this.face(hero, dir);
      const onGround = body.blocked.down || body.touching.down;
      if (jump.isDown && onGround) { body.setVelocityY(-JUMP); sfx.jump(this); }

      const anim = !onGround ? (body.velocity.y < 0 ? 'jump_up' : 'jump_down') : dir ? 'run' : 'idle';
      const key = `${hero.id}-${anim}`;
      if (hero.sprite.anims.currentAnim?.key !== key) hero.sprite.play(key);
    }
  }

  tick() {
    if (this.over) return;
    this.timeLeft--;
    this.showClock();
    if (this.timeLeft <= 10 && this.timeLeft > 0) sfx.tick(this);
    if (this.timeLeft <= 0) this.timeUp();
  }

  showClock() {
    const t = Math.max(0, this.timeLeft);
    this.clock.setText(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`)
      .setColor(t <= 10 ? COLORS.bad : COLORS.text);
    if (t <= 10) { this.clock.setScale(1.3); this.tweens.add({ targets: this.clock, scale: 1, duration: 300 }); }
  }

  timeUp() {
    this.over = true;
    this.ticker.remove();
    sfx.shut(this);
    for (const h of Object.values(this.heroes)) h.sprite.body.setVelocity(0, 0);
    panel(this, W / 2 - 120, 140, 240, 64);
    label(this, W / 2, 160, "TIME'S UP!", 16, COLORS.bad);
    label(this, W / 2, 184, 'The vault doors reset...', 8, COLORS.dim);
    this.time.delayedCall(2200, () => {
      this.cameras.main.fadeOut(300, 20, 12, 28);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
    });
  }

  setStatus(hero, text, color = COLORS.dim) {
    hero.status.setText(text).setColor(color);
  }

  die(hero) {
    if (hero.dead || hero.arrived || this.over) return;
    hero.dead = true;
    const { sprite } = hero;
    sprite.body.setVelocity(0, 0).setAllowGravity(false);
    sprite.play(`${hero.id}-death`);
    sfx.death(this);
    this.cameras.main.shake(120, 0.004);
    const steam = this.add.particles(sprite.x, sprite.y - 4, 'px', {
      speedY: { min: -60, max: -20 }, speedX: { min: -25, max: 25 }, lifespan: 600, quantity: 14, emitting: false,
      tint: hero.id === 'fire' ? [DB.white, DB.cyan] : [DB.orange, DB.yellow], alpha: { start: 1, end: 0 },
    });
    steam.explode(14);
    this.setStatus(hero, `${PLAYERS[hero.id].name} ${hero.id === 'fire' ? 'fizzled out' : 'boiled away'}!`, COLORS.bad);
    this.time.delayedCall(1000, () => {
      if (this.over) return;
      sprite.body.reset(hero.startX, FLOOR);
      sprite.body.setAllowGravity(true);
      sprite.play(`${hero.id}-idle`);
      this.face(hero, hero.homeFacing);
      hero.dead = false;
      sprite.setAlpha(0);
      this.tweens.add({ targets: sprite, alpha: 1, duration: 300 });
      this.time.delayedCall(800, () => { if (!hero.dead && !hero.arrived) this.setStatus(hero, ''); });
    });
  }

  collect(hero, zone) {
    if (!zone.active || hero.dead) return;
    const g = zone.getData('gem');
    zone.destroy();
    sfx.pickup(this);
    this.tweens.add({ targets: g, y: g.y - 14, alpha: 0, scale: 1.8, duration: 300, onComplete: () => g.destroy() });
    hero.gemsLeft--;
    hero.hudCount.setText(`${hero.gemsTotal - hero.gemsLeft} / ${hero.gemsTotal}`);
  }

  pullLever(hero) {
    const { lever } = hero;
    if (lever.pulled || hero.dead) return;
    lever.pulled = true;
    sfx.lever(this);
    this.tweens.add({ targets: lever.stick, rotation: lever.flip ? 0.6 : -0.6, duration: 200 });
    const partner = hero.id === 'fire' ? 'water' : 'fire';
    const gate = this.gates[partner];
    gate.open = true;
    gate.zone.destroy();
    this.time.delayedCall(250, () => {
      sfx.door(this);
      this.tweens.add({ targets: gate.g, y: -gate.h, duration: 1400, ease: 'Sine.easeIn' });
    });
    this.setStatus(hero, `${PLAYERS[partner].name}'s gate is open!`, COLORS.gold);
  }

  arrive(hero) {
    if (hero.arrived || hero.dead || this.over) return;
    hero.arrived = true;
    const { sprite, door } = hero;
    sprite.body.setVelocity(0, 0).setAllowGravity(false);
    sprite.play(`${hero.id}-idle`);
    sfx.door(this);
    this.tweens.add({ targets: door.door, y: -door.h + 4, duration: 600, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: sprite, alpha: 0, duration: 500, delay: 500 });
    this.setStatus(hero, 'In the vault!', COLORS.good);
    if (Object.values(this.heroes).every(h => h.arrived)) {
      this.over = true;
      this.ticker.remove();
      this.time.delayedCall(1300, () => {
        this.cameras.main.fadeOut(400, 20, 12, 28);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Run'));
      });
    }
  }
}
