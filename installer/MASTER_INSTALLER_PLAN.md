# Master Installer Plan

## Secilen yontem: Inno Setup 6

| Kriter | Inno Setup | NSIS (electron-builder) |
|--------|------------|-------------------------|
| Cok asamali kurulum (DB + API + Service + POS) | Uygun | Zayif |
| Ozel sihirbaz (PostgreSQL sifresi) | Uygun | Sinirli |
| Gizli PowerShell calistirma | Uygun | Mumkun ama zor |
| Mevcut electron-builder | Ayri katman | Sadece Electron |
| Bakim / teknisyen okunabilirligi | Iyi (.iss + ps1) | Daginik |

**Karar:** Master installer = **Inno Setup** (`installer/setup.iss`).  
Electron bileseni `electron-builder --dir` ile `win-unpacked` olarak paketlenir; master installer bunu `client/` altina koyar.

NSIS yalnizca gelistirici icin ara adimdir; musteriye verilen tek dosya **Inno Setup ciktisi**dir.

---

## Mimari

```
[Musteri] POS Kasa Sistemi Setup.exe (Inno Setup)
    |
    |-- Sihirbaz: klasor, PostgreSQL sifresi
    |-- Dosyalari kopyala -> C:\Program Files\POS Kasa Sistemi\
    |-- preinstall-check.ps1
    |-- setup-database.ps1      (pos_db + .env)
    |-- setup-backend.ps1       (migrate + seed + seed-license)
    |-- install-backend-service.ps1 (NSSM)
    |-- postinstall-healthcheck.ps1
    |-- Masaustu kisayolu -> client\POS Kasa Sistemi.exe
    |-- Kurulum bitince uygulamayi ac
```

## Kurulum dizini (musteri PC)

```
C:\Program Files\POS Kasa Sistemi\
  client\                 # Electron (win-unpacked)
  backend\                # API + node_modules (onceden paketlendi)
  runtime\
    node\node.exe         # Musteri Node.js kurmaz
    nssm\nssm.exe         # Windows Service
  installer\scripts\      # Kurulum scriptleri
  logs\                   # Service loglari
```

## MVP sinirlari

| Bilesen | MVP |
|---------|-----|
| PostgreSQL | **On kurulu olmali** — yoksa kurulum durur |
| PostgreSQL sessiz kurulum | Faz 2 |
| Node.js / npm (musteri) | **Gorunmez** — runtime\node kullanilir |
| node_modules | Build sirasinda paketlenir |
| Kod imzasi | Faz 2 |

## Faz 2 (gelecek)

- PostgreSQL installer bootstrap (silent)
- Kod imzalama (SmartScreen)
- Otomatik guncelleme
- Tamamen cevrimdisi ilk kurulum

## Setup.exe uretimi (gelistirici)

```powershell
cd proje-koku
npm run build:master
```

Cikti: `installer\output\POS-Kasa-Sistemi-Setup.exe`

Gereksinimler: Inno Setup 6 (ISCC.exe PATH'te), Node.js gelistirici makinede.

## Test

1. Temiz Windows + PostgreSQL kurulu
2. `build:master` ile Setup.exe uret
3. Setup.exe calistir (Yonetici)
4. Lisans aktivasyonu + login + satis
