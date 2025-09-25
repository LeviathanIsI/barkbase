jest.mock('../utils/jwt', () => ({
  verifyAccessToken: jest.fn(),
}));

jest.mock('../config/prisma', () => ({
  membership: {
    findFirst: jest.fn(),
  },
}));

const { requireAuth } = require('../middleware/requireAuth');
const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../config/prisma');

describe('requireAuth middleware', () => {
  const next = jest.fn();
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    cookies: {},
  };

  beforeEach(() => {
    next.mockClear();
    res.status.mockClear();
    res.json.mockClear();
    verifyAccessToken.mockReset();
    prisma.membership.findFirst.mockReset();
  });

  it('passes when token and membership are valid', async () => {
    verifyAccessToken.mockReturnValue({
      sub: 'user-1',
      tenantId: 'tenant-1',
      membershipId: 'membership-1',
      role: 'STAFF',
    });

    prisma.membership.findFirst.mockResolvedValue({
      id: 'membership-1',
      tenantId: 'tenant-1',
      role: 'STAFF',
      user: { id: 'user-1', email: 'owner@example.com', isActive: true },
    });

    const middleware = requireAuth();
    const req = {
      headers: { authorization: 'Bearer token' },
      cookies: {},
      tenantId: 'tenant-1',
    };

    await middleware(req, res, next);

    expect(req.user).toEqual({
      id: 'user-1',
      email: 'owner@example.com',
      role: 'STAFF',
      tenantId: 'tenant-1',
      membershipId: 'membership-1',
    });
    expect(next).toHaveBeenCalled();
  });

  it('blocks when role is not allowed', async () => {
    verifyAccessToken.mockReturnValue({
      sub: 'user-1',
      tenantId: 'tenant-1',
      membershipId: 'membership-1',
      role: 'STAFF',
    });

    prisma.membership.findFirst.mockResolvedValue({
      id: 'membership-1',
      tenantId: 'tenant-1',
      role: 'STAFF',
      user: { id: 'user-1', email: 'owner@example.com', isActive: true },
    });

    const middleware = requireAuth(['OWNER']);
    const req = {
      headers: { authorization: 'Bearer token' },
      cookies: {},
      tenantId: 'tenant-1',
    };

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });
});
