import Phaser from 'phaser';
import { brickBlock, gem, heroSprite, keyHint, panel, templeBackground } from '../art.js';
import { POOL_LABELS, hintsFor, progress, recordRun, togglePoolMode } from '../progress.js';
import { PASS_BAR } from '../quantum.js';
import { markCleared } from '../clears.js';
import { Menu } from '../menu.js';
import { sfx } from '../sfx.js';
import { isTeaching, recap, teachInit } from '../teach.js';
import { COLORS, DB, W, label } from './style.js';

const FLOOR = 240;
const DOOR = { x: W / 2 - 56, y: 64, w: 112, h: FLOOR - 64 };
const GUESSES = ['UNDER 75%', 'ABOUT 75%', 'OVER 75%'];
const bucket = rate => (rate < 0.73 ? 0 : rate <= 0.77 ? 1 : 2);   // matches the prediction's answers

export class Verdict extends Phaser.Scene {
  constructor() { super('Verdict'); }

  init(data) {
    this.run = data;   // { wins, rounds, pairs }
  }

  create() {
    teachInit(this);
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

    if (this.run.pairs) this.pairPanel(this.run.pairs);

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
      this.input.keyboard.on('keydown-T', () => { if (isTeaching(this)) return; togglePoolMode(progress); showPool(); sfx.tick(this); });
    }

    // Once the door has moved: the run in real terms.
    this.time.delayedCall(passed ? 2400 : 1200, () => recap(this, this.recapContent(mode, passed, wins / rounds)));

    // An entangled pass clears Level 1 and offers the next level; otherwise plan again.
    const go = (scene, data) => {
      this.cameras.main.fadeOut(250, 20, 12, 28);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene, data));
    };
    if (passed && mode !== 'plain') {
      markCleared(1);
      new Menu(this, 432, 336, [
        { label: 'Next level', action: () => go('HallOfEchoes', { room: 1 }) },
        { label: 'How it works', action: () => go('Pitch') },
        { label: 'Level select', action: () => go('LevelSelect', { level: 1 }) },
      ]);
    } else {
      new Menu(this, 432, 336, [
        { label: 'Plan again', action: () => go('PlanningHall') },
        { label: 'Level select', action: () => go('LevelSelect', { level: 1 }) },
      ]);
    }
  }

  recapContent(mode, passed, rate) {
    const plain = mode === 'plain';
    const won = `You won ${Math.round(rate * 100)}%.`;
    const lines = plain
      ? ['You played a CLASSICAL strategy: each color fixed in advance.',
        `${won} No classical plan beats 75% on average:`, "that limit is Bell's inequality."]
      : ['You played a QUANTUM strategy: an entangled Bell pair,', 'measured at your lens angles.',
        `${won} Classical limit: 75%. Quantum limit: 85.4%.`];
    if (plain) lines.push('Next: entangled gems. Your dials become measurement angles.');
    else if (passed) lines.push('Beating 75% means the colors were not fixed in advance:', 'a BELL VIOLATION (the 2022 Nobel Prize in Physics).');
    else if (rate > 0.75) lines.push('Past the classical limit, but short of the 80% needed.');
    else lines.push('No better than classical yet:', 'the lens angles decide how often the gems agree.');
    const guess = progress.prediction;
    if (guess !== null) {
      const right = guess === bucket(rate);
      lines.push(`You predicted ${GUESSES[guess]}: ${right ? 'right!' : `it was ${GUESSES[bucket(rate)]}.`}`);
    }
    return { title: 'RECAP', sub: plain ? 'plain gems' : 'entangled gems', lines };
  }

  // How this run went for each sign pair, so a team can see where its plan fails.
  pairPanel(pairs) {
    const x = 16;
    const y = 52;
    const rowH = 18;
    panel(this, x, y, 168, 136);
    label(this, x + 84, y + 14, 'BY SIGN PAIR', 8, COLORS.gold);
    label(this, x + 84, y + 26, '(Fire, Water)', 8, COLORS.dim);
    const g = this.add.graphics();
    let weakest = null;
    Object.entries(pairs).forEach(([pair, p], k) => {
      const rate = p.rounds ? p.won / p.rounds : 0;
      const good = rate >= 0.75;
      const ry = y + 44 + k * rowH;
      label(this, x + 10, ry, `${pair[0]},${pair[1]}`, 8, COLORS.text, 0, 0.5);
      label(this, x + 42, ry, p.needSame ? 'SAME' : 'DIFF', 8, p.needSame ? COLORS.good : COLORS.gold, 0, 0.5);
      g.fillStyle(DB.black).fillRect(x + 80, ry - 4, 42, 8);
      g.fillStyle(good ? DB.green : DB.red).fillRect(x + 81, ry - 3, Math.round(40 * rate), 6);
      label(this, x + 158, ry, `${Math.round(rate * 100)}%`, 8, good ? COLORS.text : COLORS.bad, 1, 0.5);
      if (!weakest || rate < weakest.rate) weakest = { pair, rate, needSame: p.needSame };
    });
    if (weakest && weakest.rate < 0.75) {
      label(this, x + 84, y + 124, `Weakest: ${weakest.pair[0]},${weakest.pair[1]} (${weakest.needSame ? 'SAME' : 'DIFF'})`, 8, COLORS.bad);
    } else {
      label(this, x + 84, y + 124, 'Every pair holds up!', 8, COLORS.good);
    }
  }
}
