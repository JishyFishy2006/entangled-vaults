// Drawing kit for the temple look: DawnLike tiles plus pixel shapes drawn in the
// DawnBringer palette. Everything is placed on whole pixels of the 640x360 canvas.
import Phaser from 'phaser';
import { DB, GEM, GEM_LIGHT, H, PLAYERS, W, hex, label } from './scenes/style.js';

export const T = 16;   // DawnLike tile size

// Where each hero's body sits inside its 128x72 animation frame (feet on the bottom edge).
export const HERO_FRAME = {
  fire: { originX: 79 / 128, height: 45 },
  water: { originX: 63 / 128, height: 38 },
};

export function tile(scene, name, x, y) {
  const frame = scene.cache.json.get('tilemap')[name];
  return scene.add.image(x, y, 'tiles', frame).setOrigin(0);
}

// A deterministic random source, so decorations land in the same place every time.
export const seeded = seed => new Phaser.Math.RandomDataGenerator([String(seed)]);

// Dark temple back wall with vines, edge shadow, and optional wall candles.
export function templeBackground(scene, { seed = 1, candles = [] } = {}) {
  const rnd = seeded(seed);
  for (let y = 0; y < H; y += T) {
    for (let x = 0; x < W; x += T) {
      tile(scene, 'back_c', x, y).setTint(0x8a7f9a);
    }
  }
  for (let i = 0; i < 26; i++) {
    tile(scene, `vine${rnd.between(0, 7)}`, rnd.between(0, W / T - 1) * T, rnd.between(0, 4) * T).setAlpha(0.85);
  }
  // Vignette: darker towards the edges.
  const g = scene.add.graphics();
  for (let i = 0; i < 6; i++) {
    g.fillStyle(DB.black, 0.12).fillRect(0, 0, W, 10 + i * 8).fillRect(0, H - 10 - i * 8, W, 10 + i * 8)
      .fillRect(0, 0, 10 + i * 10, H).fillRect(W - 10 - i * 10, 0, 10 + i * 10, H);
  }
  for (const [x, y] of candles) wallCandle(scene, x, y);
}

// A wall candle that flickers and sheds embers.
export function wallCandle(scene, x, y) {
  tile(scene, 'sconce', x - 8, y - 8);
  const glow = scene.add.image(x, y - 4, 'glow').setTint(0xffa040).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5).setScale(1.6);
  scene.tweens.add({ targets: glow, alpha: { from: 0.35, to: 0.6 }, scale: { from: 1.4, to: 1.8 }, duration: 180, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [3], delay: Phaser.Math.Between(0, 300) });
  scene.add.particles(x, y - 6, 'px', {
    speedY: { min: -18, max: -8 }, speedX: { min: -4, max: 4 }, lifespan: 700, frequency: 260,
    tint: [0xffd060, 0xff8030], alpha: { start: 1, end: 0 }, blendMode: 'ADD',
  });
}

// Stone brick block made of DawnLike's 3x3 brick set; tiles are whole 16 px cells.
// A warm tint turns the grey brick into temple sandstone.
const BRICK_TINT = 0xe6d2b4;
export function brickBlock(scene, x, y, wTiles, hTiles) {
  for (let j = 0; j < hTiles; j++) {
    for (let i = 0; i < wTiles; i++) {
      const v = hTiles === 1 ? 't' : j === 0 ? 't' : j === hTiles - 1 ? 'b' : 'c';
      const hz = wTiles === 1 ? '' : i === 0 ? 'l' : i === wTiles - 1 ? 'r' : '';
      const name = v === 'c' ? (hz ? `brick_${hz}` : 'brick_c') : `brick_${v}${hz}`;
      tile(scene, name, x + i * T, y + j * T).setTint(BRICK_TINT);
    }
  }
  return { x, y, w: wTiles * T, h: hTiles * T };
}

// Animated liquid pool: wavy surface, highlight line, rising bubbles.
const LIQUID = {
  lava: { deep: 0x9c2a1c, body: DB.red, top: DB.orange, foam: DB.yellow, glow: 0xff6a20 },
  water: { deep: DB.navy, body: DB.blue, top: DB.cyan, foam: DB.white, glow: 0x4fa8ff },
  goo: { deep: 0x1e3a14, body: DB.moss, top: DB.green, foam: 0xc6f070, glow: 0x7ee040 },
};

export class Liquid {
  constructor(scene, x, y, w, h, kind) {
    Object.assign(this, { scene, x, y, w, h, kind, c: LIQUID[kind], t: Math.random() * 10 });
    this.g = scene.add.graphics();
    this.bubbles = [];
    scene.add.image(x + w / 2, y, 'glow').setTint(this.c.glow).setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(w + 24, 28).setAlpha(kind === 'water' ? 0.25 : 0.4);
    scene.events.on('update', this.draw, this);
    scene.events.once('shutdown', () => scene.events.off('update', this.draw, this));
  }

  draw(_, delta) {
    this.t += delta / 1000;
    const { g, x, y, w, h, c } = this;
    g.clear();
    g.fillStyle(c.deep).fillRect(x, y + 4, w, h - 4);
    for (let i = 0; i < w; i += 2) {
      const s = Math.round(1.5 * Math.sin(this.t * 3 + (x + i) * 0.22) + Math.sin(this.t * 1.7 + i * 0.07));
      g.fillStyle(c.body).fillRect(x + i, y + 2 + s, 2, 6);
      g.fillStyle(c.top).fillRect(x + i, y + 1 + s, 2, 2);
      if ((i + Math.floor(this.t * 6)) % 14 === 0) g.fillStyle(c.foam).fillRect(x + i, y + s, 2, 1);
    }
    if (Math.random() < delta / 300) this.bubbles.push({ bx: x + 2 + Math.random() * (w - 4), by: y + h - 2, life: 1 });
    for (const b of this.bubbles) {
      b.by -= delta * 0.012;
      b.life = (b.by - y) / h;
      g.fillStyle(c.foam, 0.8).fillRect(Math.round(b.bx), Math.round(b.by), 2, 2);
    }
    this.bubbles = this.bubbles.filter(b => b.by > y + 3);
  }
}

// Faceted pixel gem. Returns a Graphics object with setGem(color) to recolor it.
export function gem(scene, x, y, size, color = 'red') {
  const g = scene.add.graphics({ x, y });
  g.setGem = c => {
    const s = size;
    const base = c ? GEM[c] : DB.iron;
    const light = c ? GEM_LIGHT[c] : DB.stone;
    g.clear();
    g.fillStyle(DB.black).fillPoints([{ x: -s - 1, y: 0 }, { x: -s / 2, y: -s * 0.65 - 1 }, { x: s / 2, y: -s * 0.65 - 1 }, { x: s + 1, y: 0 }, { x: 0, y: s * 1.15 + 1 }], true);
    g.fillStyle(base).fillPoints([{ x: -s, y: 0 }, { x: -s / 2, y: -s * 0.65 }, { x: s / 2, y: -s * 0.65 }, { x: s, y: 0 }, { x: 0, y: s * 1.15 }], true);
    g.fillStyle(light).fillPoints([{ x: -s, y: 0 }, { x: -s / 2, y: -s * 0.65 }, { x: 0, y: -s * 0.65 }, { x: -s * 0.2, y: 0 }], true);
    g.fillStyle(DB.black, 0.25).fillPoints([{ x: s * 0.2, y: 0 }, { x: s, y: 0 }, { x: 0, y: s * 1.15 }], true);
    g.fillStyle(DB.white).fillRect(Math.round(-s * 0.55), Math.round(-s * 0.4), 2, 2);
    return g;
  };
  return g.setGem(color);
}

// Bronze lens dial with 8 ticks; `value` 0..7 points the needle at value x 45 deg (0 = up).
export function drawLens(g, x, y, r, value, color) {
  g.fillStyle(DB.black).fillCircle(x, y, r + 2);
  g.fillStyle(DB.brown).fillCircle(x, y, r + 1);
  g.fillStyle(DB.orange).fillCircle(x, y - 1, r);
  g.fillStyle(DB.navy).fillCircle(x, y, r - 3);
  g.fillStyle(0x24285a).fillCircle(x + 1, y + 1, r - 5);
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    g.fillStyle(k === value ? DB.yellow : DB.slate).fillRect(Math.round(x + (r - 2) * Math.sin(a)) - 1, Math.round(y - (r - 2) * Math.cos(a)) - 1, 2, 2);
  }
  const a = value * Math.PI / 4;
  g.lineStyle(3, DB.black).lineBetween(x, y, x + (r - 5) * Math.sin(a), y - (r - 5) * Math.cos(a));
  g.lineStyle(2, color).lineBetween(x, y, x + (r - 5) * Math.sin(a), y - (r - 5) * Math.cos(a));
  g.fillStyle(DB.yellow).fillCircle(x, y, 2);
  g.fillStyle(DB.white, 0.35).fillRect(x - r + 5, y - r + 6, 3, 2);
}

// Carved stone panel for UI text.
export function panel(scene, x, y, w, h, alpha = 0.92) {
  const g = scene.add.graphics();
  g.fillStyle(DB.black, alpha).fillRect(x, y, w, h);
  g.fillStyle(0x2a2032, alpha).fillRect(x + 2, y + 2, w - 4, h - 4);
  g.lineStyle(2, DB.iron).strokeRect(x + 1, y + 1, w - 2, h - 2);
  g.lineStyle(1, DB.stone, 0.6).strokeRect(x + 3.5, y + 3.5, w - 7, h - 7);
  g.fillStyle(DB.yellow);
  for (const [cx, cy] of [[x + 3, y + 3], [x + w - 5, y + 3], [x + 3, y + h - 5], [x + w - 5, y + h - 5]]) g.fillRect(cx, cy, 2, 2);
  return g;
}

// Keyboard key cap: a letter, or 'up' / 'down' / 'left' / 'right' for an arrow.
export function keycap(scene, x, y, key, color = DB.white) {
  const c = scene.add.container(Math.round(x), Math.round(y));
  const w = key.length > 1 && !['up', 'down', 'left', 'right'].includes(key) ? key.length * 8 + 6 : 12;
  const g = scene.add.graphics();
  g.fillStyle(DB.black).fillRect(-w / 2, -6, w, 13);
  g.fillStyle(DB.iron).fillRect(-w / 2 + 1, -6, w - 2, 11);
  g.fillStyle(DB.stone).fillRect(-w / 2 + 1, -6, w - 2, 1);
  c.add(g);
  const arrows = { up: [[0, -3], [-3, 2], [3, 2]], down: [[0, 3], [-3, -2], [3, -2]], left: [[-3, 0], [2, -3], [2, 3]], right: [[3, 0], [-2, -3], [-2, 3]] };
  if (arrows[key]) {
    g.fillStyle(color).fillTriangle(...arrows[key].flat().map((v, i) => v + (i % 2 ? -0.5 : 0)));
  } else {
    c.add(label(scene, 0, -1, key, 8, hex(color)));
  }
  c.width = w;
  return c;
}

// A row of key caps followed by a caption, e.g. [Q][E] turn dial.
export function keyHint(scene, x, y, keys, caption, color = DB.white) {
  let cx = x;
  for (const k of keys) {
    const cap = keycap(scene, 0, y, k, color);
    cap.x = cx + cap.width / 2;
    cx += cap.width + 2;
  }
  return label(scene, cx + 3, y, caption, 8, hex(DB.slate), 0, 0.5);
}

// Element symbols for vault doors, drawn on a Graphics at (x, y) centre.
export function drawSymbol(g, x, y, kind) {
  if (kind === 'fire') {
    g.fillStyle(DB.orange).fillTriangle(x, y - 10, x - 7, y + 4, x + 7, y + 4);
    g.fillStyle(DB.orange).fillCircle(x, y + 3, 7);
    g.fillStyle(DB.yellow).fillTriangle(x, y - 3, x - 3, y + 5, x + 3, y + 5);
    g.fillStyle(DB.yellow).fillCircle(x, y + 5, 3);
  } else {
    g.fillStyle(DB.cyan).fillTriangle(x, y - 10, x - 7, y + 3, x + 7, y + 3);
    g.fillStyle(DB.cyan).fillCircle(x, y + 3, 7);
    g.fillStyle(DB.white).fillRect(x - 3, y, 2, 4);
  }
}

// An arched vault door with a sliding panel. Returns { door (slides), frame }.
export function vaultDoor(scene, cx, floorY, kind) {
  const w = 32;
  const h = 48;
  const x = cx - w / 2;
  const y = floorY - h;
  const back = scene.add.graphics();
  back.fillStyle(DB.black).fillRect(x, y, w, h);
  const door = scene.add.graphics({ x: 0, y: 0 });
  const tone = kind === 'fire' ? [0x5a2018, 0x7a3020] : kind === 'water' ? [0x1c2450, 0x2a3a78] : [0x3a3040, 0x4e4458];
  door.fillStyle(tone[0]).fillRect(x + 2, y + 2, w - 4, h - 2);
  door.fillStyle(tone[1]).fillRect(x + 4, y + 4, w - 8, h - 6);
  for (let k = 0; k < 4; k++) door.fillStyle(DB.black, 0.25).fillRect(x + 4, y + 10 + k * 10, w - 8, 1);
  if (kind !== 'plain') drawSymbol(door, cx, y + 22, kind);
  const mask = scene.make.graphics({}, false).fillRect(x, y, w, h).createGeometryMask();
  door.setMask(mask);
  const frame = scene.add.graphics();
  frame.fillStyle(DB.black).fillRect(x - 6, y - 10, w + 12, 10).fillRect(x - 6, y - 10, 6, h + 10).fillRect(x + w, y - 10, 6, h + 10);
  frame.fillStyle(DB.stone).fillRect(x - 5, y - 9, w + 10, 8).fillRect(x - 5, y - 9, 4, h + 9).fillRect(x + w + 1, y - 9, 4, h + 9);
  frame.fillStyle(DB.slate).fillRect(x - 5, y - 9, w + 10, 2);
  if (kind !== 'plain') tile(scene, kind === 'fire' ? 'door_fire' : 'door_water', cx - 8, y - 28);
  return { door, frame, x, y, w, h };
}

// Spawn a hero sprite standing with its feet at (x, floorY).
export function heroSprite(scene, id, x, floorY) {
  const f = HERO_FRAME[id];
  const s = scene.add.sprite(x, floorY, PLAYERS[id].sheet).setOrigin(f.originX, 1);
  s.play(`${id}-idle`);
  return s;
}

// Face left or right, keeping the body (not the frame) at the same x.
export function face(sprite, id, dir) {
  if (!dir) return;
  const f = HERO_FRAME[id];
  sprite.setFlipX(dir < 0).setOrigin(dir < 0 ? 1 - f.originX : f.originX, 1);
}
