const jwt = require('jsonwebtoken');

const signToken = (userId) =>
  jwt.sign({ id: userId, purpose: 'access' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

// SECURITY FIX: refresh tokens now carry the user's current token_version.
// On refresh, the server compares this against the DB value — if they don't
// match (because logout/revocation bumped the DB version), the token is
// rejected even though it hasn't expired yet. This makes refresh tokens
// revocable server-side instead of being unconditionally valid for 24h.
const signRefreshToken = (userId, tokenVersion = 0) =>
  jwt.sign({ id: userId, isRefreshToken: true, purpose: 'refresh', tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });

const setTokenCookies = (res, token, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }
};

const clearTokenCookies = (res) => {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  res.clearCookie('token', { 
    httpOnly: true, 
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax'
  });
  res.clearCookie('refreshToken', { 
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax'
  });
};

module.exports = { signToken, signRefreshToken, setTokenCookies, clearTokenCookies };