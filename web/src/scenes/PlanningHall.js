import Phaser from 'phaser';
import { brickBlock, drawLens, gem, heroSprite, keyHint, panel, templeBackground } from '../art.js';
import { POOL_LABELS, hintsFor, modeOf, planOf, progress } from '../progress.js';
import { sfx } from '../sfx.js';
import { COLORS, DB, PLAYERS, W, hex, label } from './style.js';

const FLOOR = 320;
const DIAL_Y = 138;
const DIAL_R = 22;
const STATION = {
  fire: { x: 160, hero: 236, hints: 22 },
  water: { x: 480, hero: 404, hints: 452 },
};
const SIGN_DX = { A: -52, B: 52 };

export class PlanningHall extends Phaser.Scene {
  constructor() { super('PlanningHall'); }

  create() {
    this.plain = modeOf(progress) === 'plain';
    this.plan = planOf(progress);
    this.selected = { fire: 'A', water: 'A' };
    this.ready = { fire: false, water: false };

    templeBackground(this, { seed: 3, candles: [[320, 120]] });
    brickBlock(this, 0, FLOOR, 40, 3);
    this.cameras.main.fadeIn(250, 20, 12, 28);

    label(this, W / 2, 18, 'THE PLANNING HALL', 16, COLORS.gold);
    label(this, W / 2, 38, this.plain
      ? 'Plain gems: pick the color your gem shows for each sign.'
      : `Entangled gems (${POOL_LABELS[progress.poolMode]}): turn your lenses.`, 8, COLORS.dim);
    keyHint(this, 548, 12, ['P'], 'physics');

    this.g = this.add.graphics();
    this.ui = {};
    for (const [id, p] of Object.entries(PLAYERS)) {
      const st = STATION[id];
      panel(this, st.x - 132, 56, 264, 168);
      label(this, st.x, 72, p.name.toUpperCase(), 16, p.text);
      const ui = this.ui[id] = { gems: {}, values: {} };
      for (const s of ['A', 'B']) {
        label(this, st.x + SIGN_DX[s], 98, `SIGN ${s}`, 8, COLORS.dim);
        ui.values[s] = label(this, st.x + SIGN_DX[s], 180, '', 8);
        if (this.plain) ui.gems[s] = gem(this, st.x + SIGN_DX[s], DIAL_Y, 12, 'red');
      }
      ui.ready = label(this, st.x, 206, '', 8);

      ui.hero = heroSprite(this, id, st.hero, FLOOR);
      if (id === 'water') ui.hero.setFlipX(true).setOrigin(1 - 63 / 128, 1);
      ui.aura = this.add.image(st.hero, FLOOR - 20, 'glow').setTint(p.glow).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6).setAlpha(0);

      const k = p.keys;
      const arrows = id === 'water';
      keyHint(this, st.hints, 256, arrows ? [',', '.'] : [k.down, k.up], this.plain ? 'swap color' : 'turn lens');
      keyHint(this, st.hints, 274, arrows ? ['up', 'down'] : [k.selA, k.selB], 'pick sign A / B');
      keyHint(this, st.hints, 292, [arrows ? 'ENTER' : k.ready], 'ready');

      this.input.keyboard.on(`keydown-${k.down}`, () => this.turn(id, -1));
      this.input.keyboard.on(`keydown-${k.up}`, () => this.turn(id, +1));
      this.input.keyboard.on(`keydown-${k.selA}`, () => this.select(id, 'A'));
      this.input.keyboard.on(`keydown-${k.selB}`, () => this.select(id, 'B'));
      this.input.keyboard.on(`keydown-${k.ready}`, () => this.toggleReady(id));
    }
    this.input.keyboard.on('keydown-P', () => this.scene.start('Pitch'));
    this.children.bringToTop(this.g);   // dials and selection draw above the panels

    const hints = hintsFor(progress);
    if (hints.length) {
      panel(this, 170, 230, 300, 36);
      label(this, W / 2, 248, hints.at(-1), 8, COLORS.gold).setWordWrapWidth(284);
    }
    this.redraw();
  }

  turn(id, step) {
    const s = this.selected[id];
    if (this.plain) {
      this.plan[id][s] = this.plan[id][s] === 'red' ? 'blue' : 'red';
    } else {
      this.plan[id][s] = (this.plan[id][s] + step + 8) % 8;
    }
    this.setReady(id, false);   // changing the plan takes back "ready"
    sfx.tick(this);
    this.redraw();
  }

  select(id, sign) {
    this.selected[id] = sign;
    this.redraw();
  }

  toggleReady(id) {
    this.setReady(id, !this.ready[id]);
    this.redraw();
    if (this.ready.fire && this.ready.water) {
      this.input.keyboard.removeAllListeners();
      sfx.ready(this);
      this.time.delayedCall(700, () => {
        this.cameras.main.fadeOut(300, 20, 12, 28);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Vaults'));
      });
    }
  }

  setReady(id, on) {
    if (this.ready[id] === on) return;
    this.ready[id] = on;
    const ui = this.ui[id];
    ui.hero.play(`${id}-${on ? 'cast' : 'idle'}`);
    this.tweens.killTweensOf(ui.aura);
    this.tweens.add({ targets: ui.aura, alpha: on ? 0.55 : 0, duration: 250 });
    if (on) sfx.tick(this);
  }

  redraw() {
    const g = this.g.clear();
    for (const [id, p] of Object.entries(PLAYERS)) {
      const st = STATION[id];
      const ui = this.ui[id];
      for (const s of ['A', 'B']) {
        const x = st.x + SIGN_DX[s];
        const v = this.plan[id][s];
        if (s === this.selected[id]) {
          // Gold corner brackets around the selected dial.
          g.fillStyle(DB.yellow);
          for (const [cx, cy, dx, dy] of [[x - 34, DIAL_Y - 29, 1, 1], [x + 34, DIAL_Y - 29, -1, 1], [x - 34, DIAL_Y + 29, 1, -1], [x + 34, DIAL_Y + 29, -1, -1]]) {
            g.fillRect(cx - (dx < 0 ? 8 : 0), cy - (dy < 0 ? 2 : 0), 8, 2).fillRect(cx - (dx < 0 ? 2 : 0), cy - (dy < 0 ? 8 : 0), 2, 8);
          }
        }
        if (this.plain) {
          ui.gems[s].setGem(v);
          ui.values[s].setText(v.toUpperCase()).setColor(hex(v === 'red' ? 0xff8a7a : 0x9fd0ff));
        } else {
          drawLens(g, x, DIAL_Y, DIAL_R, v, p.color);
          ui.values[s].setText(`${v}  (${v * 45} deg)`).setColor(COLORS.text);
        }
      }
      ui.ready.setText(this.ready[id] ? 'READY!' : 'not ready').setColor(this.ready[id] ? COLORS.good : COLORS.dim);
    }
  }
}
