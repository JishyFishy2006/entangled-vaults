import Phaser from 'phaser';
import { POOL_LABELS, hintsFor, progress, recordRun, togglePoolMode } from '../progress.js';
import { PASS_BAR } from '../quantum.js';
import { sfx } from '../sfx.js';
import { COLORS, W, font } from './style.js';

export class Verdict extends Phaser.Scene {
  constructor() { super('Verdict'); }

  init(data) {
    this.run = data;   // { wins, rounds }
  }

  create() {
    const { wins, rounds } = this.run;
    const { mode, passed, unlocked } = recordRun(progress, wins);
    const pct = (wins / rounds * 100).toFixed(1);

    // Placeholder vault door: slides up when it opens.
    const door = this.add.rectangle(W / 2, 150, 200, 180, passed ? 0x8d6e63 : 0x5d4037).setStrokeStyle(4, COLORS.select);
    if (passed) this.tweens.add({ targets: door, y: -100, duration: 1200, ease: 'Cubic.easeIn', delay: 300 });
    (passed ? sfx.open : sfx.shut)(this);

    this.add.text(W / 2, 285, passed ? 'VAULT OPEN' : 'The vault stays shut', font(38, passed ? '#66bb6a' : '#ef5350')).setOrigin(0.5);
    this.add.text(W / 2, 330, `${wins} / ${rounds} wins (${pct}%)  ·  ${PASS_BAR} needed`, font(20)).setOrigin(0.5);

    let message;
    if (mode === 'plain' && !passed) {
      message = 'Plain gems hit the 75% wall: no fixed plan can win more than 3 of the 4 sign pairs.\n'
        + 'Entangled gems unlocked! Your dials now turn lenses instead of picking colors.';
    } else if (mode === 'plain') {
      message = 'A lucky run: plain gems average 75% at best, and pass about 1 run in 17.\n'
        + 'Entangled gems unlocked: try to open the vault every time.';
    } else if (passed) {
      message = 'Your entangled gems beat the 75% limit no classical plan can break.';
    } else {
      message = 'Entangled gems can reach about 85%. Adjust your lenses and try again.';
    }
    this.add.text(W / 2, 395, message, { ...font(17, COLORS.dim), align: 'center' }).setOrigin(0.5);

    const hints = hintsFor(progress);
    if (!passed && !unlocked && hints.length) {
      this.add.text(W / 2, 445, `Hint: ${hints.join('  ')}`, font(16, '#ffd54f')).setOrigin(0.5);
    }

    // Choose which pool the entangled gems draw from next time.
    if (progress.entangled) {
      const poolText = this.add.text(W / 2, 480, '', font(15, COLORS.dim)).setOrigin(0.5);
      const showPool = () => poolText.setText(`Entangled gems: ${POOL_LABELS[progress.poolMode]}  ·  press T to switch`);
      showPool();
      this.input.keyboard.on('keydown-T', () => { togglePoolMode(progress); showPool(); });
    }

    // An entangled pass goes on to the pitch screen; everything else back to planning.
    const next = passed && mode !== 'plain' ? 'Pitch' : 'PlanningHall';
    this.add.text(W / 2, 512, next === 'Pitch' ? 'Press SPACE to see how it works' : 'Press SPACE to return to the Planning Hall', font(16)).setOrigin(0.5);
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start(next));
  }
}
