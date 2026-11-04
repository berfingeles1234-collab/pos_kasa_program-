# PostgreSQL Yedekleme Rehberi

## Müşteri bilgisayarı (Windows) — hızlı yedek

```powershell
cd backend
npm run backup:win
```

**Çıktı klasörü:** `backend\backups\`  
**Dosya adı:** `pos_backup_YYYYMMDD_HHMMSS.sql.gz`

**Ön koşullar:**

- `.env` dosyasında veritabanı bilgileri doğru
- `pg_dump` PATH'te (PostgreSQL kurulumu ile gelir)

**Örnek PATH ekleme:** `C:\Program Files\PostgreSQL\16\bin`

**Öneri:** Haftada bir manuel yedek; önemli işlemler öncesi ek yedek.

---

## Linux / VPS — hızlı yedek

```bash
cd backend
npm run backup
```

---

## Yedek dosyaları nerede?

Varsayılan: `backend/backups/`

`.env` ile özelleştirme:

```env
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30
```

30 günden eski yedekler otomatik silinir.

---

## Geri yükleme (teknisyen)

Linux/VPS:

```bash
cd backend
bash scripts/restore-postgres.sh backups/pos_backup_20250620_030000.sql.gz
```

Windows: `gunzip` + `psql` veya pgAdmin ile `.sql.gz` dosyasını açıp içe aktarın.

**Önemli:** Geri yüklemeden önce mevcut yedeği alın ve backend servisini durdurun.

```powershell
..\scripts\stop-service.ps1
npm run backup:win
# restore işlemi
..\scripts\start-service.ps1
```

---

## Otomatik yedek (VPS)

Cron örneği — `backend/DEPLOYMENT.md` ve aşağıdaki Linux bölümüne bakın.

---

## Sorun giderme

| Sorun | Çözüm |
|-------|--------|
| `pg_dump bulunamadı` | PostgreSQL client tools kur / PATH |
| Boş yedek | `.env` DATABASE_URL veya DB_* kontrolü |
| İzin hatası | `backups` klasörü yazılabilir mi |

Detaylı Linux/cron/uzak yedek: aşağıdaki bölümler.

---

# Linux / VPS detay (gelişmiş)

## Manuel yedek alma

```bash
cd /var/www/pos-backend/backend
chmod +x scripts/backup-postgres.sh
npm run backup
```

## Manuel geri yükleme

```bash
bash scripts/restore-postgres.sh backups/pos_backup_20250620_030000.sql.gz
```

## Cron ile günlük otomatik yedek

```bash
crontab -e
```

```cron
0 3 * * * cd /var/www/pos-backend/backend && /usr/bin/bash scripts/backup-postgres.sh >> logs/backup.log 2>&1
```

## Uzak yedek

Günlük yedekleri VPS dışına kopyalayın (USB, NAS, bulut). 3-2-1 kuralı hedeflenmelidir.

## Güvenlik

- Yedek dosyaları müşteri verisi içerir
- Public web dizinine koymayın
- Erişimi kısıtlayın

Detaylı güvenlik: `SECURITY_CHECKLIST.md`
