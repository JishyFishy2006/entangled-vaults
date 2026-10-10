# Paste this whole file into a Qollab project with IonQ Aria 1 (25q) selected.
# It uses Qollab's pre-existing `backend` and imports nothing local.
# Copy the single JSON line it prints into web/public/pools/ionq-aria-1.json.
import json
import time
from math import pi

from qiskit import QuantumCircuit

MODE = "ionq-aria-1"
SHOTS = 1000


def build_circuit(fire_pos, water_pos):
    qc = QuantumCircuit(2, 2)
    qc.h(0)
    qc.cx(0, 1)
    qc.ry(fire_pos * pi / 4, 0)
    qc.ry(water_pos * pi / 4, 1)
    qc.measure([0, 1], [0, 1])
    return qc


def wait(job):
    while True:
        status = job.status()
        name = getattr(status, "name", str(status)).upper()
        if any(s in name for s in ("DONE", "ERROR", "CANCELLED")):
            print("job status:", name)
            return
        time.sleep(2)


keys = [(f, w) for f in range(8) for w in range(8)]
circuits = [build_circuit(f, w) for f, w in keys]
pools = {}

try:
    # One job for all 64 circuits, if the backend accepts a list.
    job = backend.run(circuits, shots=SHOTS)
    wait(job)
    result = job.result()
    for i, (f, w) in enumerate(keys):
        pools[f"f{f}_w{w}"] = dict(result.get_counts(i))
except Exception as err:
    print("batch run failed, looping instead:", err)
    for i, (f, w) in enumerate(keys):
        job = backend.run(circuits[i], shots=SHOTS)
        wait(job)
        pools[f"f{f}_w{w}"] = dict(job.result().get_counts())
        print(f"{i + 1}/64 f{f}_w{w}")

print(json.dumps({"mode": MODE, "shots": SHOTS, "pools": pools}))
