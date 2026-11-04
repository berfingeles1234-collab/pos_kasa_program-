# Teslim Öncesi Kontrol Listesi (Pre-Delivery)

**Müşteri:** _______________  
**Kurulum tipi:** ☐ On-prem (localhost) ☐ Bulut (uzak API)  
**Teslim tarihi:** _______________  
**Teknisyen:** _______________

---

## 1. Altyapı

| # | Kontrol | ☐ | Not |
|---|---------|---|-----|
| 1.1 | Windows 10/11 kurulu | | |
| 1.2 | Node.js 20 LTS kurulu (`node -v`) | | |
| 1.3 | PostgreSQL kurulu ve çalışıyor | | |
| 1.4 | `pos_db` veritabanı oluşturuldu | | |
| 1.5 | Backend `.env` üretim değerleriyle dolduruldu | | |
| 1.6 | `JWT_SECRET` güçlü ve benzersiz | | |
| 1.7 | `POS-Backend` Windows Service kurulu ve **Running** | | |

---

## 2. Veritabanı

| # | Kontrol | ☐ | Not |
|---|---------|---|-----|
| 2.1 | `npm run db:migrate` hatasız | | |
| 2.2 | Migration 001–003 uygulandı | | |
| 2.3 | Seed bilinçli (demo / müşteri verisi) | | |
| 2.4 | Müşteri lisansı oluşturuldu ve test edildi | | Lisans key: ______ |
| 2.5 | Windows yedek testi: `npm run backup:win` | | |
| 2.6 | Yedek dosyası boş değil | | |

---

## 3. API ve sağlık

| # | Kontrol | ☐ | Not |
|---|---------|---|-----|
| 3.1 | `GET http://localhost:4001/api/v1/health` → 200 | | |
| 3.2 | Health yanıtında `database.status: connected` | | |
| 3.3 | PostgreSQL durdurulunca health → 503 (test) | | |
| 3.4 | Backend durdurulunca frontend “Sunucuya bağlanılamadı” | | |

---

## 4. Electron installer

| # | Kontrol | ☐ | Not |
|---|---------|---|-----|
| 4.1 | On-prem: `npm run dist:onprem` alındı | | |
| 4.2 | Bulut: `npm run dist:prod` + domain güncellendi | | |
| 4.3 | Setup.exe müşteri PC’de kuruldu | | |
| 4.4 | Masaüstü kısayolu oluştu | | |
| 4.5 | `config.js` doğru API URL (on-prem: localhost:4001) | | |

---

## 5. Uygulama akışları (E2E)

| # | Kontrol | ☐ | Not |
|---|---------|---|-----|
| 5.1 | Lisans aktivasyonu | | |
| 5.2 | Admin giriş | | |
| 5.3 | Kasiyer giriş | | |
| 5.4 | Ürün ekleme / barkod | | |
| 5.5 | Normal satış + fiş | | |
| 5.6 | Fatura modu satış (varsa) | | |
| 5.7 | Kasa takibi / raporlar | | |
| 5.8 | Oturum süresi dolunca login yönlendirme | | |
| 5.9 | Bozuk token → teknik hata yok, login mesajı | | |
| 5.10 | Uygulama kapat/aç — veri korunuyor | | |

---

## 6. Güvenlik

| # | Kontrol | ☐ | Not |
|---|---------|---|-----|
| 6.1 | Demo şifreler değiştirildi veya teslim notunda uyarı | | |
| 6.2 | `.env` müşteri makinesinde güvenli | | |
| 6.3 | PostgreSQL dış ağa kapalı (yalnızca localhost) | | |
| 6.4 | Yedek klasörü yetkisiz erişime kapalı | | |

Detay: `backend/SECURITY_CHECKLIST.md`

---

## 7. Dokümantasyon teslimi

| # | Dosya | ☐ |
|---|-------|---|
| 7.1 | `CUSTOMER_INSTALLATION_GUIDE.md` | |
| 7.2 | `TROUBLESHOOTING.md` | |
| 7.3 | `backend/BACKUP.md` (teknisyen) | |
| 7.4 | Lisans anahtarı ve destek iletişimi | |

---

## 8. Bilinen MVP eksikleri (müşteriye açık)

| Konu | Durum |
|------|--------|
| Kod imzası (SmartScreen) | Yok — “Bilinmeyen yayıncı” uyarısı olabilir |
| Otomatik güncelleme | Yok |
| Tek exe ile PG+backend+app | Yok — teknisyen backend kurar |
| PostgreSQL otomatik kurulum | Yok |

---

## Onay

| Rol | Ad | İmza | Tarih |
|-----|-----|------|-------|
| Teknisyen | | | |
| Müşteri temsilcisi | | | |

**Tüm maddeler tamamlanmadan müşteriye resmi teslim yapılmamalıdır.**
