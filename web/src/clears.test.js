import { afterEach, describe, expect, it } from 'vitest';
import { isCleared, markCleared } from './clears.js';
import { LEVELS } from './levels.js';

describe('level registry', () => {
  it('lists both levels with their starting scenes', () => {
    expect(LEVELS.map(l => [l.id, l.scene])).toEqual([[1, 'PlanningHall'], [2, 'HallOfEchoes']]);
  });
});

describe('cleared levels', () => {
  afterEach(() => { delete globalThis.localStorage; });

  it('does nothing, without throwing, when storage is unavailable', () => {
    delete globalThis.localStorage;
    expect(() => markCleared(1)).not.toThrow();
    expect(isCleared(1)).toBe(false);
  });

  it('does nothing when storage throws (private mode, blocked)', () => {
    globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    expect(() => markCleared(2)).not.toThrow();
    expect(isCleared(2)).toBe(false);
  });

  it('remembers cleared levels when storage works', () => {
    const store = {};
    globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
    expect(isCleared(2)).toBe(false);
    markCleared(2);
    markCleared(2);
    expect(isCleared(2)).toBe(true);
    expect(isCleared(1)).toBe(false);
    expect(JSON.parse(store['entangled-vaults-cleared'])).toEqual([2]);
  });
});
