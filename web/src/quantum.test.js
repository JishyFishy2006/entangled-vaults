import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  WINNING_PLAN, bestPlainRate, decodeShot, drawShot, fireRedShares, pairBreakdown, planWinRates, runLevel,
} from './quantum.js';
import { passChance } from './stats.js';

const ideal = JSON.parse(
  readFileSync(new URL('../public/pools/ideal.json', import.meta.url), 'utf8'),
);

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
    expect(bestPlainRate()).toBe(0.75);
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

describe('exact rates from the pool', () => {
  it('match check_pool.py on ideal.json, so JS and Python decode bits the same way', () => {
    const r = planWinRates(WINNING_PLAN, ideal);
    expect(r.AA).toBeCloseTo(0.850, 3);
    expect(r.AB).toBeCloseTo(0.869, 3);
    expect(r.BA).toBeCloseTo(0.842, 3);
    expect(r.BB).toBeCloseTo(0.867, 3);
  });
  it("Fireboy's red share stays near 50% for every dial pair (no signalling)", () => {
    const shares = fireRedShares(ideal);
    expect(shares).toHaveLength(64);
    for (const s of shares) expect(Math.abs(s - 0.5)).toBeLessThan(0.05);
  });
});

describe('passChance', () => {
  it('matches the binomial odds in the spec', () => {
    expect(passChance(0.75, 200, 160)).toBeCloseTo(0.058, 3);
    expect(passChance(0.854, 200, 160)).toBeCloseTo(0.985, 3);
  });
});

describe('pairBreakdown', () => {
  it('counts rounds and wins per sign pair, adding up to the run', () => {
    const run = runLevel(WINNING_PLAN, ideal, 'ideal');
    const pairs = pairBreakdown(run.log);
    expect(Object.keys(pairs)).toEqual(['AA', 'AB', 'BA', 'BB']);
    expect(Object.values(pairs).reduce((n, p) => n + p.rounds, 0)).toBe(run.rounds);
    expect(Object.values(pairs).reduce((n, p) => n + p.won, 0)).toBe(run.wins);
    expect(pairs.BB.needSame).toBe(false);
    expect(pairs.AB.needSame).toBe(true);
  });
  it('shows the swapped-Watergirl plan failing on B,A and B,B', () => {
    const swapped = { fire: { A: 0, B: 2 }, water: { A: 7, B: 1 } };
    let ba = 0, bb = 0, aa = 0;
    for (let i = 0; i < 10; i++) {
      const p = pairBreakdown(runLevel(swapped, ideal, 'ideal').log);
      ba += p.BA.won / p.BA.rounds; bb += p.BB.won / p.BB.rounds; aa += p.AA.won / p.AA.rounds;
    }
    expect(ba / 10).toBeLessThan(0.3);
    expect(bb / 10).toBeLessThan(0.3);
    expect(aa / 10).toBeGreaterThan(0.75);
  });
});
