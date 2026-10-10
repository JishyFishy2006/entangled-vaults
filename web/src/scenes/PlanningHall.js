import Phaser from 'phaser';
import { POOL_LABELS, hintsFor, modeOf, planOf, progress } from '../progress.js';
import { COLORS, GEM, PLAYERS, W, font } from './style.js';

const DIAL_Y = 300;
const DIAL_R = 34;
const SIGN_DX = { A: -80, B: 80 };

export class PlanningHall extends Phaser.Scene {
  constructor() { super('PlanningHall'); }

  create() {
    this.plain = modeOf(progress) === 'plain';
    this.plan = planOf(progress);
    this.selected = { fire: 'A', water: 'A' };
    this.ready = { fire: false, water: false };

    this.add.text(W / 2, 28, 'The Planning Hall', font(30)).setOrigin(0.5);
    this.add.text(W / 2, 66, this.plain
      ? 'Plain gems: choose the color your gem shows for each sign.'
      : `Entangled gems · ${POOL_LABELS[progress.poolMode]} · each dial turns your lens in 45° steps.`, font(18, COLORS.dim)).setOrigin(0.5);

    this.g = this.add.graphics();
    this.labels = {};
    for (const [id, p] of Object.entries(PLAYERS)) {
      this.add.rectangle(p.x, 150, 40, 60, p.color);                       // placeholder hero
      this.add.text(p.x, 194, p.name, font(20)).setOrigin(0.5);
      this.labels[id] = {
        A: this.add.text(p.x + SIGN_DX.A, DIAL_Y + 56, '', font(15)).setOrigin(0.5),
        B: this.add.text(p.x + SIGN_DX.B, DIAL_Y + 56, '', font(15)).setOrigin(0.5),
        ready: this.add.text(p.x, 400, '', font(18)).setOrigin(0.5),
      };
      for (const s of ['A', 'B']) {
        this.add.text(p.x + SIGN_DX[s], DIAL_Y - 58, `Sign ${s}`, font(16, COLORS.dim)).setOrigin(0.5);
      }
      this.add.text(p.x, 455, p.help, { ...font(14, COLORS.dim), align: 'center' }).setOrigin(0.5, 0);

      const k = p.keys;
      this.input.keyboard.on(`keydown-${k.down}`, () => this.turn(id, -1));
      this.input.keyboard.on(`keydown-${k.up}`, () => this.turn(id, +1));
      this.input.keyboard.on(`keydown-${k.selA}`, () => this.select(id, 'A'));
      this.input.keyboard.on(`keydown-${k.selB}`, () => this.select(id, 'B'));
      this.input.keyboard.on(`keydown-${k.ready}`, () => this.toggleReady(id));
    }

    this.add.text(W - 12, 12, 'P: how it works', font(13, COLORS.dim)).setOrigin(1, 0);
    this.input.keyboard.on('keydown-P', () => this.scene.start('Pitch'));

    const hints = hintsFor(progress);
    if (hints.length) {
      this.add.text(W / 2, 515, `Hint: ${hints.join('  ')}`, font(15, '#ffd54f')).setOrigin(0.5);
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
    this.ready[id] = false;   // changing the plan takes back "ready"
    this.redraw();
  }

  select(id, sign) {
    this.selected[id] = sign;
    this.redraw();
  }

  toggleReady(id) {
    this.ready[id] = !this.ready[id];
    this.redraw();
    if (this.ready.fire && this.ready.water) {
      this.input.keyboard.removeAllListeners();
      this.time.delayedCall(400, () => this.scene.start('Vaults'));
    }
  }

  redraw() {
    const g = this.g;
    g.clear();
    for (const [id, p] of Object.entries(PLAYERS)) {
      g.fillStyle(COLORS.panel).fillRoundedRect(p.x - 170, DIAL_Y - 80, 340, 160, 12);   // pedestal
      for (const s of ['A', 'B']) {
        const x = p.x + SIGN_DX[s];
        const v = this.plan[id][s];
        if (s === this.selected[id]) {
          g.lineStyle(3, COLORS.select).strokeRoundedRect(x - 50, DIAL_Y - 70, 100, 140, 10);
        }
        if (this.plain) {
          g.fillStyle(GEM[v]).fillCircle(x, DIAL_Y, DIAL_R);
          this.labels[id][s].setText(v);
        } else {
          // Lens: position 0 points straight up, each step turns 45° clockwise.
          const a = v * Math.PI / 4;
          g.lineStyle(3, COLORS.outline).fillStyle(0x15171d).fillCircle(x, DIAL_Y, DIAL_R).strokeCircle(x, DIAL_Y, DIAL_R);
          g.lineStyle(4, p.color).lineBetween(x, DIAL_Y, x + DIAL_R * Math.sin(a), DIAL_Y - DIAL_R * Math.cos(a));
          this.labels[id][s].setText(`${v}  (${v * 45}°)`);
        }
      }
      const key = p.keys.ready === 'ENTER' ? 'Enter' : p.keys.ready;
      this.labels[id].ready
        .setText(this.ready[id] ? 'READY' : `press ${key} when ready`)
        .setColor(this.ready[id] ? '#66bb6a' : COLORS.dim);
    }
  }
}
