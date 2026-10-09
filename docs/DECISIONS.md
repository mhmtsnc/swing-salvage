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
F8 · Android SDK · Bu ortamda yok; `npm run android:debug` çalıştırılmadı, `android:sync` hatasız · RELEASE.md §1.2'de anlatıldı
F8 · Reklam hatası · AdMob başlatma/yükleme/gösterme hataları yutulur, hizmet Noop gibi davranır, oyun asla kilitlenmez; gösterim 60 sn'de zaman aşımına düşer · "oyunu asla kilitleme"
F8 · AGAIN ve reklam · Geçiş reklamı beklenirken `busy` bayrağı çifte dokunmayı engeller; panel durum değişince kapanır · hızlı çift dokunmada iki koşu başlamasın
F8 · SECOND CHANCE sayımı · Devam eden koşuda koşu/kargo/perfect/madalya istatistiği iki kez sayılmaz (`already`) · çifte sayım olmasın
F8 · RESUMING · Yeni durum; 1 sn'de timeScale 0,3→1, başarısızlık kontrolü kapalı, sonra STACKED referansları yenilenir · §16.2
F8 · SECOND CHANCE sonrası · Suçlu kargo (CRASH'te yok), TOPPLE'da toppleDrop'tan fazla kayan istif kargoları ve taşınan kargo kaldırılır; yeni kargo nextSpawnDelay sonra doğar · §16.2 adım 1–3
F8 · Splash/ikon · assets/ PNG'leri `make-icons.mjs` ile üretilir ve `@capacitor/assets` ile android res'e dağıtıldı; splash'ta ön plan zeminin %30'u · §17.6
F9 · §19 kontrolü · 1) açılış/60 Hz sabit adım: FixedStepper+testler; 2) döngü: GameScene (kancalama→bırakma→oturma→puan→gemi değişimi→3 başarısızlık→AGAIN); 3) zorluk/hava/5 kargo: difficulty, Weather, Spawner testleri; 4) görünüm: art/textures+ui; 5) ses/titreşim: audio.ts, haptics.ts, Feedback.ts; 6) meta: summary/unlocks/daily/share; 7) test/build/tsc temiz; 8) android:sync temiz + RELEASE.md · APK ve tarayıcıda görsel doğrulama kullanıcıda
F9 · Uç durum · Gemi değişimi tween'i yalnızca SWAPPING iken koşuyu ilerletir (duraklatma/başarısızlıkla çakışma) · SWAPPING'de kargo olmadığı için başarısızlık zaten oluşmaz, ek güvence
F9 · Uç durum · Çift dokunma: AGAIN `busy` bayrağı + durum kontrolü; yavaş çekim bitmeden panel yok · P4
F9 · Uç durum · localStorage yoksa `storage.ts` belleğe düşer, `tuning.ts` try/catch · §17.3
V1.1 · Kapsam · Kullanıcı isteğiyle 20 fikir eklendi (GDD'nin üstüne); tüm sayılar `tuning.ts`'de (`scoring`, `ropeLoad`, `ghost`, `endless`, `rules` ek alanları) · GDD §18 ile çelişen yok (para/yükseltme yok)
V1.1 · Skor/ilerleme ayrımı · `run.score` çarpanlı gerçek skor, `run.progress` eski ölçekli puan (temel + perfect için +1 + gemi bonusu) ve zorluk/kargo havuzu/fırtına çarpanı buna bağlı · çarpanlar zorluğu hızlandırmasın
V1.1 · Puan formülü · round((temel + salınım + risk + hız + nokta atışı) × yerleştirme(1/2/3) × seri(1+0,1/ardışık, en çok +0,9) × fırtına(1+ilerleme/120, en çok 2,5)) + seri ve hasarsız kilometre taşları · `scoring.ts`, testli
V1.1 · Derece · FLAWLESS = PERFECT + dx≤3 + açı≤1,5° + çarpma≤90 (×3), PERFECT ×2; paylaşım satırında ikisi de ⭐ · §7.4 üstüne
V1.1 · Salınım bonusu · Halat dikeyden sapmasının son ~0,5 sn'deki zirvesi: ≥15°/25°/35° → +1/+2/+3, sert inişte yok · "salınımı avantaja çevir": sarkaçın dönüş noktasında yumuşak inmek
V1.1 · Risk bonusları · Kıl payı (su üstünde <14 px ≥0,45 sn) +1, fırtınada kancalama +1, ani rüzgârda bırakma +2, kurtarma +3 · adil ve ölçülebilir riskler
V1.1 · Son anda kurtarma · Taşınan kargo rescueGrace=0,35 sn batabilir; çekilirse kurtulur (SAVED +3), batıkken hız %8 sönümlenir · §7.5 F1'e istisna
V1.1 · Halat yükü · Gövde ivmesinden |a−g|/g (0,1 sn yumuşatma); sınır 4,6 g (ağır kargoda biraz düşük), 0,15 sn aşılırsa halat kopar ve kargo serbest/sert iniş sayılır; 0,6 üstünde renk ve gıcırtı uyarısı · başsız testte normal oyun en çok ≈%63 sınır
V1.1 · Nokta atışı · Her gemi (tohumlu) bir "sıcak slot" seçer, altın köşeli; doğrudan güvertede ve |dx|≤14 ise +2 · §6.4 slotları
V1.1 · Ağırlık · Her kargo yoğunluğu 0,85–1,25× (spawnRng), handling/√çarpan, kg etiketi; rüzgâr ivmesi (8/kütle)^0,3 ile ölçeklenir (0,7–1,4) · koşuya göre değişen ağırlık
V1.1 · Yeni şekiller · tall (44×90), wedge (trapez), ball (daire, yuvarlanır, 4 puan) · "farklı boyut ve şekiller"; minScore 12/16/24
V1.1 · Sert iniş · Yana kayma (impact×0,3 px/s) ve dönme eklenir; hasarsız seriyi sıfırlar · "çarpınca kayması veya düşmesi"
V1.1 · Rüzgâr yönü · İlerleme ≥12'de temel rüzgâr 26 sn periyotlu sinüsle yön değiştirir (6 puanda yumuşak geçiş), sakin anlar olur; HUD'da ok · "değişken yönlü rüzgâr"
V1.1 · Sonsuz zorluk · 60 puandan sonra parametreler 140 puan boyunca tavanlara yaklaşır (rüzgâr .65, yalpa 8°/2,9 sn, ani rüzgâr 2,3, dalga 26), istif kabul testi (e) tavanda geçer · tavanlı ve adil
V1.1 · Hayalet · En iyi normal koşunun helikopter yolu (0,2 sn örnek) ve skor çizelgesi `ss.ghost`'ta; yarı saydam helikopter oynatılır, HUD'da "GHOST ±n" · Daily'de yok
V1.1 · Madalya eşikleri · 20/60/120/200 (çarpanlı skora göre) · eski eşikler yeni ölçekte anlamsız
V1.1 · Doğrulama · Tarayıcıda çalıştırılmadı (CLAUDE.md); saf mantık (scoring, placement, ropeLoad matter-js, ghost, weather, endless) testli
