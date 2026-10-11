// The concept cards: each names the real term, then says what it means in the game.
// Shown the first time the thing is used (see teach.js). ASCII only (pixel font).
export const CONCEPTS = {
  // Level 1: entanglement and the CHSH game.
  classicalPlan: {
    title: 'A CLASSICAL STRATEGY',
    sub: 'the plain gems',
    lines: [
      'Each round, each vault shows a random sign, A or B: the INPUTS.',
      'You win if the gems show the SAME color, unless both signs are B:',
      'then they must DIFFER. You can\'t talk once the round starts.',
      'Plain gems are classical: each color is fixed in advance.',
      'Can you find a plan that wins every round?',
    ],
  },
  entanglement: {
    title: 'ENTANGLEMENT',
    sub: 'the entangled gems',
    lines: [
      'The gems are now a BELL PAIR: two qubits sharing one state.',
      'Neither has a color until it is MEASURED. Read at the same angle,',
      'they always agree. Your lens sets each gem\'s MEASUREMENT ANGLE:',
      'lenses d apart agree with chance cos^2(d/2).',
      'No message passes, yet they beat 75%.',
    ],
  },
  // Shown after the first (classical) attempt, once players have hit the wall themselves.
  chsh: {
    title: 'THE CHSH GAME',
    sub: 'what you just played: a Bell test',
    lines: [
      'Two players, random inputs (the signs), no talking: this is the',
      'CHSH game, the Bell test behind the 2022 Nobel Prize in Physics.',
      'Any classical plan loses at least one sign pair in four, so it',
      'tops out at 75%. Entangled qubits can reach 85.4%',
      '(Tsirelson\'s bound). Next: try it with entangled gems.',
    ],
  },

  // Level 2: Grover's search.
  search: {
    title: 'THE SEARCH PROBLEM',
    sub: 'one key, many vaults',
    lines: [
      'One vault holds the key; a wrong one floods the room with lava.',
      'Checking vaults one by one (CLASSICAL SEARCH) takes about N/2',
      'tries. GROVER\'S ALGORITHM uses a quantum state over all the',
      'vaults at once: about (pi/4) x sqrt(N) steps.',
    ],
  },
  superposition: {
    title: 'SUPERPOSITION',
    sub: 'the lever = Hadamard gates (H)',
    lines: [
      'The lever puts the search in an equal SUPERPOSITION: every vault',
      'at once, each with the same AMPLITUDE. The lamps show the',
      'PROBABILITIES (amplitude squared): 1/N each.',
    ],
  },
  oracle: {
    title: 'THE ORACLE',
    sub: 'the fountain',
    lines: [
      'The ORACLE knows the key. It flips the SIGN (the phase) of the',
      'key\'s amplitude: + becomes -. Probability is amplitude squared,',
      'so the lamps don\'t change. The mark is invisible.',
      'Using the oracle twice flips it back: no effect.',
    ],
  },
  diffuser: {
    title: 'THE DIFFUSER',
    sub: 'the mirror',
    lines: [
      'The DIFFUSER reflects every amplitude about their AVERAGE.',
      'The key\'s flipped amplitude sits far below the average, so it',
      'lands far above it: its lamp brightens, the others fade.',
      'ORACLE + DIFFUSER = one GROVER ITERATION (one lap).',
    ],
  },
  uncompute: {
    title: 'RUNNING IT BACKWARDS',
    sub: 'the mirror without a mark',
    lines: [
      'Quantum gates are reversible. Without the oracle\'s mark, the',
      'diffuser undoes the last iteration instead of adding one.',
      'Mirror twice in a row: back where you started.',
    ],
  },
  measurement: {
    title: 'MEASUREMENT',
    sub: 'the dais read',
    lines: [
      'MEASURING picks ONE vault at random, weighted by the',
      'probabilities. The superposition COLLAPSES: the other',
      'possibilities are gone: search again from the lever.',
    ],
  },
  overRotation: {
    title: 'OVER-ROTATION',
    sub: 'too many laps',
    lines: [
      'Each iteration ROTATES the state toward the key by the same',
      'angle. Past the peak it keeps turning and rotates AWAY again,',
      'so the key\'s probability falls. More laps are not always better:',
      'you have to stop at the right number.',
    ],
  },
  hiddenAmplitudes: {
    title: 'REAL HARDWARE',
    sub: 'still lamps',
    lines: [
      'A real quantum computer never shows its amplitudes: you can',
      'only MEASURE. These lamps stay even whatever you do.',
      'Rooms 1 and 2 had peaks at 1 lap (4 vaults) and 2 laps',
      '(8 vaults). Use the pattern to choose your laps here.',
    ],
  },
  classical: {
    title: 'CLASSICAL SEARCH',
    sub: 'prying vaults open',
    lines: [
      'Prying checks ONE vault at a time, like a classical computer.',
      'With 16 vaults that takes 8.5 tries on average. Grover needs',
      '3 iterations and one measurement, and the gap grows with N:',
      'N/2 classical steps vs about sqrt(N).',
    ],
  },
};
