import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { env } from './server/src/config/env.ts';
import { createApiApp } from './server/src/app.ts';
import { ensureDatabaseInitialized } from './server/src/db/database.ts';

async function startBackendServer() {
  await ensureDatabaseInitialized();

  const app = createApiApp();

  if (env.serveSpa || env.isProduction) {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        const indexFile = path.join(distDir, 'index.html');
        if (fs.existsSync(indexFile)) {
          res.sendFile(indexFile);
        } else {
          res.status(404).send('Frontend build output not found');
        }
      });
    }
  }

  app.listen(env.port, '0.0.0.0', () => {
    console.log(
      `Backend API server listening on http://0.0.0.0:${env.port} (DB: ${
        env.hasPostgresConfig ? 'PostgreSQL' : 'Dev SQLite fallback'
      })`
    );
  });
}

startBackendServer().catch((err) => {
  console.error('Failed to start backend server:', err);
  process.exit(1);
});
