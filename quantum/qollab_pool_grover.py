# Paste this whole file into a Qollab project with IonQ Aria 1 (25q) selected.
# It uses Qollab's pre-existing `backend` and imports nothing local.
# Copy the single JSON line it prints into web/public/pools/grover-ionq-aria-1.json.
import json
import time

from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import MCXGate

MODE = "ionq-aria-1"
SHOTS = 1000


def flip_all_zero(qc, n):
    qc.x(range(n))
    qc.h(n - 1)
    qc.append(MCXGate(n - 1), list(range(n)))
    qc.h(n - 1)
    qc.x(range(n))


def grover_circuit(n, laps):
    qc = QuantumCircuit(n, n)
    qc.h(range(n))                 # Spread
    for _ in range(laps):
        flip_all_zero(qc, n)       # Echo Fountain (marks vault 0)
        qc.h(range(n))             # Mirror Pool
        flip_all_zero(qc, n)
        qc.h(range(n))
    qc.measure(range(n), range(n)) # Read
    return qc


def wait(job):
    while True:
        status = job.status()
        name = getattr(status, "name", str(status)).upper()
        if any(s in name for s in ("DONE", "ERROR", "CANCELLED")):
            print("job status:", name)
            return
        time.sleep(2)


keys = [(v, k) for v in (4, 8, 16) for k in range(5)]
circuits = [grover_circuit(v.bit_length() - 1, k) for v, k in keys]
try:
    circuits = transpile(circuits, backend)
except Exception as err:
    print("transpile skipped:", err)
pools = {}

try:
    # One job for all 15 circuits, if the backend accepts a list.
    job = backend.run(circuits, shots=SHOTS)
    wait(job)
    result = job.result()
    for i, (v, k) in enumerate(keys):
        pools[f"v{v}_k{k}"] = dict(result.get_counts(i))
except Exception as err:
    print("batch run failed, looping instead:", err)
    for i, (v, k) in enumerate(keys):
        job = backend.run(circuits[i], shots=SHOTS)
        wait(job)
        pools[f"v{v}_k{k}"] = dict(job.result().get_counts())
        print(f"{i + 1}/15 v{v}_k{k}")

print(json.dumps({"mode": MODE, "shots": SHOTS, "pools": pools}))
