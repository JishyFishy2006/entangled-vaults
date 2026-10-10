import Phaser from 'phaser';
import { Boot } from './scenes/Boot.js';
import { LevelSelect } from './scenes/LevelSelect.js';
import { HallOfEchoes } from './scenes/HallOfEchoes.js';
import { PlanningHall } from './scenes/PlanningHall.js';
import { Vaults } from './scenes/Vaults.js';
import { Run } from './scenes/Run.js';
import { Verdict } from './scenes/Verdict.js';
import { Pitch } from './scenes/Pitch.js';
import { TestHall } from './scenes/TestHall.js';
import { COLORS, FONT, H, W } from './scenes/style.js';

// The pixel font must be loaded before Phaser draws any text with it.
async function loadFont() {
  try {
    const face = new FontFace(FONT, `url(${import.meta.env.BASE_URL}assets/SDS_8x8.ttf)`);
    document.fonts.add(await face.load());
  } catch (err) {
    console.warn('Pixel font failed to load; falling back to the default font.', err);
  }
}

loadFont().then(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    pixelArt: true,
    backgroundColor: COLORS.bg,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 820 } } },
    scene: [Boot, LevelSelect, PlanningHall, Vaults, Run, Verdict, Pitch, HallOfEchoes, TestHall],
  });

  // Dev builds only: handle for testing from the browser console.
  if (import.meta.env.DEV) window.game = game;
});
