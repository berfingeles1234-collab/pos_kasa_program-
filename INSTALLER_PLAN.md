# INSTALLER_PLAN — Müşteri Kurulum Mimarisi

**Aşama:** Customer Ready Stabilization  
**Sürüm:** 1.0.0  
**Hedef:** Teknik bilgi gerektirmeden kurulum — müşteri yalnızca Setup.exe görür.

---

## 1. Mevcut mimari özeti

| Katman | Teknoloji | Konum |
|--------|-----------|--------|
| Masaüstü uygulama | Electron 37 + statik HTML/JS | `main.js`, `login.html`, `insert.html`, `admin.paneli.html` |
| API | Node.js 20 + Express | `backend/src/server.js` — port **4001** |
| Veritabanı | PostgreSQL | `pos_db` (varsayılan) |
| Lisans | Cihaz aktivasyonu | `activate.html` → `/api/v1/license/*` |
| Yapılandırma | `frontend/js/config.js` | `scripts/set-config.js` ile üretilir |
| Kurulum paketi | electron-builder **NSIS** | `npm run dist:onprem` → `dist/POS-Kasa-Sistemi-Setup-*.exe` |
| DB şema | SQL migration | `backend/src/db/migrations/` |
| İlk veri | seed + seed-license | `npm run db:seed`, `db:seed-license` |

**Önemli:** Electron installer yalnızca **frontend** paketler. Backend ve PostgreSQL ayrı kurulur (on-prem MVP).

---

## 2. Müşteri deneyimi hedefi

```
POS Kasa Sistemi Setup.exe
  → Next → Next → Kur → Bitir
  → Masaüstü kısayolu: POS Kasa Sistemi
  → Uygulama açılır (login / aktivasyon)
```

Müşteri **Node.js, npm, terminal, PM2** görmemeli. Backend arka planda Windows Service olarak çalışır.

---

## 3. Kurulum bileşenleri listesi

| # | Bileşen | Kim kurar | Araç |
|---|---------|-----------|------|
| 1 | PostgreSQL 15/16 | Teknisyen (kurulum öncesi veya sihirbaz) | Resmi installer |
| 2 | `pos_db` veritabanı | Teknisyen | `createdb` veya pgAdmin |
| 3 | Backend `.env` | Teknisyen | `.env.example` kopyası |
| 4 | `npm install` (backend) | Teknisyen | Node.js 20 LTS |
| 5 | Migration | Teknisyen | `npm run db:migrate` |
| 6 | Seed (ilk kurulum) | Teknisyen | `npm run db:seed` (+ lisans) |
| 7 | Windows Service | Teknisyen | `scripts/install-service.ps1` (NSSM) |
| 8 | Electron Setup.exe | Müşteri | `dist:onprem` çıktısı |
| 9 | Lisans aktivasyonu | Müşteri | `activate.html` |
| 10 | Masaüstü kısayolu | Otomatik | NSIS (electron-builder) |

---

## 4. Teknik seçenek karşılaştırması

### Electron installer

| Seçenek | Uygunluk | Not |
|---------|----------|-----|
| **electron-builder (NSIS)** | ✅ Önerilen (MVP) | Zaten projede var; masaüstü kısayolu, kur/kaldır |
| Inno Setup | ⚠️ İkinci aşama | Tüm stack (PG+backend+app) tek exe için daha uygun; özel script gerekir |
| NSIS custom | ⚠️ Gereksiz | electron-builder zaten NSIS üretiyor |

**Sonuç:** Müşteri POS için **electron-builder NSIS yeterli**. Tam “tek tık her şey” için gelecekte Inno Setup master installer düşünülebilir.

### Backend Windows Service

| Seçenek | Uygunluk | Not |
|---------|----------|-----|
| **NSSM** | ✅ Önerilen | Kararlı, Node için yaygın, log yönlendirme kolay |
| node-windows | ⚠️ | npm bağımlılığı; kurulumda ek karmaşıklık |
| PM2 (Windows) | ❌ Müşteri için uygun değil | Geliştirme/VPS içindir |
| Görev Zamanlayıcı | ❌ | Yeniden başlatma zayıf |

**Sonuç:** **NSSM** + `scripts/install-service.ps1`.

### PostgreSQL

| Seçenek | Uygunluk | Not |
|---------|----------|-----|
| **Manuel kurulum + kontrol scripti** | ✅ MVP | En güvenli; silent PG kurulumu sürüm/izin riski taşır |
| Silent PG installer | ⚠️ Faz 2 | Büyük paket; firewall/port çakışması |
| Portable PostgreSQL | ❌ | Üretim için önerilmez |

**Sonuç:** PostgreSQL **manuel veya yarı otomatik** (teknisyen kurar, health check doğrular).

---

## 5. Önerilen MVP teslim mimarisi (on-prem)

```
[Müşteri PC — Windows 10/11]
│
├── PostgreSQL (localhost:5432, pos_db)
│
├── Windows Service: POS-Backend
│   └── Node.js → backend/src/server.js → :4001
│
└── POS Kasa Sistemi (Electron)
    └── config.js → http://localhost:4001/api/v1
```

**Veri akışı:** Electron → localhost API → PostgreSQL (aynı makine veya LAN sunucu).

**Bulut alternatifi:** VPS + `config:prod` + `dist:prod` — `backend/DEPLOYMENT.md` referans.

---

## 6. Installer üretim komutları (geliştirici)

### On-prem müşteri (localhost API)

```powershell
cd "proje-kökü"
npm install
npm run dist:onprem
# Çıktı: dist\POS-Kasa-Sistemi-Setup-1.0.0.exe
```

### Bulut / uzak API

```powershell
# scripts/set-config.js içinde production URL'yi müşteri domainine güncelle
npm run dist:prod
```

---

## 7. Gelecek faz: tek kurulum paketi (opsiyonel)

Faz 2 için önerilen sıra:

1. Inno Setup **master installer**:
   - PostgreSQL prerequisite kontrolü
   - Backend dosyalarını `C:\Program Files\POS\backend`
   - NSSM service kurulumu
   - Electron Setup.exe’yi silent çalıştırma
2. Kod imzalama (SmartScreen uyarısını azaltır)
3. Otomatik güncelleme (electron-updater)

---

## 8. İlgili dosyalar

| Dosya | Amaç |
|-------|------|
| `CUSTOMER_INSTALLATION_GUIDE.md` | Teknisyen + müşteri adım adım kurulum |
| `PRE_DELIVERY_CHECKLIST.md` | Teslim öncesi kontrol |
| `TROUBLESHOOTING.md` | Sık sorunlar |
| `backend/BACKUP.md` | Yedekleme |
| `scripts/install-service.ps1` | Windows Service kurulumu |

---

## 9. Bilinen MVP sınırlamaları

- Backend Electron paketine dahil değil
- Kod imzası yok (Windows SmartScreen uyarısı olabilir)
- PostgreSQL otomatik kurulmuyor
- Tek Setup.exe yalnızca Electron uygulamasını kurar
- İlk kurulumda teknisyen backend + DB kurmalı
