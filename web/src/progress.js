// Game progress across attempts: which gem mode is unlocked, the team's plans,
// and the hint counter. Pure data so it can be tested without Phaser.
import { PASS_BAR } from './quantum.js';

export const HINTS = [
  [2, 'Your A lenses should be close together.'],
  [4, "Try Watergirl's lenses one step either side of Fireboy's A."],
];

export function createProgress() {
  return {
    // Plain gems: a fixed color per sign. Entangled gems: a dial position 0..7 per sign.
    plainPlan: { fire: { A: 'red', B: 'red' }, water: { A: 'red', B: 'red' } },
    dialPlan: { fire: { A: 0, B: 0 }, water: { A: 0, B: 0 } },
    poolMode: 'ideal',      // which pool entangled gems draw from: 'ideal' | 'ionq-aria-1'
    entangled: false,       // the first attempt is forced plain; unlocked after it
    entangledFails: 0,
    prediction: null,       // the team's guess before the last run: 0 under / 1 about / 2 over 75%
  };
}

// The one progress object the scenes share.
export const progress = createProgress();

export const POOL_LABELS = { ideal: 'ideal simulator', 'ionq-aria-1': 'IonQ Aria 1 (noisy)' };

export function togglePoolMode(p) {
  p.poolMode = p.poolMode === 'ideal' ? 'ionq-aria-1' : 'ideal';
  return p.poolMode;
}

export const modeOf = p => (p.entangled ? p.poolMode : 'plain');
export const planOf = p => (p.entangled ? p.dialPlan : p.plainPlan);

// Record a finished 200-round run. Dials are never reset.
export function recordRun(p, wins) {
  const mode = modeOf(p);
  const passed = wins >= PASS_BAR;
  let unlocked = false;
  if (mode === 'plain') {
    // Unlock even after a lucky plain pass (~6% of runs), so the lesson isn't skipped.
    unlocked = true;
    p.entangled = true;
  } else if (!passed) {
    p.entangledFails++;
  }
  return { mode, passed, unlocked };
}

export const hintsFor = p => HINTS.filter(([after]) => p.entangledFails >= after).map(([, text]) => text);
