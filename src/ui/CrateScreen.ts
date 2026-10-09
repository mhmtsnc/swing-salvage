import Phaser from 'phaser';
import { PALETTE, hex } from '../config/palette';
import { STRINGS } from '../config/strings';
import type { CrateReward, Rarity } from '../meta/cosmetics';
import { TRAIL_NAMES } from './HangarScreen';
import { Button, bigButton, drawCard, label, setText } from './components';

const RARITY_COLOR: Record<Rarity, string> = { common: '#8FA65A', rare: '#477779', epic: '#BF4630' };
const RARITY_NAME: Record<Rarity, string> = { common: 'COMMON', rare: 'RARE', epic: 'EPIC' };
const SHAKE_MS = 650;

type State = 'idle' | 'opening' | 'reveal';

/** Salvage Crate açma: tıkla → sarsıl → patla → ödül kartı. Para yok, sadece kozmetik (değişken ödül). */
export class CrateScreen {
  readonly root: Phaser.GameObjects.Container;
  readonly buttons: Button[] = [];
  private dim: Phaser.GameObjects.Rectangle;
  private title: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private crate: Phaser.GameObjects.Container;
  private crateZone: Phaser.GameObjects.Zone;
  private reveal: Phaser.GameObjects.Container;
  private revealBg: Phaser.GameObjects.Graphics;
  private revealHeli: Phaser.GameObjects.Image;
  private revealTrail: Phaser.GameObjects.Graphics;
  private revealName: Phaser.GameObjects.Text;
  private revealRarity: Phaser.GameObjects.Text;
  private revealNew: Phaser.GameObjects.Text;
  private equip: Button;
  private again: Button;
  private done: Button;
  private state: State = 'idle';
  private last: CrateReward | null = null;
  private left = 0;

  constructor(
    private scene: Phaser.Scene,
    private cb: {
      open: () => { reward: CrateReward; left: number } | null;
      equip: (kind: 'paint' | 'trail', id: string) => void;
      close: () => void;
      burst: (x: number, y: number, rarity: Rarity | 'xp') => void;
    },
  ) {
    this.dim = scene.add.rectangle(0, 0, 10, 10, hex('#24353A'), 0.88).setOrigin(0, 0);
    this.title = label(scene, 'SALVAGE CRATE', 32, PALETTE.uiPaper);
    this.hint = label(scene, '', 18, PALETTE.uiPaper, '600');

    const g = scene.add.graphics();
    g.fillStyle(hex(PALETTE.shadow), 0.3).fillRoundedRect(-82, -54, 164, 128, 12);
    g.fillStyle(hex(PALETTE.crate), 1).fillRoundedRect(-80, -64, 160, 128, 10);
    g.fillStyle(0x000000, 0.12).fillRect(60, -64, 20, 128);
    g.lineStyle(5, hex(PALETTE.crateLine), 1);
    g.lineBetween(-72, -22, 62, -22).lineBetween(-72, 22, 62, 22).lineBetween(-70, 54, 54, -54);
    g.fillStyle(hex(PALETTE.uiRed), 1).fillRoundedRect(-18, -76, 36, 22, 6);
    this.crate = scene.add.container(0, 0, [g]);
    this.crateZone = scene.add.zone(0, 0, 180, 150).setInteractive({ useHandCursor: true });
    this.crateZone.on('pointerup', () => this.openOne());

    this.revealBg = scene.add.graphics();
    this.revealHeli = scene.add.image(0, -80, 'heli_rescue').setScale(0.95);
    this.revealTrail = scene.add.graphics();
    this.revealName = label(scene, '', 26, PALETTE.uiText);
    this.revealRarity = label(scene, '', 14, PALETTE.uiPaper, '700');
    this.revealNew = label(scene, 'NEW!', 16, PALETTE.uiRed, '700');
    this.equip = bigButton(scene, 220, 56, 'EQUIP', 22, () => this.doEquip(), PALETTE.uiTeal, '#2E5A5F');
    this.again = bigButton(scene, 220, 56, 'OPEN NEXT', 22, () => this.openOne());
    this.done = new Button(scene, 160, 48, [label(scene, 'DONE', 17)], cb.close);
    this.buttons.push(this.equip, this.again, this.done);
    this.reveal = scene.add
      .container(0, 0, [this.revealBg, this.revealHeli, this.revealTrail, this.revealName, this.revealRarity, this.revealNew, this.equip.root, this.again.root])
      .setVisible(false);
    this.root = scene.add.container(0, 0, [this.dim, this.title, this.hint, this.crate, this.crateZone, this.reveal, this.done.root]).setVisible(false);
  }

  show(v: boolean, crates: number): void {
    this.root.setVisible(v);
    for (const b of this.buttons) b.setVisible(false);
    this.crateZone.input && (this.crateZone.input.enabled = v);
    if (!v) return;
    this.state = 'idle';
    this.left = crates;
    this.reveal.setVisible(false);
    this.crate.setVisible(true).setScale(1).setRotation(0).setAlpha(1);
    this.refreshHint();
  }

  private refreshHint(): void {
    if (this.left <= 0) {
      setText(this.hint, 'No crates left. Complete missions to earn more.');
      this.done.setVisible(true);
      this.done.setPosition(this.dimW / 2, this.dimH / 2 + 215);
      this.crate.setAlpha(0.4);
    } else {
      setText(this.hint, `TAP THE CRATE  ·  ${this.left} left`);
      this.done.setVisible(false);
    }
  }

  private dimW = 0;
  private dimH = 0;

  private openOne(): void {
    if (this.state === 'opening' || this.left <= 0) return;
    const res = this.cb.open();
    if (!res) return;
    this.state = 'opening';
    this.left = res.left;
    this.last = res.reward;
    this.reveal.setVisible(false);
    this.again.setVisible(false);
    this.equip.setVisible(false);
    this.done.setVisible(false);
    this.crate.setVisible(true).setAlpha(1);
    this.scene.tweens.add({ targets: this.crate, rotation: { from: -0.14, to: 0.14 }, duration: SHAKE_MS / 6, yoyo: true, repeat: 5 });
    this.scene.tweens.add({ targets: this.crate, scale: 1.18, duration: SHAKE_MS, ease: 'Sine.easeIn' });
    this.scene.time.delayedCall(SHAKE_MS + 30, () => this.showReward(res.reward));
  }

  private showReward(r: CrateReward): void {
    this.state = 'reveal';
    this.crate.setVisible(false);
    const rarity: Rarity | 'xp' = r.kind === 'cosmetic' ? r.item.rarity : 'xp';
    this.cb.burst(this.dimW / 2, this.dimH / 2 - 60, rarity);
    const col = rarity === 'xp' ? PALETTE.uiTeal : RARITY_COLOR[rarity];
    const w = 300;
    const h = 440;
    drawCard(this.revealBg, w, h, PALETTE.uiPaper, 18, col);
    this.revealBg.setPosition(0, 0);
    this.reveal.setVisible(true).setScale(0.6);
    this.scene.tweens.add({ targets: this.reveal, scale: 1, duration: 260, ease: 'Back.easeOut' });

    this.revealHeli.setVisible(false);
    this.revealTrail.setVisible(false).clear();
    this.revealNew.setVisible(false);
    if (r.kind === 'xp') {
      setText(this.revealName, `+${r.amount} XP`);
      setText(this.revealRarity, 'COLLECTION COMPLETE');
    } else {
      const it = r.item;
      this.revealNew.setVisible(true);
      if (it.kind === 'paint') {
        this.revealHeli.setTexture(`heli_${it.id}`).setVisible(true);
        setText(this.revealName, STRINGS.paints[it.id as keyof typeof STRINGS.paints] ?? it.id);
      } else {
        this.revealTrail.setVisible(true);
        const t = this.revealTrail;
        const colors: Record<string, number> = { sparks: 0xf3c44e, bubbles: 0xd6ebe8, smoke: 0x6d7c80, leaves: 0x8fa65a, confetti: 0xd8573e, stars: 0xffffff };
        t.fillStyle(0x34474b, 1).fillRoundedRect(-52, -60, 104, 30, 14);
        for (let i = 0; i < 6; i++) t.fillStyle(colors[it.id] ?? 0xffffff, 1 - i * 0.14).fillCircle(-12 - i * 18, -45 + (i % 2) * 8, 9 - i);
        setText(this.revealName, TRAIL_NAMES[it.id] ?? it.id.toUpperCase());
      }
      setText(this.revealRarity, RARITY_NAME[it.rarity]);
      this.revealRarity.setColor(col);
    }
    this.revealTrail.setPosition(0, -20);
    this.revealName.setPosition(0, 34);
    this.revealRarity.setPosition(0, 64);
    this.revealNew.setPosition(0, -h / 2 + 24);
    const hasItem = r.kind === 'cosmetic';
    this.equip.setVisible(hasItem);
    this.equip.setPosition(0, 124);
    this.again.setVisible(this.left > 0);
    this.again.setPosition(0, hasItem ? 190 : 124);
    this.done.setVisible(true);
    this.done.setPosition(this.dimW / 2, this.dimH / 2 + 250);
    setText(this.hint, this.left > 0 ? `${this.left} more crate${this.left > 1 ? 's' : ''}` : '');
  }

  private doEquip(): void {
    if (this.last?.kind !== 'cosmetic') return;
    this.cb.equip(this.last.item.kind, this.last.item.id);
    this.equip.setVisible(false);
    setText(this.revealRarity, 'EQUIPPED');
  }

  layout(W: number, H: number): void {
    this.dimW = W;
    this.dimH = H;
    this.dim.setSize(W, H);
    this.title.setPosition(W / 2, H / 2 - 230);
    this.hint.setPosition(W / 2, H / 2 + 140);
    this.crate.setPosition(W / 2, H / 2 - 20);
    this.crateZone.setPosition(W / 2, H / 2 - 20);
    this.reveal.setPosition(W / 2, H / 2 - 20);
  }
}
