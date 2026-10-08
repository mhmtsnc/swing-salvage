import Phaser from 'phaser';
import { getTuning } from './config/tuning';
import { PALETTE } from './config/palette';
import { initStorage } from './core/storage';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { StackDebugScene } from './scenes/StackDebugScene';

initStorage();
const T = getTuning();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: PALETTE.sky,
  scale: {
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: T.world.baseWidth,
    height: T.world.baseHeight,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: T.world.gravityY },
      enableSleeping: false,
      autoUpdate: false,
      positionIterations: T.world.positionIterations,
      velocityIterations: T.world.velocityIterations,
      constraintIterations: T.world.constraintIterations,
    },
  },
  scene: [BootScene, GameScene, UIScene, StackDebugScene],
});
