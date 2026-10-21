# vini-backend

Node.js + Express + MongoDB (Mongoose) API for VINI, organised **feature-wise MVC**.

## Run

```bash
npm install
npm run dev      # http://localhost:8000 (auto-restart)
npm start
```

Config lives in `.env` (`MONGO_URI`, `DB_NAME`, `JWT_SECRET`, `CLIENT_URLS`, `ADMIN_2FA_ENABLED`, `SMTP_*`).
`ADMIN_2FA_ENABLED=false` turns the email OTP off (email + password only) — currently off until SMTP is set up.

## Structure

```
src/
├── server.js                 connect DB → start server
├── app.js                    express app: security, CORS, parsers, /api, errors
├── routes.js                 root router (/api)
├── config/                   env.js, db.js
├── common/                   shared by every feature
│   ├── middlewares/          error.middleware.js (404 + error handler)
│   ├── services/             mail.service.js (SMTP)
│   └── utils/                ApiError.js, asyncHandler.js
├── health/                   GET /api/health
│   ├── health.controller.js
│   └── health.routes.js
└── admin/                    /api/admin/*
    ├── admin.routes.js       mounts every admin section
    └── login/                /api/admin/auth/*  — login + email OTP 2FA
        ├── admin.model.js        admins collection
        ├── adminOtp.model.js     admin_otps collection (1 per admin, TTL)
        ├── login.service.js
        ├── login.controller.js
        ├── login.middleware.js   requireAdmin
        └── login.routes.js
scripts/
└── createAdmin.js            npm run create-admin
```

### Adding an admin section (e.g. homepage)

1. Create `src/admin/homepage/` with `homepage.model.js`, `homepage.service.js`, `homepage.controller.js`, `homepage.routes.js`.
2. Protect write routes with `requireAdmin` from `../login/login.middleware`.
3. Mount it in `src/admin/admin.routes.js`: `router.use('/homepage', require('./homepage/homepage.routes'));`

## Admin auth API (`/api/admin/auth`)

| Method | Path          | Body                                   | Result |
|--------|---------------|----------------------------------------|--------|
| POST   | `/login`      | `{ email, password, trustToken? }`     | `{ otpRequired: true, challengeId }` (code emailed) or `{ otpRequired: false, token, … }` on a device trusted in the last 48h |
| POST   | `/send-otp`   | `{ challengeId }`                      | sends a new code (30s cooldown) |
| POST   | `/verify-otp` | `{ challengeId, code }`                | `{ token, expiresAt, trustToken, trustExpiresAt, admin }` |
| GET    | `/me`         | `Authorization: Bearer <token>`        | current admin |
| POST   | `/logout`     |                                        | clears the session cookie |

Add or reset an admin: `ADMIN_EMAIL=… ADMIN_PASSWORD=… [ADMIN_NAME=…] [ADMIN_ROLE=superadmin] npm run create-admin`
