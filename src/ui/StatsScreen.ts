import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import { getItem } from '../core/storage';
import { loadMeta } from '../meta/store';
import { ACHIEVEMENTS, type AchCtx } from '../meta/achievements';
import { achCtx } from '../meta/finalize';
import { rankFor } from '../meta/rank';
import { Button, drawBar, drawCard, icon, label, setText } from './components';

const PER_PAGE = 5;
const CARD_W = 356;

/** STATS: rütbe, ömür boyu sayılar, en iyi 5 koşu ve başarımlar (sayfalı). */
export class StatsScreen {
  readonly root: Phaser.GameObjects.Container;
  readonly buttons: Button[] = [];
  private dim: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private g: Phaser.GameObjects.Graphics;
  private rankText: Phaser.GameObjects.Text;
  private lines: Phaser.GameObjects.Text[] = [];
  private histTexts: Phaser.GameObjects.Text[] = [];
  private achRows: { name: Phaser.GameObjects.Text; desc: Phaser.GameObjects.Text; prog: Phaser.GameObjects.Text }[] = [];
  private pageText: Phaser.GameObjects.Text;
  private prev: Button;
  private next: Button;
  private back: Button;
  private page = 0;
  private title: Phaser.GameObjects.Text;
  private height = 0;

  constructor(scene: Phaser.Scene, onBack: () => void) {
    this.dim = scene.add.rectangle(0, 0, 10, 10, hex(PALETTE.sky), 0.97).setOrigin(0, 0);
    this.title = label(scene, 'STATS', 34);
    this.bg = scene.add.graphics();
    this.g = scene.add.graphics();
    this.rankText = label(scene, '', 18, PALETTE.uiText, '700');
    const kids: Phaser.GameObjects.GameObject[] = [this.bg, this.g, this.rankText];
    for (let i = 0; i < 6; i++) {
      const t = label(scene, '', 13, PALETTE.uiText, '600').setOrigin(0, 0.5);
      this.lines.push(t);
      kids.push(t);
    }
    for (let i = 0; i < 5; i++) {
      const t = label(scene, '', 13, PALETTE.uiText, '600').setOrigin(0, 0.5);
      this.histTexts.push(t);
      kids.push(t);
    }
    for (let i = 0; i < PER_PAGE; i++) {
      const row = {
        name: label(scene, '', 14, PALETTE.uiText, '700').setOrigin(0, 0.5),
        desc: label(scene, '', 11, PALETTE.uiTextSoft, '500').setOrigin(0, 0.5),
        prog: label(scene, '', 12, PALETTE.uiTextSoft, '700').setOrigin(1, 0.5),
      };
      this.achRows.push(row);
      kids.push(row.name, row.desc, row.prog);
    }
    this.pageText = label(scene, '', 13, PALETTE.uiTextSoft, '700');
    this.prev = new Button(scene, 52, 40, [icon(scene, 'prev')], () => this.turn(-1));
    this.next = new Button(scene, 52, 40, [icon(scene, 'next')], () => this.turn(1));
    this.back = new Button(scene, 120, 52, [icon(scene, 'back').setPosition(-30, 0), label(scene, 'BACK', 16).setPosition(10, 0)], onBack);
    kids.push(this.pageText, this.prev.root, this.next.root);
    this.panel = scene.add.container(0, 0, kids);
    this.buttons.push(this.prev, this.next, this.back);
    this.root = scene.add.container(0, 0, [this.dim, this.title, this.panel, this.back.root]).setVisible(false);
  }

  private turn(d: number): void {
    const pages = Math.ceil(ACHIEVEMENTS.length / PER_PAGE);
    this.page = (this.page + d + pages) % pages;
    this.refresh();
  }

  private ctx(): AchCtx {
    const stats = getItem('ss.stats');
    const meta = loadMeta();
    return achCtx(meta, stats, getItem('ss.best'), new Set(getItem('ss.daily').playedDays).size);
  }

  refresh(): void {
    const meta = loadMeta();
    const stats = getItem('ss.stats');
    const r = rankFor(meta.xp);
    setText(this.rankText, `RANK ${r.rank + 1} · ${r.title.toUpperCase()}`);
    const top = -this.height / 2;
    const g = this.g;
    g.clear();
    drawBar(g, 0, top + 52, CARD_W - 40, 8, r.into / r.need, PALETTE.uiTeal);
    const left = -CARD_W / 2 + 20;
    const info = [
      `Runs ${stats.runs}   ·   Crates delivered ${stats.cratesLifetime}`,
      `PERFECT ${stats.perfectsLifetime}   ·   FLAWLESS ${meta.counters.flawless}`,
      `Best score ${getItem('ss.best')}   ·   Best chain ${meta.counters.bestStreak}`,
      `Best ship ${stats.bestShip}   ·   Missions done ${meta.counters.missionsDone}`,
      `Login streak ${meta.login.streak} (best ${meta.login.bestStreak})   ·   Shields ${meta.login.freezes}`,
      `Crates ${meta.crates} to open   ·   Opened ${meta.counters.cratesOpened}`,
    ];
    this.lines.forEach((t, i) => {
      setText(t, info[i]);
      t.setPosition(left, top + 82 + i * 20);
    });
    // en iyi 5 koşu
    const hy = top + 82 + 6 * 20 + 18;
    g.lineStyle(2, hex(PALETTE.uiTextSoft), 0.25).lineBetween(left, hy - 10, -left, hy - 10);
    this.histTexts.forEach((t, i) => {
      const h = meta.history[i];
      setText(t, h ? `${i + 1}.  ${h.score} pts   ${h.grade}   ${h.mode === 'daily' ? 'DAILY' : ''}  ${h.date}` : `${i + 1}.  —`);
      t.setPosition(left, hy + 8 + i * 19);
    });
    // başarımlar
    const ay = hy + 8 + 5 * 19 + 18;
    g.lineStyle(2, hex(PALETTE.uiTextSoft), 0.25).lineBetween(left, ay - 10, -left, ay - 10);
    const ctx = this.ctx();
    const slice = ACHIEVEMENTS.slice(this.page * PER_PAGE, this.page * PER_PAGE + PER_PAGE);
    this.achRows.forEach((row, i) => {
      const a = slice[i];
      const on = !!a;
      row.name.setVisible(on);
      row.desc.setVisible(on);
      row.prog.setVisible(on);
      if (!a) return;
      const done = meta.achievements.includes(a.id);
      const v = Math.min(a.value(ctx), a.goal);
      const y = ay + 8 + i * 34;
      setText(row.name, `${done ? '✔ ' : ''}${a.name}`);
      row.name.setColor(done ? PALETTE.uiTeal : PALETTE.uiText).setPosition(left, y - 6);
      setText(row.desc, `${a.desc}  ·  +${a.crates} crate${a.crates > 1 ? 's' : ''}`);
      row.desc.setPosition(left, y + 8);
      setText(row.prog, `${v}/${a.goal}`);
      row.prog.setPosition(-left, y - 6);
      drawBar(g, -left - 30, y + 8, 60, 4, v / a.goal, done ? PALETTE.uiTeal : PALETTE.uiRed);
    });
    const pages = Math.ceil(ACHIEVEMENTS.length / PER_PAGE);
    setText(this.pageText, `${this.page + 1}/${pages}  ·  ${meta.achievements.length}/${ACHIEVEMENTS.length} ACHIEVEMENTS`);
    const bottom = ay + 8 + PER_PAGE * 34 + 16;
    this.pageText.setPosition(0, bottom);
    this.prev.setPosition(-CARD_W / 2 + 36, bottom);
    this.next.setPosition(CARD_W / 2 - 36, bottom);
  }

  show(v: boolean): void {
    this.root.setVisible(v);
    for (const b of this.buttons) b.setVisible(v);
    if (v) {
      this.page = 0;
      this.layoutCard();
      this.refresh();
    }
  }

  private layoutCard(): void {
    this.height = 82 + 6 * 20 + 18 + 5 * 19 + 18 + PER_PAGE * 34 + 16 + 44;
    drawCard(this.bg, CARD_W, this.height);
    this.rankText.setPosition(0, -this.height / 2 + 28);
  }

  layout(W: number, H: number): void {
    this.dim.setSize(W, H);
    this.panel.setPosition(W / 2, H / 2 + 6);
    this.title.setPosition(W / 2, H / 2 - this.height / 2 - 34);
    this.back.setPosition(W / 2, H / 2 + this.height / 2 + 56);
  }
}
