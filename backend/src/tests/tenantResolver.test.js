const { tenantResolver } = require('../middleware/tenantResolver');

describe('tenantResolver middleware', () => {
  const next = jest.fn();

  beforeEach(() => {
    next.mockClear();
  });

  it('uses header slug when provided', () => {
    const middleware = tenantResolver({ defaultTenantSlug: 'default' });
    const req = { headers: { 'x-tenant': 'acme' } };

    middleware(req, {}, next);

    expect(req.tenantSlug).toBe('acme');
    expect(next).toHaveBeenCalled();
  });

  it('extracts slug from subdomain when host provided', () => {
    const middleware = tenantResolver({
      defaultTenantSlug: 'default',
      allowedHosts: ['localhost'],
      baseDomain: 'myapp.local',
    });
    const req = { headers: { host: 'bark.myapp.local:4000' } };

    middleware(req, {}, next);

    expect(req.tenantSlug).toBe('bark');
    expect(req.tenantHost).toBe('bark.myapp.local');
  });

  it('falls back to default when nothing resolves', () => {
    const middleware = tenantResolver({ defaultTenantSlug: 'default' });
    const req = { headers: {} };

    middleware(req, {}, next);

    expect(req.tenantSlug).toBe('default');
  });
});
