const { createApp } = require('./app');
const config = require('./config');

function start() {
  const app = createApp();

  app.listen(config.port, () => {
    console.log(`POS API http://localhost:${config.port} adresinde çalışıyor`);
    console.log(`Health: http://localhost:${config.port}/api/v1/health`);
  });
}

start();
