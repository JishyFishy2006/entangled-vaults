from qiskit import QuantumCircuit
from qiskit.circuit.library import MCXGate

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
