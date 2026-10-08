# Kararlar

GDD'de açık bırakılmış veya uygulama sırasında değişen her karar buraya tek satır olarak yazılır.
Biçim: `F<faz> · <konu> · <karar> · <neden>`

F1 · Paket sürümleri · typescript 7.0.2, vitest 5.0.3, vite 8.3.4, phaser 4.2.1 kuruldu · npm'in verdiği güncel sürümler, GDD "aynı ana sürüm veya yenisi" izin veriyor (vitest/typescript ana sürümü GDD'den yüksek, build/test temiz)
F1 · Sabit adım · Matter `autoUpdate:false`, `FixedStepper` ile `matter.step(1000/60)`, kare başına en fazla 4 adım, 4'e varılırsa birikim sıfırlanır · spiral of death önlemi
F1 · Depolama · ss.* anahtarları için varsayılanlar `DEFAULTS`'ta, nesneler eksik alanlarda varsayılanla birleşir · eski/yarım kayıtlara dayanıklılık
