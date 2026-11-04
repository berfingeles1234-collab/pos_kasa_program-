# Sorun Giderme (Troubleshooting)

Kullanıcıya **teknik hata metni göstermeyin**. Aşağıdaki tablolar teknisyen içindir; müşteriye yalnızca “Ne yapmalı?” sütunundaki ifadeleri iletin.

---

## Hızlı teşhis

| Belirti | Olası neden | Teknisyen kontrolü |
|---------|-------------|-------------------|
| “Sunucuya bağlanılamadı” | Backend kapalı | `services.msc` → POS-Backend |
| Login açılmıyor / sürekli yükleniyor | API veya PG down | `http://localhost:4001/api/v1/health` |
| “Oturum süreniz doldu” | Token süresi / bozuk token | Normal — tekrar giriş |
| Aktivasyon ekranı | Lisans yok / geçersiz | `activate.html`, lisans key |
| SmartScreen uyarısı | Kod imzası yok | “Yine de çalıştır” veya imzalama (faz 2) |
| Satış kaydedilmiyor | API veya stok hatası | Backend log + admin stok |

---

## 1. Backend çalışmıyor

**Müşteriye söyleyin:** “Sistem servisi başlatılıyor, birkaç dakika bekleyin. Sorun devam ederse destek arayın.”

**Teknisyen:**

```powershell
# Yönetici PowerShell
cd backend
..\scripts\start-service.ps1
```

Loglar:

```text
backend\logs\service-out.log
backend\logs\service-error.log
```

Manuel test:

```powershell
cd backend
npm start
```

---

## 2. PostgreSQL çalışmıyor

**Müşteriye söyleyin:** “Veritabanı bağlantısı kurulamadı. Destek ekibine bildirin.”

**Teknisyen:**

1. `services.msc` → **postgresql-x64-*** → Başlat
2. Health kontrol:

```text
GET http://localhost:4001/api/v1/health
```

503 ve `"database": { "status": "error" }` → PostgreSQL sorunu.

3. Bağlantı testi:

```powershell
psql -U postgres -d pos_db -c "SELECT 1;"
```

4. `.env` içinde `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` doğrula.

---

## 3. Health check referansı

**Sağlıklı (200):**

```json
{
  "status": "ok",
  "message": "POS API çalışıyor",
  "database": { "status": "connected" }
}
```

**Bozuk veritabanı (503):**

```json
{
  "status": "degraded",
  "database": { "status": "error" }
}
```

---

## 4. Oturum / token sorunları

| Durum | Davranış |
|-------|----------|
| Token süresi doldu | “Oturum süreniz doldu. Lütfen tekrar giriş yapın.” → login |
| Geçersiz token | Aynı — teknik mesaj gösterilmez |
| Yetkiniz yok (403, rol) | İlgili ekranda yetki mesajı — oturum kapanmaz |

**Teknisyen:** `localStorage` içinde yalnızca `token`, `user`, `girisYapan` silinir; lisans alanları korunur.

---

## 5. Lisans / aktivasyon

| Belirti | Çözüm |
|---------|--------|
| Aktivasyon ekranına düşüyor | Lisans key girin veya `device_id` sıfırlama (destek) |
| “Cihaz aktivasyonu gerekli” | `activate.html` |
| Lisans süresi dolmuş | Yeni lisans / yenileme |
| Aktivasyon sırasında ağ hatası | Backend çalışıyor mu; `/license/activate` token gerektirmez |

**Korunan localStorage alanları:** `device_id`, `device_fingerprint`, `license_status`, `license_expires_at`, `pos_store_id`, `customer_id`

---

## 6. Electron uygulaması açılmıyor

| Sorun | Çözüm |
|-------|--------|
| SmartScreen | “Daha fazla bilgi” → “Yine de çalıştır” |
| Beyaz ekran | `config.js` API URL kontrolü |
| Eski sürüm | Kaldır → Setup.exe yeniden kur |

On-prem API URL:

```javascript
API_BASE_URL: 'http://localhost:4001/api/v1'
```

---

## 7. Yedekleme sorunları (Windows)

| Sorun | Çözüm |
|-------|--------|
| `pg_dump bulunamadı` | PostgreSQL `bin` klasörünü PATH’e ekle |
| Boş yedek | `.env` DB şifresi ve `pos_db` |
| İzin hatası | `backend\backups` yazılabilir mi |

```powershell
cd backend
npm run backup:win
```

---

## 8. Windows Service (NSSM)

| Sorun | Çözüm |
|-------|--------|
| NSSM bulunamadı | [nssm.cc](https://nssm.cc/download) kur, PATH’e ekle |
| Servis hemen duruyor | `service-error.log` — genelde `.env` veya `node_modules` |
| Port 4001 meşgul | `netstat -ano \| findstr 4001` |

```powershell
..\scripts\uninstall-service.ps1
..\scripts\install-service.ps1
```

---

## 9. Satış / fiş / rapor

| Sorun | Kontrol |
|-------|---------|
| Sepet boş uyarısı | Normal |
| Yetersiz stok | Admin → ürün stok |
| Fiş yazdırılmıyor | Tarayıcı yazdırma izni / varsayılan yazıcı |
| Raporda veri yok | Tarih filtresi, mağaza seçimi |

---

## 10. Destek için toplanacak bilgiler

Teknisyen talep ederken şunları isteyin:

1. `backend\logs\service-error.log` (son 50 satır)
2. Health endpoint yanıtı
3. PostgreSQL servis durumu
4. Uygulama sürümü (`package.json` version)
5. Hatanın ekran görüntüsü (teknik JSON değil, kullanıcı mesajı)

---

## İlgili dokümanlar

- `CUSTOMER_INSTALLATION_GUIDE.md` — kurulum
- `INSTALLER_PLAN.md` — mimari
- `backend/DEPLOYMENT.md` — bulut/VPS
- `backend/BACKUP.md` — yedekleme
