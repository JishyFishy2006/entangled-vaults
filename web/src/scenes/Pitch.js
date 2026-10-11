import { gem } from '../art.js';
import { POOL_LABELS } from '../progress.js';
import { PASS_BAR, WINNING_PLAN, bestPlainRate, fireRedShares, planWinRates } from '../quantum.js';
import { passChance } from '../stats.js';
import { SlideDeck, pct } from './SlideDeck.js';
import { COLORS, DB, PLAYERS, W, hex } from './style.js';

// Level 1's ~60 s physics card: four slides, 15 s each. Every number is computed
// here from the pool files and quantum.js, never typed in.
const ROUNDS = 200;
const THEORY = Math.cos(Math.PI / 8) ** 2;   // cos^2(22.5 deg) ~ 0.854
const avg = rates => Object.values(rates).reduce((a, b) => a + b, 0) / Object.values(rates).length;

export class Pitch extends SlideDeck {
  constructor() { super('Pitch'); }

  create() {
    this.stats = this.computeStats();
    this.startDeck([this.slideWall, this.slideEntangled, this.slideNoise, this.slideWhy, this.slideCircuit], 13);
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

  slideWall() {
    const { classical, classicalPass } = this.stats;
    this.title('1. THE 75% WALL', 'Each round, each vault shows a random sign, A or B.');

    const rows = [['A', 'A', 'the same'], ['A', 'B', 'the same'], ['B', 'A', 'the same'], ['B', 'B', 'DIFFERENT']];
    rows.forEach(([f, w, need], k) => {
      const y = 84 + k * 16;
      this.text(196, y, `Fire ${f}  +  Water ${w}`, 8, COLORS.text, 0);
      this.text(370, y, `need ${need} colors`, 8, need === 'DIFFERENT' ? COLORS.gold : COLORS.good, 0);
    });

    this.text(W / 2, 168, 'Plain gems fix one color per sign. Winning every round would need:');
    this.text(W / 2, 186, 'Fire A = Water A,  Fire A = Water B,  Fire B = Water A,  Fire B != Water B', 8, PLAYERS.water.text);
    this.text(W / 2, 204, 'The first three force Fire B = Water B, so one rule always breaks.');
    this.text(W / 2, 244, `BEST PLAIN PLAN: ${pct(classical, 0)}`, 16, COLORS.gold);
    this.text(W / 2, 266, '(checked live, over all 16 plain plans)', 8, COLORS.dim);
    this.text(W / 2, 296, `A 75% team opens the vault (${PASS_BAR}+ of ${ROUNDS}) only ${pct(classicalPass)} of the time.`, 8, COLORS.dim);
  }

  slideEntangled() {
    const { redMin, redMax } = this.stats;
    this.title('2. ENTANGLED GEMS CLIMB OVER IT', 'The gems share a Bell pair. Each lens sets the angle a gem is read at.');

    const lenses = [
      [-45, 'Watergirl B', PLAYERS.water.color], [0, 'Fireboy A', PLAYERS.fire.color],
      [45, 'Watergirl A', PLAYERS.water.color], [90, 'Fireboy B', PLAYERS.fire.color],
    ];
    const x = deg => Math.round(120 + (deg + 45) * (400 / 135));
    const y = 124;
    const g = this.graphics();
    g.fillStyle(DB.iron).fillRect(x(-45), y - 1, x(90) - x(-45), 3);
    for (const [deg, name, color] of lenses) {
      g.fillStyle(DB.black).fillCircle(x(deg), y, 7);
      g.fillStyle(color).fillCircle(x(deg), y, 6);
      this.text(x(deg), y - 30, name, 8, hex(color));
      this.text(x(deg), y - 18, `${deg} deg`, 8, COLORS.dim);
    }
    for (let k = 0; k < 3; k++) {
      this.text((x(lenses[k][0]) + x(lenses[k + 1][0])) / 2, y + 16, `45: same ${pct(THEORY, 0)}`, 8, COLORS.good);
    }
    g.fillStyle(DB.yellow).fillRect(x(-45), y + 30, 2, 8).fillRect(x(-45), y + 36, x(90) - x(-45), 2).fillRect(x(90) - 2, y + 30, 2, 8);
    this.text(W / 2, y + 48, `Fireboy B vs Watergirl B: 135 apart -> DIFFERENT ${pct(THEORY, 0)}, just what B,B needs`, 8, COLORS.gold);

    this.text(W / 2, 200, 'P(same) = cos^2(diff / 2)', 16);
    this.text(W / 2, 216, 'diff = the angle between the two lenses in play', 8, COLORS.dim);
    this.text(W / 2, 236, `Every sign pair wins cos^2(22.5 deg) = ${pct(THEORY)} of the time.`);
    this.text(W / 2, 270, `Yet each gem alone is a coin flip: Fireboy shows red ${pct(redMin, 0)}-${pct(redMax, 0)} of the time`, 8, COLORS.dim);
    this.text(W / 2, 284, 'across all 64 dial pairs, whatever Watergirl does. No message can pass', 8, COLORS.dim);
    this.text(W / 2, 298, 'through the gems: the link only shows when the results are compared.', 8, COLORS.dim);
  }

  slideNoise() {
    const { classical, classicalPass, entangled } = this.stats;
    this.title('3. IDEAL vs IONQ NOISE', 'The winning plan, scored exactly from each pool file.');

    const bar = { x: 232, w: 340, lo: 0.5, hi: 1 };
    const bx = rate => Math.round(bar.x + bar.w * (rate - bar.lo) / (bar.hi - bar.lo));
    const rows = [['Plain gems (best)', classical, DB.slate, classicalPass]];
    for (const mode of ['ideal', 'ionq-aria-1']) {
      if (entangled[mode]) rows.push([mode === 'ideal' ? 'Entangled (ideal)' : 'Entangled (IonQ)', entangled[mode].rate, mode === 'ideal' ? DB.green : DB.cyan, entangled[mode].pass]);
    }

    const g = this.graphics();
    rows.forEach(([name, rate, color, pass], k) => {
      const y = 98 + k * 40;
      this.text(bar.x - 8, y - 4, name, 8, COLORS.text, 1);
      this.text(bar.x - 8, y + 8, `opens ${pct(pass)} of runs`, 8, COLORS.dim, 1);
      g.fillStyle(DB.black).fillRect(bar.x - 1, y - 9, bar.w + 2, 18);
      g.fillStyle(color).fillRect(bar.x, y - 8, bx(rate) - bar.x, 16);
      g.fillStyle(DB.white, 0.25).fillRect(bar.x, y - 8, bx(rate) - bar.x, 2);
      this.text(bx(rate) - 4, y, pct(rate), 8, hex(DB.black), 1);
    });
    const top = 80;
    const bottom = 98 + (rows.length - 1) * 40 + 12;
    for (const [rate, color, text, below] of [[PASS_BAR / ROUNDS, DB.yellow, `${pct(PASS_BAR / ROUNDS, 0)} to open`, true], [THEORY, DB.white, `theory ${pct(THEORY)}`, false]]) {
      g.fillStyle(color, 0.9).fillRect(bx(rate), top, 1, bottom - top);
      this.text(bx(rate), below ? bottom + 8 : top - 8, text, 8, hex(color));
    }

    this.text(W / 2, 240, 'Per sign pair (Fire, Water)', 8, COLORS.dim);
    Object.entries(entangled).forEach(([mode, { pairs }], k) => {
      const line = `${POOL_LABELS[mode]}:  ` + Object.entries(pairs).map(([p, r]) => `${p[0]},${p[1]} ${pct(r)}`).join('   ');
      this.text(W / 2, 260 + k * 16, line);
    });
    if (!entangled['ionq-aria-1']) this.text(W / 2, 300, 'IonQ pool not generated yet.', 8, COLORS.bad);
  }

  slideWhy() {
    this.title('4. WHY IT MATTERS');
    [
      'This level is the CHSH game: the Bell test behind the 2022 Nobel Prize',
      'in Physics (Aspect, Clauser and Zeilinger). No plan written in advance',
      'can win more than 75%, so the colors can\'t have been fixed beforehand,',
      'unless the gems signal each other faster than light.',
    ].forEach((line, k) => this.text(W / 2, 76 + k * 14, line));
    this.text(W / 2, 152, 'UNDER THE HOOD', 8, COLORS.gold);
    [
      'Circuit: 2 qubits. H + CNOT make the Bell pair, one RY lens each, measure.',
      'Pools: 64 dial pairs x 1,000 shots, from Qiskit Aer and IonQ Aria 1 noise.',
      'Game: each round draws one shot from the pool for the two dials in play.',
    ].forEach((line, k) => this.text(W / 2, 170 + k * 14, line, 8, COLORS.dim));
    const red = gem(this, W / 2 - 120, 246, 7, 'red');
    const blue = gem(this, W / 2 + 120, 246, 7, 'blue');
    this.layer.add([red, blue]);
    this.text(W / 2, 246, 'THANKS FOR PLAYING!', 16, COLORS.gold);
    this.text(W / 2, 278, 'Art: chierit (heroes), DragonDePlatino & DawnBringer (DawnLike), CC BY 4.0', 8, COLORS.dim);
  }

  slideCircuit() {
    this.title('5. THE CIRCUIT', 'Run once per dial pair before you play: 2 qubits, one per gem.');
    const g = this.graphics();
    const [y0, y1] = [96, 140];
    this.wire(g, 132, 500, y0, 'q0 fire');
    this.wire(g, 132, 500, y1, 'q1 water');
    this.gate(g, 176, y0, 22, 22, 'H');
    this.cnot(g, 230, y0, y1);
    this.gate(g, 300, y0, 48, 22, 'RY a');
    this.gate(g, 300, y1, 48, 22, 'RY b');
    this.gate(g, 380, y0, 22, 22, 'M', DB.iron);
    this.gate(g, 380, y1, 22, 22, 'M', DB.iron);
    this.text(510, y0, 'red / blue', 8, PLAYERS.fire.text, 0);
    this.text(510, y1, 'red / blue', 8, PLAYERS.water.text, 0);
    [[176, 'coin'], [230, 'link'], [300, 'lenses'], [380, 'read']].forEach(([x, t]) => this.text(x, 166, t, 8, COLORS.gold));
    this.code(64, 190, [
      'qc = QuantumCircuit(2, 2)',
      "qc.h(0)                     # Fireboy's gem: a 50/50 coin",
      'qc.cx(0, 1)                 # link the gems: a Bell pair',
      "qc.ry(fire_pos * pi/4, 0)   # Fireboy's lens, 45 deg a step",
      "qc.ry(water_pos * pi/4, 1)  # Watergirl's lens",
      'qc.measure([0, 1], [0, 1])  # 0 = red, 1 = blue',
    ]);
    this.text(W / 2, 278, 'H and the CNOT make the gems always agree; each RY tilts how one gem', 8, COLORS.dim);
    this.text(W / 2, 290, 'is read. The game draws each round from 64 x 1,000 precomputed shots.', 8, COLORS.dim);
    this.text(W / 2, 312, 'SPACE: back', 8);
  }
}
