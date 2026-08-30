require('dotenv').config();
require('./events/notificationHandler'); // register event listeners

const https = require('https');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const rateLimit = require('express-rate-limit');
const passport = require('./config/passport');
const pool = require('./config/db');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');

const adminRoutes = require('./routes/adminRoutes');
const publicRoutes = require('./routes/public');
const { csrfTokenHandler, verifyCsrfToken } = require('./middleware/csrf');
const app = express();
const PORT = process.env.PORT || 5001;

// ── Security ──────────────────────────────────────────────────────────────────
// SECURITY FIX: added a Content Security Policy. This restricts which
// origins scripts, styles, images, and connections can load from,
// mitigating the impact of any XSS that might slip through despite the
// other fixes (defense in depth). Adjusted to allow Google/Cloudinary
// assets and API calls this app actually needs.
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://lh3.googleusercontent.com'],
      connectSrc: ["'self'", process.env.CLIENT_URL].filter(Boolean),
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
}));

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});
app.use('/api/', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' }
});
app.use('/api/auth/', authLimiter);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(session({
  store: new PgSession({ pool, tableName: 'session', createTableIfMissing: false }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
    sameSite: (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') ? 'none' : 'lax',
    maxAge: 10 * 60 * 1000, // 10 minutes — used only during OAuth flow
  },
}));

app.use(passport.initialize());

// ── CSRF Protection ───────────────────────────────────────────────────────────
app.get('/api/csrf-token', csrfTokenHandler);
app.use('/api', verifyCsrfToken);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Health check
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', env: process.env.NODE_ENV })
);

// 404 handler
app.use((req, res) =>
  res.status(404).json({ success: false, message: 'Route not found.' })
);

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
  });
});

// HTTPS configuration — the assignment requires the application to be
// configured to run with HTTPS. In local development we use a self-signed
// certificate (see server/gencert.js); in production, TLS is normally
// terminated by the hosting platform (e.g. Vercel), so we fall back to
// plain HTTP behind that proxy.
if (process.env.NODE_ENV !== 'production') {
  const keyPath = require('path').join(__dirname, '../key.pem');
  const certPath = require('path').join(__dirname, '../cert.pem');

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    https.createServer(httpsOptions, app).listen(PORT, () => {
      console.log(`\n🔒 UOK Connect server running on https://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } else {
    app.listen(PORT, () => {
      console.log(`\n🚀 UOK Connect server running on http://localhost:${PORT} (no cert.pem/key.pem found, falling back to HTTP)`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  }
}

module.exports = app;
