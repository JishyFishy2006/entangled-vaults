"""Run all 64 dial combinations on Aer and write web/public/pools/ideal.json."""
import json
from pathlib import Path

from qiskit_aer import AerSimulator

from circuit import build_circuit

SHOTS = 1000
SEED = 2022  # fixed so the pool (and the 0.45-0.55 no-signalling test) is reproducible
POOLS_DIR = Path(__file__).resolve().parent.parent / "web" / "public" / "pools"
KEYS = [(f, w) for f in range(8) for w in range(8)]


def write_pool(mode, pools):
    out = POOLS_DIR / f"{mode}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w") as fh:
        json.dump({"mode": mode, "shots": SHOTS, "pools": pools}, fh, indent=1)
    print(f"wrote {len(pools)} pools to {out}")


def main():
    circuits = [build_circuit(f, w) for f, w in KEYS]
    result = AerSimulator().run(circuits, shots=SHOTS, seed_simulator=SEED).result()
    write_pool("ideal", {f"f{f}_w{w}": result.get_counts(i) for i, (f, w) in enumerate(KEYS)})


if __name__ == "__main__":
    main()
