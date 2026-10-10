import { panel } from './art.js';
import { sfx } from './sfx.js';
import { COLORS, DB, label } from './scenes/style.js';

// A row of buttons driven by either player's left/right keys; Enter or Space picks.
// options: [{ label, action, keep? }]. Centered on (cx, y). `depth` lifts it above overlays.
export class Menu {
  constructor(scene, cx, y, options, { gap = 10, depth = 0 } = {}) {
    Object.assign(this, { scene, options, index: 0 });
    const widths = options.map(o => o.label.length * 8 + 20);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (options.length - 1);
    let x = cx - total / 2;
    this.g = scene.add.graphics().setDepth(depth + 1);
    this.buttons = options.map((o, i) => {
      const b = { x, y: y - 9, w: widths[i], h: 18 };
      panel(scene, b.x, b.y, b.w, b.h, 0.95).setDepth(depth);
      b.text = label(scene, b.x + b.w / 2, y, o.label, 8, COLORS.text).setDepth(depth);
      x += widths[i] + gap;
      return b;
    });
    const kb = scene.input.keyboard;
    for (const k of ['LEFT', 'A']) kb.on(`keydown-${k}`, () => this.move(-1));
    for (const k of ['RIGHT', 'D']) kb.on(`keydown-${k}`, () => this.move(1));
    for (const k of ['ENTER', 'SPACE']) kb.on(`keydown-${k}`, () => this.choose());
    this.draw();
  }

  move(step) {
    if (this.done) return;
    this.index = (this.index + step + this.options.length) % this.options.length;
    sfx.tick(this.scene);
    this.draw();
  }

  choose() {
    if (this.done) return;
    const option = this.options[this.index];
    this.done = !option.keep;      // keep: the option opens an overlay and the menu stays live
    sfx.ready(this.scene);
    option.action();
  }

  draw() {
    this.g.clear();
    this.buttons.forEach((b, i) => {
      const on = i === this.index;
      b.text.setColor(on ? COLORS.gold : COLORS.dim);
      if (on) this.g.lineStyle(2, DB.yellow).strokeRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
    });
  }
}
