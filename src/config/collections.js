/**
 * MongoDB collection names, in one place. Models use COLLECTIONS.<name> — never a string.
 *
 * Naming: camelCase, starting with the area that owns the data ("admin" for everything the admin
 * panel manages), then what it holds — no page names, so a section can move without a rename.
 *
 *   adminLogin                     admin accounts
 *   adminOtps                      pending email codes (deleted automatically when expired)
 *   adminAllExamsCategories        All Exams categories
 *   adminAllExamsSubCategories     All Exams sub categories (joined to categories by `category` id)
 *   adminCelebrationBanners        festival offer banner (with start / end dates)
 *   adminHeroBanners               hero slider
 *   adminFreeResources             "Browse Our Free Resources" tiles
 *   adminMarketingBanners          1st and 2nd marketing banner (`placement`)
 *   adminSelectYourGoalCategories  "Select Your Goal" category tabs
 *   adminSelectYourGoalExams       "Select Your Goal" exams (joined to categories by `category` id)
 *
 * New sections follow the same pattern, e.g. "adminTopRankers".
 */
export const COLLECTIONS = {
  adminLogin: 'adminLogin',
  adminOtps: 'adminOtps',
  adminAllExamsCategories: 'adminAllExamsCategories',
  adminAllExamsSubCategories: 'adminAllExamsSubCategories',
  adminCelebrationBanners: 'adminCelebrationBanners',
  adminHeroBanners: 'adminHeroBanners',
  adminFreeResources: 'adminFreeResources',
  adminMarketingBanners: 'adminMarketingBanners',
  adminSelectYourGoalCategories: 'adminSelectYourGoalCategories',
  adminSelectYourGoalExams: 'adminSelectYourGoalExams',
};
