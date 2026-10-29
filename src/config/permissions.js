/**
 * Admin access (RBAC). Every admin has a `role` and, unless Super Admin, a permission per section:
 *   level "none" | "view" | "edit" (edit includes view), and `canDelete` (delete items for good — needs edit).
 *
 *   superAdmin → everything, manages every user and is the only one who can give Delete access
 *   admin      → its own section permissions, plus manages Members (never Super Admins or other Admins)
 *   member     → its own section permissions
 *
 * The Frontend mirrors these keys in src/lib/adminAccess.ts — keep both in sync.
 */

export const ADMIN_ROLES = {
  superAdmin: {
    label: 'Super Admin',
    description: 'Everything, including every user and Delete access',
  },
  admin: { label: 'Admin', description: 'Its sections, and manages Members' },
  member: { label: 'Member', description: 'Only the sections given below' },
};

export const ROLE_KEYS = Object.keys(ADMIN_ROLES);
export const SUPER_ADMIN = 'superAdmin';
export const ADMIN = 'admin';
export const MEMBER = 'member';

/** Sections of the admin panel. `deletable: false` → nothing in it can be deleted (only edited). */
export const SECTIONS = {
  webDashboard: {
    label: 'Web dashboard',
    workspace: 'web',
    permission: 'dashboard',
    deletable: false,
  },
  homepage: {
    label: 'Homepage',
    workspace: 'web',
    description:
      'Hero, celebration and marketing banners, free resources, Select Your Goal, top rankers',
  },
  allExams: {
    label: 'All Exams',
    workspace: 'web',
    description: 'Header menu exams and their pages',
  },
  header: {
    label: 'Header & Menu',
    workspace: 'web',
    description: 'Menus, mobile menu, Store link and trending searches',
    deletable: false,
  },
  footer: {
    label: 'Footer',
    workspace: 'web',
    description: 'Company, Free Learning Resources, Our Ecosystem Brands',
  },
  gsFoundation: {
    label: 'GS Foundation',
    workspace: 'web',
    description: "Beginner's Kit and Foundation Batch pages",
    deletable: false,
  },
  mentorship: {
    label: 'Mentorship',
    workspace: 'web',
    description: '1:1 Mentorship and Free Mentorship Program pages',
    deletable: false,
  },
  contact: {
    label: 'Contact Info',
    workspace: 'web',
    description: 'Phone, WhatsApp, email and website used across the site',
    deletable: false,
  },
  seo: { label: 'SEO', workspace: 'web' },
  sales: { label: 'Sales', workspace: 'web' },
  hr: { label: 'HR & Careers', workspace: 'web' },
  app: { label: 'App', workspace: 'app', permission: 'dashboard' },
  store: { label: 'Store', workspace: 'store', permission: 'dashboard' },
};

export const SECTION_KEYS = Object.keys(SECTIONS);

/** Workspaces — the documents of adminRoles ({ role: 'web' }, …). */
export const WORKSPACES = { web: 'Web', app: 'App', store: 'Store' };
export const WORKSPACE_KEYS = Object.keys(WORKSPACES);

/**
 * In the database a section is a workspace (adminRoles.role) + a workspace-neutral permission section
 * (adminPermissions.section) — e.g. App = app + "dashboard", Homepage = web + "homepage".
 */
export const permissionSectionOf = (section) => SECTIONS[section].permission || section;

/** The admin panel section for a workspace + permission section, or undefined. */
export const sectionFor = (workspace, permissionSection) =>
  SECTION_KEYS.find(
    (key) =>
      SECTIONS[key].workspace === workspace && permissionSectionOf(key) === permissionSection,
  );

/** Every permission section (unique) — the `section` values of adminPermissions. */
export const PERMISSION_SECTIONS = [...new Set(SECTION_KEYS.map(permissionSectionOf))];
export const LEVELS = ['none', 'view', 'edit'];

const LEVEL_RANK = { none: 0, view: 1, edit: 2 };

/** Ready-made permission sets (the old fixed roles). They only fill the toggles — never Delete. */
export const PRESETS = {
  webManager: {
    label: 'Web Manager',
    sections: [
      'webDashboard',
      'homepage',
      'allExams',
      'header',
      'footer',
      'gsFoundation',
      'mentorship',
      'contact',
    ],
  },
  editor: {
    label: 'Editor',
    sections: ['homepage', 'allExams', 'header', 'footer', 'gsFoundation', 'mentorship', 'contact'],
  },
  seoManager: { label: 'SEO Manager', sections: ['seo'] },
  salesManager: { label: 'Sales Manager', sections: ['sales'] },
  hrManager: { label: 'HR Manager', sections: ['hr'] },
  appManager: { label: 'App Manager', sections: ['app'] },
  storeManager: { label: 'Store Manager', sections: ['store'] },
};

/** No access anywhere. */
export const emptyPermissions = () =>
  Object.fromEntries(SECTION_KEYS.map((section) => [section, { level: 'none', canDelete: false }]));

/**
 * Role and permissions from an account's type and its joined adminRolePermission documents
 * ({ roleId: { role }, permissionIds: [{ section, level, canDelete }] }). Super Admins need none.
 * Several grants for one section keep the highest; an unknown type reads as Member.
 */
export const accessFromDocs = (type, rolePermissions = []) => {
  const role = ROLE_KEYS.includes(type) ? type : MEMBER;
  const permissions = emptyPermissions();

  rolePermissions
    .filter((doc) => doc?.roleId?.role)
    .forEach(({ roleId, permissionIds = [] }) => {
      permissionIds.filter(Boolean).forEach(({ section: permissionSection, level, canDelete }) => {
        const section = sectionFor(roleId.role, permissionSection);

        if (!section) return;

        const { level: currentLevel, canDelete: currentDelete } = permissions[section];
        const isHigher = LEVEL_RANK[level] > LEVEL_RANK[currentLevel];

        permissions[section] = {
          level: isHigher ? level : currentLevel,
          canDelete:
            currentDelete ||
            (level === 'edit' && canDelete && SECTIONS[section].deletable !== false),
        };
      });
    });

  return { role, permissions };
};

/** The action an HTTP method needs: GET → view, DELETE → delete, anything else → edit. */
export const actionForMethod = (method) => {
  if (method === 'GET' || method === 'HEAD') return 'view';
  if (method === 'DELETE') return 'delete';

  return 'edit';
};

/** True when the admin may do `action` ("view" | "edit" | "delete") in `section`. Super Admin always may. */
export const can = (admin, section, action) => {
  const { role, permissions } = admin.getAccess();

  if (role === SUPER_ADMIN) return true;

  const { level, canDelete } = permissions[section];

  if (action === 'delete')
    return level === 'edit' && canDelete && SECTIONS[section].deletable !== false;

  return LEVEL_RANK[level] >= LEVEL_RANK[action];
};

/** True when `level` is no higher than `limit`. */
export const isLevelWithin = (level, limit) => LEVEL_RANK[level] <= LEVEL_RANK[limit];
