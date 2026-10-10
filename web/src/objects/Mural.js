import { DB } from '../scenes/style.js';

// Wordless hint for the dark room, carved in stone: 4 vaults + 1 wave,
// 8 vaults + 2 waves, 16 vaults + a blank.
export class Mural {
  constructor(scene, x, y) {
    this.scene = scene;
    this.g = scene.add.graphics().setAlpha(0);
    const g = this.g;
    g.fillStyle(DB.black).fillRect(x - 2, y - 2, 304, 80);
    g.fillStyle(0x8a7f6a).fillRect(x, y, 300, 76);
    g.fillStyle(0xa89c84).fillRect(x, y, 300, 2);
    g.fillStyle(0x5e5648).fillRect(x, y + 74, 300, 2);
    [[4, 2, 1], [8, 4, 2], [16, 4, 0]].forEach(([n, cols, waves], p) => {
      const px = x + 12 + p * 98;
      const rows = n / cols;
      for (let i = 0; i < n; i++) {
        const vx = px + (i % cols) * 9 + (4 - cols) * 9 / 2 + 18;
        const vy = y + 8 + Math.floor(i / cols) * 9;
        g.fillStyle(0x4a4438).fillRect(vx, vy, 7, 7);
        g.fillStyle(0xb8ac94).fillRect(vx, vy + 7, 7, 1);
      }
      const wy = y + 14 + rows * 9 + 6;
      if (waves === 0) {
        for (let k = 0; k < 15; k++) g.fillStyle(0x5e5648).fillRect(px + 14 + k * 4, wy, 2, 2).fillRect(px + 14 + k * 4, wy + 10, 2, 2);
      } else {
        for (let w = 0; w < waves; w++) {
          for (let k = 0; k < 30; k++) g.fillStyle(0x3a5a78).fillRect(px + 14 + k * 2, wy + w * 8 + Math.round(2 * Math.sin(k * 0.6)), 2, 2);
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
