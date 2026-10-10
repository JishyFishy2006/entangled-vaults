# Entangled Vaults

A two-player co-op platformer in the spirit of Fireboy and Watergirl, where the heroes share an entangled pair of gems.
Level 1, *The Twin Vaults*, is the CHSH game: the vault opens only if the team wins at least 80% of 200 rounds of a game
no classical strategy can win more than 75% of the time. An entangled Bell pair reaches about 85.4%.

Play it: `cd web && npm install && npm run dev`. Fireboy uses WASD (Q/E turn a lens, R ready),
Watergirl uses the arrow keys (, and . turn a lens, Enter ready).

- `PLAN.md` — phased build plan
- `TECH_SPEC.md` — Level 1 tech spec
- `PLAN-hall-of-echoes.md`, `TECH_SPEC-hall-of-echoes.md` — Level 2 (Grover's search) plan and spec
- `quantum/` — Qiskit circuit and shot-pool generation (Python, uv)
- `web/` — the game (Vite, Phaser 3)
- `tools/build_assets.py` — rebuilds `web/public/assets/` from the art packs
- `CREDITS.md` — art credits and licenses
