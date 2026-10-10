import Phaser from 'phaser';
import { DB, H, W, label } from './style.js';

// Loads pools and art, builds the hero animations and a few generated textures.
export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const bar = this.add.graphics();
    const text = label(this, W / 2, H / 2 - 16, 'Loading the temple...', 8);
    this.load.on('progress', p => {
      bar.clear().fillStyle(DB.iron).fillRect(W / 2 - 80, H / 2, 160, 6).fillStyle(DB.yellow).fillRect(W / 2 - 80, H / 2, 160 * p, 6);
    });
    this.load.on('complete', () => { bar.destroy(); text.destroy(); });

    this.load.json('pool-ideal', 'pools/ideal.json');
    this.load.json('pool-ionq-aria-1', 'pools/ionq-aria-1.json');
    this.load.json('pool-grover-ideal', 'pools/grover-ideal.json');
    this.load.json('pool-grover-ionq-aria-1', 'pools/grover-ionq-aria-1.json');
    this.load.json('heroes', 'assets/heroes.json');
    this.load.json('tilemap', 'assets/tiles.json');
    this.load.spritesheet('tiles', 'assets/tiles.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('fire', 'assets/fire.png', { frameWidth: 128, frameHeight: 72 });
    this.load.spritesheet('water', 'assets/water.png', { frameWidth: 128, frameHeight: 72 });
  }

  create() {
    for (const [hero, spec] of Object.entries(this.cache.json.get('heroes'))) {
      for (const [name, a] of Object.entries(spec.anims)) {
        this.anims.create({
          key: `${hero}-${name}`,
          frames: this.anims.generateFrameNumbers(hero, { start: a.start, end: a.end }),
          frameRate: a.fps,
          repeat: a.repeat,
        });
      }
    }

    // 2x2 white pixel for particles, and a soft radial glow for lights.
    this.add.graphics().fillStyle(0xffffff).fillRect(0, 0, 2, 2).generateTexture('px', 2, 2).destroy();
    const glow = this.textures.createCanvas('glow', 64, 64);
    const ctx = glow.getContext();
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    glow.refresh();

    // Dev shortcut until the Level select exists: /#testhall (room 2), /#testhall1, /#testhall3.
    const hall = window.location.hash.match(/^#testhall([123])?$/);
    if (hall) this.scene.start('TestHall', { room: Number(hall[1] ?? 2) });
    else this.scene.start('LevelSelect');
  }
}
