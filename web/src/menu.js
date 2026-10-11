import { panel } from './art.js';
import { sfx } from './sfx.js';
import { COLORS, DB, label } from './scenes/style.js';

// A row of buttons driven by either player's left/right keys; Enter or Space picks.
// options: [{ label, action, keep? }]. Centered on (cx, y). `depth` lifts it above overlays.
// A menu ignores keys while a teaching card is open, unless it is that card's own (`modal`).
export class Menu {
  constructor(scene, cx, y, options, { gap = 10, depth = 0, modal = false } = {}) {
    Object.assign(this, { scene, options, modal, index: 0, objects: [] });
    const widths = options.map(o => o.label.length * 8 + 20);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (options.length - 1);
    let x = cx - total / 2;
    this.g = scene.add.graphics().setDepth(depth + 1);
    this.objects.push(this.g);
    this.buttons = options.map((o, i) => {
      const b = { x, y: y - 9, w: widths[i], h: 18 };
      this.objects.push(panel(scene, b.x, b.y, b.w, b.h, 0.95).setDepth(depth));
      b.text = label(scene, b.x + b.w / 2, y, o.label, 8, COLORS.text).setDepth(depth);
      this.objects.push(b.text);
      x += widths[i] + gap;
      return b;
    });
    const kb = scene.input.keyboard;
    this.handlers = [];
    const on = (key, fn) => { kb.on(`keydown-${key}`, fn); this.handlers.push([`keydown-${key}`, fn]); };
    for (const k of ['LEFT', 'A']) on(k, () => this.move(-1));
    for (const k of ['RIGHT', 'D']) on(k, () => this.move(1));
    for (const k of ['ENTER', 'SPACE']) on(k, () => this.choose());
    this.draw();
  }

  blocked() {
    return this.done || (this.scene.teaching && !this.modal);
  }

  move(step) {
    if (this.blocked()) return;
    this.index = (this.index + step + this.options.length) % this.options.length;
    sfx.tick(this.scene);
    this.draw();
  }

  choose() {
    if (this.blocked()) return;
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

  destroy() {
    this.done = true;
    for (const [event, fn] of this.handlers) this.scene.input.keyboard.off(event, fn);
    for (const o of this.objects) o.destroy();
  }
}
