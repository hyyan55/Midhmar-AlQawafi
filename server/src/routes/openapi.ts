import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from '../config/env.ts';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: `${env.appName} REST API`,
    version: '1.0.0',
    description:
      'REST API for the Arabic Poetry Challenge Platform covering authentication, poetry library search, authentic question generation, server-authoritative progression, leaderboards, and offline synchronization.',
  },
  servers: [{ url: '/api', description: 'Application API Base' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/health': {
      get: { summary: 'Health check', responses: { '200': { description: 'OK' } } },
    },
    '/auth/register': {
      post: {
        summary: 'Register a new user account with optional guest progress migration',
        responses: { '201': { description: 'Account created' }, '409': { description: 'Email or username exists' } },
      },
    },
    '/auth/login': {
      post: { summary: 'Login with email and password', responses: { '200': { description: 'Authenticated' } } },
    },
    '/auth/refresh': {
      post: { summary: 'Rotate refresh token and issue new access token', responses: { '200': { description: 'Refreshed' } } },
    },
    '/auth/logout': {
      post: { summary: 'Revoke refresh token and clear session cookie', responses: { '200': { description: 'Logged out' } } },
    },
    '/auth/forgot-password': {
      post: { summary: 'Request password reset token', responses: { '200': { description: 'Reset initiated' } } },
    },
    '/auth/reset-password': {
      post: { summary: 'Reset password using one-time token', responses: { '200': { description: 'Password updated' } } },
    },
    '/auth/change-password': {
      post: { security: [{ bearerAuth: [] }], summary: 'Change password while signed in', responses: { '200': { description: 'Changed' } } },
    },
    '/auth/account': {
      delete: { security: [{ bearerAuth: [] }], summary: 'Permanently delete user account', responses: { '200': { description: 'Deleted' } } },
    },
    '/profile': {
      get: { security: [{ bearerAuth: [] }], summary: 'Get authenticated profile, stats, and settings', responses: { '200': { description: 'OK' } } },
      patch: { security: [{ bearerAuth: [] }], summary: 'Update profile details', responses: { '200': { description: 'Updated' } } },
    },
    '/profile/settings': {
      patch: { security: [{ bearerAuth: [] }], summary: 'Update theme, sound, vibration, and privacy settings', responses: { '200': { description: 'Updated' } } },
    },
    '/profile/achievements': {
      get: { security: [{ bearerAuth: [] }], summary: 'List achievements and unlock timestamps', responses: { '200': { description: 'OK' } } },
    },
    '/profile/history': {
      get: { security: [{ bearerAuth: [] }], summary: 'List recent completed challenge sessions', responses: { '200': { description: 'OK' } } },
    },
    '/poetry/taxonomy': {
      get: { summary: 'Get eras, meters, themes, rhymes, and poem types', responses: { '200': { description: 'OK' } } },
    },
    '/poetry/poets': {
      get: { summary: 'Search and browse poets', responses: { '200': { description: 'OK' } } },
    },
    '/poetry/poets/{id}': {
      get: { summary: 'Get poet biography and poems', responses: { '200': { description: 'OK' } } },
    },
    '/poetry/poems': {
      get: { summary: 'Paginated search across poems and verses', responses: { '200': { description: 'OK' } } },
    },
    '/poetry/poems/{id}': {
      get: { summary: 'Get full poem with hemistichs and poet biography', responses: { '200': { description: 'OK' } } },
    },
    '/game/daily/status': {
      get: { summary: 'Check daily challenge completion status for current date', responses: { '200': { description: 'OK' } } },
    },
    '/game/sessions': {
      post: { summary: 'Create a new challenge session and generate authentic questions', responses: { '201': { description: 'Session started' } } },
    },
    '/game/sessions/{id}/answer': {
      post: { summary: 'Submit a single answer and receive immediate literary feedback', responses: { '200': { description: 'Recorded' } } },
    },
    '/game/sessions/{id}/complete': {
      post: { summary: 'Complete session and calculate server-authoritative XP, level, streak, and achievements', responses: { '200': { description: 'Completed' } } },
    },
    '/leaderboards': {
      get: { summary: 'Get daily, weekly, or all-time leaderboard rankings', responses: { '200': { description: 'OK' } } },
    },
    '/sync/pack': {
      get: { summary: 'Download offline poetry library and question packs', responses: { '200': { description: 'OK' } } },
    },
    '/sync/sessions': {
      post: { security: [{ bearerAuth: [] }], summary: 'Idempotently sync queued offline sessions', responses: { '200': { description: 'Synced' } } },
    },
  },
};

const router = Router();
router.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});
router.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

export default router;
