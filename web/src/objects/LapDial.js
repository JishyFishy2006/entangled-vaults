import { MAX_LAPS } from './SearchHall.js';
import { COLORS, DB, label } from '../scenes/style.js';

// Wall dial counting laps 0..4.
export class LapDial {
  constructor(scene, x, y) {
    Object.assign(this, { x, y });
    this.g = scene.add.graphics();
    this.text = label(scene, x, y + 26, '', 8, COLORS.text);
    this.set(0);
  }

  set(laps) {
    const { g, x, y } = this;
    const r = 18;
    const angle = k => Math.PI + (k / MAX_LAPS) * Math.PI;   // a half-circle, 0 on the left
    g.clear();
    g.fillStyle(DB.black).fillCircle(x, y, r + 2);
    g.fillStyle(DB.iron).fillCircle(x, y, r);
    for (let k = 0; k <= MAX_LAPS; k++) {
      g.fillStyle(k <= laps && laps > 0 ? DB.cyan : DB.slate)
        .fillCircle(x + (r - 4) * Math.cos(angle(k)), y + (r - 4) * Math.sin(angle(k)), 2);
    }
    g.lineStyle(2, DB.yellow).lineBetween(x, y, x + (r - 6) * Math.cos(angle(laps)), y + (r - 6) * Math.sin(angle(laps)));
    this.text.setText(`LAPS ${laps}`);
  }
}
