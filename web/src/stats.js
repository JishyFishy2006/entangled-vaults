// Chance that a team with true win rate `rate` gets at least `bar` wins in `rounds` rounds (binomial tail).
export function passChance(rate, rounds, bar) {
  let pmf = (1 - rate) ** rounds;   // P(0 wins)
  let tail = bar === 0 ? pmf : 0;
  for (let k = 1; k <= rounds; k++) {
    pmf *= ((rounds - k + 1) / k) * (rate / (1 - rate));
    if (k >= bar) tail += pmf;
  }
  return tail;
}
