# vini-backend

Node.js + Express + MongoDB (Mongoose) API for VINI, organised **feature-wise MVC**, written as **ES modules**
(`"type": "module"` — use `import`/`export`, and include `.js` in relative imports, e.g. `import x from './x.js'`).

## Run

```bash
npm install
npm run dev      # http://localhost:8000 (auto-restart)
npm start
npm run lint     # ESLint — must pass
npm run format   # Prettier — formats every file
```

Coding rules (destructuring with defaults, truthy checks, spacing, structure) are in [CLAUDE.md](./CLAUDE.md).

Config lives in `.env` (`MONGO_URI`, `DB_NAME`, `JWT_SECRET`, `CLIENT_URLS`, `ADMIN_2FA_ENABLED`, `SMTP_*`).
`ADMIN_2FA_ENABLED=false` turns the email OTP off (email + password only) — currently off until SMTP is set up.

## Structure

```
src/
├── server.js                 connect DB → start server
├── app.js                    express app: security, CORS, parsers, /api, errors
├── routes.js                 root router (/api)
├── config/                   env.js, db.js, collections.js (all collection names)
├── common/                   shared by every feature
│   ├── middlewares/          error.middleware.js (404 + error handler)
│   ├── services/             mail.service.js (SMTP)
│   └── utils/                ApiError.js, validators.js
├── health/                   GET /api/health
│   ├── health.controller.js
│   └── health.routes.js
└── admin/                    /api/admin/*
    ├── admin.routes.js       mounts every admin section
    ├── login/                /api/admin/auth/*  — login + email OTP 2FA
    │   ├── adminOtp.model.js     collection `admin.otps` (1 per admin, TTL)
    │   ├── login.constants.js    cookie names, token types
    │   ├── login.service.js
    │   ├── login.controller.js
    │   ├── login.middleware.js   requireAdmin, requireRole
    │   └── login.routes.js
    ├── homepage/             /api/admin/homepage/*  — homepage sections
    │   ├── homepage.routes.js    mounts each section (signed-in admins only)
    │   └── allExams/             All Exams — categories joined to sub categories
    │       ├── allExamsCategory.model.js      collection `admin.homepage.allExams.categories`
    │       ├── allExamsSubCategory.model.js   collection `admin.homepage.allExams.subCategories`
    │       ├── allExams.service.js
    │       ├── allExams.controller.js
    │       ├── allExams.routes.js             admin: /api/admin/homepage/all-exams
    │       └── allExams.public.routes.js      website: /api/exams
    └── admins/               /api/admin/admins/*  — admin accounts
        ├── admin.model.js        collection `admin.login` (admin accounts)
        ├── admin.service.js
        ├── admin.controller.js
        └── admin.routes.js
```

### Adding an admin section (e.g. homepage)

1. Create `src/admin/homepage/` with `homepage.model.js`, `homepage.service.js`, `homepage.controller.js`, `homepage.routes.js`.
2. Protect write routes with `requireAdmin` from `../login/login.middleware`.
3. Mount it in `src/admin/admin.routes.js`: `router.use('/homepage', require('./homepage/homepage.routes'));`

## Admin auth API (`/api/admin/auth`)

| Method | Path          | Body                               | Result                                                                                                                        |
| ------ | ------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/login`      | `{ email, password, trustToken? }` | `{ otpRequired: true, challengeId }` (code emailed) or `{ otpRequired: false, token, … }` on a device trusted in the last 48h |
| POST   | `/send-otp`   | `{ challengeId }`                  | sends a new code (30s cooldown)                                                                                               |
| POST   | `/verify-otp` | `{ challengeId, code }`            | `{ token, expiresAt, trustToken, trustExpiresAt, admin }`                                                                     |
| GET    | `/me`         | `Authorization: Bearer <token>`    | current admin                                                                                                                 |
| POST   | `/logout`     |                                    | clears the session cookie                                                                                                     |

## Admin accounts API (`/api/admin/admins`)

Admin name, email and password live only in MongoDB (`admins`, password hashed) and are managed through these APIs — never through env variables.
Send `Authorization: Bearer <token>` from `/api/admin/auth/login`. Roles: `superadmin`, `admin`, `editor`.

| Method | Path           | Who                                    | Body                                             |
| ------ | -------------- | -------------------------------------- | ------------------------------------------------ |
| POST   | `/setup`       | anyone, **only while no admin exists** | `{ name, email, password }` → first superadmin   |
| GET    | `/`            | superadmin                             | — list admins                                    |
| POST   | `/`            | superadmin                             | `{ name, email, password, role? }`               |
| GET    | `/:id`         | superadmin                             | —                                                |
| PATCH  | `/:id`         | superadmin                             | `{ name?, email?, password?, role?, isActive? }` |
| DELETE | `/:id`         | superadmin                             | —                                                |
| PATCH  | `/me/password` | any admin                              | `{ currentPassword, newPassword }`               |

Rules: passwords are at least 8 characters; you can't delete or deactivate yourself; there is always at least one active superadmin;
a new password signs that admin out everywhere; role and active-status changes apply on their next request.

## All Exams (Homepage → All Exams)

Two collections, joined by the category id (MongoDB `$lookup` / `populate`):

- `admin.homepage.allExams.categories` — `{ name, isActive, order }`
- `admin.homepage.allExams.subCategories` — `{ category: <category id>, name, slug, isActive, order, menuIcon: { name, color, background }, details }`
  where `details` is `{ subTitle, banners[], freeClasses[], batches[], topRankers[], aboutExam: { title, highlights[], paragraphs[] }, faqs[] }`.
  Banners and top rankers have separate `webImageUrl` / `mobileImageUrl`. `slug` is made from the name (page `/goal/<slug>`).

Nothing is deleted: categories and sub categories are switched **active / inactive**. The website only shows active sub
categories inside active categories; an inactive one's page returns 404 and it leaves the header menu.

| Method | Path                                               | Who     | What                                                                      |
| ------ | -------------------------------------------------- | ------- | ------------------------------------------------------------------------- |
| GET    | `/api/exams`                                       | website | active categories with their active sub categories (header menu)          |
| GET    | `/api/exams/:slug`                                 | website | one active exam page `{ category, subCategory, slug, menuIcon, details }` |
| GET    | `/api/admin/homepage/all-exams`                    | admin   | every category with its sub categories (active and inactive, no details)  |
| POST   | `/api/admin/homepage/all-exams/categories`         | admin   | create `{ name }`                                                         |
| PATCH  | `/api/admin/homepage/all-exams/categories/:id`     | admin   | rename / activate / deactivate `{ name?, isActive? }`                     |
| GET    | `/api/admin/homepage/all-exams/sub-categories/:id` | admin   | one sub category with details (category joined in)                        |
| POST   | `/api/admin/homepage/all-exams/sub-categories`     | admin   | create `{ category, name, isActive, menuIcon, details }`                  |
| PUT    | `/api/admin/homepage/all-exams/sub-categories/:id` | admin   | save the whole sub category                                               |
| PATCH  | `/api/admin/homepage/all-exams/sub-categories/:id` | admin   | activate / deactivate `{ isActive }`                                      |

Uploaded images are stored inline (data URLs) until S3 is connected — `/api/admin/homepage` accepts bodies up to 15 MB.

## Database collections

MongoDB has no nested collections, so the structure is written into the names with dots
(all names live in `src/config/collections.js`):

```
vini (database)
├── admin.login                             admin accounts
├── admin.otps                              pending email codes (deleted automatically when expired)
├── admin.homepage.allExams.categories      All Exams categories
└── admin.homepage.allExams.subCategories   All Exams sub categories (joined to categories by id)
```
