import * as celebrationBannerService from './celebrationBanner.service.js';

/** GET /api/celebration-banner — the banner live on the website right now: { banner | null } */
export const getLive = async (_req, res) => {
  res.json(await celebrationBannerService.getLive());
};

/** GET /api/admin/homepage/celebration-banners — every banner (without images), newest first */
export const list = async (_req, res) => {
  res.json(await celebrationBannerService.list());
};

/** GET /api/admin/homepage/celebration-banners/:id */
export const get = async (req, res) => {
  res.json(await celebrationBannerService.get(req.params.id));
};

/** POST /api/admin/homepage/celebration-banners { title, subtitle, imageUrl, theme, offers, startsAt, endsAt, isActive } */
export const create = async (req, res) => {
  res.status(201).json(await celebrationBannerService.create(req.body ?? {}));
};

/** PUT /api/admin/homepage/celebration-banners/:id — the whole banner */
export const update = async (req, res) => {
  res.json(await celebrationBannerService.update(req.params.id, req.body ?? {}));
};

/** PATCH /api/admin/homepage/celebration-banners/:id { isActive } */
export const setStatus = async (req, res) => {
  res.json(await celebrationBannerService.setStatus(req.params.id, req.body ?? {}));
};
