import Phaser from 'phaser';
import { Boot } from './scenes/Boot.js';
import { PlanningHall } from './scenes/PlanningHall.js';
import { Vaults } from './scenes/Vaults.js';
import { Run } from './scenes/Run.js';
import { Verdict } from './scenes/Verdict.js';
import { COLORS, H, W } from './scenes/style.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: COLORS.bg,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 900 } } },
  scene: [Boot, PlanningHall, Vaults, Run, Verdict],
});

// Dev builds only: handle for testing from the browser console.
if (import.meta.env.DEV) window.game = game;
