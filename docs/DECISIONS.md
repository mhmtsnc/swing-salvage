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
