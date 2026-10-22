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
 *       └── celebrationBanners     festival offer banner under the hero (with start / end dates)
 *
 * New admin sections follow the same pattern, e.g. "admin.homepage.heroBanners".
 */
export const COLLECTIONS = {
  adminLogin: 'admin.login',
  adminOtps: 'admin.otps',
  allExamsCategories: 'admin.homepage.allExams.categories',
  allExamsSubCategories: 'admin.homepage.allExams.subCategories',
  celebrationBanners: 'admin.homepage.celebrationBanners',
};
