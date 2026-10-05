const app = require('./app');
const config = require('./config');
const { logger } = require('./utils/logger');

const PORT = config.PORT;

app.listen(PORT, () => {
  logger.info(`Aadhaar Auth backend running on port ${PORT}`);
  logger.info(`Provider: ${config.AADHAAR_PROVIDER}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  if (config.AADHAAR_PROVIDER === 'mock') {
    logger.warn('⚠  MOCK PROVIDER ACTIVE — for development only. Do not use in production.');
  }
});
