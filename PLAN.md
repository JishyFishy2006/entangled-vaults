# Entangled Vaults: Build Plan for Claude Code

Put this file in the repo root. Work one phase per Claude Code session.
At the start of each session, say: **"Read PLAN.md and do Phase N. Stop when its checks pass."**
Commit after every phase.

---

## Project facts (Claude Code: treat these as fixed requirements)

**The game.** Two-player co-op platformer (Fireboy and Watergirl style). Level 1, "The Twin Vaults," is the CHSH game.

**The rule for one round.** Each player sees a random sign, A or B. Each gem shows red or blue.
The round is won if the gems show the **same** color, unless **both** signs are B, in which case they must show **different** colors.

**The plan.** Each player sets two lens dials (one for sign A, one for sign B). Each dial has 8 positions, 0 to 7. Position k = angle k × π/4.

**The circuit** (qubit 0 = Fireboy's gem, qubit 1 = Watergirl's gem):

```python
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
```

**Bit order.** Counts keys read `c1 c0`. The RIGHT character is Fireboy (qubit 0), the LEFT is Watergirl (qubit 1). Bit 0 = red, 1 = blue. Define this once, in `quantum.js`, nowhere else.

**Known numbers.**
- Best classical (plain gems) win rate: exactly 0.75.
- Winning quantum plan: Fireboy A=0, B=2; Watergirl A=1, B=7. Win rate ≈ 0.854 (simulation gave 0.853).
- A run is 200 rounds. Pass bar: 160 wins (may be lowered to 155 after Phase 3).

**Pool file format** (`web/public/pools/<mode>.json`):

```json
{ "mode": "ideal", "shots": 1000,
  "pools": { "f0_w1": { "00": 427, "11": 426, "01": 74, "10": 73 } } }
```

64 keys, `f{0..7}_w{0..7}`. Values are Qiskit counts.

**Repo layout.**

```
entangled-vaults/
  PLAN.md
  quantum/        (uv project)
    circuit.py          build_circuit() only, self-contained, pasteable into Qollab
    make_pools.py       writes ../web/public/pools/ideal.json
    qollab_pool.py      version to paste into Qollab (uses Qollab's `backend`)
    check_pool.py       prints win rate + no-signalling check for any pool file
    test_pools.py
  web/            (Vite, vanilla JS, Phaser 3)
    public/pools/
    src/quantum.js      NAMES, decodeShot, drawShot, roundWon, runLevel
    src/quantum.test.js
    src/scenes/
    src/main.js
```

---

## Phase 0: Setup (you, not Claude Code)

1. Install: `uv`, Node 20+, Claude Code.
2. `mkdir entangled-vaults && cd entangled-vaults && git init`
3. Copy this `PLAN.md` into it.
4. Start Claude Code in that folder.

---

## Phase 1: Quantum core

**Prompt:** "Read PLAN.md and do Phase 1."

Tasks:
1. Create `quantum/` as a uv project: `uv init`, then `uv add qiskit qiskit-aer pytest`.
2. Write `circuit.py` exactly as in Project facts.
3. Write `make_pools.py`: run all 64 dial combinations on `AerSimulator`, 1,000 shots each, write `web/public/pools/ideal.json` in the pool format.
4. Write `check_pool.py <path>`: prints the winning plan's win rate across the 4 sign pairs, and the min/max share of red for Fireboy across all 64 keys.
5. Write `test_pools.py` with these tests:
    - **Bit order:** a circuit with only `x(0)` and measure gives key `'01'`.
    - **Quantum win rate:** winning plan on `ideal.json` scores between 0.83 and 0.87.
    - **Classical cap:** brute-force all 16 plain-gem plans; the best is exactly 0.75.
    - **No signalling:** Fireboy's red share is between 0.45 and 0.55 for every key.
6. Run `uv run make_pools.py`, then `uv run pytest`.

**Done when:** all 4 tests pass and `ideal.json` exists with 64 keys.

---

## Phase 2: Text prototype (the demo-able core)

**Prompt:** "Read PLAN.md and do Phase 2."

Tasks:
1. Create `web/` with Vite (vanilla JS). Add `vitest`.
2. Write `src/quantum.js` exporting:
    - `NAMES`, `decodeShot(bits)` → `{ name, fire, water }` using the bit order in Project facts.
    - `drawShot(counts, shots)`: weighted random pick from a tally.
    - `roundWon(shot, fireSign, waterSign)`.
    - `runLevel(plan, pool, mode, rounds = 200)` → `{ wins, rounds, log }`. In `'plain'` mode, `plan` holds colors per sign and no pool is used.
3. Write `src/quantum.test.js`: bit order, classical cap 0.75, and winning plan ≥ 0.83 averaged over 20 runs.
4. Build a bare page (`index.html` + `src/prototype.js`): mode dropdown (plain / ideal / ionq-aria-1), four dial inputs (or color pickers in plain mode), a Run button, a win count, and PASS/FAIL against the bar.
5. Run `npm test` and `npm run dev`.

**Done when:** tests pass; on the page, plain mode never beats 75% and the winning plan passes most runs.

---

## Phase 3: Noisy pool (partly manual)

**Prompt:** "Read PLAN.md and do Phase 3, step 1."

1. **Claude Code:** write `quantum/qollab_pool.py`: imports nothing local, includes `build_circuit`, loops the 64 combinations using Qollab's pre-existing `backend`, waits with `job.status()` like the Qollab lessons, and ends with `print(json.dumps({...}))` in the pool format with `"mode": "ionq-aria-1"`.
2. **You:** paste it into a Qollab fork, Run on Qollab with **IonQ Aria 1 (25q)**, copy the printed JSON into `web/public/pools/ionq-aria-1.json`.
3. **Prompt:** "Run check_pool.py on the IonQ pool and tell me the win rate. Recommend a pass bar so classical passes under 10% of the time and the winning plan on this pool passes over 85%."

**Done when:** the noisy win rate is recorded and the pass bar is set in one constant in `quantum.js`.

---

## Phase 4: Game shell

**Prompt:** "Read PLAN.md and do Phase 4."

Tasks:
1. `npm install phaser`. Scenes: `PlanningHall`, `Vaults`, `Run`, `Verdict`, with placeholder rectangles for art.
2. **PlanningHall:** both players visible; each turns dials for A and B (Fireboy: Q/E to turn, W/S to switch A/B; Watergirl: comma/period to turn, up/down to switch). Both press a ready key to continue.
3. **Run:** call `runLevel`, animate 200 rounds in about 20 seconds: signs flash, gems flash their colors, a scoreboard ticks with a line at the pass bar.
4. **Verdict:** pass → "Vault open"; fail → back to PlanningHall with dials kept.
5. First attempt is forced plain mode; entangled gems unlock after the first fail. Hints after 2 and 4 fails with entangled gems:
    - "Your A lenses should be close together."
    - "Try Watergirl's lenses one step either side of Fireboy's A."

**Done when:** the full loop plays end to end with placeholder art, using `quantum.js` unchanged.

---

## Phase 5: Platforming

**Prompt:** "Read PLAN.md and do Phase 5."

Tasks:
1. Between PlanningHall and Run, a `Vaults` scene with two short paths: Fireboy's through lava-safe terrain with water hazards, Watergirl's the reverse. Fire dies in water, water dies in lava; death respawns at path start.
2. Fireboy: WASD. Watergirl: arrow keys. Arcade physics.
3. Build the map in code first; move it to a Tiled JSON map only if time allows.
4. Run starts when both players reach their pedestals.

**Done when:** both paths are completable and the loop still works end to end.

---

## Phase 6: Polish

**Prompt:** "Read PLAN.md and do Phase 6."

- Gem flash animations, simple sounds for win/loss rounds, the 75% classical line drawn on the scoreboard, a mode toggle (ideal / IonQ noisy) on the Verdict screen.

---

## Phase 7: Pitch screen

**Prompt:** "Read PLAN.md and do Phase 7."

- A 60-second end screen: why plain gems cap at 75%, why entangled gems reach about 85%, and the ideal vs. IonQ noisy win rates side by side (read from the pool files, not hard-coded).

---

## Stretch (only after Phase 7)

- `quantum/server.py`: FastAPI `POST /round` with `{fire_pos, water_pos}` → one shot from Aer, for a "run this round live" button on Verdict.
- Noise slider blending the two pools.
- Online two-player mode over WebSockets.

---

## Working rules for Claude Code

- Don't change the circuit, bit order, or round rule in Project facts.
- `quantum.js` is the only place bitstrings are decoded.
- Run the tests at the end of every phase and report the numbers.
- Stop at the end of the phase; don't start the next one.
