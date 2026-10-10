import Phaser from 'phaser';
import { POOL_LABELS, modeOf, planOf, progress } from '../progress.js';
import { PASS_BAR, runLevel } from '../quantum.js';
import { isMuted, sfx, toggleMute } from '../sfx.js';
import { COLORS, GEM, PLAYERS, W, font } from './style.js';

const ROUND_MS = 100;            // 200 rounds ≈ 20 s
const CLASSICAL = 0.75;          // best possible win rate with plain gems
const PANEL = { y: 160, w: 420, h: 180 };
const CHART = { x: 80, y: 295, w: 800, h: 100, lo: 0.5, hi: 1 };   // running win rate, 50%..100%
const BAR = { x: 80, y: 440, w: 800, h: 18 };

const chartY = rate => CHART.y + CHART.h * (1 - (Phaser.Math.Clamp(rate, CHART.lo, CHART.hi) - CHART.lo) / (CHART.hi - CHART.lo));

export class Run extends Phaser.Scene {
  constructor() { super('Run'); }

  create() {
    const mode = modeOf(progress);
    const pool = mode === 'plain' ? null : this.cache.json.get(`pool-${mode}`);
    this.result = runLevel(planOf(progress), pool, mode);
    this.wins = 0;
    this.i = 0;
    this.rates = [];

    this.add.text(W / 2, 30, mode === 'plain' ? 'Plain gems' : `Entangled gems · ${POOL_LABELS[mode]}`, font(18, COLORS.dim)).setOrigin(0.5);

    this.vaults = {};
    for (const [id, p] of Object.entries(PLAYERS)) {
      this.add.rectangle(p.x, PANEL.y, PANEL.w, PANEL.h, COLORS.panel).setStrokeStyle(2, p.color);
      this.add.text(p.x, PANEL.y - 72, id === 'fire' ? 'Fire Vault' : 'Water Vault', font(18)).setOrigin(0.5);
      this.add.text(p.x - 90, PANEL.y + 62, 'sign', font(14, COLORS.dim)).setOrigin(0.5);
      this.add.text(p.x + 90, PANEL.y + 62, 'gem', font(14, COLORS.dim)).setOrigin(0.5);
      this.vaults[id] = {
        sign: this.add.text(p.x - 90, PANEL.y + 5, '', font(64)).setOrigin(0.5),
        halo: this.add.circle(p.x + 90, PANEL.y + 5, 36, 0xffffff, 0),
        gem: this.add.circle(p.x + 90, PANEL.y + 5, 36, 0x15171d).setStrokeStyle(3, COLORS.outline),
      };
    }
    this.outcome = this.add.text(W / 2, 272, '', font(20)).setOrigin(0.5);

    // Running win-rate chart with the classical wall and the pass bar.
    this.add.rectangle(CHART.x, CHART.y, CHART.w, CHART.h, COLORS.panel).setOrigin(0);
    const guides = this.add.graphics();
    const passRate = PASS_BAR / this.result.rounds;
    // The pass label sits above its line and the classical label below, since the lines are close.
    for (const [rate, color, label, below] of [
      [CLASSICAL, 0x9aa0b4, '75% best classical', true],
      [passRate, COLORS.select, `${Math.round(passRate * 100)}% to open`, false],
    ]) {
      guides.lineStyle(2, color, 0.9).lineBetween(CHART.x, chartY(rate), CHART.x + CHART.w, chartY(rate));
      this.add.text(CHART.x + CHART.w - 6, chartY(rate) + (below ? 3 : -2), label, font(12, Phaser.Display.Color.IntegerToColor(color).rgba))
        .setOrigin(1, below ? 0 : 1);
    }
    this.add.text(CHART.x - 6, CHART.y, '100%', font(11, COLORS.dim)).setOrigin(1, 0.5);
    this.add.text(CHART.x - 6, CHART.y + CHART.h, '50%', font(11, COLORS.dim)).setOrigin(1, 0.5);
    this.chartLine = this.add.graphics();

    // Wins bar: total wins out of all rounds, with the classical and pass marks.
    this.score = this.add.text(W / 2, 418, '', font(18)).setOrigin(0.5);
    this.add.rectangle(BAR.x, BAR.y, BAR.w, BAR.h, COLORS.panel).setOrigin(0);
    this.fill = this.add.rectangle(BAR.x, BAR.y, 0, BAR.h, COLORS.win).setOrigin(0);
    const classicalX = BAR.x + BAR.w * CLASSICAL;
    const passX = BAR.x + BAR.w * passRate;
    this.add.rectangle(classicalX, BAR.y - 4, 2, BAR.h + 8, 0x9aa0b4).setOrigin(0.5, 0);
    this.add.rectangle(passX, BAR.y - 6, 3, BAR.h + 12, COLORS.select).setOrigin(0.5, 0);
    this.add.text(passX, BAR.y - 8, `${PASS_BAR} to open`, font(12, '#ffd54f')).setOrigin(0.5, 1);
    this.add.text(classicalX, BAR.y + BAR.h + 26, `${this.result.rounds * CLASSICAL} = classical max`, font(12, COLORS.dim)).setOrigin(0.5, 0);
    this.strip = this.add.graphics();   // one tick per round

    this.muteText = this.add.text(W - 10, 530, '', font(12, COLORS.dim)).setOrigin(1, 1);
    this.showMute(isMuted());
    this.input.keyboard.on('keydown-M', () => this.showMute(toggleMute()));
    this.updateScore();

    this.time.addEvent({ delay: ROUND_MS, repeat: this.result.rounds - 1, callback: () => this.step() });
  }

  step() {
    const r = this.result.log[this.i];
    for (const [id, sign, color] of [['fire', r.fireSign, r.fire], ['water', r.waterSign, r.water]]) {
      const v = this.vaults[id];
      v.sign.setText(sign).setAlpha(0.4);
      this.tweens.add({ targets: v.sign, alpha: 1, duration: ROUND_MS * 0.5 });
      v.gem.setFillStyle(GEM[color]).setScale(1.15);
      this.tweens.add({ targets: v.gem, scale: 1, duration: ROUND_MS * 0.8 });
      this.tweens.killTweensOf(v.halo);
      v.halo.setFillStyle(GEM[color], 0.6).setScale(1).setAlpha(1);
      this.tweens.add({ targets: v.halo, scale: 1.7, alpha: 0, duration: ROUND_MS * 2.5, ease: 'Quad.easeOut' });
    }
    if (r.won) this.wins++;
    (r.won ? sfx.win : sfx.loss)(this);

    const bothB = r.fireSign === 'B' && r.waterSign === 'B';
    this.outcome
      .setText(`${r.won ? 'WIN' : 'LOSS'}  ·  needed ${bothB ? 'different' : 'same'} colors`)
      .setColor(r.won ? '#66bb6a' : '#ef5350');
    const cell = BAR.w / this.result.rounds;
    this.strip.fillStyle(r.won ? COLORS.win : COLORS.loss).fillRect(BAR.x + this.i * cell, BAR.y + BAR.h + 6, cell, 12);
    this.i++;
    this.rates.push(this.wins / this.i);
    this.drawChart();
    this.updateScore();

    if (this.i === this.result.rounds) {
      this.time.delayedCall(1000, () => this.scene.start('Verdict', { wins: this.wins, rounds: this.result.rounds }));
    }
  }

  drawChart() {
    const g = this.chartLine.clear().lineStyle(3, COLORS.win);
    g.beginPath();
    this.rates.forEach((rate, k) => {
      const x = CHART.x + CHART.w * (k + 1) / this.result.rounds;
      if (k === 0) g.moveTo(x, chartY(rate)); else g.lineTo(x, chartY(rate));
    });
    g.strokePath();
  }

  updateScore() {
    const pct = this.i ? ` (${(this.wins / this.i * 100).toFixed(1)}%)` : '';
    this.score.setText(`Round ${this.i} / ${this.result.rounds}    Wins ${this.wins}${pct}`);
    this.fill.width = BAR.w * this.wins / this.result.rounds;
  }

  showMute(muted) {
    this.muteText.setText(muted ? 'M: sound off' : 'M: sound on');
  }
}
