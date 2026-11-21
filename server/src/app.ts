import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { env } from './config/env.ts';
import { ensureDatabaseInitialized } from './db/database.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { apiRateLimiter } from './middleware/rateLimit.ts';
import authRoutes from './routes/authRoutes.ts';
import gameRoutes from './routes/gameRoutes.ts';
import leaderboardRoutes from './routes/leaderboardRoutes.ts';
import openApiRoutes from './routes/openapi.ts';
import poetryRoutes from './routes/poetryRoutes.ts';
import profileRoutes from './routes/profileRoutes.ts';
import syncRoutes from './routes/syncRoutes.ts';

export function createApiApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        const allowed = new Set([
          env.appUrl,
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'capacitor://localhost',
          'https://localhost',
          ...env.allowedOrigins,
        ]);
        if (allowed.has(origin) || origin.endsWith('.run.app')) {
          callback(null, true);
          return;
        }
        callback(new Error('Origin not allowed by CORS'));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use('/api', apiRateLimiter);

  // Ensure DB schema & authentic poetry seed are initialized before serving API requests
  app.use('/api', async (_req, _res, next) => {
    try {
      await ensureDatabaseInitialized();
      next();
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        appName: env.appName,
        databaseConfigured: env.hasPostgresConfig,
        authConfigured: env.hasCustomJwtSecrets,
        qafiyahImportConfigured: Boolean(process.env.QAFIYAH_DUMP_PATH),
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/poetry', poetryRoutes);
  app.use('/api/game', gameRoutes);
  app.use('/api/leaderboards', leaderboardRoutes);
  app.use('/api/sync', syncRoutes);
  app.use('/api', openApiRoutes);

  app.use('/api', (_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'نقطة الوصول غير موجودة' },
    });
  });

  app.use(errorHandler);
  return app;
}
