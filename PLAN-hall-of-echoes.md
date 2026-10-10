# Entangled Vaults: Hall of Echoes Build Plan for Claude Code

**Level 2** of the game: the heroes physically run Grover's search. Continues `PLAN.md` (phases 1 to 7). It does not depend on `PLAN-levels-2-3.md`; phases are numbered 16+ only so the numbers never clash if those levels are built later. Put this file in the repo root next to `PLAN.md`.
Work one phase per Claude Code session. Start each with:
**"Read PLAN-hall-of-echoes.md, then do Phase N. Stop when its checks pass."**
Commit after every phase.

---

## Project facts (treat as fixed requirements)

**The level.** Three rooms of sealed vaults (4, 8, 16). One vault per room holds the key; a wrong vault floods the room with lava, both heroes respawn at the entrance, and the key moves to a new random vault.

**The search routine.**
1. **Spread:** Fireboy pulls the `SpreadLever`. Laps reset to 0. Pulling it mid-search resets the search.
2. **Laps:** Watergirl swims a one-way `WaterLoop`: Echo Fountain zone, then Mirror Pool zone. Both in order = one lap. `LapDial` shows 0 to 4; the loop gate closes at 4. Fireboy dies in the water.
3. **Read:** Fireboy stands on the `LanternDais` and presses the read key. One draw from the pool unseals one vault.
4. **Open:** a hero opens the unsealed vault: key = room cleared; wrong = lava.

**Classical option.** In Room 3 (lamps dark), Fireboy can pry any sealed vault open directly, same lava risk. In Rooms 1 and 2 (lamps on) prying is disabled: the brightest lamp would give the key away, so the only way in is the routine plus the read.

**Early read.** Fireboy can press the read key on the dais at any time, including mid-laps; the read uses the laps completed so far.

**No light system.** This level does not use `lightAt`, a light radius, or a shaded alcove, and must not import anything from the Levels 2 & 3 plan. It works standalone on top of Level 1.

**Level select and flow.**

- At game start, a **Level select** screen offers Level 1 (The Twin Vaults) and Level 2 (The Hall of Echoes). **Both are always available; nothing is locked.**
- Level 1 Verdict, **passed**: buttons **Next level** (starts Level 2, Room 1) and **Level select**.
- Level 1 Verdict, **failed**: back to the Planning Hall as now, plus a **Level select** button.
- Level 2, after the reveal card: **Play again** and **Level select**.
- Cleared levels show a checkmark on the Level select, stored in `localStorage` with every read and write wrapped in try/catch; if storage fails, no checkmarks, nothing breaks.
- Controls on the Level select: either player's left/right keys move the selection; Enter or Space starts.
- One registry drives it all, `src/levels.js`:

```js
export const LEVELS = [
  { id: 1, name: 'The Twin Vaults',    scene: 'PlanningHall' },
  { id: 2, name: 'The Hall of Echoes', scene: 'HallOfEchoes' },
];
```

**Rooms.**

| Room | Vaults | Qubits | Lamps | Best laps | Ideal chance at best |
| --- | --- | --- | --- | --- | --- |
| 1 | 4 | 2 | On | 1 | 100% |
| 2 | 8 | 3 | On | 2 | 94.5% |
| 3 | 16 | 4 | Dark | 3 | 96.1% |

Room 3 hint after 2 failed reads: a wordless mural (4 vaults + 1 wave, 8 vaults + 2 waves, 16 vaults + blank).

**The circuit.** Always marks vault 0; the game relabels with XOR (proven exact).

```python
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
```

**Exact probabilities of vault 0 (statevector, verified):**

| Vaults | 0 laps | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- | --- |
| 4 | 25.0% | 100% | 25.0% | 25.0% | 100% |
| 8 | 12.5% | 78.1% | 94.5% | 33.0% | 1.2% |
| 16 | 6.2% | 47.3% | 90.8% | 96.1% | 58.2% |

Formula: P = sin²((2k+1)θ), sin θ = 1/√N.

**Decode.** `parseInt(bits, 2)` gives the vault number (qubit 0 is the rightmost character). Real vault = `parseInt(bits, 2) ^ key`.

**Lamps.** Brightness is computed from the formula, not from the pool: the key's lamp gets P, every other lamp gets (1 − P)/(N − 1). Room 3 lamps stay dark.

**Pool file** `web/public/pools/grover-<mode>.json`, same format as earlier pools. Keys `v4_k0` … `v4_k4`, `v8_k0` … `v8_k4`, `v16_k0` … `v16_k4` (15 tallies, 1,000 shots each).

**New files.**

```
quantum/
  circuits_grover.py      flip_all_zero(), grover_circuit()
  make_pools_grover.py    writes grover-ideal.json
  qollab_pool_grover.py   pasteable into Qollab
web/src/
  objects/SearchHall.js   states: sealed → spread → lapping → read → opened
  objects/SpreadLever.js
  objects/WaterLoop.js
  objects/LapDial.js
  objects/VaultLamp.js
  objects/LanternDais.js
  objects/Vault.js
  scenes/HallOfEchoes.js
  scenes/TestHall.js      gray-box 8-vault room
  scenes/LevelSelect.js
  levels.js               the level registry
```

---

## Phase 16: Quantum core

**Prompt:** "Read PLAN-hall-of-echoes.md and do Phase 16."

1. Write `circuits_grover.py` exactly as in the facts.
2. Write `make_pools_grover.py`: all 15 (vaults, laps) pairs on `AerSimulator`, 1,000 shots each; write `grover-ideal.json`.
3. Add to `test_pools.py` (vault 0 share = count of the all-zeros key / shots):
    - `v4_k1` ≥ 0.99.
    - `v8_k2` between 0.92 and 0.97.
    - `v8_k3` < 0.40 and `v8_k4` < 0.05.
    - `v16_k3` ≥ 0.93.
    - every `k0` within 0.05 of 1/N.
    - every pool within 0.04 of the formula.
    - bit order: a 3-qubit circuit with only `x(0)` gives key `'001'`.
4. In `quantum.js`, add `groverRead(pool, vaults, laps, key)` (draw, `parseInt`, XOR) and `lampLevels(vaults, laps, key)` (array of N values from the formula).
5. Add to `quantum.test.js`: `groverRead` with key 5 over 10,000 draws from `v8_k2` returns 5 between 92% and 97% of the time; `lampLevels` sums to 1.

**Done when:** all Python and JS tests pass.

---

## Phase 17: Noisy pool (partly manual)

1. **Claude Code:** write `qollab_pool_grover.py`: self-contained (includes `flip_all_zero` and `grover_circuit`), uses Qollab's existing `backend`, waits with `job.status()`, prints the 15-tally pool JSON with `"mode": "ionq-aria-1"`.
2. **You:** run it on Qollab with IonQ Aria 1 (25q); save as `web/public/pools/grover-ionq-aria-1.json`.
3. **Prompt:** "Report each room's peak share from the IonQ Grover pool. If Room 3's is under 0.6, set Room 3 to use the ideal pool even in noisy mode, and note the noisy number for the reveal card."

**Recorded (Oct 10, 2026).** Generated with `quantum/ionq_pool_grover.py` (IonQ cloud simulator, `aria-1` noise model, seeded) instead of the Qollab copy-paste; `qollab_pool_grover.py` is still there for Qollab.

| Room | Peak laps | IonQ Aria 1 | Ideal |
| --- | --- | --- | --- |
| 1 (4 vaults) | 1 | 100.0% | 100.0% |
| 2 (8 vaults) | 2 | 76.5% | 94.9% |
| 3 (16 vaults) | 3 | **51.8%** | 96.0% |

Room 3 is under 0.6, so in noisy mode it reads from the ideal pool: `groverPoolMode()` in `quantum.js` applies this to any room whose noisy peak is under `GROVER_MIN_PEAK` (0.6). **Reveal card:** show Room 3's noisy figure (51.8% at 3 laps), read from the pool with `groverShare()` rather than typed in. Room 2 keeps the noisy pool; its overshoot still shows (27.5% at 3 laps, 6.9% at 4).

---

## Phase 18: Gray-box Room 2

**Prompt:** "Read PLAN-hall-of-echoes.md and do Phase 18."

1. Build every object in the file list, with placeholder rectangles.
2. `TestHall.js`: 8 vaults with lamps on, the lever, the water loop, the dial, the dais.
3. Debug overlay (backtick): current state, laps, key, last drawn vault.
4. Verify by hand: 1 lap, 2 laps, 3 laps, 4 laps, 10 reads each; the key's lamp peaks at 2 laps and fades after; reads at 2 laps are almost always right.

**Done when:** a full search plays end to end, including an early read from the dais mid-laps and the pry option.

---

## Phase 19: Rooms 1 and 3

**Prompt:** "Read PLAN-hall-of-echoes.md and do Phase 19."

1. Room 1: 4 vaults, lamps on.
2. Room 3: 16 vaults, lamps dark, the mural hint after 2 failed reads.
3. Same objects as Room 2, configured by vault count.

**Done when:** all three rooms are completable using the best lap counts.

---

## Phase 20: Level flow and Level select

**Prompt:** "Read PLAN-hall-of-echoes.md and do Phase 20."

1. Room order 1 → 2 → 3, with lava respawn and a new random key after a wrong vault.
2. Reveal card after Room 3: "You ran Grover's search. The fountain flipped the key's phase, and the pool turned that flip into brightness. Each lap rotates the odds toward the key, but past the peak it rotates away again. The laps you need grow like the square root of the number of vaults, not like the number of vaults." Then **Play again** and **Level select** buttons.
3. Create `src/levels.js` exactly as in Project facts.
4. Create `scenes/LevelSelect.js` and make it the game's first scene: one card per entry in `LEVELS`, both selectable, a checkmark on cleared levels (try/catch around `localStorage`).
5. On Level 1's Verdict screen: when passed, add **Next level** (starts the Hall of Echoes, Room 1) and **Level select**; when failed, keep the current retry flow and add **Level select**.
6. Mark Level 1 cleared on pass and Level 2 cleared after Room 3.

**Done when:** from a fresh load you can (a) pick Level 2 directly, (b) clear Level 1 and press Next level into Level 2, and (c) return to the Level select from every end screen, with checkmarks showing for cleared levels.

---

## Phase 21: Polish

**Prompt:** "Read PLAN-hall-of-echoes.md and do Phase 21."

- Water-loop ripples, lamp glow and fade animated between lap counts, a chime at the fountain, an unseal effect, lava flood effect.

---

## Working rules for Claude Code

- Don't change the circuit, the XOR relabel, the formula or the lap cap of 4.
- Lamps come from `lampLevels`; reads come from the pool through `groverRead`. Never mix them.
- No quantum vocabulary on screen except the reveal card.
- If time is short, Room 2 alone (lamps on) is a complete level.
- Never lock Level 2 behind Level 1; the Level select always offers both.
- Run tests at the end of each phase, report the numbers, and stop.
