# Entangled Vaults — Level 1 Tech Spec

Oct 10, 2026 · @Jishnu Sanyal

## Overview

Entangled Vaults is a two-player co-op platformer in the spirit of Fireboy and Watergirl, where the heroes share an entangled pair of gems. Level 1, The Twin Vaults, is a vault door that opens only if the team wins at least 80% of 200 rounds of a game no classical strategy can win more than 75% of the time.

- **Track:** Quantum Playground (with a strong Quantum Unlocked angle: it teaches Bell nonlocality by letting players feel the 75% wall).
- **Output shape:** read structure inside the distribution. The game never cares which color one gem shows, only whether the two agree.
- **Why the circuit is essential:** two calls to `random.choices` cannot reproduce the correlations. The classical cap of 75% is a proven limit, and the entangled pair reaches about 85.4%. The level's pass threshold sits between them.
- **Circuit size:** 2 qubits, 4 gates plus measurement.

## Level 1: The Twin Vaults

Players plan together, get separated, then watch 200 rounds play out from their plan; the vault opens at 160 wins or more.

### Flow

1. **Planning Hall (together).** Both heroes stand in a shared room. Each sets two lens dials on their pedestal: one for sign A, one for sign B. Dials have 8 positions, 45° apart. Talking is allowed here; agreeing on a plan in advance is legal in the real experiment too.
2. **Separation.** The doors slam. Fireboy runs a short lava path to the Fire Vault, Watergirl a short water path to the Water Vault. Normal platforming rules: fire dies in water, water dies in lava.
3. **The Run (apart).** When both reach their pedestals, 200 rounds play over about 20 seconds. Each round, each vault shows a random sign (A or B), the gems flash red or blue, and a scoreboard ticks win or loss. No input during the run, so no communication is possible.
4. **Verdict.** 160+ wins (80%) opens the exit. Otherwise both respawn in the Planning Hall with their dials as they left them.

### The rule for one round

The gems must show the same color, unless both signs are B; then they must show different colors.

### Two gem modes, in order

| Mode | When | What the player controls | Best possible |
|---|---|---|---|
| Plain gems | First attempt, forced | Pick a fixed color for A and for B | 75% (fails 94% of the time) |
| Entangled gems | Unlocked after the first fail | Lens angle for A and for B | about 85.4% (passes 98.5% of the time) |

The forced first attempt is the lesson: the team hits the 75% wall, then the entangled gems get them over it.

### Hints (shown after repeated fails with entangled gems)

- After 2 fails: "Your A lenses should be close together."
- After 4 fails: "Try Watergirl's lenses one step either side of Fireboy's A."

One winning plan: Fireboy A = position 0, B = position 2; Watergirl A = position 1, B = position 7.

## The physics

The level is the CHSH game, the experiment behind the 2022 Nobel Prize in Physics: entanglement lets separated players win about 85.4% of rounds, against a proven classical maximum of 75%.

**Why classical tops out at 75%.** With fixed colors, each player has 4 possible plans, so 16 team plans in all. Checking every one against the 4 sign combinations, the best wins 3 of 4 (for example, both always show red: they lose only when both signs are B). Shared random choices don't help, because they just mix these plans.

**Why the entangled pair beats it.** Both gems start as a Bell pair. Each lens turns its own gem's measurement by an angle. For this circuit, the chance the two gems match depends only on the difference between the two angles:

$$P(\text{match}) = \cos^2\!\left(\frac{\beta - \alpha}{2}\right)$$

The winning plan makes the angle difference 45° for the three sign pairs that need a match, and 135° for the B, B pair that needs a mismatch. Every pair then wins with probability cos²(22.5°) ≈ 0.854.

Verified in simulation (Qiskit Aer, 20,000 shots per sign pair, the winning plan):

| Signs (Fire, Water) | Angle difference | Needed | Win rate |
|---|---|---|---|
| A, A | 45° | match | 0.851 |
| A, B | −45° | match | 0.853 |
| B, A | −45° | match | 0.853 |
| B, B | −135° | differ | 0.853 |
| Average | | | 0.853 (theory 0.854) |

**Why no one can cheat by communicating through the gems.** Each gem on its own is red or blue 50/50 whatever the other player's lens does. The advantage only appears when the two results are compared, which is why the scoreboard is shared and shown after each round.

**Why 160 of 200 is the right bar (binomial odds):**

| Team's true win rate | Chance of 160+ wins in 200 |
|---|---|
| 75% (best classical) | 5.8% |
| 82% | 79.8% |
| 83% | 88.8% |
| 85.4% (ideal entangled) | 98.5% |

If the noisy IonQ pool lands near 82%, consider 155 wins as the bar, and re-run this table.

## Quantum pipeline

Only two things cross the line between game and quantum computer: two angles go in, a tally of four bitstrings comes back. Everything else is ordinary JS.

### 1. App state (JS, game state)

```js
const plan = {
  fire:  { A: 0, B: 2 },   // dial positions 0..7
  water: { A: 1, B: 7 },
};
const round = { fireSign: 'A', waterSign: 'B' };   // random each round
const mode = 'ideal';   // 'ideal' | 'ionq-aria-1' | 'plain'
```

### 2. Prepare (JS): dial position to angle

Position k means an angle of k × 45°, i.e. k × π/4 radians.

```js
const angle = k => k * Math.PI / 4;
const a = plan.fire[round.fireSign];    // Fireboy's dial for his sign
const b = plan.water[round.waterSign];  // Watergirl's dial for hers
```

### 3. Circuit (Python, Qiskit)

Qubit 0 is Fireboy's gem, qubit 1 is Watergirl's.

```python
from math import pi
from qiskit import QuantumCircuit

def build_circuit(fire_pos, water_pos):
    qc = QuantumCircuit(2, 2)
    qc.h(0)                          # Fireboy's gem into superposition
    qc.cx(0, 1)                      # entangle: the Bell pair
    qc.ry(fire_pos * pi / 4, 0)      # Fireboy's lens
    qc.ry(water_pos * pi / 4, 1)     # Watergirl's lens
    qc.measure([0, 1], [0, 1])       # gem 0 into bit 0, gem 1 into bit 1
    return qc
```

### 4. Measure

Each shot reads one bitstring. Bit value 0 = red, 1 = blue. For 8 × 8 dial combinations, run 1,000 shots each, ahead of time (see Shot pools).

### 5. Decode (JS)

Counts keys read `c1 c0`, so the right character is Fireboy, the left is Watergirl. Stated once, here, and nowhere else in the code.

```js
const NAMES = {
  '00': 'both_red',
  '01': 'fire_blue_water_red',
  '10': 'fire_red_water_blue',
  '11': 'both_blue',
};
const COLOR = { '0': 'red', '1': 'blue' };

function decodeShot(bits) {             // bits like '01'
  return {
    name:  NAMES[bits],
    fire:  COLOR[bits[1]],              // right char = qubit 0
    water: COLOR[bits[0]],              // left char = qubit 1
  };
}
```

### 6. Use it (JS): score the round

```js
function roundWon(shot, fireSign, waterSign) {
  const match = shot.fire === shot.water;
  const bothB = fireSign === 'B' && waterSign === 'B';
  return bothB ? !match : match;
}
```

The gems animate to `shot.fire` and `shot.water`, the scoreboard ticks, and after 200 rounds the vault opens if wins ≥ 160.

Plain-gem mode skips steps 3 to 5: each gem shows the fixed color the player chose for that sign. That is the classical baseline, and it lives in the same code path.

## Shot pools

The game never waits on a quantum job mid-level: every one of the 64 dial combinations is run ahead of time, and each round draws one shot from the stored tally. A 200-round run would otherwise mean 200 cloud jobs at several seconds each.

### Two pools, same format

| Pool | Backend | Generated where | Shots per combination |
|---|---|---|---|
| `ideal.json` | Qiskit Aer (noiseless) | Locally, `make_pools.py` | 1,000 |
| `ionq-aria-1.json` | IonQ Aria 1 (25q) noisy simulator | On Qollab, via a fork of the script | 1,000 |

Generator (`make_pools.py`, local Aer version):

```python
import json
from qiskit_aer import AerSimulator
from circuit import build_circuit   # the function in Quantum pipeline

backend = AerSimulator()
SHOTS = 1000
pools = {}
for f in range(8):
    for w in range(8):
        counts = backend.run(build_circuit(f, w), shots=SHOTS).result().get_counts()
        pools[f"f{f}_w{w}"] = counts

json.dump({"mode": "ideal", "shots": SHOTS, "pools": pools},
          open("public/pools/ideal.json", "w"), indent=1)
```

**IonQ pool on Qollab.** Fork a project, paste `build_circuit`, keep Qollab's backend (pick IonQ Aria 1), loop over the 64 combinations with the usual `job.status()` wait, and `print(json.dumps(pools))` at the end. Copy the printed JSON into `public/pools/ionq-aria-1.json`. Try passing all 64 circuits in one `backend.run([...])` call first; if Qollab's backend refuses a list, loop.

### File format

```json
{
  "mode": "ideal",
  "shots": 1000,
  "pools": {
    "f0_w1": { "00": 427, "11": 426, "01": 74, "10": 73 }
  }
}
```

Drawing one shot (JS): a weighted pick from the tally, with replacement. With replacement is fine: a fresh draw from a 1,000-shot tally behaves like a fresh shot from the circuit, as long as the tally is reasonably large.

```js
function drawShot(counts, shots) {
  let r = Math.random() * shots;
  for (const [bits, n] of Object.entries(counts)) {
    if ((r -= n) < 0) return bits;
  }
}
```

The numbers in the format example are illustrative; the real file holds whatever the run produced.

## Tech stack and architecture

The shipped game is a static JS site that reads two JSON pools; Python and Qiskit run only at build time, plus an optional live server for the demo.

| Layer | Choice | Why |
|---|---|---|
| Game engine | Phaser 3 (JS) | Arcade physics, tilemaps, two-player keyboard input built in |
| Build tool | Vite | Fast dev server, one-command static build |
| Level maps | Tiled (exports JSON) | Phaser loads Tiled maps directly |
| Quantum circuits | Python + Qiskit | Same code you already use on Qollab |
| Ideal pool | qiskit-aer | Noiseless, runs on a laptop in seconds |
| Noisy pool | Qollab, IonQ Aria 1 (25q) | The noise model you've used all course |
| Live demo (optional) | FastAPI + Qiskit | One endpoint to run a single round live for judges |
| Hosting | GitHub Pages or Netlify | Free static hosting, no server needed for the MVP |

**Controls.** Fireboy: WASD to move, Q/E to turn a dial. Watergirl: arrow keys, comma/period to turn a dial. Same keyboard, like the original.

### Repo layout

```
entangled-vaults/
  quantum/
    circuit.py          build_circuit()
    make_pools.py       writes ideal.json
    qollab_pool.py      copy of the loop to paste into Qollab
    server.py           optional FastAPI live endpoint
    test_pools.py
  web/
    public/pools/       ideal.json, ionq-aria-1.json
    public/maps/        level1.json (Tiled)
    src/quantum.js      NAMES, decodeShot, drawShot, roundWon
    src/scenes/         PlanningHall.js, Vaults.js, Run.js, Verdict.js
    src/main.js
```

**Optional live endpoint.** `POST /round` with `{"fire_pos": 0, "water_pos": 1}` returns one shot's bitstring from Aer. The game uses it only for a "run this round live" button on the Verdict screen, so a slow call never blocks play.

Both pools hold the same 64 tallies in the same format, so switching between ideal and noisy is one string in the game's settings.

## Testing and verification

Five checks catch the bugs that would silently break the level; the first two matter most, because a flipped bit order or wrong angle still produces a playable but wrong game.

| # | Check | How | Pass if |
|---|---|---|---|
| 1 | Bit order | Build a circuit with `x(0)` only, decode one shot | Fireboy is blue, Watergirl is red |
| 2 | Quantum win rate | Score every round of the winning plan against `ideal.json`, all 4 sign pairs | Average win rate between 0.83 and 0.87 |
| 3 | Classical cap | Brute-force all 16 plain-gem plans in JS | Best plan scores exactly 0.75 |
| 4 | No signalling | For each Watergirl dial, Fireboy's red share in `ideal.json` | Between 0.45 and 0.55 for every combination |
| 5 | Noisy pool | Same as check 2 against `ionq-aria-1.json` | Record the number; it sets the pass bar (see The physics) |

Checks 1 to 4 go in `test_pools.py` and a small JS test; run them every time a pool is regenerated. Check 3 already ran here in Python and returned 0.75.

### Playtest checklist

- [ ] Plain-gem mode fails at least 9 runs in 10
- [ ] The winning plan passes at least 9 runs in 10 on the ideal pool
- [ ] A first-time player finds a passing plan within 10 minutes, with hints
- [ ] The 200-round run reads clearly at 20 seconds

## Build plan and stretch goals

Build the quantum core first and the platforming last: a working scoreboard over a plain screen already demos the whole idea, while a beautiful level without it demos nothing.

### Milestones, in order

1. **Quantum core.** `circuit.py`, `make_pools.py`, `ideal.json`, and checks 1 to 4 passing.
2. **Text prototype.** A bare web page: four dial inputs, a Run button, 200 rounds, a win count. This is a complete demo on its own.
3. **Noisy pool.** Generate `ionq-aria-1.json` on Qollab, run check 5, set the pass bar.
4. **Game shell.** Phaser scenes for Planning Hall, Run and Verdict, with placeholder art.
5. **Platforming.** The two vault paths in Tiled, fire and water hazards, controls.
6. **Polish.** Gem flash animations, the scoreboard with the 75% line drawn on it, hint text, sound.
7. **Pitch.** A 60-second end screen explaining the 75% wall, and the ideal vs. noisy win rates side by side.

Splitting the work between two people: one owns milestones 1 to 3 and the Verdict screen (the quantum side); the other owns 4 to 6 (the game side). `quantum.js` is the contract between them.

### Stretch goals

- Live round button via `server.py` on the Verdict screen.
- Noise slider: blend the ideal and noisy pools, or add depolarizing noise in Aer, to show the win rate sliding back toward 75%.
- Online two-player mode over WebSockets, so the players are truly in separate rooms.
- Level 2 idea: "Don't look at the platform," built on the interference circuit from lesson 5.
