import { ROOMS } from '../objects/rooms.js';
import {
  bestLaps, classicalLooks, groverAmplitudes, groverPeakLaps, groverPoolMode, groverShare, lampLevels,
} from '../quantum.js';
import { SlideDeck, pct } from './SlideDeck.js';
import { COLORS, DB, PLAYERS, W } from './style.js';

// Level 2's physics card (press P): bits vs qubits, one lap, the overshoot, and
// quantum vs classical. Every number comes from the formula helpers or the pools.
const KEY = 5;                                     // the example key on slide 2 (vault 6)
const SIZES = ROOMS.map(r => r.vaults);            // 4, 8, 16
const CURVE = { 4: PLAYERS.fire.color, 8: DB.cyan, 16: DB.green };
const fmt = n => n.toLocaleString('en-US');

export class HallPitch extends SlideDeck {
  constructor() { super('HallPitch'); }

  create() {
    this.pools = { ideal: this.cache.json.get('pool-grover-ideal'), 'ionq-aria-1': this.cache.json.get('pool-grover-ionq-aria-1') };
    this.startDeck([this.slideBits, this.slideLap, this.slideOvershoot, this.slideVersus], 17);
  }

  slideBits() {
    this.title('1. BITS VS QUBITS', 'One key hides in one of 16 vaults. How do you find it?');
    const g = this.graphics();

    // Classical: a 4-bit register holds one number.
    this.text(170, 82, 'CLASSICAL BITS', 8, COLORS.gold);
    '0101'.split('').forEach((b, i) => {
      const x = 122 + i * 26;
      g.fillStyle(DB.black).fillRect(x - 1, 95, 22, 22).fillStyle(DB.iron).fillRect(x, 96, 20, 20);
      this.text(x + 10, 106, b, 16);
    });
    this.text(170, 130, '= the number 5, and only 5', 8, COLORS.dim);
    [
      '4 bits hold ONE vault number',
      'at a time. To search, check the',
      'vaults one by one. On average:',
    ].forEach((line, k) => this.text(170, 156 + k * 12, line));
    SIZES.forEach((n, k) => this.text(170, 200 + k * 13, `${n} vaults: ${classicalLooks(n).toFixed(2)} looks`, 8, COLORS.dim));

    // Quantum: 4 qubits carry an amplitude for every vault at once.
    this.text(470, 82, 'QUBITS', 8, COLORS.gold);
    const amps = groverAmplitudes(16, 0, KEY);
    amps.forEach((a, i) => {
      const x = 384 + i * 11;
      g.fillStyle(DB.blue).fillRect(x, 120 - Math.round(a * 60), 8, Math.round(a * 60));
    });
    g.fillStyle(DB.slate).fillRect(382, 120, 178, 1);
    this.text(470, 130, '16 bars: one per vault, all equal', 8, COLORS.dim);
    [
      '4 qubits hold all 16 vaults at',
      'once, each with an amplitude.',
      'But a read returns only ONE vault,',
      'chosen with chance = bar squared.',
    ].forEach((line, k) => this.text(470, 156 + k * 12, line));

    this.text(W / 2, 266, 'THE TRICK', 8, COLORS.gold);
    this.text(W / 2, 282, "Make the key's bar tall before you read. That is Grover's search,");
    this.text(W / 2, 296, 'and the fountain and the mirror are how you do it.');
  }

  slideLap() {
    this.title('2. ONE LAP = ONE GROVER STEP', `8 vaults, key in vault ${KEY + 1}. Bars are amplitudes: they can go negative.`);
    const g = this.graphics();
    const charts = [
      ['SPREAD (lever)', groverAmplitudes(8, 0, KEY), 'all vaults equal'],
      ['FOUNTAIN', groverAmplitudes(8, 0, KEY, true), "the key's sign flips"],
      ['MIRROR', groverAmplitudes(8, 1, KEY), 'reflected about average'],
    ];
    const base = 158;
    const scale = 70;
    charts.forEach(([name, amps, note], c) => {
      const x0 = 56 + c * 196;
      this.text(x0 + 76, 78, name, 8, COLORS.gold);
      g.fillStyle(DB.slate).fillRect(x0 - 4, base, 160, 1);
      amps.forEach((a, i) => {
        const h = Math.round(a * scale);
        g.fillStyle(i === KEY ? DB.yellow : DB.blue).fillRect(x0 + i * 19, h >= 0 ? base - h : base, 14, Math.abs(h));
      });
      if (c === 1) {
        // The average the mirror reflects about.
        const mean = amps.reduce((a, b) => a + b, 0) / amps.length;
        for (let x = x0 - 4; x < x0 + 156; x += 6) g.fillStyle(DB.white).fillRect(x, base - Math.round(mean * scale), 3, 1);
      }
      this.text(x0 + 76, 206, note, 8, COLORS.dim);
      this.text(x0 + 76, 220, `key chance ${pct(amps[KEY] ** 2)}`, 8, c === 2 ? COLORS.good : COLORS.text);
    });
    [
      'FOUNTAIN = the oracle: it marks the key by flipping its sign.',
      'That changes no chances, so nothing visible happens there.',
      'MIRROR = the diffuser: it reflects every bar about the average',
      '(dotted line), turning the flip into height. Each lap does both.',
    ].forEach((line, k) => this.text(W / 2, 250 + k * 14, line, 8, k % 2 ? COLORS.dim : COLORS.text));
  }

  slideOvershoot() {
    this.title('3. THE OVERSHOOT', 'Chance a read is right: sin^2((2k+1) theta), sin theta = 1/sqrt(N)');
    const g = this.graphics();
    const X = k => 120 + k * 80;
    const Y = p => Math.round(232 - p * 140);
    g.fillStyle(DB.slate).fillRect(X(0), Y(0), 320, 1).fillRect(X(0), Y(1), 1, 140);
    for (let k = 0; k <= 4; k++) this.text(X(k), Y(0) + 10, String(k), 8, COLORS.dim);
    this.text(X(2), Y(0) + 24, 'laps', 8, COLORS.dim);
    for (const p of [0, 0.5, 1]) this.text(X(0) - 6, Y(p), pct(p, 0), 8, COLORS.dim, 1);

    // Smooth curves from the formula, the dial's lap counts as squares, the measured pool as dots.
    const ideal = this.pools.ideal;
    for (const n of SIZES) {
      for (let t = 0; t <= 4; t += 0.04) {
        g.fillStyle(CURVE[n], 0.5).fillRect(Math.round(X(t)), Y(lampLevels(n, t, 0)[0]), 2, 2);
      }
      for (let k = 0; k <= 4; k++) {
        g.fillStyle(CURVE[n]).fillRect(X(k) - 3, Y(lampLevels(n, k, 0)[0]) - 3, 6, 6);
        if (ideal) g.fillStyle(DB.white).fillCircle(X(k), Y(groverShare(ideal, n, k)), 1.5);
      }
    }
    SIZES.forEach((n, i) => {
      g.fillStyle(CURVE[n]).fillRect(452, 104 + i * 16, 8, 8);
      this.text(466, 108 + i * 16, `${n} vaults: ${bestLaps(n)} lap${bestLaps(n) > 1 ? 's' : ''}`, 8, COLORS.text, 0);
    });
    this.text(466, 156, 'dots: measured', 8, COLORS.dim, 0);

    const p8 = k => pct(lampLevels(8, k, 0)[0], 0);
    [
      'Each lap turns the odds a fixed angle toward the key; too far and they',
      `swing past: 8 vaults read right ${p8(2)} at 2 laps, ${p8(3)} at 3, ${p8(4)} at 4.`,
      'Searching more never hurts a classical search. Here it does.',
    ].forEach((line, k) => this.text(W / 2, 268 + k * 14, line, 8, k === 2 ? COLORS.gold : COLORS.text));
  }

  slideVersus() {
    this.title('4. QUANTUM VS CLASSICAL', 'Looks needed to find the key, and how often one read is right.');
    const noisy = this.pools['ionq-aria-1'];
    const cols = [64, 196, 316, 420, 528];
    ['VAULTS', 'CLASSICAL', 'LAPS', 'READ RIGHT', 'IONQ NOISY'].forEach((h, i) => this.text(cols[i], 84, h, 8, COLORS.gold));
    ['', 'looks (avg)', '(quantum)', '(ideal)', '(Aria 1)'].forEach((h, i) => this.text(cols[i], 96, h, 8, COLORS.dim));
    const rows = SIZES.map(n => {
      const k = bestLaps(n);
      const read = this.pools.ideal ? groverShare(this.pools.ideal, n, k) : lampLevels(n, k, 0)[0];
      return [String(n), classicalLooks(n).toFixed(2), String(k), pct(read, 0), noisy ? pct(groverShare(noisy, n, k), 0) : '-'];
    });
    const big = 1e6;
    const bigLaps = groverPeakLaps(big);
    const bigP = Math.sin((2 * bigLaps + 1) * Math.asin(1 / Math.sqrt(big))) ** 2;
    rows.push([fmt(big), fmt(Math.round(classicalLooks(big))), fmt(bigLaps), pct(bigP, 0), '-']);
    rows.forEach((r, j) => r.forEach((cell, i) => this.text(cols[i], 114 + j * 15, cell, 8, j === 3 ? COLORS.good : COLORS.text)));

    const fellBack = noisy && groverPoolMode('ionq-aria-1', 16, this.pools) === 'ideal';
    [
      ['Classical looks grow like N/2; laps grow like sqrt(N). At a million', COLORS.text],
      [`vaults that is ${fmt(Math.round(classicalLooks(big)))} looks against ${fmt(bigLaps)} laps.`, COLORS.text],
      ['A wrong pry floods the room and moves the key, so each in-game pry', COLORS.dim],
      ['is a fresh 1-in-N guess: harder than a classical search that remembers.', COLORS.dim],
      ['The lanterns show a simulator\'s odds; real hardware only gives the read.', COLORS.dim],
      [fellBack ? 'Real noise hurts deep circuits: Room 3 falls back to the ideal pool.' : 'Real noise lowers every read on hardware.', COLORS.dim],
    ].forEach(([line, color], k) => this.text(W / 2, 196 + k * 14, line, 8, color));
    this.text(W / 2, 296, 'Any computer searches 16 vaults instantly: the win is in the looks.', 8, COLORS.gold);
  }
}
