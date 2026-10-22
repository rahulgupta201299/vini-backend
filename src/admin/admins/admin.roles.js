/**
 * Admin roles (RBAC). Each role opens certain sections of the admin panel; an admin can have several.
 * Super Admin opens everything, including managing other admins.
 * The Frontend mirrors these keys in src/lib/adminAccess.ts — keep both in sync.
 */
export const ROLES = {
  superAdmin: { label: 'Super Admin', access: 'Everything, including admin users' },
  webManager: { label: 'Web Manager', access: 'Web: dashboard and homepage' },
  appManager: { label: 'App Manager', access: 'App workspace' },
  seoManager: { label: 'SEO Manager', access: 'Web: SEO' },
  salesManager: { label: 'Sales Manager', access: 'Web: sales and leads' },
  editor: { label: 'Editor', access: 'Web: homepage content (All Exams)' },
  hrManager: { label: 'HR Manager', access: 'Web: HR and careers' },
  storeManager: { label: 'Store Manager', access: 'Store workspace' },
};

export const ROLE_KEYS = Object.keys(ROLES);

export const SUPER_ADMIN = 'superAdmin';

/** True when the admin has one of the roles (Super Admin always passes). */
export const hasAccess = (admin, roles) =>
  admin.roles.includes(SUPER_ADMIN) || roles.some((role) => admin.roles.includes(role));
