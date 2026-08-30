# UOK Connect — Student Project Portal

A student project portfolio showcase platform for the University of Kelaniya, Faculty of Computing. Students publish their academic and personal projects; recruiters discover emerging tech talent.

> **Note on this fork:** This version has been enhanced as part of an academic assignment on Secure Web Application Development. It includes OWASP Top 10 vulnerability remediation and OIDC-based authentication (Google OAuth 2.0) on top of the original UOK Connect codebase.

---

## 🚀 Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS v4, Zustand
- **Backend:** Node.js, Express 5, Passport.js (Google OAuth 2.0)
- **Database:** PostgreSQL
- **Auth:** JWT (access + refresh tokens) with token-version-based revocation, HMAC-based anti-CSRF tokens
- **File Storage:** Cloudinary

---

## 🔒 Security Enhancements

This fork addresses the following OWASP Top 10 issues found during a security audit:

| # | Category | Fix |
|---|---|---|
| 1 | CSRF (A01) | HMAC-signed anti-CSRF tokens on all state-changing routes |
| 2 | Broken Authentication (A07) | JWT `purpose` claim validation — rejects email-verification/refresh tokens used as access tokens |
| 3 | XSS (A03) | HTML-escaped email templates; `http(s)`-only URL validation before rendering links |
| 4 | Broken Access Control / IDOR (A01) | Comment deletion now verifies the comment belongs to the specified project |
| 5 | Broken Authentication (A07) | Refresh tokens carry a `token_version`; logout revokes all outstanding refresh tokens server-side |
| 6 | Cryptographic Failures (A02) | TLS certificate validation enabled by default in DB connection scripts |
| 7 | Identification Failures (A07) | Constant-time (`crypto.timingSafeEqual`) comparison for the admin secret key |
| 8 | Sensitive Data Exposure (A02) | Password hash stripped from `req.user` before use in controllers/events |
| 9 | Security Misconfiguration (A05) | `express-validator` input validation added to admin project routes |
| 10 | Security Misconfiguration (A05) | Content-Security-Policy headers added via Helmet |
| 11 | Security Misconfiguration | HTTPS configured for local development with self-signed certificate |

---

## 📋 Prerequisites

- Node.js (LTS)
- PostgreSQL (local or cloud, e.g. Neon)
- A Google Cloud project with an OAuth 2.0 Client ID (Web application)
- A Cloudinary account (free tier is fine)

---

## ⚙️ Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/Nnavodya/Student_Project_Portal.git
cd Student_Project_Portal
```

### 2. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Configure environment variables

Copy the example files and fill in your own values:

```bash
cd server
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
```

```bash
cd ../client
copy .env.example .env
```

**`server/.env` — required variables:**

| Variable | Description |
|---|---|
| `PORT` | Backend port (default `5001`) |
| `NODE_ENV` | `development` locally |
| `CLIENT_URL` | Frontend URL, e.g. `http://localhost:5173` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Your PostgreSQL connection details |
| `SESSION_SECRET`, `JWT_SECRET` | Long random strings (32+ chars). Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Access token lifetime, e.g. `15m` |
| `ADMIN_SECRET_KEY` | A secret passphrase required to access the admin login flow |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | From Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_CALLBACK_URL` | Must match the redirect URI registered in Google Cloud Console, e.g. `http://localhost:5001/api/auth/google/callback` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | From your Cloudinary dashboard |

**`client/.env`:**

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL, e.g. `http://localhost:5001/api` |

> ⚠️ **Never commit your `.env` files.** They are already listed in `.gitignore`.

### 4. Set up the database

Create the database, then run the setup script (creates all tables):

```bash
psql -U postgres -c "CREATE DATABASE uok_connect;"
cd server
node scripts/setupDb.js
```

If you're updating an existing/older database, also run:

```bash
node scripts/migrate.js
```

### 5. Create an admin account (optional)

```bash
node scripts/create_admin.js youradmin@email.com YourPassword123
```

Admins must sign in through `/admin/auth` (secret key + Google Sign-in), not the regular login page.

### 6. Configure HTTPS for local development (optional but recommended)

This project is configured to run the backend over HTTPS locally using a self-signed certificate.

```bash
cd server
npm install --save-dev selfsigned
node gencert.js
```

This creates `key.pem` and `cert.pem` in the `server/` folder. When these files are present, the backend automatically starts on `https://localhost:5001` instead of plain HTTP. The frontend talks to the backend through Vite's dev-server proxy (see `client/vite.config.js`), so no separate certificate is needed on the frontend, and no browser same-site issues arise from mixing HTTP and HTTPS origins.

The first time you visit `https://localhost:5001/api/health` directly in your browser, you'll see a certificate warning — this is expected for a self-signed development certificate. Click "Advanced" → "Proceed to localhost (unsafe)" to accept it for local testing.

**Note:** `key.pem`/`cert.pem` are private keys and are excluded via `.gitignore` — never commit them.

In production, TLS should be terminated by the hosting platform in front of the application rather than by the Express server itself.

### 7. Run the application

In two separate terminals:

```bash
# Terminal 1 — backend
cd server
npm run dev
```

```bash
# Terminal 2 — frontend
cd client
npm run dev
```

Visit `http://localhost:5173`.

---

## 🗄️ Database Creation Script

See [`server/scripts/setupDb.js`](server/scripts/setupDb.js) for the full schema creation script, and [`server/scripts/migrate.js`](server/scripts/migrate.js) for incremental migrations.

---

## 👥 Roles

- **Student** — publish and manage their own projects
- **Recruiter** — browse published projects and students
- **Admin** — manage all users and projects (accessed via `/admin/auth`)

---

## 📄 License

Academic project — Faculty of Computing, University of Kelaniya.