// The Hall of Echoes rooms, in play order. Everything else is configured from these.
// lampsOn: false means still lamps (evenly lit, never changing) and prying allowed.
export const ROOMS = [
  { id: 1, vaults: 4, lampsOn: true, bestLaps: 1 },
  { id: 2, vaults: 8, lampsOn: true, bestLaps: 2 },
  { id: 3, vaults: 16, lampsOn: false, bestLaps: 3, mural: true },
];

// Room 3 shows the mural after this many wrong vaults opened from a read.
export const MURAL_AFTER_FAILED_READS = 2;
