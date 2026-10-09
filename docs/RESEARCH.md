# Bağımlılık araştırması ve eksik analizi (v1.2)

**Yöntem ve sınırlar.** Web araması ve haber/forum özetlerine baktım. Reddit ve çoğu geliştirici sitesi bu ortamda engelliydi (arama aracı reddit.com'a erişemedi, sayfa getirme 403 verdi), bu yüzden Reddit ve GDC konuşmalarının kendisini **okuyamadım**. Aşağıda yalnızca arama özetlerinin gerçekten desteklediği bulgular "kanıt" olarak işaretli; geri kalanı tasarım bilgisinden gelen **çıkarım**. Sayılar çoğunlukla satıcı blogları, yöntemleri tutarsız olduğu için yönsel okunmalı.

## Bulgular (kaynaklı)

| # | Bulgu | Kaynak |
|---|---|---|
| 1 | Hyper-casual'da tipik D1 ≈ %20–35, D7 ≈ %5–12, D30 ≈ %1–4. Döngü tek başına bir ay tutmaz; **meta katmanı** olanlar (Mob Control gibi) D7'de ~%15'e çıkıyor. | [Segwise](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies), [Playio](https://blog.playio.co/retention-by-game-genre), [Tap Nation](https://www.tap-nation.io/blog/thief-puzzle-a-case-study-of-a-hyper-casual-puzzle-mobile-game/) |
| 2 | Flappy Bird: bir saniyenin altında yeniden başlama, "az kalsın geçecektim" hissi, her puanın görünür olması, kendi rekorunu 1 puan geçmenin ödül gibi hissettirmesi. | [igyaan](https://www.igyaan.in/115605/what-makes-crossy-road-addictive/), [Octalysis](https://yukaichou.com/gamificationnews/flappy-bird-game-addiction-octalysis/) |
| 3 | Crossy Road'u geri getiren şey **koleksiyon**: kullanıcı yorumlarına göre en bağımlılık yapan kısım yeni karakterleri açmak; çoğu ücretsiz kazanılıyor, reklam agresif değil. | [Metacritic yorumları](https://www.metacritic.com/game/crossy-road-endless-arcade-hopper/user-reviews/), [Cult of Mac](https://www.cultofmac.com/news/crossy-road-developers-made-10-million-90-days) |
| 4 | Jetpack Joyride: **aynı anda 3 görev**, kısa/orta/uzun oturuma göre kademeli; her oyun sonunda hemen ödül ekranı; oturum kısa olduğu için döngüyü her seansta kapatabilmek önemli. | [Adrian Crook analizi](https://adriancrook.com/?p=4709), [Game Informer](https://gameinformer.com/b/news/archive/2011/09/05/why-you-shouldn-t-pass-over-jetpack-joyride) |
| 5 | Alto's: hedefler yeni görev vermeden önce üçünün de bitmesini bekliyor ve kısmen prosedürel şansa bağlı; **takılınca bunaltıyor**. Geri alınamayan kayıp ilerleme en büyük şikâyetlerden. | [AppUnwrapper](https://www.appunwrapper.com/2018/02/22/altos-odyssey-review/), [Marlvel (toplayıcı, temkinli)](https://marlvel.ai/apps/alto-s-odyssey-remastered) |
| 6 | Stack: mükemmel yerleşimde çalan tını ritim bulmaya yardım ediyor; seri efektleri ve sürekli kayan blok sesi bazı oyuncuyu bozuyor. **En sık şikâyet reklam**: uzun interstitial, kapatılamayan ödüllü video, oyunu geciktiren banner. | [Odyssey News](https://odysseynewsmagazine.net/2016/03/12/review-stack/), [MacSources](https://macsources.com/stack-ios-game-review-by-ketchapp-and-kchlab/) |
| 7 | Forumlarda reklam şikâyeti: **her ölümde** reklam, uzayan reklamlar, gizli kapatma düğmesi → silme sebebi. Bir analiz dakikada 4 reklamın elde tutmayı ~%20'ye indirdiğini söylüyor. | [Android Central](https://forums.androidcentral.com/threads/games-getting-ridiculous-with-ads.1039311/), [Cabrait](https://cabrait.wordpress.com/2025/07/18/user-retention-strategies-for-mobile-games/) |
| 8 | Juice yorgunluğu: çok fazla hitstop/sarsıntı oyunu gecikmiş gösteriyor ve tehditleri izlemeyi zorlaştırıyor. **Kapatılabilir olmalı.** | itch.io yorumları ([1](https://oreox4.itch.io/water-plug/comments), [2](https://evileyebrows.itch.io/dunk-junk/comments)) |
| 9 | "Aynı şeyin tekrarı" hissi; uzayan koşular; çift ıskalamada kısa dokunulmazlık isteği. **Çeşitlilik gerekli.** | [itch.io](https://evileyebrows.itch.io/dunk-junk/comments) |
| 10 | Yakın kaçırma (near-miss) **ilk seferde** motivasyonu ve pozitif duyguyu artırıyor; **aynı near-miss tekrarlanınca** motivasyon düşüp hayal kırıklığı artıyor (Wordle çalışması, Scientific Reports 2024). | [Dixon ve ark.](https://doaj.org/article/cdde8b4e865c4a929ed8887df870cf17) |
| 11 | Kendi geçmişine karşı yarış (ghost) süre boyunca motivasyon ve akışı artırıyor; kendi kendine kıyaslama, başkalarıyla kıyaslamaya göre daha güvenilir şekilde olumlu. | [CHI 2020 / PeerJ](https://peerj.com/articles/cs-92), [Bath](https://researchportal.bath.ac.uk/en/publications/race-yourselves-a-longitudinal-exploration-of-self-competition-be/) |
| 12 | Seriler kayıp korkusuyla çalışır ama **ev ödevi gibi hissettirirse** küsme yapar; bir günlük kaçırmada seri silinmemeli (affedici seri). | [Beamable](https://beamable.com/blog/inspiring-examples-of-daily-login-rewards-for-your-mobile-game), [Hubapps](https://hubapps.team/blog/mobile-game-retention-strategies) |
| 13 | Wordle: günde bir bulmaca, herkes için aynı, **spoiler vermeyen paylaşım**, sıfır sürtünme → organik büyüme. | [Substack analizi](https://koyegbeke.substack.com/p/what-can-we-learn-from-wordles-success), [Game Developer](https://www.gamedeveloper.com/marketing/josh-wardle-reflects-on-the-the-unconventional-road-to-wordle-s-success) |
| 14 | İlk 90 sn'de karar veriliyor; uzun tanıtım, çok pop-up, zorunlu giriş/puanlama istemi terk sebebi; oyuncular öfkelenmeden **sessizce bırakıyor**. | [PocketGamer.biz FTUE](https://www.pocketgamer.biz/first-impressions-count-creating-the-ultimate-first-time-user-experience), [VGM](https://vgm.co/blog/first-time-user-experience-testing-how-one-session-predicts-your-game-s-fate) |
| 15 | Kargo/vinç/halat fiziği oyunlarında şikâyet: **öngörülemez fizik, hedeflemesi zor kavrama, kötü kamera**. | [Steam: Totally Reliable Delivery Service](https://steamcommunity.com/app/1106850/discussions/0/2144217547141057168/), [RoadCraft](https://steamcommunity.com/app/2104890/discussions/0/598519514348433212/?ctp=3) |
| 16 | Suika: fizik her koşuyu farklı kılıyor, birleşme sesi/görseli ödül anı, yayıncılar tarafından yayıldı (izlenebilirlik). | [Wikipedia](https://wikipedia.com/wiki/Suika_Game), [AFK Gaming](https://afkgaming.com/gaming/general/what-is-the-suika-game-why-has-it-garnered-momentum) |
| 17 | Ödüllü video: oyuncunun seçtiği, doğal duraklamada (ölüm sonrası "devam"), ödülü net yazan teklif. | [AppLovin](https://support.applovin.com/en/max/best-practices/tips-for-using-rewarded-videos-more-effectively), [Pangle](https://pangleglobal.com/resource/27805) |

## Oyunun şu anki hâli ile karşılaştırma

Sağlam olanlar: anında yeniden başlama (<300 ms), tek parmak, spoiler vermeyen paylaşım, Daily Storm, hayalet, opt-in reklam, geçiş reklamı sınırları, kesintisiz devam (SECOND CHANCE) (SECOND CHANCE), seri/perfect ritmi.

**Eksikler ve her biri için kanıta bağlı çözüm:**

| Eksik | Kanıt | Çözüm (v1.2) |
|---|---|---|
| Koşular arası **hedef yok**: Oyun bittiğinde "neden bir daha?" sorusuna rekordan başka cevap yok. | 1, 4, 5 | **3 kademeli görev** (kolay/orta/zor), biten görevin yerine aynı kademeden yenisi gelir (Alto'daki "üçünü bitir" tıkanması yok), + günlük görev. READY'de görünür, koşu içinde ilerleme ve tamamlanma bildirimi. |
| **Koleksiyon yok** (6 boya, hepsi sabit şartla). | 3 | **14 boya + 5 iz efekti**, **Salvage Crate** (kasa) ile rastgele açılır (değişken ödül), kasa kaynağı: görev, rütbe, başarım, günlük hediye. Para birimi yok (P11 korunur). |
| Uzun vade ilerleme çizgisi yok. | 1, 4 | **Pilot rütbesi** (XP), rütbe atlayınca kasa; oyun sonunda XP çubuğu dolar. |
| Oyun sonu ekranı sadece skor/madalya. | 2, 4 | **Ödül ekranı**: not harfi (S–D), XP çubuğu, tamamlanan görevler, yeni açılanlar, rekora/madalyaya ilerleme çubukları. |
| Hedef-gradyan yok (yaklaştığını görememe). | 10, 11 | HUD'da **rekora ilerleme çubuğu**; "kıl payı" mesajları art arda aynı olmasın diye **dönüşümlü** (kanıt 10). |
| **Kavrama hedeflemesi zor** (yeni oyuncu ilk 90 sn'de bırakır). | 14, 15 | İlk 10 koşuda kancaya **hafif manyetizma + geniş yakalama**; kargonun üstünde yaklaşırken **halka işareti**. Deneyim arttıkça yardım azalır. |
| Tekrar hissi, görsel çeşitlilik yok. | 9 | **Gün döngüsü**: her gemi farklı ışık (gün, altın saat, alacakaranlık, gece, şafak), gemi değişiminde geçiş. |
| Juice kapatılamıyor. | 8 | Ayarlara **Screen shake** anahtarı. |
| Seri kaçırınca kayıp, ödev hissi. | 12 | **Affedici giriş serisi** (7 günde bir kalkan, ilk gün kasa) + **Günlük hediye**. |
| Başarım/uzun vade rozetleri yok. | 3, 4 | **20 başarım**, kasa verir, Stats ekranında ilerlemeyle. |
| Koşu geçmişi yok. | 11 | **Stats ekranı**: ömür boyu sayılar, en iyi 5 koşu. |
| Reklam sürtünmesi riski. | 6, 7, 17 | Zaten: sadece AGAIN'de, ≥4 koşu, ≥3 koşu/150 sn aralık, ödüllü opt-in. **Değiştirilmedi.** İstek yoksa hiç reklam yok. |

## Bilerek yapılmayanlar
- Bildirimler (yeni bağımlılık gerekir; GDD §17.1 dışında), liderlik tablosu/bulut kaydı (§18), para birimi/yükseltme (P11), müzik (§18).
- "Fırtına tutkusu" gibi ek canlı etkinlikler: arka uç gerektirir.
