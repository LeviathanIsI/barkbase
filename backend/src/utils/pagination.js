function buildWhere(search, fields = [], { mode = 'insensitive' } = {}) {
  if (!search || !fields.length) {
    return {};
  }

  return {
    OR: fields.map((field) => ({
      [field]: {
        contains: search,
        mode,
      },
    })),
  };
}

function parsePageLimit(raw = {}, { defaultPage = 1, defaultLimit = 50, maxLimit = 100 } = {}) {
  const page = Math.max(defaultPage, Number.parseInt(raw.page, 10) || defaultPage);
  const limitInput = Number.parseInt(raw.limit, 10);
  const limit = Math.min(Math.max(1, Number.isNaN(limitInput) ? defaultLimit : limitInput), maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function toPageResult({ items, total, page, limit }) {
  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

module.exports = {
  buildWhere,
  parsePageLimit,
  toPageResult,
};
