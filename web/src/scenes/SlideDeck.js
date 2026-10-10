import Phaser from 'phaser';
import { keyHint, panel, templeBackground } from '../art.js';
import { COLORS, DB, H, W, label } from './style.js';

// A ~60 s physics card: slides that auto-advance every 15 s, with left/right/space to
// move and Esc to leave. Launched over a paused scene (data.from), it resumes that scene
// on exit; otherwise it starts data.exit (default: the Level select).
export const SLIDE_MS = 15000;
// The epsilon rounds exact halves up (0.8465 -> 84.7%) despite float error, matching check_pool.py.
export const pct = (x, d = 1) => `${(x * 100 + 1e-9).toFixed(d)}%`;

export class SlideDeck extends Phaser.Scene {
  init(data) {
    this.from = data?.from ?? null;
    this.exit = data?.exit ?? { scene: 'LevelSelect' };
  }

  startDeck(slides, seed) {
    this.slides = slides;
    templeBackground(this, { seed, candles: [[24, 60], [616, 60]] });
    panel(this, 16, 12, 608, 320, 0.9);
    this.layer = this.add.container();
    this.progress = this.add.graphics();
    keyHint(this, 26, 346, ['left', 'right'], 'slides');
    keyHint(this, 520, 346, ['ESC'], 'back');
    this.cameras.main.fadeIn(250, 20, 12, 28);

    this.input.keyboard.on('keydown-RIGHT', () => this.show(this.index + 1));
    this.input.keyboard.on('keydown-SPACE', () => this.show(this.index + 1));
    this.input.keyboard.on('keydown-LEFT', () => this.show(Math.max(0, this.index - 1)));
    this.input.keyboard.on('keydown-ESC', () => this.close());
    this.show(0);
  }

  close() {
    if (this.from) {
      this.scene.resume(this.from);
      this.scene.stop();
    } else {
      this.scene.start(this.exit.scene, this.exit.data);
    }
  }

  show(i) {
    if (i >= this.slides.length) { this.close(); return; }
    this.index = i;
    this.layer.removeAll(true);
    this.slides[i].call(this);
    this.timer?.remove();
    this.slideStart = this.time.now;
    this.timer = this.time.delayedCall(SLIDE_MS, () => this.show(this.index + 1));
  }

  update() {
    const g = this.progress.clear();
    this.slides.forEach((_, k) => {
      g.fillStyle(k === this.index ? DB.yellow : DB.iron).fillRect(W / 2 - 28 + k * 16, 343, 8, 8);
    });
    const t = Phaser.Math.Clamp((this.time.now - this.slideStart) / SLIDE_MS, 0, 1);
    g.fillStyle(DB.iron).fillRect(0, H - 3, W, 3).fillStyle(DB.yellow).fillRect(0, H - 3, Math.round(W * t), 3);
  }

  // Helpers that add to the current slide.
  text(x, y, str, size = 8, color = COLORS.text, ox = 0.5) {
    const t = label(this, x, y, str, size, color, ox, 0.5);
    this.layer.add(t);
    return t;
  }

  graphics() {
    const g = this.add.graphics();
    this.layer.add(g);
    return g;
  }

  title(str, sub) {
    this.text(W / 2, 34, str, 16, COLORS.gold);
    if (sub) this.text(W / 2, 54, sub, 8, COLORS.dim);
  }
}
