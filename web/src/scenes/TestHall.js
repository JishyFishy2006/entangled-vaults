import Phaser from 'phaser';
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
const SIZE = { fire: { w: 14, h: 34 }, water: { w: 14, h: 30 } };

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
  constructor() { super('TestHall'); }

  init(data) {
    this.room = ROOMS.find(r => r.id === data?.room) ?? ROOMS[1];
  }

  create() {
    const room = this.room;
    this.cameras.main.setBackgroundColor(0x1e1a24);
    const solids = this.physics.add.staticGroup();
    const block = (x1, y, x2, h, color = DB.iron) => {
      this.add.rectangle((x1 + x2) / 2, y + h / 2, x2 - x1, h, color).setStrokeStyle(1, DB.stone);
      solids.add(this.add.zone((x1 + x2) / 2, y + h / 2, x2 - x1, h));
    };
    block(0, FLOOR, LOOP.x1, 40);
    block(LOOP.x2, FLOOR, W, 40);
    this.add.rectangle((LOOP.x1 + LOOP.x2) / 2, FLOOR + 28, LOOP.x2 - LOOP.x1, 24, DB.iron);
    solids.add(this.add.zone((LOOP.x1 + LOOP.x2) / 2, FLOOR + 20, LOOP.x2 - LOOP.x1, 40));   // walk on the water
    block(BRIDGE.x1, BRIDGE.y, BRIDGE.x2, 16, DB.stone);
    if (room.vaults > 8) block(VAULT_AREA.x1, SHELF_Y, VAULT_AREA.x2, 16, DB.stone);

    label(this, W / 2, 12, `ROOM ${room.id} - ${room.vaults} VAULTS${room.lampsOn ? '' : ' - DARK'}`, 8, COLORS.gold);
    this.status = label(this, W / 2, 30, 'Fireboy: pull the lever to begin.', 8, COLORS.text);
    label(this, W / 2, H - 8, 'FIRE: ADW + S use | WATER: arrows + DOWN use | ` debug 1-3 room R reset', 8, COLORS.dim);

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

    // Heroes: placeholder blocks with arcade bodies.
    this.heroes = {};
    for (const id of ['fire', 'water']) {
      const s = SIZE[id];
      const rect = this.add.rectangle(SPAWN[id], FLOOR - s.h / 2, s.w, s.h, PLAYERS[id].color);
      this.physics.add.existing(rect);
      rect.body.setCollideWorldBounds(true);
      this.physics.add.collider(rect, solids);
      const k = PLAYERS[id].keys;
      this.heroes[id] = {
        id, rect, frozen: false,
        keys: this.input.keyboard.addKeys({ left: k.left, right: k.right, jump: k.jump, use: id === 'fire' ? 'S' : 'DOWN' }),
      };
    }
    this.physics.add.overlap(this.heroes.fire.rect, this.loop.hazard, () => this.fireInWater());

    // Debug overlay and dev keys.
    this.debug = label(this, 6, 44, '', 8, COLORS.gold, 0, 0).setAlign('left').setVisible(false).setDepth(10);
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
    const { rect } = hero;
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
    if (event === 'cleared') { sfx.open(this); this.say(`The key! Room ${this.room.id} cleared. (R for a fresh room)`, COLORS.good); }
    if (event === 'lava') this.flood(data);
    if (this.mural && this.hall.failedReads >= MURAL_AFTER_FAILED_READS) this.mural.show();
    this.refresh();
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
    sfx.death(this);
    this.say(`Vault ${wrong + 1} was wrong! Lava! The key has moved.`, COLORS.bad);
    const lava = this.add.rectangle(W / 2, FLOOR, W, 0, DB.red, 0.7).setOrigin(0.5, 1).setDepth(5);
    this.tweens.add({ targets: lava, height: 60, duration: 300, yoyo: true, hold: 500, onComplete: () => lava.destroy() });
    this.cameras.main.shake(300, 0.006);
    for (const h of Object.values(this.heroes)) h.frozen = true;
    this.time.delayedCall(1100, () => this.respawn());
  }

  respawn() {
    for (const h of Object.values(this.heroes)) {
      h.rect.body.reset(SPAWN[h.id], FLOOR - SIZE[h.id].h / 2);
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
    this.time.delayedCall(700, () => {
      h.rect.body.reset(SPAWN.fire, FLOOR - SIZE.fire.h / 2);
      h.frozen = false;
    });
  }

  update() {
    for (const hero of Object.values(this.heroes)) {
      const { body } = hero.rect;
      if (hero.frozen) { body.setVelocity(0, 0); continue; }
      const { left, right, jump, use } = hero.keys;
      body.setVelocityX(((right.isDown ? 1 : 0) - (left.isDown ? 1 : 0)) * SPEED);
      if (jump.isDown && (body.blocked.down || body.touching.down)) body.setVelocityY(-JUMP);
      if (Phaser.Input.Keyboard.JustDown(use)) this.use(hero);
    }
    this.loop.update(this.heroes.water.rect);
    this.updateDebug();
  }
}
