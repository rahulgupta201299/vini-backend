import CelebrationBanner from '../models/CelebrationBanner.js';
import FreeResource from '../models/FreeResource.js';
import GoalCategory from '../models/GoalCategory.js';
import GoalExam from '../models/GoalExam.js';
import HeroBanner from '../models/HeroBanner.js';
import MarketingBanner from '../models/MarketingBanner.js';
import TopRankersBanner from '../models/TopRankersBanner.js';
import TopRankersStat from '../models/TopRankersStat.js';

/** The homepage sections that are edited in the admin panel (Web → Homepage). */

const BY_ORDER = { order: 1, createdAt: 1 };
const BANNER_FIELDS = '-_id title webImageUrl mobileImageUrl link';

/**
 * GET /api/homepage — everything the homepage shows from the admin panel, active items only, in order:
 * { heroBanners, freeResources, marketingBanners: { first, second } }
 */
export const getHomepage = async (_req, res) => {
  const [heroBanners, freeResources, marketingBanners] = await Promise.all([
    HeroBanner.find({ isActive: true }).sort(BY_ORDER).select(BANNER_FIELDS).lean(),
    FreeResource.find({ isActive: true })
      .sort(BY_ORDER)
      .select('-_id title icon color link')
      .lean(),
    MarketingBanner.find({ isActive: true })
      .sort(BY_ORDER)
      .select(`placement ${BANNER_FIELDS}`)
      .lean(),
  ]);

  const inPlacement = (placement) =>
    marketingBanners
      .filter((banner) => banner.placement === placement)
      .map(({ title, webImageUrl, mobileImageUrl, link }) => ({
        title,
        webImageUrl,
        mobileImageUrl,
        link,
      }));

  res.json({
    heroBanners,
    freeResources,
    marketingBanners: { first: inPlacement('first'), second: inPlacement('second') },
  });
};

/** Active / total for one collection, e.g. { active: 4, total: 5 }. */
const countItems = async (Model, filter = {}) => {
  const [active, total] = await Promise.all([
    Model.countDocuments({ ...filter, isActive: true }),
    Model.countDocuments(filter),
  ]);

  return { active, total };
};

/** GET /api/admin/homepage/summary — how many items each editable section has (for the Homepage screen) */
export const getSummary = async (_req, res) => {
  const now = new Date();

  const [
    heroBanners,
    freeResources,
    firstMarketing,
    secondMarketing,
    goalCategories,
    goalExams,
    rankerStats,
    rankerBanners,
    liveCelebration,
  ] = await Promise.all([
    countItems(HeroBanner),
    countItems(FreeResource),
    countItems(MarketingBanner, { placement: 'first' }),
    countItems(MarketingBanner, { placement: 'second' }),
    countItems(GoalCategory),
    countItems(GoalExam),
    countItems(TopRankersStat),
    countItems(TopRankersBanner),
    CelebrationBanner.findOne({ isActive: true })
      .where('startsAt')
      .lte(now)
      .where('endsAt')
      .gt(now)
      .select('title endsAt')
      .lean(),
  ]);

  res.json({
    heroBanners,
    celebration: liveCelebration,
    freeResources,
    firstMarketing,
    secondMarketing,
    selectYourGoal: { categories: goalCategories, exams: goalExams },
    topRankers: { stats: rankerStats, banners: rankerBanners },
  });
};
