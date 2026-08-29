const crypto = require('crypto');

const CSRF_SECRET_COOKIE = '_csrfSecret';

const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

/**
 * Ensures an HttpOnly, Secure cookie containing a random secret exists.
 * Returns the secret string.
 */
const getOrCreateCsrfSecret = (req, res) => {
  let secret = req.cookies?.[CSRF_SECRET_COOKIE];
  if (!secret || typeof secret !== 'string' || secret.length < 32) {
    secret = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_SECRET_COOKIE, secret, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }
  return secret;
};

/**
 * Creates an HMAC signature token for the secret: `${nonce}.${signature}`
 */
const generateCsrfToken = (secret) => {
  const nonce = crypto.randomBytes(16).toString('hex');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(nonce)
    .digest('hex');
  return `${nonce}.${signature}`;
};

/**
 * Validates the HMAC signature token against the secret in constant time.
 */
const validateCsrfToken = (token, secret) => {
  if (!token || typeof token !== 'string' || !secret) {
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    return false;
  }
  const [nonce, providedSignature] = parts;
  if (!nonce || !providedSignature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(nonce)
    .digest('hex');

  const providedBuf = Buffer.from(providedSignature, 'utf8');
  const expectedBuf = Buffer.from(expectedSignature, 'utf8');

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
};

/**
 * Controller endpoint: GET /api/csrf-token
 * Generates and returns a valid CSRF token.
 */
const csrfTokenHandler = (req, res) => {
  const secret = getOrCreateCsrfSecret(req, res);
  const csrfToken = generateCsrfToken(secret);
  res.json({ success: true, csrfToken });
};

/**
 * Middleware: Enforces CSRF token validation on state-changing methods (POST, PUT, PATCH, DELETE).
 * Safe methods (GET, HEAD, OPTIONS) pass through without validation.
 */
const verifyCsrfToken = (req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const secret = req.cookies?.[CSRF_SECRET_COOKIE];
  const token =
    req.headers['x-csrf-token'] ||
    req.headers['x-xsrf-token'] ||
    req.body?._csrf;

  if (!secret || !token || !validateCsrfToken(token, secret)) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token.',
      code: 'CSRF_INVALID',
    });
  }

  next();
};

module.exports = {
  csrfTokenHandler,
  verifyCsrfToken,
  generateCsrfToken,
  getOrCreateCsrfSecret,
};
