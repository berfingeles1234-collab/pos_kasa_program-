# Müşteri Kurulum Rehberi

Bu rehber **on-prem (müşteri bilgisayarında)** kurulum içindir.  
Müşteri yalnızca **Bölüm C**’yi görür; **A** ve **B** teknisyen / kurulum ekibi içindir.

---

## A. Ön gereksinimler (teknisyen)

| Gereksinim | Sürüm / not |
|------------|-------------|
| Windows | 10 veya 11 (64-bit) |
| Node.js | 20 LTS — [nodejs.org](https://nodejs.org/) |
| PostgreSQL | 15 veya 16 — [postgresql.org](https://www.postgresql.org/download/windows/) |
| NSSM | Windows Service için — [nssm.cc](https://nssm.cc/download) |
| Disk | En az 2 GB boş alan |
| Ağ | İnternet (ilk aktivasyon); günlük kullanımda localhost yeterli |

---

## B. Teknisyen kurulum adımları (gerçek sıra)

### B0. Ön kontrol (preflight)

Kuruluma başlamadan önce ve her kritik adımdan sonra:

```powershell
cd proje-kökü
npm run preflight
```

veya `backend` klasöründen:

```powershell
cd backend
npm run preflight
```

Beklenen çıktı örneği:

```text
✓ Node.js bulundu (v20.x)
✓ PostgreSQL çalışıyor
✓ Veritabanı 'pos_db' bulundu
✗ Backend health yanıt vermiyor   ← servis kurulmadıysa normal (uyarı)
```

Tüm **zorunlu** maddeler geçmeden servis kurulumuna geçmeyin.

---

### B1. PostgreSQL kur

1. PostgreSQL installer’ı çalıştırın.
2. Süper kullanıcı şifresini not edin.
3. Port: **5432** (varsayılan).
4. **Command Line Tools** bileşeninin seçili olduğundan emin olun (`psql`, `pg_dump`).

---

### B2. pos_db oluştur

pgAdmin veya `psql` ile:

```sql
CREATE DATABASE pos_db;
```

```powershell
psql -U postgres -c "CREATE DATABASE pos_db;"
```

Kontrol: `npm run preflight` → `✓ Veritabanı 'pos_db' bulundu`

---

### B3. backend/.env ayarla

```powershell
cd backend
copy .env.example .env
notepad .env
```

En az şunları ayarlayın:

```env
PORT=4001
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pos_db
DB_USER=postgres
DB_PASSWORD=GÜÇLÜ_ŞİFRE
JWT_SECRET=UZUN_RASTGELE_BİR_ANAHTAR
JWT_EXPIRES_IN=12h
CORS_ORIGIN=*
```

Kontrol: `npm run preflight` → `✓ backend/.env bulundu`

---

### B4. npm install

```powershell
cd backend
npm install
```

Kontrol: `npm run preflight` → `✓ backend/node_modules bulundu`

---

### B5. npm run db:migrate

```powershell
npm run db:migrate
```

Kontrol: `npm run preflight` → `✓ Migration uygulanmış (3 dosya)`

---

### B6. npm run db:seed

```powershell
npm run db:seed
```

Demo kullanıcılar ve örnek ürünler oluşturulur.

> **Üretim:** Demo şifreleri (`admin` / `kasiyer`) ilk girişten sonra mutlaka değiştirin.

---

### B7. npm run db:seed-license

```powershell
npm run db:seed-license
```

Lisans ve platform admin kaydı oluşturulur (ilk kurulum).

---

### B8. Windows Service kur (NSSM)

**PowerShell’i Yönetici olarak** açın:

```powershell
cd backend
npm run service:install
```

Script otomatik kontrol eder:

- NSSM kurulu mu
- `.env` ve `node_modules` var mı
- PostgreSQL bağlantısı çalışıyor mu
- Migration uygulanmış mı
- Port 4001 uygun mu
- Kurulum sonrası health endpoint

Servis adı: `POS-Backend`

Alternatif (doğrudan script):

```powershell
..\scripts\install-service.ps1
```

---

### B9. Servisi başlat

Kurulum sırasında otomatik başlar. Gerekirse:

```powershell
cd backend
npm run service:start
```

---

### B10. Health check

```powershell
npm run preflight
```

veya tarayıcı:

[http://localhost:4001/api/v1/health](http://localhost:4001/api/v1/health)

Beklenen:

```json
{
  "status": "ok",
  "database": { "status": "connected" }
}
```

---

### B11. POS Setup.exe kur (geliştirme makinesinde derle)

Geliştirme bilgisayarında:

```powershell
cd proje-kökü
npm install
npm run dist:onprem
```

Müşteri PC’ye kopyalayın:

`dist\POS-Kasa-Sistemi-Setup-1.0.0.exe`

Müşteri PC’de:

1. `POS-Kasa-Sistemi-Setup-1.0.0.exe` çalıştırın.
2. **İleri → Kur → Bitir**
3. Masaüstünde **POS Kasa Sistemi** kısayolu oluşur.

---

### B12. Lisans aktivasyonu

1. Uygulamayı açın.
2. Aktivasyon ekranında lisans anahtarını girin.
3. Başarılı aktivasyondan sonra giriş ekranına yönlendirilirsiniz.

---

### B13. İlk giriş testi

| Rol | Varsayılan kullanıcı (seed) | Not |
|-----|----------------------------|-----|
| Admin | `admin` | Şifreyi değiştirin |
| Kasiyer | `kasiyer` | Şifreyi değiştirin |

Son kontrol: `PRE_DELIVERY_CHECKLIST.md`

---

## C. Müşteri günlük kullanım

1. Bilgisayarı açın — **POS-Backend** servisi otomatik çalışır.
2. Masaüstünden **POS Kasa Sistemi**’ni açın.
3. Kasiyer veya yönetici olarak giriş yapın.

**Müşterinin yapmaması gerekenler:** Terminal açmak, Node.js/npm çalıştırmak, `.env` düzenlemek.

---

## D. Yedekleme (teknisyen — haftalık önerilir)

```powershell
cd backend
npm run backup:win
```

Yedekler: `backend\backups\pos_backup_YYYYMMDD_HHMMSS.sql.gz`

Detay: `backend/BACKUP.md`

---

## E. Servis yönetimi (teknisyen)

| İşlem | Komut (`backend` klasöründen, Yönetici PowerShell) |
|-------|-----------------------------------------------------|
| Ön kontrol | `npm run preflight` |
| Kur | `npm run service:install` |
| Başlat | `npm run service:start` |
| Durdur | `npm run service:stop` |
| Kaldır | `npm run service:uninstall` |

Alternatif: `services.msc` → **POS Kasa Backend API**

---

## F. Sorun mu var?

`TROUBLESHOOTING.md` dosyasına bakın.

---

## G. Teslim paketi içeriği

Müşteriye verilecekler:

- [ ] `POS-Kasa-Sistemi-Setup-*.exe`
- [ ] Lisans anahtarı
- [ ] Bu rehberin müşteri özeti (Bölüm C + iletişim)
- [ ] Teknisyen notları (şifreler güvenli kanaldan)

Kurulum ekibine:

- [ ] `npm run preflight` tüm zorunlu maddeler geçti
- [ ] `PRE_DELIVERY_CHECKLIST.md` tamamlandı
- [ ] Demo şifreler değiştirildi veya değiştirme planı yazıldı
