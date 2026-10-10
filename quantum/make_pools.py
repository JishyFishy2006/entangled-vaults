"""Run all 64 dial combinations on Aer and write web/public/pools/ideal.json."""
import json
from pathlib import Path

from qiskit_aer import AerSimulator

from circuit import build_circuit

SHOTS = 1000
SEED = 2022  # fixed so the pool (and the 0.45-0.55 no-signalling test) is reproducible
OUT = Path(__file__).resolve().parent.parent / "web" / "public" / "pools" / "ideal.json"


def main():
    backend = AerSimulator()
    keys = [(f, w) for f in range(8) for w in range(8)]
    circuits = [build_circuit(f, w) for f, w in keys]
    result = backend.run(circuits, shots=SHOTS, seed_simulator=SEED).result()
    pools = {f"f{f}_w{w}": result.get_counts(i) for i, (f, w) in enumerate(keys)}

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w") as fh:
        json.dump({"mode": "ideal", "shots": SHOTS, "pools": pools}, fh, indent=1)
    print(f"wrote {len(pools)} pools to {OUT}")


if __name__ == "__main__":
    main()
