const jwt = require('jsonwebtoken');

const signToken = (userId) =>
  jwt.sign({ id: userId, purpose: 'access' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

const signRefreshToken = (userId) =>
  jwt.sign({ id: userId, isRefreshToken: true, purpose: 'refresh' }, process.env.JWT_SECRET, {
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
