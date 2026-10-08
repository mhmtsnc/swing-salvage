# Swing Salvage — Claude Code ile kurulum kılavuzu

Bu dosya senin içindir. Claude Code'a sırayla vereceğin 9 faz promptunu ve ondan önce ve sonra senin yapman gerekenleri içerir.
Promptlar Claude Code'un sana hiçbir soru sormadan ilerlemesi için yazıldı. Bütün kararlar `docs/GDD.md`'de.

---

## 0. Başlamadan önce (bir kez, yaklaşık 15 dk)

1. **Node.js 22 veya üstü** kurulu olsun. Kontrol için terminalde `node -v` (LTS önerilir).
2. **Git for Windows** kurulu olsun (Claude Code'un terminali için de gerekli).
3. **Claude Code güncel olsun:** `claude update`. Sonnet 5.5 için v2.1.284 veya üstü gerekir.
4. Bu klasörü `C:\Users\<sen>\Projects\swing-salvage` olarak kopyala. İçinde `CLAUDE.md`, `.claude/settings.json` ve `docs/` olmalı.
5. **Faz 8 için (şimdi de kurabilirsin):** Android Studio Otter (2025.2.1) veya daha yenisi. İlk açılışta SDK Platform 36'yı kurdur. JDK Android Studio ile birlikte gelir.
6. Klasörde terminal aç ve başlat:
   ```
   claude --model sonnet --permission-mode acceptEdits
   ```
   `.claude/settings.json` npm, npx, git ve gradle komutlarına önceden izin verir. Böylece Claude Code her adımda onay istemez. `git push` ve silme komutları kapalıdır.

---

## 1. Nasıl çalıştırılır

**Önerilen yöntem:** her faz ayrı oturumda.
1. Fazın promptunu kopyala ve yapıştır, Claude Code bitirsin. Senden bir şey istemez.
2. Bitince `/usage` yazıp harcamaya bak.
3. `/clear` yaz (bağlam sıfırlanır, bu bedavadır) ve sonraki fazın promptunu yapıştır.

Her fazın sonunda kod commit edilir. Bir faz kötü giderse önceki commit'e dönebilirsin.

**Neden tek seferde değil:** Tek oturumda konuşma geçmişi uzar ve her adımda yeniden okunur. Faz faz gitmek aynı işi daha ucuza yapar. Yine de tek seferde istersen §4'teki MASTER promptu kullan.

---

## 2. Bütçe koruması (65 $)

Aşağıdakiler tahmini tavanlardır, kesin değildir. Toplamı `/usage`'dan izle.

| Faz | Tavan | Birikimli |
|---|---|---|
| F1 Kurulum | 4 $ | 4 |
| F2 Uçuş + halat | 8 $ | 12 |
| F3 Gemi + döngü | 10 $ | 22 |
| F4 Zorluk + hava | 6 $ | 28 |
| F5 Görsel + UI | 9 $ | 37 |
| F6 His + ses | 5 $ | 42 |
| F7 Meta + Daily | 6 $ | 48 |
| F8 Android + reklam | 8 $ | 56 |
| F9 Son kontrol (opsiyonel) | 4 $ | 60 |

**Kesme kuralları:**
- F5 bitince toplam **42 $'ı geçtiyse:** F6'nın promptuna şunu ekle: `OPSİYONEL maddeleri atla.` (rotor ve yağmur döngü sesleri gider)
- F7 bitince toplam **54 $'ı geçtiyse:** F7'deki opsiyonelleri zaten atlamış ol, F9'u hiç çalıştırma.
- Bir faz kendi tavanının **2 katına** çıktıysa Esc ile durdur, `/clear` yap ve aynı promptu başına şu satırı ekleyerek yeniden ver: `Önceki deneme yarım kaldı; git log ve git status ile durumu gör, kaldığın yerden devam et.`

---

## 3. Faz promptları

Her promptu olduğu gibi kopyala.

### F1 — Kurulum ve iskelet

```
CLAUDE.md'yi uygula. Bu oturum Faz 1.

GÖREV
Swing Salvage projesinin iskeletini kur: bağımlılıklar, yapılandırma, ayar dosyaları ve boş ama çalışan Phaser 4 + Matter oyunu.

OKU
docs/GDD.md: §4, §6 (ilk paragraf: sabit 60 Hz adım), §13 (palet tablosu), §16.1 (kimlikler), §17.1, §17.2, §17.3, Ek A, Ek C.

DOSYALAR
package.json, vite.config.ts, tsconfig.json, index.html, .gitignore, src/main.ts,
src/config/{tuning,palette,strings,ads,app}.ts, src/core/{rng,storage,time}.ts,
src/game/Difficulty.ts, src/scenes/{BootScene,GameScene,UIScene}.ts, src/types/zzfx.d.ts,
tests/{rng,difficulty}.test.ts

YAPILACAKLAR
1. Klasörde git yoksa `git init`. §17.1'deki paketlerin hepsini kur:
   - çalışma: phaser@4, zzfx, @fontsource/fredoka, lil-gui, @capacitor/core@8, @capacitor/haptics@8, @capacitor/share@8, @capacitor-community/admob@8
   - dev: typescript, vite, vitest, @capacitor/cli@8, @capacitor/android@8, @capacitor/assets, sharp, matter-js@0.20.0, @types/matter-js
   Capacitor'ı henüz init etme.
2. Vite `base: './'`. TS strict. index.html'de tam ekran canvas: kaydırma yok, dokunmada seçim ve zoom kapalı, `touch-action: none`.
3. tuning.ts'yi Ek A'dan birebir oluştur. Ayrıca `getTuning()` fonksiyonu: TUNING ile localStorage `ss.tuning`'i derin birleştirir.
4. Diğer config dosyaları:
   - palette.ts: §13 tablosu
   - strings.ts: Ek C
   - ads.ts: §16.1, `ADS_TEST_MODE = true`
   - app.ts: `VERSION = '1.0.0'`, `STORE_URL = 'https://play.google.com/store/apps/details?id=com.swingsalvage.game'`, `PRIVACY_URL = 'https://example.com/privacy'`
5. Phaser oyunu:
   - Scale EXPAND 540×960, CENTER_BOTH
   - Matter açık, gravity y = world.gravityY, enableSleeping false
   - BootScene: `@fontsource/fredoka` 500/600/700 import et, `document.fonts.load('700 32px Fredoka')` bekle. Sonra GameScene ve UIScene'i paralel başlat.
6. time.ts: sabit 1/60 sn adımlı biriktirici. GameScene Matter'ı `autoUpdate=false` ile bu biriktiriciyle adımlar. Bir karede en fazla 4 adım.
7. rng.ts: mulberry32 ve string hash.
   - `createRng(seed)` → `{ next(): number, range(a, b), pick(weights) }`
   - `dailySeed(dateStr)`
   - `dailyNumber(date, epoch)`: sonuç ≥ 1
8. storage.ts:
   - §17.3 anahtarları, tipli get/set, hepsi try/catch içinde
   - localStorage yoksa bellekte çalışsın
   - şema `ss.v = 1`
9. Difficulty.ts: `difficultyAt(score)`, Ek A anahtar kareleri arasında lineer interpolasyon, uçlarda sabit.
10. GameScene geçici çizim:
    - gökyüzü rengi zemin
    - `seaY` çizgisinde düz `seaFront` dikdörtgeni
    - ortada "F1 OK" yazısı
    - UIScene boş
11. package.json script'leri (§17.6):
    - dev, build (`tsc --noEmit && vite build`), test (`vitest run`)
    - icons, android:sync, android:open, android:debug (bunlar F8'de çalışacak, şimdiden yaz)
12. Testler: rng (aynı tohum = aynı dizi, farklı tohum = farklı), difficultyAt (0, 2.5, 60, 100).

BİTTİ SAYILIR
- `npm run dev` açılınca dikey tuval ekranı doldurur ve pencere boyutu değişince taşmaz.
- `npm run build`, `npm test`, `npx tsc --noEmit` temiz.
- `git commit -m "faz 1: iskelet"`.

YAPMA
Oynanış, doku çizimi, Capacitor init/android ekleme. Bunlar sonraki fazlarda.
```

### F2 — Uçuş, deniz ve halat

```
CLAUDE.md'yi uygula. Bu oturum Faz 2.

GÖREV
Tek parmak helikopter kontrolü, dalga fonksiyonu, halat, kanca, yüzen kargo ve otomatik kancalama. Geçici basit şekillerle.

OKU
docs/GDD.md: §5, §6.1, §6.2, §6.3, §7.1, §7.5 (sadece F1 SPLASH, CARRIED kısmı), §10.1, §10.3, Ek A.
Gerekirse: node_modules/phaser/skills/physics-matter/SKILL.md, input-keyboard-mouse-touch/SKILL.md.

DOSYALAR
src/game/{Helicopter,Rope,Cargo,Sea}.ts, src/scenes/GameScene.ts, src/core/time.ts

YAPILACAKLAR
1. Sea.ts:
   - `waterY(x, t)` ve `waterYMid(x, t)` (§10.3), genlik parametre olarak alınır
   - 4 katmanı (arka, orta, ön, derin) her karede Graphics ile düz palet renkleriyle çiz. Gölge ve köpük F5'te.
2. Helicopter.ts:
   - §5 göreli sürükleme ve dinamik denklemleri, sınırlar, eğim, yön çevirme
   - geçici çizim: kırmızı yuvarlatılmış dikdörtgen gövde ve kuyruk çubuğu
   - `winchPoint()` dünya koordinatını döndürür
3. Rope.ts:
   - worldConstraint ile halat; `pointA` her sabit adımda vinç noktasına güncellenir
   - boşken sensör kanca gövdesi
   - `attach(body, pointB)` ve `detachToHook()`
   - reelTime ile uzunluk geçişi
   - çizim: sarkık kuadratik eğri (§6.1)
4. Cargo.ts:
   - kargo tipleri Ek A'dan
   - yüzen kargo sprite'ı dalgayla oynar (§10.3), geçici çizim: renkli dikdörtgen
   - kancalanınca dinamik gövde oluştur (§6.3)
   - durumlar: `FLOATING | CARRIED | SETTLING | STACKED`
5. Otomatik kancalama (§7.1).
6. Rüzgâr altyapısı (§10.1): `toStepVel` ve `toStepAcc` yardımcıları. Rüzgâr şimdilik 0.
7. CARRIED kargo için SPLASH kontrolü (carriedGrace ile). Şimdilik geçici: konsola "FAIL splash" yaz ve kargoyu ve helikopteri başlangıca döndür.
8. Test için tek yüzen kargo: x = doğma bölgesi ortası. Kanca bırakılınca aynı yerde yenisi doğsun.
9. `?debug=1`: Matter debug çizimi ve sol üstte FPS ile durum yazısı.

BİTTİ SAYILIR
- Fareyle sürükleyince helikopter gecikmeyle takip eder ve hızlı durunca kargo sallanır.
- Kanca kargoya değince kargo kancalanır, taşınırken sallanır, suya batırılınca "FAIL splash" olur.
- Fizik ekran tazeleme hızından bağımsız: adım sayacı kare hızına değil zamana bağlı.
- build, test, tsc temiz. `git commit -m "faz 2: ucus ve halat"`.

YAPMA
Gemi, puan, menü, gerçek görseller, ses.
```

### F3 — Gemi, istif, puan ve oyun döngüsü

```
CLAUDE.md'yi uygula. Bu oturum Faz 3.

GÖREV
Yalpalayan gemi, otomatik bırakma, oturma, PERFECT, puan, başarısızlıklar, durum makinesi, anında yeniden başlama ve gemi değişimi. Oyun baştan sona oynanabilir hale gelsin (geçici görsellerle).

OKU
docs/GDD.md: §3, §6.4, §7.2–§7.7, §12 (skor ve rekor), §17.4 (debug=stack), Ek A.

DOSYALAR
src/game/{Ship,shipModel,Run,placement,Spawner}.ts, src/game/Cargo.ts, src/scenes/{GameScene,UIScene}.ts, tests/{placement,stack}.test.ts

YAPILACAKLAR
1. shipModel.ts (saf, Phaser'sız):
   - gemi parça ölçüleri
   - `shipPose(t, params)`
   - slot merkezlerini ve noktaları gemi dönüşümüyle dünya koordinatına çeviren yardımcılar
2. Ship.ts:
   - shipModel'i kullanarak §6.4 birleşik statik gövde ve yalpalama (birincil yöntem, `this.matter.body.setPosition/setAngle(..., true)`)
   - geçici çizim: gövde, köprü, güverte ve slot işaretleri düz renk
3. tests/stack.test.ts (§6.4 kabul testi):
   - başsız, `matter-js` ve shipModel ile
   - FAIL olursa önce Ek A sürtünme ve iterasyon değerlerini makul aralıkta ayarla, olmazsa yedek yönteme geç
   - sonucu ve değişen değerleri DECISIONS.md'ye yaz
   - görsel karşılığı `?debug=stack` sahnesi (basit)
4. placement.ts: saf `classifyPlacement(input)` → `{perfect, hard, alignDx, angleDeg, impact}` (§7.4) ve testleri.
5. Run.ts:
   - durum makinesi `READY / PLAYING / SWAPPING / FAILING / GAME_OVER / PAUSED`
   - skor, seri, gemi indeksi, kota
   - bırakma (§7.2), oturma (§7.3), başarısızlık F1 SPLASH (ön ve orta çizgi), F2 CRASH ve F3 TOPPLE (§7.5)
   - FAILING yavaş çekim: timeScale ve kamera kaydırma
6. Spawner.ts:
   - `spawnRng` ile tip ağırlıkları, gold sınırı ve konum aralığı (§7.7)
   - `nextSpawnDelay`
   - kota dolunca doğurmayı durdur
7. Gemi değişimi (§7.6): istifi dekora çevir, çıkış ve giriş tween'leri, gemi bonusu.
8. Anında yeniden başlama:
   - AGAIN durumu sıfırlar: gövdeleri temizler, helikopteri başlangıca koyar, ilk kargoyu doğurur
   - sahne yeniden başlatılmaz, < 300 ms
   - rekor `ss.best`'e kaydedilir
9. UIScene geçici:
   - üstte büyük skor yazısı
   - READY'de "Drag anywhere to start"
   - GAME_OVER'da "SPLASH!/CRASH!/TOPPLED!", skor, rekor ve "AGAIN" dokunma alanı
   - giriş kilidi `gameOverInputLock`
   Son tasarım F5'te.

BİTTİ SAYILIR
- Baştan sona oynanır: kancala, taşı, istifle, puan al, 5. kargoda gemi değişir. Suya düşürünce, istifi devirince veya gemiye çarpınca oyun biter. AGAIN anında yeniden başlatır.
- stack.test.ts PASS (birincil veya yedek yöntemle).
- placement testleri geçer, build, test, tsc temiz. `git commit -m "faz 3: oyun dongusu"`.

YAPMA
Ani rüzgâr, yağmur, şimşek, son görseller, ses, reklam.
```

### F4 — Zorluk eğrisi ve hava

```
CLAUDE.md'yi uygula. Bu oturum Faz 4.

GÖREV
Skora bağlı zorluk ve adil uyarılı fırtına: temel rüzgâr, ani rüzgâr, yalpa, dalga, kargo havuzu, yağmur ve şimşek.

OKU
docs/GDD.md: §8, §9, §10 (tamamı), §2 (P3), Ek A (difficulty, weather).

DOSYALAR
src/game/{Weather,Difficulty,Spawner,Ship,Sea,Run}.ts, src/scenes/GameScene.ts, tests/difficulty.test.ts

YAPILACAKLAR
1. Her karede `difficultyAt(score)` sonucunu uygula:
   - gemi yalpa genliği ve periyodu
   - dalga genliği
   - yağmur yoğunluğu
   - kargo havuzu (minScore)
   Değerler yumuşak değişsin: hedefe 1 sn'de lerp.
2. Weather.ts:
   - `weatherRng` (spawnRng'den ayrı)
   - gemi başına temel rüzgâr yönü
   - ani rüzgâr zamanlayıcısı (gustFromScore, aralık ve jitter), uyarı → etki → bitiş durumları
   - kargoya, kancaya, helikoptere ve istife uygulanan ivmeler (§10.2)
   - SWAPPING sırasında zamanlayıcı durur
3. Uyarı görseli (geçici ama okunur):
   - geldiği kenardan 6–8 beyaz şerit akar
   - kenarda "≫" etiketi
   - `onGustWarn`, `onGustStart`, `onGustEnd` olayları (F6 ses için)
4. Yağmur: iki TileSprite geçici çizgi deseniyle, alfa = rain.
5. Şimşek: skor ≥ 10'da zamanlayıcı, beyaz flaş ve geçici şimşek şekli, `onThunder` olayı.
6. Debug: `?score=N` koşuyu N puanla başlatır (§17.4).
7. Testler: difficultyAt ara değerler ve gust aralığı sınırları.

BİTTİ SAYILIR
- `?score=0`'da sakin; `?score=20`'de belirgin yalpa, ani rüzgâr öncesi 1 sn uyarı, şimşek.
- Aynı tohumla iki koşuda kargo sırası ve ani rüzgâr zamanları aynı.
- build, test, tsc temiz. `git commit -m "faz 4: zorluk ve hava"`.

YAPMA
Son görseller, ses, meta, reklam.
```

### F5 — Görsel stil (B · Kâğıt Kesik) ve bütün ekranlar

```
CLAUDE.md'yi uygula. Bu oturum Faz 5.

GÖREV
Bütün geçici çizimleri "B · Kâğıt Kesik" stiline çevir ve §11'deki bütün ekranları kur.

OKU
docs/GDD.md: §11 (tamamı), §13 (tamamı), Ek B, Ek C.
docs/art/mockup-b.html: renkler, yollar ve HUD ölçüleri. Sadece ihtiyacın olan id'leri oku.
Gerekirse: node_modules/phaser/skills/render-textures/SKILL.md, text-and-bitmaptext/SKILL.md, tweens/SKILL.md.

DOSYALAR
src/art/{paths,textures}.ts, src/game/{Helicopter,Ship,Sea,Cargo,Weather}.ts (sadece render),
src/ui/{components,ReadyScreen,Hud,GameOverPanel,PausePanel,HangarScreen,SettingsScreen,Onboarding}.ts, src/scenes/UIScene.ts

YAPILACAKLAR
1. paths.ts: mockup'taki helikopter, bulut, şimşek ve yağmur yollarını string sabit olarak taşı.
2. textures.ts:
   - Canvas2D, Path2D ve pişmiş kâğıt gölgesiyle (§13 Kural 2) bütün dokular
   - 6 boya için `heli_<paint>`
   - `cargo_<tip>` fizik ölçüsünde
   - kanca, rotor, kuyruk rotoru, bulutlar, şimşek, yağmur, kâğıt şerit, damla, konfeti
3. Render:
   - dalgalar kâğıt katmanı (gölge, renk, köpük; §13 Kural 3)
   - gemi parçaları §6.4 geometrisiyle ve palet renkleriyle, slot köşe işaretleri
   - helikopter gövde, rotor animasyonu (scaleX = cos) ve kuyruk rotoru
   - halat rengi ve kalınlığı
4. UI bileşenleri: kâğıt kart, buton (basınca 0,95), ikon çizimleri (§13 ikon listesi), toggle.
5. Ekranlar:
   - READY, HUD, PAUSED, GAME_OVER, HANGAR, SETTINGS (§11.1–11.5)
   - SECOND CHANCE butonu bileşen olarak var ama `ads.canOfferRewarded()` false olduğu için gizli
   - HANGAR şimdilik sadece rescue açık
   - SETTINGS: ses ve titreşim toggle'ları `ss.settings`'e kaydeder
6. Onboarding.ts: 3 ipucu, her biri bir kez (§11.6, `ss.onboard`).
7. Otomatik duraklatma: `visibilitychange`.
8. Ani rüzgâr uyarısı ve yağmur son görsellerine geçsin.

BİTTİ SAYILIR
- Oyun mockup-b.html'deki görünüme benzer. Bütün ekranlara gidilip dönülebilir. Dokunma alanları ≥ 48 px. Metinler strings.ts'den.
- build, test, tsc temiz. `git commit -m "faz 5: kagit kesik gorsel ve ekranlar"`.

YAPMA
Ses, titreşim, partikül efektleri (F6), Daily ve boya kilitleri (F7), reklam (F8).
```

### F6 — His (juice) ve ses

```
CLAUDE.md'yi uygula. Bu oturum Faz 6.

GÖREV
§14'teki olay → efekt tablosunun her satırını uygula: ses, titreşim, partikül, sarsıntı ve uçan yazılar.

OKU
docs/GDD.md: §14 (tamamı), §7.3 (seri perdesi), §7.5 (FAILING dizisi), §11.2 (uçan yazılar).
node_modules/zzfx/README.md (parametre sırası). Gerekirse: node_modules/phaser/skills/particles/SKILL.md.

DOSYALAR
src/core/{audio,haptics}.ts, src/game/Fx.ts, ilgili oyun ve UI dosyalarındaki olay bağlantıları

YAPILACAKLAR
1. audio.ts:
   - §14'teki her ses için isimli ZzFX sabiti
   - `play(name, {pitchSemitones?})`
   - ana ses seviyesi 0,6
   - ilk dokunmada `ZZFX.audioContext.resume()`
   - ses kapalıyken hiçbir şey çalmaz
2. haptics.ts:
   - Capacitor native ise `@capacitor/haptics`, değilse `navigator.vibrate`
   - `light | medium | heavy | success`
   - ayardan kapatılabilir
3. Fx.ts:
   - partikül havuzları: damla, toz, konfeti, ışıltı
   - kamera sarsıntısı (sadece GameScene kamerası)
   - kargo ölçek "pop" efekti
   - suçluyu kırmızı yanıp söndürme
   - kâğıt etiketli uçan yazılar
4. Olay bağlantıları: tablodaki her satır ilgili olaya bağlansın. PERFECT perdesi seriye göre +1 yarım ton, en fazla +8.
5. OPSİYONEL: rotor ve yağmur döngü sesleri (§14 döngü sesleri). Bütçe uyarısı verildiyse atla.

BİTTİ SAYILIR
- §14 tablosundaki bütün satırlar çalışıyor. Ses ve titreşim ayarları uyuluyor. Sekme gizlenince sesler susuyor.
- build, test, tsc temiz. `git commit -m "faz 6: his ve ses"`.

YAPMA
Meta, Daily, reklam.
```

### F7 — Meta: madalya, boyalar, Daily Storm, paylaşım ve tuning paneli

```
CLAUDE.md'yi uygula. Bu oturum Faz 7.

GÖREV
Geri gelme sebepleri: madalyalar, ömür boyu istatistik, boya kilitleri, Daily Storm (günde 3 deneme), paylaşım ve tuning paneli.

OKU
docs/GDD.md: §11.4 (mesaj önceliği ve Daily düzeni), §11.5, §12, §15 (tamamı), §17.3, §17.4.

DOSYALAR
src/core/{daily,share,unlocks,tuningPanel}.ts, src/game/Run.ts, src/ui/{GameOverPanel,ReadyScreen,HangarScreen,SettingsScreen,Hud}.ts,
tests/{daily,share,unlocks}.test.ts

YAPILACAKLAR
1. Koşu sonunda istatistiği güncelle:
   - `ss.stats`: koşu, sandık, perfect, madalyalar, bestShip
   - madalya hesabı ve ilk kez kazanım tespiti
2. unlocks.ts:
   - saf `evaluateUnlocks(stats, daily)` → açık boyalar
   - `nextUnlockProgress(stats)` → mesaj için
   - testleri
3. GAME_OVER mesaj önceliği §11.4 ve §15.1'e göre. NEW BEST, madalya animasyonu ve konfeti olaylarını tetikle.
4. HANGAR gerçek kilitlerle çalışsın. Seçim `ss.paint`'e kaydedilsin ve helikopter dokusu anında değişsin.
5. daily.ts:
   - tarih (UTC), seed, Daily #N
   - 3 deneme sayacı, günün en iyisi, oynanan günler
   - `spawnRng` ve `weatherRng` daily tohumundan
   - HUD'da "DAILY #N", READY'deki DAILY butonunda "#N · k left"
6. share.ts:
   - saf `buildShareText(run, mode)` (§15.3 biçimi, 20 sembol sınırı, +k)
   - native'de `@capacitor/share`, web'de `navigator.share` veya pano ile "Copied!"
   - testleri
7. tuningPanel.ts:
   - `?tune=1` veya Settings'te sürüme 7 dokunuş
   - lil-gui dinamik import
   - Save, Reset, Copy JSON (§17.4)
8. OPSİYONEL: daily seri (streak) sayacı ve PAPER ile GOLD boyaları. Bütçe uyarısı verildiyse atla, DECISIONS'a yaz.

BİTTİ SAYILIR
- Rekor, madalya ve kilit mesajları doğru sırayla görünür. Boya seçilir. Daily günde 3 kez oynanır, sonra "PLAY NORMAL". Paylaşım metni doğru. Tuning paneli kaydeder ve geri yükler.
- daily, share, unlocks testleri geçer. build, test, tsc temiz. `git commit -m "faz 7: meta ve daily"`.

YAPMA
Reklam ve Android (F8).
```

### F8 — Android paketi ve reklamlar

```
CLAUDE.md'yi uygula. Bu oturum Faz 8.

GÖREV
Capacitor Android projesini kur. AdMob'u test kimlikleriyle bağla: onay formu, SECOND CHANCE ödüllü reklam, seyrek geçiş reklamı. İkonları ve splash'ı üret, yayın kılavuzunu yaz.

OKU
docs/GDD.md: §16 (tamamı), §17.6, §11.4 (SECOND CHANCE), §11.5 (Privacy options).
node_modules/@capacitor-community/admob/README.md: kurulum, onay, reward ve interstitial bölümleri.

DOSYALAR
capacitor.config.ts, android/ (üretilen), src/core/{ads,pacing}.ts, src/config/ads.ts, src/game/Run.ts,
src/ui/{GameOverPanel,SettingsScreen}.ts, tests/pacing.test.ts, scripts/make-icons.mjs, assets/, docs/RELEASE.md

YAPILACAKLAR
1. Capacitor:
   - `npx cap init "Swing Salvage" com.swingsalvage.game --web-dir dist`
   - capacitor.config.ts §17.6
   - `npx cap add android`
2. Android ayarları:
   - MainActivity `android:screenOrientation="portrait"`
   - strings.xml `admob_app_id` (test ID)
   - manifest meta-data (README'ye göre)
   - versionCode 1, versionName 1.0.0
3. ads.ts:
   - `AdService` (native) ve `NoopAdService` (web), `Capacitor.isNativePlatform()` ile seçilir
   - açılış: onay akışı, initialize, iki reklamı önceden yükleme, gösterim sonrası yeniden yükleme
   - hata olursa sessizce Noop gibi davran, oyunu asla kilitleme
4. SECOND CHANCE (§16.2):
   - şartlar, ödül gelirse RESUMING akışı
   - suçlu kargonun kaldırılması, güvenli nokta, 1 sn yavaş başlama ve başarısızlık bağışıklığı
5. pacing.ts:
   - saf `shouldShowInterstitial(ctx)` (§16.3) ve testleri
   - AGAIN'de çağrılır, reklam kapanınca koşu başlar
6. Settings'te "Privacy options" (native) → `showPrivacyOptionsForm()`. "Privacy policy" linki → PRIVACY_URL.
7. İkonlar:
   - `scripts/make-icons.mjs` sharp ile `docs/art/icon-foreground.svg` ve `icon-background.svg`'den `assets/` PNG'lerini üretir (§17.6)
   - `npm run icons` → `npx @capacitor/assets generate --android`
8. `npm run android:sync` çalışsın. Java ve Android SDK varsa `npm run android:debug` ile debug APK üret. Yoksa bu adımı atla ve RELEASE.md'ye yaz, hata sayma.
9. docs/RELEASE.md (Türkçe, adım adım, kullanıcı için):
   - telefonda test (web: `npm run dev -- --host`; APK: Android Studio Run)
   - AdMob hesabı ve gerçek kimliklerin nereye yazılacağı (`src/config/ads.ts`, strings.xml), `ADS_TEST_MODE=false`
   - imzalama: Android Studio "Generate Signed Bundle", Play App Signing
   - gizlilik politikası barındırma ve PRIVACY_URL
   - Play Console: 25 $ hesap, kimlik doğrulama, Data safety, içerik derecelendirme, hedef kitle 13+, reklam beyanı
   - 12+ test kullanıcısı ile 14 gün kapalı test (15–20 kişiyle başla), sonra production başvurusu
   - her güncellemede versionCode artırma

BİTTİ SAYILIR
- `npm run android:sync` hatasız. Web build'de reklam kodu hiçbir şey göstermez ve hata vermez.
- pacing testleri geçer, build, test, tsc temiz. RELEASE.md eksiksiz.
- `git commit -m "faz 8: android ve reklam"`.

YAPMA
Gerçek AdMob kimliği uydurma. Keystore veya şifre oluşturma. git push.
```

### F9 — Son kontrol ve cila (OPSİYONEL)

```
CLAUDE.md'yi uygula. Bu oturum Faz 9 (son).

GÖREV
docs/GDD.md §19'daki "oyun bitti" maddelerini tek tek doğrula ve eksikleri kapat. Uç durumları düzelt.

OKU
docs/GDD.md §19, §2. docs/DECISIONS.md.

YAPILACAKLAR
1. §19'daki 8 maddenin her biri için kodda karşılığını bul. Eksik olanı tamamla.
2. Uç durumlar:
   - gemi değişimi sırasında duraklatma ve uygulama arka plana geçince devam
   - SECOND CHANCE'in SWAPPING ve FAILING ile çakışmaması
   - localStorage kapalıyken oyunun çalışması
   - çok uzun (20:9) ve geniş (tablet) ekranlarda yerleşim
   - hızlı çift dokunmada iki koşu başlamaması
   - yavaş çekim bitmeden AGAIN'e basılamaması
3. Performans:
   - partiküller havuzdan gelsin
   - her karede yeni nesne üretimini azalt
   - üretim build'inde console.log kalmasın, debug bayrakları sadece URL'den açılsın
4. DECISIONS.md'yi gözden geçir, eksik kararları ekle.
5. Son: build, test, tsc temiz. `git commit -m "v1.0.0"` ve `git tag v1.0.0`.

BİTTİ SAYILIR
§19'daki 8 madde sağlandı, testler ve build temiz, etiket atıldı.

YAPMA
Yeni özellik ekleme. Kapsam dışı (§18) hiçbir şey.
```

---

## 4. MASTER prompt (tek seferde yapmak istersen)

Daha pahalı olabilir: bağlam büyür ve otomatik sıkıştırma devreye girer. Bunu seçersen F5'ten sonra `/usage`'a bak.

```
CLAUDE.md'yi uygula. docs/PROMPTS.md içindeki F1'den F8'e kadar olan fazları sırayla uygula; her fazın "OKU", "YAPILACAKLAR", "BİTTİ SAYILIR" ve "YAPMA" bölümlerine uy.
- Bir fazın "BİTTİ SAYILIR" maddeleri sağlanmadan sonrakine geçme. Her faz sonunda commit at.
- Bana hiçbir soru sorma. Belirsizlikte GDD ile tutarlı en basit çözümü seç ve DECISIONS.md'ye yaz.
- Aynı hatayı 3 denemede çözemezsen en basit çalışan alternatifi uygula, DECISIONS.md'ye yaz, devam et.
- OPSİYONEL maddeleri atla. F9'u yapma.
- Bitince en fazla 10 satırlık özet yaz.
```

---

## 5. Oyun bitince senin yapacakların

1. **Telefonda oyna:**
   - En kolayı: bilgisayarda `npm run dev -- --host`, telefonda aynı Wi‑Fi'de gösterilen adresi aç.
   - APK için: `npm run android:open` → Android Studio → Run.
2. **Hissi ayarla (kredi harcamadan):**
   - Settings'te sürüm yazısına 7 kez dokun → tuning paneli açılır.
   - Rüzgâr, halat ve bırakma eşiklerini oynayarak ayarla → **Copy JSON**.
   - Bu JSON'u Claude Code'a "Bu değerleri src/config/tuning.ts varsayılanlarına işle" diyerek ver. Tek kısa görev, ucuz.
3. **AdMob:** Hesap aç, uygulama ekle, ödüllü ve geçiş reklam birimi oluştur. Kimlikleri `src/config/ads.ts` ve `strings.xml`'e yaz (RELEASE.md'de nerede olduğu var). `ADS_TEST_MODE = false`.
4. **Gizlilik politikası sayfası:** Reklam olduğu için zorunlu. Örneğin GitHub Pages'te yayınla, linki `PRIVACY_URL`'e yaz.
5. **Google Play:**
   - 25 $ geliştirici hesabı ve kimlik doğrulama
   - mağaza sayfası
   - 15–20 kişiyle 14 günlük kapalı test (en az 12 kişi kesintisiz kalmalı)
   - production başvurusu
6. **İsim:** Yayından önce Play Store'da "Swing Salvage" adının boş olduğunu kontrol et. `appId` (`com.swingsalvage.game`) ilk yüklemeden sonra değiştirilemez. Değiştirmek istersen F8'den önce `capacitor.config.ts`'de değiştir.
