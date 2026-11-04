const express = require('express');
const cors = require('cors');
const config = require('./config');
const apiRoutes = require('./routes');
const {
  notFoundMiddleware,
  errorMiddleware,
} = require('./middlewares/error.middleware');

function createApp() {
  const app = express();

  app.use(cors(config.cors));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', apiRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

module.exports = {
  createApp,
};
