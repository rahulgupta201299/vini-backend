# vini-backend

Node.js + Express + MongoDB (Mongoose) API for VINI, organised as **MVC by folder** (`controllers/`, `models/`, `routes/`), written as **ES modules**
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
├── server.js                         local start: connect DB → check SMTP → listen
├── app.js                            express app (Vercel entry): security, CORS, parsers, /api, errors
├── config/
│   ├── env.js                        every environment variable, read once
│   ├── database.js                   connectDB() — one shared MongoDB connection
│   ├── collections.js                every collection name
│   ├── roles.js                      admin roles (RBAC) + hasAccess()
│   └── constants.js                  cookie names, token types
├── controllers/                      request → checks → database → JSON (the business logic lives here)
│   ├── healthController.js           GET /api/health
│   ├── authController.js             sign-in, email code, session
│   ├── adminController.js            admin users (Super Admin)
│   ├── allExamsController.js         All Exams: website menu + pages, admin categories / sub categories
│   └── celebrationBannerController.js  festival banner: website + admin
├── models/                           Mongoose schemas, one per collection
│   ├── Admin.js                      `admin.login`
│   ├── AdminOtp.js                   `admin.otps` (one per admin, auto-deleted)
│   ├── AllExamsCategory.js           `admin.homepage.allExams.categories`
│   ├── AllExamsSubCategory.js        `admin.homepage.allExams.subCategories`
│   └── CelebrationBanner.js          `admin.homepage.celebrationBanners`
├── routes/                           URL → controller, plus sign-in / role checks
│   ├── index.js                      mounts every routes file under /api
│   ├── health.js                     /api/health
│   ├── exams.js                      /api/exams                (website)
│   ├── celebrationBanner.js          /api/celebration-banner   (website)
│   ├── auth.js                       /api/admin/auth
│   ├── admins.js                     /api/admin/admins
│   ├── allExams.js                   /api/admin/homepage/all-exams
│   └── celebrationBanners.js         /api/admin/homepage/celebration-banners
├── middlewares/
│   ├── auth.js                       requireAdmin, requireAccess(...roles)
│   ├── database.js                   requireDatabase (connects before each API call)
│   ├── rateLimit.js                  loginLimiter, setupLimiter
│   └── error.js                      404 + error handler
└── utils/                            ApiError, validators, slugify, sanitizeRichText, email (SMTP), token (JWT), otp, dates
```

### Adding a new section (e.g. Homepage → Hero banners)

1. **Model** — `src/models/HeroBanner.js`, with its collection name added to `config/collections.js`.
2. **Controller** — `src/controllers/heroBannerController.js`: one exported handler per route
   (`getHeroBanners`, `createHeroBanner`, …) with its checks and queries.
3. **Routes** — `src/routes/heroBanners.js`, starting with `router.use(requireAdmin, requireAccess(...roles))`
   (Super Admin always passes); mount it in `src/routes/index.js`.
4. In the Frontend, add the same roles to `ACCESS` in `src/lib/adminAccess.ts` and wrap the pages in `AccessGate`.

## Admin auth API (`/api/admin/auth`)

| Method | Path          | Body                               | Result                                                                                                                        |
| ------ | ------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/login`      | `{ email, password, trustToken? }` | `{ otpRequired: true, challengeId }` (code emailed) or `{ otpRequired: false, token, … }` on a device trusted in the last 48h |
| POST   | `/send-otp`   | `{ challengeId }`                  | sends a new code (30s cooldown)                                                                                               |
| POST   | `/verify-otp` | `{ challengeId, code }`            | `{ token, expiresAt, trustToken, trustExpiresAt, admin }`                                                                     |
| GET    | `/me`         | `Authorization: Bearer <token>`    | current admin                                                                                                                 |
| POST   | `/logout`     |                                    | clears the session cookie                                                                                                     |

## Admin accounts API (`/api/admin/admins`)

Admin name, email and password live only in MongoDB (`admin.login`, password hashed) and are managed through these APIs — never through env variables.
Send `Authorization: Bearer <token>` from `/api/admin/auth/login`.

### Roles (RBAC)

An admin has one or more `roles` (`src/config/roles.js`). They only see — and can only call — the sections their roles open.

| Role key       | Label         | Opens                             |
| -------------- | ------------- | --------------------------------- |
| `superAdmin`   | Super Admin   | everything, including admin users |
| `webManager`   | Web Manager   | Web: dashboard and homepage       |
| `appManager`   | App Manager   | App workspace                     |
| `seoManager`   | SEO Manager   | Web: SEO                          |
| `salesManager` | Sales Manager | Web: sales and leads              |
| `editor`       | Editor        | Web: homepage content (All Exams) |
| `hrManager`    | HR Manager    | Web: HR and careers               |
| `storeManager` | Store Manager | Store workspace                   |

`superAdmin` already opens everything, so it is stored on its own (`['superAdmin']`).

| Method | Path           | Who                                    | Body                                              |
| ------ | -------------- | -------------------------------------- | ------------------------------------------------- |
| POST   | `/setup`       | anyone, **only while no admin exists** | `{ name, email, password }` → first Super Admin   |
| PATCH  | `/me/password` | any signed-in admin                    | `{ currentPassword, newPassword }`                |
| GET    | `/roles`       | Super Admin                            | — `[{ key, label, access }]`                      |
| GET    | `/`            | Super Admin                            | — list admins                                     |
| POST   | `/`            | Super Admin                            | `{ name, email, password, roles }`                |
| GET    | `/:id`         | Super Admin                            | —                                                 |
| PATCH  | `/:id`         | Super Admin                            | `{ name?, email?, password?, roles?, isActive? }` |

There is no delete — switch an admin off with `isActive: false`.
Rules: passwords are at least 8 characters; at least one role; you can't deactivate yourself; there is always at least one active Super Admin;
a new password signs that admin out everywhere; role and active-status changes apply on their next request.

## All Exams (Homepage → All Exams)

Two collections, joined by the category id (MongoDB `$lookup` / `populate`):

- `admin.homepage.allExams.categories` — `{ name, isActive, order }`
- `admin.homepage.allExams.subCategories` — `{ category: <category id>, name, slug, isActive, order, menuIcon: { name, color, background }, details }`
  where `details` is `{ subTitle, banners[], freeClasses[], batches[], topRankers[], aboutExam: { title, highlights[], content } (content is sanitised HTML), faqs[] }`.
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
| PUT    | `/api/admin/homepage/all-exams/categories/order`   | admin   | new menu order `{ ids }` — every category id, first to last               |
| GET    | `/api/admin/homepage/all-exams/sub-categories/:id` | admin   | one sub category with details (category joined in)                        |
| POST   | `/api/admin/homepage/all-exams/sub-categories`     | admin   | create `{ category, name, isActive, menuIcon, details }`                  |
| PUT    | `/api/admin/homepage/all-exams/sub-categories/:id` | admin   | save the whole sub category                                               |
| PATCH  | `/api/admin/homepage/all-exams/sub-categories/:id` | admin   | activate / deactivate `{ isActive }`                                      |

Uploaded images are stored inline (data URLs) until S3 is connected — `/api/admin/homepage` accepts bodies up to 15 MB.

## Celebration banner (Homepage → Celebration banner)

A festival sale banner under the hero slider (title, optional line under it, artwork, theme colours and exactly 3 offer cards
`{ title, priceLabel, price, color, link }`). It shows on the website only while `isActive` and between `startsAt` and `endsAt`;
after `endsAt` it is switched to inactive automatically. Nothing is deleted.

| Method | Path                                          | Who    | Purpose                                                       |
| ------ | --------------------------------------------- | ------ | ------------------------------------------------------------- |
| GET    | `/api/celebration-banner`                     | anyone | `{ banner }` — the banner live right now, or `null`           |
| GET    | `/api/admin/homepage/celebration-banners`     | admin  | every banner (without images), newest first                   |
| POST   | `/api/admin/homepage/celebration-banners`     | admin  | create                                                        |
| GET    | `/api/admin/homepage/celebration-banners/:id` | admin  | one banner                                                    |
| PUT    | `/api/admin/homepage/celebration-banners/:id` | admin  | save the whole banner                                         |
| PATCH  | `/api/admin/homepage/celebration-banners/:id` | admin  | `{ isActive }` (an ended banner needs a later end date first) |

## Homepage sections (Web → Homepage)

Hero slider, Free resources, 1st / 2nd marketing banner and Select Your Goal. Each item has `isActive` and `order`;
nothing is deleted — items are switched off and reordered. Website reads (no sign-in):

| Method | Path                    | Returns                                                                                  |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------- |
| GET    | `/api/homepage`         | `{ heroBanners, freeResources, marketingBanners: { first, second } }` — active, in order |
| GET    | `/api/select-your-goal` | `[{ category, subcategories: [{ name, logo, href? }] }]` — active, in order              |

Admin (Web Managers, Editors, Super Admins) — every list has `GET /`, `POST /`, `PUT /order { ids }`, `PUT /:id` (save) and `PATCH /:id { isActive }`:

| Base path                               | Item fields                                                                                                                                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/admin/homepage/hero-banners`      | `title, webImageUrl, mobileImageUrl, link`                                                                                                                                                                          |
| `/api/admin/homepage/free-resources`    | `title, icon, color, link`                                                                                                                                                                                          |
| `/api/admin/homepage/marketing-banners` | `placement (first / second), title, webImageUrl, mobileImageUrl, link` — list with `?placement=`, order with `{ placement, ids }`                                                                                   |
| `/api/admin/homepage/select-your-goal`  | `GET /` categories with exams; `POST /categories`, `PATCH /categories/:id { name?, isActive? }`, `PUT /categories/order`; `POST /exams`, `PUT /exams/:id`, `PATCH /exams/:id`, `PUT /exams/order { category, ids }` |
| `/api/admin/homepage/summary`           | `GET` — active / total counts for the Homepage screen                                                                                                                                                               |

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
