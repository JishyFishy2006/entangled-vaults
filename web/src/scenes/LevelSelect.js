import Phaser from 'phaser';
import { Liquid, T, brickBlock, gem, heroSprite, keyHint, panel, templeBackground } from '../art.js';
import { isCleared } from '../clears.js';
import { LEVELS } from '../levels.js';
import { sfx } from '../sfx.js';
import { COLORS, DB, H, W, label } from './style.js';

const FLOOR = 320;
const CARD = { w: 200, h: 112, y: 116, gap: 24 };

// The game's first screen: the title, and one card per level. Nothing is locked.
export class LevelSelect extends Phaser.Scene {
  constructor() { super('LevelSelect'); }

  init(data) {
    this.index = Math.max(0, LEVELS.findIndex(l => l.id === data?.level));
    this.leaving = false;   // Phaser reuses the scene object, so reset per visit
  }

  create() {
    templeBackground(this, { seed: 7, candles: [[96, 150], [544, 150]] });
    this.cameras.main.fadeIn(250, 20, 12, 28);

    // Floor with a lava and a water pool sunk into it.
    brickBlock(this, 0, FLOOR, 4, 3);
    new Liquid(this, 64, FLOOR + 4, 48, 28, 'lava');
    brickBlock(this, 112, FLOOR, 26, 3);
    new Liquid(this, 528, FLOOR + 4, 48, 28, 'water');
    brickBlock(this, 576, FLOOR, 4, 3);
    brickBlock(this, 64, FLOOR + T * 2, 3, 1);
    brickBlock(this, 528, FLOOR + T * 2, 3, 1);
    heroSprite(this, 'fire', 180, FLOOR);
    heroSprite(this, 'water', 460, FLOOR).setFlipX(true).setOrigin(1 - 63 / 128, 1);

    label(this, W / 2, 34, 'ENTANGLED VAULTS', 32, COLORS.gold);
    label(this, W / 2, 70, 'Choose a level', 8, COLORS.dim);

    // One card per level.
    const total = LEVELS.length * CARD.w + (LEVELS.length - 1) * CARD.gap;
    this.cards = LEVELS.map((level, i) => {
      const x = W / 2 - total / 2 + i * (CARD.w + CARD.gap);
      const c = this.add.container(x, CARD.y);
      c.add(panel(this, 0, 0, CARD.w, CARD.h));
      c.add(label(this, CARD.w / 2, 16, `LEVEL ${level.id}`, 16, COLORS.gold));
      c.add(label(this, CARD.w / 2, 36, level.name, 8, COLORS.text));
      this.drawIcon(c, level.id);
      if (isCleared(level.id)) {
        const check = this.add.graphics();
        check.lineStyle(3, DB.black).lineBetween(CARD.w - 26, 14, CARD.w - 20, 20).lineBetween(CARD.w - 20, 20, CARD.w - 10, 8);
        check.lineStyle(2, DB.green).lineBetween(CARD.w - 26, 14, CARD.w - 20, 20).lineBetween(CARD.w - 20, 20, CARD.w - 10, 8);
        c.add(check);
        c.add(label(this, CARD.w / 2, CARD.h - 12, 'cleared', 8, COLORS.good));
      }
      return { level, c, x };
    });
    this.frame = this.add.graphics();
    this.arrow = label(this, 0, CARD.y + CARD.h + 12, '^', 16, COLORS.gold);
    this.tweens.add({ targets: this.arrow, y: this.arrow.y + 3, duration: 400, yoyo: true, repeat: -1 });

    keyHint(this, 196, 266, ['left', 'right'], 'choose');
    keyHint(this, 292, 266, ['ENTER'], 'start');
    keyHint(this, 392, 266, ['P'], 'how it works');
    this.add.graphics().fillStyle(DB.black, 0.85).fillRect(0, H - 14, W, 14);
    label(this, W / 2, H - 7, 'Art: chierit, DragonDePlatino & DawnBringer (CC BY 4.0)', 8, COLORS.dim);

    const kb = this.input.keyboard;
    for (const k of ['LEFT', 'A']) kb.on(`keydown-${k}`, () => this.move(-1));
    for (const k of ['RIGHT', 'D']) kb.on(`keydown-${k}`, () => this.move(1));
    for (const k of ['ENTER', 'SPACE']) kb.on(`keydown-${k}`, () => this.start());
    kb.once('keydown-P', () => this.go('Pitch'));
    this.select();
  }

  // Little pictures: Level 1's linked gems, Level 2's row of lamps over vaults.
  drawIcon(c, id) {
    const cy = 72;
    if (id === 1) {
      const red = gem(this, CARD.w / 2 - 24, cy, 7, 'red');
      const blue = gem(this, CARD.w / 2 + 24, cy, 7, 'blue');
      const thread = this.add.graphics();
      for (let x = -14; x <= 14; x += 2) thread.fillStyle(x % 4 ? DB.cyan : DB.yellow, 0.7).fillRect(CARD.w / 2 + x, cy + Math.round(2 * Math.sin(x * 0.4)), 2, 2);
      c.add([thread, red, blue]);
      return;
    }
    const g = this.add.graphics();
    const lamps = [];
    for (let i = 0; i < 4; i++) {
      const x = CARD.w / 2 - 42 + i * 28;
      g.fillStyle(DB.black).fillRect(x - 8, cy - 4, 16, 24);
      g.fillStyle(DB.iron).fillRect(x - 7, cy - 3, 14, 22);
      g.fillStyle(DB.slate).fillRect(x - 2, cy + 6, 4, 4);
      lamps.push(this.add.circle(x, cy - 12, 4, DB.yellow).setAlpha(0.15));
    }
    c.add([g, ...lamps]);
    // One lamp brightens, peaks and fades again, like the search itself.
    this.tweens.add({ targets: lamps[2], alpha: 1, duration: 900, yoyo: true, repeat: -1, hold: 300, repeatDelay: 400 });
  }

  move(step) {
    this.index = (this.index + step + this.cards.length) % this.cards.length;
    sfx.tick(this);
    this.select();
  }

  select() {
    const { x } = this.cards[this.index];
    this.frame.clear().lineStyle(2, DB.yellow).strokeRect(x - 2, CARD.y - 2, CARD.w + 4, CARD.h + 4);
    this.arrow.setX(x + CARD.w / 2);
    this.cards.forEach((card, i) => card.c.setAlpha(i === this.index ? 1 : 0.7));
  }

  start() {
    if (this.leaving) return;
    sfx.ready(this);
    const { level } = this.cards[this.index];
    this.go(level.scene, level.id === 2 ? { room: 1 } : undefined);
  }

  go(scene, data) {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(250, 20, 12, 28);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene, data));
  }
}
