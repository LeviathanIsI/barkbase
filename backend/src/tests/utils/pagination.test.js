const { buildWhere, parsePageLimit, toPageResult } = require('../../utils/pagination');

describe('utils/pagination', () => {
  it('buildWhere returns OR clauses for search fields', () => {
    const where = buildWhere('sam', ['firstName', 'lastName']);
    expect(where).toEqual({
      OR: [
        { firstName: { contains: 'sam', mode: 'insensitive' } },
        { lastName: { contains: 'sam', mode: 'insensitive' } },
      ],
    });
  });

  it('parsePageLimit enforces defaults and max limit', () => {
    const options = parsePageLimit({ page: '2', limit: '500' }, { defaultLimit: 25, maxLimit: 100 });
    expect(options).toEqual({ page: 2, limit: 100, skip: 100 });
  });

  it('toPageResult formats pagination object', () => {
    const result = toPageResult({ items: [1, 2], total: 5, page: 1, limit: 2 });
    expect(result).toEqual({
      data: [1, 2],
      pagination: {
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
      },
    });
  });
});
