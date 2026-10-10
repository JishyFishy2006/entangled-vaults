"""Usage: uv run check_pool.py <pool.json>

Prints the winning plan's win rate across the 4 sign pairs, and the
min/max share of red for Fireboy across all 64 keys (no-signalling check).

Counts keys read c1 c0: right char is Fireboy (qubit 0), left is Watergirl
(qubit 1). Bit 0 = red, 1 = blue.
"""
import json
import sys

WINNING_PLAN = {"fire": {"A": 0, "B": 2}, "water": {"A": 1, "B": 7}}
SIGN_PAIRS = [("A", "A"), ("A", "B"), ("B", "A"), ("B", "B")]


def load_pool(path):
    with open(path) as fh:
        return json.load(fh)


def win_rate_for_pair(counts, fire_sign, water_sign):
    """Exact fraction of shots in a tally that win for this sign pair."""
    both_b = fire_sign == "B" and water_sign == "B"
    total = sum(counts.values())
    wins = sum(n for bits, n in counts.items() if (bits[0] == bits[1]) != both_b)
    return wins / total


def plan_win_rates(pool, plan=WINNING_PLAN):
    """Win rate per sign pair for a dial plan; signs are uniformly random."""
    rates = {}
    for fs, ws in SIGN_PAIRS:
        key = f"f{plan['fire'][fs]}_w{plan['water'][ws]}"
        rates[(fs, ws)] = win_rate_for_pair(pool["pools"][key], fs, ws)
    return rates


def fire_red_shares(pool):
    """Fireboy's red share (right char == '0') for every key."""
    return {
        key: sum(n for bits, n in counts.items() if bits[1] == "0") / sum(counts.values())
        for key, counts in pool["pools"].items()
    }


def main(path):
    pool = load_pool(path)
    rates = plan_win_rates(pool)
    print(f"pool: {path} (mode={pool['mode']}, shots={pool['shots']}, keys={len(pool['pools'])})")
    print("winning plan: Fireboy A=0 B=2, Watergirl A=1 B=7")
    for (fs, ws), r in rates.items():
        print(f"  signs {fs},{ws}: {r:.3f}")
    print(f"  average:  {sum(rates.values()) / 4:.3f}  (theory 0.854, classical cap 0.750)")
    shares = fire_red_shares(pool)
    lo, hi = min(shares, key=shares.get), max(shares, key=shares.get)
    print(f"Fireboy red share: min {shares[lo]:.3f} ({lo}), max {shares[hi]:.3f} ({hi})")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
