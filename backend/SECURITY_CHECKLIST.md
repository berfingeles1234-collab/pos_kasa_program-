# Production Güvenlik Kontrol Listesi

Canlı müşteri ortamına geçmeden önce aşağıdaki maddeleri doğrulayın.

## Kimlik doğrulama ve gizli bilgiler

- [ ] **JWT_SECRET güçlü mü?**
  - En az 32 karakter, rastgele, tahmin edilemez
  - `.env` içinde `CHANGE_ME` veya demo değer kullanılmıyor

- [ ] **Demo seed production'da kapalı mı?**
  - Production'da `npm run db:seed` yalnızca ilk kurulumda bilinçli çalıştırılmalı
  - Tekrar seed çalıştırma prosedürü dokümante edilmeli

- [ ] **Varsayılan şifreler değiştirildi mi?**
  - Demo `admin` / `Admin1234` değiştirildi
  - Demo `kasiyer` / `Kasiyer1234` değiştirildi
  - Tüm kasiyer ve yönetici şifreleri güçlü

- [ ] **`.env` git'e eklenmemeli**
  - `.env` commit edilmemiş
  - `.gitignore` içinde `.env` var (önerilir)
  - Production secret'lar yalnızca sunucuda

## Ağ ve erişim

- [ ] **PostgreSQL dışarıya kapalı mı?**
  - Yalnızca `localhost` veya private network dinliyor
  - `5432` portu internete açık değil

- [ ] **4001 portu dışarıya kapalı mı?**
  - Node.js yalnızca `127.0.0.1:4001` dinlemeli
  - Dış erişim Nginx reverse proxy üzerinden

- [ ] **Sadece 80/443 açık mı?**
  - Firewall (UFW) aktif
  - Gereksiz portlar kapalı

- [ ] **HTTPS aktif mi?**
  - Let's Encrypt sertifikası kurulu
  - HTTP → HTTPS yönlendirmesi var

- [ ] **CORS doğru mu?**
  - Production `.env` → `CORS_ORIGIN` bilinçli ayarlandı
  - Electron `file://` için `null` origin ihtiyacı göz önünde
  - Gereksiz wildcard (`*`) bilinçli kullanılıyor

## Uygulama ve operasyon

- [ ] **PM2 restart policy var mı?**
  - `pm2 save` ve `pm2 startup` yapıldı
  - `ecosystem.config.js` → `autorestart: true`
  - `max_memory_restart` tanımlı

- [ ] **Günlük yedek var mı?**
  - Cron ile `backup-postgres.sh` çalışıyor
  - Uzak yedek kopyası planlandı
  - Restore en az bir kez test edildi

## Hızlı doğrulama komutları

```bash
# Health
curl https://api.seninmarkan.com/api/v1/health

# PM2
pm2 status

# Firewall
sudo ufw status

# PostgreSQL dinleme
sudo ss -tlnp | grep 5432

# Node dinleme (localhost olmalı)
sudo ss -tlnp | grep 4001

# Son yedek
ls -lh backups/
```

## İlgili dokümanlar

- `DEPLOYMENT.md` — VPS kurulum
- `BACKUP.md` — Yedekleme ve geri yükleme
- `.env.production.example` — Production env şablonu
