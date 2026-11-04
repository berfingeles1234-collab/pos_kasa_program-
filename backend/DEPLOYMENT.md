# POS Backend — VPS Deployment Rehberi

Bu rehber backend'i bir Linux VPS'ye taşımak içindir. Gerçek sunucuya bağlanma adımı bu dokümanda yalnızca komut olarak verilir; otomatik deploy yapılmaz.

## Gereksinimler

- Ubuntu 22.04+ (veya benzeri Linux)
- Node.js 20 LTS
- PostgreSQL 14+
- Nginx
- PM2
- Domain (ör. `api.seninmarkan.com`)

---

## 1. VPS hazırlığı

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx postgresql postgresql-contrib
```

### Node.js kurulumu

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### PM2 kurulumu

```bash
sudo npm install -g pm2
```

---

## 2. PostgreSQL kurulumu

```bash
sudo -u postgres psql
```

PostgreSQL içinde:

```sql
CREATE USER pos_user WITH PASSWORD 'guclu_sifre_buraya';
CREATE DATABASE pos_db OWNER pos_user;
GRANT ALL PRIVILEGES ON DATABASE pos_db TO pos_user;
\q
```

---

## 3. Proje dosyalarını sunucuya alma

```bash
cd /var/www
sudo mkdir -p pos-backend
sudo chown $USER:$USER pos-backend
git clone <repo-url> pos-backend
cd pos-backend/backend
```

Alternatif: `backend/` klasörünü SFTP/SCP ile `/var/www/pos-backend/backend` altına kopyalayın.

---

## 4. Ortam değişkenleri (.env)

```bash
cp .env.production.example .env
nano .env
```

Örnek `.env`:

```env
PORT=4001
NODE_ENV=production
DATABASE_URL=postgresql://pos_user:guclu_sifre_buraya@localhost:5432/pos_db
DB_SSL=false
JWT_SECRET=uzun_ve_rastgele_bir_secret_en_az_32_karakter
JWT_EXPIRES_IN=12h
CORS_ORIGIN=*
```

**Önemli:**
- `JWT_SECRET` mutlaka güçlü ve benzersiz olmalı
- Electron masaüstü uygulaması `file://` origin ile istek atabilir; bu yüzden `CORS_ORIGIN=*` veya uygun origin listesi kullanın
- Neon/cloud PostgreSQL kullanıyorsanız `DB_SSL=true` ve cloud connection string kullanın

---

## 5. Bağımlılıklar ve veritabanı

```bash
npm install --production
npm run db:migrate
npm run db:seed
```

Seed yalnızca demo veri içindir; production'da seed sonrası şifreleri değiştirin.

---

## 6. PM2 ile başlatma

Log klasörü:

```bash
mkdir -p logs
```

Başlat:

```bash
npm run pm2:start
```

Durum:

```bash
pm2 status
pm2 save
pm2 startup
```

Komutlar:

| Komut | Açıklama |
|-------|----------|
| `npm run pm2:start` | Uygulamayı production modda başlatır |
| `npm run pm2:restart` | Yeniden başlatır |
| `npm run pm2:logs` | Canlı log akışı |
| `pm2 status` | Process durumu |

Log dosyaları:
- `backend/logs/pm2-out.log`
- `backend/logs/pm2-error.log`

---

## 7. Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-available/pos-api
```

Örnek config:

```nginx
server {
    listen 80;
    server_name api.seninmarkan.com;

    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifleştir:

```bash
sudo ln -s /etc/nginx/sites-available/pos-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. SSL / Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.seninmarkan.com
```

Certbot Nginx config'ine HTTPS yönlendirmesini ekler.

---

## 9. Health check testi

Yerel (VPS içinden):

```bash
curl http://127.0.0.1:4001/api/v1/health
```

Domain üzerinden:

```bash
curl https://api.seninmarkan.com/api/v1/health
```

Beklenen: JSON yanıt, veritabanı bağlantı durumu.

Login testi:

```bash
curl -X POST https://api.seninmarkan.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin1234"}'
```

---

## 10. Log kontrolü

```bash
npm run pm2:logs
tail -f logs/pm2-error.log
tail -f logs/pm2-out.log
sudo tail -f /var/log/nginx/error.log
```

---

## Domain bağlama mantığı

```
Electron uygulaması (müşteri PC)
        │
        │ HTTPS
        ▼
api.seninmarkan.com  (Nginx :443)
        │
        │ proxy_pass
        ▼
127.0.0.1:4001  (PM2 → pos-backend)
        │
        ▼
PostgreSQL (localhost veya cloud)
```

1. DNS A kaydı: `api.seninmarkan.com` → VPS IP
2. Nginx domain'i dinler, isteği Node.js'e iletir
3. Electron `scripts/set-config.js` production URL'si: `https://api.seninmarkan.com/api/v1`
4. `npm run dist:prod` ile installer müşteriye dağıtılır

---

## Güncelleme (deploy sonrası)

```bash
cd /var/www/pos-backend/backend
git pull
npm install --production
npm run db:migrate
npm run pm2:restart
```

---

## Sorun giderme

| Sorun | Kontrol |
|-------|---------|
| API cevap vermiyor | `pm2 status`, `pm2 logs pos-backend` |
| DB bağlantı hatası | `.env` içindeki `DATABASE_URL`, PostgreSQL servisi |
| 502 Bad Gateway | Node process çalışıyor mu, port 4001 dinliyor mu |
| CORS hatası | `.env` → `CORS_ORIGIN` değeri |
| JWT hatası | `JWT_SECRET` production'da değiştirildi mi |
