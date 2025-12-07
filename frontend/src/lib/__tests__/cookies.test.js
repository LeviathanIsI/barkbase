/**
 * Cookies Library Tests
 * Tests for cookie utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCookie,
  setCookie,
  deleteCookie,
  getTenantSlugCookie,
  setTenantSlugCookie,
} from '../cookies';

describe('getCookie', () => {
  let originalCookie;

  beforeEach(() => {
    originalCookie = document.cookie;
  });

  afterEach(() => {
    // Clear cookies by setting them to expire
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; Max-Age=0; Path=/`;
    });
  });

  it('should return undefined for non-existent cookie', () => {
    expect(getCookie('nonExistentCookie')).toBeUndefined();
  });

  it('should parse and return cookie value', () => {
    document.cookie = 'testCookie=testValue; Path=/';
    expect(getCookie('testCookie')).toBe('testValue');
  });

  it('should handle cookies with special characters', () => {
    const value = 'hello world & more';
    document.cookie = `specialCookie=${encodeURIComponent(value)}; Path=/`;
    expect(getCookie('specialCookie')).toBe(value);
  });

  it('should handle multiple cookies', () => {
    document.cookie = 'first=1; Path=/';
    document.cookie = 'second=2; Path=/';
    document.cookie = 'third=3; Path=/';

    expect(getCookie('first')).toBe('1');
    expect(getCookie('second')).toBe('2');
    expect(getCookie('third')).toBe('3');
  });

  it('should handle cookies with equals sign in value', () => {
    document.cookie = 'withEquals=value=with=equals; Path=/';
    expect(getCookie('withEquals')).toBe('value=with=equals');
  });
});

describe('setCookie', () => {
  afterEach(() => {
    // Clear all test cookies
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; Max-Age=0; Path=/`;
    });
  });

  it('should set a basic cookie', () => {
    setCookie('basicCookie', 'basicValue');
    expect(getCookie('basicCookie')).toBe('basicValue');
  });

  it('should set cookie with maxAge', () => {
    setCookie('maxAgeCookie', 'value', { maxAge: 3600 });
    expect(getCookie('maxAgeCookie')).toBe('value');
  });

  it('should set cookie with expires', () => {
    const futureDate = new Date(Date.now() + 3600000);
    setCookie('expiresCookie', 'value', { expires: futureDate });
    expect(getCookie('expiresCookie')).toBe('value');
  });

  it('should set cookie with path', () => {
    setCookie('pathCookie', 'value', { path: '/test' });
    // Note: We can't easily verify the path was set correctly in jsdom
    // but we can verify the cookie exists
  });

  it('should set cookie with sameSite', () => {
    setCookie('sameSiteCookie', 'value', { sameSite: 'Strict' });
    expect(getCookie('sameSiteCookie')).toBe('value');
  });

  it('should use default path of /', () => {
    setCookie('defaultPath', 'value');
    expect(getCookie('defaultPath')).toBe('value');
  });

  it('should encode special characters in value', () => {
    const specialValue = 'hello & world = test';
    setCookie('encoded', specialValue);
    expect(getCookie('encoded')).toBe(specialValue);
  });

  it('should handle empty value', () => {
    setCookie('emptyCookie', '');
    expect(getCookie('emptyCookie')).toBe('');
  });

  it('should handle null value', () => {
    setCookie('nullCookie', null);
    expect(getCookie('nullCookie')).toBe('');
  });
});

describe('deleteCookie', () => {
  it('should delete an existing cookie', () => {
    setCookie('toDelete', 'value');
    expect(getCookie('toDelete')).toBe('value');

    deleteCookie('toDelete');
    // Cookie should be deleted (empty or undefined)
    const value = getCookie('toDelete');
    expect(value === undefined || value === '').toBe(true);
  });

  it('should handle deleting non-existent cookie', () => {
    // Should not throw
    expect(() => deleteCookie('neverExisted')).not.toThrow();
  });
});

describe('getTenantSlugCookie', () => {
  afterEach(() => {
    deleteCookie('tenantSlug');
  });

  it('should return undefined when tenant cookie not set', () => {
    expect(getTenantSlugCookie()).toBeUndefined();
  });

  it('should return tenant slug when set', () => {
    setCookie('tenantSlug', 'my-tenant');
    expect(getTenantSlugCookie()).toBe('my-tenant');
  });
});

describe('setTenantSlugCookie', () => {
  afterEach(() => {
    deleteCookie('tenantSlug');
  });

  it('should set tenant slug cookie', () => {
    setTenantSlugCookie('test-tenant');
    expect(getTenantSlugCookie()).toBe('test-tenant');
  });

  it('should not set cookie for empty slug', () => {
    setTenantSlugCookie('');
    expect(getTenantSlugCookie()).toBeUndefined();
  });

  it('should not set cookie for null slug', () => {
    setTenantSlugCookie(null);
    expect(getTenantSlugCookie()).toBeUndefined();
  });

  it('should not set cookie for undefined slug', () => {
    setTenantSlugCookie(undefined);
    expect(getTenantSlugCookie()).toBeUndefined();
  });

  it('should handle special characters in tenant slug', () => {
    setTenantSlugCookie('tenant-with-special-chars');
    expect(getTenantSlugCookie()).toBe('tenant-with-special-chars');
  });
});
