import { describe, expect, it } from 'vitest';
import { createProgress, hintsFor, modeOf, planOf, recordRun, togglePoolMode } from './progress.js';
import { PASS_BAR } from './quantum.js';

describe('progress', () => {
  it('forces plain gems on the first attempt', () => {
    const p = createProgress();
    expect(modeOf(p)).toBe('plain');
    expect(planOf(p)).toBe(p.plainPlan);
  });

  it('unlocks entangled gems after the first plain run', () => {
    const p = createProgress();
    expect(recordRun(p, 150)).toEqual({ mode: 'plain', passed: false, unlocked: true });
    expect(modeOf(p)).toBe('ideal');
    expect(planOf(p)).toBe(p.dialPlan);
    expect(p.entangledFails).toBe(0);
  });

  it('keeps the dials across runs', () => {
    const p = createProgress();
    recordRun(p, 150);
    p.dialPlan.fire.B = 2;
    recordRun(p, 150);
    expect(p.dialPlan.fire.B).toBe(2);
  });

  it('shows hints after 2 and 4 entangled fails, and passes don\'t count', () => {
    const p = createProgress();
    recordRun(p, 150);                       // plain
    expect(hintsFor(p)).toEqual([]);
    recordRun(p, 150);
    recordRun(p, PASS_BAR);                  // a pass
    expect(hintsFor(p)).toEqual([]);
    recordRun(p, PASS_BAR - 1);
    expect(hintsFor(p)).toHaveLength(1);
    recordRun(p, 150);
    recordRun(p, 150);
    expect(hintsFor(p)).toHaveLength(2);
  });

  it('switches the entangled pool between ideal and IonQ, without affecting plain mode', () => {
    const p = createProgress();
    togglePoolMode(p);
    expect(modeOf(p)).toBe('plain');
    recordRun(p, 150);
    expect(modeOf(p)).toBe('ionq-aria-1');
    togglePoolMode(p);
    expect(modeOf(p)).toBe('ideal');
  });
});
