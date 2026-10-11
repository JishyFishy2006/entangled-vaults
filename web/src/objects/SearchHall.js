// The search routine for one room, as a small state machine with no Phaser in it:
//   sealed -> spread (lever) -> lapping (each lap) -> read (dais) -> opened (key found)
// A wrong vault floods the room: back to sealed with a new random key.
// Lamps come from lampLevels (the formula); reads come from the pool via groverRead.
import { groverRead, lampLevels } from '../quantum.js';

export const MAX_LAPS = 4;

export class SearchHall {
  // vaults: 4, 8 or 16. lampsOn: lit rooms show brightness and forbid prying.
  // pool: a Grover pool file object. rng: for the key (tests pass their own).
  constructor({ vaults, lampsOn = true, pool, rng = Math.random }) {
    Object.assign(this, { vaults, lampsOn, pool, rng });
    this.failedReads = 0;    // wrong vaults opened after a read (Room 3's mural hint)
    this.onChange = () => {};
    this.reset();
  }

  reset() {
    this.state = 'sealed';
    this.laps = 0;
    this.unsealed = null;
    this.lastRead = null;
    this.key = Math.floor(this.rng() * this.vaults);
  }

  get searching() { return this.state === 'spread' || this.state === 'lapping'; }
  get gateClosed() { return this.laps >= MAX_LAPS; }
  get canPry() { return !this.lampsOn && this.state !== 'opened'; }

  emit(event, data) { this.onChange(event, data); }

  // Fireboy pulls the lever: the search starts (or restarts) with 0 laps.
  pullLever() {
    if (this.state === 'opened') return false;
    this.state = 'spread';
    this.laps = 0;
    this.unsealed = null;
    this.emit('spread');
    return true;
  }

  // Watergirl finishes a loop. Only counts during a search, up to the cap.
  lap() {
    if (!this.searching || this.laps >= MAX_LAPS) return false;
    this.laps++;
    this.state = 'lapping';
    this.emit('lap', this.laps);
    return true;
  }

  // Fireboy reads from the dais, with however many laps are done so far.
  read() {
    if (!this.searching) return null;
    const vault = groverRead(this.pool, this.vaults, this.laps, this.key);
    this.unsealed = vault;
    this.lastRead = { vault, laps: this.laps };
    this.state = 'read';
    this.emit('read', vault);
    return vault;
  }

  // Either hero opens the unsealed vault. Returns 'key', 'lava' or 'sealed' (not openable).
  open(vault) {
    if (this.state !== 'read' || vault !== this.unsealed) return 'sealed';
    if (vault !== this.key) this.failedReads++;    // counted before 'lava' is announced
    return this.resolve(vault);
  }

  // Fireboy forces a sealed vault: only where the lamps are dark. Returns 'key', 'lava' or 'denied'.
  pry(vault) {
    if (!this.canPry) return 'denied';
    return this.resolve(vault);
  }

  resolve(vault) {
    if (vault === this.key) {
      this.state = 'opened';
      this.emit('cleared', vault);
      return 'key';
    }
    const wrong = vault;
    this.reset();
    this.emit('lava', wrong);
    return 'lava';
  }

  // Chance per vault, for the lamps. Dark rooms show nothing. Before the lever the
  // odds are even (the formula at 0 laps). After a read the search is spent: the
  // state has collapsed onto the vault that was read, so only its lamp stays lit.
  lamps() {
    if (!this.lampsOn) return new Array(this.vaults).fill(0);
    if (this.state === 'read' || (this.state === 'opened' && this.unsealed !== null)) {
      return Array.from({ length: this.vaults }, (_, v) => (v === this.unsealed ? 1 : 0));
    }
    return lampLevels(this.vaults, this.state === 'sealed' ? 0 : this.laps, this.key);
  }
}
