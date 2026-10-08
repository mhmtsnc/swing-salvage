# Swing Salvage — Claude Code kuralları

Tek parmakla oynanan fizik arcade oyunu. Phaser 4 + TypeScript + Vite + Capacitor 8 (Android).

## Kaynak
- **docs/GDD.md tek doğruluk kaynağıdır.** Görevde adı geçen bölümleri oku, gerisini okuma.
- Sayılar sadece `src/config/tuning.ts`'de (GDD Ek A). Kodda sihirli sayı yok.
- Oyun içi metinler İngilizce ve `src/config/strings.ts`'den gelir.
- Görsel hedef: `docs/art/mockup-b.html` (sadece ilgili yolları oku).

## Çalışma biçimi
- **Kullanıcıya soru sorma.** Belirsizlikte GDD ile tutarlı en basit çözümü seç, `docs/DECISIONS.md`'ye tek satır yaz, devam et.
- Bir oturum = bir faz. Fazın kapsamı dışına çıkma, sonraki fazın işini yapma.
- Phaser 4 API'sinden emin değilsen önce `node_modules/phaser/skills/<konu>/SKILL.md` oku. v3 bilgisiyle tahmin etme.
- AdMob için `node_modules/@capacitor-community/admob/README.md`.
- Yeni bağımlılık ekleme (GDD §17.1 listesi dışında).

## Doğrulama (ucuz tut)
- Her fazın sonunda: `npm run build` ve `npm test` ve `npx tsc --noEmit`. Hepsi temiz olmalı.
- `npm run dev`'i **çalıştırma** (sunucu kapanmaz, oturumu kilitler).
- Tarayıcı otomasyonu, ekran görüntüsü, Playwright **kullanma**. Görsel kontrolü kullanıcı yapacak.
- Fizik davranışını başsız testle doğrula (`tests/stack.test.ts` örneği: `matter-js` 0.20.0, Phaser'daki ile aynı sürüm).
- Aynı hataya 3 denemede çözüm bulamazsan en basit çalışan alternatifi uygula, DECISIONS.md'ye yaz, devam et.
- Saf mantığı (`placement`, `pacing`, `difficulty`, `share`, `unlocks`, `daily`, `rng`) vitest ile test et.

## Bitirirken
- `git add -A && git commit -m "faz N: <kısa özet>"` Push sadece kullanıcı isterse.
- Rapor en fazla 5 satır: ne yapıldı, DECISIONS'a ne eklendi, bilinen sorun. Uzun açıklama yazma.

## Compact talimatı
Sıkıştırırken şunları koru: aktif faz numarası, değişen dosyalar, açık hatalar, DECISIONS satırları.
