"""Run all 64 dial combinations on IonQ's cloud simulator with the Aria 1 noise
model and write web/public/pools/ionq-aria-1.json.

The same pool Qollab's IonQ Aria 1 (25q) backend would give, without the copy-paste.
Needs IONQ_API_KEY in quantum/.env (read automatically by qiskit-ionq).
Run from quantum/:  uv run ionq_pool.py
"""
from qiskit_ionq import IonQProvider

from circuit import build_circuit
from make_pools import KEYS, SEED, SHOTS, write_pool


def main():
    backend = IonQProvider().get_backend("simulator")
    circuits = [build_circuit(f, w) for f, w in KEYS]
    job = backend.run(circuits, shots=SHOTS, noise_model="aria-1", sampler_seed=SEED)
    print("submitted IonQ job", job.job_id(), "- waiting for results...")
    result = job.result()
    write_pool("ionq-aria-1", {
        f"f{f}_w{w}": {k: int(v) for k, v in result.get_counts(i).items()}
        for i, (f, w) in enumerate(KEYS)
    })


if __name__ == "__main__":
    main()
