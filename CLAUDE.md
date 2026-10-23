# VINI Backend — project notes

Node.js + Express 5 + MongoDB (Mongoose), **ES modules**, MVC by folder (`controllers/`, `models/`, `routes/`). Read README.md for structure and APIs.

## Always follow these coding rules

Before finishing any change: `npm run format` then `npm run lint` — both must pass with no errors.

### Readability first

- Write simple, easy-to-follow code. Prefer a few clear lines over one clever line.
- Small named helpers (`findAdminOrThrow`, `assertEmail`, `nextOrder`) instead of long inline conditions.
- Give values names before using them in conditions: `const isDeactivating = isActive === false;`
- Comments explain _why_, not _what_. One short JSDoc line above every route handler with its method and URL.

### Conditions: `if` + `return`, never `else if`

- Handle each case with its own `if (…) return …;` (or `throw`) and keep the main path unindented:

  ```js
  if (days <= 0) return 'Sale ending today';
  if (days === 1) return 'Sale ends tomorrow';

  return `Sale ends in ${days} days`;
  ```

- No `else if` and no `else` after `return` / `throw` (ESLint blocks both).
- No nested ternaries. A single simple ternary is fine (`activeOnly ? { isActive: true } : {}`).

### Destructuring and defaults — no `??`

- Destructure objects and arguments, with defaults: `const { name = 'Admin', roles = [] } = req.body || {};`
- Never use `??` or `??=` (ESLint blocks them). Instead:
  - a default in destructuring or parameters: `const { keyValue = {} } = error;`
  - `||` when an empty value should fall back: `req.get('authorization') || ''`
  - an `if` when `0` / `false` are real values: `if (!last) return 0; return last.order + 1;`
  - an `if` for one-time setup: `if (transporter) return transporter;`
- `?.` is fine for optional objects: `admin?.isActive`, `req.cookies?.[SESSION_COOKIE]`.
- Read env vars once in `src/config/env.js` by destructuring `process.env` with defaults.

### Truthy checks

- Use truthy / falsy checks: `if (name)`, `if (!admin)`, `if (!missingEnv.length)`.
  Do **not** write `!== undefined` / `=== undefined`.
- Exception — booleans and numbers where `false` / `0` are real values: check the type or presence,
  e.g. `typeof isActive === 'boolean'`, or `'isActive' in changes`.

### Database queries

- Keep queries readable: one condition object, then chain `.sort()`, `.select()`, `.populate()`, `.lean()` —
  one step per line when there are several.
- Use `.lean()` when only reading. Use `findOne` + `save()` (or `updateOne`) when changing one document.
- Write aggregations with the chained builder (`Model.aggregate().match(…).sort(…).lookup(…)`).
- Name the result after what it is (`const subCategory = …`), and check `if (!x) throw new ApiError(404, …)` right after.

### Spacing and formatting (Prettier + ESLint enforce this)

- 2 spaces, single quotes, semicolons, trailing commas, max 100 characters per line.
- Blank line after the imports, before every `return`, and between functions / exports.
- Import order: Node built-ins (`node:crypto`) → packages → project files (`../models/...`, `../utils/...`) → same folder (`./x.js`), with a blank line between groups.

### Modules and structure

- ES modules only: `import` / `export`, always with the `.js` extension on relative paths. Never `require`.
- `node:` prefix for Node built-ins (`node:crypto`).
- Folders by type (README.md has the tree): `models/` (PascalCase, one per collection), `controllers/`
  (`<name>Controller.js`), `routes/` (`<name>.js`, mounted in `routes/index.js`), `middlewares/`, `utils/`, `config/`.
- Controllers hold the business logic and queries for their area: read `req`, check, query, send JSON.
  Shared logic goes into a small helper at the top of the controller, or `utils/` when several controllers use it.
- Route handler names say what they do: `getBanners`, `getBannerById`, `createBanner`, `updateBanner`, `setBannerStatus`.
- Throw `ApiError(status, message)` for client errors. Express 5 forwards errors from async handlers
  automatically — no try/catch or asyncHandler wrapper in controllers.

### Database collections

- Collection names live only in `src/config/collections.js` — models use `COLLECTIONS.<name>`, never a string.
- Name collections in camelCase, starting with the area that owns the data, then what it holds —
  no page names and no dots: `adminAllExamsCategories`, `adminHeroBanners` (new: e.g. `adminTopRankers`).

### Security (never relax these)

- Admin details (name, email, password) come only from the database via `/api/admin/admins` — never from env variables or code.
- Never remove `requireAdmin` / `requireAccess` from admin routes, and never hard-code secrets.
- Every new admin section declares who can open it: `router.use(requireAdmin, requireAccess(...roles))`. Roles live in `src/config/roles.js`; keep them in sync with the Frontend's `src/lib/adminAccess.ts`.
- Rich text from the admin is cleaned with `sanitizeRichText()` before saving — never store raw HTML from a request.
- Passwords are stored only as bcrypt hashes; never return `passwordHash` (use `admin.toPublic()`).
