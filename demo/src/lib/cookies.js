const parseCookies = () => {
  if (typeof document === 'undefined' || typeof document.cookie !== 'string') {
    return {};
  }

  return document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const [key, ...rest] = entry.split('=');
      acc[key] = decodeURIComponent(rest.join('='));
      return acc;
    }, {});
};

export const getCookie = (name) => parseCookies()[name];

export const setCookie = (name, value, options = {}) => {
  if (typeof document === 'undefined') {
    return;
  }
  const attrs = [];
  if (options.maxAge != null) {
    attrs.push(`Max-Age=${options.maxAge}`);
  }
  if (options.expires) {
    attrs.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.path) {
    attrs.push(`Path=${options.path}`);
  } else {
    attrs.push('Path=/');
  }
  if (options.sameSite) {
    attrs.push(`SameSite=${options.sameSite}`);
  }
  if (options.secure) {
    attrs.push('Secure');
  }
  document.cookie = `${name}=${encodeURIComponent(value ?? '')}; ${attrs.join('; ')}`;
};

export const deleteCookie = (name) => {
  setCookie(name, '', { maxAge: 0 });
};

const TENANT_COOKIE = 'tenantSlug';

export const getTenantSlugCookie = () => getCookie(TENANT_COOKIE);

export const setTenantSlugCookie = (slug) => {
  if (!slug) return;
  setCookie(TENANT_COOKIE, slug, { maxAge: 60 * 60 * 24 * 30, path: '/' });
};
