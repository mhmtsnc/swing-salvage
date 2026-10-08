import Phaser from 'phaser';
import { getTuning, type Tuning } from '../config/tuning';
import { PALETTE, hex } from '../config/palette';
import { FixedStepper, STEP_MS, toStepAcc } from '../core/time';
import { difficultyAt } from '../game/Difficulty';
import { Sea } from '../game/Sea';
import { Ship } from '../game/Ship';
import { deckY, worldToShip } from '../game/shipModel';

const DURATION = 30;
const STACK_SCORE = 60;
const SETTLE_S = 1;

/** `?debug=stack`: tests/stack.test.ts (a/b) senaryosunun görsel karşılığı. Otomatik 5 sandık istifler, 30 sn ölçer. */
export class StackDebugScene extends Phaser.Scene {
  private T!: Tuning;
  private stepper = new FixedStepper();
  private ship!: Ship;
  private sea!: Sea;
  private crates: { body: MatterJS.BodyType; gfx: Phaser.GameObjects.Rectangle; start: { x: number; y: number; a: number } | null }[] = [];
  private t = 0;
  private seaY = 0;
  private maxSlip = 0;
  private toppled = false;
  private label!: Phaser.GameObjects.Text;

  constructor() {
    super('StackDebugScene');
  }

  create(): void {
    this.T = getTuning();
    this.matter.world.autoUpdate = false;
    this.cameras.main.setBackgroundColor(PALETTE.sky);
    this.seaY = this.scale.height - this.T.world.seaFromBottom;
    const d = difficultyAt(STACK_SCORE);
    this.sea = new Sea(this);
    this.ship = new Ship(this, this.T, this.seaY, 0);
    const def = this.T.cargo.crate;
    const c = this.T.cargoCommon;
    const dy = deckY(this.seaY, this.T.ship);
    const layout = [[110, 0], [210, 0], [110, 1], [210, 1], [160, 2]];
    for (const [x, row] of layout) {
      const y = dy - def.h / 2 - row * def.h - 0.5 * (row + 1);
      const body = this.matter.add.rectangle(x, y, def.w, def.h, {
        chamfer: { radius: def.chamfer }, density: def.density, friction: c.friction,
        frictionStatic: c.frictionStatic, restitution: c.restitution, frictionAir: c.frictionAir, slop: c.slop,
      });
      const gfx = this.add.rectangle(x, y, def.w, def.h, hex(PALETTE.crate)).setDepth(7.5);
      this.crates.push({ body, gfx, start: null });
    }
    this.label = this.add
      .text(8, 8, '', { fontFamily: 'monospace', fontSize: '16px', color: PALETTE.uiText })
      .setDepth(100);
    void d;
  }

  update(_time: number, delta: number): void {
    const d = difficultyAt(STACK_SCORE);
    const steps = this.stepper.advance(delta);
    for (let i = 0; i < steps && this.t < DURATION + SETTLE_S; i++) {
      const settling = this.t < SETTLE_S;
      this.ship.step(settling ? 0 : d.rollAmpDeg, d.rollPeriod);
      if (!settling) this.applyGust(this.t - SETTLE_S, d);
      this.matter.step(STEP_MS);
      this.t += STEP_MS / 1000;
      if (this.t >= SETTLE_S) this.measure();
    }
    this.sea.draw(this.t, this.seaY, d.waveAmp, this.scale.width, this.scale.height);
    this.ship.render();
    for (const c of this.crates) c.gfx.setPosition(c.body.position.x, c.body.position.y).setRotation(c.body.angle);
    const done = this.t >= DURATION + SETTLE_S;
    this.label.setText(
      `STACK TEST score ${STACK_SCORE}  t ${Math.min(this.t - SETTLE_S, DURATION).toFixed(1)}/${DURATION}s\n` +
        `slip ${this.maxSlip.toFixed(1)} px (limit 20)  toppled ${this.toppled}\n` +
        (done ? (this.toppled || this.maxSlip > 20 ? 'RESULT: FAIL' : 'RESULT: PASS') : 'running...'),
    );
  }

  private applyGust(t: number, d: ReturnType<typeof difficultyAt>): void {
    const k = Math.floor(t / d.gustInterval);
    if (t - k * d.gustInterval >= this.T.weather.gustDuration) return;
    const acc = d.gustForce * this.T.weather.gustAccelPerUnit * this.T.weather.stackGustFactor * (k % 2 === 0 ? 1 : -1);
    for (const c of this.crates) {
      this.matter.body.setVelocity(c.body, { x: c.body.velocity.x + toStepAcc(acc), y: c.body.velocity.y });
    }
  }

  private measure(): void {
    const pose = this.ship.pose();
    const r = this.T.rules;
    for (const c of this.crates) {
      const loc = worldToShip(pose, this.ship.params, c.body.position);
      const a = c.body.angle - pose.angle;
      if (!c.start) { c.start = { x: loc.x, y: loc.y, a }; continue; }
      this.maxSlip = Math.max(this.maxSlip, Math.hypot(loc.x - c.start.x, loc.y - c.start.y));
      let da = a - c.start.a;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (loc.y - c.start.y > r.toppleDrop || Math.abs((da * 180) / Math.PI) > r.toppleAngleDeg) this.toppled = true;
    }
  }
}
