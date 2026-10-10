import Phaser from 'phaser';
import { T, brickBlock, keyHint, panel, templeBackground } from '../art.js';
import { animateHero, faceHero, makeHero } from '../heroes.js';
import { LanternDais } from '../objects/LanternDais.js';
import { LapDial } from '../objects/LapDial.js';
import { Mural } from '../objects/Mural.js';
import { MURAL_AFTER_FAILED_READS, ROOMS } from '../objects/rooms.js';
import { SearchHall } from '../objects/SearchHall.js';
import { SpreadLever } from '../objects/SpreadLever.js';
import { Vault } from '../objects/Vault.js';
import { VaultLamp } from '../objects/VaultLamp.js';
import { WaterLoop } from '../objects/WaterLoop.js';
import { progress } from '../progress.js';
import { groverPoolMode } from '../quantum.js';
import { sfx } from '../sfx.js';
import { COLORS, DB, H, PLAYERS, W, label } from './style.js';

// Gray-box Hall of Echoes rooms (Phases 18-19). Reach them at /#testhall1, /#testhall2
// (or /#testhall), /#testhall3, or press 1/2/3 in the hall. Backtick toggles the debug
// overlay; L toggles the lamps (dark = prying allowed); R starts a fresh room.
const FLOOR = 320;
const SHELF_Y = 224;          // Room 3's upper row of vaults
const SPEED = 110;
const JUMP = 315;
const LOOP = { x1: 176, x2: 400 };
// The bridge starts where the water does and clears Fireboy's head on the dais (top 270),
// while leaving Watergirl 52 px to swim under.
const BRIDGE = { x1: 176, x2: 416, y: 252 };
const VAULT_AREA = { x1: 432, x2: 640 };
const SPAWN = { fire: 32, water: 60 };

// Vault positions: one row on the floor, or (16 vaults) a second row on the shelf.
function vaultLayout(vaults) {
  const rows = vaults > 8 ? 2 : 1;
  const perRow = vaults / rows;
  const pitch = (VAULT_AREA.x2 - VAULT_AREA.x1) / perRow;
  return Array.from({ length: vaults }, (_, i) => {
    const row = Math.floor(i / perRow);
    return {
      cx: Math.round(VAULT_AREA.x1 + pitch * ((i % perRow) + 0.5)),
      floorY: row === 0 ? FLOOR : SHELF_Y,
      w: Math.min(20, Math.round(pitch) - 6),
    };
  });
}

export class TestHall extends Phaser.Scene {
  // The game's HallOfEchoes scene subclasses this with dev = false (no cheats, real flow).
  constructor(key = 'TestHall') {
    super(key);
    this.dev = key === 'TestHall';
  }

  init(data) {
    this.room = ROOMS.find(r => r.id === data?.room) ?? ROOMS[this.dev ? 1 : 0];
  }

  create() {
    const room = this.room;
    templeBackground(this, { seed: 20 + room.id, candles: [[40, 150], [300, 120]] });
    const solids = this.physics.add.staticGroup();
    const solid = (x1, y, x2, h) => solids.add(this.add.zone((x1 + x2) / 2, y + h / 2, x2 - x1, h));
    brickBlock(this, 0, FLOOR, LOOP.x1 / T, 3);
    brickBlock(this, LOOP.x2, FLOOR, (W - LOOP.x2) / T, 3);
    solid(0, FLOOR, W, 40);                                   // the floor runs under the water: you walk on it
    brickBlock(this, BRIDGE.x1, BRIDGE.y, (BRIDGE.x2 - BRIDGE.x1) / T, 1);
    solid(BRIDGE.x1, BRIDGE.y, BRIDGE.x2, 16);
    if (room.vaults > 8) {
      brickBlock(this, VAULT_AREA.x1, SHELF_Y, (VAULT_AREA.x2 - VAULT_AREA.x1) / T, 1);
      solid(VAULT_AREA.x1, SHELF_Y, VAULT_AREA.x2, 16);
    }

    panel(this, W / 2 - 200, 2, 400, 40);
    label(this, W / 2, 14, `${this.dev ? '' : 'THE HALL OF ECHOES - '}ROOM ${room.id} - ${room.vaults} VAULTS${room.lampsOn ? '' : ' - DARK'}`, 8, COLORS.gold);
    this.status = label(this, W / 2, 30, 'Fireboy: pull the lever to begin.', 8, COLORS.text);
    this.add.graphics().fillStyle(DB.black, 0.85).fillRect(0, H - 14, W, 14).setDepth(6);
    if (this.dev) {
      label(this, W / 2, H - 7, 'FIRE: ADW + S use | WATER: arrows + DOWN use | ` debug 1-3 room R reset', 8, COLORS.dim).setDepth(6);
    } else {
      keyHint(this, 10, H - 7, ['A', 'D', 'W'], 'move').setDepth(6);
      keyHint(this, 104, H - 7, ['S'], 'lever / read / open').setDepth(6);
      keyHint(this, 330, H - 7, ['left', 'right', 'up'], 'move').setDepth(6);
      keyHint(this, 424, H - 7, ['down'], 'open a vault').setDepth(6);
      for (const c of this.children.list.filter(o => o.type === 'Container')) c.setDepth(6);
    }

    // The room's pieces. Every event goes through the hall.
    const pools = { ideal: this.cache.json.get('pool-grover-ideal'), 'ionq-aria-1': this.cache.json.get('pool-grover-ionq-aria-1') };
    this.poolMode = groverPoolMode(progress.poolMode, room.vaults, pools);
    this.hall = new SearchHall({ vaults: room.vaults, lampsOn: room.lampsOn, pool: pools[this.poolMode] });
    this.hall.onChange = (event, data) => this.onHall(event, data);
    this.lever = new SpreadLever(this, 88, FLOOR);
    // The dais runs right up to the water's edge, so there is no hidden gap beside it.
    this.dais = new LanternDais(this, 112, LOOP.x1, FLOOR, solids);
    this.loop = new WaterLoop(this, LOOP.x1, LOOP.x2, FLOOR, () => this.hall.lap());
    this.dial = new LapDial(this, (LOOP.x1 + LOOP.x2) / 2, 200);
    this.mural = room.mural ? new Mural(this, 150, 56) : null;
    this.vaults = [];
    this.lamps = [];
    vaultLayout(room.vaults).forEach(({ cx, floorY, w }, i) => {
      this.vaults.push(new Vault(this, i, cx, floorY, w));
      this.lamps.push(new VaultLamp(this, cx, floorY - 54));
    });
    solids.add(this.loop.gateZone);

    // Heroes: the animated Fire Knight and Water Priestess, feet on the floor.
    this.heroes = {};
    for (const id of ['fire', 'water']) {
      const sprite = makeHero(this, id, SPAWN[id], FLOOR, 1);
      this.physics.add.collider(sprite, solids);
      const k = PLAYERS[id].keys;
      this.heroes[id] = {
        id, sprite, frozen: false,
        keys: this.input.keyboard.addKeys({ left: k.left, right: k.right, jump: k.jump, use: id === 'fire' ? 'S' : 'DOWN' }),
      };
    }
    this.physics.add.overlap(this.heroes.fire.sprite, this.loop.hazard, () => this.fireInWater());

    // Debug overlay and dev keys (gray-box hall only: the overlay shows the key).
    this.debug = label(this, 6, 44, '', 8, COLORS.gold, 0, 0).setAlign('left').setVisible(false).setDepth(10);
    if (!this.dev) { this.refresh(); return; }
    this.input.keyboard.on('keydown-BACKTICK', () => this.debug.setVisible(!this.debug.visible));
    this.input.keyboard.on('keydown-L', () => {
      this.hall.lampsOn = !this.hall.lampsOn;
      this.say(this.hall.lampsOn ? 'Lamps on: prying is off.' : 'Lamps dark: Fireboy can pry a vault.');
      this.refresh();
    });
    this.input.keyboard.on('keydown-R', () => { this.hall.reset(); this.respawn(); this.refresh(); this.say('Fresh room.'); });
    for (const [key, id] of [['ONE', 1], ['TWO', 2], ['THREE', 3]]) {
      this.input.keyboard.on(`keydown-${key}`, () => this.scene.restart({ room: id }));
    }
    this.refresh();
  }

  say(text, color = COLORS.text) {
    this.status.setText(text).setColor(color);
  }

  // The vault (if any) a hero is standing at: overlapping its zone, nearest centre wins.
  vaultAt(rect) {
    const world = this.physics.world;
    const near = this.vaults.filter(v => world.overlap(rect, v.zone));
    return near.sort((a, b) => Math.abs(a.cx - rect.x) - Math.abs(b.cx - rect.x))[0] ?? null;
  }

  use(hero) {
    const { sprite: rect } = hero;
    const world = this.physics.world;
    const vault = this.vaultAt(rect);
    if (hero.id === 'fire' && world.overlap(rect, this.lever.zone)) {
      this.lever.pull();
      sfx.lever(this);
      this.hall.pullLever();
    } else if (hero.id === 'fire' && world.overlap(rect, this.dais.zone)) {
      if (!this.hall.searching) {
        this.say(this.hall.state === 'read' ? 'A vault is already unsealed.' : 'Nothing to read yet: pull the lever.', COLORS.dim);
        return;
      }
      this.dais.flash();
      this.hall.read();
    } else if (vault) {
      if (vault.state === 'unsealed') {
        this.hall.open(vault.index);
      } else if (hero.id === 'fire' && vault.state === 'sealed') {
        if (this.hall.pry(vault.index) === 'denied') this.say('Sealed tight. Only the dais can unseal one here.', COLORS.dim);
      } else if (vault.state === 'sealed') {
        this.say('Sealed. Find the right one first.', COLORS.dim);
      }
    }
  }

  onHall(event, data) {
    if (event === 'spread') { this.loop.reset(); this.say(this.hall.lampsOn ? 'The lamps glow evenly. Watergirl: swim laps!' : 'The search begins. Watergirl: swim laps!'); }
    if (event === 'lap') { sfx.pickup(this); this.say(data >= 4 ? 'Lap 4. The loop gate closes.' : `Lap ${data}.`); }
    if (event === 'read') { sfx.ready(this); this.say(`Vault ${data + 1} unseals! Open it.`, COLORS.gold); }
    if (event === 'cleared') { sfx.open(this); this.onCleared(); }
    if (event === 'lava') this.flood(data);
    if (this.mural && this.hall.failedReads >= MURAL_AFTER_FAILED_READS) this.mural.show();
    this.refresh();
  }

  // What happens when the key is found. The game's hall moves on to the next room.
  onCleared() {
    this.say(`The key! Room ${this.room.id} cleared. (R for a fresh room)`, COLORS.good);
  }

  refresh() {
    const h = this.hall;
    this.dial.set(h.laps);
    this.loop.setGate(h.gateClosed);
    h.lamps().forEach((level, i) => this.lamps[i].set(level));
    this.vaults.forEach(v => {
      const state = h.state === 'opened' && v.index === h.key ? 'open' : h.unsealed === v.index && h.state === 'read' ? 'unsealed' : 'sealed';
      v.setState(state, state === 'open');
    });
    this.updateDebug();
  }

  updateDebug() {
    const h = this.hall;
    const last = h.lastRead ? `vault ${h.lastRead.vault + 1} at ${h.lastRead.laps} laps` : '-';
    this.debug.setText([
      `room   ${this.room.id} (${h.vaults} vaults, pool ${this.poolMode})`,
      `state  ${h.state}`, `laps   ${h.laps}`, `key    vault ${h.key + 1}`, `read   ${last}`,
      `lamps  ${h.lampsOn ? 'on' : 'dark'}   fails ${h.failedReads}`,
      `key chance ${(this.chanceNow() * 100).toFixed(1)}%`,
    ].join('\n'));
  }

  // The key's chance on a read right now, from the formula (shown even when the lamps are dark).
  chanceNow() {
    const lit = this.hall.lampsOn;
    this.hall.lampsOn = true;
    const c = this.hall.lamps()[this.hall.key];
    this.hall.lampsOn = lit;
    return c;
  }

  flood(wrong) {
    sfx.flood(this);
    this.say(`Vault ${wrong + 1} was wrong! Lava! The key has moved.`, COLORS.bad);
    this.cameras.main.shake(500, 0.006);
    this.cameras.main.flash(250, 200, 60, 20);
    for (const h of Object.values(this.heroes)) {
      h.frozen = true;
      h.sprite.body.setVelocity(0, 0);
      h.sprite.play(`${h.id}-${h.id === 'water' ? 'death' : 'hit'}`);
    }
    // Lava wells up from the floor, holds, and drains away.
    const g = this.add.graphics().setDepth(5);
    const glow = this.add.rectangle(W / 2, FLOOR, W, 120, 0xff5a20, 0).setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setDepth(5);
    const lava = { h: 0 };
    const draw = () => {
      g.clear();
      const top = FLOOR + 16 - lava.h;
      for (let x = 0; x < W; x += 2) {
        const s = Math.round(2 * Math.sin(this.time.now / 150 + x * 0.12));
        g.fillStyle(0x9c2a1c).fillRect(x, top + 4 + s, 2, lava.h);
        g.fillStyle(DB.red).fillRect(x, top + 1 + s, 2, 4);
        g.fillStyle(DB.orange).fillRect(x, top + s, 2, 2);
        if ((x + Math.floor(this.time.now / 60)) % 18 === 0) g.fillStyle(DB.yellow).fillRect(x, top - 1 + s, 2, 1);
      }
      glow.setAlpha(Math.min(0.35, lava.h / 160));
    };
    this.events.on('update', draw);
    this.tweens.add({
      targets: lava, h: 64, duration: 450, ease: 'Quad.easeOut', yoyo: true, hold: 700,
      onComplete: () => { this.events.off('update', draw); g.destroy(); glow.destroy(); },
    });
    this.time.delayedCall(1500, () => this.respawn());
  }

  respawn() {
    for (const h of Object.values(this.heroes)) {
      h.sprite.body.reset(SPAWN[h.id], FLOOR);
      h.sprite.body.setAllowGravity(true);
      h.sprite.setAlpha(1).play(`${h.id}-idle`);
      faceHero(h.sprite, h.id, 1);
      h.frozen = false;
    }
    this.loop.reset();
  }

  fireInWater() {
    const h = this.heroes.fire;
    if (h.frozen) return;
    h.frozen = true;
    sfx.death(this);
    this.say('Fireboy fizzled in the water!', COLORS.bad);
    h.sprite.body.setVelocity(0, 0).setAllowGravity(false);
    h.sprite.play('fire-death');
    this.add.particles(h.sprite.x, FLOOR - 4, 'px', {
      speedY: { min: -60, max: -20 }, speedX: { min: -25, max: 25 }, lifespan: 600, emitting: false,
      tint: [DB.white, DB.cyan], alpha: { start: 1, end: 0 },
    }).explode(14);
    this.time.delayedCall(1000, () => {
      h.sprite.body.reset(SPAWN.fire, FLOOR);
      h.sprite.body.setAllowGravity(true);
      h.sprite.play('fire-idle');
      faceHero(h.sprite, 'fire', 1);
      h.frozen = false;
    });
  }

  update() {
    for (const hero of Object.values(this.heroes)) {
      const { body } = hero.sprite;
      if (hero.frozen) { body.setVelocityX(0); continue; }
      const { left, right, jump, use } = hero.keys;
      const dir = (right.isDown ? 1 : 0) - (left.isDown ? 1 : 0);
      body.setVelocityX(dir * SPEED);
      if (jump.isDown && (body.blocked.down || body.touching.down)) { body.setVelocityY(-JUMP); sfx.jump(this); }
      faceHero(hero.sprite, hero.id, dir);
      animateHero(hero.sprite, hero.id, dir);
      if (Phaser.Input.Keyboard.JustDown(use)) this.use(hero);
    }
    this.loop.update(this.heroes.water.sprite);
    this.updateDebug();
  }
}
