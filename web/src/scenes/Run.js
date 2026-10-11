import Phaser from 'phaser';
import { brickBlock, gem, heroSprite, keyHint, panel, templeBackground } from '../art.js';
import { POOL_LABELS, modeOf, planOf, progress } from '../progress.js';
import { PASS_BAR, pairBreakdown, runLevel } from '../quantum.js';
import { isMuted, sfx, toggleMute } from '../sfx.js';
import { teachInit } from '../teach.js';
import { COLORS, DB, GEM, PLAYERS, W, hex, label } from './style.js';

const ROUND_MS = 100;            // 200 rounds ~ 20 s
const CLASSICAL = 0.75;          // best possible win rate with plain gems
const CHAMBER = { y: 8, h: 186, floor: 178 };
const CHART = { x: 56, y: 226, w: 544, h: 54, lo: 0.5, hi: 1 };
const BAR = { x: 56, y: 308, w: 544, h: 8 };

const chartY = rate => Math.round(CHART.y + CHART.h * (1 - (Phaser.Math.Clamp(rate, CHART.lo, CHART.hi) - CHART.lo) / (CHART.hi - CHART.lo)));

export class Run extends Phaser.Scene {
  constructor() { super('Run'); }

  create() {
    teachInit(this);
    const mode = modeOf(progress);
    const pool = mode === 'plain' ? null : this.cache.json.get(`pool-${mode}`);
    this.result = runLevel(planOf(progress), pool, mode);
    this.wins = 0;
    this.i = 0;
    this.rates = [];

    templeBackground(this, { seed: 5 });
    this.cameras.main.fadeIn(300, 20, 12, 28);

    this.vaults = {};
    for (const [id, p] of Object.entries(PLAYERS)) {
      const mirror = id === 'water';
      const cx = mirror ? 478 : 162;
      const dir = mirror ? -1 : 1;
      panel(this, cx - 154, CHAMBER.y, 308, CHAMBER.h, 0.8);
      brickBlock(this, cx - 150, CHAMBER.floor, 19, 1);
      label(this, cx, 22, `${p.name.toUpperCase()}'S VAULT`, 8, p.text);

      // Rune tablet that shows this vault's sign.
      const tx = cx - dir * 92;
      panel(this, tx - 24, 64, 48, 60);
      const signGlow = this.add.image(tx, 94, 'glow').setTint(DB.yellow).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      const sign = label(this, tx, 96, '', 32, COLORS.gold);
      label(this, tx, 136, 'SIGN', 8, COLORS.dim);
      label(this, tx, 146, '(input)', 8, COLORS.dim);

      // Pedestal with the gem.
      const gx = cx + dir * 62;
      brickBlock(this, gx - 16, CHAMBER.floor - 16, 2, 1);
      const halo = this.add.image(gx, 112, 'glow').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(1.4);
      const g = gem(this, gx, 112, 14, null);
      label(this, gx, 146, mode === 'plain' ? 'fixed color' : 'measured', 8, COLORS.dim);
      this.tweens.add({ targets: g, y: 108, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const sparks = this.add.particles(gx, 112, 'px', {
        speed: { min: 20, max: 60 }, lifespan: 350, quantity: 6, emitting: false, alpha: { start: 1, end: 0 }, blendMode: 'ADD',
      });

      const hero = heroSprite(this, id, cx - dir * 22, CHAMBER.floor).play(`${id}-cast`);
      if (mirror) hero.setFlipX(true).setOrigin(1 - 63 / 128, 1);
      this.vaults[id] = { sign, signGlow, gem: g, halo, sparks };
    }

    this.outcome = label(this, W / 2, 204, '', 8);

    // Scoreboard: running win-rate chart with the classical wall and the pass bar.
    panel(this, 16, 214, 608, 132, 0.88);
    const guides = this.add.graphics();
    guides.fillStyle(DB.black, 0.6).fillRect(CHART.x, CHART.y, CHART.w, CHART.h);
    const passRate = PASS_BAR / this.result.rounds;
    for (const [rate, color, text, below] of [
      [CLASSICAL, DB.slate, mode === 'plain' ? '75%' : '75% classical limit (Bell)', true],   // explained after the first try
      [passRate, DB.yellow, `${Math.round(passRate * 100)}% to open`, false],
    ]) {
      for (let x = CHART.x; x < CHART.x + CHART.w; x += 6) guides.fillStyle(color).fillRect(x, chartY(rate), 4, 1);
      label(this, CHART.x + CHART.w - 2, chartY(rate) + (below ? 6 : -6), text, 8, hex(color), 1, 0.5);
    }
    label(this, CHART.x - 4, CHART.y + 1, '100%', 8, COLORS.dim, 1, 0.5);
    label(this, CHART.x - 4, CHART.y + CHART.h, '50%', 8, COLORS.dim, 1, 0.5);
    this.chartLine = this.add.graphics();

    this.score = label(this, W / 2, 294, '', 8);
    const bar = this.add.graphics();
    bar.fillStyle(DB.black).fillRect(BAR.x - 1, BAR.y - 1, BAR.w + 2, BAR.h + 2);
    this.fill = this.add.graphics();
    const classicalX = BAR.x + Math.round(BAR.w * CLASSICAL);
    const passX = BAR.x + Math.round(BAR.w * passRate);
    const marks = this.add.graphics();
    marks.fillStyle(DB.slate).fillRect(classicalX, BAR.y - 3, 1, BAR.h + 6);
    marks.fillStyle(DB.yellow).fillRect(passX - 1, BAR.y - 4, 2, BAR.h + 8);
    label(this, passX + 4, BAR.y - 6, `${PASS_BAR} to open`, 8, COLORS.gold, 0, 0.5);
    label(this, classicalX - 4, BAR.y + 26, `${this.result.rounds * CLASSICAL}${mode === 'plain' ? '' : ' = classical max'}`, 8, COLORS.dim, 1, 0.5);
    label(this, 24, 336, mode === 'plain' ? 'Plain gems' : `Entangled - ${POOL_LABELS[mode]}`, 8, COLORS.dim, 0, 0.5);
    this.strip = this.add.graphics();

    this.muteText = keyHint(this, 524, 336, ['M'], '');
    this.showMute(isMuted());
    this.input.keyboard.on('keydown-M', () => this.showMute(toggleMute()));
    this.updateScore();

    this.time.addEvent({ delay: ROUND_MS, repeat: this.result.rounds - 1, callback: () => this.step(), startAt: -600 });
  }

  step() {
    const r = this.result.log[this.i];
    for (const [id, sign, color] of [['fire', r.fireSign, r.fire], ['water', r.waterSign, r.water]]) {
      const v = this.vaults[id];
      v.sign.setText(sign);
      v.signGlow.setAlpha(0.6);
      this.tweens.add({ targets: v.signGlow, alpha: 0.15, duration: ROUND_MS * 0.9 });
      v.gem.setGem(color).setScale(1.2);
      this.tweens.add({ targets: v.gem, scale: 1, duration: ROUND_MS * 0.8 });
      this.tweens.killTweensOf(v.halo);
      v.halo.setTint(GEM[color]).setAlpha(0.9).setScale(1.2);
      this.tweens.add({ targets: v.halo, alpha: 0.25, scale: 1.6, duration: ROUND_MS * 2.5, ease: 'Quad.easeOut' });
      v.sparks.setParticleTint(GEM[color]);
      v.sparks.explode(5);
    }
    if (r.won) this.wins++;
    (r.won ? sfx.win : sfx.loss)(this);

    const bothB = r.fireSign === 'B' && r.waterSign === 'B';
    this.outcome
      .setText(`${r.won ? 'WIN' : 'LOSS'} - needed ${bothB ? 'DIFFERENT' : 'the SAME'} colors`)
      .setColor(r.won ? COLORS.good : COLORS.bad);
    const cell = BAR.w / this.result.rounds;
    this.strip.fillStyle(r.won ? DB.green : DB.red).fillRect(BAR.x + Math.floor(this.i * cell), BAR.y + BAR.h + 4, Math.ceil(cell), 6);
    this.i++;
    this.rates.push(this.wins / this.i);
    this.drawChart();
    this.updateScore();

    if (this.i === this.result.rounds) {
      this.time.delayedCall(1000, () => {
        this.cameras.main.fadeOut(300, 20, 12, 28);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Verdict', { wins: this.wins, rounds: this.result.rounds, pairs: pairBreakdown(this.result.log) }));
      });
    }
  }

  drawChart() {
    const g = this.chartLine.clear();
    this.rates.forEach((rate, k) => {
      const x = CHART.x + Math.floor(CHART.w * k / this.result.rounds);
      const prev = k ? chartY(this.rates[k - 1]) : chartY(rate);
      const y = chartY(rate);
      g.fillStyle(DB.green).fillRect(x, Math.min(prev, y), 3, Math.abs(y - prev) + 2);
    });
  }

  updateScore() {
    const pct = this.i ? ` (${(this.wins / this.i * 100).toFixed(1)}%)` : '';
    this.score.setText(`Round ${this.i} / ${this.result.rounds}     Wins ${this.wins}${pct}`);
    this.fill.clear().fillStyle(DB.green).fillRect(BAR.x, BAR.y, Math.round(BAR.w * this.wins / this.result.rounds), BAR.h);
  }

  showMute(muted) {
    this.muteText.setText(muted ? 'sound off' : 'sound on');
  }
}
