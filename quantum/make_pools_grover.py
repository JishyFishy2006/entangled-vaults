"""Run Grover's search for every (vaults, laps) pair on Aer and write
web/public/pools/grover-ideal.json: 15 tallies, keys v4_k0 ... v16_k4.

The circuit always marks vault 0; the game moves the answer to the real
key's vault with XOR when it reads."""
from qiskit import transpile
from qiskit_aer import AerSimulator

from circuits_grover import grover_circuit
from make_pools import SEED, SHOTS, write_pool

VAULTS = (4, 8, 16)
LAPS = range(5)                   # the lap dial runs 0..4
KEYS = [(v, k) for v in VAULTS for k in LAPS]


def pool_key(vaults, laps):
    return f"v{vaults}_k{laps}"


def main():
    backend = AerSimulator()
    circuits = [grover_circuit(v.bit_length() - 1, k) for v, k in KEYS]   # 4 -> 2 qubits, 8 -> 3, 16 -> 4
    # MCXGate isn't a native Aer instruction for every size, so transpile first.
    result = backend.run(transpile(circuits, backend), shots=SHOTS, seed_simulator=SEED).result()
    write_pool("ideal", {pool_key(v, k): result.get_counts(i) for i, (v, k) in enumerate(KEYS)}, prefix="grover-")


if __name__ == "__main__":
    main()
