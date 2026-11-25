import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';

// Ephemeral fallback signing key per server instance if SESSION_SECRET env var is absent
const EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');

function getSigningSecret(): string {
  return process.env.SESSION_SECRET?.trim() || EPHEMERAL_SECRET;
}

export function getEnvAdminPasscode(): string {
  return (process.env.ADMIN_PASSCODE || '').trim();
}

export interface AdminAuthStatus {
  hasEnvPasscode: boolean;
  isClaimed: boolean;
  needsSetup: boolean;
}

export function getAdminAuthStatus(): AdminAuthStatus {
  const hasEnvPasscode = getEnvAdminPasscode().length > 0;
  const row = db.prepare('SELECT id FROM admin_auth WHERE id = 1').get();
  const isClaimed = Boolean(row);
  return {
    hasEnvPasscode,
    isClaimed,
    needsSetup: !hasEnvPasscode && !isClaimed,
  };
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function bootstrapAdminPassword(password: string): { ok: boolean; error?: string } {
  const status = getAdminAuthStatus();
  if (status.hasEnvPasscode) {
    return { ok: false, error: 'Mật khẩu quản trị đã được cấu hình qua biến môi trường.' };
  }
  if (status.isClaimed) {
    return { ok: false, error: 'Tài khoản quản trị đã được thiết lập trước đó.' };
  }
  if (typeof password !== 'string' || password.trim().length < 6) {
    return { ok: false, error: 'Mật khẩu phải có ít nhất 6 ký tự.' };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO admin_auth (id, username, password_hash, salt, updated_at)
    VALUES (1, 'admin', ?, ?, ?)
  `);
  insert.run(hash, salt, now);
  return { ok: true };
}

export function verifyAdminPassword(password: string): boolean {
  if (typeof password !== 'string' || password.length === 0) {
    return false;
  }

  const envPasscode = getEnvAdminPasscode();
  if (envPasscode.length > 0) {
    // Timing-safe comparison via SHA-256 digests so lengths match
    const inputDigest = crypto.createHash('sha256').update(password).digest('hex');
    const envDigest = crypto.createHash('sha256').update(envPasscode).digest('hex');
    return safeEqualHex(inputDigest, envDigest);
  }

  const row = db
    .prepare('SELECT password_hash, salt FROM admin_auth WHERE id = 1')
    .get() as { password_hash: string; salt: string } | undefined;

  if (!row) {
    return false;
  }

  const candidate = hashPassword(password, row.salt);
  return safeEqualHex(candidate, row.password_hash);
}

export function issueAdminToken(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 12; // 12 hours
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'admin',
      exp: expiresAt,
      nonce: crypto.randomBytes(8).toString('hex'),
    })
  ).toString('base64url');

  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('base64url');

  return {
    token: `${payload}.${sig}`,
    expiresAt,
  };
}

export function verifyAdminToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  if (!payload || !sig) return false;

  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('base64url');

  if (!safeEqualHex(sig, expectedSig)) {
    return false;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string;
      exp?: number;
    };
    if (decoded.sub !== 'admin') return false;
    if (typeof decoded.exp !== 'number' || decoded.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Yêu cầu đăng nhập quản trị viên.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'Phiên đăng nhập quản trị đã hết hạn hoặc không hợp lệ.' });
    return;
  }

  next();
}
