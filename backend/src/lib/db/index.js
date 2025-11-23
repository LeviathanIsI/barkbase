const path = require('path');

// Reuse the existing db-layer helpers that the Lambdas rely on today.
// Once the unified backend owns the pool initialization, this module
// can be updated in one place.
// eslint-disable-next-line import/no-dynamic-require, global-require
const dbLayer = require(path.join(
  __dirname,
  '../../../../aws/layers/db-layer/nodejs',
));

const {
  getPool,
  getTenantIdFromEvent,
  getJWTValidator,
} = dbLayer;

module.exports = {
  getPool,
  getTenantIdFromEvent,
  getJWTValidator,
};

