import Phaser from 'phaser';
import { POOL_LABELS } from '../progress.js';
import { PASS_BAR, WINNING_PLAN, bestPlainRate, fireRedShares, planWinRates } from '../quantum.js';
import { passChance } from '../stats.js';
import { COLORS, H, PLAYERS, W, font } from './style.js';

// A ~60 s end screen: four slides, 15 s each, auto-advancing. Every number is
// computed here from the pool files and quantum.js, never typed in.
const SLIDE_MS = 15000;
const ROUNDS = 200;
const THEORY = Math.cos(Math.PI / 8) ** 2;   // cos²(22.5°) ≈ 0.854
// The epsilon rounds exact halves up (0.8465 → 84.7%) despite float error, matching check_pool.py.
const pct = (x, d = 1) => `${(x * 100 + 1e-9).toFixed(d)}%`;
const avg = rates => Object.values(rates).reduce((a, b) => a + b, 0) / Object.values(rates).length;

export class Pitch extends Phaser.Scene {
  constructor() { super('Pitch'); }

  create() {
    this.stats = this.computeStats();
    this.slides = [this.slideWall, this.slideEntangled, this.slideNoise, this.slideWhy];
    this.layer = this.add.container();
    this.progress = this.add.graphics();
    this.add.text(W - 12, H - 10, '← → or Space: next · Esc: back to the game', font(12, COLORS.dim)).setOrigin(1, 1);

    this.input.keyboard.on('keydown-RIGHT', () => this.show(this.index + 1));
    this.input.keyboard.on('keydown-SPACE', () => this.show(this.index + 1));
    this.input.keyboard.on('keydown-LEFT', () => this.show(Math.max(0, this.index - 1)));
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('PlanningHall'));
    this.show(0);
  }

  computeStats() {
    const pools = { ideal: this.cache.json.get('pool-ideal'), 'ionq-aria-1': this.cache.json.get('pool-ionq-aria-1') };
    const entangled = {};
    for (const [mode, pool] of Object.entries(pools)) {
      if (!pool?.pools) continue;
      const pairs = planWinRates(WINNING_PLAN, pool);
      entangled[mode] = { pairs, rate: avg(pairs), pass: passChance(avg(pairs), ROUNDS, PASS_BAR) };
    }
    const shares = pools.ideal ? fireRedShares(pools.ideal) : [0.5];
    const classical = bestPlainRate();
    return {
      classical,
      classicalPass: passChance(classical, ROUNDS, PASS_BAR),
      entangled,
      redMin: Math.min(...shares),
      redMax: Math.max(...shares),
    };
  }

  show(i) {
    if (i >= this.slides.length) { this.scene.start('PlanningHall'); return; }
    this.index = i;
    this.layer.removeAll(true);
    this.slides[i].call(this);
    this.timer?.remove();
    this.slideStart = this.time.now;
    this.timer = this.time.delayedCall(SLIDE_MS, () => this.show(this.index + 1));
  }

  update() {
    // Slide dots plus a thin bar showing time left on the current slide.
    const g = this.progress.clear();
    this.slides.forEach((_, k) => {
      g.fillStyle(k === this.index ? COLORS.select : COLORS.outline).fillCircle(W / 2 - 30 + k * 20, H - 34, 5);
    });
    const t = Phaser.Math.Clamp((this.time.now - this.slideStart) / SLIDE_MS, 0, 1);
    g.fillStyle(COLORS.outline).fillRect(0, H - 4, W, 4).fillStyle(COLORS.select).fillRect(0, H - 4, W * t, 4);
  }

  // Helpers that add to the current slide.
  text(x, y, str, size, color, opts = {}) {
    const t = this.add.text(x, y, str, { ...font(size, color), align: opts.align ?? 'center', lineSpacing: 6 })
      .setOrigin(opts.ox ?? 0.5, opts.oy ?? 0.5);
    this.layer.add(t);
    return t;
  }

  graphics() {
    const g = this.add.graphics();
    this.layer.add(g);
    return g;
  }

  title(str, sub) {
    this.text(W / 2, 42, str, 32);
    if (sub) this.text(W / 2, 82, sub, 17, COLORS.dim);
  }

  slideWall() {
    const { classical, classicalPass } = this.stats;
    this.title('1 · The 75% wall', 'Each round, each vault shows a random sign. Gems must show the same color, unless both signs are B.');

    const rows = [['A', 'A', 'same'], ['A', 'B', 'same'], ['B', 'A', 'same'], ['B', 'B', 'different']];
    rows.forEach(([f, w, need], k) => {
      const y = 140 + k * 30;
      this.text(330, y, `Fire ${f}  ·  Water ${w}`, 18, COLORS.text, { ox: 0 });
      this.text(560, y, `need ${need}`, 18, need === 'same' ? '#66bb6a' : '#ffd54f', { ox: 0 });
    });

    this.text(W / 2, 300,
      'Plain gems fix one color per sign. Winning every round would need\n'
      + 'Fire A = Water A,   Fire A = Water B,   Fire B = Water A,   and   Fire B ≠ Water B.\n'
      + 'The first three force Fire B = Water B, so one rule always breaks.', 18);
    this.text(W / 2, 400, `Best of all 16 plain plans (checked live): ${pct(classical, 0)}`, 24, '#ffd54f');
    this.text(W / 2, 440, `A 75% team opens the vault (${PASS_BAR}+ of ${ROUNDS}) only ${pct(classicalPass)} of the time.`, 17, COLORS.dim);
  }

  slideEntangled() {
    const { redMin, redMax } = this.stats;
    this.title('2 · Entangled gems climb over it', 'The gems share a Bell pair. Each lens sets the angle a gem is looked at from.');

    // Lens angles on a line: neighbours 45° apart, the two ends 135° apart.
    const lenses = [
      [-45, 'Watergirl B', PLAYERS.water.color], [0, 'Fireboy A', PLAYERS.fire.color],
      [45, 'Watergirl A', PLAYERS.water.color], [90, 'Fireboy B', PLAYERS.fire.color],
    ];
    const x = deg => 200 + (deg + 45) * (560 / 135);
    const y = 220;
    const g = this.graphics();
    g.lineStyle(3, COLORS.outline).lineBetween(x(-45), y, x(90), y);
    for (const [deg, name, color] of lenses) {
      g.fillStyle(color).fillCircle(x(deg), y, 12);
      this.text(x(deg), y - 42, `${name}\n${deg}°`, 15);
    }
    for (let k = 0; k < 3; k++) {
      this.text((x(lenses[k][0]) + x(lenses[k + 1][0])) / 2, y + 26, `45° → same ${pct(THEORY, 0)}`, 14, '#66bb6a');
    }
    g.lineStyle(2, COLORS.select).lineBetween(x(-45), y + 50, x(-45), y + 60).lineBetween(x(-45), y + 60, x(90), y + 60).lineBetween(x(90), y + 50, x(90), y + 60);
    this.text(W / 2, y + 80, `Fireboy B vs Watergirl B: 135° → different ${pct(THEORY, 0)}  (exactly what B,B needs)`, 15, '#ffd54f');

    this.text(W / 2, 370, 'P(same color) = cos²(angle difference ÷ 2)', 22);
    this.text(W / 2, 410, `Every sign pair wins cos²(22.5°) = ${pct(THEORY)} of the time.`, 18);
    this.text(W / 2, 455,
      `Yet each gem alone is a coin flip: Fireboy shows red ${pct(redMin, 0)}–${pct(redMax, 0)} of the time across all 64 dial pairs,\n`
      + 'whatever Watergirl does. No message can pass through the gems; the link only shows when you compare.', 14, COLORS.dim);
  }

  slideNoise() {
    const { classical, classicalPass, entangled } = this.stats;
    this.title('3 · Ideal simulator vs. IonQ Aria 1 noise', 'The winning plan, scored exactly from each pool file (1,000 shots per dial pair).');

    const bar = { x: 300, w: 560, lo: 0.5, hi: 1 };
    const bx = rate => bar.x + bar.w * (rate - bar.lo) / (bar.hi - bar.lo);
    const rows = [['Plain gems (best)', classical, 0x9aa0b4, classicalPass]];
    for (const mode of ['ideal', 'ionq-aria-1']) {
      if (entangled[mode]) rows.push([`Entangled · ${POOL_LABELS[mode]}`, entangled[mode].rate, mode === 'ideal' ? COLORS.win : PLAYERS.water.color, entangled[mode].pass]);
    }

    const g = this.graphics();
    rows.forEach(([label, rate, color, pass], k) => {
      const y = 150 + k * 62;
      this.text(bar.x - 14, y, label, 16, COLORS.text, { ox: 1 });
      g.fillStyle(COLORS.panel).fillRect(bar.x, y - 14, bar.w, 28);
      g.fillStyle(color).fillRect(bar.x, y - 14, bx(rate) - bar.x, 28);
      this.text(bx(rate) - 8, y, pct(rate), 16, '#15171d', { ox: 1 });
      this.text(bar.x - 14, y + 20, `opens the vault ${pct(pass)} of runs`, 12, COLORS.dim, { ox: 1 });
    });
    const top = 125;
    const bottom = 150 + (rows.length - 1) * 62 + 20;
    // The lines are close, so the pass label goes under its line and the theory label above.
    for (const [rate, color, label, below] of [
      [PASS_BAR / ROUNDS, COLORS.select, `${pct(PASS_BAR / ROUNDS, 0)} to open`, true],
      [THEORY, 0xffffff, `theory ${pct(THEORY)}`, false],
    ]) {
      g.lineStyle(2, color, 0.8).lineBetween(bx(rate), top, bx(rate), bottom);
      this.text(bx(rate), below ? bottom + 10 : top - 8, label, 12, Phaser.Display.Color.IntegerToColor(color).rgba);
    }

    const lines = Object.entries(entangled).map(([mode, { pairs }]) =>
      `${POOL_LABELS[mode]}:   ` + Object.entries(pairs).map(([p, r]) => `${p[0]},${p[1]} ${pct(r)}`).join('   '));
    this.text(W / 2, 395, 'Per sign pair', 15, COLORS.dim);
    this.text(W / 2, 435, lines.join('\n'), 15);
    if (!entangled['ionq-aria-1']) this.text(W / 2, 480, 'IonQ pool not generated yet.', 14, '#ef5350');
  }

  slideWhy() {
    this.title('4 · Why it matters');
    this.text(W / 2, 150,
      'This level is the CHSH game, the Bell test behind the 2022 Nobel Prize in Physics\n'
      + '(Aspect, Clauser and Zeilinger). No plan written down in advance can win more than 75%,\n'
      + 'so the colors can\'t have been fixed in advance, unless the gems signal each other faster than light.', 18);
    this.text(W / 2, 285,
      'Under the hood\n'
      + 'Circuit: 2 qubits · H and CNOT make the Bell pair · one RY lens per player · measure\n'
      + 'Pools: 64 dial pairs × 1,000 shots, from Qiskit Aer (ideal) and the IonQ Aria 1 noise model\n'
      + 'Game: each round draws one shot from the pool for the two dials in play', 16, COLORS.dim);
    this.text(W / 2, 420, 'Thanks for playing Entangled Vaults!', 26, '#ffd54f');
    this.text(W / 2, 460, 'Space to play again', 16);
  }
}
