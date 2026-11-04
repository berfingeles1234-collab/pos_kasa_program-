const fs = require('fs');
const path = require('path');

const PROFILES = {
  development: {
    API_BASE_URL: 'http://localhost:4001/api/v1',
    APP_ENV: 'development',
  },
  onprem: {
    API_BASE_URL: 'http://localhost:4001/api/v1',
    APP_ENV: 'production',
  },
  production: {
    API_BASE_URL: 'https://api.seninmarkan.com/api/v1',
    APP_ENV: 'production',
  },
};

const mode = (process.argv[2] || '').toLowerCase();

if (!PROFILES[mode]) {
  console.error('Kullanım: node scripts/set-config.js <development|onprem|production>');
  process.exit(1);
}

const profile = PROFILES[mode];
const configPath = path.join(__dirname, '..', 'frontend', 'js', 'config.js');

const content = `window.AppConfig = {
  API_BASE_URL: '${profile.API_BASE_URL}',
  APP_ENV: '${profile.APP_ENV}',
};
`;

fs.writeFileSync(configPath, content, 'utf8');

console.log(`config.js güncellendi: ${mode}`);
console.log(`  API_BASE_URL: ${profile.API_BASE_URL}`);
console.log(`  APP_ENV: ${profile.APP_ENV}`);
