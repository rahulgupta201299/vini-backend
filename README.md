# vini-backend

Node.js + Express + MongoDB (Mongoose) API for VINI, organised **feature-wise MVC**, written as **ES modules**
(`"type": "module"` — use `import`/`export`, and include `.js` in relative imports, e.g. `import x from './x.js'`).

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
    ├── login/                /api/admin/auth/*  — login + email OTP 2FA
    │   ├── adminOtp.model.js     admin_otps collection (1 per admin, TTL)
    │   ├── login.service.js
    │   ├── login.controller.js
    │   ├── login.middleware.js   requireAdmin, requireRole
    │   └── login.routes.js
    └── admins/               /api/admin/admins/*  — admin accounts
        ├── admin.model.js        admins collection
        ├── admin.service.js
        ├── admin.controller.js
        └── admin.routes.js
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

## Admin accounts API (`/api/admin/admins`)

Admin name, email and password live only in MongoDB (`admins`, password hashed) and are managed through these APIs — never through env variables.
Send `Authorization: Bearer <token>` from `/api/admin/auth/login`. Roles: `superadmin`, `admin`, `editor`.

| Method | Path                 | Who            | Body |
|--------|----------------------|----------------|------|
| POST   | `/setup`             | anyone, **only while no admin exists** | `{ name, email, password }` → first superadmin |
| GET    | `/`                  | superadmin     | — list admins |
| POST   | `/`                  | superadmin     | `{ name, email, password, role? }` |
| GET    | `/:id`               | superadmin     | — |
| PATCH  | `/:id`               | superadmin     | `{ name?, email?, password?, role?, isActive? }` |
| DELETE | `/:id`               | superadmin     | — |
| PATCH  | `/me/password`       | any admin      | `{ currentPassword, newPassword }` |

Rules: passwords are at least 8 characters; you can't delete or deactivate yourself; there is always at least one active superadmin;
changing a password, role or deactivating signs that admin out everywhere.
