from math import pi
from qiskit import QuantumCircuit

def build_circuit(fire_pos, water_pos):
    qc = QuantumCircuit(2, 2)
    qc.h(0)
    qc.cx(0, 1)
    qc.ry(fire_pos * pi / 4, 0)
    qc.ry(water_pos * pi / 4, 1)
    qc.measure([0, 1], [0, 1])
    return qc
