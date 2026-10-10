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
