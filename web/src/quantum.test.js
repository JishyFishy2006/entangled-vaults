import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeShot, drawShot, roundWon, runLevel } from './quantum.js';

const ideal = JSON.parse(
  readFileSync(new URL('../public/pools/ideal.json', import.meta.url), 'utf8'),
);
const WINNING_PLAN = { fire: { A: 0, B: 2 }, water: { A: 1, B: 7 } };
const SIGN_PAIRS = [['A', 'A'], ['A', 'B'], ['B', 'A'], ['B', 'B']];

describe('bit order', () => {
  it("'01' (only qubit 0 flipped) is Fireboy blue, Watergirl red", () => {
    expect(decodeShot('01')).toEqual({ name: 'fire_blue_water_red', fire: 'blue', water: 'red' });
  });
  it("'10' is Fireboy red, Watergirl blue", () => {
    expect(decodeShot('10')).toMatchObject({ fire: 'red', water: 'blue' });
  });
});

describe('drawShot', () => {
  it('only returns bitstrings present in the tally', () => {
    for (let i = 0; i < 1000; i++) expect(drawShot({ '01': 3, '10': 7 }, 10)).toMatch(/^(01|10)$/);
  });
});

describe('classical cap', () => {
  it('best of the 16 plain-gem plans scores exactly 0.75', () => {
    const colors = ['red', 'blue'];
    let best = 0;
    for (const fa of colors) for (const fb of colors) for (const wa of colors) for (const wb of colors) {
      const fire = { A: fa, B: fb };
      const water = { A: wa, B: wb };
      const wins = SIGN_PAIRS.filter(([fs, ws]) =>
        roundWon({ fire: fire[fs], water: water[ws] }, fs, ws)).length;
      best = Math.max(best, wins / SIGN_PAIRS.length);
    }
    expect(best).toBe(0.75);
  });
});

describe('quantum win rate', () => {
  it('winning plan averages at least 0.83 over 20 runs on ideal.json', () => {
    let wins = 0;
    let rounds = 0;
    for (let i = 0; i < 20; i++) {
      const run = runLevel(WINNING_PLAN, ideal, 'ideal');
      wins += run.wins;
      rounds += run.rounds;
    }
    expect(wins / rounds).toBeGreaterThanOrEqual(0.83);
  });
});
