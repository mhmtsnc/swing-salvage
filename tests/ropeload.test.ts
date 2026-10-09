import { describe, expect, it } from 'vitest';
import Matter from 'matter-js';
import { TUNING } from '../src/config/tuning';
import { STEP_MS } from '../src/core/time';
import { RopeLoad } from '../src/game/ropeLoad';

const { Bodies, Composite, Constraint, Engine } = Matter;
const T = TUNING;
const GRAV = T.world.gravityY * 1000;

interface Run { maxG: number; snapped: boolean; maxRatio: number }

/** Helikopter dinamiği (Helicopter.step ile aynı denklemler) + halata asılı kargo. */
function simulate(type: keyof typeof T.cargo, seconds: number, targetAt: (t: number) => number, teleport?: { at: number; dx: number }): Run {
  const def = T.cargo[type];
  const c = T.cargoCommon;
  const engine = Engine.create({ gravity: { x: 0, y: T.world.gravityY } });
  engine.positionIterations = T.world.positionIterations;
  engine.velocityIterations = T.world.velocityIterations;
  engine.constraintIterations = T.world.constraintIterations;
  const pos = { x: 300, y: 300, vx: 0 };
  const winch = { x: pos.x, y: pos.y + T.heli.winchOffsetY };
  const body = Bodies.rectangle(winch.x, winch.y + T.rope.length + def.h / 2, def.w, def.h, {
    density: def.density, friction: c.friction, frictionAir: c.frictionAir,
  });
  const con = Constraint.create({
    pointA: { ...winch }, bodyB: body, pointB: { x: 0, y: -def.h / 2 },
    length: T.rope.length, stiffness: T.rope.stiffness, damping: T.rope.damping,
  });
  Composite.add(engine.world, [body, con]);
  const load = new RopeLoad();
  let maxG = 0;
  let maxRatio = 0;
  let snapped = false;
  const dt = 1 / 60;
  for (let i = 0; i < seconds * 60; i++) {
    const t = i / 60;
    const target = targetAt(t);
    const desired = Math.max(-T.heli.maxSpeed, Math.min(T.heli.maxSpeed, (target - pos.x) * T.heli.followGain));
    let acc = (desired - pos.vx) / T.heli.accelTau;
    const maxA = T.heli.maxAccel * def.handling;
    acc = Math.max(-maxA, Math.min(maxA, acc));
    pos.vx += acc * dt;
    pos.x += pos.vx * dt;
    if (teleport && Math.abs(t - teleport.at) < dt / 2) pos.x += teleport.dx;
    con.pointA.x = pos.x;
    Engine.update(engine, STEP_MS);
    if (load.update(body.velocity.x, body.velocity.y, dt, T.ropeLoad, GRAV, body.mass)) snapped = true;
    if (t > 1) {
      maxG = Math.max(maxG, load.g);
      maxRatio = Math.max(maxRatio, load.ratio(T.ropeLoad, body.mass));
    }
  }
  return { maxG, snapped, maxRatio };
}

describe('halat yükü', () => {
  it('normal oyunda (ileri-geri sürükleme) halat kopmaz', () => {
    for (const type of ['crate', 'wide', 'piano', 'ball'] as const) {
      const r = simulate(type, 20, (t) => 300 + (Math.floor(t / 1.2) % 2 === 0 ? 150 : -150));
      expect(r.snapped).toBe(false);
      expect(r.maxRatio).toBeLessThan(1);
    }
  });
  it('askıda durgun kargoda yük ≈ 1 g', () => {
    const r = simulate('crate', 6, () => 300);
    expect(r.maxG).toBeLessThan(1.6);
  });
  it('ani ışınlanma gibi şiddetli çekişte yük sınırı aşılır', () => {
    const r = simulate('crate', 6, () => 300, { at: 3, dx: 220 });
    expect(r.snapped).toBe(true);
  });
  it('ağır kargonun sınırı daha düşük', () => {
    expect(RopeLoad.limit(T.ropeLoad, 25)).toBeLessThan(RopeLoad.limit(T.ropeLoad, 8));
  });
});
