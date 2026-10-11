# Entangled Vaults

**A two-player co-op platformer that teaches entanglement and Grover's search by making players *use* them.**

Fireboy and Watergirl share one keyboard and two quantum puzzles. In Level 1, the only way to open the vault is to beat a limit that no classical strategy can beat: the CHSH game, the Bell test behind the 2022 Nobel Prize in Physics. In Level 2, they run Grover's search by hand. A lever is the Hadamard step, a fountain is the oracle, and a mirror is the diffuser. They watch the odds rotate toward the key, then past it.

Every result in the game is a real measurement shot from a Qiskit circuit, run on an ideal simulator and on IonQ's Aria 1 noise model.

**Hackathon theme: Quantum Unlocked.** It teaches a hard topic (Bell nonlocality and quantum search) through an interactive game. It also fits *Quantum Playground*: entanglement, interference and measurement are the game mechanics, not a random-number source.

```
cd web && npm install && npm run dev      # then open the printed localhost URL
```

No sign-in, accounts or API keys are needed to play. The measured shot pools ship with the repo.

---

## Contents

- [What players learn](#what-players-learn)
- [Level 1: The Twin Vaults (entanglement, CHSH)](#level-1-the-twin-vaults-entanglement-chsh)
- [Level 2: The Hall of Echoes (Grover's search)](#level-2-the-hall-of-echoes-grovers-search)
- [How the game teaches](#how-the-game-teaches)
- [The quantum side](#the-quantum-side)
- [Results: ideal vs IonQ Aria 1 noise](#results-ideal-vs-ionq-aria-1-noise)
- [Running it](#running-it)
- [Controls](#controls)
- [Tests](#tests)
- [Repository layout](#repository-layout)
- [What was built when, and with what](#what-was-built-when-and-with-what)
- [License and credits](#license-and-credits)

---

## What players learn

| Concept | Where players meet it | What they *do* with it |
|---|---|---|
| Classical strategies and Bell's inequality | Level 1, first attempt | Fix a color per sign with plain gems, and hit a wall at 75% |
| Entanglement (a Bell pair) | Level 1, entangled gems | Two gems that agree when read the same way, with no message passing |
| Measurement angle | Level 1, lens dials | Turn a lens 45° at a time. Agreement follows cos²(Δ/2) |
| No-signalling | Level 1, physics card | Each gem alone stays 50/50, whatever the partner does |
| Superposition (Hadamard) | Level 2, the lever | Spread the odds evenly over every vault |
| Oracle (phase flip) | Level 2, the fountain | Mark the key invisibly: the lamps do *not* change |
| Diffuser (inversion about the mean) | Level 2, the mirror | Turn the hidden mark into brightness |
| Grover iteration and over-rotation | Level 2, lap dial and lamps | Add laps until the key's lamp peaks, then watch it fade again |
| Reversibility | Level 2, mirror without a mark | The diffuser runs the last iteration backwards |
| Measurement and collapse | Level 2, the dais | One read picks one vault. The superposition is spent |
| √N speed-up vs classical search | Level 2, Room 3 and recaps | Predict the laps for 16 vaults from the 4- and 8-vault rooms |
| Noise on real hardware | Both levels | Play from IonQ Aria 1 noisy pools and see the numbers drop |

---

## Level 1: The Twin Vaults (entanglement, CHSH)

Each round, each vault shows a random **sign**, A or B (the inputs). The team wins the round if their gems show the **same** color, unless both signs are B, in which case they must **differ**. Once a round starts, the players can't talk. The vault opens at **160 of 200** rounds (80%).

1. **Planning Hall.** Each player sets up their gem for each sign. With *plain* gems, that's a fixed color. With *entangled* gems, it's a lens angle in 45° steps.
2. **The platforming vaults.** *Ember Climb* and *Tide Spire* are two separate timed levels (40 s), with gems to collect, levers that open the partner's gate, and lava and water that kill.
3. **The run.** 200 rounds play out in about 20 seconds, with a live win-rate chart.
4. **The verdict.** A per-sign-pair breakdown, a recap, and the next step.

The first attempt is always with plain gems, and the game does *not* say that 75% is the limit. Players try to find a perfect plan, can't, and only then learn why. The recap names Bell's inequality, and a card names the CHSH game. Entangled gems unlock next. With lenses at 0°/90° (Fireboy) and 45°/−45° (Watergirl), every sign pair wins cos²(22.5°) ≈ **85.4%** (Tsirelson's bound). That clears the 80% bar, which no fixed plan can reach on average.

## Level 2: The Hall of Echoes (Grover's search)

Three rooms of sealed vaults: **4, 8 and 16**. One holds the key, and a wrong vault floods the room with lava and moves the key.

| Game piece | Quantum step | Circuit |
|---|---|---|
| **Lever** (Fireboy) | Equal superposition | `H` on every qubit |
| **Fountain** (Watergirl, low right) | Oracle: flip the key's phase | multi-controlled Z on the marked state |
| **Mirror** (Watergirl, high left, a hard climb) | Diffuser: reflect about the mean | `H`, flip `|0…0⟩`, `H` |
| **Lap dial** | Grover iterations (0–4) | oracle + diffuser repeated |
| **Lamps** | Probabilities, sin²((2k+1)θ) | not measured: the simulator's view |
| **Dais** (Fireboy) | Measurement | one shot drawn from the pool |

- **Rooms 1 and 2, lit lamps.** The lamps show the probabilities and brighten or fade with each lap. Players are coached to read with 0 laps first, then add laps one at a time until the read gets *worse*. That's over-rotation, seen directly. Prying vaults open is disabled here, because the brightest lamp would give the key away.
- **Room 3, still lamps.** 16 vaults, and the lamps stay evenly lit whatever happens, just as real hardware never shows its amplitudes. Players predict the laps from what Rooms 1–2 taught them (1 lap for 4 vaults, 2 for 8, so about 3 for 16, roughly (π/4)·√N). Fireboy *can* pry vaults open here, which is a classical search at 8.5 tries on average.

The fountain and mirror can be used in **any order**, and the game follows what the real operators do. Fountain twice cancels out. Mirror without a mark runs the last iteration backwards. Mirror at 0 laps does nothing. A unit test checks 400 random press sequences against a true amplitude simulation.

---

## How the game teaches

Each step below runs both levels (`web/src/teach.js`, with the text in `web/src/concepts.js`):

- **Concept cards.** The real term, the first time something is used: *superposition, oracle, diffuser, measurement, over-rotation, entanglement…* The game pauses while a card is up.
- **Term tags.** Every time a piece is used, its term rises over it, e.g. `ORACLE: PHASE FLIPPED` or `DIFFUSER: ITERATION 2`.
- **Labels.** Objects carry their real names: `HADAMARD`, `MEASURE`, `FOUNTAIN = ORACLE`, `MIRROR = DIFFUSER`, `LAMPS = PROBABILITIES`, `qubit q0` / `qubit q1`, `SIGN (input)`.
- **Predictions before outcomes:**
  - before every measurement: LOW / MEDIUM / HIGH chance, scored against the true odds;
  - on entering Room 3: the number of laps;
  - before each Level 1 run: under, about, or over 75%.
- **Recaps.** After every room and run, three to six lines in real terms, built from what the players actually did. For example: iterations run, the key's odds at measurement, the best lap count, classical vs Grover cost, and predictions right.
- **Physics cards (press P).** Five slides per level. Every number is computed live from the pool files, never typed in. Each deck ends with the actual circuit diagram and its Qiskit code.

---

## The quantum side

### Level 1 circuit (2 qubits, one per gem)

```python
qc = QuantumCircuit(2, 2)
qc.h(0)                       # Fireboy's gem: a 50/50 coin
qc.cx(0, 1)                   # entangle: a Bell pair
qc.ry(fire_pos * pi / 4, 0)   # Fireboy's lens, 45 deg a step
qc.ry(water_pos * pi / 4, 1)  # Watergirl's lens
qc.measure([0, 1], [0, 1])    # 0 = red, 1 = blue
```

There are 8 × 8 = **64 dial pairs**, each run for **1,000 shots**. Counts keys read `c1c0`, so the right-hand bit is Fireboy (qubit 0).

### Level 2 circuit (2, 3 or 4 qubits for 4, 8 or 16 vaults)

```python
qc.h(range(n))                     # lever: superposition
for _ in range(laps):
    flip_all_zero(qc, n)           # fountain: oracle marks |0...0>
    qc.h(range(n))                 # mirror: diffuser
    flip_all_zero(qc, n)
    qc.h(range(n))
qc.measure(range(n), range(n))     # dais: measurement
```

That's 3 room sizes × 5 lap counts (0–4) = **15 circuits** × 1,000 shots. The circuit always marks vault 0. The game moves the answer to the real key's vault by XOR-ing each measured bitstring with the key, which is exact for this oracle. A unit test checks it against a statevector.

### Why shot pools?

The browser game can't call a quantum backend mid-round without keys, latency or sign-in. So every circuit is run ahead of time, and each round in the game draws one recorded shot from the matching tally. Players get real measurement statistics, including real noise, and the game stays a static site anyone can run.

- `ideal.json`, `grover-ideal.json`: Qiskit Aer, fixed seed 2022.
- `ionq-aria-1.json`, `grover-ionq-aria-1.json`: IonQ's cloud simulator with the **Aria 1 noise model** (the same backend Qollab offers as *IonQ Aria 1 (25q)*).

In Level 1, the Verdict screen's **T** key switches between pools.

---

## Results: ideal vs IonQ Aria 1 noise

From the pool files in `web/public/pools/` (`uv run check_pool.py <pool>` reproduces Level 1):

**Level 1: the winning entangled plan** (theory 85.4%, classical cap 75%)

| Pool | A,A | A,B | B,A | B,B | Average |
|---|---|---|---|---|---|
| Ideal (Aer) | 85.0% | 86.9% | 84.2% | 86.7% | **85.7%** |
| IonQ Aria 1 noise | 85.4% | 85.4% | 85.4% | 82.4% | **84.7%** |

No-signalling holds in the data: Fireboy's red share stays between 45.6% and 53.3% across all 64 dial pairs (ideal pool).

**Level 2: chance the read finds the key, by laps**

| Vaults | Pool | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|---|
| 4 | ideal | 27.9% | **100%** | 25.9% | 23.0% | 100% |
| 4 | IonQ Aria 1 | 27.6% | **100%** | 27.6% | 23.8% | 100% |
| 8 | ideal | 12.9% | 76.5% | **94.9%** | 32.8% | 1.3% |
| 8 | IonQ Aria 1 | 12.8% | 68.6% | **76.5%** | 27.5% | 6.9% |
| 16 | ideal | 6.3% | 45.1% | 91.3% | **96.0%** | 55.6% |
| 16 | IonQ Aria 1 | 7.4% | 38.8% | **57.8%** | 51.8% | 31.1% |

Over-rotation shows clearly in the 8- and 16-vault rows. Noise grows with circuit depth. On Aria 1 noise, 16 vaults peak at only 57.8%, and earlier: at 2 laps, not 3, because the third iteration adds more noise than signal. Below 60% the room is too weak to teach with, so Room 3 always reads from the ideal pool (`GROVER_MIN_PEAK` in `quantum.js`). The reveal card tells players so.

---

## Running it

### Play (Node 20.19+ or 22.12+)

```bash
cd web
npm install
npm run dev        # development server
npm run build      # static build in web/dist/, can be hosted anywhere
```

### Regenerate the shot pools (Python 3.15+, [uv](https://docs.astral.sh/uv/))

```bash
cd quantum
uv run make_pools.py           # Level 1, ideal (Aer)
uv run make_pools_grover.py    # Level 2, ideal (Aer)
uv run pytest                  # circuit, bit order, win rates, no-signalling, XOR relabel
```

The noisy pools need an IonQ API key in `quantum/.env` (`IONQ_API_KEY=...`). The file is git-ignored, and `qiskit-ionq` reads it.

```bash
uv run ionq_pool.py            # Level 1 on IonQ simulator, Aria 1 noise model
uv run ionq_pool_grover.py     # Level 2
```

### Run it on Qollab

`qollab/main.py` is the Qollab project. It runs the game's circuits live on whatever backend you pick, as one batched job (so it works on IonQ too), and prints the CHSH win rates and the Grover peaks next to theory. `qollab/PROJECT_PAGE.md` is the project page's write-up.

To regenerate a whole pool on Qollab, `quantum/qollab_pool.py` and `quantum/qollab_pool_grover.py` are self-contained. Paste either one into a Qollab project with **IonQ Aria 1 (25q)** (or a simulator) selected. Each uses Qollab's `backend`, imports nothing local, and prints one JSON line to save as the matching file in `web/public/pools/`.

---

## Controls

| | Fireboy | Watergirl |
|---|---|---|
| Move / jump | A, D / W | ← → / ↑ |
| Level 1 planning: turn lens or swap color | Q / E | , / . |
| Level 1 planning: pick sign A / B | W / S | ↑ / ↓ |
| Level 1 planning: ready | R | Enter |
| Level 2: use | S (lever, dais, pry) | ↓ (fountain, mirror) |

Elsewhere: **P** opens the physics card, **Enter** closes a card, **←/→ + Enter** pick an answer, **T** switches pools (Level 1 Verdict), **M** mutes (Level 1 run).

---

## Tests

- **`web`** (`npm test`, Vitest, 43 tests). Covers:
  - pool decoding and bit order;
  - plan win rates and the 75% classical cap;
  - Grover lamps against the formula, and the XOR relabel;
  - the search state machine, including 400 random fountain/mirror sequences checked against a true amplitude simulation;
  - level clears and progress.
- **`quantum`** (`uv run pytest`, 16 tests). Covers:
  - bit order;
  - the winning plan's win rate in every pool, and the 75% classical cap;
  - no-signalling (each gem stays near 50/50);
  - the Grover pools: shape, each room's peak, overshoot, the formula, and bit order.

---

## Repository layout

```
qollab/                 the Qollab project: main.py (runs live) and the project page
quantum/                Qiskit circuits and pool generation (Python, uv)
  circuit.py              Level 1 Bell-pair circuit
  circuits_grover.py      Level 2 Grover circuit
  make_pools*.py          ideal pools (Aer)
  ionq_pool*.py           noisy pools (IonQ simulator, Aria 1 noise)
  qollab_pool*.py         paste-into-Qollab versions
  check_pool.py           prints a pool's win rates and no-signalling check
web/                    the game (Vite + Phaser 3)
  public/pools/           the four measured shot pools (JSON)
  src/quantum.js          the only place bitstrings are decoded; all game math
  src/teach.js            concept cards, predictions, recaps, term tags
  src/concepts.js         the teaching text
  src/objects/            Level 2 pieces; SearchHall.js is the Phaser-free state machine
  src/scenes/             Level select, Level 1 scenes, Level 2 hall, physics cards
tools/build_assets.py   crops the art packs into web/public/assets/
PLAN*.md, TECH_SPEC*.md design documents and phase-by-phase build plans
```

---

## What was built when, and with what

- **Built during the hackathon window.** The repository starts with the plan and spec on Oct 10, 2026, and every phase after that is its own commit (see `git log`).
- **Third-party art** (not ours, credited in `CREDITS.md` and on screen):
  - chierit's *Elementals* hero sprites;
  - the DawnLike tileset and SDS 8×8 font (DragonDePlatino and DawnBringer).

  Everything else is drawn or synthesized in code: liquids, gems, lenses, doors, lamps, particles and sound.
- **Libraries.** Qiskit, Qiskit Aer and qiskit-ionq (Python). Phaser 3, Vite and Vitest (JavaScript).
- **AI assistance.** Development was done with Claude Code (Anthropic) as a pair programmer, working from our tech specs and build plans.

## License and credits

The code is released under the [MIT License](LICENSE).

The art in `web/public/assets/` stays under its authors' **CC BY 4.0** licenses. See [CREDITS.md](CREDITS.md).
