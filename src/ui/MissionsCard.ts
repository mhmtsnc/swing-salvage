import Phaser from 'phaser';
import { PALETTE } from '../config/palette';
import type { MetaState } from '../core/storage';
import { defById, missionText, targetOf, TIER_NAMES } from '../meta/missions';
import { rankFor } from '../meta/rank';
import { drawBar, drawCard, label, setText } from './components';

const W = 348;
const ROW_H = 31;
const TIER_COLORS: string[] = ['#8FA65A', '#E8AE3C', '#BF4630'];

interface Row {
  dot: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  prog: Phaser.GameObjects.Text;
  tag: Phaser.GameObjects.Text;
}

/** READY ekranındaki görev kartı: rütbe + XP çubuğu, 3 kademeli görev ve günlük görev. */
export class MissionsCard {
  readonly root: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private bars: Phaser.GameObjects.Graphics;
  private rank: Phaser.GameObjects.Text;
  private header: Phaser.GameObjects.Text;
  private rows: Row[] = [];
  private lastH = 0;

  constructor(scene: Phaser.Scene) {
    this.bg = scene.add.graphics();
    this.bars = scene.add.graphics();
    this.header = label(scene, 'MISSIONS', 13, PALETTE.uiTextSoft, '700').setOrigin(0, 0.5);
    this.rank = label(scene, '', 13, PALETTE.uiText, '700').setOrigin(1, 0.5);
    const kids: Phaser.GameObjects.GameObject[] = [this.bg, this.bars, this.header, this.rank];
    for (let i = 0; i < 4; i++) {
      const row: Row = {
        dot: scene.add.graphics(),
        text: label(scene, '', 13, PALETTE.uiText, '600').setOrigin(0, 0.5),
        prog: label(scene, '', 12, PALETTE.uiTextSoft, '700').setOrigin(1, 0.5),
        tag: label(scene, '', 10, PALETTE.uiTextSoft, '700').setOrigin(0, 0.5),
      };
      this.rows.push(row);
      kids.push(row.dot, row.text, row.prog, row.tag);
    }
    this.root = scene.add.container(0, 0, kids);
  }

  height(compact: boolean): number {
    return 52 + (compact ? 3 : 4) * ROW_H + 8;
  }

  update(meta: MetaState, compact: boolean): void {
    const rows = compact ? 3 : 4;
    const h = this.height(compact);
    if (h !== this.lastH) {
      this.lastH = h;
      drawCard(this.bg, W, h);
    }
    const top = -h / 2;
    this.header.setPosition(-W / 2 + 16, top + 18);
    const r = rankFor(meta.xp);
    setText(this.rank, `RANK ${r.rank + 1} · ${r.title.toUpperCase()}`);
    this.rank.setPosition(W / 2 - 16, top + 18);

    const g = this.bars;
    g.clear();
    drawBar(g, 0, top + 36, W - 32, 5, r.into / r.need, PALETTE.uiTeal);

    const entries: { color: string; text: string; progress: number; target: number; tag: string }[] = meta.missions.map((m) => ({
      color: TIER_COLORS[m.tier],
      text: missionText(m),
      progress: Math.min(m.progress, targetOf(m)),
      target: targetOf(m),
      tag: TIER_NAMES[m.tier],
    }));
    if (meta.daily) {
      const d = defById(meta.daily.id);
      const target = d.targets[1];
      entries.push({
        color: PALETTE.uiTeal,
        text: d.text.replace('{n}', String(target)),
        progress: Math.min(meta.daily.progress, target),
        target,
        tag: meta.daily.done ? 'DAILY ✓' : 'DAILY',
      });
    }
    this.rows.forEach((row, i) => {
      const e = entries[i];
      const on = !!e && i < rows;
      row.dot.setVisible(on);
      row.text.setVisible(on);
      row.prog.setVisible(on);
      row.tag.setVisible(on);
      if (!on) return;
      const y = top + 52 + i * ROW_H + ROW_H / 2;
      row.dot.clear().fillStyle(Phaser.Display.Color.HexStringToColor(e.color).color, 1).fillCircle(-W / 2 + 22, y - 5, 5);
      row.text.setPosition(-W / 2 + 36, y - 5);
      row.tag.setPosition(-W / 2 + 36, y + 8);
      row.prog.setPosition(W / 2 - 16, y - 5);
      setText(row.text, e.text);
      setText(row.prog, `${e.progress}/${e.target}`);
      setText(row.tag, e.tag);
      drawBar(g, W / 2 - 16 - 30, y + 8, 60, 4, e.progress / e.target, e.color);
    });
  }
}
