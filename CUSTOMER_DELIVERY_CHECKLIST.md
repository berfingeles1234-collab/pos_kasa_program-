# Müşteri Teslim Kontrol Listesi

**Proje:** POS Kasa Sistemi  
**Sürüm:** 1.0.0-beta  
**Müşteri:** _______________  
**Teslim tarihi:** _______________  
**Teslim eden:** _______________

---

## 1. Altyapı ve domain

| # | Kontrol | Durum | Not |
|---|---------|-------|-----|
| 1.1 | Domain hazır mı? (`api.seninmarkan.com` veya müşteri domain) | ☐ Evet ☐ Hayır | |
| 1.2 | DNS A kaydı VPS IP'ye yönlendirildi mi? | ☐ Evet ☐ Hayır | |
| 1.3 | VPS hazır mı? (Ubuntu, Node 20, PostgreSQL) | ☐ Evet ☐ Hayır | |
| 1.4 | Backend PM2 ile çalışıyor mu? | ☐ Evet ☐ Hayır | |
| 1.5 | Nginx reverse proxy aktif mi? | ☐ Evet ☐ Hayır | |
| 1.6 | SSL / HTTPS aktif mi? (Let's Encrypt) | ☐ Evet ☐ Hayır | |
| 1.7 | Health check dışarıdan çalışıyor mu? (`/api/v1/health`) | ☐ Evet ☐ Hayır | |

---

## 2. Güvenlik

| # | Kontrol | Durum | Not |
|---|---------|-------|-----|
| 2.1 | `JWT_SECRET` production'da güçlü ve benzersiz mi? | ☐ Evet ☐ Hayır | |
| 2.2 | Demo seed şifreleri değiştirildi mi? (`admin`, `kasiyer`) | ☐ Evet ☐ Hayır | |
| 2.3 | `.env` git'e commit edilmedi mi? | ☐ Evet ☐ Hayır | |
| 2.4 | PostgreSQL dışarıya kapalı mı? (yalnızca localhost) | ☐ Evet ☐ Hayır | |
| 2.5 | Port 4001 dışarıya kapalı mı? | ☐ Evet ☐ Hayır | |
| 2.6 | Firewall: yalnızca 80/443 açık mı? | ☐ Evet ☐ Hayır | |
| 2.7 | CORS production'da bilinçli ayarlandı mı? | ☐ Evet ☐ Hayır | |

Detay: `backend/SECURITY_CHECKLIST.md`

---

## 3. Veritabanı ve yedekleme

| # | Kontrol | Durum | Not |
|---|---------|-------|-----|
| 3.1 | Migration production'da çalıştırıldı mı? | ☐ Evet ☐ Hayır | |
| 3.2 | Demo seed production'da bilinçli mi? (ilk kurulum sonrası şifre değişimi) | ☐ Evet ☐ Hayır | |
| 3.3 | PostgreSQL yedeği manuel alındı mı? | ☐ Evet ☐ Hayır | |
| 3.4 | Cron ile günlük otomatik yedek kuruldu mu? | ☐ Evet ☐ Hayır | |
| 3.5 | Yedek dosyaları uzak depoya kopyalanıyor mu? | ☐ Evet ☐ Hayır | |
| 3.6 | Restore en az bir kez test edildi mi? | ☐ Evet ☐ Hayır | |

Detay: `backend/BACKUP.md`

---

## 4. Lisans ve installer

| # | Kontrol | Durum | Not |
|---|---------|-------|-----|
| 4.1 | Müşteriye özel lisans oluşturuldu mu? | ☐ Evet ☐ Hayır | Lisans key: ________ |
| 4.2 | Lisans doğru `customer_id` / `store_id` ile bağlı mı? | ☐ Evet ☐ Hayır | |
| 4.3 | `scripts/set-config.js` production domain güncellendi mi? | ☐ Evet ☐ Hayır | |
| 4.4 | `npm run dist:prod` ile installer alındı mı? | ☐ Evet ☐ Hayır | |
| 4.5 | Installer production API URL ile test edildi mi? | ☐ Evet ☐ Hayır | |
| 4.6 | Lisans aktivasyonu müşteri PC'de test edildi mi? | ☐ Evet ☐ Hayır | |

---

## 5. Müşteri PC uçtan uca test

| # | Kontrol | Durum | Not |
|---|---------|-------|-----|
| 5.1 | Installer kurulumu başarılı mı? | ☐ Evet ☐ Hayır | |
| 5.2 | Aktivasyon ekranı çalışıyor mu? | ☐ Evet ☐ Hayır | |
| 5.3 | Kasiyer login çalışıyor mu? | ☐ Evet ☐ Hayır | |
| 5.4 | Barkod ile satış yapılabiliyor mu? | ☐ Evet ☐ Hayır | |
| 5.5 | Fiş yazdırma çalışıyor mu? | ☐ Evet ☐ Hayır | |
| 5.6 | Stok düşümü doğru mu? | ☐ Evet ☐ Hayır | |
| 5.7 | Admin panel erişimi çalışıyor mu? | ☐ Evet ☐ Hayır | |
| 5.8 | Satış raporu / ciro görünüyor mu? | ☐ Evet ☐ Hayır | |
| 5.9 | Backend kapalıyken anlaşılır hata mesajı var mı? | ☐ Evet ☐ Hayır | |

Detay: `backend/TEST_PLAN.md`

---

## 6. Dokümantasyon ve destek

| # | Kontrol | Durum | Not |
|---|---------|-------|-----|
| 6.1 | Müşteriye lisans anahtarı teslim edildi mi? | ☐ Evet ☐ Hayır | |
| 6.2 | Kasiyer / admin kullanıcı bilgileri teslim edildi mi? | ☐ Evet ☐ Hayır | |
| 6.3 | Destek iletişim kanalı hazır mı? (telefon, e-posta, ticket) | ☐ Evet ☐ Hayır | |
| 6.4 | RELEASE_NOTES müşteri ile paylaşıldı mı? | ☐ Evet ☐ Hayır | |
| 6.5 | Bilinen kısıtlamalar (beta) anlatıldı mı? | ☐ Evet ☐ Hayır | |

**Destek iletişim:** _______________  
**Destek e-posta:** _______________  
**Acil telefon:** _______________

---

## Teslim onayı

| Rol | Ad Soyad | İmza | Tarih |
|-----|----------|------|-------|
| Teslim eden | | | |
| Müşteri yetkilisi | | | |

---

## Teslim paketi içeriği

- [ ] Windows installer (`.exe`)
- [ ] Lisans anahtarı
- [ ] Kullanıcı hesapları listesi
- [ ] RELEASE_NOTES.md
- [ ] Kısa kullanım kılavuzu (opsiyonel)
- [ ] Destek iletişim bilgisi
