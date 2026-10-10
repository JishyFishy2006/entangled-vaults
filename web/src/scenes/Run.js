import Phaser from 'phaser';
import { modeOf, planOf, progress } from '../progress.js';
import { PASS_BAR, runLevel } from '../quantum.js';
import { COLORS, GEM, PLAYERS, W, font } from './style.js';

const ROUND_MS = 100;            // 200 rounds ≈ 20 s
const BAR = { x: 80, y: 420, w: 800, h: 22 };

export class Run extends Phaser.Scene {
  constructor() { super('Run'); }

  create() {
    const mode = modeOf(progress);
    const pool = mode === 'plain' ? null : this.cache.json.get(`pool-${mode}`);
    this.result = runLevel(planOf(progress), pool, mode);
    this.wins = 0;
    this.i = 0;

    this.vaults = {};
    for (const [id, p] of Object.entries(PLAYERS)) {
      this.add.rectangle(p.x, 190, 420, 250, COLORS.panel).setStrokeStyle(2, p.color);
      this.add.text(p.x, 85, id === 'fire' ? 'Fire Vault' : 'Water Vault', font(20)).setOrigin(0.5);
      this.add.text(p.x - 90, 245, 'sign', font(14, COLORS.dim)).setOrigin(0.5);
      this.add.text(p.x + 90, 245, 'gem', font(14, COLORS.dim)).setOrigin(0.5);
      this.vaults[id] = {
        sign: this.add.text(p.x - 90, 180, '', font(72)).setOrigin(0.5),
        gem: this.add.circle(p.x + 90, 180, 40, 0x15171d).setStrokeStyle(3, COLORS.outline),
      };
    }

    this.outcome = this.add.text(W / 2, 340, '', font(24)).setOrigin(0.5);
    this.score = this.add.text(W / 2, 385, '', font(20)).setOrigin(0.5);
    this.add.rectangle(BAR.x, BAR.y, BAR.w, BAR.h, COLORS.panel).setOrigin(0);
    this.fill = this.add.rectangle(BAR.x, BAR.y, 0, BAR.h, COLORS.win).setOrigin(0);
    const passX = BAR.x + BAR.w * PASS_BAR / this.result.rounds;
    this.add.rectangle(passX, BAR.y - 6, 3, BAR.h + 12, COLORS.select).setOrigin(0.5, 0);
    this.add.text(passX, BAR.y - 10, `${PASS_BAR} to open`, font(13, '#ffd54f')).setOrigin(0.5, 1);
    this.strip = this.add.graphics();   // one tick per round
    this.updateScore();

    this.time.addEvent({ delay: ROUND_MS, repeat: this.result.rounds - 1, callback: () => this.step() });
  }

  step() {
    const r = this.result.log[this.i];
    for (const [id, sign, color] of [['fire', r.fireSign, r.fire], ['water', r.waterSign, r.water]]) {
      const v = this.vaults[id];
      v.sign.setText(sign);
      v.gem.setFillStyle(GEM[color]).setScale(1.15);
      this.tweens.add({ targets: v.gem, scale: 1, duration: ROUND_MS * 0.8 });
    }
    if (r.won) this.wins++;
    const bothB = r.fireSign === 'B' && r.waterSign === 'B';
    this.outcome
      .setText(`${r.won ? 'WIN' : 'LOSS'}  ·  needed ${bothB ? 'different' : 'same'} colors`)
      .setColor(r.won ? '#66bb6a' : '#ef5350');
    this.strip.fillStyle(r.won ? COLORS.win : COLORS.loss)
      .fillRect(BAR.x + this.i * BAR.w / this.result.rounds, BAR.y + BAR.h + 8, BAR.w / this.result.rounds, 14);
    this.i++;
    this.updateScore();

    if (this.i === this.result.rounds) {
      this.time.delayedCall(1000, () => this.scene.start('Verdict', { wins: this.wins, rounds: this.result.rounds }));
    }
  }

  updateScore() {
    this.score.setText(`Round ${this.i} / ${this.result.rounds}    Wins ${this.wins}`);
    this.fill.width = BAR.w * this.wins / this.result.rounds;
  }
}
