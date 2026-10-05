import app from './src/app.js';
import { env } from './src/config/env.js';
import { connectDB } from './src/config/db.js';
import { logger } from './src/utils/logger.js';

const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 AML Monitoring Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      logger.info(`🔗 Health Check: http://localhost:${env.PORT}/api/health`);
    });

    const handleExit = (signal) => {
      logger.info(`Received ${signal}. Gracefully terminating server...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleExit('SIGTERM'));
    process.on('SIGINT', () => handleExit('SIGINT'));
  } catch (error) {
    logger.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
