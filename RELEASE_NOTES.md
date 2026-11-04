# Release Notes — POS Kasa Sistemi

**Version:** 1.0.0-beta  
**Release date:** 2025  
**Status:** Beta — production kullanımı için teslim checklist tamamlanmalıdır

---

## Özet

Çok müşterili (multi-tenant) POS kasa sistemi. PostgreSQL backend, Electron masaüstü uygulaması, admin paneli ve lisans aktivasyonu içerir.

---

## Özellikler

### Backend (PostgreSQL)

- Multi-tenant mimari (`customer_id`, `store_id`)
- JWT kimlik doğrulama ve rol tabanlı yetkilendirme
- POS API: ürün, barkod arama, satış (transaction + stok düşümü)
- Admin API: satış raporları, ciro özeti, kullanıcı yönetimi, ayarlar, stok hareketleri
- Lisans ve cihaz aktivasyon API
- Platform admin lisans yönetimi (API)
- Audit log kayıtları
- PM2, Nginx, yedekleme ve deployment dokümantasyonu

### Electron masaüstü

- Kasa ekranı (`insert.html`)
- Admin paneli (`admin.paneli.html`)
- Login ve lisans aktivasyon akışı
- Windows NSIS installer desteği
- Ortam bazlı API config (`config.js`, `dist:prod`)

### Kasa (POS)

- Barkod ile ürün ekleme
- Yeni ürün oluşturma (modal)
- Sepet yönetimi
- Nakit satış, backend toplam hesaplama
- Fiş yazdırma
- Fiyat gör, klavye kısayolları

### Admin panel

- Ürün CRUD
- Satış raporları (tarih filtresi)
- Kasa takibi / ciro özeti
- Kullanıcı yönetimi (ekle, düzenle, pasifleştir)
- Şifre değiştirme

### Lisans

- Cihaz aktivasyon ekranı
- Login öncesi lisans doğrulama
- Demo lisans seed komutu

---

## Demo hesaplar (geliştirme)

| Kullanıcı | Şifre | Rol |
|-----------|-------|-----|
| admin | Admin1234 | customer_admin |
| platform | Platform1234 | platform_admin |
| kasiyer | Kasiyer1234 | cashier |

**Demo lisans:** `DEMO-POS-LICENSE-2025`

> Production'da tüm demo şifreler değiştirilmelidir.

---

## Kurulum (kısa)

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run db:seed-license
npm run dev

# Electron
npm start

# Production installer
npm run dist:prod
```

---

## Bilinen eksikler / kısıtlamalar

| Eksik | Açıklama |
|-------|----------|
| Gerçek donanım fingerprint | MVP'de persistent UUID kullanılıyor |
| Auto-update | Electron otomatik güncelleme yok |
| Code signing | Windows installer imzasız; SmartScreen uyarısı olabilir |
| Offline sync | İnternet kesilince satış kuyruğu yok |
| Platform lisans UI | Lisans yönetimi yalnızca API (admin UI yok) |
| Periyodik lisans kontrolü | Yalnızca login açılışında; kasa ekranında periyodik validate yok |
| Fiş logları | Admin panelde fiş log ekranı placeholder |
| Eski SQLite server | `server.js` arşiv amaçlı duruyor, kullanılmıyor |

---

## Dokümantasyon

| Dosya | Konu |
|-------|------|
| `backend/DEPLOYMENT.md` | VPS deploy |
| `backend/BACKUP.md` | Yedekleme |
| `backend/SECURITY_CHECKLIST.md` | Güvenlik |
| `backend/TEST_PLAN.md` | Uçtan uca test |
| `CUSTOMER_DELIVERY_CHECKLIST.md` | Müşteri teslim |
| `frontend/js/CONFIG_NOTES.md` | API URL config |

---

## Upgrade notları

Bu sürüm ilk beta teslim sürümüdür. Sonraki sürümlerde:

- 1.1.0: Platform lisans admin UI, periyodik lisans kontrolü
- 1.2.0: Code signing, auto-update
- 2.0.0: Offline sync kuyruğu

---

## Destek

Beta döneminde destek kanalı müşteri sözleşmesine göre tanımlanmalıdır.
