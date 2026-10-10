# Entangled Vaults — Hall of Echoes Tech Spec

Oct 10, 2026 · @Jishnu Sanyal

## Overview

The Hall of Echoes is Level 2, played after The Twin Vaults, in which the heroes physically run Grover's search algorithm to find the one safe vault among 4, 8 or 16, and the puzzle is how many laps of the algorithm to run before opening one.

- **Roles, same theme as the other levels:** Watergirl does the phase work (marking and reflecting, by running a water loop). Fireboy measures (his light unseals one vault).
- **The decision players make:** the lap count. Too few laps and the answer is uncertain; too many and it gets worse again. Overshooting is the moment the level is built around.
- **Why it's an algorithm, not just a property:** players carry out a fixed procedure with a measurable payoff, about √N looks instead of about N/2. Classical search never gets worse by searching more, so the overshoot has no classical counterpart.
- **Output shape:** sample from it. Each search ends in one measured vault, drawn from a precomputed pool.
- **Circuits:** 2, 3 and 4 qubits for the three rooms.
- **Fits as:** Level 2, reachable from Level 1's Verdict screen or straight from the Level select. It reuses Level 1's pool system and needs nothing from Levels 2 and 3.

## Level design

Three rooms, each a hall of sealed vaults with one hidden key; the team either pries vaults open one at a time or runs the search routine and opens the one vault it points to.

### The search routine (the same in every room)

1. **Spread.** Fireboy pulls the hall lever. All vault lamps glow equally. Pulling it again resets the search.
2. **Laps.** Watergirl swims a one-way water loop that passes the Echo Fountain (marks the key's vault, invisibly) and then the Mirror Pool (turns the mark into brightness). One full loop is one lap. A dial on the wall counts laps, up to 4.
3. **Read.** Fireboy steps onto the lantern dais and flashes his light. Exactly one vault unseals.
4. **Open.** Either hero opens the unsealed vault. Key: room cleared. Wrong vault: lava floods the floor, both respawn at the room entrance, and the key moves to a new random vault.

**Reading early.** Fireboy can step onto the dais at any time. A read mid-laps uses the laps done so far, so his part of the puzzle is patience: wait for Watergirl to finish the right number of laps.

**The classical option is always there.** Fireboy can pry any sealed vault open directly, with the same lava risk. That's the baseline players compare against without being told.

### Rooms

| Room | Vaults | Lamps | Best lap count | What players learn |
|---|---|---|---|---|
| 1 | 4 | Show brightness | 1 (always right) | The routine works |
| 2 | 8 | Show brightness | 2 (95% right) | A third lap makes it worse |
| 3 | 16 | Dark | 3 (96% right) | Find the lap count without the lamps |

Lamps show the chance each vault would unseal if Fireboy read right now. They brighten and dim lap by lap, so in Room 2 players can watch the key's lamp peak and fade. In Room 3 they go dark, and players must use what they learned.

**Room 3 hint (after 2 failed reads):** a mural with no words, showing 4 vaults with 1 wave and 8 vaults with 2 waves, then 16 vaults and a blank.

**Reveal card:** "You ran Grover's search. The fountain flipped the key's phase, and the pool turned that flip into brightness. Each lap rotates the odds toward the key, but past the peak it rotates away again. The laps you need grow like the square root of the number of vaults, not like the number of vaults."

## The physics

Each lap rotates the odds toward the key by a fixed angle, so the chance of a correct read rises to a peak near (π/4)·√N laps and then falls; Qiskit runs match the formula to within 1%.

**How a lap works.** Think of the search as an arrow between two directions: "the key's vault" and "every other vault." Spread points the arrow almost entirely at "every other vault." The fountain flips the key's part, and the pool reflects everything around the average; together they turn the arrow by a fixed angle toward the key. Turn it too far and it swings past.

$$P(\text{correct after } k \text{ laps}) = \sin^2\!\big((2k+1)\,\theta\big), \qquad \sin\theta = \frac{1}{\sqrt{N}}$$

Against the classical way (prying vaults open until the key turns up):

| Vaults | Pries needed on average | Laps at the peak | Chance the single read is right |
|---|---|---|---|
| 4 | 2.25 | 1 | 100% |
| 8 | 4.38 | 2 | 95% |
| 16 | 8.44 | 3 | 96% |

Each pry is a lava risk; the quantum route risks lava only once, on a vault it is 95% or more sure of. At 4 to 16 vaults any computer searches instantly, so the honest claim is about the number of looks, which is what makes Grover matter at large scale.

Verified in simulation (Qiskit Aer, 20,000 shots per point; every one of the 8 possible key positions gives 94% to 95% at 2 laps in the 8-vault room).

The 8-vault room is where overshoot bites hardest: a fourth lap drops a 95% read to about 1%. The 4-vault room swings back to 100% at 4 laps because the rotation comes full circle, so the lap dial stops at 4.

## Quantum pipeline

One pool per room and lap count, 15 tallies in all, run with the key in vault 0; the game moves the answer to the real key's vault by relabeling, which is exact for Grover because every vault is treated the same.

### 1. App state (JS)

```js
const search = {
  vaults: 8,          // 4, 8 or 16 for rooms 1 to 3
  key: 5,             // random each attempt, 0..vaults-1
  laps: 2,            // 0..4, from the wall dial
};
```

### 2. Prepare

n = log2(vaults) qubits (2, 3 or 4) and the lap count. The key never crosses the line: the pool always uses vault 0.

### 3. Circuit (Python)

Qubit i holds bit i of the vault number.

```python
from qiskit import QuantumCircuit
from qiskit.circuit.library import MCXGate

def flip_all_zero(qc, n):
    # phase-flip the state where every qubit is 0
    qc.x(range(n))
    qc.h(n - 1)
    qc.append(MCXGate(n - 1), list(range(n)))
    qc.h(n - 1)
    qc.x(range(n))

def grover_circuit(n, laps):
    qc = QuantumCircuit(n, n)
    qc.h(range(n))                 # Spread lever
    for _ in range(laps):
        flip_all_zero(qc, n)       # Echo Fountain: marks vault 0
        qc.h(range(n))             # Mirror Pool: reflect about the average
        flip_all_zero(qc, n)
        qc.h(range(n))
    qc.measure(range(n), range(n)) # Fireboy's read
    return qc
```

The Mirror Pool's two h layers wrapped around the same all-zero flip are the textbook diffuser up to a global sign, which changes no probabilities.

### 4. Measure

1,000 shots for each (vaults, laps) pair: 3 rooms × 5 lap counts = 15 tallies. Pool keys: `v4_k0` … `v16_k4`.

### 5. Decode (JS)

Counts keys put qubit 0 on the right, so `parseInt(bits, 2)` gives the vault number directly. Then relabel to the real key:

```js
function decodeRead(bits, key) {
  return parseInt(bits, 2) ^ key;   // XOR moves vault 0 to the key's vault
}
```

**Why XOR is exact:** marking vault `key` instead of vault 0 is the same circuit with X gates on the qubits where `key` has a 1. The spread state doesn't change under those X gates and the Mirror Pool commutes with them, so the whole result just gets XORed by `key`.

### 6. Use it

On Fireboy's read, draw one shot from the pool for the current vaults and laps, decode it, unseal that vault. An early read (his light reaching the hall mid-laps) uses the lap count completed so far.

**Lamps are computed, not measured.** Lamp brightness comes from the formula in The physics (the key's lamp at sin²((2k+1)θ), the others sharing the rest equally). That's the "watch it change" shape: a simulator view of probabilities a real machine would never show before measuring. Say so in the pitch; the read itself always comes from the measured pool.

**Pool file** `web/public/pools/grover-<mode>.json`, same format as before, with keys `v4_k0` to `v16_k4`.

## Engine design

One `SearchHall` object per room runs a small state machine; the water loop, dial, lamps and dais only report events to it, and every draw goes through `quantum.js`.

**SearchHall states:** sealed (before the lever) → spread → lapping → read → opened. A wrong vault sends it back to sealed with a new random key.

### Pieces

| Object | What it does | Talks to |
|---|---|---|
| SpreadLever | Fireboy pulls it: sealed → spread, laps = 0. Pulled again mid-search: reset | SearchHall |
| WaterLoop | One-way swim track with two trigger zones, Fountain then Pool. Both in order = one lap. Water-only; Fireboy dies in it | SearchHall |
| LapDial | Shows laps 0 to 4; the loop gate closes at 4 | SearchHall |
| VaultLamp × N | Brightness from the formula for (vaults, laps); dark in Room 3 | SearchHall |
| LanternDais | Fireboy stands and presses the read key at any time: draws with the laps done so far, decodes, unseals one vault | SearchHall, quantum.js |
| Vault × N | Sealed / unsealed / open. Opening: key or lava. Fireboy can pry a sealed one (classical option) | SearchHall |

**No light system needed.** This level doesn't use `lightAt` or a shaded alcove. If the light system from the Levels 2 and 3 plan is built later, a light-triggered early read can be added as an extra rule; the dais already covers the same lesson.

**New quantum.js functions:** `groverRead(pool, vaults, laps, key)` returns a vault number (draw, then XOR), and `lampLevels(vaults, laps, key)` returns N brightness values from the formula.

**One search, from lever to vault:** the only decision in the loop is when Watergirl stops swimming; everything after the read is one draw and one door.

## Level select and flow

A Level select screen at start lets players pick Level 1 or Level 2, both always open; clearing Level 1 offers a Next level button that goes straight into Level 2.

### Screens

| Screen | When | Options |
|---|---|---|
| Level select | Game start, and from any end screen | Level 1: The Twin Vaults · Level 2: The Hall of Echoes |
| Level 1 Verdict, passed | Vault opens | Next level (starts Level 2, Room 1) · Level select |
| Level 1 Verdict, failed | Under the pass bar | Back to the Planning Hall (as now) · Level select |
| Level 2 end | After the reveal card | Play again · Level select |

### Rules

- **Nothing is locked.** Both levels can be picked from the start, so a judge or a returning player can jump straight to Level 2.
- **Cleared levels get a checkmark** on the Level select. Stored in browser storage, wrapped in try/catch; if storage is unavailable the checkmarks just don't show.
- **Controls:** either player's left/right keys move the selection; Enter or Space starts.
- **One registry:** `src/levels.js` lists each level's number, name and starting scene, so adding a Level 3 later is one entry.

```js
export const LEVELS = [
  { id: 1, name: 'The Twin Vaults',    scene: 'PlanningHall' },
  { id: 2, name: 'The Hall of Echoes', scene: 'HallOfEchoes' },
];
```

## Testing and verification

The peak-lap checks are the ones that matter: if Room 2 at 2 laps isn't above 90% on the ideal pool, the level's lesson is broken. The circuit, the formula and the XOR relabeling have already been checked exactly here against the statevector.

| # | Check | Pass if (ideal pool) |
|---|---|---|
| 1 | Room 1 peak | `v4_k1`: vault 0 share ≥ 0.99 |
| 2 | Room 2 peak | `v8_k2`: vault 0 share between 0.92 and 0.97 |
| 3 | Room 2 overshoot | `v8_k3` below 0.40 and `v8_k4` below 0.05 |
| 4 | Room 3 peak | `v16_k3`: vault 0 share ≥ 0.93 |
| 5 | Zero laps is a blind guess | every k0 pool: vault 0 share within 0.05 of 1/N |
| 6 | Pool matches formula | every pool's vault 0 share within 0.04 of sin²((2k+1)θ) |
| 7 | XOR relabel | in JS, `groverRead` with key 5 over 10,000 draws from `v8_k2` returns vault 5 about 95% of the time |
| 8 | Bit order | a 3-qubit circuit with only `x(0)` reads as vault 1 through `parseInt` |
| 9 | Noisy pool | Record each room's peak share on IonQ Aria 1. The 16-vault circuit is the deepest (3 laps of 4-qubit gates); if its peak falls under 0.6, use the ideal pool for Room 3 and show the noisy figure on the reveal card instead |

### Playtest checklist

- [ ] Players try prying vaults open in Room 1 before using the routine, and switch once they see the routine work
- [ ] In Room 2, at least one team tries 3 laps and sees the lamps fade, without being told
- [ ] Room 3 is solved within 3 reads on average
- [ ] The reveal card makes sense to someone who has never heard of Grover

## Build plan

Build the pool and a gray-box Room 2 first: one hall of 8 vaults with a working lap loop already demos the overshoot, which is the whole level.

**Phases** (numbered on from the earlier plans; the Claude Code prompts are in `PLAN-hall-of-echoes.md`):

16. Quantum core: `grover_circuit`, the 15-tally `grover-ideal.json`, `groverRead`, `lampLevels`, checks 1 to 8.
17. Noisy pool: run the Qollab version on IonQ Aria 1 (15 circuits), record check 9.
18. Gray-box Room 2: `SearchHall` and its pieces in an 8-vault test room, lamps on, debug overlay showing laps and the drawn vault.
19. Rooms 1 and 3: the 4-vault and 16-vault halls, dark lamps and the mural hint in Room 3.
20. Level flow: room order, lava respawn with a new key, the reveal card, the Level select screen, and the Next level button on Level 1's Verdict screen.
21. Polish: water-loop ripples, lamp glow and fade, a chime at the fountain, the unseal effect.

**If time runs short:** ship Room 2 alone, with lamps on. It carries the routine, the peak and the overshoot in one room.

**Where it sits in the game:** Level 2, after The Twin Vaults, with no dependency on any other level. See Level select and flow.
