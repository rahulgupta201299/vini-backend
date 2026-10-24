/**
 * MongoDB collection names, in one place. Models use COLLECTIONS.<name> — never a string.
 *
 * Naming: camelCase, starting with the area that owns the data ("admin" for everything the admin
 * panel manages), then what it holds — no page names, so a section can move without a rename.
 *
 *   adminUsers                     admin accounts: type (superAdmin / admin / member) and `rolePermissionIds`
 *                                  → adminRolePermission (Super Admins have none — they can do everything)
 *   adminRoles                     workspaces: { role: 'web' }, { role: 'app' }, { role: 'store' }
 *   adminPermissions               access catalogue: { section, level, canDelete }, unique, workspace-neutral
 *                                  (e.g. one "dashboard" for every workspace)
 *   adminRolePermission            one workspace's access: { roleId → adminRoles, permissionIds → adminPermissions },
 *                                  one shared document per unique combination
 *   adminOtps                      pending email codes (deleted automatically when expired)
 *   adminAllExamsCategories        All Exams categories
 *   adminAllExamsSubCategories     All Exams sub categories (joined to categories by `category` id)
 *   adminExamDetails               exam page content (banners, classes, batches, about, FAQs), joined to
 *                                  All Exams sub categories / Select Your Goal exams by `exam` id
 *   adminFooterSections            footer: Company, Free Learning Resources, Our Ecosystem Brands
 *   adminCelebrationBanners        festival offer banner (with start / end dates)
 *   adminHeroBanners               hero slider
 *   adminFreeResources             "Browse Our Free Resources" tiles
 *   adminMarketingBanners          1st and 2nd marketing banner (`placement`)
 *   adminSelectYourGoalCategories  "Select Your Goal" category tabs
 *   adminSelectYourGoalExams       "Select Your Goal" exams (joined to categories by `category` id)
 *   adminTopRankersStats           "Our Top Rankers" headline boxes (e.g. "1000+ selections")
 *   adminTopRankersCategories      "Our Top Rankers" tabs (UPSC, State PCS, Other Exams)
 *   adminTopRankersBanners         result banners (joined to tabs by `category` id)
 *
 * New sections follow the same pattern, e.g. "adminImpactStats".
 */
export const COLLECTIONS = {
  adminUsers: 'adminUsers',
  adminRoles: 'adminRoles',
  adminPermissions: 'adminPermissions',
  adminRolePermission: 'adminRolePermission',
  adminOtps: 'adminOtps',
  adminAllExamsCategories: 'adminAllExamsCategories',
  adminAllExamsSubCategories: 'adminAllExamsSubCategories',
  adminExamDetails: 'adminExamDetails',
  adminFooterSections: 'adminFooterSections',
  adminCelebrationBanners: 'adminCelebrationBanners',
  adminHeroBanners: 'adminHeroBanners',
  adminFreeResources: 'adminFreeResources',
  adminMarketingBanners: 'adminMarketingBanners',
  adminSelectYourGoalCategories: 'adminSelectYourGoalCategories',
  adminSelectYourGoalExams: 'adminSelectYourGoalExams',
  adminTopRankersStats: 'adminTopRankersStats',
  adminTopRankersCategories: 'adminTopRankersCategories',
  adminTopRankersBanners: 'adminTopRankersBanners',
};
