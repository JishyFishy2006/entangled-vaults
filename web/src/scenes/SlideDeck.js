import Phaser from 'phaser';
import { keyHint, panel, templeBackground } from '../art.js';
import { COLORS, DB, H, W, hex, label } from './style.js';

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
    const first = W / 2 - (this.slides.length - 1) * 8 - 4;
    this.slides.forEach((_, k) => {
      g.fillStyle(k === this.index ? DB.yellow : DB.iron).fillRect(first + k * 16, 343, 8, 8);
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

  // ---- Circuit diagrams (for the last slide of each card) ----

  wire(g, x1, x2, y, name) {
    g.fillStyle(DB.slate).fillRect(x1, y, x2 - x1, 1);
    if (name) this.text(x1 - 6, y, name, 8, COLORS.dim, 1);
  }

  // A gate box centred on (x, y); text may have a line break.
  gate(g, x, y, w, h, text, color = DB.navy) {
    g.fillStyle(DB.black).fillRect(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2);
    g.fillStyle(color).fillRect(x - w / 2, y - h / 2, w, h);
    g.fillStyle(DB.white, 0.2).fillRect(x - w / 2, y - h / 2, w, 1);
    this.text(x, y, text, 8);
  }

  cnot(g, x, yControl, yTarget) {
    g.fillStyle(DB.white).fillCircle(x, yControl, 3).fillRect(x, Math.min(yControl, yTarget), 1, Math.abs(yTarget - yControl));
    g.lineStyle(1, DB.white).strokeCircle(x, yTarget, 7);
    g.fillStyle(DB.white).fillRect(x - 7, yTarget, 15, 1).fillRect(x, yTarget - 7, 1, 15);
  }

  // Monospace code; anything after '#' is drawn dimmer, as a comment.
  code(x, y, lines) {
    lines.forEach((line, k) => {
      const hash = line.indexOf('#');
      const body = hash < 0 ? line : line.slice(0, hash);
      this.text(x, y + k * 12, body, 8, hex(DB.cyan), 0);
      if (hash >= 0) this.text(x + hash * 8, y + k * 12, line.slice(hash), 8, COLORS.dim, 0);
    });
  }

  title(str, sub) {
    this.text(W / 2, 34, str, 16, COLORS.gold);
    if (sub) this.text(W / 2, 54, sub, 8, COLORS.dim);
  }
}
