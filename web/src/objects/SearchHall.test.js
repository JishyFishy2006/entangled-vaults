import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAX_LAPS, SearchHall } from './SearchHall.js';

const pool = JSON.parse(readFileSync(new URL('../../public/pools/grover-ideal.json', import.meta.url), 'utf8'));
const fixedKey = key => () => (key + 0.5) / 8;    // rng that always picks `key` in an 8-vault room

describe('SearchHall', () => {
  it('starts sealed with every lamp evenly lit, and ignores laps and reads before the lever', () => {
    const hall = new SearchHall({ vaults: 8, pool });
    expect(hall.state).toBe('sealed');
    hall.lamps().forEach(l => expect(l).toBeCloseTo(1 / 8, 12));
    expect(hall.lap()).toBe(false);
    expect(hall.read()).toBe(null);
  });

  it('runs lever -> laps -> read -> open, and the lamps follow the formula', () => {
    const hall = new SearchHall({ vaults: 8, pool, rng: fixedKey(5) });
    hall.pullLever();
    expect(hall.state).toBe('spread');
    expect(hall.lamps()[5]).toBeCloseTo(1 / 8, 10);
    hall.lap(); hall.lap();
    expect(hall.state).toBe('lapping');
    expect(hall.lamps()[5]).toBeCloseTo(0.945, 3);
    const v = hall.read();
    expect(hall.state).toBe('read');
    expect(hall.lastRead).toEqual({ vault: v, laps: 2 });
    expect(hall.open((v + 1) % 8)).toBe('sealed');      // only the unsealed vault opens
    const result = hall.open(v);
    expect(result).toBe(v === 5 ? 'key' : 'lava');
  });

  it('caps laps at 4 and closes the gate', () => {
    const hall = new SearchHall({ vaults: 8, pool });
    hall.pullLever();
    for (let i = 0; i < 6; i++) hall.lap();
    expect(hall.laps).toBe(MAX_LAPS);
    expect(hall.gateClosed).toBe(true);
  });

  it('resets the search when the lever is pulled mid-search', () => {
    const hall = new SearchHall({ vaults: 8, pool });
    hall.pullLever(); hall.lap(); hall.lap(); hall.lap();
    hall.pullLever();
    expect(hall.laps).toBe(0);
    expect(hall.state).toBe('spread');
  });

  it('collapses the lamps onto the read vault, and the lever spreads them out again', () => {
    const hall = new SearchHall({ vaults: 8, pool });
    hall.pullLever(); hall.lap(); hall.lap();
    const v = hall.read();
    expect(hall.lamps()).toEqual(Array.from({ length: 8 }, (_, i) => (i === v ? 1 : 0)));
    expect(hall.read()).toBe(null);            // the search is spent: no second read
    hall.pullLever();
    hall.lamps().forEach(l => expect(l).toBeCloseTo(1 / 8, 12));
  });

  it('allows an early read mid-laps, using the laps done so far', () => {
    const hall = new SearchHall({ vaults: 8, pool });
    hall.pullLever(); hall.lap();
    hall.read();
    expect(hall.lastRead.laps).toBe(1);
    expect(hall.lap()).toBe(false);    // no more laps once read
  });

  it('floods on a wrong vault: back to sealed, laps 0, a new key, one failed read', () => {
    let calls = 0;
    const keys = [2, 6];
    const hall = new SearchHall({ vaults: 8, pool, rng: () => (keys[Math.min(calls++, 1)] + 0.5) / 8 });
    expect(hall.key).toBe(2);
    hall.pullLever(); hall.lap(); hall.lap();
    // Force the read to a wrong vault, then open it.
    hall.read();
    hall.unsealed = 3;
    expect(hall.open(3)).toBe('lava');
    expect(hall.state).toBe('sealed');
    expect(hall.laps).toBe(0);
    expect(hall.key).toBe(6);
    expect(hall.failedReads).toBe(1);
  });

  it('has already counted the failed read when it announces the lava (for the mural)', () => {
    const hall = new SearchHall({ vaults: 16, lampsOn: false, pool });
    const seen = [];
    hall.onChange = (event) => { if (event === 'lava') seen.push(hall.failedReads); };
    for (let i = 0; i < 2; i++) {
      hall.pullLever(); hall.read();
      hall.unsealed = (hall.key + 1) % 16;
      hall.open(hall.unsealed);
    }
    expect(seen).toEqual([1, 2]);
  });

  it('forbids prying in lit rooms and allows it in dark ones', () => {
    const lit = new SearchHall({ vaults: 8, pool, rng: fixedKey(4) });
    expect(lit.pry(4)).toBe('denied');
    const dark = new SearchHall({ vaults: 8, lampsOn: false, pool, rng: fixedKey(4) });
    expect(dark.lamps().every(l => l === 0)).toBe(true);
    dark.pullLever(); dark.lap();
    expect(dark.lamps().every(l => l === 0)).toBe(true);     // dark rooms stay dark
    expect(dark.pry(4)).toBe('key');
    expect(dark.state).toBe('opened');
  });

  it('reads right ~95% at 2 laps and worse at 3 and 4 laps (the overshoot), over many searches', () => {
    const rate = laps => {
      let right = 0;
      for (let i = 0; i < 2000; i++) {
        const hall = new SearchHall({ vaults: 8, pool });
        hall.pullLever();
        for (let k = 0; k < laps; k++) hall.lap();
        if (hall.read() === hall.key) right++;
      }
      return right / 2000;
    };
    const r = [0, 1, 2, 3, 4].map(rate);
    expect(r[2]).toBeGreaterThan(0.9);
    expect(r[3]).toBeLessThan(0.45);
    expect(r[4]).toBeLessThan(0.05);
    expect(r[1]).toBeGreaterThan(0.65);
  });
});

describe('the three rooms', () => {
  it('each reads right most of the time at its best lap count, and Room 3 forbids nothing but shows no lamps', async () => {
    const { ROOMS } = await import('./rooms.js');
    for (const room of ROOMS) {
      let right = 0;
      for (let i = 0; i < 1000; i++) {
        const hall = new SearchHall({ vaults: room.vaults, lampsOn: room.lampsOn, pool });
        hall.pullLever();
        for (let k = 0; k < room.bestLaps; k++) hall.lap();
        if (hall.read() === hall.key) right++;
      }
      expect(right / 1000).toBeGreaterThan(0.9);
    }
    const dark = new SearchHall({ vaults: 16, lampsOn: false, pool });
    dark.pullLever(); dark.lap();
    expect(dark.lamps().every(l => l === 0)).toBe(true);
    expect(dark.canPry).toBe(true);
  });
});
