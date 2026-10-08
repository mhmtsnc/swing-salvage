# Kararlar

GDD'de açık bırakılmış veya uygulama sırasında değişen her karar buraya tek satır olarak yazılır.
Biçim: `F<faz> · <konu> · <karar> · <neden>`

F1 · Paket sürümleri · typescript 7.0.2, vitest 5.0.3, vite 8.3.4, phaser 4.2.1 kuruldu · npm'in verdiği güncel sürümler, GDD "aynı ana sürüm veya yenisi" izin veriyor (vitest/typescript ana sürümü GDD'den yüksek, build/test temiz)
F1 · Sabit adım · Matter `autoUpdate:false`, `FixedStepper` ile `matter.step(1000/60)`, kare başına en fazla 4 adım, 4'e varılırsa birikim sıfırlanır · spiral of death önlemi
F1 · Depolama · ss.* anahtarları için varsayılanlar `DEFAULTS`'ta, nesneler eksik alanlarda varsayılanla birleşir · eski/yarım kayıtlara dayanıklılık
F2 · Birimler · `toStepVel(v)=v/60`, `toStepAcc(a)=a/3600` (px/s² → px/adım²) · Matter hızı px/adım, GDD "v += a/60" ifadesinin adım karşılığı
F2 · Test kargosu x · (ship.bowTipX + W − heli.marginX)/2 · GDD doğma bölgesini W'ye göre diyor ama sayı vermiyor
F2 · Respawn · Yeni yüzen kargo sadece SPLASH sıfırlamasında doğar (bırakma/gemi F3'te) · F2 kapsamında bırakma yok
F2 · Dalga fazları · arka +1.7, orta +0.9, derin +2.4 sn faz kaydırma, ön 0 · GDD "faz kaydırarak" diyor, değer vermiyor
F2 · SPLASH sıfırlaması · simTime sıfırlanmaz, sadece kargo/heli/kanca başa döner · dalga akışı kesilmesin
F3 · Gemi yöntemi · Birincil yöntem (kinematik statik gövde, setPosition/setAngle updateVelocity=true) kabul testini (a, b, c, c2, d) Ek A değerleriyle değişiklik gerekmeden geçti (kayma a 2,6 px, b 3,7 px) · yedek yönteme gerek yok
F3 · Test istifi · "2+2+1" = x 110/210 iki sıra + üstte x 160 tek sandık; (c)/(d) = x 210 sütununda 2 sandık, üst sandık kaydırılmış · GDD yerleşimi tam tarif etmiyor
F3 · Yalpa fazı · Gemi fazı `phase += dt/period` ile biriktirilir (shipPose'a rollPeriod=1 verilir), genlik 0,5°/sn ile hedefe yaklaşır · skor değişince period/genlik açıda sıçrama yapmasın
F3 · Göreli hız · Bırakma/oturma/çarpma hızları geminin kendi hızı çıkarılarak ölçülür (px/s = px/adım × 60) · yalpada kargo gemiyle birlikte hareket eder, mutlak hız eşiği aşardı
F3 · Çarpma hızı · Temasın başladığı adımdan önceki göreli hız; temas 0,5 sn kesilirse pencere sıfırlanır · GDD "temas penceresi" diyor, sınırı belirtmiyor
F3 · Temas testi · `Query.collides` (sığ örtüşme dahil) ile gemi gövdesi ve SETTLING/STACKED kargolar · Phaser çarpışma olayına bağımlı kalmamak için
F3 · SWAPPING · CRASH kontrolü kapalı, SPLASH/TOPPLE açık; yeni gemi gövdesi hemen yerinde, sadece görsel soldan kayar · gemi değişiminde helikopter serbest, kargo yok
F3 · Spawn yeniden çekme · Önceki x'e minSeparation'dan yakınsa bir kez yeniden çekilir, ikincisi ne olursa kabul · §7.7
F3 · Yeniden başlama · AGAIN doğrudan PLAYING'e geçer (READY atlanır), `?score=N` korunur · "anında yeni koşu"
F3 · Yeniden boyutlama · seaY değişirse gemi sadece READY/GAME_OVER durumunda yeniden kurulur · oynarken gemi geometrisi sabit kalsın
F3 · FAILING · Mantık hızı failSlowMo ile yavaşlar (adım biriktirici), kamera %35 kayıp 1.06 zoom, suçlu yanıp sönme F5'e · geçici görsel
F4 · Tohum · Koşu tohumu `Date.now()` (veya `?seed=N`); `${seed}:spawn` ve `${seed}:weather` ayrı akışlar · P3(c): hareket kargo sırasını değiştirmez
F4 · Ani rüzgâr aralığı · Aralık bir önceki ani rüzgârın bitişinden sonraki uyarıya kadar sayılır; ilk sayaç skor ≥ gustFromScore olunca başlar · GDD başlangıç/bitiş referansı vermiyor
F4 · Ani rüzgâr yönü · +1 = sağa eser (soldan gelir, şeritler sol kenardan akar) · yön sözleşmesi
F4 · Donma · SWAPPING'de sadece aralık sayacı durur, devam eden ani rüzgâr biter, şimşek sürer · "zamanlayıcı durur"
F4 · Hava adımı · Weather READY'de çalışmaz; PLAYING/SWAPPING/FAILING'de çalışır (FAILING yavaş çekimde) · başlamadan ani rüzgâr gelmesin
F4 · Yağmur dokusu · rain_a/rain_b kodla üretilen 256 px döşeme; kayma (−90,520) ve (−60,380), alfa rain×1,0 ve ×0,6 · §10.4
F5 · Tarayıcı kontrolü · CLAUDE.md gereği tarayıcıda çalıştırılmadı; render/UI kodu sadece derleme ve birim testlerle doğrulandı · görsel kontrolü kullanıcı yapacak
F5 · Boya kimlikleri · rescue/sunny/mint/navy/paper/gold (§15.1), renkler §15.1'den; `strings.paints.red` → `rescue` · GDD §15.1 ile tutarlılık
F5 · Helikopter orijini · Doku yerel (0,0) noktası fizik merkezi; ana rotor (0,−46), kuyruk rotoru (126,−16), flip tüm konteynerde scaleX ile · burun sola bakar, mockup yerel koordinatları birebir
F5 · Gemi görseli · Tek `ship` dokusu (deckY = 0 referansı) gemi konteynerine görsel olarak bağlanır; direk fizik değil · F2 CRASH hâlâ AABB
F5 · Askı çizgileri · Taşınan kargoda kanca 14 px yukarıda çizilir, iki askı üst köşelere iner (mockup) · fizik halat ucu kargonun üst-orta noktasında kalır
F5 · UI girdi yalıtımı · UIScene dokunma dikdörtgenlerini ve modal bayrağını registry'ye yazar, GameScene bunlarla girdiyi süzer · iki sahne aynı dokunmayı görüyor
F5 · Daily ve SHARE · Butonlar/olaylar (ss:daily, ss:share) hazır; asıl bağlantı F7 · F5 kapsamı dışı
F5 · Hangar · Kilit mantığı saf `core/unlocks.ts` (testli); ilerleme `ss.stats`/`ss.daily`'den okunur · HANGAR gerçek kilitle çalışsın
F5 · Madalya (geçici) · Game over madalyası skor eşiğinden hesaplanır; "ilk kez kazanılan" mesajı F7 · stats F7'de güncellenir
F6 · Tint · `setTintFill` Phaser 4'te yok; kırmızı yanıp sönme `setTint().setTintMode(FILL)` · skills/game-object-components
F6 · Ses · Örnekler `ZZFX.buildSamples` ile bir kez üretilip önbelleğe alınır, perde `playSamples(rate = 2^(yarım ton/12))` ile; ana ses 0,6 · tekrar tekrar sentez maliyeti yok
F6 · Çok notalı sesler · steady, horn, new_best kısa `setTimeout` dizileridir (ZzFX tek ses üretir) · arpej/fanfar için
F6 · İniş efekti · "Yumuşak/sert iniş" bırakma anında (ss:released) tetiklenir, sertlik `classifyPlacement.hard` · çarpma hızı zaten orada ölçülüyor
F6 · PERFECT perdesi · Seri n. ardışık PERFECT'te +(n−1) yarım ton, en fazla +8 · "ilk perfect temel perde"
F6 · Döngü sesleri · Rotor ve yağmur WebAudio gürültü döngüleri uygulandı (opsiyonel, bütçe sorunu yok) · §14
F6 · Sessizlik · Sekme gizlenince AudioContext.suspend, geri gelince resume (ses açıksa); ilk pointerdown'a kadar hiçbir ses çalmaz · tarayıcı autoplay
F7 · Tuning tek örnek · `getTuning()` tek ve canlı düzenlenebilir nesne döner (varsayılan + `ss.tuning` yerinde birleşir); Save tüm nesneyi yazar, Reset yerinde geri yükler · panel sahnelerin tuttuğu referansı da değiştirebilsin
F7 · Daily akışı · DAILY butonu bugünün tohumuyla READY'de bekleyen koşu kurar; deneme ilk sürüklemede (AGAIN'de hemen) harcanır, günün oynandı sayılması da o an · uygulamayı kapatıp deneme kaçırma yok
F7 · Daily rekoru · Normal `ss.best` ile ayrı; NEW BEST sadece normal modda · §12
F7 · Daily bitince · Kalan deneme 0 ise AGAIN "PLAY NORMAL" olur ve normal koşu başlatır; kalan varsa aynı tohumla yeni deneme · §11.4
F7 · bestShip · Ulaşılan gemi numarası (shipIndex+1) · "en iyi gemi" tanımı belirsiz
F7 · "So close" · 0 < rekor−skor ≤ max(3, %10 rekor) ve skor > 0 · GDD sayısal eşik vermiyor
F7 · Debug koşusu · `?score=N` ile başlayan koşular depolamayı (stats, rekor, daily) güncellemez · test koşuları kayıtları bozmasın
F7 · Seri ve PAPER/GOLD · Opsiyoneller uygulandı (daily seri sayacı, 5 gün PAPER, platin GOLD) · bütçe uyarısı yok
F7 · Paylaşım satırı · Gemi sayısı = ulaşılan gemi numarası (shipIndex+1), tekil "1 ship" · §15.3 örneği "3 ships"
