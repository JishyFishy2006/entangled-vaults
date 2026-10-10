"""Run the 15 Grover circuits on IonQ's cloud simulator with the Aria 1 noise
model and write web/public/pools/grover-ionq-aria-1.json.

Same pool as qollab_pool_grover.py would give on Qollab, without the copy-paste.
Needs IONQ_API_KEY in quantum/.env (read automatically by qiskit-ionq).
Run from quantum/:  uv run ionq_pool_grover.py
"""
from qiskit import transpile
from qiskit_ionq import IonQProvider

from circuits_grover import grover_circuit
from make_pools import SEED, SHOTS, write_pool
from make_pools_grover import KEYS, pool_key


def main():
    backend = IonQProvider().get_backend("simulator")
    circuits = transpile([grover_circuit(v.bit_length() - 1, k) for v, k in KEYS], backend)
    job = backend.run(circuits, shots=SHOTS, noise_model="aria-1", sampler_seed=SEED)
    print("submitted IonQ job", job.job_id(), "- waiting for results...")
    result = job.result()
    write_pool("ionq-aria-1", {
        pool_key(v, k): {key: int(n) for key, n in result.get_counts(i).items()}
        for i, (v, k) in enumerate(KEYS)
    }, prefix="grover-")


if __name__ == "__main__":
    main()
