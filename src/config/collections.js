/**
 * MongoDB collection names, in one place.
 *
 * MongoDB has no collections inside collections, so the structure is shown with dots in the name
 * (database tools list them as a flat, grouped list):
 *
 *   admin
 *   ├── login                      admin accounts
 *   ├── otps                       pending email codes
 *   └── homepage
 *       ├── allExams
 *       │   ├── categories
 *       │   └── subCategories      joined to categories by `category` id
 *       ├── celebrationBanners     festival offer banner under the hero (with start / end dates)
 *       ├── heroBanners            top slider
 *       ├── freeResources          "Browse Our Free Resources" tiles
 *       ├── marketingBanners       1st and 2nd marketing banner (`placement`)
 *       └── selectYourGoal
 *           ├── categories
 *           └── exams              joined to categories by `category` id
 *
 * New admin sections follow the same pattern, e.g. "admin.homepage.heroBanners".
 */
export const COLLECTIONS = {
  adminLogin: 'admin.login',
  adminOtps: 'admin.otps',
  allExamsCategories: 'admin.homepage.allExams.categories',
  allExamsSubCategories: 'admin.homepage.allExams.subCategories',
  celebrationBanners: 'admin.homepage.celebrationBanners',
  heroBanners: 'admin.homepage.heroBanners',
  freeResources: 'admin.homepage.freeResources',
  marketingBanners: 'admin.homepage.marketingBanners',
  goalCategories: 'admin.homepage.selectYourGoal.categories',
  goalExams: 'admin.homepage.selectYourGoal.exams',
};
