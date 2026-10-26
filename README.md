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
│   ├── permissions.js                roles, sections, presets + can() (RBAC)
│   └── constants.js                  cookie names, token types
├── controllers/                      request → checks → database → JSON (the business logic lives here)
│   ├── healthController.js           GET /api/health
│   ├── authController.js             sign-in, email code, session
│   ├── adminController.js            admin users (Super Admin)
│   ├── allExamsController.js         All Exams: website menu + pages, admin categories / sub categories
│   └── celebrationBannerController.js  festival banner: website + admin
├── models/                           Mongoose schemas, one per collection
│   ├── Admin.js                      `adminUsers` (rolePermissionIds → adminRolePermission)
│   ├── AdminRole.js                  `adminRoles`
│   ├── AdminPermission.js            `adminPermissions`
│   ├── AdminRolePermission.js        `adminRolePermission` (roleId → adminRoles, permissionIds → adminPermissions)
│   ├── AdminOtp.js                   `adminOtps` (one per admin, auto-deleted)
│   ├── AllExamsCategory.js           `adminAllExamsCategories`
│   ├── AllExamsSubCategory.js        `adminAllExamsSubCategories`
│   ├── CelebrationBanner.js          `adminCelebrationBanners`
│   ├── HeroBanner.js                 `adminHeroBanners`
│   ├── FreeResource.js               `adminFreeResources`
│   ├── MarketingBanner.js            `adminMarketingBanners`
│   ├── GoalCategory.js               `adminSelectYourGoalCategories`
│   ├── GoalExam.js                   `adminSelectYourGoalExams`
│   ├── ExamDetails.js                `adminExamDetails` (one exam page, joined by exam id)
│   ├── FooterSection.js              `adminFooterSections`
│   └── HeaderSection.js              `adminHeaderSections`
├── routes/                           URL → controller, plus sign-in / role checks
│   ├── index.js                      mounts every routes file under /api
│   ├── health.js                     /api/health
│   ├── exams.js                      /api/exams                (website)
│   ├── celebrationBanner.js          /api/celebration-banner   (website)
│   ├── auth.js                       /api/admin/auth
│   ├── admins.js                     /api/admin/admins
│   ├── allExams.js                   /api/admin/homepage/all-exams
│   ├── celebrationBanners.js         /api/admin/homepage/celebration-banners
│   └── footer.js                     /api/admin/footer
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

Admin name, email and password live only in MongoDB (`adminUsers`, password hashed) and are managed through these APIs — never through env variables.
Send `Authorization: Bearer <token>` from `/api/admin/auth/login`.

### Roles and permissions (RBAC)

Every admin has a `role` and, unless Super Admin, a permission per section (`src/config/permissions.js`):

| Role         | Can do                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------ |
| `superAdmin` | everything; manages every user; the only one who gives Delete access                             |
| `admin`      | its own sections; manages Members (up to its own access, never Delete) — not Super Admins/Admins |
| `member`     | its own sections                                                                                 |

`permissions.<section> = { level: 'none' | 'view' | 'edit', canDelete }` for the sections `webDashboard`, `homepage`, `allExams`,
`footer`, `seo`, `sales`, `hr`, `app`, `store`. Routes use `requireSection('<section>')`: GET needs view, DELETE needs
`canDelete` (with edit), anything else needs edit. The web dashboard has nothing to delete.
Presets (the old fixed roles: Web Manager, Editor, SEO / Sales / HR / App / Store Manager) only fill the grid with Edit.
Stored normalised in four collections:

- `adminUsers`: `type` (`superAdmin` / `admin` / `member`) and `rolePermissionIds` → `adminRolePermission`. Super Admins have
  none — they can do everything.
- `adminRoles`: the workspaces `{ role: 'web' | 'app' | 'store' }`.
- `adminPermissions`: `{ section, level, canDelete }`, unique and workspace-neutral — e.g. one `dashboard` serves the Web, App and
  Store dashboards (`SECTIONS[*].permission` in `src/config/permissions.js` maps admin sections to these).
- `adminRolePermission`: `{ roleId, permissionIds }` — one workspace and the permissions granted there. One shared document per
  unique combination: a user gets one per workspace it works in, and users with the same access point to the same document.

Everything is joined in (populated) whenever an account is loaded. Roles and permissions are created from
`src/config/permissions.js` when the server connects (insert-only). The API answers with `role` (the type), `workspaces` and a
`permissions` object per admin section.

| Method | Path              | Who                                    | Body                                                           |
| ------ | ----------------- | -------------------------------------- | -------------------------------------------------------------- |
| POST   | `/setup`          | anyone, **only while no admin exists** | `{ name, email, password }` → first Super Admin                |
| PATCH  | `/me/password`    | any signed-in admin                    | `{ currentPassword, newPassword }`                             |
| GET    | `/access-options` | Super Admin, Admin                     | — `{ roles, sections, presets, levels }`                       |
| GET    | `/`               | Super Admin, Admin                     | — list users                                                   |
| POST   | `/`               | Super Admin, Admin (Members only)      | `{ name, email, password, role, permissions }`                 |
| GET    | `/:id`            | Super Admin, Admin                     | —                                                              |
| PATCH  | `/:id`            | Super Admin, Admin (Members only)      | `{ name?, email?, password?, role?, permissions?, isActive? }` |

Users aren't deleted — switch them off with `isActive: false`.
Rules: passwords are at least 8 characters; you can't deactivate yourself; there is always at least one active Super Admin;
a new password signs that admin out everywhere; role and permission changes apply on their next request.

### Deleting

With Delete access, items are removed for good with `DELETE` on their URL (hero / marketing / celebration banners, free
resources, Select Your Goal categories and exams, top rankers boxes / tabs / banners, All Exams categories and sub categories).
A category or tab is refused (409) until it is empty; an All Exams sub category is refused while Select Your Goal exams link to
its page. Deleting an exam also deletes its own page in `adminExamDetails`.

## All Exams (Homepage → All Exams)

Two collections, joined by the category id (MongoDB `$lookup` / `populate`):

- `adminAllExamsCategories` — `{ name, isActive, order }`
- `adminAllExamsSubCategories` — `{ category: <category id>, name, slug, isActive, order, link, menuIcon: { name, color, background }, details: <adminExamDetails id> }` — `link` is optional: where the header menu item goes (empty → `/goal/<slug>`)
- `adminExamDetails` — `{ exam: <sub category or goal exam id>, source: allExams | selectYourGoal, subTitle, banners, freeClasses, batches, topRankers, aboutExam, faqs }` — an exam's page. The exam's `details` holds this document's id (Select Your Goal exams: `null` until the page is saved); `exam` points back.

**One-off after deploying:** `npm run db:link-exam-details -- --dry-run`, then `npm run db:link-exam-details`. It backs up the old embedded `details` to `backups/`, refreshes any page edited on the old admin, and sets every exam's `details` to its adminExamDetails id. Safe to re-run.
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

| Method | Path                          | Returns                                                                                                 |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| GET    | `/api/homepage`               | `{ heroBanners, freeResources, marketingBanners: { first, second } }` — active, in order                |
| GET    | `/api/top-rankers`            | `{ stats: [{ value, label, sublabel, icon }], tabs: [{ id, label, banners }] }` — active, in order      |
| GET    | `/api/select-your-goal`       | `[{ category, subcategories: [{ name, logo, href? }] }]` — active, in order                             |
| GET    | `/api/select-your-goal/:slug` | one active goal exam `{ category, name, slug, details }` — `details` is `null` until saved in the admin |
| GET    | `/api/footer`                 | `{ company, freeLearningResources, ecosystemBrands }` — `null` for an inactive section                  |

Admin (Web Managers, Editors, Super Admins) — every list has `GET /`, `POST /`, `PUT /order { ids }`, `PUT /:id` (save) and `PATCH /:id { isActive }`:

| Base path                               | Item fields                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/admin/homepage/hero-banners`      | `title, webImageUrl, mobileImageUrl, link`                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `/api/admin/homepage/free-resources`    | `title, icon, color, link`                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `/api/admin/homepage/marketing-banners` | `placement (first / second), title, webImageUrl, mobileImageUrl, link` — list with `?placement=`, order with `{ placement, ids }`                                                                                                                                                                                                                                                                                                                          |
| `/api/admin/homepage/select-your-goal`  | `GET /` categories with exams; `POST /categories`, `PATCH /categories/:id { name?, isActive? }`, `PUT /categories/order`; `POST /exams`, `PUT /exams/:id`, `PATCH /exams/:id`, `PUT /exams/order { category, ids }`; exam page: `GET /exams/:id` → `{ ..., hasDetails, linkedTo, details }`, `PUT /exams/:id/details { details }` (own content), `PUT /exams/:id/link { subCategory }` (`details` points at that All Exams page)                           |
| `/api/admin/homepage/top-rankers`       | `GET /` → `{ stats, categories (with banners) }`; boxes: `POST /stats`, `PUT /stats/:id`, `PATCH /stats/:id`, `PUT /stats/order` (`value, label, sublabel, icon`); tabs: `POST /categories`, `PATCH /categories/:id { name?, isActive? }`, `PUT /categories/order`; banners: `POST /banners`, `PUT /banners/:id`, `PATCH /banners/:id`, `PUT /banners/order { category, ids }` (`category, title, webImageUrl, mobileImageUrl, link` — at least one image) |
| `/api/admin/homepage/summary`           | `GET` — active / total counts for the Homepage screen                                                                                                                                                                                                                                                                                                                                                                                                      |

## Footer (Web → Footer)

`/api/admin/footer` (Footer access — view / edit / delete): `GET /` → the saved sections in footer order; `DELETE /:key` deletes a section (Delete access; saving it again recreates it); `PUT /:key` (`company` — the columns next to the logo — `freeLearningResources`, `ecosystemBrands`). `company` and `freeLearningResources` take `{ title, isActive, columns: [{ title, style?, links: [{ text, link }] }] }` (`style` for company columns: `links`, `locations` with a pin, or `contact` — mailto: / tel: / wa.me links become email / Call / WhatsApp); `ecosystemBrands` takes `{ title, isActive, links }`. Links may have an optional `badge` (a small animated tag beside it, e.g. "We are hiring"). The website reads `GET /api/footer`.

## Header & Menu (Web → Header & Menu)

`/api/admin/header` (Header & Menu access — view / edit): `GET /` → the saved parts; `PUT /:key` saves one part:

- `menus` `{ menus: [{ _id?, label, link, badge, items: [{ label, link }] }] }` — the desktop menu after "All Exams" (a menu
  with items opens a dropdown)
- `mobileMenu` `{ mobileSections: [{ _id?, title, items: [{ label, link, icon }] }] }` — tiles always go to their link
- `settings` `{ storeLink, searchTrending: [String] }`

The website reads `GET /api/navigation` → `{ navItems, mobileMenu, searchTrending, storeHref }` and adds "All Exams" (Homepage →
All Exams) first.

## Database collections

Database `vini`. Names are camelCase, starting with the area that owns the data (`admin…` for everything the
admin panel manages) — see `src/config/collections.js`.

```
vini
├── adminUsers                     admin accounts: type, rolePermissionIds → adminRolePermission (none for Super Admins)
├── adminRoles                     workspaces: { role: web | app | store }
├── adminPermissions               access catalogue: { section, level, canDelete }, unique and workspace-neutral
├── adminRolePermission            { roleId → adminRoles, permissionIds → adminPermissions }, shared per unique combination
├── adminOtps                      pending email codes (deleted automatically when expired)
├── adminAllExamsCategories        All Exams categories
├── adminAllExamsSubCategories     All Exams sub categories (joined to categories by id)
├── adminCelebrationBanners        festival offer banner
├── adminHeroBanners               hero slider
├── adminFreeResources             free resource tiles
├── adminMarketingBanners          1st and 2nd marketing banner (`placement`)
├── adminSelectYourGoalCategories  Select Your Goal tabs
├── adminSelectYourGoalExams       Select Your Goal exams (joined to categories by id)
├── adminExamDetails               exam page content for All Exams and Select Your Goal (joined by exam id)
├── adminHeaderSections            header: desktop menu, mobile menu, Store link + trending searches
├── adminFooterSections            footer: Company footer (columns next to the logo), Free Learning Resources, Our Ecosystem Brands
├── adminTopRankersStats           Top rankers headline boxes
├── adminTopRankersCategories      Top rankers tabs
└── adminTopRankersBanners         Top rankers result banners (joined to tabs by id)
```
