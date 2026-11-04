# API URL Yapılandırması

## Geliştirme (development)

Yerel geliştirmede `frontend/js/config.js` dosyası kullanılır:

```javascript
window.AppConfig = {
  API_BASE_URL: 'http://localhost:4001/api/v1',
  APP_ENV: 'development',
};
```

Backend'i ayrı terminalde başlatın:

```bash
cd backend
npm run dev
```

## Production

Müşteri veya sunucu kurulumunda yalnızca `config.js` güncellenir:

1. `config.production.example.js` dosyasını referans alın.
2. `config.js` içindeki `API_BASE_URL` değerini canlı API domain'iniz ile değiştirin.
3. `APP_ENV` değerini `production` yapın.

Örnek:

```javascript
window.AppConfig = {
  API_BASE_URL: 'https://api.seninmarkan.com/api/v1',
  APP_ENV: 'production',
};
```

## Kurallar

- API adresi **doğrudan HTML dosyalarına yazılmaz**.
- API adresi **`apiClient.js` içine sabit yazılmaz**; `window.AppConfig.API_BASE_URL` okunur.
- Tüm istekler `frontend/js/apiClient.js` üzerinden gider.
- HTML sayfalarında script sırası:

  ```html
  <script src="frontend/js/config.js"></script>
  <script src="frontend/js/apiClient.js"></script>
  ```

  `config.js` mutlaka `apiClient.js`'den **önce** yüklenmelidir.

## Müşteri kurulumu

Paketlenmiş Electron veya statik frontend dağıtımında tek yapılması gereken:

- `frontend/js/config.js` → müşterinin API domain'i

Backend ayrı sunucuda (VPS, cloud) çalışır; frontend yalnızca bu URL'ye bağlanır.

## Electron paketleme (production build)

### Otomatik config scriptleri

| Komut | Açıklama |
|-------|----------|
| `npm run config:dev` | `config.js` → localhost (development) |
| `npm run config:prod` | `config.js` → production API domain |
| `npm run dist:dev` | development config + installer |
| `npm run dist:prod` | production config + installer (canlı kurulum) |

**Geliştirme build:** `npm run dist:dev`  
**Canlı kurulum build:** `npm run dist:prod`

Production API URL'yi değiştirmek için `scripts/set-config.js` içindeki `production` profilini düzenleyin.

`config.production.example.js` referans dosyasıdır; script tarafından değiştirilmez.

### Manuel yöntem (alternatif)

1. `frontend/js/config.production.example.js` dosyasını referans alın.
2. `frontend/js/config.js` içindeki `API_BASE_URL` ve `APP_ENV` değerlerini güncelleyin.
3. Ardından paketleyin:

```bash
npm run pack   # dist/win-unpacked — hızlı test
npm run dist   # dist/*.exe — NSIS installer (config değiştirilmeden)
```

Paketlenen uygulama yalnızca frontend dosyalarını içerir; backend ayrı sunucuda çalışmalıdır.
