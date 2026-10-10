import { DB } from '../scenes/style.js';

// One vault door: sealed, unsealed (by a read), or open (showing the key or not).
export class Vault {
  constructor(scene, index, cx, floorY, w = 20, h = 36) {
    Object.assign(this, { scene, index, cx, floorY, w, h });
    this.g = scene.add.graphics();
    this.zone = scene.physics.add.existing(scene.add.zone(cx, floorY - h / 2, w + 4, h), true);
    this.setState('sealed');
  }

  setState(state, hasKey = false) {
    this.state = state;
    const { g, cx, floorY, w, h } = this;
    const x = cx - w / 2;
    const y = floorY - h;
    g.clear();
    g.fillStyle(DB.black).fillRect(x - 1, y - 1, w + 2, h + 1);
    if (state === 'open') {
      g.fillStyle(0x1e1626).fillRect(x, y, w, h);
      if (hasKey) {
        g.fillStyle(DB.yellow).fillCircle(cx, y + 14, 4).fillRect(cx - 1, y + 14, 2, 12).fillRect(cx, y + 22, 4, 2);
      }
      return;
    }
    g.fillStyle(state === 'unsealed' ? DB.brown : DB.iron).fillRect(x, y, w, h);
    g.fillStyle(state === 'unsealed' ? DB.orange : DB.stone).fillRect(x + 2, y + 2, w - 4, 2);
    if (state === 'sealed') {
      g.fillStyle(DB.slate).fillRect(cx - 3, y + h / 2 - 3, 6, 6);     // the seal
    } else {
      g.lineStyle(2, DB.yellow).strokeRect(x - 2, y - 2, w + 4, h + 3);
    }
  }
}
