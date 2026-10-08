import { describe, expect, it } from 'vitest';
import Matter from 'matter-js';
import { TUNING } from '../src/config/tuning';
import { STEP_MS, toStepAcc } from '../src/core/time';
import { difficultyAt } from '../src/game/Difficulty';
import {
  deckY, shipParts, shipPose, shipToWorld, worldToShip,
  type ShipParams,
} from '../src/game/shipModel';

const { Bodies, Body, Composite, Engine } = Matter;
const T = TUNING;
const SEA_Y = 740;

interface Params { rollAmpDeg: number; rollPeriod: number; gustForce: number; gustInterval: number }

function run(
  stack: { x: number; row: number; shift?: number }[],
  p: Params | null,
  seconds: number,
): { toppled: boolean; maxSlip: number } {
  const engine = Engine.create({
    gravity: { x: 0, y: T.world.gravityY },
    positionIterations: T.world.positionIterations,
    velocityIterations: T.world.velocityIterations,
    constraintIterations: T.world.constraintIterations,
    enableSleeping: false,
  });
  const mkParams = (roll: number, heave: number): ShipParams => ({
    seaY: SEA_Y, rollAmpDeg: roll, rollPeriod: p?.rollPeriod ?? 4, ship: { ...T.ship, heaveAmp: heave },
  });
  let params = mkParams(0, 0);
  const parts = shipParts(SEA_Y, T.ship);
  const mk = (r: { cx: number; cy: number; w: number; h: number }) => Bodies.rectangle(r.cx, r.cy, r.w, r.h);
  const ship = Body.create({
    parts: [mk(parts.hull), mk(parts.bridge), mk(parts.lip)],
    friction: T.ship.friction, frictionStatic: T.ship.frictionStatic,
  });
  Body.setStatic(ship, true);
  Composite.add(engine.world, ship);
  const restCenter = { x: ship.position.x, y: ship.position.y };

  const c = T.cargoCommon;
  const def = T.cargo.crate;
  const dy = deckY(SEA_Y, T.ship);
  const crates = stack.map((s) => {
    const y = dy - def.h / 2 - s.row * def.h - 0.5 * (s.row + 1);
    return Bodies.rectangle(s.x + (s.shift ?? 0), y, def.w, def.h, {
      chamfer: { radius: def.chamfer }, density: def.density, friction: c.friction,
      frictionStatic: c.frictionStatic, restitution: c.restitution, frictionAir: c.frictionAir, slop: c.slop,
    });
  });
  Composite.add(engine.world, crates);

  const setShip = (t: number, vel: boolean) => {
    const pose = shipPose(t, params);
    const pos = shipToWorld(pose, params, restCenter);
    (Body.setPosition as (b: Matter.Body, p: Matter.Vector, v: boolean) => void)(ship, pos, vel);
    (Body.setAngle as (b: Matter.Body, a: number, v: boolean) => void)(ship, pose.angle, vel);
    return pose;
  };

  let t = 0;
  // 1 sn yalpasız oturma
  for (let i = 0; i < 60; i++) { setShip(0, true); Engine.update(engine, STEP_MS); }
  const start = crates.map((b) => worldToShip(shipPose(0, params), params, b.position));
  const startAng = crates.map((b) => b.angle);
  params = mkParams(p?.rollAmpDeg ?? 0, p ? T.ship.heaveAmp : 0);

  let toppled = false;
  let maxSlip = 0;
  const gustDur = T.weather.gustDuration;
  const interval = p?.gustInterval ?? Infinity;
  const gustAcc = p ? p.gustForce * T.weather.gustAccelPerUnit * T.weather.stackGustFactor : 0;
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    t = i / 60;
    const pose = setShip(t, true);
    if (gustAcc > 0) {
      const k = Math.floor(t / interval);
      const into = t - k * interval;
      if (into < gustDur) {
        const dir = k % 2 === 0 ? 1 : -1;
        for (const b of crates) Body.setVelocity(b, { x: b.velocity.x + dir * toStepAcc(gustAcc), y: b.velocity.y });
      }
    }
    Engine.update(engine, STEP_MS);
    crates.forEach((b, j) => {
      const loc = worldToShip(pose, params, b.position);
      maxSlip = Math.max(maxSlip, Math.hypot(loc.x - start[j].x, loc.y - start[j].y));
      const drop = loc.y - start[j].y;
      let da = b.angle - pose.angle - startAng[j];
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (drop > T.rules.toppleDrop || Math.abs(da) > (T.rules.toppleAngleDeg * Math.PI) / 180) toppled = true;
    });
  }
  if (process.env.STACK_LOG) console.log(JSON.stringify({ toppled, maxSlip: +maxSlip.toFixed(2) }));
  return { toppled, maxSlip };
}

const proper = [
  { x: 110, row: 0 }, { x: 210, row: 0 },
  { x: 110, row: 1 }, { x: 210, row: 1 },
  { x: 160, row: 2 },
];
const at = (score: number): Params => {
  const d = difficultyAt(score);
  return { rollAmpDeg: d.rollAmpDeg, rollPeriod: d.rollPeriod, gustForce: d.gustForce, gustInterval: d.gustInterval };
};

describe('istif kabul testi (§6.4, başsız matter-js)', () => {
  it('(a) düzgün 2+2+1, skor 10: devrilme yok, kayma ≤ 10', () => {
    const r = run(proper, at(10), 30);
    expect(r.toppled).toBe(false);
    expect(r.maxSlip).toBeLessThanOrEqual(10);
  });
  it('(b) düzgün 2+2+1, skor 60: devrilme yok, kayma ≤ 20', () => {
    const r = run(proper, at(60), 30);
    expect(r.toppled).toBe(false);
    expect(r.maxSlip).toBeLessThanOrEqual(20);
  });
  const col = (shift: number) => [{ x: 210, row: 0 }, { x: 210, row: 1, shift }];
  it('(c) +30 px kaymış üst sandık, yalpasız: devrilmez', () => {
    expect(run(col(30), null, 10).toppled).toBe(false);
  });
  it('(c2) aynı istif skor 60 parametreleriyle devrilir', () => {
    expect(run(col(30), at(60), 30).toppled).toBe(true);
  });
  it('(d) +40 px kaymış üst sandık, yalpasız: 1 sn içinde devrilir', () => {
    expect(run(col(40), null, 1).toppled).toBe(true);
  });
});
