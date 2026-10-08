import { describe, expect, it } from 'vitest';
import Matter from 'matter-js';
import { TUNING } from '../src/config/tuning';
import { FixedStepper, STEP_MS, toStepAcc, toStepVel } from '../src/core/time';
import { waterY, waterYMid } from '../src/game/Sea';

describe('FixedStepper', () => {
  const simulate = (fps: number, seconds: number) => {
    const s = new FixedStepper();
    let steps = 0;
    for (let i = 0; i < fps * seconds; i++) steps += s.advance(1000 / fps);
    return steps;
  };
  it('adım sayısı kare hızına değil zamana bağlı', () => {
    for (const fps of [30, 60, 120, 144]) {
      expect(Math.abs(simulate(fps, 10) - 600)).toBeLessThanOrEqual(2);
    }
  });
  it('kare başına en fazla 4 adım', () => {
    expect(new FixedStepper().advance(1000)).toBeLessThanOrEqual(4);
  });
  it('birim çevirme', () => {
    expect(toStepVel(60)).toBe(1);
    expect(toStepAcc(3600)).toBe(1);
  });
});

describe('Sea', () => {
  it('waterY formülü ve orta katman', () => {
    expect(waterY(0, 0, 740, 10)).toBeCloseTo(740);
    const y = waterY(100, 1, 740, 10);
    expect(Math.abs(y - 740)).toBeLessThanOrEqual(10);
    expect(waterYMid(100, 1, 740, 10)).toBeLessThan(740);
  });
});

describe('halat (başsız matter-js)', () => {
  it('kargo halatın ucunda vinçten rope.length aşağıda asılı kalır', () => {
    const { rope, cargoCommon: c, cargo } = TUNING;
    const def = cargo.crate;
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: TUNING.world.gravityY },
      positionIterations: TUNING.world.positionIterations,
      velocityIterations: TUNING.world.velocityIterations,
      constraintIterations: TUNING.world.constraintIterations,
    });
    const winch = { x: 300, y: 200 };
    const body = Matter.Bodies.rectangle(winch.x + 60, winch.y + rope.length, def.w, def.h, {
      density: def.density, friction: c.friction, frictionAir: c.frictionAir,
    });
    const con = Matter.Constraint.create({
      pointA: { ...winch }, bodyB: body, pointB: { x: 0, y: -def.h / 2 },
      length: rope.length, stiffness: rope.stiffness, damping: rope.damping,
    });
    Matter.Composite.add(engine.world, [body, con]);
    for (let i = 0; i < 60 * 20; i++) Matter.Engine.update(engine, STEP_MS);
    const topY = body.position.y - def.h / 2;
    expect(Math.abs(body.position.x - winch.x)).toBeLessThan(8);
    expect(topY - winch.y).toBeGreaterThan(rope.length * 0.95);
    expect(topY - winch.y).toBeLessThan(rope.length * 1.15);
  });
});
