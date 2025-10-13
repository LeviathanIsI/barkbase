const request = require('supertest');
const app = require('../app');
const fs = require('fs/promises');
const path = require('path');
const env = require('../config/env');

let loginAttempt = 0;

const loginAs = async (tenantSlug, email, password = 'Passw0rd!') => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .set('X-Tenant', tenantSlug)
    .set('X-Forwarded-For', `127.0.0.${(loginAttempt += 1) % 255}`)
    .send({ email, password });

  expect(response.status).toBe(200);
  return response.body;
};

describe('File Access Security', () => {
  let acmeLogin, globexLogin;
  let testFilePath1, testFilePath2;
  const date = new Date().toISOString().slice(0, 10);

  beforeEach(async () => {
    acmeLogin = await loginAs('acme', 'owner@acme.test');
    globexLogin = await loginAs('globex', 'owner@globex.test');
    
    // Create test files for each tenant
    const acmeDir = path.join(env.storage.root, 'tenants', 'acme', 'uploads', date);
    const globexDir = path.join(env.storage.root, 'tenants', 'globex', 'uploads', date);

    await fs.mkdir(acmeDir, { recursive: true });
    await fs.mkdir(globexDir, { recursive: true });

    testFilePath1 = path.join(acmeDir, 'test-file-acme.txt');
    testFilePath2 = path.join(globexDir, 'test-file-globex.txt');

    await fs.writeFile(testFilePath1, 'Secret content for Acme tenant');
    await fs.writeFile(testFilePath2, 'Secret content for Globex tenant');
  });

  afterEach(async () => {
    // Cleanup test files
    try {
      await fs.unlink(testFilePath1);
      await fs.unlink(testFilePath2);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Authenticated File Access', () => {
    it('should allow user to access their own tenant files', async () => {
      const date = new Date().toISOString().slice(0, 10);
      const filePath = `/uploads/tenants/acme/uploads/${date}/test-file-acme.txt`;

      const response = await request(app)
        .get(filePath)
        .set('Authorization', `Bearer ${acmeLogin.tokens.accessToken}`)
        .set('X-Tenant', 'acme');

      expect(response.status).toBe(200);
      expect(response.text).toBe('Secret content for Acme tenant');
    });

    it('should block user from accessing another tenant files', async () => {
      const date = new Date().toISOString().slice(0, 10);
      const filePath = `/uploads/tenants/globex/uploads/${date}/test-file-globex.txt`;

      const response = await request(app)
        .get(filePath)
        .set('Authorization', `Bearer ${acmeLogin.tokens.accessToken}`)
        .set('X-Tenant', 'acme');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied');
    });

    it('should block unauthenticated access to files', async () => {
      const date = new Date().toISOString().slice(0, 10);
      const filePath = `/uploads/tenants/acme/uploads/${date}/test-file-acme.txt`;

      const response = await request(app)
        .get(filePath)
        .set('X-Tenant', 'acme');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Authentication required to access files');
    });

    it('should block path traversal attempts', async () => {
      const filePath = `/uploads/tenants/acme/../globex/uploads/test.txt`;

      const response = await request(app)
        .get(filePath)
        .set('Authorization', `Bearer ${acmeLogin.tokens.accessToken}`)
        .set('X-Tenant', 'acme');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid file path');
    });

    it('should reject invalid file path structures', async () => {
      const response = await request(app)
        .get('/uploads/invalid-path/file.txt')
        .set('Authorization', `Bearer ${acmeLogin.tokens.accessToken}`)
        .set('X-Tenant', 'acme');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid file path');
    });

    it('should allow globex user to access their own files', async () => {
      const date = new Date().toISOString().slice(0, 10);
      const filePath = `/uploads/tenants/globex/uploads/${date}/test-file-globex.txt`;

      const response = await request(app)
        .get(filePath)
        .set('Authorization', `Bearer ${globexLogin.tokens.accessToken}`)
        .set('X-Tenant', 'globex');

      expect(response.status).toBe(200);
      expect(response.text).toBe('Secret content for Globex tenant');
    });
  });

  describe('Cross-Tenant File Access Attempts', () => {
    it('should prevent cross-tenant access even with valid authentication', async () => {
      const date = new Date().toISOString().slice(0, 10);

      // Acme user tries to access Globex file by manipulating the URL
      const response = await request(app)
        .get(`/uploads/tenants/globex/uploads/${date}/test-file-globex.txt`)
        .set('Authorization', `Bearer ${acmeLogin.tokens.accessToken}`)
        .set('X-Tenant', 'acme');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied');
    });

    it('should prevent access with mismatched tenant header and token', async () => {
      const date = new Date().toISOString().slice(0, 10);

      // Acme user's token with Globex tenant header
      const response = await request(app)
        .get(`/uploads/tenants/globex/uploads/${date}/test-file-globex.txt`)
        .set('Authorization', `Bearer ${acmeLogin.tokens.accessToken}`)
        .set('X-Tenant', 'globex');

      // Should fail at requireAuth level due to tenant mismatch
      expect(response.status).toBeGreaterThanOrEqual(401);
    });
  });
});
