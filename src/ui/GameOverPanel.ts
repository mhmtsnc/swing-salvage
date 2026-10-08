import Phaser from 'phaser';
import { MEDAL_COLORS, PALETTE, hex } from '../config/palette';
import { STRINGS } from '../config/strings';
import type { FailKind } from '../game/Run';
import { Button, bigButton, icon, label } from './components';

const PANEL_W = 360;
const SLIDE_MS = 250;
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
}

/** §11.4: alttan kayan game over paneli. */
export class GameOverPanel {
  readonly root: Phaser.GameObjects.Container;
  readonly buttons: Button[] = [];
  private bg: Phaser.GameObjects.Graphics;
  private title: Phaser.GameObjects.Text;
  private sub: Phaser.GameObjects.Text;
  private medalDisc: Phaser.GameObjects.Graphics;
  private medalName: Phaser.GameObjects.Text;
  private scoreLabel: Phaser.GameObjects.Text;
  private scoreValue: Phaser.GameObjects.Text;
  private bestLabel: Phaser.GameObjects.Text;
  private bestValue: Phaser.GameObjects.Text;
  private badge: Phaser.GameObjects.Container;
  private message: Phaser.GameObjects.Text;
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

  constructor(
    private scene: Phaser.Scene,
    cb: { onAgain: () => void; onSecondChance: () => void; onShare: () => void; onHome: () => void },
  ) {
    this.bg = scene.add.graphics();
    this.title = label(scene, '', 32, PALETTE.uiRed);
    this.sub = label(scene, '', 14, PALETTE.uiTextSoft, '500');
    this.medalDisc = scene.add.graphics();
    this.medalName = label(scene, '', 12, PALETTE.uiTextSoft, '600');
    this.scoreLabel = label(scene, STRINGS.score, 13, PALETTE.uiTextSoft, '600');
    this.scoreValue = label(scene, '0', 52);
    this.bestLabel = label(scene, STRINGS.best, 13, PALETTE.uiTextSoft, '600');
    this.bestValue = label(scene, '0', 24);
    const badgeBg = scene.add.graphics();
    badgeBg.fillStyle(hex(PALETTE.uiRed), 1).fillRoundedRect(-52, -13, 104, 26, 13);
    this.badge = scene.add.container(0, 0, [badgeBg, label(scene, STRINGS.newBest, 14, PALETTE.uiPaper)]).setVisible(false);
    this.message = label(scene, '', 15, PALETTE.uiTextSoft, '500').setWordWrapWidth(PANEL_W - 40);
    this.message.setAlign('center');
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
      this.bg, this.title, this.sub, this.medalDisc, this.medalName, this.scoreLabel, this.scoreValue,
      this.bestLabel, this.bestValue, this.badge, this.message, this.tries,
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
    this.bestValue.setText(String(d.best));
    this.badge.setVisible(d.newBest);
    this.message.setText(d.message);
    this.tries.setText(d.daily?.triesText ?? '').setVisible(!!d.daily);
    this.againText.setText(d.playNormal ? STRINGS.playNormal : STRINGS.again);
    this.sc.setVisible(d.canSecondChance);

    // medal dairesi: madalya yoksa soluk boş daire
    const g = this.medalDisc;
    g.clear();
    g.fillStyle(hex(PALETTE.shadow), 0.18).fillCircle(0, 3, 36);
    if (d.medal) g.fillStyle(hex(MEDAL_COLORS[d.medal]), 1).fillCircle(0, 0, 36).lineStyle(3, 0xffffff, 0.6).strokeCircle(0, 0, 28);
    else g.fillStyle(hex(PALETTE.uiTextSoft), 0.15).fillCircle(0, 0, 36);
    this.medalName.setText(d.medal ? STRINGS.medals[d.medal] : '');

    // yerleşim (panel merkezine göre)
    const scH = d.canSecondChance ? 74 : 0;
    const dailyH = d.daily ? 22 : 0;
    this.bodyH = 396 + scH + dailyH;
    const top = -this.bodyH / 2;
    this.bg.clear();
    this.bg.fillStyle(hex(PALETTE.shadow), 0.1).fillRoundedRect(-PANEL_W / 2 - 1, top + 7, PANEL_W + 2, this.bodyH, 18);
    this.bg.fillStyle(hex(PALETTE.shadow), 0.18).fillRoundedRect(-PANEL_W / 2, top + 3, PANEL_W, this.bodyH, 18);
    this.bg.fillStyle(hex(PALETTE.uiPaper), 1).fillRoundedRect(-PANEL_W / 2, top, PANEL_W, this.bodyH, 18);
    this.title.setPosition(0, top + 38);
    this.sub.setPosition(0, top + 68);
    const rowY = top + 150;
    this.medalDisc.setPosition(-98, rowY);
    this.medalName.setPosition(-98, rowY + 50);
    this.scoreLabel.setPosition(62, rowY - 40);
    this.scoreValue.setPosition(62, rowY - 8);
    this.bestLabel.setPosition(62, rowY + 28);
    this.bestValue.setPosition(62, rowY + 52);
    this.badge.setPosition(98, rowY - 56);
    this.message.setPosition(0, top + 242);
    let y = top + 290;
    this.tries.setPosition(0, y - 8);
    y += dailyH;
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
  }
}
