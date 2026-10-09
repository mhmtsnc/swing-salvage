export interface AchCtx {
  delivered: number;
  perfects: number;
  flawless: number;
  bestShip: number;
  bestScore: number;
  bestStreak: number;
  bestClean: number;
  sweet: number;
  saved: number;
  closeCall: number;
  gustDrops: number;
  pianos: number;
  balls: number;
  gradeS: number;
  loginBest: number;
  dailyDays: number;
  missionsDone: number;
  rank: number;
  runs: number;
}

export interface AchDef {
  id: string;
  name: string;
  desc: string;
  goal: number;
  value: (c: AchCtx) => number;
  /** Ödül olarak verilen kasa */
  crates: number;
}

const A = (id: string, name: string, desc: string, goal: number, value: (c: AchCtx) => number, crates = 1): AchDef => ({
  id, name, desc, goal, value, crates,
});

export const ACHIEVEMENTS: readonly AchDef[] = [
  A('cargo10', 'First Haul', 'Deliver 10 crates', 10, (c) => c.delivered),
  A('cargo100', 'Stevedore', 'Deliver 100 crates', 100, (c) => c.delivered),
  A('cargo500', 'Dockmaster', 'Deliver 500 crates', 500, (c) => c.delivered, 2),
  A('perfect25', 'Steady Hands', 'Land 25 PERFECT drops', 25, (c) => c.perfects),
  A('perfect150', 'Surgeon', 'Land 150 PERFECT drops', 150, (c) => c.perfects, 2),
  A('flawless5', 'Flawless', 'Land 5 FLAWLESS drops', 5, (c) => c.flawless),
  A('flawless30', 'Paper Cut Precision', 'Land 30 FLAWLESS drops', 30, (c) => c.flawless, 2),
  A('chain5', 'On a Roll', 'Chain 5 PERFECTs', 5, (c) => c.bestStreak),
  A('chain10', 'Unstoppable', 'Chain 10 PERFECTs', 10, (c) => c.bestStreak, 2),
  A('chain20', 'Machine', 'Chain 20 PERFECTs', 20, (c) => c.bestStreak, 3),
  A('ship3', 'Second Wind', 'Reach ship 3', 3, (c) => c.bestShip),
  A('ship6', 'Long Haul', 'Reach ship 6', 6, (c) => c.bestShip, 2),
  A('score100', 'Century', 'Score 100 in one run', 100, (c) => c.bestScore),
  A('score250', 'Storm Legend', 'Score 250 in one run', 250, (c) => c.bestScore, 3),
  A('sweet10', 'Bullseye', 'Hit the SWEET SPOT 10 times', 10, (c) => c.sweet),
  A('saved5', 'Lifeguard', 'Rescue 5 sinking crates', 5, (c) => c.saved),
  A('close10', 'Daredevil', 'Pull off 10 CLOSE CALLs', 10, (c) => c.closeCall),
  A('gust10', 'Storm Chaser', 'Land 10 crates during gusts', 10, (c) => c.gustDrops),
  A('clean12', 'Gentle Giant', 'Deliver 12 in a row with no damage', 12, (c) => c.bestClean, 2),
  A('piano5', 'Heavy Lifter', 'Deliver 5 pianos', 5, (c) => c.pianos),
  A('ball5', 'Buoy Whisperer', 'Deliver 5 buoys', 5, (c) => c.balls),
  A('gradeS', 'S Rank', 'Earn an S grade', 1, (c) => c.gradeS, 2),
  A('login7', 'Regular', 'Play 7 days in a row', 7, (c) => c.loginBest, 2),
  A('daily5', 'Storm Watcher', 'Play the Daily Storm on 5 days', 5, (c) => c.dailyDays),
  A('missions10', 'Contractor', 'Complete 10 missions', 10, (c) => c.missionsDone),
  A('rank5', 'Veteran', 'Reach pilot rank 5', 5, (c) => c.rank, 2),
];

/** Yeni kazanılan başarımlar (daha önce kazanılmamış olup hedefi aşanlar). */
export function newlyUnlocked(ctx: AchCtx, have: readonly string[]): AchDef[] {
  return ACHIEVEMENTS.filter((a) => !have.includes(a.id) && a.value(ctx) >= a.goal);
}
