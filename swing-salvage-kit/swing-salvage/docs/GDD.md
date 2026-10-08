# SWING SALVAGE — Oyun Tasarım Dokümanı (GDD) v1.0

> **Tek doğruluk kaynağı bu dosyadır.** Kod ile bu doküman çelişirse doküman kazanır.
> Bütün sayılar **Ek A**'daki `TUNING` nesnesindedir; kodda sihirli sayı kullanılmaz, her değer `src/config/tuning.ts`'den okunur.
> Belirsiz bir nokta kalırsa: GDD ile tutarlı **en basit** çözümü seç, `docs/DECISIONS.md`'ye tek satır yaz, devam et. Kullanıcıya soru sorma.

---

## 1. Özet

| | |
|---|---|
| **Tür** | Tek parmakla oynanan, fizik tabanlı "bir el daha" arcade oyunu |
| **Fikir** | Fırtınada helikopterle denize düşmüş kargoları kancayla al, sallanan halatın ucunda taşı ve yalpalayan geminin güvertesine yumuşakça istifle. Tek hata oyunu bitirir: denize düşen kargo, devrilen istif veya gemiye çarpan helikopter. |
| **Platform** | Android (Google Play) ana hedef; aynı build tarayıcıda da çalışır (test ve itch.io için) |
| **Yön** | Dikey (portrait), tek el |
| **Dil** | Oyun içi bütün metinler İngilizce (Ek C). Kod yorumları İngilizce veya Türkçe olabilir. |
| **Oturum** | Bir koşu 20 saniye ile 3 dakika arası. Yeniden başlatma anında. |
| **Gelir** | AdMob: ödüllü "Second Chance" ve seyrek geçiş reklamı. Satın alma yok (v1). |
| **Görsel** | "B · Kâğıt Kesik" stili: katmanlı kâğıt, yumuşak gölgeler. Referans: `docs/art/mockup-b.html`. |

**Tasarım cümlesi:** *Flappy Bird kadar basit kontrol, Stack kadar tatmin edici yerleştirme, fırtına kadar öngörülemez ama her ölüm oyuncunun kendi hatası.*

---

## 2. Bağımlılık ilkeleri (araştırmadan çıkan kurallar)

Her ilke koda dönüşen somut bir kuraldır. Bir özellik bu kurallardan birini bozuyorsa o özellik yanlıştır.

| # | İlke | Somut kural |
|---|---|---|
| P1 | **Tek girdi** | Oyunun tamamı tek parmak sürüklemesiyle oynanır. Bırakma ve kancalama butonu YOK, ikisi de otomatik (§6). |
| P2 | **3 saniyede öğren** | Öğretici ekran yok. İlk açılışta sadece hayalet el animasyonu ve 3 kısa ipucu (§11.6). |
| P3 | **Ölüm net ve adil** | (a) Ani rüzgâr 1 sn önceden görsel ve sesle haber verilir. (b) Ölüm anında 0,7 sn yavaş çekim ve suçlu kargoya kırmızı vurgu. (c) Rastgelelik tohumlu RNG'den gelir, oyuncunun hareketi kargo sırasını değiştirmez. |
| P4 | **Anında yeniden başla** | Game over paneli ölümden en geç 1,2 sn sonra açılır. AGAIN'e basınca 300 ms içinde oyun yeniden başlar: sahne yeniden yüklenmez, durum sıfırlanır. Yükleme ekranı yok. |
| P5 | **Tek sayı** | Ekranda tek büyük skor sayısı. Rekor, madalya ve "NEW BEST!" var. |
| P6 | **Kısa döngü, artan baskı, nefes anı** | Kargo başına yaklaşık 6–12 sn. Zorluk skorla artar. Her gemi dolunca 3 sn'lik "gemi değişimi" molası verilir (§7.6). |
| P7 | **Tatmin** | Her eylemin sesi, titreşimi ve görsel tepkisi vardır (§14). Art arda PERFECT yerleştirmede sesin perdesi yükselir (Stack'teki gibi). |
| P8 | **Kıl payı** | Game over ekranında rekora yakınsan "So close! 2 away from your best" yazar. Kilit açmaya yakınsan "18 more crates to unlock MINT" yazar. |
| P9 | **Reklam döngüyü bozmaz** | İlk 4 koşuda geçiş reklamı yok. En az 150 sn ve 3 koşu arayla gösterilir. Ödüllü reklam sadece oyuncu isterse açılır (§16). |
| P10 | **Paylaşılabilir an** | Daily Storm: herkes için aynı tohum, günde 3 deneme, spoiler vermeyen emoji sonuç satırı (§15.3). |
| P11 | **Güç satın alınmaz** | Yükseltme ve para birimi yok. Kilitler sadece kozmetik (helikopter boyası). Skor saf beceriyi gösterir. |

---

## 3. Oyun döngüsü

```
READY (başlık ekranı, helikopter havada bekler)
  └─ parmak sürüklenince → PLAYING
PLAYING:
  kargo denizde yüzüyor → kancayı değdir (otomatik kancalama)
  → sallanan kargoyu gemiye taşı → güverteye/istifin üstüne değdir (otomatik bırakma)
  → kargo oturur → puan → yeni kargo denizde belirir
  → gemi kotası dolunca → SHIP FULL! → gemi değişimi (3 sn mola) → devam
  → kargo suya değer VEYA istif devrilir VEYA helikopter gemiye/istife çarpar → FAILING (yavaş çekim)
FAILING → GAME_OVER paneli
GAME_OVER → AGAIN (anında yeni koşu) | SECOND CHANCE (ödüllü reklam, koşuya devam) | SHARE | HOME
```

Durum makinesi: `BOOT → READY → PLAYING ⇄ PAUSED → FAILING → GAME_OVER → (PLAYING | RESUMING → PLAYING | READY)`
`PLAYING` içinde alt durum: `SWAPPING` (gemi değişimi).

---

## 4. Ekran, dünya ve yerleşim

- **Mantıksal çözünürlük:** taban 540×960. Phaser `Scale.EXPAND`, `autoCenter: CENTER_BOTH`. Uzun telefonlarda yükseklik büyür (≈1170'e kadar), tablette genişlik büyür. Kodda her zaman `W = scale.width`, `H = scale.height` kullanılır.
- **Sabitlenme:** Deniz ve gemi alttan, HUD üstten sabitlenir. Gökyüzü aradaki boşluğu doldurur.
- **Oynanış su seviyesi:** `seaY = H - world.seaFromBottom`. Ön dalga katmanının ortalama yüksekliği budur.
- **Koordinatlar:** y aşağı doğru artar. Gemi koordinatları sola sabitlidir (W'den bağımsız). Kargo doğma bölgesi W'ye göre hesaplanır.
- **Katman sırası (arkadan öne):**
  1. gökyüzü
  2. arka bulut
  3. şimşek
  4. ön bulut
  5. rüzgâr şeritleri
  6. arka deniz
  7. gemi (gövde, köprü, istif)
  8. orta deniz
  9. yüzen kargo
  10. ön deniz ve köpük
  11. derin deniz
  12. salınım izi
  13. halat
  14. taşınan kargo ve kanca
  15. helikopter
  16. partiküller ve uçan yazılar
  17. yağmur
  18. HUD ve menüler (ayrı sahne: `UIScene`; kamera sarsıntısı HUD'u etkilemez)

---

## 5. Kontrol (tek parmak)

**Göreli sürükleme (trackpad gibi):** Parmak ekrana değdiğinde `fingerStart` ve `targetStart = target` kaydedilir. Parmak hareket ettikçe `target = targetStart + (finger - fingerStart) * heli.dragRatio`. Parmak kalkınca hedef olduğu yerde kalır ve helikopter orada asılı durur. Helikopter parmağın altında değildir, böylece parmak oyunu kapatmaz.

**Helikopter dinamiği (her sabit adımda, dt = 1/60):**
```
desiredV = clampLength((target - pos) * followGain, maxSpeed)
accel    = clampLength((desiredV - vel) / accelTau, maxAccel * handling)   // handling: taşınan kargonun tipinden, boşta 1.0
vel     += accel*dt + windAccelOnHeli*dt        // windAccelOnHeli = (wind + gust) * heli.windResponse
pos     += vel*dt
pos.x   ∈ [marginX, W - marginX],  pos.y ∈ [minY, seaY - maxYAboveSea]   // sınıra değerse o eksendeki hız 0
target  de aynı sınırlara kırpılır
```
- **Görsel eğim:** `tilt → clamp(vel.x * tiltPerVx, ±tiltMax)`, `tiltSmooth` hızında yumuşatılır. Burun gidiş yönüne bakar (sprite `flipX`). Yön değişimi `|vel.x| > flipHysteresisVx` olunca olur.
- **Vinç noktası** (halatın dünya çapası): `pos + rotate((0, winchOffsetY), tilt)`.
- Gecikmeli takip ve ivme sınırı kargoyu doğal olarak sallar. Becerinin özü bu sallantıyı ters hareketle sönümlemektir.

---

## 6. Fizik (Matter, Phaser 4 içindeki)

**Dünya:** `gravity.y = world.gravityY`. İterasyonlar Ek A'da. **Sabit 60 Hz adım**, ekran tazeleme hızından bağımsız olmalı (120 Hz telefonlarda oyun hızlanmamalı): biriktirici (accumulator) ile `matter.step(1000/60)`. Uyku (sleeping) **kapalı**.

### 6.1 Halat
- Matter `worldConstraint`: `pointA` = dünya koordinatında vinç noktası (her adımda güncellenir), `pointB` = bağlı gövdenin üst-orta noktası (`{x:0, y:-h/2}`). Gövde boştayken kancadır.
- `length = rope.length`, `stiffness = rope.stiffness`, `damping = rope.damping`.
- Kancalamadan sonra uzunluk o anki mesafeden `rope.length`'e `rope.reelTime` sürede doğrusal geçer. Bu ani silkelemeyi önler.
- Çizim: vinçten bağlantı noktasına hafif sarkık kuadratik eğri (kontrol noktası orta noktanın 6 px altı). Renk ve kalınlık Ek B'de.

### 6.2 Kanca
- Boşken halatın ucunda `hook.radius` yarıçaplı, `isSensor: true` daire gövde. Yerçekimiyle sallanır, hiçbir şeye çarpmaz.

### 6.3 Kargolar
- Yüzen kargo **fizik gövdesi değildir**, sadece dalgayla oynayan bir sprite'tır (§10.3).
- Kancalanınca: aynı konum ve açıyla dinamik dikdörtgen gövde oluşturulur (`chamfer` ile köşe yuvarlatma). Kanca gövdesi kaldırılır ve halat bu gövdeye bağlanır. Kanca sprite'ı kargonun üst-orta noktasında çizilir.
- Ortak malzeme `cargoCommon`'da, tip özellikleri `cargo.<tip>`'te (Ek A). Sprite boyutu fizik boyutuyla **birebir aynıdır**.

### 6.4 Gemi (kinematik yalpalama)
- **Birleşik statik gövde** ve parçaları (gemi yerel koordinatı değil, dünya koordinatı; `deckY = seaY - ship.deckAboveSea`):
  - gövde levhası: x [-40, 288], y [deckY, deckY+24]
  - köprü: x [bridgeLeftX, deckLeftX], y [deckY - bridgeHeight, deckY]
  - pruva dudağı: x [deckRightX, deckRightX + lipWidth], y [deckY - lipHeight, deckY]
- **Sürtünme:** `ship.friction` ve `ship.frictionStatic` birleşik gövdenin **ebeveynine** (parent) verilir. Matter temas çiftlerinde parçaların değil ebeveynin sürtünmesini kullanır. Statik yapmak için gövdeyi parçalarla oluşturduktan sonra `setStatic(true)` çağır.
- **Yalpalama:** `θ(t) = rad(rollAmpDeg) * sin(2πt / rollPeriod)`. Dalga: `heave(t) = heaveAmp * sin(4πt / rollPeriod + 1)`. Dönme merkezi: `(pivotX, seaY - pivotAboveSea)`.
- **Birincil yöntem:** Her adımda gövdenin konumu ve açısı dönme merkezi etrafında hesaplanır ve `Body.setPosition(body, p, true)` ile `Body.setAngle(body, a, true)` uygulanır (`updateVelocity = true`, böylece temas sürtünmesi kargoları taşır). Phaser 4'te ham Matter API'si `this.matter.body` üzerinden erişilir. Phaser 4.2 içindeki Matter sürümü 0.20.0'dır.
- **Geometri ve poz saf modülde:** Gemi parçalarının ölçüleri ve `shipPose(t, params) → {x, y, angle}` hesabı `src/game/shipModel.ts`'te saf fonksiyonlar olarak durur. Hem oyun hem test bunu kullanır.
- **Kabul testi (zorunlu, `tests/stack.test.ts`, başsız):** `matter-js@0.20.0` (Phaser'daki ile aynı sürüm) ve `shipModel.ts` ile oyunla aynı gemi gövdesini ve sandıkları kur. Oyunla aynı malzeme ve iterasyonları kullan, 60 Hz sabit adımla simüle et.
  - **Kurulum:** Önce 1 sn yalpasız oturt. Sandıklar `crate` (72×56), slot merkezleri 110 ve 210, `seaY = 740`.
  - **Ani rüzgâr:** Periyodik yatay ivme uygula: `gustForce * gustAccelPerUnit * stackGustFactor`, her `gustInterval` sn'de `gustDuration` boyunca, yönü her seferinde değişsin.
  - **Ölçüt:** "devrilme" = §7.5 F3 TOPPLE. "Kayma" = gemi yerel koordinatında başlangıca uzaklık.
  - Senaryolar:

    | | İstif | Parametreler | Süre | Beklenen |
    |---|---|---|---|---|
    | (a) | 2+2+1 düzgün | skor 10 (3,5°, 4,1 sn, ani rüzgâr 0,9) | 30 sn | devrilme yok, kayma ≤ 10 px |
    | (b) | 2+2+1 düzgün | skor 60 (6,5°, 3,3 sn, ani rüzgâr 1,7) | 30 sn | devrilme yok, kayma ≤ 20 px |
    | (c) | tek üst sandık sağ sütunda, +30 px kaydırılmış (ağırlık merkezi kenarın 6 px içinde) | yalpasız | 10 sn | devrilme yok |
    | (c2) | aynı istif | skor 60 parametreleri | 30 sn | devrilmeli |
    | (d) | üst sandık +40 px kaydırılmış (ağırlık merkezi desteğin dışında) | yalpasız | 1 sn | devrilmeli |

  - Bu değerler Ek A varsayılanlarıyla bu GDD yazılırken matter-js 0.20.0'da denendi ve geçti. Kendi testin geçmiyorsa önce gövde ve malzeme kurulumunun bu tarifle aynı olduğunu kontrol et.
- **Yedek yöntem (kabul testi geçmezse):** Gemiyi çok ağır (`density 0.5`) dinamik bir gövde yap. İki sert `worldConstraint` ile dönme merkezine sabitle. Yalpalamayı açısal hız hedefine doğru tork ile sür. Hangi yöntemin seçildiğini DECISIONS.md'ye yaz.
- **Görsel:** Gemi sprite'ları aynı dönüşümle (dönme merkezi, θ, heave) çizilir. Fizik ve görsel hep eşleşir.

---

## 7. Kurallar

### 7.1 Kancalama (otomatik)
Kanca merkezi, yüzen kargonun **üst-orta noktasına** `hook.pickupRadius` mesafeden yakınsa kargo kancalanır (§6.3). Ses: `pickup`. Titreşim: hafif. Kargonun durumu `CARRIED` olur, `pickedAt` zamanı kaydedilir.

### 7.2 Bırakma (otomatik)
`CARRIED` kargo gemiye (herhangi bir parçasına) veya `SETTLING/STACKED` bir kargoya **kesintisiz `rules.releaseContactTime` sn** değiyorsa ve bu süre boyunca hızı `< rules.releaseMaxSpeed` ise halat çözülür. Kargo `SETTLING` olur. Halat boş kancayla kendi uzunluğuna döner. Bırakma anında **yerleşim kalitesi** ölçülür (§7.4). Ses: `release`.
- Bırakmadan `nextSpawnDelay = 0.4 sn` sonra yeni yüzen kargo doğar. Gemi kotası dolduysa yeni kargo doğmaz (§7.6).

### 7.3 Oturma ve puan
`SETTLING` kargo gemiye veya istife temas ederken hızı `< settleMaxSpeed` ve açısal hızı `< settleMaxAngSpeed` olarak **kesintisiz `settleTime` sn** kalırsa `STACKED` olur ve puan verilir.
- **Temel puan:** `cargo.<tip>.points`
- **PERFECT:** +`perfectBonus` puan. Seri sayacı +1 olur. Ses perdesi her seride +1 yarım ton yükselir (en fazla +8).
- **STEADY HANDS:** Her `steadyEvery`'nci ardışık PERFECT'te +`steadyBonus` ekstra puan ve banner.
- PERFECT olmayan her yerleştirme seriyi sıfırlar.

### 7.4 PERFECT ölçütü (bırakma anında, saf fonksiyon: `classifyPlacement`)
Aşağıdaki üçü birlikte sağlanmalı:
1. **Hizalama:** Kargonun altında başka bir kargo varsa (alt kenarı, diğerinin üst kenarına 8 px yakın ve yatayda örtüşen en üstteki kargo) merkezler arası `|dx| ≤ perfectMaxDx`. Doğrudan güvertedeyse en yakın slot merkezine (`ship.slotCentersX`, gemiyle birlikte dönüştürülmüş) `|dx| ≤ perfectMaxDx`. Kargo genişliği ≥ 100 px ise (wide, piano) hedef iki slot merkezinin ortasıdır.
2. **Açı:** Kargo ile altındaki yüzey arasındaki açı farkı `≤ perfectMaxAngleDeg`.
3. **Yumuşaklık:** Bırakmadan önceki temas penceresinde ölçülen en yüksek çarpma hızı `≤ perfectMaxImpact`.
- Çarpma hızı `≥ rules.hardLandingImpact` ise "sert iniş" efekti verilir (§14). Bu bir ceza değildir, sadece efekttir.

### 7.5 Başarısızlık (anında koşuyu bitirir)
- **F1 · SPLASH:** Kargonun gövde sınırının en alt noktası su çizgisinin `rules.waterMargin` px altına inerse koşu biter. `x` kargonun merkez x'idir.
  - `CARRIED` kargo (kancalandıktan `carriedGrace` sn sonra): ön çizgi `waterY(x,t)`. Taşınan kargo bütün deniz katmanlarının önünde çizilir.
  - `SETTLING` ve `STACKED` kargo: orta çizgi `waterYMid(x,t)`. Bu kargolar gemi katmanında, orta dalganın arkasında çizilir. Böylece kargo görünmez olmadan başarısızlık tetiklenir.
- **F2 · CRASH:** Helikopter hitbox'ı (`hitboxW×hitboxH`, merkezde, döndürülmez) şunlardan biriyle kesişirse koşu biter: köprü parçasının sınırları, direk dikdörtgeni (x [mastX-5, mastX+5], y [deckY-mastHeight, deckY-bridgeHeight], gemi dönüşümüyle) veya herhangi bir `SETTLING/STACKED` kargonun sınırları.
- **F3 · TOPPLE ("kuleye dokunma" kuralı):** `STACKED` bir kargo şu durumlardan birine girerse koşu biter:
  - gemi yerel koordinatında, oturduğu andaki konumundan `rules.toppleDrop` px'ten fazla aşağı iner
  - açısı oturduğu andaki açıdan `rules.toppleAngleDeg`'den fazla değişir

  Tipik sebepler: sallanan kargoyla istife çarpmak veya desteği zayıf bir sandığın büyük yalpada devrilmesi. Düzgün istifler yalpa ve ani rüzgârla kendiliğinden devrilmez (§6.4 testi). Risk oyuncunun hatasından gelir.
- Başka başarısızlık yok: yakıt yok, süre yok.
- **FAILING dizisi:**
  1. `timeScale = fx.failSlowMo`, `fx.failSlowMoTime` (gerçek zaman) boyunca.
  2. Kamera suçlu noktaya %35 kayar ve 1.06'ya zoom yapar.
  3. Suçlu kargo en ön katmana alınır, 3 kez kırmızı yanıp söner. Helikopter suçluysa o yanıp söner.
  4. Türüne göre partikül ve ses (`splash`, `crash` veya `topple`), ağır titreşim.
  5. Ardından GAME_OVER paneli 250 ms'de aşağıdan kayarak gelir.
  6. Panelin girdisi `fx.gameOverInputLock` sn kilitli kalır (yanlışlıkla dokunmaya karşı).

### 7.6 Gemi kotası ve değişim (nefes anı)
- Gemi `i` (0'dan başlar) için kota `ship.quota[min(i, quota.length-1)]` = 5, 6, 7, sonra hep 7. Bu sınır, 16:9 ekranda istif yüksekliğinin ulaşılabilir kalması içindir (en fazla yaklaşık 4 kat).
- `STACKED` sayısı kotaya ulaştığında ve hiç `SETTLING` kargo kalmadığında `SWAPPING` başlar:
  - "SHIP FULL! +2" banner'ı, korna sesi, konfeti.
  - İstifteki kargolar statik dekora çevrilir: fizik gövdeleri kaldırılır, sprite'lar gemi konteynerine bağlanır.
  - Eski gemi `swapExitTime` sn'de sola çıkar (x −560, easeIn). Yeni boş gemi soldan `swapEnterTime` sn'de girer (easeOut).
  - Bu sürede ani rüzgâr zamanlayıcısı durur, kargo doğmaz, helikopter serbesttir. Değişim bitince ilk kargo doğar.
- Gemi başına `shipBonus` puan verilir.

### 7.7 Kargo doğurma (tohumlu)
- **Tip:** Skora göre açılmış tiplerden (`minScore ≤ skor`) ağırlıklı rastgele seçilir. `gold` gemi başına en fazla 1 kez gelir.
- **Konum:** `x ∈ [bowTipX + 20 + w/2, W - 20 - w/2]`, `bowTipX = 310`. Bir önceki x'e `spawn.minSeparation`'dan yakınsa bir kez yeniden çekilir.
- Doğarken küçük bir sıçrama partikülü ve `spawn` sesi çıkar.

---

## 8. Kargo tipleri

| id | Ad (oyunda) | Boyut (px) | Davranış | Açılış skoru | Görsel (Ek B) |
|---|---|---|---|---|---|
| `crate` | CRATE | 72×56 | Standart | 0 | Hardal sandık, 2 tahta çizgisi |
| `wide` | LONG CRATE | 116×44 | Geniş, üstüne istif kolay ama sallanırken döner | 5 | Zeytin yeşili uzun sandık |
| `barrel` | BARREL | 50×72 | Uzun ve dar, kolay devrilir | 9 | Ahşap kahve fıçı, 2 koyu çember |
| `gold` | TREASURE | 62×46 | Nadir, 3 puan, gemi başına 1 | 7 | Altın sandık, ışıltı partikülü |
| `piano` | PIANO | 104×70 | Ağır, helikopteri yavaşlatır (handling 0.75), 2 puan | 14 | Koyu piyano, beyaz tuş şeridi |

---

## 9. Zorluk eğrisi

- Bütün zorluk parametreleri **skorun** fonksiyonudur. `TUNING.difficulty` anahtar karelerinde lineer interpolasyonla hesaplanır (saf fonksiyon: `difficultyAt(score)`). 60'ın üstünde son kare sabit kalır.
- **Ani rüzgâr** `weather.gustFromScore` (4) skorundan önce yoktur. **Şimşek** `weather.lightningFromScore`'dan önce yoktur.
- İlk iki kargo (skor 0–1) neredeyse sakindir. Oyuncu öğrenirken ölmesin ama 5. kargodan itibaren hissetsin.

| Skor | Temel rüzgâr | Ani rüzgâr aralığı | Ani rüzgâr gücü | Yalpa | Dalga | Yağmur | Yeni kargo |
|---|---|---|---|---|---|---|---|
| 0 | yok | — | — | ±1,5° | 5 px | %20 | crate |
| 5 | hafif | 9 sn | 0,6 | ±2,5° | 8 px | %40 | +wide |
| 10 | orta | 7,5 sn | 0,9 | ±3,5° | 11 px | %60 | +gold(7), +barrel(9) |
| 20 | belirgin | 6,5 sn | 1,2 | ±4,5° | 14 px | %80 | +piano(14) |
| 35 | sert | 5,5 sn | 1,45 | ±5,5° | 17 px | %100 | hepsi |
| 60+ | fırtına | 5 sn | 1,7 | ±6,5° | 20 px | %100 | hepsi |

---

## 10. Hava ve deniz

### 10.1 Rüzgâr
- **Temel rüzgâr** gemi başına bir yön seçer (tohumlu ±1). Taşınan kargoya ve kancaya `windBase * windAccelPerUnit` px/s² yatay ivme uygular. Helikoptere bunun `heli.windResponse` katını uygular.
- Matter hızları adım başına px'tir. İvmeyi saniye cinsinden tut, uygularken `v += a/60` çevir. Yardımcı fonksiyonlar: `toStepVel`, `toStepAcc`.

### 10.2 Ani rüzgâr (gust), adil uyarıyla
- **Aralık:** `gustInterval * (1 ± gustIntervalJitter)` (tohumlu). **Yön:** tohumlu ±1.
- **Uyarı (`gustTelegraph` = 1,0 sn önce):**
  - Rüzgârın geldiği kenardan beyaz kâğıt şeritleri ekrana akmaya başlar.
  - O kenarın orta yüksekliğinde "≫" ikonlu kâğıt etiketi belirir.
  - `gust_warn` sesi yükselerek çalar.
- **Etki:** `gustDuration` boyunca (`gustRamp` ile yumuşak giriş ve çıkış):
  - taşınan kargo ve kancaya `gustForce * gustAccelPerUnit`
  - helikoptere bunun `windResponse` katı
  - `STACKED/SETTLING` kargolara bunun `stackGustFactor` katı (özensiz istif sallanır)
- Uyarı başladıktan sonra iptal edilmez. Gemi değişimi sırasında zamanlayıcı durur.

### 10.3 Dalgalar
- **Tek fonksiyon** (render ve fizik kontrolü ikisi de bunu kullanır): `waterY(x,t) = seaY + A * (0.6*sin(0.018x - 1.3t) + 0.4*sin(0.041x + 0.9t))`, burada `A = waveAmp`.
- **Arka katmanlar** aynı formülle, faz kaydırarak ve genliği küçülterek çizilir:
  - arka: `seaY - 112`, genlik ×0,5
  - orta: `seaY - 46`, genlik ×0,7
  - derin: `seaY + 110`, genlik ×0,4
- Orta katmanın yüzey fonksiyonu `waterYMid(x,t)` olarak ayrıca dışa açılır (§7.5 F1 bunu kullanır).
- **Yüzen kargo:**
  - merkez y = `waterY(x,t) - 0.1h`
  - açı = `clamp(0.4 * atan(eğim), ±0.35)`
  - hafif yatay salınım: ±4 px, 3 sn periyot

### 10.4 Yağmur ve şimşek
- **Yağmur:** İki `TileSprite` katmanı (Ek B'deki desen). Kayma hızı (-90, 520) px/s ve (-60, 380) px/s. Alfa = `rain` × (1,0 ve 0,6).
- **Şimşek** (skor ≥ 10): Her `lightningMin..lightningMax` sn'de (tohumlu):
  - gökyüzünde rastgele x'te şimşek sprite'ı 180 ms görünür
  - tüm ekranda beyaz flaş (alfa 0,35 → 0, 250 ms)
  - 300 ms sonra `thunder` sesi
- Şimşeğin oynanışa etkisi yoktur.

---

## 11. Ekranlar ve arayüz akışı

Bütün UI `UIScene`'de, **kâğıt kart** bileşenleriyle kurulur:
- zemin `#F7F3EA`, köşe yarıçapı 14
- gölge: (0, +3) `#1D2C2E` α0,18 ve (0, +6) bulanık α0,18
- yazı `#24353A`
- font Fredoka

Dokunma alanı en az 48×48. Metinler Ek C'den gelir.

### 11.1 READY (başlık)
- Oyun sahnesi canlı arkada: gemi yalpalar, helikopter hafifçe süzülür, ilk kargo denizde.
- **Logo kartı** üst-ortada (y = 150), −2° eğik: "SWING SALVAGE" (700, 40 px). Altında "BEST 24" (600, 16 px).
- **Ortada:** hayalet el sürükleme animasyonu ve "Drag anywhere to start" (500, 18 px, nabız gibi atan alfa).
- **Altta** (y = H − 120), üç kart buton (88×76, ikon ve etiket):
  - **DAILY:** takvim ikonu, alt satırda "#12 · 3 left"
  - **HANGAR:** helikopter ikonu
  - **SETTINGS:** dişli ikonu
- Butonlar dışında herhangi bir yerde sürükleme başlarsa koşu **anında** başlar ve aynı sürükleme helikopteri kontrol eder.

### 11.2 HUD (PLAYING)
- **Üst orta:** Skor kartı (min 84×60, sayı 700, 38 px).
  - Altında 6 px boşlukla "SHIP 2 · 3/6" (600, 14 px).
  - Onun altında seri noktaları: `steadyEvery` kadar küçük daire. Dolu olanlar `#BF4630`, boşlar `#F7F3EA` ve ince kenarlı.
- **Sol üst:** "BEST 24" kartı (yükseklik 40). Daily modunda yerine "DAILY #12".
- **Sağ üst:** Duraklat butonu (48×48 kart, iki dikey çubuk ikonu).
- **Ani rüzgâr uyarısı:** İlgili kenarda "≫" etiketi (§10.2).
- **Uçan yazılar:** Kâğıt etiket içinde, yerleşen kargonun üstünde 0,9 sn boyunca 40 px yükselip söner:
  - `"+{n}"`, `"+{n} PERFECT"`, `"+3 STEADY HANDS!"`, `"SHIP FULL +2"` (n = o yerleştirmenin toplam puanı)
  - Sayı rengi `#BF4630` (700, 24 px), etiket metni `#24353A` (600, 12 px).

### 11.3 PAUSED
- Ekran `rgba(36,53,58,0.35)` ile karartılır. Ortada kart: "PAUSED", **RESUME** (kırmızı büyük buton), **HOME**.
- Uygulama arka plana geçince (`visibilitychange`) otomatik duraklar.

### 11.4 GAME_OVER paneli (alttan kayar, genişlik 360, merkez y = 0.47H)
1. **Başlık:**
   - SPLASH için "SPLASH!" (700, 32 px, `#BF4630`) ve "Cargo lost at sea"
   - CRASH için "CRASH!" ve "Watch the ship!"
   - TOPPLE için "TOPPLED!" ve "Your stack fell over"
2. **Satır:** solda madalya (72 px kâğıt daire, madalya rengi, altında adı; madalya yoksa soluk boş daire), sağda "SCORE" 13 px / değer 52 px, "BEST" 13 px / değer 24 px. Yeni rekorda "NEW BEST!" rozeti, konfeti ve `new_best` sesi.
3. **Mesaj satırı** (15 px, `#5B6E70`), öncelik sırasıyla tek mesaj:
   1. ilk kez kazanılan madalya: "First GOLD medal!"
   2. kıl payı: "So close! 2 away from your best"
   3. kilit ilerlemesi: "18 more crates to unlock MINT"
   4. hiçbiri yoksa: "Crates delivered: 9"
4. **Butonlar:**
   - **AGAIN:** tam genişlik 300×64, `#BF4630` zemin, beyaz yazı, 26 px. Panelin en alt-ortasında, başparmağın olduğu yerde.
   - **SECOND CHANCE:** AGAIN'in üstünde, yalnızca şartlar sağlanırsa (§16.2). `#477779` zemin, beyaz yazı, oynat ikonu, alt satırda "watch an ad".
   - **Küçük kartlar (alt sıra):** SHARE, HOME.
5. **Daily modunda:** SHARE öne çıkar (kırmızı çerçeve), "2 tries left today" yazar. Deneme kalmadıysa AGAIN'in metni "PLAY NORMAL" olur ve normal koşu başlatır.

### 11.5 HANGAR ve SETTINGS
- **HANGAR:**
  - 2×3 ızgara boya kartı. Her kartta o renkte helikopter ikonu, ad ve durum ("SELECTED" / "TAP TO USE" / kilit ikonu ve şart metni + ilerleme "42/100").
  - Kilidi açık karta dokununca seçilir, helikopter dokusu anında değişir.
  - **BACK** butonu.
- **SETTINGS:**
  - Sound (açık/kapalı), Haptics (açık/kapalı)
  - "Privacy options" (sadece native, `showPrivacyOptionsForm`)
  - "How to play" (onboarding ipuçlarını sıfırlar)
  - Alt köşede sürüm metni "v1.0.0". Sürüme 7 kez dokunmak tuning panelini açar veya kapatır (§17.4).

### 11.6 İlk açılış ipuçları (her biri bir kez, storage'da işaretlenir)
1. **drag:** Hayalet el helikopterin altında sağ-sol sürükleme çizer. "Drag anywhere to fly". İlk sürüklemede kaybolur.
2. **hook:** Yüzen kargonun üstünde zıplayan kâğıt ok ve "Hook it!". İlk kancalamada kaybolur.
3. **drop:** Güvertede slot köşelerinde yanıp sönen çerçeve ve "Set it down gently". İlk puanda kaybolur.

---

## 12. Skor, rekor, madalya

- **Skor** = §7.3 puanları + gemi bonusları. Tam sayıdır.
- **Madalyalar:** bronze ≥ 10, silver ≥ 25, gold ≥ 45, platinum ≥ 70 (`TUNING.medals`).
  - Renkler: bronz `#C47F45`, gümüş `#A9B4B8`, altın `#E8AE3C`, platin `#CFE6E4`. Platinde ışıltı partikülü var.
- **Rekor:** Normal mod rekoru (`ss.best`) ve günlük rekor (`ss.daily.best`) ayrı tutulur.
- **Ömür boyu istatistik:** koşu sayısı, teslim edilen sandık, perfect sayısı, kazanılan madalyalar (§15.2, kayıt §17.3).

---

## 13. Görsel stil (B · Kâğıt Kesik)

**Referans:** `docs/art/mockup-b.html`. Tarayıcıda açılır. 390 px genişlikteki bir telefonda hedef görünüm budur. İçindeki SVG `path` verileri doğrudan kullanılabilir. Mockup ölçeğinden oyun ölçeğine çarpan `S = 540/390 ≈ 1.385`.

**Kural 1 · Sıfır görsel dosya.** Bütün dokular açılışta kodla üretilir (`src/art/textures.ts`):
- Canvas 2D ve `new Path2D(svgPathString)` kullanılır, Phaser'a canvas texture olarak eklenir.
- Phaser 4'te canvas texture API'sini `node_modules/phaser/skills/` altından kontrol et.

**Kural 2 · Kâğıt gölgesi.** Her oyun nesnesi dokusunda gölge pişirilir:
- `ctx.shadowColor = 'rgba(29,44,46,0.30)'`, `shadowOffsetY = 3`, `shadowBlur = 5`
- Doku tuvaline gölge payı için her kenardan 8 px boşluk bırak.

**Kural 3 · Katmanlı dalga.** Her dalga katmanı her karede `Graphics` ile çizilir:
1. önce aynı çokgen (0, −3) kaydırılmış olarak `#1D2C2E` α0,18 (arka katmana düşen gölge)
2. sonra katman rengi
3. sonra üst kenarda `#F4F1E8` köpük çizgisi (4 px, yuvarlak uç)

**Palet** (`src/config/palette.ts`):

| Anahtar | Hex | Kullanım |
|---|---|---|
| sky | #BCCBC7 | gökyüzü zemini |
| cloudBack | #A3B5B1 | arka bulut |
| cloudFront | #E9ECE4 | ön bulut |
| lightning | #F3C44E | şimşek |
| seaBack | #86AFA9 | arka deniz |
| seaMid | #659592 | orta deniz |
| seaFront | #477779 | ön deniz |
| seaDeep | #2E5A5F | derin deniz |
| foam | #F4F1E8 | köpük çizgileri |
| shadow | #1D2C2E | tüm gölgeler |
| heliRed | #D8573E | varsayılan helikopter |
| heliGlass | #D6EBE8 | camlar |
| ink | #34474B | rotor, kızak, kanca, koyu parçalar |
| crate | #E8AE3C / #B98221 | sandık / tahta çizgisi |
| wide | #8FA65A / #667A3C | uzun sandık |
| barrel | #8C5A3C / #34474B | fıçı / çember |
| gold | #F3C44E / #B98221 | hazine |
| piano | #24353A / #F2ECDF | piyano / tuşlar |
| hull | #2F4858 | gemi gövdesi |
| hullStripe, bridge | #F2ECDF | şerit, köprü |
| deck | #CDB497 | güverte |
| roof | #D8573E | köprü çatısı, direk lambası |
| rope | #5A4636 | halat |
| uiPaper | #F7F3EA | kartlar |
| uiText | #24353A | ana yazı |
| uiTextSoft | #5B6E70 | ikincil yazı |
| uiRed | #BF4630 / #8E3322 | ana buton / buton tabanı |
| uiTeal | #477779 | ikincil buton |

**Dokular** (anahtar → tarif):
- `heli_<paint>`: Mockup'taki helikopter yolları (gövde, kuyruk kanadı, camlar, alt gölge %16 siyah, kapı çizgisi, kızaklar) `heli.spriteScale` ile çizilir, burun sola bakar. Gövde rengi = boya rengi. Ana rotor ayrı doku: `ink` renkli 192×6 şerit, yuvarlak uç. Kuyruk rotoru ayrı doku. 6 boya için 6 doku üretilir.
- **Rotor animasyonu:** Ana rotor şeridinin `scaleX = cos(t*42)`, böylece dönüyormuş gibi görünür. Üstünde 2 soluk beyaz yay (α0,5). Kuyruk rotoru `rotation += 30*dt`.
- `cargo_<tip>`: Fizik boyutunda yuvarlatılmış dikdörtgen.
  - Sağ kenarda 6 px'lik %12 siyah gölge şeridi.
  - Tip detayları: sandıklarda 2 yatay tahta çizgisi ve 1 çapraz; fıçıda 2 çember; piyanoda alt bantta beyaz tuş şeridi ve 7 siyah tuş çizgisi; hazinede kapak çizgisi ve kilit.
- `hook`: `ink` renkli 16×13 blok ve altında küçük J kanca.
- **Gemi parçaları:** §6.4 geometrisiyle birebir.
  - gövde `hull`, gövde şeridi `hullStripe` (güvertenin 11–19 px altı)
  - köprü `bridge`, 3 pencere `hull` renginde, çatı `roof`
  - direk `ink` ve tepesinde `roof` lamba
  - güverte `deck`
  - slot işaretleri: her slot için kesik çizgili köşe parantezleri, `hull` renginde α0,5
- `cloud_back`, `cloud_front`: Mockup bulut yolları, genişlik W'ye ölçeklenir.
- `bolt`: Mockup şimşek yolu.
- `rain_a`, `rain_b`: Mockup yağmur desenleri, `S` ile ölçeklenir.
- `paper_strip`: Rüzgâr şeridi, 80×4 beyaz, yuvarlak uç.
- `drop`: Su damlası partikülü. `confetti`: 6×10 kâğıt, palet renklerinden.

**Tipografi:** Fredoka 500, 600, 700, `@fontsource/fredoka` ile paketlenir (çevrimdışı çalışır). Boot'ta `document.fonts.load('700 32px Fredoka')` beklenir.

**İkonlar:** Kodla çizilen basit çizgi ikonlar: oynat, duraklat, takvim, helikopter, dişli, paylaş, ev, kilit, ≫. Çizgi 2,2 px, yuvarlak uç.

---

## 14. Geri bildirim (juice): olay → efekt tablosu

| Olay | Görsel | Ses (ZzFX) | Titreşim |
|---|---|---|---|
| Kargo doğdu | küçük sıçrama | `spawn`: kısa yumuşak "plop" | — |
| Kancalama | kargo 80 ms ölçek 1,08 → 1 | `pickup`: tiz metalik "tık" | hafif |
| Bırakma | — | `release`: boğuk "tup" | — |
| Yumuşak iniş | 4 kâğıt toz partikülü | `land`: tahta "tok", perde kargo boyutuna göre | hafif |
| Sert iniş (≥220) | ekran sarsıntısı `shakeHard` px 120 ms, 8 toz | `land_hard`: tok ve pes | orta |
| PERFECT | kâğıt ışıltı halkası, uçan yazı | `perfect`: parlak çan, seri başına +1 yarım ton | orta |
| STEADY HANDS | banner ve konfeti | `steady`: 3 notalı arpej | başarı |
| Ani rüzgâr uyarısı | şeritler ve "≫" etiketi | `gust_warn`: 1 sn yükselen hışırtı | — |
| Şimşek | flaş ve şimşek sprite'ı | `thunder`: pes gümbürtü 1,2 sn | — |
| SHIP FULL | banner ve konfeti | `horn`: iki tonlu gemi kornası 0,6 sn | başarı |
| SPLASH | büyük damla partikülü, yavaş çekim | `splash`: gürültülü sıçrama 0,5 sn | ağır |
| CRASH | toz ve parçacık, yavaş çekim | `crash`: çıtırtı ve gümbürtü | ağır |
| TOPPLE | devrilen kargo kırmızı yanıp söner, yavaş çekim | `topple`: tahta takırtısı ve düşüş | ağır |
| NEW BEST | konfeti ve rozet | `new_best`: 4 notalı fanfar | başarı |
| Madalya | madalya 0,3 sn büyüyerek gelir | `medal`: zil | hafif |
| UI dokunma | buton 0,95 ölçek | `tap`: kısa tık | — |

**Döngü sesleri** (WebAudio, `ZZFX.audioContext` paylaşılır):
- **Rotor:** 2 sn'lik döngü beyaz gürültü → lowpass 220 Hz → kazanç. Kazanç 16 Hz LFO ile %50 modüle edilir. LFO frekansı helikopter hızına göre 14 → 20 Hz arasında değişir. Ses seviyesi 0,05.
- **Yağmur:** gürültü → highpass 800 Hz → lowpass 6 kHz, ses seviyesi `0.05 * rain`.
- Ses bağlamı ilk dokunmada `resume()` edilir. Ses kapalıyken hiçbir ses çalmaz.
- ZzFX parametreleri: `node_modules/zzfx/README.md`'deki sıraya göre tasarla ve `src/core/audio.ts`'de isimli sabitlerde tut. Her ses ≤ 1,2 sn. Ana ses seviyesi 0,6.

**Titreşim:** Native'de `@capacitor/haptics` (`impact` Light/Medium/Heavy, `notification` Success). Web'de `navigator.vibrate(10 / 20 / 40)`. Ayarlardan kapatılabilir.

---

## 15. Meta (kozmetik ve günlük)

### 15.1 Boyalar (helikopter rengi)

| id | Ad | Renk | Şart |
|---|---|---|---|
| rescue | RESCUE RED | #D8573E | başlangıç |
| sunny | SUNNY | #F3C44E | ömür boyu 30 sandık |
| mint | MINT | #5FB7A5 | ömür boyu 100 sandık |
| navy | NAVY | #2F4858 | ömür boyu 250 sandık |
| paper | PAPER | #F2ECDF | 5 farklı günde Daily Storm oynamak |
| gold | GOLD | #D9A82E | platin madalya kazanmak |

Yeni kilit açıldığında game over panelinde "New paint unlocked: MINT!" yazar ve bu mesaj §11.4'teki mesaj önceliğinin başına geçer.

### 15.2 İstatistik
`runs`, `cratesLifetime`, `perfectsLifetime`, `bestShip`, `medals {bronze, silver, gold, platinum}`. Settings'te görünmez. Sadece kilit ilerlemesi ve mesajlar için kullanılır.

### 15.3 Daily Storm
- **Tohum:** `hash("SS-" + UTC tarih YYYY-MM-DD)`. Daily #N = `max(1, daily.epochUtc'den bu yana geçen gün + 1)`.
- Günde `daily.attemptsPerDay` (3) deneme. Günün en iyisi kaydedilir. Seri sayacı (art arda günler) tutulur.
- **Aynı tohum** şunları belirler: kargo tipleri ve x sırası, rüzgâr yönleri, ani rüzgâr zamanlaması, şimşek. Ayrı RNG akışları kullanılır: `spawnRng`, `weatherRng`. Fizik sonuçları oyuncuya göre değişebilir, bu normaldir.
- **Paylaşım metni** (saf fonksiyon `buildShareText`):
```
Swing Salvage · Daily Storm #12
📦 23 pts · 🚢 3 ships · ⭐ 4 perfect
🟧🟧⭐🟧🟧⭐🟧🟧🟧⭐⭐🟧💦
<STORE_URL>
```
  - Her teslim edilen kargo 🟧, PERFECT olan ⭐ ile gösterilir.
  - Son karakter ölüm türüdür: 💦 SPLASH, 💥 CRASH, 🙃 TOPPLE.
  - En fazla 20 sembol gösterilir, fazlası "+k" olarak yazılır.
  - Normal modda başlık "Swing Salvage · I scored 23!" olur, satır yine aynı biçimdedir.
- **Paylaşım yolu:** Native'de `@capacitor/share`. Web'de varsa `navigator.share`, yoksa panoya kopyala ve "Copied!" bildirimi göster.

---

## 16. Gelir (AdMob) — sadece native'de

### 16.1 Altyapı
- **Eklenti:** `@capacitor-community/admob` (MIT, Capacitor 8 uyumlu). Tam API için eklentinin README'sine bak.
- `src/core/ads.ts`'de `AdService` arayüzü:
  - `init()`
  - `canOfferRewarded(): boolean`
  - `showRewarded(): Promise<boolean>`
  - `maybeShowInterstitial(ctx): Promise<void>`
  - `showPrivacyOptions()`
- **Web'de `NoopAdService`:** ödüllü reklam yok, SECOND CHANCE butonu hiç görünmez.
- **Açılış akışı (native):**
  1. `requestConsentInfo()`
  2. `isConsentFormAvailable && status === REQUIRED` ise `showConsentForm()`
  3. `canRequestAds` ise `initialize()`
  4. ödüllü ve geçiş reklamını önceden yükle (`prepareRewardVideoAd`, `prepareInterstitial`)
  5. her gösterimden sonra yeniden yükle
- **Kimlikler** `src/config/ads.ts`'de. `ADS_TEST_MODE = true` varsayılandır ve Google demo kimliklerini kullanır:
  - App ID (strings.xml `admob_app_id`): `ca-app-pub-3940256099942544~3347511713`
  - Rewarded: `ca-app-pub-3940256099942544/5224354917`
  - Interstitial: `ca-app-pub-3940256099942544/1033173712`
  - Gerçek kimlikler için boş alanlar (`REAL_APP_ID`, `REAL_REWARDED_ID`, `REAL_INTERSTITIAL_ID`) yorumla işaretlenir. Kullanıcı yayından önce kendisi doldurur.

### 16.2 SECOND CHANCE (ödüllü)
- **Gösterilme şartları:** native, skor ≥ `ads.secondChanceMinScore`, bu koşuda henüz kullanılmamış ve reklam yüklü.
- **Ödül gelirse (RESUMING):**
  1. Suçlu kargo kaldırılır (taşınan kargoysa yenisi doğar). TOPPLE'da referans konumundan `toppleDrop`'tan fazla uzaklaşmış bütün kargolar kaldırılır.
  2. Helikopter güvenli noktaya gelir: x = doğma bölgesinin ortası, y = `max(minY, seaY − 420)`, hız 0.
  3. Halat boş kancaya döner. O an taşınan bir kargo varsa o da kaldırılır ve yenisi doğar.
  4. 1,0 sn boyunca `timeScale` 0,3 → 1 artar ve bu sürede başarısızlık kontrolü kapalıdır.
  5. Bağışıklık bitince kalan bütün `STACKED` kargoların referans konumu ve açısı yeniden alınır (yanlış TOPPLE olmasın).
  6. Koşu devam eder: skor, seri ve gemi korunur.
- Reklam başarısız olur veya ödülsüz kapanırsa panel olduğu gibi kalır.

### 16.3 Geçiş reklamı (saf fonksiyon `shouldShowInterstitial`)
- **Zamanlama:** AGAIN'e basıldığında, yeni koşu başlamadan önce gösterilir. Bunun için şu şartların hepsi gerekir:
  - oturumda biten koşu sayısı ≥ `interstitialMinSessionRuns`
  - son geçiş reklamından beri koşu sayısı ≥ `interstitialEveryRuns`
  - son geçiş reklamından beri ≥ `interstitialMinGapSec` sn geçmiş
  - biten koşu ≥ `interstitialMinRunSec` sn sürmüş
  - bu game over'da ödüllü reklam izlenmemiş
- Reklam kapanınca koşu başlar.
- **Banner ve açılış reklamı yok.**

### 16.4 Politika notları
Hedef kitle 13+ olacak (çocuklara yönelik değil). Reklam butonları açıkça "watch an ad" diye etiketlenir. Gizlilik politikası URL'si `src/config/app.ts`'de (`PRIVACY_URL`), Settings'te link olarak gösterilir.

---

## 17. Teknik mimari

### 17.1 Yığın (bu sürümler veya aynı ana sürümün yenisi)
- **Çalışma zamanı:** `phaser@4.2.x` (içindeki Matter fiziği), `typescript@5`, `vite@8`
- **Native:** `@capacitor/core|cli|android@8`, `@capacitor-community/admob@8`, `@capacitor/haptics@8`, `@capacitor/share@8`
- **Ses, font, ayar:** `zzfx@1.4` (tipi yok: `src/types/zzfx.d.ts` yaz), `@fontsource/fredoka@5`, `lil-gui@0.21` (sadece tuning paneli, dinamik import)
- **Dev:** `vitest@4`, `@capacitor/assets@3`, `sharp` (ikon üretimi), `matter-js@0.20.0` ve `@types/matter-js` (sadece başsız istif testi)
- **Gereksinim:** Node ≥ 22. Bu listenin dışında bağımlılık **ekleme**.
- **Phaser 4 API'sinden emin değilsen:** önce `node_modules/phaser/skills/<konu>/SKILL.md` oku (ör. `physics-matter`, `scale-and-responsive`, `render-textures`, `input-keyboard-mouse-touch`, `tweens`, `particles`). v3 hafızasıyla tahmin etme.

### 17.2 Dosya yapısı
```
index.html  vite.config.ts (base: './')  tsconfig.json  capacitor.config.ts  package.json
src/main.ts
src/config/   tuning.ts  palette.ts  strings.ts  ads.ts  app.ts (VERSION, STORE_URL, PRIVACY_URL)
src/core/     rng.ts  storage.ts  audio.ts  haptics.ts  ads.ts  share.ts  daily.ts  pacing.ts  tuningPanel.ts  time.ts
src/art/      paths.ts (mockup SVG yolları)  textures.ts
src/game/     Helicopter.ts  Rope.ts  Cargo.ts  Ship.ts  shipModel.ts  Sea.ts  Weather.ts  Difficulty.ts  Spawner.ts  Run.ts  Fx.ts  placement.ts
src/scenes/   BootScene.ts  GameScene.ts  UIScene.ts
src/ui/       components.ts  ReadyScreen.ts  Hud.ts  GameOverPanel.ts  PausePanel.ts  HangarScreen.ts  SettingsScreen.ts  Onboarding.ts
src/types/    zzfx.d.ts
tests/        rng.test.ts  difficulty.test.ts  placement.test.ts  stack.test.ts  pacing.test.ts  share.test.ts  unlocks.test.ts  daily.test.ts
scripts/      make-icons.mjs
assets/       (üretilen ikon ve splash PNG'leri)
docs/         GDD.md  PROMPTS.md  DECISIONS.md  RELEASE.md  art/
```

### 17.3 Kayıt (localStorage, `ss.` ön eki, her erişim try/catch içinde, şema `ss.v = 1`)
- `ss.best`: number
- `ss.stats`: `{runs, cratesLifetime, perfectsLifetime, bestShip, medals:{bronze,silver,gold,platinum}}`
- `ss.paint`: string, `ss.unlocks`: string[]
- `ss.settings`: `{sound:boolean, haptics:boolean}`
- `ss.onboard`: `{drag, hook, drop}`
- `ss.daily`: `{date, attemptsUsed, best, playedDays:string[], streak}`
- `ss.ads`: `{lastInterstitialAt, runsSinceInterstitial}`
- `ss.tuning`: tuning panelinden gelen geçersiz kılmalar

### 17.4 Geliştirici bayrakları
- `?debug=1`: Matter debug çizimi, FPS ve durum yazısı.
- `?debug=stack`: §6.4 kabul testinin görsel karşılığı (otomatik 5 sandık istifler, 30 sn ölçer, sonucu ekrana yazar). Asıl ölçüt `tests/stack.test.ts`'tir. Bu sahne kullanıcının gözle bakması içindir.
- `?score=N`: Koşuyu N puanla başlatır. Zorluk ayarı için.
- `?tune=1` (veya Settings'te sürüme 7 dokunuş): lil-gui paneli.
  - `TUNING`'in heli, rope, rules, weather, ship ve difficulty alanlarını canlı düzenler.
  - **Save** → `ss.tuning`, **Reset** → varsayılan, **Copy JSON** → panoya kopyalar.
  - Oyun her açılışta `TUNING` varsayılanlarını `ss.tuning` ile birleştirir.

### 17.5 Testler (vitest, sadece saf mantık, tarayıcı veya ekran görüntüsü yok)
`rng` (aynı tohum = aynı dizi), `difficultyAt` (interpolasyon ve sınırlar), `classifyPlacement`, istif kabul testi (§6.4, başsız matter-js), `shouldShowInterstitial`, `buildShareText`, `evaluateUnlocks`, `dailyNumber`/`dailySeed`.

### 17.6 Android paketleme
- `capacitor.config.ts`:
  - `appId: 'com.swingsalvage.game'`, `appName: 'Swing Salvage'`, `webDir: 'dist'`
  - `android.backgroundColor: '#BCCBC7'`
- `MainActivity`: `android:screenOrientation="portrait"`.
- `strings.xml`: `admob_app_id`. Manifest meta-data: eklenti README'sine göre.
- **İkon ve splash:** `scripts/make-icons.mjs`, `docs/art/icon-foreground.svg` ve `icon-background.svg`'den `assets/` PNG'lerini üretir (sharp). Sonra `npx @capacitor/assets generate --android`.
  - sharp, `resize`'ı `composite`'ten önce uygular. Bu yüzden önce tam boyutta birleştirip buffer'a al, sonra ayrı bir sharp çağrısıyla boyutlandır.
  - `assets/icon-only.png` 1024 (ikisi birleşik)
  - `assets/icon-foreground.png` 1024
  - `assets/icon-background.png` 1024
  - `assets/splash.png` 2732: `#BCCBC7` zemin ve ortada ön plan
  - `assets/splash-dark.png` 2732: `#2E5A5F` zemin
- `versionCode 1`, `versionName "1.0.0"`.
- **npm script'leri:**
  - `dev`, `build`, `test`, `icons`
  - `android:sync` (= build + `npx cap sync android`)
  - `android:open`
  - `android:debug` (= sync + `cd android && ./gradlew assembleDebug`)

---

## 18. Kapsam dışı (v1'de YAPILMAYACAK)
- Uygulama içi satın alma (reklam kaldırma)
- Liderlik tablosu, Play Games, bulut kayıt
- iOS
- Müzik parçası
- Analitik
- Çoklu dil
- Yakıt, para, yükseltme
- Banner ve açılış reklamı

---

## 19. Oyun bitti sayılır (genel kabul)
1. Web'de `npm run dev` ile açılır. İlk dokunuştan oyuna geçiş < 1 sn sürer. 60 FPS'te ve sabit 60 Hz fizikle oynanır.
2. §3'teki döngünün tamamı çalışır: kancalama, taşıma, bırakma, oturma, puan, gemi değişimi, iki başarısızlık türü, game over, AGAIN (< 300 ms).
3. Zorluk tablosu, ani rüzgâr uyarısı, 5 kargo tipi, yağmur ve şimşek çalışır.
4. Görünüm `docs/art/mockup-b.html`'deki kâğıt stiline uyar. HUD ve bütün ekranlar (§11) var.
5. Sesler, titreşim ve §14'teki efektlerin tamamı var. Ses ve titreşim kapatılabilir.
6. Madalyalar, rekor, boyalar, Daily Storm ve paylaşım çalışır. Kayıt kalıcıdır.
7. `npm test` geçer, `npm run build` hatasız biter, `tsc --noEmit` temiz.
8. `npm run android:sync` çalışır. Android projesi ikonlar, dikey kilit ve test AdMob kimlikleriyle hazırdır. `docs/RELEASE.md` yayın adımlarını anlatır.

---

# Ek A — `src/config/tuning.ts` varsayılanları (birebir kopyala)

```ts
export const TUNING = {
  world: {
    baseWidth: 540, baseHeight: 960,
    seaFromBottom: 220,            // seaY = H - 220
    gravityY: 1.0,
    positionIterations: 10, velocityIterations: 8, constraintIterations: 4,
  },
  heli: {
    startXFrac: 0.66, startY: 230,
    followGain: 6.0,               // 1/s
    maxSpeed: 430,                 // px/s
    accelTau: 0.16,                // s
    maxAccel: 1600,                // px/s^2
    dragRatio: 1.0,
    marginX: 55, minY: 140, maxYAboveSea: 165,   // y <= seaY - 165
    tiltPerVx: 0.0008, tiltMax: 0.30, tiltSmooth: 10, flipHysteresisVx: 40,
    winchOffsetY: 31,
    hitboxW: 110, hitboxH: 50,
    spriteScale: 1.0,              // mockup yerel helikopter birimleri x1.0
    windResponse: 0.30,
  },
  rope: { length: 190, stiffness: 0.92, damping: 0.06, reelTime: 0.35 },
  hook: { radius: 10, density: 0.004, frictionAir: 0.03, pickupRadius: 26 },
  cargoCommon: { friction: 0.8, frictionStatic: 1.0, restitution: 0, frictionAir: 0.015, slop: 0.02 },
  cargo: {
    crate:  { w: 72,  h: 56, density: 0.0020, handling: 1.00, points: 1, minScore: 0,  weight: 60, chamfer: 3 },
    wide:   { w: 116, h: 44, density: 0.0018, handling: 0.95, points: 1, minScore: 5,  weight: 25, chamfer: 3 },
    barrel: { w: 50,  h: 72, density: 0.0022, handling: 0.95, points: 1, minScore: 9,  weight: 20, chamfer: 8 },
    gold:   { w: 62,  h: 46, density: 0.0024, handling: 0.90, points: 3, minScore: 7,  weight: 6,  chamfer: 4, maxPerShip: 1 },
    piano:  { w: 104, h: 70, density: 0.0035, handling: 0.75, points: 2, minScore: 14, weight: 14, chamfer: 4 },
  },
  ship: {
    deckLeftX: 60, deckRightX: 260, deckAboveSea: 100,   // deckY = seaY - 100
    bridgeLeftX: -30, bridgeHeight: 105,
    mastX: 15, mastHeight: 175,
    lipWidth: 12, lipHeight: 14,
    bowTipX: 310,
    pivotX: 135, pivotAboveSea: 10,
    slotCentersX: [110, 210],
    friction: 0.9, frictionStatic: 1.2,
    heaveAmp: 3,
    quota: [5, 6, 7],              // sonrasi hep 7
    swapExitTime: 1.2, swapEnterTime: 1.2, swapBannerTime: 0.6,
    shipBonus: 2,
  },
  rules: {
    releaseContactTime: 0.18, releaseMaxSpeed: 150,
    nextSpawnDelay: 0.4,
    settleTime: 0.45, settleMaxSpeed: 14, settleMaxAngSpeed: 0.5,   // rad/s
    perfectMaxDx: 7, perfectMaxAngleDeg: 4, perfectMaxImpact: 170,
    perfectBonus: 1, steadyEvery: 5, steadyBonus: 3,
    waterMargin: 6, carriedGrace: 0.8,
    toppleDrop: 20, toppleAngleDeg: 35,
    hardLandingImpact: 220,
  },
  difficulty: [   // s = skor; aralarda lineer interpolasyon; 60 ustu sabit
    { s: 0,  windBase: 0.00, gustInterval: 9.0, gustForce: 0.00, rollAmpDeg: 1.5, rollPeriod: 4.6, waveAmp: 5,  rain: 0.20 },
    { s: 5,  windBase: 0.10, gustInterval: 9.0, gustForce: 0.60, rollAmpDeg: 2.5, rollPeriod: 4.4, waveAmp: 8,  rain: 0.40 },
    { s: 10, windBase: 0.18, gustInterval: 7.5, gustForce: 0.90, rollAmpDeg: 3.5, rollPeriod: 4.1, waveAmp: 11, rain: 0.60 },
    { s: 20, windBase: 0.25, gustInterval: 6.5, gustForce: 1.20, rollAmpDeg: 4.5, rollPeriod: 3.8, waveAmp: 14, rain: 0.80 },
    { s: 35, windBase: 0.32, gustInterval: 5.5, gustForce: 1.45, rollAmpDeg: 5.5, rollPeriod: 3.5, waveAmp: 17, rain: 1.00 },
    { s: 60, windBase: 0.40, gustInterval: 5.0, gustForce: 1.70, rollAmpDeg: 6.5, rollPeriod: 3.3, waveAmp: 20, rain: 1.00 },
  ],
  weather: {
    windAccelPerUnit: 120, gustAccelPerUnit: 300,   // px/s^2
    gustFromScore: 4,
    gustTelegraph: 1.0, gustDuration: 1.2, gustRamp: 0.2, gustIntervalJitter: 0.25,
    stackGustFactor: 0.05,
    lightningFromScore: 10, lightningMin: 10, lightningMax: 18,
  },
  spawn: { minSeparation: 40 },
  medals: { bronze: 10, silver: 25, gold: 45, platinum: 70 },
  fx: { failSlowMo: 0.3, failSlowMoTime: 0.7, gameOverInputLock: 0.4, shakeHard: 3, shakeFail: 6 },
  ads: { secondChanceMinScore: 5, interstitialEveryRuns: 3, interstitialMinGapSec: 150, interstitialMinSessionRuns: 4, interstitialMinRunSec: 25 },
  daily: { attemptsPerDay: 3, epochUtc: '2026-11-01' },
  unlocks: { sunny: 30, mint: 100, navy: 250, paperDays: 5 },
} as const;
```
> Not: Bu değerler mantıklı başlangıç noktalarıdır, kesin değildir. Hissi kullanıcı tuning paneliyle ayarlayacak. Koddaki hiçbir yer bu sayıları kopyalamamalı, hep `TUNING`'den okumalı.

# Ek B — Çizim notları
- Mockup'taki sahne 390 px genişliktedir. Oyunda `S = 540/390` ile ölçeklenir. **Ama fizik boyutları (Ek A) önceliklidir:** kargo, gemi ve güverte sprite'ları fizik ölçülerine göre çizilir, mockup'tan ölçeklenmez.
- Helikopter yolları mockup'ta `transform="translate(205 240) rotate(-10) scale(.85)"` grubunun içindedir. Yerel koordinatları (gövde x −58…132) olduğu gibi al ve `heli.spriteScale` ile çiz. Dönüşümü atla, dönmeyi oyun yapar.
- Halat: `#5A4636`, 2,6 px. Kızak ve rotor: `#34474B`, 3,4 px.
- Mockup'taki HUD (coin, fuel, timer, DROP butonu) **eskidir**. HUD için bu GDD'nin §11.2'si ve `mockup-b.html`'deki güncel HUD geçerlidir.

# Ek C — Oyun içi metinler (`src/config/strings.ts`, İngilizce, birebir)
```
title: "SWING SALVAGE"
dragToStart: "Drag anywhere to start"
dragToFly: "Drag anywhere to fly"
hookIt: "Hook it!"
setGently: "Set it down gently"
best: "BEST"            score: "SCORE"         daily: "DAILY"
shipProgress: "SHIP {n} · {k}/{q}"
perfect: "PERFECT"      steady: "STEADY HANDS!"  shipFull: "SHIP FULL"
splashTitle: "SPLASH!"  splashSub: "Cargo lost at sea"
crashTitle: "CRASH!"    crashSub: "Watch the ship!"
toppleTitle: "TOPPLED!" toppleSub: "Your stack fell over"
newBest: "NEW BEST!"
soClose: "So close! {n} away from your best"
unlockProgress: "{n} more crates to unlock {paint}"
newPaint: "New paint unlocked: {paint}!"
firstMedal: "First {medal} medal!"
delivered: "Crates delivered: {n}"
again: "AGAIN"          playNormal: "PLAY NORMAL"
secondChance: "SECOND CHANCE"  watchAd: "watch an ad"
share: "SHARE"          home: "HOME"           copied: "Copied!"
paused: "PAUSED"        resume: "RESUME"
hangar: "HANGAR"        settings: "SETTINGS"   back: "BACK"
selected: "SELECTED"    tapToUse: "TAP TO USE"
sound: "Sound"          haptics: "Haptics"     privacy: "Privacy options"
howToPlay: "How to play"  privacyPolicy: "Privacy policy"
triesLeft: "{n} tries left today"   dailyTag: "DAILY #{n}"   dailyBtn: "#{n} · {k} left"
medals: BRONZE / SILVER / GOLD / PLATINUM
paints: RESCUE RED / SUNNY / MINT / NAVY / PAPER / GOLD
```
