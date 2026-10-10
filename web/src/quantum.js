// The contract between the quantum side and the game side.
// This is the ONLY place bitstrings are decoded.

// Wins needed out of a 200-round run to open the vault.
// Set in Phase 3 from the measured win rates of the winning plan (binomial odds of passing):
//   best classical 0.750 -> 5.8%   IonQ Aria 1 pool 0.847 -> 97.1%   ideal theory 0.854 -> 98.5%
// 155 would let plain gems pass 23% of the time, so the bar stays at 160.
export const PASS_BAR = 160;

// Counts keys read c1 c0: the RIGHT char is Fireboy (qubit 0), the LEFT is Watergirl (qubit 1).
// Bit 0 = red, 1 = blue.
export const NAMES = {
  '00': 'both_red',
  '01': 'fire_blue_water_red',
  '10': 'fire_red_water_blue',
  '11': 'both_blue',
};
const COLOR = { '0': 'red', '1': 'blue' };

export function decodeShot(bits) {
  return {
    name: NAMES[bits],
    fire: COLOR[bits[1]],   // right char = qubit 0
    water: COLOR[bits[0]],  // left char = qubit 1
  };
}

// Weighted pick of one bitstring from a tally, with replacement.
export function drawShot(counts, shots) {
  let r = Math.random() * shots;
  for (const [bits, n] of Object.entries(counts)) {
    if ((r -= n) < 0) return bits;
  }
}

// Same colors win, unless both signs are B: then different colors win.
export function roundWon(shot, fireSign, waterSign) {
  const match = shot.fire === shot.water;
  const bothB = fireSign === 'B' && waterSign === 'B';
  return bothB ? !match : match;
}

const randomSign = () => (Math.random() < 0.5 ? 'A' : 'B');

// plan: { fire: { A, B }, water: { A, B } }
//   'plain' mode: values are colors ('red' | 'blue'); pool is ignored.
//   pool modes ('ideal', 'ionq-aria-1'): values are dial positions 0..7.
export function runLevel(plan, pool, mode, rounds = 200) {
  const log = [];
  let wins = 0;
  for (let i = 0; i < rounds; i++) {
    const fireSign = randomSign();
    const waterSign = randomSign();
    let bits = null;
    let shot;
    if (mode === 'plain') {
      shot = { fire: plan.fire[fireSign], water: plan.water[waterSign] };
    } else {
      const key = `f${plan.fire[fireSign]}_w${plan.water[waterSign]}`;
      bits = drawShot(pool.pools[key], pool.shots);
      shot = decodeShot(bits);
    }
    const won = roundWon(shot, fireSign, waterSign);
    if (won) wins++;
    log.push({ fireSign, waterSign, bits, fire: shot.fire, water: shot.water, won });
  }
  return { wins, rounds, log };
}

// ---- Exact rates from a pool (used by the pitch screen; no random draws) ----

export const WINNING_PLAN = { fire: { A: 0, B: 2 }, water: { A: 1, B: 7 } };
const SIGN_PAIRS = [['A', 'A'], ['A', 'B'], ['B', 'A'], ['B', 'B']];

// Win rate for each sign pair ('AA', 'AB', 'BA', 'BB') of a dial plan, straight from the tallies.
export function planWinRates(plan, pool) {
  const rates = {};
  for (const [fs, ws] of SIGN_PAIRS) {
    const counts = pool.pools[`f${plan.fire[fs]}_w${plan.water[ws]}`];
    let won = 0;
    let total = 0;
    for (const [bits, n] of Object.entries(counts)) {
      total += n;
      if (roundWon(decodeShot(bits), fs, ws)) won += n;
    }
    rates[fs + ws] = won / total;
  }
  return rates;
}

// Fireboy's share of red for every dial combination: ~0.5 everywhere means no signalling.
export function fireRedShares(pool) {
  return Object.values(pool.pools).map(counts => {
    let red = 0;
    let total = 0;
    for (const [bits, n] of Object.entries(counts)) {
      total += n;
      if (decodeShot(bits).fire === 'red') red += n;
    }
    return red / total;
  });
}

// Best win rate over all 16 plain-gem plans (a fixed color per sign per player).
export function bestPlainRate() {
  const colors = ['red', 'blue'];
  let best = 0;
  for (const fa of colors) for (const fb of colors) for (const wa of colors) for (const wb of colors) {
    const fire = { A: fa, B: fb };
    const water = { A: wa, B: wb };
    const wins = SIGN_PAIRS.filter(([fs, ws]) => roundWon({ fire: fire[fs], water: water[ws] }, fs, ws)).length;
    best = Math.max(best, wins / SIGN_PAIRS.length);
  }
  return best;
}

// Per sign pair results of a run's log: { AA: { won, rounds, needSame }, ... }.
export function pairBreakdown(log) {
  const out = {};
  for (const [fs, ws] of SIGN_PAIRS) out[fs + ws] = { won: 0, rounds: 0, needSame: !(fs === 'B' && ws === 'B') };
  for (const r of log) {
    const p = out[r.fireSign + r.waterSign];
    p.rounds++;
    if (r.won) p.won++;
  }
  return out;
}

// ---- Hall of Echoes (Grover's search) ----
// The pools always mark vault 0; XOR with the key moves the answer to the key's vault.
// Counts keys put qubit 0 on the right, so parseInt(bits, 2) is the vault number.

const groverKey = (vaults, laps) => `v${vaults}_k${laps}`;

// One read: draw a shot for this room and lap count, decode it, relabel to the real key.
export function groverRead(pool, vaults, laps, key) {
  const bits = drawShot(pool.pools[groverKey(vaults, laps)], pool.shots);
  return parseInt(bits, 2) ^ key;
}

// Lamp brightness for each vault, from the formula (never from the pool):
// the key's lamp gets P = sin^2((2k+1)θ) with sin θ = 1/√N, the rest share 1 − P equally.
export function lampLevels(vaults, laps, key) {
  const theta = Math.asin(1 / Math.sqrt(vaults));
  const p = Math.sin((2 * laps + 1) * theta) ** 2;
  return Array.from({ length: vaults }, (_, v) => (v === key ? p : (1 - p) / (vaults - 1)));
}
