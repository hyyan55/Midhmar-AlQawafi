import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.ts';
import { AppError } from './errorHandler.ts';

export interface AccessTokenPayload {
  sub: string;
  username: string;
  type: 'access';
}

export interface AuthenticatedRequest extends Request {
  authUser?: {
    userId: string;
    username: string;
  };
}

export function signAccessToken(userId: string, username: string): string {
  return jwt.sign(
    { sub: userId, username, type: 'access' } satisfies AccessTokenPayload,
    env.jwtAccessSecret,
    { expiresIn: env.accessTokenTtl as jwt.SignOptions['expiresIn'] }
  );
}

export function generateOpaqueToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export function hashOpaqueToken(rawToken: string): string {
  return crypto
    .createHmac('sha256', env.jwtRefreshSecret)
    .update(rawToken)
    .digest('hex');
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
  if (!decoded || decoded.type !== 'access' || !decoded.sub) {
    throw new AppError(401, 'INVALID_TOKEN', 'رمز الدخول غير صالح');
  }
  return decoded;
}

export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'يرجى تسجيل الدخول للمتابعة');
  }

  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.authUser = {
      userId: payload.sub,
      username: payload.username,
    };
    next();
  } catch {
    throw new AppError(401, 'TOKEN_EXPIRED', 'انتهت صلاحية الجلسة، يرجى إعادة المصادقة');
  }
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.authUser = {
      userId: payload.sub,
      username: payload.username,
    };
  } catch {
    // Allow guest continuation when optional token is expired or invalid
  }
  next();
}

export function assertCsrfSafeRequest(req: Request): void {
  const requestedWith = req.headers['x-requested-with'];
  if (requestedWith === 'XMLHttpRequest') {
    return;
  }
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) {
        return;
      }
    } catch {
      // fall through
    }
  }
  throw new AppError(403, 'CSRF_CHECK_FAILED', 'تعذر التحقق من مصدر الطلب');
}
