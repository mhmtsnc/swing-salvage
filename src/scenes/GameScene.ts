import Phaser from 'phaser';
import { getTuning, type Tuning } from '../config/tuning';
import { PALETTE } from '../config/palette';
import { FixedStepper, STEP_MS, toStepAcc } from '../core/time';
import { difficultyAt } from '../game/Difficulty';
import { Helicopter } from '../game/Helicopter';
import { Rope } from '../game/Rope';
import { Cargo } from '../game/Cargo';
import { Sea, waterY } from '../game/Sea';

export class GameScene extends Phaser.Scene {
  private T!: Tuning;
  private stepper = new FixedStepper();
  private simTime = 0;
  private W = 0;
  private H = 0;
  private seaY = 0;
  private waveAmp = 0;
  private sea!: Sea;
  private heli!: Helicopter;
  private rope!: Rope;
  private cargo: Cargo | null = null;
  private debugText?: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.T = getTuning();
    this.matter.world.autoUpdate = false;
    this.cameras.main.setBackgroundColor(PALETTE.sky);
    this.waveAmp = difficultyAt(0).waveAmp;
    this.measure();

    this.sea = new Sea(this);
    this.heli = new Helicopter(this, this.T, { W: this.W, seaY: this.seaY });
    this.rope = new Rope(this, this.T, this.heli.winchPoint());
    this.spawnCargo();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.heli.pointerDown(p.x, p.y));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.heli.pointerMove(p.x, p.y);
    });
    this.input.on('pointerup', () => this.heli.pointerUp());

    if (new URLSearchParams(location.search).get('debug') === '1') {
      this.matter.world.createDebugGraphic();
      this.debugText = this.add
        .text(8, 8, '', { fontFamily: 'monospace', fontSize: '14px', color: PALETTE.uiText })
        .setDepth(100);
    }

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this));
  }

  private measure(): void {
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.seaY = this.H - this.T.world.seaFromBottom;
  }

  private onResize(): void {
    this.measure();
    this.heli.setBounds(this.W, this.seaY);
    this.cameras.main.setSize(this.W, this.H);
  }

  /** Test kargosu: doğma bölgesinin ortası (gemi pruvasından sağ kenar payına kadar). */
  private spawnCargo(): void {
    const x = (this.T.ship.bowTipX + this.W - this.T.heli.marginX) / 2;
    this.cargo = new Cargo(this, this.T, 'crate', x);
  }

  /** Windan gelen yatay ivme (px/s²). Rüzgâr F4'te; şimdilik 0. */
  private windAccel(): number {
    return 0;
  }

  private applyWind(body: MatterJS.BodyType, accPxS2: number): void {
    const v = body.velocity;
    this.matter.body.setVelocity(body, { x: v.x + toStepAcc(accPxS2), y: v.y });
  }

  private fixedStep(): void {
    const wind = this.windAccel();
    const carried = this.cargo?.state === 'CARRIED' ? this.cargo : null;
    this.heli.step(carried ? carried.handling : 1, wind);
    this.rope.step(this.heli.winchPoint());
    if (wind !== 0) {
      this.applyWind(this.rope.endBody, wind);
    }

    this.matter.step(STEP_MS);
    this.simTime += STEP_MS / 1000;

    const c = this.cargo;
    if (!c) return;
    if (c.state === 'FLOATING' && this.rope.hook) {
      const top = c.topCenter();
      const hp = this.rope.hook.position;
      if (Math.hypot(hp.x - top.x, hp.y - top.y) < this.T.hook.pickupRadius) {
        c.pickUp(this.matter, this.simTime);
        this.rope.attach(c.body as MatterJS.BodyType, { x: 0, y: -c.h / 2 });
      }
    } else if (c.state === 'CARRIED') {
      this.checkSplash(c);
    }
  }

  /** F1 · SPLASH (CARRIED): kancalamadan carriedGrace sn sonra, ön dalga çizgisine göre. */
  private checkSplash(c: Cargo): void {
    const r = this.T.rules;
    if (this.simTime - c.pickedAt < r.carriedGrace) return;
    if (c.bottom() > waterY(c.centerX, this.simTime, this.seaY, this.waveAmp) + r.waterMargin) {
      console.log('FAIL splash');
      this.resetRun();
    }
  }

  /** Geçici: başarısızlıkta kargoyu ve helikopteri başlangıca döndür. */
  private resetRun(): void {
    this.cargo?.destroy(this.matter);
    this.heli.reset();
    this.rope.resetHook(this.heli.winchPoint());
    this.spawnCargo();
  }

  update(_time: number, delta: number): void {
    this.measure();
    const steps = this.stepper.advance(delta);
    for (let i = 0; i < steps; i++) this.fixedStep();

    this.sea.draw(this.simTime, this.seaY, this.waveAmp, this.W, this.H);
    this.cargo?.updateFloating(this.simTime, this.seaY, this.waveAmp);
    this.cargo?.sync();
    this.heli.render();
    this.rope.draw();

    if (this.debugText) {
      this.debugText.setText(
        `FPS ${this.game.loop.actualFps.toFixed(0)}  steps ${steps}\n` +
          `state ${this.cargo?.state ?? '-'}  heli ${this.heli.x.toFixed(0)},${this.heli.y.toFixed(0)} v ${this.heli.vx.toFixed(0)},${this.heli.vy.toFixed(0)}`,
      );
    }
  }
}
