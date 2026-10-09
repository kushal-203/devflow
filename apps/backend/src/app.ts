import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestId } from './middleware/requestId.js';
import { router, testRouter } from './routes/index.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(requestId);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()), credentials: true }));
  app.use(express.json({ limit: '64kb' }));
  app.use(cookieParser());

  if (env.ENABLE_TEST_ROUTES) {
    if (env.NODE_ENV === 'production') throw new Error('ENABLE_TEST_ROUTES must not be true in production');
    app.use('/api/test', testRouter);
  }
  app.use('/api', router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
