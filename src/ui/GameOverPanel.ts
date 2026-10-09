import Phaser from 'phaser';
import { MEDAL_COLORS, PALETTE, hex } from '../config/palette';
import { STRINGS } from '../config/strings';
import type { FailKind } from '../game/Run';
import type { Grade } from '../meta/grade';
import { Button, bigButton, drawBar, icon, label, setText } from './components';

const PANEL_W = 360;
const SLIDE_MS = 250;
const BAR_W = 300;
const GRADE_COLOR: Record<Grade, string> = { S: '#E8AE3C', A: '#8FA65A', B: '#477779', C: '#A9B4B8', D: '#8B9798' };
const FAIL_TEXT = {
  splash: [STRINGS.splashTitle, STRINGS.splashSub],
  crash: [STRINGS.crashTitle, STRINGS.crashSub],
  topple: [STRINGS.toppleTitle, STRINGS.toppleSub],
} as const;

export interface GameOverData {
  kind: FailKind;
  score: number;
  best: number;
  newBest: boolean;
  medal: keyof typeof MEDAL_COLORS | null;
  message: string;
  canSecondChance: boolean;
  /** Daily modu: kalan deneme yazısı ve SHARE vurgusu */
  daily: { triesText: string } | null;
  /** AGAIN yerine PLAY NORMAL */
  playNormal: boolean;
  // v1.2 ödül ekranı
  grade: Grade;
  xpGained: number;
  rankTitle: string;
  rankNumber: number;
  xpFracBefore: number;
  xpFracAfter: number;
  rankedUp: boolean;
  completed: string[];
  achievements: string[];
  cratesGained: number;
}

/** §11.4 game over paneli + ödül ekranı (Jetpack Joyride'dan: ölüm anında hemen ilerleme göster). */
export class GameOverPanel {
  readonly root: Phaser.GameObjects.Container;
  readonly buttons: Button[] = [];
  private bg: Phaser.GameObjects.Graphics;
  private bars: Phaser.GameObjects.Graphics;
  private title: Phaser.GameObjects.Text;
  private sub: Phaser.GameObjects.Text;
  private medalDisc: Phaser.GameObjects.Graphics;
  private medalName: Phaser.GameObjects.Text;
  private scoreLabel: Phaser.GameObjects.Text;
  private scoreValue: Phaser.GameObjects.Text;
  private bestLabel: Phaser.GameObjects.Text;
  private gradeDisc: Phaser.GameObjects.Graphics;
  private gradeLetter: Phaser.GameObjects.Text;
  private badge: Phaser.GameObjects.Container;
  private rankText: Phaser.GameObjects.Text;
  private xpText: Phaser.GameObjects.Text;
  private message: Phaser.GameObjects.Text;
  private lines: Phaser.GameObjects.Text[] = [];
  private tries: Phaser.GameObjects.Text;
  private sc: Button;
  private again: Button;
  private againText: Phaser.GameObjects.Text;
  private share: Button;
  private home: Button;
  private shareRing: Phaser.GameObjects.Graphics;
  private lockedUntil = 0;
  private open = false;
  private cy = 0;
  private bodyH = 0;
  private barState = { frac: 0 };
  private barY = 0;
  private goalBar: { y: number; frac: number } | null = null;

  constructor(
    private scene: Phaser.Scene,
    cb: { onAgain: () => void; onSecondChance: () => void; onShare: () => void; onHome: () => void },
  ) {
    this.bg = scene.add.graphics();
    this.bars = scene.add.graphics();
    this.title = label(scene, '', 32, PALETTE.uiRed);
    this.sub = label(scene, '', 14, PALETTE.uiTextSoft, '500');
    this.medalDisc = scene.add.graphics();
    this.medalName = label(scene, '', 11, PALETTE.uiTextSoft, '700');
    this.scoreLabel = label(scene, STRINGS.score, 12, PALETTE.uiTextSoft, '600');
    this.scoreValue = label(scene, '0', 48);
    this.bestLabel = label(scene, '', 13, PALETTE.uiTextSoft, '600');
    this.gradeDisc = scene.add.graphics();
    this.gradeLetter = label(scene, 'C', 38, PALETTE.uiPaper);
    const badgeBg = scene.add.graphics();
    badgeBg.fillStyle(hex(PALETTE.uiRed), 1).fillRoundedRect(-52, -13, 104, 26, 13);
    this.badge = scene.add.container(0, 0, [badgeBg, label(scene, STRINGS.newBest, 14, PALETTE.uiPaper)]).setVisible(false);
    this.rankText = label(scene, '', 13, PALETTE.uiText, '700').setOrigin(0, 0.5);
    this.xpText = label(scene, '', 13, PALETTE.uiTeal, '700').setOrigin(1, 0.5);
    this.message = label(scene, '', 15, PALETTE.uiTextSoft, '500').setWordWrapWidth(PANEL_W - 40);
    this.message.setAlign('center');
    for (let i = 0; i < 6; i++) this.lines.push(label(scene, '', 13, PALETTE.uiText, '600'));
    this.tries = label(scene, '', 14, PALETTE.uiTextSoft, '600');

    this.sc = bigButton(scene, 300, 64, STRINGS.secondChance, 22, cb.onSecondChance, PALETTE.uiTeal, '#2E5A5F', STRINGS.watchAd);
    this.sc.root.addAt(icon(scene, 'play', PALETTE.uiPaper, 22).setPosition(-118, -8), 2);
    this.again = bigButton(scene, 300, 64, STRINGS.again, 26, cb.onAgain);
    this.againText = this.again.root.list.find((o) => o instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text;
    this.share = new Button(scene, 144, 52, [icon(scene, 'share').setPosition(-34, 0), label(scene, STRINGS.share, 15).setPosition(10, 0)], cb.onShare);
    this.home = new Button(scene, 144, 52, [icon(scene, 'home').setPosition(-32, 0), label(scene, STRINGS.home, 15).setPosition(10, 0)], cb.onHome);
    this.shareRing = scene.add.graphics();

    this.buttons.push(this.sc, this.again, this.share, this.home);
    this.root = scene.add.container(0, 0, [
      this.bg, this.bars, this.title, this.sub, this.medalDisc, this.medalName, this.scoreLabel, this.scoreValue,
      this.bestLabel, this.gradeDisc, this.gradeLetter, this.badge, this.rankText, this.xpText, this.message,
      ...this.lines, this.tries,
      this.sc.root, this.again.root, this.shareRing, this.share.root, this.home.root,
    ]).setVisible(false);
    for (const b of this.buttons) b.setVisible(false);
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Paneli doldurur ve aşağıdan kaydırır. `lockSec`: girdi kilidi. */
  show(d: GameOverData, W: number, H: number, lockSec: number): void {
    const [title, sub] = FAIL_TEXT[d.kind];
    this.title.setText(title);
    this.sub.setText(sub);
    this.scoreValue.setText(String(d.score));
    const toBest = d.best - d.score;
    this.bestLabel.setText(d.newBest || d.best === 0 ? `${STRINGS.best} ${d.best}` : `${STRINGS.best} ${d.best}  ·  ${Math.max(0, toBest)} to go`);
    this.badge.setVisible(d.newBest);
    this.message.setText(d.message);
    this.tries.setText(d.daily?.triesText ?? '').setVisible(!!d.daily);
    this.againText.setText(d.playNormal ? STRINGS.playNormal : STRINGS.again);
    this.sc.setVisible(d.canSecondChance);

    // madalya dairesi
    const g = this.medalDisc;
    g.clear();
    g.fillStyle(hex(PALETTE.shadow), 0.18).fillCircle(0, 3, 32);
    if (d.medal) g.fillStyle(hex(MEDAL_COLORS[d.medal]), 1).fillCircle(0, 0, 32).lineStyle(3, 0xffffff, 0.6).strokeCircle(0, 0, 25);
    else g.fillStyle(hex(PALETTE.uiTextSoft), 0.15).fillCircle(0, 0, 32);
    this.medalName.setText(d.medal ? STRINGS.medals[d.medal] : '');
    this.scene.tweens.killTweensOf(this.medalDisc);
    if (d.medal) {
      this.medalDisc.setScale(0);
      this.scene.tweens.add({ targets: this.medalDisc, scale: 1, duration: 300, delay: SLIDE_MS, ease: 'Back.easeOut' });
    } else {
      this.medalDisc.setScale(1);
    }

    // not harfi
    const gd = this.gradeDisc;
    gd.clear();
    gd.fillStyle(hex(PALETTE.shadow), 0.18).fillCircle(0, 3, 32);
    gd.fillStyle(hex(GRADE_COLOR[d.grade]), 1).fillCircle(0, 0, 32);
    this.gradeLetter.setText(d.grade);
    this.scene.tweens.killTweensOf(this.gradeLetter);
    this.gradeLetter.setScale(0);
    this.scene.tweens.add({ targets: this.gradeLetter, scale: 1, duration: 320, delay: SLIDE_MS + 120, ease: 'Back.easeOut' });

    // satırlar: tamamlanan görevler, başarımlar, kasalar
    const texts: string[] = [];
    for (const m of d.completed.slice(0, 3)) texts.push(`✔ ${m}`);
    for (const a of d.achievements.slice(0, 2)) texts.push(`★ ${a}`);
    if (d.cratesGained > 0) texts.push(`+${d.cratesGained} CRATE${d.cratesGained > 1 ? 'S' : ''} — open in HANGAR`);
    const shown = texts.slice(0, this.lines.length);
    this.lines.forEach((t, i) => {
      t.setVisible(i < shown.length);
      if (i < shown.length) {
        setText(t, shown[i]);
        t.setColor(shown[i].startsWith('+') ? PALETTE.uiRed : shown[i].startsWith('★') ? '#B98221' : PALETTE.uiTeal);
      }
    });

    // yerleşim
    const scH = d.canSecondChance ? 74 : 0;
    const dailyH = d.daily ? 22 : 0;
    const listH = shown.length ? shown.length * 20 + 10 : 0;
    this.bodyH = 470 + scH + dailyH + listH;
    const top = -this.bodyH / 2;
    this.bg.clear();
    this.bg.fillStyle(hex(PALETTE.shadow), 0.1).fillRoundedRect(-PANEL_W / 2 - 1, top + 7, PANEL_W + 2, this.bodyH, 18);
    this.bg.fillStyle(hex(PALETTE.shadow), 0.18).fillRoundedRect(-PANEL_W / 2, top + 3, PANEL_W, this.bodyH, 18);
    this.bg.fillStyle(hex(PALETTE.uiPaper), 1).fillRoundedRect(-PANEL_W / 2, top, PANEL_W, this.bodyH, 18);
    this.title.setPosition(0, top + 36);
    this.sub.setPosition(0, top + 64);
    const rowY = top + 128;
    this.medalDisc.setPosition(-124, rowY);
    this.medalName.setPosition(-124, rowY + 46);
    this.scoreLabel.setPosition(0, rowY - 32);
    this.scoreValue.setPosition(0, rowY);
    this.bestLabel.setPosition(0, rowY + 36);
    this.gradeDisc.setPosition(124, rowY);
    this.gradeLetter.setPosition(124, rowY);
    this.badge.setPosition(0, rowY - 58);

    // XP / rütbe çubuğu (dolum animasyonlu) ve rekora ilerleme
    const meterY = top + 218;
    this.rankText.setText(`RANK ${d.rankNumber} · ${d.rankTitle.toUpperCase()}${d.rankedUp ? '  ▲ RANK UP!' : ''}`);
    this.rankText.setPosition(-BAR_W / 2, meterY);
    this.xpText.setText(`+${d.xpGained} XP`);
    this.xpText.setPosition(BAR_W / 2, meterY);
    this.barY = meterY + 16;
    this.barState.frac = d.rankedUp ? 0 : d.xpFracBefore;
    this.goalBar = d.best > 0 && !d.newBest ? { y: meterY + 44, frac: d.score / d.best } : null;
    this.scene.tweens.killTweensOf(this.barState);
    this.scene.tweens.add({ targets: this.barState, frac: d.xpFracAfter, duration: 900, delay: SLIDE_MS + 200, ease: 'Cubic.easeOut' });
    this.message.setPosition(0, top + 296 + (this.goalBar ? 0 : -14));
    let y = top + 326;
    shown.forEach((_, i) => this.lines[i].setPosition(0, y + i * 20));
    y += listH;
    this.tries.setPosition(0, y + 8);
    y += dailyH + 14;
    if (d.canSecondChance) {
      this.sc.setPosition(0, y + 32);
      y += 74;
    }
    this.again.setPosition(0, y + 32);
    const smallY = y + 32 + 32 + 16 + 26;
    this.share.setPosition(-76, smallY);
    this.home.setPosition(76, smallY);
    this.shareRing.clear();
    if (d.daily) this.shareRing.lineStyle(3, hex(PALETTE.uiRed), 1).strokeRoundedRect(-76 - 72, smallY - 26, 144, 52, 14);

    for (const b of this.buttons) if (b !== this.sc) b.setVisible(true);
    this.root.setVisible(true);
    this.open = true;
    this.lockedUntil = this.scene.time.now + lockSec * 1000;
    this.cy = H * 0.47;
    this.root.setPosition(W / 2, H + this.bodyH);
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({ targets: this.root, y: this.cy, duration: SLIDE_MS, ease: 'Cubic.easeOut' });
  }

  hide(): void {
    this.open = false;
    this.scene.tweens.killTweensOf(this.root);
    this.root.setVisible(false);
    for (const b of this.buttons) b.setVisible(false);
  }

  /** Girdi kilidi bitti mi (yanlışlıkla dokunmaya karşı). */
  get unlocked(): boolean {
    return this.scene.time.now >= this.lockedUntil;
  }

  layout(W: number, H: number): void {
    if (!this.open) return;
    this.root.x = W / 2;
    this.cy = H * 0.47;
    // çubukları her kare yeniden çiz (animasyonlu dolum)
    const g = this.bars;
    g.clear();
    drawBar(g, 0, this.barY, BAR_W, 8, this.barState.frac, PALETTE.uiTeal);
    if (this.goalBar) {
      drawBar(g, 0, this.goalBar.y, BAR_W, 6, this.goalBar.frac, this.goalBar.frac > 0.85 ? PALETTE.uiRed : PALETTE.crate);
    }
  }
}
