import { markCleared } from '../clears.js';
import { Menu } from '../menu.js';
import { ROOMS } from '../objects/rooms.js';
import { groverPoolMode, groverShare } from '../quantum.js';
import { panel } from '../art.js';
import { COLORS, DB, H, W, label } from './style.js';
import { TestHall } from './TestHall.js';

// Level 2: rooms 1 -> 2 -> 3, then the reveal card. Built on the gray-box hall
// (same objects and rules) without its debug keys.
const INTRO = {
  1: 'Fireboy: pull the lever. Watergirl: swim the loop. Then read on the dais.',
  2: 'Eight vaults. Watch the lamps as you swim.',
  3: 'Sixteen vaults, and the lamps are dark.',
};

const REVEAL = 'You ran Grover\'s search. The fountain flipped the key\'s phase, and the pool turned that flip into brightness. Each lap rotates the odds toward the key, but past the peak it rotates away again. The laps you need grow like the square root of the number of vaults, not like the number of vaults.';

export class HallOfEchoes extends TestHall {
  constructor() { super('HallOfEchoes'); }

  create() {
    super.create();
    this.cameras.main.fadeIn(300, 20, 12, 28);
    this.say(INTRO[this.room.id], COLORS.gold);
  }

  onCleared() {
    for (const h of Object.values(this.heroes)) h.frozen = true;
    const next = ROOMS.find(r => r.id === this.room.id + 1);
    if (!next) {
      this.say('The last key!', COLORS.good);
      this.time.delayedCall(1200, () => this.reveal());
      return;
    }
    this.say(`The key! Room ${this.room.id} cleared. On to room ${next.id}...`, COLORS.good);
    this.time.delayedCall(1800, () => {
      this.cameras.main.fadeOut(300, 20, 12, 28);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ room: next.id }));
    });
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
    label(this, W / 2, 226, lines.join(' '), 8, COLORS.dim).setWordWrapWidth(W - 104).setLineSpacing(6).setDepth(d);

    new Menu(this, W / 2, 296, [
      { label: 'Play again', action: () => this.leave('HallOfEchoes', { room: 1 }) },
      { label: 'Level select', action: () => this.leave('LevelSelect', { level: 2 }) },
    ], { depth: d + 1 });
  }

  leave(scene, data) {
    this.cameras.main.fadeOut(300, 20, 12, 28);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene, data));
  }
}
