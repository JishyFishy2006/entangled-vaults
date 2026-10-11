import { markCleared } from '../clears.js';
import { CONCEPTS } from '../concepts.js';
import { Menu } from '../menu.js';
import { ROOMS } from '../objects/rooms.js';
import { bestLaps, groverPoolMode, groverShare, lampLevels } from '../quantum.js';
import { keyHint, panel } from '../art.js';
import { ask, conceptCard, isTeaching, recap, tag, teachInit } from '../teach.js';
import { COLORS, DB, H, W, label } from './style.js';
import { TestHall } from './TestHall.js';

// Level 2: rooms 1 -> 2 -> 3, then the reveal card. Built on the gray-box hall
// (same objects and rules) without its debug keys. On top of it, the teaching:
// a concept card the first time each piece is used, the real term over it every
// time, a prediction before every measurement, and a recap after every room.
const INTRO = {
  1: 'Try a read first: Fireboy, pull the lever, then read on the dais.',
  2: 'Eight vaults. Read with no laps, then try more and more laps.',
  3: 'Sixteen vaults, and these lamps never change. How many laps?',
};

const REVEAL = 'You ran Grover\'s search. The lever (Hadamard gates) made a superposition. The fountain (the oracle) flipped the key\'s phase, and the mirror (the diffuser) turned that flip into probability. Each iteration rotates the state toward the key, but past the peak it rotates away again. The iterations you need grow like the square root of the number of vaults, not like the number of vaults.';

// A read's odds, sorted into the three answers players can predict.
const GUESSES = ['LOW', 'MEDIUM', 'HIGH'];
const bucket = chance => (chance < 0.35 ? 0 : chance <= 0.65 ? 1 : 2);
const pct = p => `${Math.round(p * 100)}%`;
const lapsText = c => `${c} lap${c === 1 ? '' : 's'}`;

export class HallOfEchoes extends TestHall {
  constructor() { super('HallOfEchoes'); }

  create() {
    teachInit(this);
    this.stats = { reads: 0, guesses: 0, right: 0, lapsGuess: null };
    this.lastAction = null;
    super.create();
    this.cameras.main.fadeIn(300, 20, 12, 28);
    this.say(INTRO[this.room.id], COLORS.gold);
    keyHint(this, 556, H - 7, ['P'], 'physics').setDepth(30);
    for (const c of this.children.list) if (c.type === 'Container' && c.y === H - 7) c.setDepth(30);   // its key cap
    this.input.keyboard.on('keydown-P', () => this.physicsCard());
    // Keys released while the card was up would otherwise stay held.
    this.events.on('resume', () => this.input.keyboard.resetKeys());

    if (this.room.id === 1) conceptCard(this, 'search', CONCEPTS.search);
    if (!this.room.lampsOn) {
      conceptCard(this, 'hiddenAmplitudes', CONCEPTS.hiddenAmplitudes);
      ask(this, {
        title: 'PREDICT',
        sub: `${this.room.vaults} vaults, lamps hidden`,
        lines: ['How many laps (Grover iterations) give the best chance here?'],
        options: ['1', '2', '3', '4'],
      }, i => {
        this.stats.lapsGuess = i + 1;
        this.say(`You predicted ${lapsText(i + 1)}. Lever, then run them and read.`, COLORS.gold);
      });
    }
  }

  // The physics card, over the paused room; Esc comes straight back.
  physicsCard() {
    if (this.scene.isPaused() || isTeaching(this)) return;
    this.scene.launch('HallPitch', { from: this.scene.key });
    this.scene.pause();
  }

  // Before every measurement: how likely is it to find the key?
  beforeRead(read) {
    const chance = this.chanceNow();
    const laps = this.hall.laps;
    ask(this, {
      title: 'PREDICT',
      sub: `measuring after ${lapsText(laps)}`,
      lines: [
        this.room.lampsOn ? 'Look at the lamps.' : 'The lamps are hidden: think about the laps.',
        'How likely is this measurement to find the key?',
        'LOW: under 35%   MEDIUM: 35-65%   HIGH: over 65%',
      ],
      options: GUESSES,
    }, i => {
      this.guess = { i, chance };
      read();
    });
  }

  onHall(event, data) {
    // A pry is a classical search: explain it once, before the room's recap.
    const pried = (event === 'lava' || event === 'cleared') && this.lastAction === 'pry';
    if (pried) conceptCard(this, 'classical', CONCEPTS.classical);
    if (event === 'read') this.stats.reads++;
    super.onHall(event, data);
    this.lesson(event, data);
  }

  // The real term over each piece every time it is used; its card the first time.
  lesson(event, data) {
    if (event === 'spread') {
      tag(this, 88, 284, 'HADAMARD: SUPERPOSITION');
      conceptCard(this, 'superposition', CONCEPTS.superposition);
    }
    if (event === 'fountain') {
      tag(this, 376, 260, data ? 'ORACLE: PHASE FLIPPED' : 'ORACLE AGAIN: FLIP UNDONE');
      conceptCard(this, 'oracle', CONCEPTS.oracle);
    }
    if (event === 'lap') {
      tag(this, 410, 104, `DIFFUSER: ITERATION ${data}`);
      conceptCard(this, 'diffuser', CONCEPTS.diffuser);
    }
    if (event === 'unlap') {
      tag(this, 410, 104, 'DIFFUSER: ITERATION UNDONE');
      conceptCard(this, 'uncompute', CONCEPTS.uncompute);
    }
    if (event === 'idle') tag(this, 410, 104, 'DIFFUSER: NOTHING TO AMPLIFY', COLORS.dim);
    if (event === 'read') tag(this, 144, 284, 'MEASUREMENT');
  }

  // After the read lands: how the prediction did, then (lit rooms) coaching: start with a
  // blind read, then add laps one at a time until the read gets worse again.
  afterReveal(vault) {
    if (this.guess) {
      const { i, chance } = this.guess;
      const right = bucket(chance) === i;
      this.stats.guesses++;
      if (right) this.stats.right++;
      tag(this, 480, 128, `Predicted ${GUESSES[i]}: odds were ${pct(chance)}. ${right ? 'Right!' : 'Not quite.'}`, right ? COLORS.good : COLORS.text, 4000);
      this.guess = null;
    }
    conceptCard(this, 'measurement', CONCEPTS.measurement);
    if (!this.room.lampsOn) { super.afterReveal(vault); return; }
    const n = this.room.vaults;
    const k = this.hall.lastRead.laps;
    const best = bestLaps(n);
    const chance = laps => lampLevels(n, laps, 0)[0];
    const sure = pct(chance(k));
    let tip;
    if (k === 0) tip = `A blind guess (${sure}). Lever, then try ${lapsText(1)}.`;
    else if (k < best) tip = `Better: ${sure} sure. Lever, then try ${lapsText(k + 1)}.`;
    else if (k === best) tip = `The peak: ${sure} sure. Open it, or dare ${lapsText(k + 1)}?`;
    else if (chance(k) >= chance(best) - 0.01) tip = `Full circle: ${sure} again. ${lapsText(best)} was enough.`;
    else tip = `Too far: only ${sure} now. ${lapsText(best)} was best.`;
    if (k > best) conceptCard(this, 'overRotation', CONCEPTS.overRotation);
    this.say(`Vault ${vault + 1} unseals. ${tip}`, COLORS.gold);
  }

  onCleared() {
    for (const h of Object.values(this.heroes)) h.frozen = true;
    const next = ROOMS.find(r => r.id === this.room.id + 1);
    this.say(next ? `The key! Room ${this.room.id} cleared.` : 'The last key!', COLORS.good);
    this.time.delayedCall(900, () => recap(this, this.recapContent(), () => {
      if (!next) { this.reveal(); return; }
      this.cameras.main.fadeOut(300, 20, 12, 28);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ room: next.id }));
    }));
  }

  // The room in real terms, from what the players actually did.
  recapContent() {
    const n = this.room.vaults;
    const best = bestLaps(n);
    const chance = laps => lampLevels(n, laps, 0)[0];
    const { reads, guesses, right, lapsGuess } = this.stats;
    const read = this.lastAction === 'pry' ? null : this.hall.lastRead;
    const iterations = c => `${c} GROVER ITERATION${c === 1 ? '' : 'S'}`;
    const lines = [`SUPERPOSITION: the lever (Hadamard) gave each vault ${pct(1 / n)}.`];
    if (read) {
      lines.push(`You ran ${iterations(read.laps)} (oracle + diffuser),`, `so the key had ${pct(chance(read.laps))} when you MEASURED.`);
    } else {
      lines.push('CLASSICAL SEARCH: you pried the key out, one vault at a time.');
    }
    lines.push(`Best here: ${lapsText(best)} -> ${pct(chance(best))}. More laps OVER-ROTATE.`);
    if (lapsGuess !== null) {
      lines.push(`You predicted ${lapsText(lapsGuess)}${lapsGuess === best ? ': right!' : `; the best is ${best}.`}`, `Best laps grow like (pi/4) x sqrt(N): ${(Math.PI / 4 * Math.sqrt(n)).toFixed(1)} for ${n}.`);
    }
    lines.push(`Classical search: ${(n + 1) / 2} tries on average.`, `Grover: ${lapsText(best)}, then 1 measurement.`);
    if (reads) lines.push(`Measurements: ${reads}.${guesses ? ` Predictions right: ${right} of ${guesses}.` : ''}`);
    return { title: `ROOM ${this.room.id} RECAP`, sub: `Grover's search over ${n} vaults`, lines };
  }

  reveal() {
    markCleared(2);
    this.add.rectangle(W / 2, H / 2, W, H, DB.black, 0.8).setDepth(20);
    const d = 21;
    panel(this, 32, 28, W - 64, H - 56).setDepth(d);
    label(this, W / 2, 48, 'THE HALL OF ECHOES', 16, COLORS.gold).setDepth(d);
    label(this, W / 2, 112, REVEAL, 8, COLORS.text).setWordWrapWidth(W - 104).setLineSpacing(6).setDepth(d);

    // The lamps were the simulator's view; reads came from measured pools. Room 3 on
    // real-hardware noise is too weak to play, so the game used the ideal pool there.
    const pools = { ideal: this.cache.json.get('pool-grover-ideal'), 'ionq-aria-1': this.cache.json.get('pool-grover-ionq-aria-1') };
    const lines = ['The lamps showed a simulator\'s odds; a real machine only gives you the read.'];
    if (pools['ionq-aria-1']) {
      const noisy = Math.round(groverShare(pools['ionq-aria-1'], 16, 3) * 100);
      const ideal = Math.round(groverShare(pools.ideal, 16, 3) * 100);
      const fellBack = groverPoolMode('ionq-aria-1', 16, pools) === 'ideal';
      lines.push(`On IonQ Aria 1 noise, 16 vaults after 3 laps read right ${noisy}% of the time (${ideal}% ideal)${fellBack ? ',' : '.'}`);
      if (fellBack) lines.push('so Room 3 always used the ideal simulator.');
    }
    label(this, W / 2, 232, lines.join(' '), 8, COLORS.dim).setWordWrapWidth(W - 104).setLineSpacing(6).setDepth(d);

    new Menu(this, W / 2, 300, [
      { label: 'Play again', action: () => this.leave('HallOfEchoes', { room: 1 }) },
      { label: 'How it works', action: () => this.physicsCard(), keep: true },
      { label: 'Level select', action: () => this.leave('LevelSelect', { level: 2 }) },
    ], { depth: d + 1 });
  }

  leave(scene, data) {
    this.cameras.main.fadeOut(300, 20, 12, 28);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene, data));
  }
}
