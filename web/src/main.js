import Phaser from 'phaser';
import { Boot } from './scenes/Boot.js';
import { PlanningHall } from './scenes/PlanningHall.js';
import { Vaults } from './scenes/Vaults.js';
import { Run } from './scenes/Run.js';
import { Verdict } from './scenes/Verdict.js';
import { COLORS, H, W } from './scenes/style.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: COLORS.bg,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, PlanningHall, Vaults, Run, Verdict],
});
