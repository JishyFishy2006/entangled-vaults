# SPDX-License-Identifier: MIT  (c) 2026 JishyFishy2006. Full text: LICENSE.txt
# Entangled Vaults on Qollab: the game's two quantum experiments, run live on the
# backend you pick (Select QPU), as ONE batched job, so it also works on IonQ, which
# takes one job per run.
#
#   Level 1, The Twin Vaults: the CHSH game. An entangled Bell pair, measured at the
#   team's lens angles, beats the 75% that any classical plan is stuck under.
#   Level 2, The Hall of Echoes: Grover's search over 4, 8 and 16 vaults, at 0-4
#   iterations. Watch the key's odds rise, peak, and over-rotate.
#
# The game itself (two players, one keyboard) is a web app; see the links at the end.
# It plays recorded shots of these exact circuits.
import time
from math import asin, cos, pi, sin, sqrt

from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import MCXGate

SHOTS = 1000
GAME_URL = "https://jishyfishy2006.github.io/entangled-vaults/"
REPO_URL = "https://github.com/JishyFishy2006/entangled-vaults"


# ---- Level 1: the CHSH game ----

def chsh_circuit(fire_pos, water_pos):
    """Two gems: a Bell pair, each read through a lens turned pos x 45 degrees."""
    qc = QuantumCircuit(2, 2)
    qc.h(0)                          # Fireboy's gem: a 50/50 coin
    qc.cx(0, 1)                      # entangle: a Bell pair
    qc.ry(fire_pos * pi / 4, 0)      # Fireboy's lens
    qc.ry(water_pos * pi / 4, 1)     # Watergirl's lens
    qc.measure([0, 1], [0, 1])       # 0 = red, 1 = blue
    return qc


# The winning plan: Fireboy's lens at 0 (sign A) or 90 deg (B); Watergirl's at 45 (A) or -45 (B).
PLAN = {"fire": {"A": 0, "B": 2}, "water": {"A": 1, "B": 7}}
SIGN_PAIRS = [("A", "A"), ("A", "B"), ("B", "A"), ("B", "B")]


def chsh_win_rate(counts, fire_sign, water_sign):
    """Win: the same color, unless both signs are B (then different). Keys read c1 c0."""
    both_b = fire_sign == "B" and water_sign == "B"
    total = sum(counts.values())
    return sum(n for bits, n in counts.items() if (bits[-1] == bits[-2]) != both_b) / total


# ---- Level 2: Grover's search ----

def flip_all_zero(qc, n):
    """A phase flip on |0...0>: the oracle marks vault 0 (and the diffuser's core)."""
    qc.x(range(n))
    qc.h(n - 1)
    qc.append(MCXGate(n - 1), list(range(n)))
    qc.h(n - 1)
    qc.x(range(n))


def grover_circuit(n, laps):
    qc = QuantumCircuit(n, n)
    qc.h(range(n))                   # lever: Hadamard, an equal superposition
    for _ in range(laps):
        flip_all_zero(qc, n)         # fountain: the oracle flips the key's phase
        qc.h(range(n))               # mirror: the diffuser reflects about the mean
        flip_all_zero(qc, n)
        qc.h(range(n))
    qc.measure(range(n), range(n))   # dais: measurement
    return qc


VAULTS = (4, 8, 16)
LAPS = range(5)


def theory(vaults, laps):
    theta = asin(1 / sqrt(vaults))
    return sin((2 * laps + 1) * theta) ** 2


# ---- one job for everything ----

def wait(job):
    while True:
        status = job.status()
        name = getattr(status, "name", str(status)).upper()
        if any(s in name for s in ("DONE", "ERROR", "CANCELLED")):
            return name
        time.sleep(2)


def bar(p, width=30):
    return "#" * round(p * width)


chsh_keys = [(PLAN["fire"][f], PLAN["water"][w]) for f, w in SIGN_PAIRS]
grover_keys = [(v, k) for v in VAULTS for k in LAPS]
circuits = [chsh_circuit(f, w) for f, w in chsh_keys]
circuits += [grover_circuit(v.bit_length() - 1, k) for v, k in grover_keys]

print(f"Running {len(circuits)} circuits x {SHOTS} shots as one job on: {backend}")
job = backend.run(transpile(circuits, backend), shots=SHOTS)
status = wait(job)
result = job.result()

# Level 1
print("\n=== LEVEL 1: THE TWIN VAULTS (the CHSH game) ===")
print("Each round both vaults show a random sign, A or B. Win: same colors,")
print("unless both signs are B (then different). No talking once it starts.\n")
rates = []
for i, (f_sign, w_sign) in enumerate(SIGN_PAIRS):
    rate = chsh_win_rate(result.get_counts(i), f_sign, w_sign)
    rates.append(rate)
    need = "DIFFERENT" if f_sign == w_sign == "B" else "the same "
    print(f"  signs {f_sign},{w_sign}  need {need}  {rate:6.1%}  {bar(rate)}")
avg = sum(rates) / len(rates)
print(f"\n  entangled average   {avg:6.1%}  {bar(avg)}")
print(f"  classical limit      75.0%  {bar(0.75)}   (Bell's inequality: any fixed plan)")
print(f"  quantum limit        {cos(pi / 8) ** 2:.1%}   (Tsirelson's bound, cos^2 22.5 deg)")
if avg >= 0.8:
    print("  The vault opens at 80%: only entanglement gets there.")
elif avg > 0.75:
    print("  Past the classical limit, though short of the vault's 80% bar.")
else:
    print("  Noise kept this run under 75%; try again or pick a simulator.")

# Level 2
print("\n=== LEVEL 2: THE HALL OF ECHOES (Grover's search) ===")
print("Chance the measurement finds the key, after k Grover iterations")
print("(oracle + diffuser). Theory in brackets.\n")
for v in VAULTS:
    n = v.bit_length() - 1
    shares = []
    for k in LAPS:
        counts = result.get_counts(len(chsh_keys) + grover_keys.index((v, k)))
        shares.append(counts.get("0" * n, 0) / sum(counts.values()))
    best = max(LAPS, key=lambda k: shares[k])
    print(f"  {v} vaults ({n} qubits); a blind guess is {1 / v:.1%}")
    for k in LAPS:
        mark = "  <- peak" if k == best else ""
        print(f"    {k} laps  {shares[k]:6.1%}  [{theory(v, k):5.1%}]  {bar(shares[k])}{mark}")
    print(f"    classical search: {(v + 1) / 2:g} tries on average; Grover: ~(pi/4)sqrt({v}) = {pi / 4 * sqrt(v):.1f} iterations\n")
print("Past the peak the state keeps rotating AWAY from the key: over-rotation.")

print("\nPlay the game (2 players, one keyboard):", GAME_URL)
print("Source, MIT license:", REPO_URL)
