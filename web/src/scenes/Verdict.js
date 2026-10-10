import Phaser from 'phaser';
import { brickBlock, gem, heroSprite, keyHint, panel, templeBackground } from '../art.js';
import { POOL_LABELS, hintsFor, progress, recordRun, togglePoolMode } from '../progress.js';
import { PASS_BAR } from '../quantum.js';
import { sfx } from '../sfx.js';
import { COLORS, DB, W, label } from './style.js';

const FLOOR = 240;
const DOOR = { x: W / 2 - 56, y: 64, w: 112, h: FLOOR - 64 };

export class Verdict extends Phaser.Scene {
  constructor() { super('Verdict'); }

  init(data) {
    this.run = data;   // { wins, rounds }
  }

  create() {
    const { wins, rounds } = this.run;
    const { mode, passed, unlocked } = recordRun(progress, wins);
    const pct = (wins / rounds * 100).toFixed(1);

    templeBackground(this, { seed: 9, candles: [[DOOR.x - 40, 100], [DOOR.x + DOOR.w + 40, 100]] });
    brickBlock(this, 0, FLOOR, 40, 8);
    this.cameras.main.fadeIn(300, 20, 12, 28);

    // The great vault: treasure glow behind, a stone door in front.
    const inside = this.add.graphics();
    inside.fillStyle(DB.black).fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
    if (passed) {
      this.add.image(W / 2, FLOOR - 50, 'glow').setTint(DB.yellow).setBlendMode(Phaser.BlendModes.ADD).setScale(3).setAlpha(0.7);
      [[-30, 'red'], [0, 'blue'], [30, 'red'], [-15, 'blue'], [15, 'red']].forEach(([dx, c], i) => gem(this, W / 2 + dx, FLOOR - 20 - (i > 2 ? 18 : 0), 8, c));
    }
    const door = this.add.graphics();
    door.fillStyle(DB.iron).fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
    for (let y = DOOR.y; y < FLOOR; y += 16) {
      for (let x = DOOR.x + ((y / 16) % 2 ? 8 : 0) - 8; x < DOOR.x + DOOR.w; x += 32) {
        door.fillStyle(DB.stone).fillRect(Math.max(DOOR.x, x) + 1, y + 1, Math.min(30, DOOR.x + DOOR.w - x - 1), 14);
        door.fillStyle(DB.slate).fillRect(Math.max(DOOR.x, x) + 1, y + 1, Math.min(30, DOOR.x + DOOR.w - x - 1), 2);
      }
    }
    door.fillStyle(DB.yellow).fillCircle(W / 2, DOOR.y + DOOR.h / 2, 10);
    door.fillStyle(DB.brown).fillCircle(W / 2, DOOR.y + DOOR.h / 2, 7);
    door.setMask(this.make.graphics({}, false).fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h).createGeometryMask());
    brickBlock(this, DOOR.x - 16, DOOR.y - 16, DOOR.w / 16 + 2, 1);
    brickBlock(this, DOOR.x - 16, DOOR.y, 1, DOOR.h / 16);
    brickBlock(this, DOOR.x + DOOR.w, DOOR.y, 1, DOOR.h / 16);

    const fire = heroSprite(this, 'fire', DOOR.x - 60, FLOOR);
    const water = heroSprite(this, 'water', DOOR.x + DOOR.w + 60, FLOOR).setFlipX(true).setOrigin(1 - 63 / 128, 1);

    if (passed) {
      sfx.open(this);
      this.tweens.add({ targets: door, y: -DOOR.h, duration: 1600, ease: 'Cubic.easeIn', delay: 400 });
      this.time.delayedCall(400, () => this.cameras.main.shake(1400, 0.002));
      fire.play('fire-cast');
      water.play('water-cast');
      this.add.particles(W / 2, FLOOR - 30, 'px', {
        speed: { min: 20, max: 70 }, angle: { min: 200, max: 340 }, lifespan: 1200, frequency: 60, delay: 1800,
        tint: [DB.yellow, DB.white, DB.orange], alpha: { start: 1, end: 0 }, blendMode: 'ADD',
      });
    } else {
      sfx.shut(this);
      this.tweens.add({ targets: door, x: { from: 0, to: 3 }, duration: 50, yoyo: true, repeat: 5 });
      fire.play('fire-hit');
      water.play('water-hit');
      fire.once('animationcomplete', () => fire.play('fire-idle'));
      water.once('animationcomplete', () => water.play('water-idle'));
    }

    // Result panel.
    panel(this, 24, 256, 592, 96);
    label(this, W / 2, 272, passed ? 'THE VAULT OPENS!' : 'THE VAULT STAYS SHUT', 16, passed ? COLORS.good : COLORS.bad);
    label(this, W / 2, 292, `${wins} / ${rounds} wins (${pct}%) - ${PASS_BAR} needed`, 8);

    let message;
    if (mode === 'plain' && !passed) {
      message = 'Plain gems hit the 75% wall: no fixed plan wins all 4 sign pairs.\nEntangled gems unlocked! Your dials now turn lenses.';
    } else if (mode === 'plain') {
      message = 'A lucky run! Plain gems average 75% at best, passing 1 run in 17.\nEntangled gems unlocked: now open it every time.';
    } else if (passed) {
      message = 'Your entangled gems beat the 75% limit no classical plan can break.';
    } else {
      message = 'Entangled gems can reach about 85%. Adjust your lenses and try again.';
    }
    label(this, W / 2, 312, message, 8, COLORS.dim);

    const hints = hintsFor(progress);
    if (!passed && !unlocked && hints.length) label(this, W / 2, 30, `Hint: ${hints.at(-1)}`, 8, COLORS.gold);

    // Which pool the entangled gems use next time.
    if (progress.entangled) {
      const poolText = keyHint(this, 48, 336, ['T'], '');
      const showPool = () => poolText.setText(`gems: ${POOL_LABELS[progress.poolMode]}`);
      showPool();
      this.input.keyboard.on('keydown-T', () => { togglePoolMode(progress); showPool(); sfx.tick(this); });
    }

    // An entangled pass goes on to the pitch screen; everything else back to planning.
    const next = passed && mode !== 'plain' ? 'Pitch' : 'PlanningHall';
    keyHint(this, 420, 336, ['SPACE'], next === 'Pitch' ? 'how it works' : 'plan again');
    this.input.keyboard.once('keydown-SPACE', () => {
      this.cameras.main.fadeOut(250, 20, 12, 28);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(next));
    });
  }
}
