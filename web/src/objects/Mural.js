import { DB } from '../scenes/style.js';

// Wordless hint for the dark room: 4 vaults + 1 wave, 8 vaults + 2 waves, 16 vaults + a blank.
export class Mural {
  constructor(scene, x, y) {
    this.scene = scene;
    this.g = scene.add.graphics().setAlpha(0);
    const g = this.g;
    g.fillStyle(0x2a2032).fillRect(x, y, 300, 76);
    g.lineStyle(2, DB.stone).strokeRect(x + 1, y + 1, 298, 74);
    [[4, 2, 1], [8, 4, 2], [16, 4, 0]].forEach(([n, cols, waves], p) => {
      const px = x + 12 + p * 98;
      const rows = n / cols;
      for (let i = 0; i < n; i++) {
        g.fillStyle(DB.slate).fillRect(px + (i % cols) * 9 + (4 - cols) * 9 / 2 + 18, y + 8 + Math.floor(i / cols) * 9, 7, 7);
      }
      const wy = y + 14 + rows * 9 + 6;
      if (waves === 0) {
        // The blank: a dotted outline where the waves would go.
        for (let k = 0; k < 15; k++) g.fillStyle(DB.stone).fillRect(px + 14 + k * 4, wy + (k % 2 ? 0 : 0), 2, 2);
        for (let k = 0; k < 15; k++) g.fillStyle(DB.stone).fillRect(px + 14 + k * 4, wy + 10, 2, 2);
      } else {
        for (let w = 0; w < waves; w++) {
          for (let k = 0; k < 30; k++) {
            g.fillStyle(DB.cyan).fillRect(px + 14 + k * 2, wy + w * 8 + Math.round(2 * Math.sin(k * 0.6)), 2, 2);
          }
        }
      }
    });
  }

  show() {
    if (this.shown) return;
    this.shown = true;
    this.scene.tweens.add({ targets: this.g, alpha: 1, duration: 1200 });
  }
}
