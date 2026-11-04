# Master Installer - Gelistirici Notlari

## Gereksinimler

1. **Node.js 20 LTS** (gelistirici makine)
2. **Inno Setup 6** — https://jrsoftware.org/isdl.php
3. **NSSM** — `runtime\nssm\nssm.exe` konumuna kopyalayin
4. Proje bagimliliklari (`npm install` kok + backend)

## Setup.exe uretimi

```powershell
cd proje-koku
npm install
cd backend
npm install
cd ..
npm run build:master
```

Cikti: `installer\output\POS-Kasa-Sistemi-Setup.exe`

## NSSM hazirligi

```text
installer\runtime\nssm\nssm.exe
```

nssm.cc/download → win64/nssm.exe

## Musteri kurulumu

1. PostgreSQL 15+ kurulu olmali
2. `POS-Kasa-Sistemi-Setup.exe` → Yonetici olarak calistir
3. PostgreSQL sifresini gir
4. Kurulum bitince uygulama acilir
5. Lisans aktivasyonu yap

## Sorun giderme

Kurulum loglari: `C:\Program Files\POS Kasa Sistemi\logs\`
