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
