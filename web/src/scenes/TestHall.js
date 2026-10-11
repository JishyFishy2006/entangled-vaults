import Phaser from 'phaser';
import { T, brickBlock, keyHint, panel, templeBackground } from '../art.js';
import { animateHero, faceHero, makeHero } from '../heroes.js';
import { LanternDais } from '../objects/LanternDais.js';
import { LapDial } from '../objects/LapDial.js';
import { Mirror } from '../objects/Mirror.js';
import { Mural } from '../objects/Mural.js';
import { MURAL_AFTER_FAILED_READS, ROOMS } from '../objects/rooms.js';
import { MAX_LAPS, SearchHall } from '../objects/SearchHall.js';
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
const JUMP = 315;             // ~60 px high
const CHANNEL = { x1: 176, x2: 400 };
// The bridge over Watergirl's channel: 36 px above the dais, 52 above the floor, 36 px of
// water underneath. It ends above the fountain's stone basin.
const BRIDGES = [{ x1: 176, x2: 352, y: 268 }];
// The fountain's basin: a stone rim over the end of the channel, right at the spout.
// Watergirl lands on it from the mirror; Fireboy steps down onto it to cross the water.
const BASIN = { x1: 352, x2: 400, y: 300 };
const SHELF_STEP = { x1: 416, x2: 432, y: 268 };     // Room 3: from the floor up to the shelf
// Watergirl's climb from the bridge to the mirror, the hard way: two 1-tile stones and a
// 2-tile one, each a diagonal jump 48-52 px up (straight up under one bumps her head).
// A missed jump just drops her back to the bridge.
const STONES = [{ x1: 304, x2: 320, y: 216 }, { x1: 240, x2: 256, y: 168 }, { x1: 296, x2: 328, y: 120 }];
// The mirror's ledge sits at the top of the shaft: walk off its right edge and it is a
// straight fall onto the fountain's basin.
const LEDGE = { x1: 336, x2: 368, y: 88 };
const VAULT_AREA = { x1: 432, x2: 640 };
const SPAWN = { fire: 32, water: 60 };
const EVEN_FLAME = 0.6;        // flame brightness when the odds are evenly split
const READ_REVEAL_MS = 3000;   // length of the lantern roulette on a read

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
    templeBackground(this, { seed: 20 + room.id, candles: [[120, 72], [624, 100]] });
    const solids = this.physics.add.staticGroup();
    const solid = (x1, y, x2, h) => solids.add(this.add.zone((x1 + x2) / 2, y + h / 2, x2 - x1, h));
    const ledge = ({ x1, x2, y }) => { brickBlock(this, x1, y, (x2 - x1) / T, 1); solid(x1, y, x2, T); };
    brickBlock(this, 0, FLOOR, CHANNEL.x1 / T, 3);
    brickBlock(this, CHANNEL.x2, FLOOR, (W - CHANNEL.x2) / T, 3);
    solid(0, FLOOR, W, 40);                                   // the floor runs under the water: you walk on it
    BRIDGES.forEach(ledge);
    ledge(BASIN);
    if (room.vaults > 8) ledge(SHELF_STEP);
    STONES.forEach(ledge);
    ledge(LEDGE);
    if (room.vaults > 8) ledge({ x1: VAULT_AREA.x1, x2: VAULT_AREA.x2, y: SHELF_Y });

    panel(this, 16, 2, W - 32, 40);
    label(this, W / 2, 14, `${this.dev ? '' : 'THE HALL OF ECHOES - '}ROOM ${room.id} - ${room.vaults} VAULTS${room.lampsOn ? '' : ' - STILL LAMPS'}`, 8, COLORS.gold);
    this.status = label(this, W / 2, 30, 'Fireboy: pull the lever to begin.', 8, COLORS.text);
    this.add.graphics().fillStyle(DB.black, 0.85).fillRect(0, H - 14, W, 14).setDepth(6);
    if (this.dev) {
      label(this, W / 2, H - 7, 'FIRE: ADW + S use | WATER: arrows + DOWN use | ` debug 1-3 room R reset', 8, COLORS.dim).setDepth(6);
    } else {
      keyHint(this, 10, H - 7, ['A', 'D', 'W'], 'move').setDepth(6);
      keyHint(this, 104, H - 7, ['S'], 'lever/read/open').setDepth(6);
      keyHint(this, 300, H - 7, ['left', 'right', 'up'], 'move').setDepth(6);
      keyHint(this, 390, H - 7, ['down'], 'fountain/mirror').setDepth(6);
      for (const c of this.children.list.filter(o => o.type === 'Container')) c.setDepth(6);
    }

    // The room's pieces. Every event goes through the hall.
    const pools = { ideal: this.cache.json.get('pool-grover-ideal'), 'ionq-aria-1': this.cache.json.get('pool-grover-ionq-aria-1') };
    this.poolMode = groverPoolMode(progress.poolMode, room.vaults, pools);
    this.hall = new SearchHall({ vaults: room.vaults, lampsOn: room.lampsOn, pool: pools[this.poolMode] });
    this.hall.onChange = (event, data) => this.onHall(event, data);
    this.lever = new SpreadLever(this, 88, FLOOR);
    // The dais runs right up to the water's edge, so there is no hidden gap beside it.
    this.dais = new LanternDais(this, 112, CHANNEL.x1, FLOOR, solids);
    this.loop = new WaterLoop(this, CHANNEL.x1, CHANNEL.x2, FLOOR);
    this.mirror = new Mirror(this, 348, LEDGE.y);
    this.dial = new LapDial(this, 56, 168);
    this.mural = room.mural ? new Mural(this, 4, 43) : null;
    this.vaults = [];
    this.lamps = [];
    vaultLayout(room.vaults).forEach(({ cx, floorY, w }, i) => {
      this.vaults.push(new Vault(this, i, cx, floorY, w));
      this.lamps.push(new VaultLamp(this, cx, floorY - 54));
    });

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
      this.say(this.hall.lampsOn ? 'Live lamps: prying is off.' : 'Still lamps: Fireboy can pry a vault.');
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
    const atFountain = world.overlap(rect, this.loop.fountain);
    const atMirror = world.overlap(rect, this.mirror.zone);
    if (hero.id === 'fire' && world.overlap(rect, this.lever.zone)) {
      this.lever.pull();
      sfx.lever(this);
      this.hall.pullLever();
    } else if (hero.id === 'fire' && world.overlap(rect, this.dais.zone)) {
      if (!this.hall.searching) {
        this.say(this.hall.state === 'read' ? 'The echo is spent. Pull the lever to search again.' : 'Nothing to read yet: pull the lever.', COLORS.dim);
        return;
      }
      this.dais.flash();
      this.hall.read();
    } else if (atFountain || atMirror) {
      if (hero.id !== 'water') { this.say('Only Watergirl can work the fountain and the mirror.', COLORS.dim); return; }
      if (!this.hall.searching) {
        this.say(this.hall.state === 'read' ? 'The echo is spent. Pull the lever to search again.' : 'Nothing echoes yet: Fireboy must pull the lever.', COLORS.dim);
        return;
      }
      if (atFountain) this.hall.fountain(); else this.hall.mirror();
    } else if (vault) {
      if (this.revealing) {
        this.say('Wait for the lanterns to choose...', COLORS.dim);
      } else if (vault.state === 'unsealed') {
        this.hall.open(vault.index);
      } else if (hero.id === 'fire' && vault.state === 'sealed') {
        if (this.hall.pry(vault.index) === 'denied') this.say('Sealed tight. Only the dais can unseal one here.', COLORS.dim);
      } else if (vault.state === 'sealed') {
        this.say('Sealed. Find the right one first.', COLORS.dim);
      }
    }
  }

  onHall(event, data) {
    if (event === 'spread') {
      this.stopRoulette();
      this.say('Watergirl: DOWN at the fountain, then at the mirror up high.');
    }
    if (event === 'fountain') {
      this.loop.splash(data);
      this.say(data ? 'The fountain marks the key. Now the mirror, up high.' : 'The fountain again: the mark is gone.', COLORS.text);
    }
    if (event === 'lap') { this.mirror.flash(true); sfx.pickup(this); this.say(`The mirror turns the mark into light: lap ${data}.`); }
    if (event === 'unlap') { this.mirror.flash(false); this.say(`No mark: the mirror runs backwards, to lap ${data} (marked).`); }
    if (event === 'idle') { this.mirror.flash(false); this.say('Nothing to reflect yet: the fountain first.', COLORS.dim); }
    if (event === 'cap') this.say(`The mirror won't turn past ${MAX_LAPS} laps.`, COLORS.dim);
    if (event === 'read') { sfx.ready(this); this.say('The lanterns are choosing...', COLORS.gold); this.startRoulette(data); }
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
    this.loop.setMarked(h.marked && h.searching);
    if (!this.revealing) {
      // Flame: compared with an even split (all lit at the start). Glow: the chance itself.
      h.lamps().forEach((level, i) => this.lamps[i].set(EVEN_FLAME * level * h.vaults, level));
    }
    this.vaults.forEach(v => {
      const unsealed = h.unsealed === v.index && h.state === 'read' && !this.revealing;
      const state = h.state === 'opened' && v.index === h.key ? 'open' : unsealed ? 'unsealed' : 'sealed';
      v.setState(state, state === 'open');
    });
    this.updateDebug();
  }

  // The read, dramatised: lanterns blink one after another, slowing over ~3 s, and land on
  // the vault the search picked. Every vault takes its turn, so the order gives nothing away.
  startRoulette(chosen) {
    this.stopRoulette();
    this.revealing = true;
    const n = this.lamps.length;
    const delays = [];
    for (let total = 0, i = 0; total < READ_REVEAL_MS; i++) {
      const d = 45 + 260 * (i / 28) ** 2;
      delays.push(d);
      total += d;
    }
    let lit = ((chosen - delays.length) % n + n) % n;    // lands on `chosen` on the last step
    let at = 0;
    this.rouletteTimers = delays.map((d, i) => {
      at += d;
      return this.time.delayedCall(at, () => {
        lit = (lit + 1) % n;
        this.lamps.forEach((lamp, j) => lamp.blink(j === lit));
        sfx.tick(this);
        if (i === delays.length - 1) this.time.delayedCall(350, () => this.endRoulette(chosen));
      });
    });
  }

  stopRoulette() {
    for (const t of this.rouletteTimers ?? []) t.remove();
    this.rouletteTimers = [];
    this.revealing = false;
  }

  endRoulette(chosen) {
    this.revealing = false;
    this.refresh();                 // unseals the door (with its effect) and collapses the lamps
    this.afterReveal(chosen);
  }

  // What to say once the read lands. The game's hall adds coaching in the lit rooms.
  afterReveal(vault) {
    this.say(`Vault ${vault + 1} unseals! Open it.`, COLORS.gold);
  }

  updateDebug() {
    const h = this.hall;
    const last = h.lastRead ? `vault ${h.lastRead.vault + 1} at ${h.lastRead.laps} laps` : '-';
    this.debug.setText([
      `room   ${this.room.id} (${h.vaults} vaults, pool ${this.poolMode})`,
      `state  ${h.state}`, `laps   ${h.laps}${h.marked ? ' (marked)' : ''}`, `key    vault ${h.key + 1}`, `read   ${last}`,
      `lamps  ${h.lampsOn ? 'live' : 'still'}   fails ${h.failedReads}`,
      `key chance ${(this.chanceNow() * 100).toFixed(1)}%`,
    ].join('\n'));
  }

  // The key's chance on a read right now, from the formula (shown even when the lamps are still).
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
