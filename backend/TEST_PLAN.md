# POS Sistemi — Uçtan Uca Test Planı

**Sürüm:** 1.0.0-beta  
**Ortam:** Development (localhost) + isteğe bağlı Production staging  
**Test eden:** _______________  
**Tarih:** _______________

---

## Ön koşullar

| Gereksinim | Komut / Not |
|------------|-------------|
| PostgreSQL çalışıyor | `.env` içinde `DATABASE_URL` |
| Backend | `cd backend && npm run dev` |
| Electron (opsiyonel) | `npm start` |
| Demo veri | `npm run db:seed` |
| Demo lisans | `npm run db:seed-license` |

**Demo hesaplar:**

| Kullanıcı | Şifre | Rol |
|-----------|-------|-----|
| admin | Admin1234 | customer_admin |
| kasiyer | Kasiyer1234 | cashier |
| platform | Platform1234 | platform_admin |

**Demo lisans:** `DEMO-POS-LICENSE-2025`

---

## Test kayıtları

Her test için **Başarılı / Başarısız** işaretleyin ve not düşün.

---

### T01 — Backend health check

| Alan | Değer |
|------|-------|
| **Test adı** | Backend health check |
| **Test adımları** | 1. Backend'i başlat: `cd backend && npm run dev`<br>2. Tarayıcı veya curl: `GET http://localhost:4001/api/v1/health` |
| **Beklenen sonuç** | HTTP 200, JSON yanıt, veritabanı bağlantı durumu görünür |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T02 — Migration

| Alan | Değer |
|------|-------|
| **Test adı** | Veritabanı migration |
| **Test adımları** | 1. `cd backend`<br>2. `npm run db:migrate`<br>3. PostgreSQL'de tabloları kontrol et (`customers`, `products`, `sales`, `licenses`, `devices`) |
| **Beklenen sonuç** | Migration hatasız tamamlanır, `schema_migrations` kaydı oluşur |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T03 — Seed (demo veri)

| Alan | Değer |
|------|-------|
| **Test adı** | Demo seed |
| **Test adımları** | 1. `npm run db:seed`<br>2. Konsolda demo kullanıcı bilgilerini doğrula |
| **Beklenen sonuç** | DEMO-001 müşteri, STORE-001 mağaza, demo ürünler ve kullanıcılar oluşur |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T04 — Demo lisans seed

| Alan | Değer |
|------|-------|
| **Test adı** | Demo lisans oluşturma |
| **Test adımları** | 1. `npm run db:seed-license`<br>2. `DEMO-POS-LICENSE-2025` anahtarının oluştuğunu doğrula |
| **Beklenen sonuç** | Demo lisans + platform admin kullanıcısı hazır |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T05 — Lisans aktivasyonu (Electron / activate.html)

| Alan | Değer |
|------|-------|
| **Test adı** | Demo lisans aktivasyonu |
| **Test adımları** | 1. localStorage temizle (DevTools → Application)<br>2. `login.html` veya Electron aç<br>3. `activate.html`'e yönlendirildiğini doğrula<br>4. Lisans: `DEMO-POS-LICENSE-2025`, cihaz adı gir<br>5. **Aktive Et** |
| **Beklenen sonuç** | Başarı mesajı, `device_id` / `pos_store_id` localStorage'a yazılır, `login.html`'e yönlendirme |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T06 — Lisans doğrulama

| Alan | Değer |
|------|-------|
| **Test adı** | Lisans validate |
| **Test adımları** | 1. Aktivasyon sonrası `login.html` aç<br>2. Network: `GET /api/v1/license/validate?device_id=...&device_fingerprint=...`<br>3. veya curl ile aynı istek |
| **Beklenen sonuç** | `valid: true`, `license_status: active` |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T07 — Login (kasiyer)

| Alan | Değer |
|------|-------|
| **Test adı** | Kasiyer girişi |
| **Test adımları** | 1. `login.html`<br>2. `kasiyer` / `Kasiyer1234`<br>3. Giriş |
| **Beklenen sonuç** | `insert.html` (kasa ekranı) açılır |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T08 — Login (admin)

| Alan | Değer |
|------|-------|
| **Test adı** | Admin girişi |
| **Test adımları** | 1. `login.html`<br>2. `admin` / `Admin1234`<br>3. Giriş |
| **Beklenen sonuç** | `admin.paneli.html` açılır |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T09 — Kasiyer kasa ekranı yükleme

| Alan | Değer |
|------|-------|
| **Test adı** | Kasa ekranı ürün listesi |
| **Test adımları** | 1. Kasiyer ile `insert.html`<br>2. Sayfa hatasız yüklenir<br>3. Ürünler API'den gelir |
| **Beklenen sonuç** | Barkod alanı aktif, ürün verisi yüklenir (hata alert yok) |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T10 — Barkodla ürün ekleme

| Alan | Değer |
|------|-------|
| **Test adı** | Barkod ile sepete ekleme |
| **Test adımları** | 1. Barkod alanına `12345` yaz, Enter<br>2. Sepet tablosunu kontrol et |
| **Beklenen sonuç** | Süt 1L sepete eklenir, tutar güncellenir |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T11 — Yeni ürün oluşturma (kasa)

| Alan | Değer |
|------|-------|
| **Test adı** | Bilinmeyen barkod → yeni ürün modal |
| **Test adımları** | 1. Barkod `99999` (yok) gir<br>2. Modal açılır<br>3. Zorunlu alanları doldur, kaydet |
| **Beklenen sonuç** | Ürün API'ye kaydedilir, sepete eklenir |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T12 — Satış yapma

| Alan | Değer |
|------|-------|
| **Test adı** | Satış kaydı |
| **Test adımları** | 1. Sepete ürün ekle<br>2. Verilen nakit: 100 ₺<br>3. F12 veya yazdır butonu |
| **Beklenen sonuç** | Alert: fiş no, toplam, para üstü; sepet temizlenir; fiş yazdırma penceresi açılır |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T13 — Stok düşümü

| Alan | Değer |
|------|-------|
| **Test adı** | Satış sonrası stok azalması |
| **Test adımları** | 1. Satış öncesi `12345` stok not al<br>2. Satış yap (ör. 2 adet)<br>3. Tekrar barkod sorgula veya admin ürün listesine bak |
| **Beklenen sonuç** | `stock_quantity` satış adedi kadar azalmış |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T14 — Stok hareketi kaydı

| Alan | Değer |
|------|-------|
| **Test adı** | Admin stok hareketleri |
| **Test adımları** | 1. Admin token al<br>2. `GET /api/v1/admin/stock-movements?store_id=STORE_UUID&movement_type=sale` |
| **Beklenen sonuç** | Satışa bağlı stok hareketi kaydı görünür |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T15 — Admin ürün yönetimi

| Alan | Değer |
|------|-------|
| **Test adı** | Admin panel ürün CRUD |
| **Test adımları** | 1. Admin ile giriş<br>2. `?store_id=` veya `pos_store_id` ayarlı<br>3. Ürün listele / ekle / düzenle / sil |
| **Beklenen sonuç** | Tüm işlemler başarılı, liste güncellenir |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T16 — Satış raporu

| Alan | Değer |
|------|-------|
| **Test adı** | Admin satış raporları |
| **Test adımları** | 1. Admin → Satış Raporları<br>2. Tarih filtresi uygula |
| **Beklenen sonuç** | Satış listesi ve dönem cirosu görünür |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T17 — Ciro özeti (Kasa Takibi)

| Alan | Değer |
|------|-------|
| **Test adı** | Ciro / özet rapor |
| **Test adımları** | 1. Admin → Kasa Takibi |
| **Beklenen sonuç** | 7 gün / 30 gün satış adedi, ciro, ortalama sepet görünür |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T18 — Kullanıcı ekleme

| Alan | Değer |
|------|-------|
| **Test adı** | Admin kullanıcı oluşturma |
| **Test adımları** | 1. Admin → Kullanıcılar<br>2. Yeni kasiyer ekle (şifre min 8 karakter, mağaza ID) |
| **Beklenen sonuç** | Kullanıcı listede görünür, giriş yapılabilir |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T19 — Şifre değiştirme

| Alan | Değer |
|------|-------|
| **Test adı** | Şifre değiştir modal |
| **Test adımları** | 1. Admin panel → Şifre Değiştir<br>2. Mevcut + yeni şifre (min 8 karakter) |
| **Beklenen sonuç** | Başarı mesajı, yeni şifre ile giriş yapılabilir |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T20 — Backend kapalıyken hata mesajı

| Alan | Değer |
|------|-------|
| **Test adı** | Offline / backend kapalı |
| **Test adımları** | 1. Backend'i durdur<br>2. `login.html` veya `activate.html` aç<br>3. İşlem dene (giriş / aktivasyon) |
| **Beklenen sonuç** | **Sunucuya bağlanılamadı** mesajı, uygulama çökmez |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T21 — Geçersiz lisans

| Alan | Değer |
|------|-------|
| **Test adı** | Yanlış lisans anahtarı |
| **Test adımları** | 1. localStorage temizle<br>2. `activate.html` → yanlış key gir |
| **Beklenen sonuç** | **Geçersiz lisans** hata mesajı |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T22 — Production config script

| Alan | Değer |
|------|-------|
| **Test adı** | config:dev / config:prod |
| **Test adımları** | 1. `npm run config:prod`<br>2. `frontend/js/config.js` içeriğini kontrol et<br>3. `npm run config:dev` ile geri al |
| **Beklenen sonuç** | Production URL ve APP_ENV doğru yazılır |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T23 — Installer build (pack)

| Alan | Değer |
|------|-------|
| **Test adı** | Electron pack |
| **Test adımları** | 1. `npm run pack`<br>2. `dist/win-unpacked/POS Kasa Sistemi.exe` çalıştır |
| **Beklenen sonuç** | Uygulama açılır, aktivasyon/login akışı çalışır |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T24 — Installer build (dist)

| Alan | Değer |
|------|-------|
| **Test adı** | NSIS installer |
| **Test adımları** | 1. `npm run dist:dev` veya `dist:prod`<br>2. Setup.exe kur<br>3. Masaüstü kısayolundan başlat |
| **Beklenen sonuç** | Kurulum tamamlanır, uygulama çalışır |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | |

---

### T25 — Platform lisans API (opsiyonel)

| Alan | Değer |
|------|-------|
| **Test adı** | Platform admin lisans CRUD |
| **Test adımları** | 1. `platform` / `Platform1234` login<br>2. `GET/POST /api/v1/platform/licenses` |
| **Beklenen sonuç** | Lisans listeleme ve oluşturma çalışır |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | UI yok, yalnızca API |

---

### T26 — PostgreSQL yedek (opsiyonel — Linux/VPS)

| Alan | Değer |
|------|-------|
| **Test adı** | Manuel backup |
| **Test adımları** | 1. `cd backend && npm run backup`<br>2. `backups/pos_backup_*.sql.gz` oluştu mu kontrol et |
| **Beklenen sonuç** | Sıkıştırılmış yedek dosyası oluşur |
| **Başarılı / Başarısız** | ☐ Başarılı ☐ Başarısız |
| **Notlar** | Windows'ta bash/WSL gerekir |

---

## Test özeti

| Metrik | Değer |
|--------|-------|
| Toplam test | 26 |
| Başarılı | |
| Başarısız | |
| Atlanan | |
| Test tarihi | |
| Onaylayan | |

---

## Bilinen risk alanları (kontrol sırasında dikkat)

1. `customer_admin` JWT'de `store_id` yok → admin ürün işlemleri için `pos_store_id` gerekir
2. `style.css` / ses dosyası referansları insert.html'de var; dosya yoksa görsel/ ses eksik olabilir
3. Windows SmartScreen: imzasız installer uyarısı
4. Periyodik lisans doğrulama yalnızca login'de; kasa ekranında periyodik kontrol yok
5. Platform lisans yönetimi UI yok (API only)
6. Offline satış / sync yok

---

## İlgili dokümanlar

- `DEPLOYMENT.md` — VPS kurulum
- `BACKUP.md` — Yedekleme
- `SECURITY_CHECKLIST.md` — Güvenlik
- `../CUSTOMER_DELIVERY_CHECKLIST.md` — Müşteri teslim
- `../RELEASE_NOTES.md` — Sürüm notları
