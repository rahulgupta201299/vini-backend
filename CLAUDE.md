# VINI Backend — project notes

Node.js + Express 5 + MongoDB (Mongoose), **ES modules**, feature-wise MVC. Read README.md for structure and APIs.

## Always follow these coding rules

Before finishing any change: `npm run format` then `npm run lint` — both must pass with no errors.

### Readability first

- Write simple, easy-to-follow code. Prefer a few clear lines over one clever line.
- Small named helpers (`findAdminOrThrow`, `assertEmail`, `isTokenForAdmin`) instead of long inline conditions.
- Give values names before using them in conditions: `const isDeactivating = isActive === false;`
- No nested ternaries. Use early returns / guard clauses instead of `else` after `return`/`throw`.
- Comments explain _why_, not _what_. One short JSDoc line above exported functions and API handlers.

### Destructuring and defaults

- Destructure objects and arguments, with defaults where it makes sense:
  `const { name = 'Admin', roles = [] } = body;`
  `const { trustToken = req.cookies?.[TRUSTED_DEVICE_COOKIE] } = req.body ?? {};`
- Read env vars once in `src/config/env.js` by destructuring `process.env` with defaults.
- Use `?.` and `??` (`req.body ?? {}`, `admin?.isActive`) instead of long `&&` chains.

### Truthy checks

- Use truthy / falsy checks: `if (name)`, `if (!admin)`, `if (!missingEnv.length)`.
  Do **not** write `!== undefined` / `=== undefined`.
- Exception — booleans and numbers where `false` / `0` are real values: check the type instead,
  e.g. `typeof isActive === 'boolean'`, or `'isActive' in changes`.

### Spacing and formatting (Prettier + ESLint enforce this)

- 2 spaces, single quotes, semicolons, trailing commas, max 100 characters per line.
- Blank line after the imports, before every `return`, and between functions / exports.
- Import order: Node built-ins (`node:crypto`) → packages → project files (`../../common/...`) → same folder (`./x.js`), with a blank line between groups.

### Modules and structure

- ES modules only: `import` / `export`, always with the `.js` extension on relative paths. Never `require`.
- `node:` prefix for Node built-ins (`node:crypto`).
- One folder per feature under `src/admin/<section>/`: `<name>.model.js`, `<name>.service.js`,
  `<name>.controller.js`, `<name>.routes.js` (+ optional `.middleware.js`, `.constants.js`).
- Controllers: read `req`, call the service, send JSON. No database code in controllers.
- Services: business rules + database access. Throw `ApiError(status, message)` for client errors.
- Express 5 forwards errors from async handlers automatically — no try/catch or asyncHandler wrapper in controllers.
- Shared code lives in `src/common/` (utils, middlewares, services). Validation helpers are in `common/utils/validators.js`.

### Database collections

- Collection names live only in `src/config/collections.js` — models use `COLLECTIONS.<name>`, never a string.
- Name new collections by their place in the admin structure with dots: `admin.<section>.<subsection>…`
  (e.g. `admin.homepage.heroBanners`). MongoDB has no nested collections; the dots show the hierarchy.

### Security (never relax these)

- Admin details (name, email, password) come only from the database via `/api/admin/admins` — never from env variables or code.
- Never remove `requireAdmin` / `requireAccess` from admin routes, and never hard-code secrets.
- Every new admin section declares who can open it: `router.use(requireAdmin, requireAccess(...roles))`. Roles live in `src/admin/admins/admin.roles.js`; keep them in sync with the Frontend's `src/lib/adminAccess.ts`.
- Rich text from the admin is cleaned with `sanitizeRichText()` before saving — never store raw HTML from a request.
- Passwords are stored only as bcrypt hashes; never return `passwordHash` (use `admin.toPublic()`).
