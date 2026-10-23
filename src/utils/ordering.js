import ApiError from './ApiError.js';

/** Position after the last item, so a new item goes to the end of its list. */
export const nextOrder = async (Model, filter = {}) => {
  const last = await Model.findOne(filter).sort({ order: -1 }).select('order').lean();

  if (!last) return 0;

  return last.order + 1;
};

/**
 * Saves a new display order: `ids` lists every item of the list (matching `filter`) exactly once,
 * first to last, so an out-of-date screen can't scramble the order.
 */
export const saveOrder = async (Model, ids, filter = {}) => {
  if (!Array.isArray(ids)) throw new ApiError(400, 'ids must be a list.');

  const items = await Model.find(filter).select('_id').lean();
  const knownIds = new Set(items.map(({ _id }) => String(_id)));
  const sentIds = new Set(ids.map(String));

  const isComplete =
    ids.length === knownIds.size &&
    sentIds.size === ids.length &&
    [...sentIds].every((id) => knownIds.has(id));

  if (!isComplete) throw new ApiError(400, 'The list has changed. Reload the page and try again.');

  const updates = ids.map((id, order) => ({
    updateOne: { filter: { _id: id }, update: { $set: { order } } },
  }));

  await Model.bulkWrite(updates);
};

/** Finds a document by id, or responds 404 with "<label> not found." */
export const findByIdOrThrow = async (Model, id, label) => {
  const doc = await Model.findById(id).catch(() => null);

  if (!doc) throw new ApiError(404, `${label} not found.`);

  return doc;
};

export const assertBoolean = (value, label) => {
  if (typeof value !== 'boolean') throw new ApiError(400, `${label} must be true or false.`);
};

export const assertText = (value, label) => {
  const isValid = typeof value === 'string' && value.trim();

  if (!isValid) throw new ApiError(400, `${label} is required.`);
};
