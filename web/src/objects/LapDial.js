import { MAX_LAPS } from './SearchHall.js';
import { COLORS, DB, label } from '../scenes/style.js';

// Bronze wall dial counting laps 0..4 along its upper half; the needle swings to each lap.
export class LapDial {
  constructor(scene, x, y) {
    Object.assign(this, { scene, x, y, shown: 0 });
    this.face = scene.add.graphics();
    this.needle = scene.add.graphics();
    const r = 22;
    const f = this.face;
    f.fillStyle(DB.black).fillCircle(x, y, r + 3);
    f.fillStyle(DB.brown).fillCircle(x, y, r + 2);
    f.fillStyle(DB.orange).fillCircle(x, y - 1, r + 1);
    f.fillStyle(DB.navy).fillCircle(x, y, r - 2);
    f.fillStyle(0x24285a).fillCircle(x + 1, y + 1, r - 4);
    for (let k = 0; k <= MAX_LAPS; k++) {
      const a = this.angle(k);
      f.fillStyle(DB.cyan).fillRect(Math.round(x + (r - 5) * Math.cos(a)) - 1, Math.round(y + (r - 5) * Math.sin(a)) - 1, 2, 2);
      label(scene, x + (r + 9) * Math.cos(a), y + (r + 9) * Math.sin(a), String(k), 8, COLORS.dim);
    }
    label(scene, x, y + r + 10, 'LAPS', 8, COLORS.gold);
    label(scene, x, y + r + 20, 'iterations', 8, COLORS.dim);
    this.draw(0);
  }

  angle(k) { return Math.PI + (k / MAX_LAPS) * Math.PI; }   // 0 on the left, 4 on the right

  draw(value) {
    const { x, y } = this;
    const a = this.angle(value);
    this.needle.clear();
    this.needle.lineStyle(3, DB.black).lineBetween(x, y, x + 16 * Math.cos(a), y + 16 * Math.sin(a));
    this.needle.lineStyle(2, DB.yellow).lineBetween(x, y, x + 16 * Math.cos(a), y + 16 * Math.sin(a));
    this.needle.fillStyle(DB.yellow).fillCircle(x, y, 3);
  }

  set(laps) {
    if (laps === this.target) return;
    this.target = laps;
    const state = { v: this.shown };
    this.swing?.stop();
    this.swing = this.scene.tweens.add({
      targets: state, v: laps, duration: 400, ease: 'Back.easeOut',
      onUpdate: () => { this.shown = state.v; this.draw(state.v); },
    });
  }
}
