# Entangled Vaults

**A two-player co-op platformer that teaches entanglement and Grover's search by making players *use* them.**

Fireboy and Watergirl share one keyboard and two quantum puzzles.

- **Level 1, The Twin Vaults: the CHSH game.** This is the Bell test behind the 2022 Nobel Prize in Physics. The vault opens only if the team wins 80% of 200 rounds of a game that no classical plan can win more than 75% of the time. Plain gems hit that wall. Entangled gems, measured at the right lens angles, reach about 85%.
- **Level 2, The Hall of Echoes: Grover's search, run by hand.** A lever is the **Hadamard** step, a fountain is the **oracle**, and a mirror is the **diffuser**. Lamps show the probabilities as players add Grover iterations: the key's lamp brightens, peaks, then fades again (**over-rotation**). In the last room the lamps go dark, as on real hardware, and players must predict the iteration count from what the earlier rooms taught them.

**Theme: Quantum Unlocked.** The game teaches through play. Each concept gets a card the first time it is used, and objects carry their real names. Players **predict before every measurement**, and a **recap** after every room or run explains what happened in real terms.

## Run it here

Press **Run**. Any backend works, including the **IonQ simulator** and **IonQ Aria 1**. `main.py` sends the game's real circuits as **one batched job**: the 4 sign pairs of the winning CHSH plan, plus Grover's search over 4, 8 and 16 vaults at 0 to 4 iterations, 1,000 shots each. It prints:

- **The CHSH win rate for each sign pair**, against the 75% classical limit and the 85.4% quantum limit.
- **The key's chance after each number of Grover iterations, with theory alongside.** The peak, the over-rotation and the √N scaling are all visible.

## Play the game

- **Play in the browser:** https://jishyfishy2006.github.io/entangled-vaults/ (two players on one keyboard; Chrome, Edge or Firefox)
- **Or run it locally:** `cd web && npm install && npm run dev`

The game plays **recorded shots of these same circuits**, run on Qiskit Aer and on IonQ's simulator with the **Aria 1 noise model**. Every outcome in the game is a real measurement. Press **P** in the game for the physics card, which shows the circuit and its Qiskit code.

## The circuits

```python
# Level 1: a Bell pair, one lens per gem
qc.h(0); qc.cx(0, 1)
qc.ry(fire_pos * pi / 4, 0); qc.ry(water_pos * pi / 4, 1)
qc.measure([0, 1], [0, 1])

# Level 2: Grover's search over n qubits
qc.h(range(n))                      # lever: superposition
for _ in range(laps):
    flip_all_zero(qc, n)            # fountain: oracle (phase flip on the key)
    qc.h(range(n)); flip_all_zero(qc, n); qc.h(range(n))   # mirror: diffuser
qc.measure(range(n), range(n))      # dais: measurement
```

## Results from the recorded pools

| | Ideal (Aer) | IonQ Aria 1 noise |
|---|---|---|
| CHSH, winning plan (classical cap 75%) | **85.7%** | **84.7%** |
| Grover, 4 vaults, best (1 iteration) | 100% | 100% |
| Grover, 8 vaults, best (2 iterations) | 94.9% | 76.5% |
| Grover, 16 vaults, best | 96.0% (3 iterations) | 57.8% (2 iterations) |

Noise grows with circuit depth. On Aria 1 noise, 16 vaults peak earlier and lower, because the third iteration adds more noise than signal. Below 60% the room is too weak to teach with, so the game's Room 3 reads from the ideal pool and tells players why.

## Source, license and disclosures

- **Source:** https://github.com/JishyFishy2006/entangled-vaults. The README covers the full design, tests (43 game + 16 quantum) and how to regenerate the pools.
- **License:** MIT for the code.
- **Built during the hackathon window.** The repository starts on Oct 10, 2026, and every build phase is its own commit.
- **Third-party art,** credited in the repo and on screen, used under **CC BY 4.0**:
  - chierit's *Elementals* hero sprites;
  - DragonDePlatino and DawnBringer's *DawnLike* tileset and 8×8 font.

  Everything else (liquids, gems, lenses, lamps, sounds) is drawn or synthesized in code.
- **Libraries:** Qiskit, Qiskit Aer, qiskit-ionq, Phaser 3 and Vite.
- **AI assistance:** built with Claude Code (Anthropic) as a pair programmer, working from our own tech specs and phase plans.
