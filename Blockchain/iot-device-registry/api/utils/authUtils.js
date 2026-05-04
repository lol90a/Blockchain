const crypto = require('crypto');

const TOKEN_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const HASH_ITERATIONS = 100000;
const HASH_KEY_LENGTH = 64;
const HASH_DIGEST = 'sha512';

const base64UrlEncode = (value) =>
  Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const base64UrlDecode = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
};

const derivePasswordHash = (password, salt) =>
  crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_DIGEST).toString('hex');

const hashPasswordSync = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = derivePasswordHash(password, salt);
  return `${salt}:${hash}`;
};

const hashPassword = async (password) => hashPasswordSync(password);

const verifyPassword = async (password, storedValue) => {
  const [salt, storedHash] = String(storedValue || '').split(':');

  if (!salt || !storedHash) {
    return false;
  }

  const candidateHash = derivePasswordHash(password, salt);
  return crypto.timingSafeEqual(Buffer.from(candidateHash, 'hex'), Buffer.from(storedHash, 'hex'));
};

const signToken = (payload, expiresIn = '24h') => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = expiresIn === '24h' ? issuedAt + 24 * 60 * 60 : issuedAt + 24 * 60 * 60;
  const tokenPayload = { ...payload, iat: issuedAt, exp: expiresAt };
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
};

const verifyToken = (token) => {
  const [encodedPayload, signature] = String(token || '').split('.');

  if (!encodedPayload || !signature) {
    throw new Error('Invalid token');
  }

  const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(encodedPayload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Invalid token');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
};

module.exports = {
  hashPassword,
  hashPasswordSync,
  verifyPassword,
  signToken,
  verifyToken
};
