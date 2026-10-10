from itertools import product
from pathlib import Path

import pytest
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

from check_pool import SIGN_PAIRS, fire_red_shares, load_pool, plan_win_rates

POOLS_DIR = Path(__file__).resolve().parent.parent / "web" / "public" / "pools"
IDEAL = POOLS_DIR / "ideal.json"
# Pools checked for win rate and no signalling; the IonQ one only once it has been generated.
POOL_FILES = [p for p in (IDEAL, POOLS_DIR / "ionq-aria-1.json") if p.exists()]


@pytest.fixture(scope="module")
def ideal():
    return load_pool(IDEAL)


@pytest.fixture(scope="module", params=POOL_FILES, ids=lambda p: p.stem)
def pool(request):
    return load_pool(request.param)


def test_bit_order():
    # Only Fireboy's qubit (0) flipped: key must be '01' (c1 c0), i.e. Fireboy blue, Watergirl red.
    qc = QuantumCircuit(2, 2)
    qc.x(0)
    qc.measure([0, 1], [0, 1])
    counts = AerSimulator().run(qc, shots=100).result().get_counts()
    assert counts == {"01": 100}


def test_ideal_pool_shape(ideal):
    assert ideal["mode"] == "ideal"
    assert ideal["shots"] == 1000
    assert set(ideal["pools"]) == {f"f{f}_w{w}" for f in range(8) for w in range(8)}
    assert all(sum(c.values()) == 1000 for c in ideal["pools"].values())


def test_quantum_win_rate(pool):
    rates = plan_win_rates(pool)
    avg = sum(rates.values()) / len(rates)
    assert 0.83 <= avg <= 0.87


def test_classical_cap():
    # A plan fixes a color per sign for each player: 4 x 4 = 16 team plans.
    best = 0.0
    for fa, fb, wa, wb in product("rb", repeat=4):
        fire, water = {"A": fa, "B": fb}, {"A": wa, "B": wb}
        wins = sum((fire[fs] == water[ws]) != (fs == ws == "B") for fs, ws in SIGN_PAIRS)
        best = max(best, wins / len(SIGN_PAIRS))
    assert best == 0.75


def test_no_signalling(pool):
    for key, share in fire_red_shares(pool).items():
        assert 0.45 <= share <= 0.55, f"{key}: Fireboy red share {share:.3f}"


# ---- Hall of Echoes (Grover's search) --------------------------------------
import math

GROVER = POOLS_DIR / "grover-ideal.json"


@pytest.fixture(scope="module")
def grover():
    return load_pool(GROVER)


def vault0_share(pool, vaults, laps):
    """Share of shots that read vault 0 (the all-zeros key)."""
    n = vaults.bit_length() - 1
    counts = pool["pools"][f"v{vaults}_k{laps}"]
    return counts.get("0" * n, 0) / pool["shots"]


def formula(vaults, laps):
    theta = math.asin(1 / math.sqrt(vaults))
    return math.sin((2 * laps + 1) * theta) ** 2


def test_grover_pool_shape(grover):
    assert grover["mode"] == "ideal"
    assert grover["shots"] == 1000
    assert set(grover["pools"]) == {f"v{v}_k{k}" for v in (4, 8, 16) for k in range(5)}
    assert all(sum(c.values()) == 1000 for c in grover["pools"].values())


def test_grover_room1_peak(grover):
    assert vault0_share(grover, 4, 1) >= 0.99


def test_grover_room2_peak(grover):
    assert 0.92 <= vault0_share(grover, 8, 2) <= 0.97


def test_grover_room2_overshoot(grover):
    assert vault0_share(grover, 8, 3) < 0.40
    assert vault0_share(grover, 8, 4) < 0.05


def test_grover_room3_peak(grover):
    assert vault0_share(grover, 16, 3) >= 0.93


def test_grover_zero_laps_is_a_blind_guess(grover):
    for v in (4, 8, 16):
        assert abs(vault0_share(grover, v, 0) - 1 / v) <= 0.05, f"v{v}_k0"


def test_grover_pool_matches_formula(grover):
    for v in (4, 8, 16):
        for k in range(5):
            assert abs(vault0_share(grover, v, k) - formula(v, k)) <= 0.04, f"v{v}_k{k}"


def test_grover_bit_order():
    # Only qubit 0 flipped in a 3-qubit circuit: key '001', which parseInt reads as vault 1.
    qc = QuantumCircuit(3, 3)
    qc.x(0)
    qc.measure(range(3), range(3))
    counts = AerSimulator().run(qc, shots=100).result().get_counts()
    assert counts == {"001": 100}
    assert int("001", 2) == 1


GROVER_NOISY = POOLS_DIR / "grover-ionq-aria-1.json"


@pytest.mark.skipif(not GROVER_NOISY.exists(), reason="IonQ Grover pool not generated yet")
def test_grover_noisy_pool_shape_and_overshoot():
    noisy = load_pool(GROVER_NOISY)
    assert noisy["mode"] == "ionq-aria-1"
    assert set(noisy["pools"]) == {f"v{v}_k{k}" for v in (4, 8, 16) for k in range(5)}
    assert all(sum(c.values()) == noisy["shots"] for c in noisy["pools"].values())
    # Even with noise, a third lap in the 8-vault room is worse than two.
    assert vault0_share(noisy, 8, 3) < vault0_share(noisy, 8, 2)
