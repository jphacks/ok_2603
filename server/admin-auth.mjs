import { timingSafeEqual } from 'node:crypto';

// Shared with the existing collection endpoints. No browser persistence or service key.
export function requireAdmin(req) {
  const expected = process.env.ADMIN_API_TOKEN;
  const actual = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const expectedBytes = Buffer.from(expected || '');
  const actualBytes = Buffer.from(actual);
  if (!expected || actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
}
