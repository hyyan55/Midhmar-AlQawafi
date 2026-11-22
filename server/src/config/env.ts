import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const ephemeralAccessSecret = crypto.randomBytes(32).toString('hex');
const ephemeralRefreshSecret = crypto.randomBytes(32).toString('hex');
const hasCustomJwtSecrets = Boolean(
  process.env.JWT_ACCESS_SECRET && process.env.JWT_REFRESH_SECRET &&
  !process.env.JWT_ACCESS_SECRET.startsWith('REPLACE_') &&
  !process.env.JWT_REFRESH_SECRET.startsWith('REPLACE_')
);
const hasPostgresConfig = Boolean(process.env.DATABASE_URL || process.env.PGHOST);

export const env = {
  appName: process.env.APP_NAME || 'مِضمار القوافي',
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.API_PORT || process.env.PORT || 4000),
  serveSpa: process.env.SERVE_SPA === 'true',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET && !process.env.JWT_ACCESS_SECRET.startsWith('REPLACE_') ? process.env.JWT_ACCESS_SECRET : ephemeralAccessSecret,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET && !process.env.JWT_REFRESH_SECRET.startsWith('REPLACE_') ? process.env.JWT_REFRESH_SECRET : ephemeralRefreshSecret,
  hasCustomJwtSecrets,
  hasPostgresConfig,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30),
  databaseUrl: process.env.DATABASE_URL || '',
  pgHost: process.env.PGHOST || '',
  pgPort: Number(process.env.PGPORT || 5432),
  pgDatabase: process.env.PGDATABASE || '',
  pgUser: process.env.PGUSER || '',
  pgPassword: process.env.PGPASSWORD || '',
  pgSsl: process.env.PGSSL === 'true',
  sqlitePath: process.env.SQLITE_DB_PATH || './data/qafiyah_platform.sqlite',
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  emailFrom: process.env.EMAIL_FROM || process.env.SMTP_USER || '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
};
