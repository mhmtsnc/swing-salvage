# Swing Salvage — Yayın kılavuzu (sana özel)

Bu dosya kodu yazan oturumun yapamadığı, senin yapman gereken adımları anlatır. Sırayla git.

## 0. Durum özeti
- Web build çalışır (`npm run build`). `npm run android:sync` hatasız çalışır ve `android/` projesi hazırdır.
- AdMob **Google test kimlikleriyle** bağlıdır (`src/config/ads.ts` → `ADS_TEST_MODE = true`). Gerçek kimlik uydurulmadı.
- Bu ortamda Android SDK yoktu, bu yüzden `npm run android:debug` (APK) **çalıştırılamadı**. Bu bir hata değildir: kendi bilgisayarında Android Studio kuruluyken çalışır (adım 1.2).
- Keystore ve şifre oluşturulmadı. İmzalamayı sen yapacaksın (adım 4).

## 1. Telefonda test

### 1.1 Hızlı: tarayıcıdan (reklamsız)
1. Bilgisayar ve telefon aynı Wi‑Fi'de olsun.
2. `npm run dev -- --host`
3. Terminalde yazan `Network:` adresini telefonun tarayıcısında aç (ör. `http://192.168.1.20:5173`).
4. Web'de reklam yoktur, SECOND CHANCE butonu görünmez. Oynanış, his ve ses buradan test edilir.
5. Yararlı bayraklar: `?debug=1` (FPS, Matter çizimi), `?score=20` (zorluk testi, kayıtları değiştirmez), `?seed=7` (aynı kargo/ani rüzgâr sırası), `?tune=1` (ayar paneli), `?debug=stack` (istif testi).

### 1.2 Gerçek cihaz: Android APK
1. Android Studio Otter (2025.2.1) veya yenisini kur. İlk açılışta **SDK Platform 36** kurdur (JDK Android Studio ile gelir).
2. `npm run android:sync`
3. `npm run android:open` (Android Studio'da açılır) → telefonu USB ile bağla (Geliştirici seçenekleri → USB hata ayıklama açık) → **Run ▶**.
4. Komut satırından debug APK için: `npm run android:debug` → `android/app/build/outputs/apk/debug/app-debug.apk`. `ANDROID_HOME` tanımlı olmalı.
5. Test reklamlarında "Test Ad" etiketi görünür. İlk açılışta (AB'deyseniz) onay formu çıkabilir.

## 2. AdMob: gerçek reklamlar
1. https://admob.google.com → hesap aç → **Uygulamalar → Uygulama ekle** (Android, henüz yayında değil seç).
2. Uygulama kimliğini al: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`.
3. İki reklam birimi oluştur: **Ödüllü** (SECOND CHANCE) ve **Geçiş** (interstitial). Banner ve açılış reklamı kullanılmıyor.
4. Kimlikleri şuraya yaz:
   - `src/config/ads.ts` içinde `REAL_APP_ID`, `REAL_REWARDED_ID`, `REAL_INTERSTITIAL_ID`
   - `android/app/src/main/res/values/strings.xml` içinde `admob_app_id` (**uygulama** kimliği; birim kimliği değil)
   - `src/config/ads.ts` içinde `ADS_TEST_MODE = false`
5. Yayından önce **test kimlikleriyle** son kez dene. Kendi reklamına kendin tıklama (hesabın kapanabilir): test cihazı olarak kaydet.
6. AdMob → **Gizlilik ve mesajlaşma** bölümünde AB için "Avrupa düzenlemeleri" (GDPR/UMP) mesajı oluştur ve uygulamaya bağla. Oyun açılışta onay akışını zaten çalıştırır.

## 3. Gizlilik politikası
- Play Store ve AdMob bir **gizlilik politikası URL'si** ister. Bir sayfa yaz (ör. GitHub Pages): hangi veriyi topladığını (reklam kimliği, AdMob), hiç hesap/e‑posta toplamadığını, reklam ortağını (Google AdMob) ve iletişim adresini yaz.
- URL'yi `src/config/app.ts` içindeki `PRIVACY_URL`'e yaz (Settings'teki "Privacy policy" bağlantısı bunu açar).
- Mağaza bağlantısı `STORE_URL` paylaşım metninde kullanılır; yayından sonra gerçek Play bağlantısıyla doğrula.

## 4. İmzalama ve paket (AAB)
1. Android Studio → **Build → Generate Signed App Bundle / APK → Android App Bundle**.
2. İlk seferde yeni bir **keystore** oluştur. Dosyayı ve şifreleri güvenli yerde yedekle, **repoya koyma** (`.gitignore` `*.keystore` ve `*.jks`'i zaten dışlar).
3. **Play App Signing**'e katıl (Play Console önerir): yükleme anahtarını sen tutarsın, dağıtım anahtarını Google yönetir.
4. Çıkan `app-release.aab` dosyasını Play Console'a yükleyeceksin.

## 5. Play Console
1. https://play.google.com/console → geliştirici hesabı aç (tek seferlik **25 $**) ve **kimlik doğrulamasını** tamamla.
2. **Uygulama oluştur**: ad "Swing Salvage", varsayılan dil İngilizce, tür Oyun, ücretsiz.
3. Doldurulacak beyanlar:
   - **Data safety (Veri güvenliği):** reklam kimliği ve AdMob kullanımı (cihaz veya diğer kimlikler, reklam amaçlı paylaşım) işaretle. Hesap yok, satın alma yok.
   - **İçerik derecelendirme:** anketi doldur (şiddet yok, kumar yok).
   - **Hedef kitle:** **13+** seç (çocuklara yönelik değil; reklam politikası bunu gerektirir).
   - **Reklam beyanı:** "Uygulama reklam içeriyor" evet.
   - Gizlilik politikası URL'si (adım 3).
4. Mağaza sayfası: kısa/uzun açıklama, 512×512 ikon, 1024×500 öne çıkan görsel, en az 2 telefon ekran görüntüsü.

## 6. Yeni kişisel hesaplar için zorunlu kapalı test
Yeni kişisel geliştirici hesapları production'a çıkmadan önce **kapalı testte en az 12 test kullanıcısı ile 14 gün** sürmek zorundadır.
1. Test → **Kapalı test** kanalı aç, AAB'yi yükle.
2. Test kullanıcılarını Google Grubu veya e‑posta listesi olarak ekle. **15–20 kişiyle başla** (bazıları ayrılırsa 12'nin altına inme).
3. Hepsi test bağlantısından yüklesin ve 14 gün boyunca opt‑in kalsın.
4. Süre dolunca **Production'a erişim başvurusu** yap, sonra production sürümünü yayınla.

## 7. Her güncellemede
1. `android/app/build.gradle` içinde **`versionCode`'u artır** (şimdi 2; her yüklemede +1, geri düşemez). `versionName` ve `src/config/app.ts` içindeki `VERSION` değerini birlikte güncelle.
2. `npm test && npm run build && npm run android:sync`
3. Yeni imzalı AAB üret, Play Console'a yükle.

## 8. Sık sorulanlar
- **Ses gelmiyor:** tarayıcılar ilk dokunuşa kadar sesi kapatır; bir kez dokun. Settings'te Sound açık mı bak.
- **SECOND CHANCE yok:** web'de hiç görünmez. Native'de koşulları: skor ≥ 5, bu koşuda kullanılmamış, reklam yüklü.
- **Geçiş reklamı hiç çıkmıyor:** ilk 4 koşuda, son reklamdan sonra 3 koşu veya 150 sn dolmadan, 25 sn'den kısa koşulardan sonra çıkmaz (tasarım gereği).
- **Rekor ve kilitleri sıfırla:** tarayıcıda site verisini sil (`ss.` ile başlayan localStorage anahtarları); telefonda uygulama verilerini temizle.
